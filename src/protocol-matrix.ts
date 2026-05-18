import type { ProtocolCircuitBreaker } from "./protocol-circuit-breaker";

export type Protocol = "http" | "https" | "ws" | "wss" | "s3" | "file" | "data" | "blob" | "unix";

export const ALL_PROTOCOLS: readonly Protocol[] = ["http", "https", "ws", "wss", "s3", "file", "data", "blob", "unix"];

export interface RetryStrategy {
  maxAttempts: number;
  backoff: number;
}

export interface ProtocolConfig {
  maxSize: number;
  timeout: number;
  fallbackChain: readonly Protocol[];
  retryStrategy: RetryStrategy;
}

export const PROTOCOL_MATRIX: Record<Protocol, ProtocolConfig> = {
  data: {
    maxSize: 64 * 1024,
    timeout: 1_000,
    fallbackChain: ["blob", "file"],
    retryStrategy: { maxAttempts: 1, backoff: 0 },
  },
  blob: {
    maxSize: 5 * 1024 * 1024,
    timeout: 5_000,
    fallbackChain: ["file", "https"],
    retryStrategy: { maxAttempts: 2, backoff: 100 },
  },
  file: {
    maxSize: 1024 * 1024 * 1024,
    timeout: 30_000,
    fallbackChain: ["https", "s3"],
    retryStrategy: { maxAttempts: 3, backoff: 500 },
  },
  http: {
    maxSize: 100 * 1024 * 1024,
    timeout: 15_000,
    fallbackChain: ["https", "file"],
    retryStrategy: { maxAttempts: 3, backoff: 1_000 },
  },
  https: {
    maxSize: 100 * 1024 * 1024,
    timeout: 15_000,
    fallbackChain: ["http", "file"],
    retryStrategy: { maxAttempts: 3, backoff: 1_000 },
  },
  s3: {
    maxSize: 5 * 1024 * 1024 * 1024,
    timeout: 60_000,
    fallbackChain: ["https", "file"],
    retryStrategy: { maxAttempts: 5, backoff: 2_000 },
  },
  unix: {
    maxSize: 100 * 1024 * 1024,
    timeout: 10_000,
    fallbackChain: ["http", "file"],
    retryStrategy: { maxAttempts: 3, backoff: 500 },
  },
  ws: {
    maxSize: 16 * 1024 * 1024,
    timeout: 30_000,
    fallbackChain: ["wss", "http"],
    retryStrategy: { maxAttempts: 3, backoff: 1_000 },
  },
  wss: {
    maxSize: 16 * 1024 * 1024,
    timeout: 30_000,
    fallbackChain: ["ws", "https"],
    retryStrategy: { maxAttempts: 3, backoff: 1_000 },
  },
};

export interface ExecuteRequest {
  data: unknown;
  size?: number;
  key?: string;
  options?: {
    localOnly?: boolean;
    maxCost?: number;
    cache?: boolean;
    protocol?: Protocol;
  };
}

export interface ExecuteResult {
  success: boolean;
  protocol: Protocol;
  data: unknown;
  metadata: { latency: number; cacheHit: boolean };
}

type CacheEntry = { result: ExecuteResult; expires: number };

const CACHE_TTL = 30_000;
const MAX_CACHE_SIZE = 1_000;
const MAX_CONCURRENT = 50;

function fastHash(data: unknown): string {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  if (str.length <= 64) return str;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return `h${hash >>> 0}`;
}

class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next?.();
    } else {
      this.permits++;
    }
  }
}

const semaphore = new Semaphore(MAX_CONCURRENT);

export class ProtocolOrchestrator {
  private static cache = new Map<string, CacheEntry>();
  private static metrics = new Map<Protocol, number>();
  private static circuitBreaker: ProtocolCircuitBreaker | null = null;

  static setCircuitBreaker(cb: ProtocolCircuitBreaker): void {
    this.circuitBreaker = cb;
  }

  static getCircuitBreaker(): ProtocolCircuitBreaker | null {
    return this.circuitBreaker;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static selectProtocol(
    size: number,
    options?: { localOnly?: boolean; maxCost?: number },
  ): { primary: Protocol } {
    if (options?.localOnly) return { primary: "file" };
    if (options?.maxCost !== undefined) return { primary: "file" };
    if (size < 1024) return { primary: "data" };
    if (size < 1024 * 1024) return { primary: "blob" };
    return { primary: "https" };
  }

  static async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    const cacheKey = request.key ?? fastHash(request.data);
    const useCache = request.options?.cache !== false;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return { ...cached.result, metadata: { ...cached.result.metadata, cacheHit: true } };
      }
    }

    await semaphore.acquire();

    const size = request.size ?? (typeof request.data === "string" ? request.data.length : JSON.stringify(request.data).length);
    const selected = request.options?.protocol
      ? { primary: request.options.protocol }
      : this.selectProtocol(size, request.options);

    const config = PROTOCOL_MATRIX[selected.primary];
    const chain = [selected.primary, ...config.fallbackChain];

    const start = performance.now();

    try {
      for (const protocol of chain) {
        if (this.circuitBreaker && !this.circuitBreaker.isAvailable(protocol)) continue;
        try {
          const data = await this.executeProtocol(protocol, request.data);
          this.circuitBreaker?.recordSuccess(protocol);
          const latency = performance.now() - start;
          this.bumpMetric(protocol);

          const result: ExecuteResult = {
            success: true,
            protocol,
            data,
            metadata: { latency, cacheHit: false },
          };

          if (useCache) {
            if (this.cache.size >= MAX_CACHE_SIZE) this.evictExpired();
            this.cache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
          }

          return result;
        } catch {
          this.circuitBreaker?.recordFailure(protocol);
        }
      }

      const latency = performance.now() - start;
      return {
        success: false,
        protocol: selected.primary,
        data: null,
        metadata: { latency, cacheHit: false },
      };
    } finally {
      semaphore.release();
    }
  }

  static executeProtocol(protocol: Protocol, data: unknown): Promise<unknown> {
    switch (protocol) {
      case "data":
        return Promise.resolve({
          encoded: btoa(JSON.stringify(data)),
        });
      case "blob":
        return Promise.resolve({
          url: `blob:${crypto.randomUUID()}`,
        });
      case "file":
        return Promise.resolve({
          path: `/tmp/protocol-${Date.now()}.json`,
        });
      case "ws":
      case "wss":
        return Promise.resolve({
          socket: { url: `${protocol}://localhost`, readyState: 1, binaryType: "blob" },
        });
      case "http":
      case "https":
      case "s3":
      case "unix":
        return Promise.resolve({
          response: { status: 200, protocol, size: JSON.stringify(data).length },
        });
    }
  }

  static getMetrics(): Record<Protocol, number> {
    return Object.fromEntries(
      ALL_PROTOCOLS.map((p) => [p, this.metrics.get(p) ?? 0]),
    ) as Record<Protocol, number>;
  }

  static healthCheck(): Record<Protocol, boolean> {
    return Object.fromEntries(
      ALL_PROTOCOLS.map((p) => [p, true]),
    ) as Record<Protocol, boolean>;
  }

  /** Reset all internal state — useful between tests */
  static reset(): void {
    this.cache.clear();
    this.metrics.clear();
    this.circuitBreaker?.resetAll();
  }

  /** Remove expired entries; if still over cap, drop oldest by insertion order. */
  private static evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires <= now) this.cache.delete(key);
    }
    // If still at capacity, drop the oldest entry (Map iterates in insertion order)
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  private static bumpMetric(protocol: Protocol): void {
    this.metrics.set(protocol, (this.metrics.get(protocol) ?? 0) + 1);
  }
}
