import type { ProtocolCircuitBreaker } from "./protocol-circuit-breaker";

export type Protocol = "http" | "https" | "ws" | "wss" | "s3" | "file" | "data" | "blob" | "unix";

export interface ProtocolConfig {
  maxSize: number;
  timeout: number;
  fallbackChain: Protocol[];
  retryStrategy: { maxAttempts: number; backoff: number };
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
const MAX_CONCURRENT = 50;

export class ProtocolOrchestrator {
  private static cache = new Map<string, CacheEntry>();
  private static metrics = new Map<Protocol, number>();
  private static activeConcurrent = 0;
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
    const cacheKey = JSON.stringify(request.data);
    const useCache = request.options?.cache !== false;

    // Check cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return { ...cached.result, metadata: { ...cached.result.metadata, cacheHit: true } };
      }
    }

    // Concurrency gate
    if (this.activeConcurrent >= MAX_CONCURRENT) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (this.activeConcurrent < MAX_CONCURRENT) resolve();
          else setTimeout(check, 1);
        };
        check();
      });
    }
    this.activeConcurrent++;

    const size = request.size ?? cacheKey.length;
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
            this.cache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
          }

          return result;
        } catch {
          this.circuitBreaker?.recordFailure(protocol);
        }
      }

      // All protocols in chain failed
      const latency = performance.now() - start;
      return {
        success: false,
        protocol: selected.primary,
        data: null,
        metadata: { latency, cacheHit: false },
      };
    } finally {
      this.activeConcurrent--;
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
    const all: Protocol[] = ["http", "https", "ws", "wss", "s3", "file", "data", "blob", "unix"];
    const result = {} as Record<Protocol, number>;
    for (const p of all) {
      result[p] = this.metrics.get(p) ?? 0;
    }
    return result;
  }

  static healthCheck(): Record<Protocol, boolean> {
    const all: Protocol[] = ["http", "https", "ws", "wss", "s3", "file", "data", "blob", "unix"];
    const result = {} as Record<Protocol, boolean>;
    for (const p of all) {
      result[p] = true;
    }
    return result;
  }

  /** Reset all internal state — useful between tests */
  static reset(): void {
    this.cache.clear();
    this.metrics.clear();
    this.activeConcurrent = 0;
    this.circuitBreaker?.resetAll();
  }

  private static bumpMetric(protocol: Protocol): void {
    this.metrics.set(protocol, (this.metrics.get(protocol) ?? 0) + 1);
  }
}
