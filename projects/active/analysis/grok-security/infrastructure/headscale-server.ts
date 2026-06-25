#!/usr/bin/env bun
/**
 * [HEADSCALE][BUN-NATIVE][SERVER]{NO-DOCKER}
 * Bun-native Headscale coordination server wrapper
 * Replaces docker-compose with native Bun process management
 */

import { $ } from "bun";
import {
  preconnectAll,
  DEFAULT_PRECONNECT_TARGETS,
} from "./network-preconnect";

// ===== Port Configuration =====
const DEFAULT_PORTS = {
  HEADSCALE_API: 8080,
  HEADSCALE_METRICS: 9090,
  HEADPLANE: 3000,
  API_PROXY: 4000,
  DERP_STUN: 3478,
  GRPC: 50443,
};

// ===== Configuration =====
const CONFIG = {
  headscale: {
    binary: process.env.HEADSCALE_BIN || "headscale",
    configPath: process.env.HEADSCALE_CONFIG || "./headscale/config.yaml",
    dataDir: process.env.HEADSCALE_DATA || "./data/headscale",
    listenAddr:
      process.env.HEADSCALE_LISTEN || `0.0.0.0:${DEFAULT_PORTS.HEADSCALE_API}`,
    metricsAddr:
      process.env.HEADSCALE_METRICS ||
      `0.0.0.0:${DEFAULT_PORTS.HEADSCALE_METRICS}`,
  },
  headplane: {
    port: parseInt(
      process.env.HEADPLANE_PORT || String(DEFAULT_PORTS.HEADPLANE)
    ),
    headscaleUrl:
      process.env.HEADSCALE_URL ||
      `http://localhost:${DEFAULT_PORTS.HEADSCALE_API}`,
  },
  api: {
    port: parseInt(process.env.API_PORT || String(DEFAULT_PORTS.API_PROXY)),
  },
};

// ===== Process Manager =====
const processes: Map<string, Bun.Subprocess> = new Map();
let apiServer: ReturnType<typeof Bun.serve> | null = null;

/**
 * [1.0.0.0] Start Headscale server
 */
async function startHeadscale(): Promise<void> {
  console.info("🚀 Starting Headscale server...");

  // Ensure data directory exists
  await $`mkdir -p ${CONFIG.headscale.dataDir}`;

  const proc = Bun.spawn([CONFIG.headscale.binary, "serve"], {
    env: {
      ...process.env,
      HEADSCALE_CONFIG: CONFIG.headscale.configPath,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  processes.set("headscale", proc);
  console.info(`✅ Headscale started (PID: ${proc.pid})`);
}

/**
 * [2.0.0.0] API Proxy Server (Bun.serve)
 * Uses server.port and server.url to display actual bound address
 */
function startAPIProxy(): void {
  console.info("🌐 Starting API Proxy server...");

  const server = Bun.serve({
    port: CONFIG.api.port,
    hostname: process.env.API_HOSTNAME || "0.0.0.0",
    async fetch(req) {
      const url = new URL(req.url);
      const clientIP = req.headers.get("X-Forwarded-For") || "unknown";

      // Health check - Response.json() → application/json automatically
      if (url.pathname === "/health") {
        return Response.json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          services: {
            headscale: processes.has("headscale") ? "running" : "stopped",
          },
        });
      }

      // Metrics endpoint - plain text with explicit Content-Type
      if (url.pathname === "/metrics") {
        const metricsUrl = `http://localhost:${DEFAULT_PORTS.HEADSCALE_METRICS}/metrics`;
        try {
          const response = await fetch(metricsUrl);
          return new Response(response.body, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch {
          return new Response("# Metrics unavailable\n", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      }

      // Static file serving - Bun.file() infers Content-Type from extension
      if (url.pathname.startsWith("/static/")) {
        const filePath = `./public${url.pathname.replace("/static", "")}`;
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file); // ← Content-Type inferred from extension
        }
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      // Proxy to Headscale
      const targetUrl = `http://localhost:${DEFAULT_PORTS.HEADSCALE_API}${url.pathname}${url.search}`;

      try {
        const headers = new Headers(req.headers);
        headers.set("X-Forwarded-For", clientIP);
        headers.set("X-Real-IP", clientIP);

        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: req.body,
        });

        return new Response(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            "X-Proxy": "bun-headscale",
          },
        });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 502 });
      }
    },
  });

  // Store server reference for later access
  apiServer = server;

  // Use server.url and server.port to show actual bound address
  console.info(`✅ API Proxy listening on ${server.url}`);
  console.info(`   Port: ${server.port} | Hostname: ${server.hostname}`);
}

/**
 * [3.0.0.0] Graceful shutdown
 */
function setupShutdown(): void {
  const shutdown = async () => {
    console.info("\n🛑 Shutting down...");

    for (const [name, proc] of processes) {
      console.info(`  Stopping ${name}...`);
      proc.kill();
      await proc.exited;
    }

    console.info("✅ All services stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * [4.0.0.0] Main entry point
 */
async function main(): Promise<void> {
  console.info("═══════════════════════════════════════════");
  console.info("  🎛️  Headscale Bun-Native Server");
  console.info("═══════════════════════════════════════════\n");

  setupShutdown();

  // Preconnect to infrastructure hosts
  console.info("🔗 Preconnecting to infrastructure hosts...");
  try {
    await preconnectAll({
      targets: DEFAULT_PRECONNECT_TARGETS,
      parallel: true,
      verbose: false,
    });
    console.info("✅ Network preconnection complete\n");
  } catch (error) {
    console.warn("⚠️  Preconnection warning:", error);
  }

  // Check if headscale binary exists
  try {
    await $`which ${CONFIG.headscale.binary}`.quiet();
  } catch {
    console.error("❌ Headscale binary not found. Install with:");
    console.error("   brew install headscale  # macOS");
    console.error(
      "   # or download from https://github.com/juanfont/headscale/releases"
    );
    process.exit(1);
  }

  await startHeadscale();
  startAPIProxy();

  // Display services using actual server.port and server.url
  console.info("\n📊 Services:");
  console.info(`   Headscale:  http://localhost:${DEFAULT_PORTS.HEADSCALE_API}`);
  if (apiServer) {
    console.info(`   API Proxy:  ${apiServer.url}`);
    console.info(`   API Port:   ${apiServer.port} (actual bound port)`);
  }
  console.info(
    `   Metrics:    http://localhost:${DEFAULT_PORTS.HEADSCALE_METRICS}/metrics`
  );
  console.info("\nPress Ctrl+C to stop\n");
}

main().catch(console.error);
