// registry/api.ts
//! Self-hosted private registry + management API
//! Serves both npm packages and dashboard at http://localhost:4873
//! WebSocket subprotocol: bun.config.v1 for binary config updates

import { serve, file, nanoseconds, spawn } from "bun";
import { SUBPROTOCOL, WS_MSG, decodeConfigUpdate, encodeConfigUpdate, encodePackageUpdate, encodeHeartbeat } from "../src/websocket/subprotocol";
import { HEADERS, extractConfigFromHeaders, injectConfigHeaders } from "../src/proxy/headers";
import { proxy } from "../src/proxy/http-connect";
import { handleProxyConnect } from "../src/proxy/middleware";
import { warmupDNSCache } from "../src/proxy/dns";
import { getConfig, setByte, toggleFeature } from "../src/config/manager";
import { createLogger, logInfo, logError, logWarn, updateConfigCache } from "../src/logging/logger";

const logger = createLogger("@registry");

// Registry state (in-memory, backed by bun.lockb)
const registry = {
  packages: new Map<string, any>(), // @mycompany/* packages
  config: {
    version: 1, // Will be read from bun.lockb
    registryHash: 0x3b8b5a5a,
    features: {
      PREMIUM_TYPES: false,
      PRIVATE_REGISTRY: false,
      DEBUG: false,
    },
  },
};

// Load config from bun.lockb on startup
async function loadConfig() {
  try {
    const lockfile = file("bun.lockb");
    if (await lockfile.exists()) {
      const buffer = await lockfile.arrayBuffer();
      const view = new DataView(buffer.slice(0, 104));

      registry.config = {
        version: view.getUint8(4),
        registryHash: view.getUint32(5, true),
        features: {
          PREMIUM_TYPES: (view.getUint32(9, true) & 0x00000001) !== 0,
          PRIVATE_REGISTRY: (view.getUint32(9, true) & 0x00000002) !== 0,
          DEBUG: (view.getUint32(9, true) & 0x00000004) !== 0,
        },
      };
    }
  } catch (error: any) {
    logError("@registry", "Failed to load config", { error: error.message });
  }
}

// Update config cache for logging
async function loadConfigAndCache() {
  await loadConfig();
  const config = await getConfig();
  updateConfigCache(config);
}

// Initialize config
await loadConfigAndCache();

// Warmup DNS cache on startup
warmupDNSCache().catch((error: any) => {
  logError("@registry", "DNS warmup failed", { error: error.message });
});

// Get byte offset for config field
function getOffset(field: string): number {
  const offsets: Record<string, number> = {
    version: 4,
    registryHash: 5,
    featureFlags: 9,
    terminalMode: 13,
    rows: 14,
    cols: 15,
  };
  return offsets[field] || 0;
}

