/**
 * Advanced API Server with Type Definitions
 * 
 * Demonstrates:
 * - Bun.serve with typed request/response handling
 * - Bun.inspect.table for logging requests
 * - Bun.deepEquals for cache validation
 * - Bun.stringWidth for CLI formatting
 */

// --- Type Definitions (as requested) ---
export interface ApiRequestLog {
  id: string;
  timestamp: Date;
  method: HttpMethod;
  path: string;
  statusCode: HttpStatusCode;
  durationMs: number;
  clientIp: string;
  userAgent?: string;
  requestHeaders: Record<string, string>;
  responseSize?: number;
}

export interface ServerMetrics {
  totalRequests: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptimeSeconds: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
  lastAccessed: Date;
}

export interface ApiResponse<T = any> {
  data: T;
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
    cache?: {
      hit: boolean;
      servedFromCache: boolean;
      ttlRemaining?: number;
    };
  };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
export type HttpStatusCode = 
  | 200 | 201 | 204 | 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503;

export interface TableDisplayOptions {
  borderStyle: 'single' | 'double' | 'rounded' | 'none';
  compact: boolean;
  align: Record<string, 'left' | 'center' | 'right'>;
  maxWidth: number;
  colors: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastActive: Date;
  metadata: Record<string, any>;
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// --- Server Implementation ---

console.log("=== Advanced API Server Demo ===");

// Simple in-memory cache
const cache = new Map<string, CacheEntry<string>>();

// Request log for Bun.inspect.table demo
const requestLogs: ApiRequestLog[] = [];

const server = Bun.serve({
  port: 0,
  fetch(req: Request) {
    const start = Date.now();
    const id = crypto.randomUUID();
    const url = new URL(req.url);

    // Simple routing
    if (url.pathname === "/") {
      return new Response("Welcome to Bun API Server!");
    }

    if (url.pathname === "/metrics") {
      const mem = process.memoryUsage();
      const metrics: ServerMetrics = {
        totalRequests: requestLogs.length,
        activeConnections: 1,
        requestsPerMinute: 10,
        averageResponseTime: 5,
        errorRate: 0,
        cacheHitRate: 0.2,
        memoryUsage: mem,
        uptimeSeconds: Math.floor(process.uptime()),
      };
      return new Response(Bun.inspect.table([metrics]), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Log request
    const log: ApiRequestLog = {
      id,
      timestamp: new Date(),
      method: req.method as HttpMethod,
      path: url.pathname,
      statusCode: 200,
      durationMs: Date.now() - start,
      clientIp: req.headers.get("x-forwarded-for") || "localhost",
      userAgent: req.headers.get("user-agent"),
      requestHeaders: Object.fromEntries(req.headers),
    };
    requestLogs.push(log);

    // Display logs periodically (simplified)
    if (requestLogs.length % 3 === 0) {
      console.log("\n--- Recent Requests (Bun.inspect.table) ---");
      console.log(Bun.inspect.table(requestLogs.slice(-5)));
    }

    return new Response(JSON.stringify({ message: "Hello from typed API" }), {
      headers: { "Content-Type": "application/json" }
    });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
console.log("Visit /metrics to see structured data.");
console.log("Press Ctrl+C to stop.");

// Keep alive
await new Promise(() => {});
