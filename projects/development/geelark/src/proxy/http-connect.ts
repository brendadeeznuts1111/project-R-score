/**
 * HTTP CONNECT Proxy with 13-Byte Config Awareness
 *
 * Implements an HTTP CONNECT proxy that:
 * - Validates config version before tunneling
 * - Routes by registry hash to different upstreams
 * - Verifies proxy tokens signed with domain hash
 * - Injects config headers into tunneled requests
 *
 * **Last Updated**: 2026-01-08
 * **Version**: 1.0.0
 */

import { createServer, Server } from "node:http";
import { createProxy } from "node:proxy";
import {
  HEADERS,
  extractConfigFromHeaders,
  validateConfig,
  verifyProxyToken,
  issueProxyToken,
  type ConfigState,
} from "./headers.js";
import {
  validateProxyHeaders,
  type ValidationResult,
  validationMetrics,
} from "./validator.js";
import { resolveProxyUrl, getDNSStats } from "./dns.js";

/**
 * Upstream registry configuration
 */
interface UpstreamConfig {
  host: string;
  port: number;
  hash: number; // Registry hash to match
  tls: boolean;
}

/**
 * Proxy configuration
 */
interface ProxyConfig {
  listenPort: number;
  listenHost: string;
  upstreams: UpstreamConfig[];
  defaultUpstream: string;
  timeout: number;
}

/**
 * Default proxy configuration
 */
const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  listenPort: 4873,
  listenHost: "0.0.0.0",
  upstreams: [
    {
      host: "registry.mycompany.com",
      port: 443,
      hash: 0xa1b2c3d4,
      tls: true,
    },
    {
      host: "registry.npmjs.org",
      port: 443,
      hash: 0x00000000,
      tls: true,
    },
  ],
  defaultUpstream: "registry.npmjs.org:443",
  timeout: 30000,
};

/**
 * Config-aware HTTP CONNECT proxy
 */
export class ConfigAwareProxy {
  private config: ProxyConfig;
  private server: Server;
  private upstreamMap: Map<number, UpstreamConfig>;

  constructor(config: Partial<ProxyConfig> = {}) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
    this.upstreamMap = new Map();

    // Build hash -> upstream mapping
    for (const upstream of this.config.upstreams) {
      this.upstreamMap.set(upstream.hash, upstream);
    }

    // Create HTTP server
    this.server = createServer();

    // Handle CONNECT method
    this.server.on("connect", this.handleConnect.bind(this));

