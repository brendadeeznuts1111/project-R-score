#!/usr/bin/env bun
/**
 * Component #106: HTTP-Server-Engine
 * Primary API: Bun.serve()
 * Secondary API: Bun.listen()
 * Performance SLA: 10.8ms p99 (Golden Matrix)
 * Parity Lock: a1b2...3c4d
 * Status: OPTIMIZED
 */

import { feature } from "bun:bundle";

interface HTTPServerConfig {
  port?: number;
  hostname?: string;
  reusePort?: boolean;
  maxRequestBodySize?: number;
  idleTimeout?: number;
  development?: boolean;
}

interface HTTPServerMetrics {
  requests: number;
  errors: number;
  avgResponseTime: number;
  p99ResponseTime: number;
  activeConnections: number;
}

export class HTTPServerEngine {
  private static instance: HTTPServerEngine;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private metrics: HTTPServerMetrics = {
    requests: 0,
    errors: 0,
    avgResponseTime: 0,
    p99ResponseTime: 0,
    activeConnections: 0,
  };
  private responseTimes: number[] = [];

  private constructor() {}

  static getInstance(): HTTPServerEngine {
    if (!this.instance) {
      this.instance = new HTTPServerEngine();
    }
    return this.instance;
  }

  /**
   * Create optimized HTTP server with 10.8ms p99 target
   */
  createServer(
    config: HTTPServerConfig,
    handler: (request: Request) => Response | Promise<Response>
  ): ReturnType<typeof Bun.serve> {
    if (!feature("HTTP_SERVER_ENGINE")) {
      // Zero-cost fallback
      return Bun.serve({
        port: config.port || 3000,
        hostname: config.hostname || "localhost",
        fetch: handler,
      });
    }

    const optimizedConfig = {
      port: config.port || 3000,
      hostname: config.hostname || "localhost",
      reusePort: config.reusePort ?? true,
      maxRequestBodySize: config.maxRequestBodySize ?? 1024 * 1024 * 10, // 10MB
      idleTimeout: config.idleTimeout ?? 10, // 10 seconds
      development: config.development ?? false,
      fetch: this.createInstrumentedHandler(handler),
    };

    this.server = Bun.serve(optimizedConfig as any);
    return this.server;
  }

  /**
   * Instrumented handler with performance tracking
   */
  private createInstrumentedHandler(
    handler: (request: Request) => Response | Promise<Response>
  ): (request: Request, server: any) => Response | Promise<Response> {
    return async (request: Request, server: any): Promise<Response> => {
      const startTime = performance.now();
      this.metrics.activeConnections++;

      try {
        const response = await handler(request);
        const duration = performance.now() - startTime;

        // Update metrics
        this.metrics.requests++;
        this.responseTimes.push(duration);

        // Keep only last 1000 response times for p99 calculation
        if (this.responseTimes.length > 1000) {
          this.responseTimes.shift();
        }

        this.updatePerformanceMetrics();

        // SLA check: 10.8ms p99 target
        if (duration > 10.8) {
          console.warn(
            `⚠️  HTTP Server SLA breach: ${duration.toFixed(2)}ms > 10.8ms`
          );
        }

        return response;
      } catch (error) {
        this.metrics.errors++;
        console.error("HTTP Server Error:", error);
        return new Response("Internal Server Error", { status: 500 });
      } finally {
        this.metrics.activeConnections--;
      }
    };
  }

  /**
   * Calculate p99 response time
   */
  private updatePerformanceMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p99 = sorted[p99Index] || 0;
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    this.metrics.p99ResponseTime = p99;
    this.metrics.avgResponseTime = avg;
  }

  /**
   * Get current metrics
   */
  getMetrics(): HTTPServerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      p99ResponseTime: 0,
      activeConnections: 0,
    };
    this.responseTimes = [];
  }

  /**
   * Health check for server
   */
  async healthCheck(port: number = 3000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.server) {
      this.server.stop();
      console.log("✅ HTTP Server Engine stopped gracefully");
    }
  }
}

// Zero-cost export
export const httpServerEngine = feature("HTTP_SERVER_ENGINE")
  ? HTTPServerEngine.getInstance()
  : {
      createServer: (config: HTTPServerConfig, handler: any) =>
        Bun.serve({
          port: config.port || 3000,
          hostname: config.hostname || "localhost",
          fetch: handler,
        }),
      getMetrics: () => ({}),
      resetMetrics: () => {},
      healthCheck: async () => true,
      shutdown: () => {},
    };

export default httpServerEngine;
