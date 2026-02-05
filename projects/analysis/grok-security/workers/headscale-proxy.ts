/**
 * [HEADSCALE][CLOUDFLARE][WORKER]{TAILSCALE-INTEGRATION}
 * Headscale Proxy Worker with DurableObject for rate limiting
 * WebSocket support for DERP, API authentication, DDoS protection
 *
 * @version 1.0.0
 * @channel stable
 * @component headscale-proxy
 */

import { DurableObject } from "cloudflare:workers";

// ===== Version Info (injected at build time) =====
const VERSION = process.env.QUANTUM_VERSION || "1.0.0-dev";
const CHANNEL = process.env.QUANTUM_CHANNEL || "dev";
const BUILD_ID = process.env.QUANTUM_BUILD_ID || "local";

// ===== Port Configuration =====
const DEFAULT_PORTS = {
  HEADSCALE_API: 8080,
  HEADSCALE_METRICS: 9090,
  GRPC: 50443,
  DERP_STUN: 3478,
};

// Headscale API routes
const HEADSCALE_ROUTES = {
  api: "/api/v1/*",
  derp: "/derp",
  register: "/register",
  metrics: "/metrics",
  debug: "/debug/*",
  health: "/health",
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60000,
  burst: 20,
};

// Security headers (Tailscale-aware)
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export interface Env {
  HEADSCALE_PROXY: DurableObjectNamespace;
  HEADSCALE_URL: string;
  HEADSCALE_API_KEY: string;
  HEADSCALE_ANALYTICS?: AnalyticsEngineDataset;
  RATE_LIMIT_BURST?: string;
}

/**
 * [1.0.0.0] HeadscaleProxy DurableObject
 * Manages rate limiting and WebSocket connections per client
 */
export class HeadscaleProxy extends DurableObject {
  private headscaleUrl: string;
  private apiKey?: string;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    const headscaleHost = env.HEADSCALE_HOST || "100.64.0.10";
    const headscalePort =
      env.HEADSCALE_PORT || String(DEFAULT_PORTS.HEADSCALE_API);
    this.headscaleUrl =
      env.HEADSCALE_URL || `http://${headscaleHost}:${headscalePort}`;
    this.apiKey = env.HEADSCALE_API_KEY;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    // Add client IP to security headers
    const headers = {
      ...SECURITY_HEADERS,
      "X-Tailscale-Source": clientIP,
    };

    // ===== Rate Limiting (Per IP) =====
    const rateLimitKey = `rate:${clientIP}`;
    const limit = await this.checkRateLimit(rateLimitKey);

    if (!limit.allowed) {
      return new Response("Rate Limited", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.reset / 1000)),
          ...headers,
        },
      });
    }

    // ===== Health Check (with version info) =====
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          version: VERSION,
          channel: CHANNEL,
          buildId: BUILD_ID,
          timestamp: new Date().toISOString(),
          headscale: this.headscaleUrl,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // ===== WebSocket Upgrade (Tailscale DERP) =====
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request, headers);
    }

    // ===== API Authentication =====
    if (url.pathname.startsWith("/api")) {
      const auth = request.headers.get("Authorization");
      if (
        !auth ||
        !auth.startsWith("Bearer ") ||
        auth.slice(7) !== this.apiKey
      ) {
        return new Response("Unauthorized", { status: 401, headers });
      }
    }

    // ===== Proxy to Headscale =====
    return this.proxyRequest(request, headers);
  }

  /**
   * [1.1.0.0] Handle WebSocket upgrade for DERP
   */
  async handleWebSocket(
    request: Request,
    headers: Record<string, string>
  ): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");

    if (!upgradeHeader) {
      return new Response("Expected WebSocket", { status: 400, headers });
    }

    // Connect to Headscale DERP server
    const headscaleWsUrl = this.headscaleUrl.replace("http", "ws") + "/derp";

    try {
      const client = new WebSocket(headscaleWsUrl);
      const [clientSocket, serverSocket] = Object.values(new WebSocketPair());

      // Accept the WebSocket connection
      this.ctx.acceptWebSocket(serverSocket);

      // Bi-directional proxy
      client.addEventListener("message", (event) => {
        if (serverSocket.readyState === WebSocket.OPEN) {
          serverSocket.send(event.data);
        }
      });

      serverSocket.addEventListener("message", (event) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(event.data);
        }
      });

      client.addEventListener("close", () => serverSocket.close());
      serverSocket.addEventListener("close", () => client.close());

      return new Response(null, {
        status: 101,
        webSocket: clientSocket,
        headers,
      });
    } catch (error) {
      return new Response(`WebSocket Error: ${error}`, {
        status: 500,
        headers,
      });
    }
  }

  /**
   * [1.2.0.0] Proxy HTTP request to Headscale
   */
  async proxyRequest(
    request: Request,
    headers: Record<string, string>
  ): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = this.headscaleUrl + url.pathname + url.search;

    // Add Tailscale metadata headers
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set(
      "X-Forwarded-For",
      request.headers.get("CF-Connecting-IP") || ""
    );
    proxyHeaders.set(
      "X-Real-IP",
      request.headers.get("CF-Connecting-IP") || ""
    );
    proxyHeaders.set("X-Forwarded-Proto", "https");

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.body,
        redirect: "follow",
      });

      // Add security headers to response
      const responseHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(`Proxy Error: ${error}`, {
        status: 502,
        headers: { ...headers, "Content-Type": "text/plain" },
      });
    }
  }

  /**
   * [1.3.0.0] Rate limiting with Durable Object storage
   */
  async checkRateLimit(
    key: string
  ): Promise<{ allowed: boolean; reset: number }> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs;

    // Get request count from storage
    const stored = await this.ctx.storage.get<number[]>(key);
    const requests = stored?.filter((t) => t > windowStart) || [];

    if (requests.length >= RATE_LIMIT_CONFIG.maxRequests) {
      const oldest = Math.min(...requests);
      return {
        allowed: false,
        reset: oldest + RATE_LIMIT_CONFIG.windowMs - now,
      };
    }

    // Record this request
    requests.push(now);
    await this.ctx.storage.put(key, requests);

    return { allowed: true, reset: 0 };
  }
}

/**
 * [2.0.0.0] Cloudflare Worker entry point
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Get client IP for Durable Object routing
    const clientIP = request.headers.get("CF-Connecting-IP") || "default";

    // Use IP-based Durable Object for rate limiting
    const id = env.HEADSCALE_PROXY.idFromName(clientIP);
    const stub = env.HEADSCALE_PROXY.get(id);

    return stub.fetch(request);
  },
};