    // Handle errors
    this.server.on("error", (err) => {
      console.error(`Proxy error: ${err.message}`);
    });
  }

  /**
   * Start proxy server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.listenPort, this.config.listenHost, () => {
        console.log(`🔒 Config-aware proxy listening on ${this.config.listenHost}:${this.config.listenPort}`);
        console.log(`   Upstreams: ${this.config.upstreams.map(u => u.host).join(", ")}`);
        resolve();
      });

      this.server.once("error", reject);
    });
  }

  /**
   * Stop proxy server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log("Proxy stopped");
        resolve();
      });
    });
  }

  /**
   * Handle CONNECT request with strict header validation
   */
  private async handleConnect(
    req: IncomingMessage,
    socket: Socket,
    head: Buffer
  ): Promise<void> {
    const { url, method, headers } = req;
    const requestId = headers.get(HEADERS.REQUEST_ID);

    // Only handle CONNECT
    if (method !== "CONNECT") {
      socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
      socket.end();
      return;
    }

    const validationStart = performance.now();

    try {
      // Step 1: Validate all X-Bun-* headers (400 Bad Request on failure)
      const validation = validateProxyHeaders(new Headers(headers));

      // Log validation metrics
      const validationDuration = performance.now() - validationStart;
      validationMetrics.record(
        validation.valid ? { valid: true, parsed: null } : { valid: false, error: validation.errors[0] },
        Math.floor(validationDuration * 1_000_000) // Convert to nanoseconds
      );

      // Check if validation failed
      if (!validation.valid) {
        const errors = validation.errors;

        console.error(`[${requestId}] ❌ Header validation failed:`, {
          count: errors.length,
          errors: errors.map((e) => ({
            header: e.header,
            code: e.code,
            message: e.message,
          })),
        });

        // Return 400 Bad Request with validation errors
        const errorBody = JSON.stringify({
          error: "Invalid proxy headers",
          validationErrors: errors.map((e) => e.toJSON()),
        });

        socket.write(
          `HTTP/1.1 400 Bad Request\r\n` +
          `Content-Type: application/json\r\n` +
          `Content-Length: ${errorBody.length}\r\n` +
          `Connection: close\r\n\r\n` +
          errorBody
        );
        socket.end();
        return;
      }

      // Step 2: Extract validated config from headers
      const config = extractConfigFromHeaders(new Headers(headers));

      console.log(`[${requestId}] ✅ Headers validated (${(validationDuration * 1000).toFixed(0)}ns)`);
      console.log(`[${requestId}] CONNECT ${url} with config: ${headers.get(HEADERS.CONFIG_DUMP)}`);

      // Step 3: Validate config version (503 Service Unavailable on mismatch)
      if (!this.validateConfigVersion(config)) {
        console.error(`[${requestId}] ❌ Config version mismatch: ${config.version}`);
        this.sendError(socket, 503, "Config version mismatch (expected 1)");
        return;
      }

      // Step 4: Verify proxy token (401 Unauthorized on failure)
      const token = headers.get(HEADERS.PROXY_TOKEN);
      if (!token || !verifyProxyToken(token, config.registryHash)) {
        console.error(`[${requestId}] ❌ Invalid proxy token`);
        this.sendError(socket, 401, "Invalid proxy token");
        return;
      }

      // Step 5: Determine upstream based on registry hash
      const upstream = this.selectUpstream(config);
      console.log(`[${requestId}] Selected upstream: ${upstream.host}:${upstream.port} (hash: 0x${config.registryHash.toString(16)})`);

      // Step 6: Resolve upstream hostname via DNS cache (50ns hit, 5ms miss)
      const dnsStart = performance.now();
      const proxyUrl = `https://${upstream.host}:${upstream.port}`;
      const resolvedUrl = await resolveProxyUrl(proxyUrl);
      const dnsDuration = performance.now() - dnsStart;

      console.log(`[${requestId}] DNS resolved: ${upstream.host} → ${new URL(resolvedUrl).hostname} (${(dnsDuration * 1000).toFixed(0)}µs)`);

      // Step 7: Log DNS stats (in debug mode)
      if (process.env.DEBUG || process.env.NODE_ENV === "development") {
        const dnsStats = getDNSStats();
        console.log(`[${requestId}] DNS stats: ${dnsStats.hits} hits, ${dnsStats.misses} misses, ${(dnsStats.hitRate * 100).toFixed(1)}% hit rate`);
      }

      // Step 8: Establish tunnel
      await this.establishTunnel(socket, upstream, url, head);

      // Success log
      const totalDuration = performance.now() - validationStart;
      console.log(`[${requestId}] ✅ CONNECT established in ${(totalDuration * 1000).toFixed(0)}µs`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${requestId}] ❌ Error handling CONNECT: ${errorMessage}`);

      this.sendError(socket, 500, "Internal proxy error");
    }
  }

  /**
   * Validate config version matches expected
   */
  private validateConfigVersion(config: ConfigState): boolean {
    // Expected version 1 (modern config)
    return config.version === 1;
  }

  /**
   * Select upstream based on registry hash
   */
  private selectUpstream(config: ConfigState): UpstreamConfig {
    // Try to find upstream by hash
    const upstream = this.upstreamMap.get(config.registryHash);

    if (upstream) {
      return upstream;
    }

    // Default to first upstream
    console.warn(`No upstream found for hash 0x${config.registryHash.toString(16)}, using default`);
    return this.config.upstreams[0];
  }

  /**
   * Establish TLS tunnel to upstream
   */
  private async establishTunnel(
    clientSocket: Socket,
    upstream: UpstreamConfig,
    targetUrl: string,
    head: Buffer
  ): Promise<void> {
    const net = await import("node:net");
    const tls = await import("node:tls");

    // Parse target URL
    const [targetHost, targetPort] = targetUrl.split(":");
    const port = parseInt(targetPort) || (upstream.tls ? 443 : 80);

    // Create connection to upstream
    const options = {
      host: upstream.host,
      port: upstream.port,
      // For HTTPS CONNECT, we connect to upstream and let it handle TLS
    };

    const upstreamSocket = upstream.tls
      ? tls.connect({
          host: upstream.host,
          port: upstream.port,
          servername: upstream.host,
        })
      : net.createConnection(options);

    upstreamSocket.on("connect", () => {
      // Send 200 Connection Established to client
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

      // Pipe data between client and upstream
      clientSocket.pipe(upstreamSocket);
      upstreamSocket.pipe(clientSocket);

      // Handle cleanup
      clientSocket.on("close", () => upstreamSocket.destroy());
      upstreamSocket.on("close", () => clientSocket.destroy());
      clientSocket.on("error", (err) => {
        console.error(`Client socket error: ${err}`);
        upstreamSocket.destroy();
      });
      upstreamSocket.on("error", (err) => {
        console.error(`Upstream socket error: ${err}`);
        clientSocket.destroy();
      });
    });

    upstreamSocket.on("error", (err) => {
      console.error(`Failed to connect to upstream: ${err}`);
      this.sendError(clientSocket, 502, "Bad Gateway");
    });
  }

  /**
   * Send error response to client
   */
  private sendError(socket: Socket, code: number, message: string): void {
    socket.write(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
    socket.end();
  }
}

/**
 * Create and start a config-aware proxy instance
 */
export async function createConfigAwareProxy(
  config?: Partial<ProxyConfig>
): Promise<ConfigAwareProxy> {
  const proxy = new ConfigAwareProxy(config);
  await proxy.start();
  return proxy;
}

/**
 * Middleware to inject config headers into requests
 */
export function createProxyMiddleware(domain: string) {
  return {
    /**
     * Apply to outgoing request
     */
    apply(req: RequestInit): RequestInit {
      const headers = new Headers(req.headers);

      // Add proxy token
      const token = issueProxyToken(domain);
      headers.set(HEADERS.PROXY_TOKEN, token);

      // Add request ID
      headers.set(HEADERS.REQUEST_ID, crypto.randomUUID());

      return { ...req, headers };
    },

    /**
     * Validate incoming response
     */
    validate(res: Response): boolean {
      const config = extractConfigFromHeaders(res.headers);
      return validateConfig(config, { version: 1 });
    },
  };
}

/**
 * Proxy factory for create-server
 */
export function createProxyHandler() {
  return {
    /**
     * Handle CONNECT requests
     */
    async connect(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // Extract config from headers
      const config = extractConfigFromHeaders(req.headers);

      // Validate config version
      if (config.version !== 1) {
        return new Response("Config version mismatch", { status: 503 });
      }

      // Select upstream by registry hash
      const upstream = selectUpstreamByHash(config.registryHash);

      // Verify proxy token
      const token = req.headers.get(HEADERS.PROXY_TOKEN);
      if (!token || !verifyProxyToken(token, config.registryHash)) {
        return new Response("Invalid proxy token", { status: 401 });
      }

      // Establish tunnel (simplified - actual implementation would use TCP)
      return new Response("Tunnel established", {
        status: 200,
        headers: {
          "X-Proxy-Upstream": upstream,
        },
      });
    },
  };
}

/**
 * Select upstream by registry hash
 */
function selectUpstreamByHash(hash: number): string {
  const upstreams: Record<number, string> = {
    0xa1b2c3d4: "registry.mycompany.com:443",
    0x00000000: "registry.npmjs.org:443",
  };

  return upstreams[hash] || "registry.npmjs.org:443";
}

/**
 * Bun.serve() integration example
 */
export function createConfigAwareServer(options: {
  port: number;
  upstreams: Array<{ hash: number; host: string; port: number }>;
}) {
  const { port, upstreams } = options;

  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // Handle CONNECT for proxying
      if (req.method === "CONNECT") {
        const config = extractConfigFromHeaders(req.headers);

        // Validate and route
        const upstream = upstreams.find(u => u.hash === config.registryHash);
        if (!upstream) {
          return new Response("Unknown registry hash", { status: 502 });
        }

        // Return 200 for successful CONNECT (actual tunneling requires TCP socket)
        return new Response(`Tunneling to ${upstream.host}:${upstream.port}`, {
          status: 200,
          headers: {
            "X-Proxy-Upstream": `${upstream.host}:${upstream.port}`,
          },
        });
      }

      // Handle other requests
      return new Response("Config-aware proxy", { status: 200 });
    },
  });
}

// Type definitions for node:http
type IncomingMessage = any;
type Socket = any;
