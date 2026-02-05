/**
 * BunServe - HTTP and WebSocket server using Bun.serve
 *
 * https://bun.sh/docs/runtime/http
 */

import { BunContext } from "../context/BunContext.js";

// @ts-ignore - Bun types are available at runtime
declare global {
  interface URLPatternInput {
    pathname?: string;
    protocol?: string;
    username?: string;
    password?: string;
    hostname?: string;
    port?: string;
    search?: string;
    hash?: string;
    base?: string;
  }

  interface URLPatternResult {
    inputs: [URL | string];
    pathname: {
      input: string;
      groups: Record<string, string | undefined>;
    };
    search?: {
      input: string;
      groups: Record<string, string | undefined>;
    };
    hash?: {
      input: string;
      groups: Record<string, string | undefined>;
    };
  }

  interface URLPattern {
    new(input: URLPatternInput, base?: string): URLPattern;
    test(input: URL | string): boolean;
    exec(input: URL | string): URLPatternResult | null;
  }

  interface ServerWebSocket<T = any> {
    data: T;
    readyState: number;
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    subscribe(topic: string): void;
    unsubscribe(topic: string): void;
    publish(topic: string, data: string | Buffer, compress?: boolean): void;
    isSubscribed(topic: string): boolean;
    cork(callback: () => void): void;
  }
}

export interface ServerOptions {
  port?: number;
  hostname?: string;
  basePath?: string;
  tls?: {
    cert: string;
    key: string;
  };
  cors?: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
  hotReload?: boolean;
  gracefulShutdown?: boolean;
  defaultTimeout?: number;
}

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  pattern: URLPattern;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
}

export interface WebSocketHandler<T = any> {
  message: (ws: ServerWebSocket<T>, message: any) => void | Promise<void>;
  open?: (ws: ServerWebSocket<T>) => void;
  close?: (ws: ServerWebSocket<T>, code: number, reason: string) => void;
}

/**
 * WebSocket protocol options type
 * Reference: https://bun.sh/reference/bun/WebSocketOptionsProtocolsOrProtocol
 */
export type WebSocketProtocolOptions =
  | { protocol: string }
  | { protocols: string | string[] };

  /**
   * Upgrade HTTP request to WebSocket with protocol support
   */
  upgrade(
    request: Request,
    protocolOptions?: WebSocketProtocolOptions
  ): boolean {
    if (!this.server) {
      console.error("❌ Server not running, cannot upgrade WebSocket");
      return false;
    }

    try {
      // @ts-ignore - server.upgrade is available at runtime
      return this.server.upgrade(request, protocolOptions);
    } catch (error) {
      console.error("❌ WebSocket upgrade failed:", error);
      return false;
    }
  }

export class BunServe {
  private routes: Route[] = [];
  private middleware: Array<
    (req: Request, next: () => Promise<Response>) => Response | Promise<Response>
  > = [];
  private server?: ReturnType<typeof Bun.serve>;
  private wsHandler?: WebSocketHandler;
  private hotReloadEnabled: boolean = false;
  private gracefulShutdown: boolean = true;

  constructor(private options: ServerOptions = {}) {
    // Initialize with a default WebSocket handler to satisfy Bun's type requirements
    this.wsHandler = {
      message: (ws, message) => {
        console.log('WebSocket message received:', message);
      }
    };

    // Enable hot reload if specified
    this.hotReloadEnabled = options.hotReload ?? false;
    this.gracefulShutdown = options.gracefulShutdown ?? true;
  }

  /**
   * Add a route to the server
   */
  addRoute(
    method: Route["method"],
    path: string,
    handler: Route["handler"]
  ): this {
    // @ts-ignore - URLPattern is available at runtime
    const pattern = new URLPattern({ pathname: path });
    this.routes.push({ method, pattern, handler });
    return this;
  }

  /**
   * Shorthand for GET routes
   */
  get(path: string, handler: Route["handler"]): this {
    return this.addRoute("GET", path, handler);
  }

  /**
   * Shorthand for POST routes
   */
  post(path: string, handler: Route["handler"]): this {
    return this.addRoute("POST", path, handler);
  }

  /**
   * Shorthand for PUT routes
   */
  put(path: string, handler: Route["handler"]): this {
    return this.addRoute("PUT", path, handler);
  }

  /**
   * Shorthand for DELETE routes
   */
  delete(path: string, handler: Route["handler"]): this {
    return this.addRoute("DELETE", path, handler);
  }