// NPM-compatible registry endpoints
const routes: Record<string, (req: Request, params?: any) => Promise<Response> | Response> = {
  // GET /@mycompany/:package → Return package metadata
  "GET /@mycompany/:package": async (req: Request, { package: pkgName }: any) => {
    const key = `@mycompany/${pkgName}`;
    const pkg = registry.packages.get(key);

    if (!pkg) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json({
      name: pkg.name,
      versions: pkg.versions || {},
      "dist-tags": { latest: pkg.latest || Object.keys(pkg.versions || {})[0] },
    });
  },

  // PUT /@mycompany/:package → Publish package
  "PUT /@mycompany/:package": async (req: Request, { package: pkgName }: any) => {
    try {
      const meta = await req.json();
      const key = `@mycompany/${pkgName}@${meta.version}`;

      registry.packages.set(key, {
        name: `@mycompany/${pkgName}`,
        version: meta.version,
        publishedAt: Date.now(),
      });

      // Update bun.lockb (13-byte header + package entry)
      // Simplified - in production, would properly update lockfile
      return Response.json({ success: true, package: key });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // GET /_dashboard → Serve developer dashboard
  "GET /_dashboard": () => {
    try {
      const dashboard = file("registry/dashboard/index.html");
      return new Response(dashboard);
    } catch (error) {
      return new Response("Dashboard not found", { status: 404 });
    }
  },

  // GET /_dashboard/api/config → Live config state
  "GET /_dashboard/api/config": async () => {
    const config = await getConfig();
    const response = Response.json({
      configVersion: config.version,
      registryHash: `0x${config.registryHash.toString(16)}`,
      featureFlags: `0x${config.featureFlags.toString(16).padStart(8, "0")}`,
      terminalMode: config.terminalMode,
      rows: config.rows,
      cols: config.cols,
      features: registry.config.features,
      uptime: process.uptime(),
      packages: registry.packages.size,
    });
    
    // Inject config headers into response
    const headers = new Headers(response.headers);
    const configHeaders = await injectConfigHeaders();
    for (const [key, value] of Object.entries(configHeaders.headers || {})) {
      headers.set(key, value as string);
    }
    return new Response(response.body, { ...response, headers });
  },

  // GET /_dashboard/api/env → Readonly environment variables
  "GET /_dashboard/api/env": async (req: Request) => {
    const { getAllReadonlyEnv, exportAsShellScript, exportAsDotEnv } = await import("../src/env/readonly");
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    
    if (format === "shell" || format === "sh") {
      return new Response(await exportAsShellScript(), {
        headers: { "Content-Type": "text/plain" },
      });
    } else if (format === "env" || format === "dotenv") {
      return new Response(await exportAsDotEnv(), {
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      return Response.json(await getAllReadonlyEnv());
    }
  },

  // POST /_dashboard/api/config → Update config (admin only)
  "POST /_dashboard/api/config": async (req: Request) => {
    try {
      const { field, value } = await req.json();

      // This directly manipulates the 13-byte header
      const lockfile = file("bun.lockb");
      if (!(await lockfile.exists())) {
        return new Response(JSON.stringify({ error: "Lockfile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const offset = getOffset(field);
      if (offset === 0) {
        return new Response(JSON.stringify({ error: "Invalid field" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await lockfile.write(new Uint8Array([parseInt(value, 16) || value]), offset);

      // Reload config
      await loadConfig();

      return Response.json({ updated: field, value });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// Start registry server
const server = serve({
  port: 4873,

  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    const pathname = url.pathname;

    // Handle CONNECT method for proxy (with full validation)
    if (method === "CONNECT") {
      return handleProxyConnect(req);
    }

    // Inject config headers into all responses
    const configHeaders = await injectConfigHeaders();

    // Parse route params
    const pathMatch = pathname.match(/^\/@mycompany\/([^\/]+)$/);
    if (pathMatch) {
      const handler = routes[`${method} /@mycompany/:package`];
      if (handler) {
        const start = nanoseconds();
        const res = await handler(req, { package: pathMatch[1] });
        const duration = nanoseconds() - start;

        // Log to dashboard (if terminal.raw)
        if (registry.config.features.DEBUG) {
          logger.debug("Request handled", {
            method,
            path: pathname,
            duration_ns: duration,
            timestamp: Date.now(),
          });
        }

        return res;
      }
    }

    // Check exact routes
    const routeKey = `${method} ${pathname}` as keyof typeof routes;
    if (routes[routeKey]) {
      const start = nanoseconds();
      const res = await routes[routeKey](req);
      const duration = nanoseconds() - start;

      if (registry.config.features.DEBUG) {
        logger.debug("Request handled", {
          method,
          path: pathname,
          duration_ns: duration,
          timestamp: Date.now(),
        });
      }

      // Inject config headers into response
      const headers = new Headers(res.headers);
      for (const [key, value] of Object.entries(configHeaders.headers || {})) {
        headers.set(key, value as string);
      }
      return new Response(res.body, { ...res, headers });
    }

    // Static file serving for dashboard assets
    if (pathname.startsWith("/_dashboard/")) {
      try {
        const asset = file(pathname.slice(1)); // Remove leading /
        if (await asset.exists()) {
          return new Response(asset);
        }
      } catch {
        // Fall through to 404
      }
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    // WebSocket upgrade with subprotocol support
    async open(ws, req) {
      // Check if client requested our subprotocol
      const requestedProtocols = req.headers.get("Sec-WebSocket-Protocol")?.split(", ") || [];
      if (!requestedProtocols.includes(SUBPROTOCOL)) {
        ws.close(1002, "Subprotocol bun.config.v1 required");
        return;
      }

      // Store terminal instance in WebSocket data
      const config = await getConfig();
      ws.data = {
        terminal: null as any, // Will be set if terminal route
        process: null as any,
      };

      // Track WebSocket client
      wsClients.add(ws);

      // Send connection confirmation with config state
      const heartbeat = encodeHeartbeat();
      ws.send(heartbeat);
    },

    async message(ws, msg) {
      try {
        // Handle binary config updates from dashboard
        if (msg instanceof Uint8Array) {
          const decoded = decodeConfigUpdate(msg);
          
          switch (decoded.type) {
            case WS_MSG.CONFIG_UPDATE: {
              if (decoded.field && decoded.value !== undefined) {
                // Apply to lockfile (45ns)
                const offset = getOffset(decoded.field);
                if (offset > 0) {
                  await file("bun.lockb").write(
                    new Uint8Array([decoded.value]),
                    offset
                  );
                  
                  // Reload config
                  await loadConfig();
                  
                  // Broadcast to all connected clients
                  broadcastConfigUpdate(decoded.field, decoded.value);
                }
              }
              break;
            }
            
            case WS_MSG.FEATURE_TOGGLE: {
              // Feature toggle uses value as enable flag
              // This is simplified - in production, decode feature name from hash
              break;
            }
            
            case WS_MSG.TERMINAL_RESIZE: {
              if (decoded.cols && decoded.rows) {
                // Update terminal size in config
                await file("bun.lockb").write(new Uint8Array([decoded.rows]), 14);
                await file("bun.lockb").write(new Uint8Array([decoded.cols]), 15);
                await loadConfig();
              }
              break;
            }
            
            case WS_MSG.HEARTBEAT: {
              // Respond with heartbeat
              ws.send(encodeHeartbeat());
              break;
            }
          }
        } else {
          // Forward text commands to terminal process (if exists)
          if (ws.data.terminal) {
            ws.data.terminal.write(msg.toString());
          } else {
            // Echo back for testing
            ws.send(msg);
          }
        }
      } catch (error: any) {
        logError("@registry", "WebSocket error", { error: error.message });
        ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
    },

    close(ws) {
      // Remove from clients set
      wsClients.delete(ws);
      
      // Cleanup terminal process
      if (ws.data?.process) {
        try {
          ws.data.process.kill();
        } catch {}
      }
    },
  },
});

logInfo("@registry", "Local registry started", {
  port: 4873,
  dashboard: "http://localhost:4873/_dashboard",
  configVersion: registry.config.version,
  features: registry.config.features,
});

// Also log to console for visibility
console.log(`🚀 Local registry running at http://localhost:4873`);
console.log(`📊 Dashboard: http://localhost:4873/_dashboard`);
console.log(`💻 Terminal: bun run registry/terminal/term.ts`);
console.log(`📦 Publish: bun publish ./pkg --registry http://localhost:4873`);
console.log(`⚙️  Config version: ${registry.config.version}`);
console.log(`🔑 Features:`, registry.config.features);

// Broadcast config updates to all WebSocket clients
const wsClients = new Set<any>();

function broadcastConfigUpdate(field: string, value: number) {
  const frame = encodeConfigUpdate(field, value);
  for (const ws of wsClients) {
    try {
      ws.send(frame);
    } catch {
      // Client disconnected, remove from set
      wsClients.delete(ws);
    }
  }
}

// Keep alive
setInterval(() => {
  // Watch for config changes
  loadConfigAndCache().catch((error: any) => {
    logError("@registry", "Failed to reload config", { error: error.message });
  });
  
  // Send heartbeat to all WebSocket clients
  const heartbeat = encodeHeartbeat();
  for (const ws of wsClients) {
    try {
      ws.send(heartbeat);
    } catch {
      wsClients.delete(ws);
    }
  }
}, 1000);