  /**
   * Add middleware to the chain
   */
  use(
    fn: (req: Request, next: () => Promise<Response>) => Response | Promise<Response>
  ): this {
    this.middleware.push(fn);
    return this;
  }

  /**
   * Configure WebSocket handler
   */
  websocket(handler: WebSocketHandler): this {
    this.wsHandler = handler;
    return this;
  }

  /**
   * Upgrade HTTP request to WebSocket with protocol support
   * Reference: https://bun.sh/reference/bun/WebSocketOptionsProtocolsOrProtocol
   */
  upgrade(
    request: Request,
    protocolOptions?: WebSocketProtocolOptions
  ): boolean {
    if (!this.server) {
      console.error("❌ Server not running, cannot upgrade WebSocket");
      return false;
    }

    try {
      // @ts-ignore - server.upgrade is available at runtime
      return this.server.upgrade(request, protocolOptions);
    } catch (error) {
      console.error("❌ WebSocket upgrade failed:", error);
      return false;
    }
  }

  /**
   * Start the server
   */
  start(): void {
    const port = this.options.port ?? (BunContext.getEnvNumber("PORT") ?? 3000);
    const hostname = this.options.hostname ?? "localhost";

    this.server = Bun.serve({
      port,
      hostname,
      fetch: this.fetch.bind(this),
      websocket: this.wsHandler!, // Non-null assertion since we initialize it in constructor
      tls: this.options.tls
        ? {
            certFile: this.options.tls.cert,
            keyFile: this.options.tls.key,
          }
        : undefined,
    });

    console.log(`🚀 Server started on http://${hostname}:${this.server.port}`);
  }

  /**
   * Stop the server with graceful or force shutdown
   */
  async stop(force?: boolean): Promise<void> {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return;
    }

    if (force) {
      // Force stop and close all active connections immediately
      await this.server.stop(true);
      console.log("🛑 Server force stopped (all connections terminated)");
    } else {
      // Gracefully stop the server (waits for in-flight requests)
      await this.server.stop();
      console.log("🛑 Server gracefully stopped (in-flight requests completed)");
    }
  }

  /**
   * Control whether the server keeps the Bun process alive
   */
  unref(): void {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return;
    }

    // Don't keep process alive if server is the only thing running
    // @ts-ignore - server.unref is available at runtime
    this.server.unref();
    console.log("🔓 Server unref'd (process can exit without server)");
  }

  ref(): void {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return;
    }

    // Restore default behavior - keep process alive
    // @ts-ignore - server.ref is available at runtime
    this.server.ref();
    console.log("🔗 Server ref'd (process kept alive by server)");
  }

  /**
   * Hot reload server configuration without downtime
   */
  reload(newOptions?: Partial<ServerOptions>): void {
    if (!this.server) {
      console.log("⚠️ Server not running, cannot reload");
      return;
    }

    if (!this.hotReloadEnabled) {
      console.log("⚠️ Hot reload is not enabled");
      return;
    }

    console.log("🔄 Hot reloading server configuration...");

    // Preserve existing connections
    const existingConnections = this.server.pendingWebSockets || 0;

    // Update options
    if (newOptions) {
      this.options = { ...this.options, ...newOptions };
    }

    // Reload the server with new configuration
    // @ts-ignore - Bun server reload is available at runtime
    if (this.server.reload) {
      this.server.reload({
        fetch: this.fetch.bind(this),
        websocket: this.wsHandler!,
        tls: this.options.tls
          ? {
              certFile: this.options.tls.cert,
              keyFile: this.options.tls.key,
            }
          : undefined,
      });

      console.log(`✅ Server reloaded successfully (${existingConnections} connections preserved)`);
    } else {
      console.log("⚠️ Server reload not available in this Bun version");
    }
  }

  /**
   * Create export default configuration for Bun
   */
  toExportDefault(): any {
    return {
      fetch: this.fetch.bind(this),
      websocket: this.wsHandler!,
      port: this.options.port ?? 3000,
      hostname: this.options.hostname ?? "localhost",
      tls: this.options.tls
        ? {
            certFile: this.options.tls.cert,
            keyFile: this.options.tls.key,
          }
        : undefined,
    };
  }

  /**
   * Generate export default syntax with type safety
   */
  toExportDefaultWithTypeSafety(): string {
    const config = this.toExportDefault();

    return `
import type { Serve } from "bun";

export default {
  fetch(req: Request) {
    ${config.fetch.toString().replace('this.fetch.bind(this)', 'handleRequest')}
  },
  websocket: ${JSON.stringify(config.websocket, null, 2)},
  port: ${config.port},
  hostname: "${config.hostname}",
  ${config.tls ? `tls: ${JSON.stringify(config.tls, null, 2)},` : ''}
} satisfies Serve.Options<undefined>;
    `.trim();
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.server?.port ?? 0;
  }

  /**
   * Set custom timeout for individual requests
   */
  setTimeout(req: Request, seconds: number): void {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return;
    }

    // @ts-ignore - server.timeout is available at runtime
    this.server.timeout(req, seconds);
  }

  /**
   * Get client IP and port information
   */
  getRequestIP(req: Request): { address: string; port: number } | null {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return null;
    }

    // @ts-ignore - server.requestIP is available at runtime
    return this.server.requestIP(req);
  }

  /**
   * Get count of active requests
   */
  getPendingRequests(): number {
    if (!this.server) {
      return 0;
    }

    // @ts-ignore - server.pendingRequests is available at runtime
    return this.server.pendingRequests || 0;
  }

  /**
   * Get count of active WebSocket connections
   */
  getPendingWebSockets(): number {
    if (!this.server) {
      return 0;
    }

    // @ts-ignore - server.pendingWebSockets is available at runtime
    return this.server.pendingWebSockets || 0;
  }

  /**
   * Get count of subscribers for a WebSocket topic
   */
  getSubscriberCount(topic: string): number {
    if (!this.server) {
      return 0;
    }

    // @ts-ignore - server.subscriberCount is available at runtime
    return this.server.subscriberCount(topic) || 0;
  }

  /**
   * Get comprehensive server metrics
   */
  getMetrics(): {
    port: number;
    pendingRequests: number;
    pendingWebSockets: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const memUsage = process.memoryUsage();

    return {
      port: this.getPort(),
      pendingRequests: this.getPendingRequests(),
      pendingWebSockets: this.getPendingWebSockets(),
      uptime: process.uptime(),
      memoryUsage: memUsage
    };
  }

  /**
   * Main request handler
   */
  private async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const fullPath = url.pathname + url.search;

    // Handle CORS preflight
    if (req.method === "OPTIONS" && this.options.cors) {
      return this.corsResponse(new Response(null, { status: 204 }), req);
    }

    // Build middleware chain
    const executeMiddleware = async (req: Request): Promise<Response> => {
      let index = 0;

      const next = async (): Promise<Response> => {
        if (index >= this.middleware.length) {
          return this.handleRequest(req);
        }

        const middleware = this.middleware[index++];
        return middleware(req, next);
      };

      return next();
    };

    try {
      const response = await executeMiddleware(req);
      return this.corsResponse(response, req);
    } catch (error) {
      console.error("Request error:", error);
      return this.corsResponse(
        new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
        req
      );
    }
  }

  /**
   * Route matching and handler execution
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method as Route["method"];

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = route.pattern.exec(url);
      if (match) {
        // Filter out undefined values to match expected type
        const params = Object.fromEntries(
          Object.entries(match.pathname.groups).filter(([_, value]) => value !== undefined)
        ) as Record<string, string>;
        return route.handler(req, params);
      }
    }

    // No matching route
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Apply CORS headers to response
   */
  private corsResponse(response: Response, req: Request): Response {
    if (!this.options.cors) return response;

    const cors = this.options.cors;
    const origin = req.headers.get("Origin");
    const allowedOrigins = cors.origin ?? "*";

    let allowOrigin = "*";
    if (Array.isArray(allowedOrigins)) {
      allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    } else if (typeof allowedOrigins === "string") {
      allowOrigin = allowedOrigins;
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowOrigin);
    headers.set(
      "Access-Control-Allow-Methods",
      cors.methods?.join(", ") ?? "GET, POST, PUT, DELETE, OPTIONS"
    );
    headers.set(
      "Access-Control-Allow-Headers",
      cors.headers?.join(", ") ?? "Content-Type, Authorization"
    );
    if (cors.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Publish a message to all WebSocket subscribers of a topic
   */
  publish(topic: string, data: string | Buffer, compress?: boolean): void {
    if (!this.server) {
      console.log("⚠️ Server not running");
      return;
    }

    // @ts-ignore - server.publish is available at runtime in Bun
    this.server.publish(topic, data, compress);
  }
}

/**
 * Create and start a server with a single function call
 */
export function createServer(options: ServerOptions, setup: (server: BunServe) => void): BunServe {
  const server = new BunServe(options);
  setup(server);
  server.start();
  return server;
}

/**
 * Re-export types for convenience
 */
export type { WebSocketHandler as BunWebSocketHandler, ServerWebSocket };
export type { WebSocketProtocolOptions };
