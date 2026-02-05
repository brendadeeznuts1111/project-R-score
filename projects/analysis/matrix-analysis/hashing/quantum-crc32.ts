// hashing/quantum-crc32.ts
import { performance } from "perf_hooks";

// Types

interface VerifyOptions {
  securityLevel?: "low" | "medium" | "high";
  quantumSeal?: boolean;
  expectedCRC32?: number;
}

interface IntegrityResult {
  valid: boolean;
  crc32: number;
  crc32Time: number;
  sha256?: string;
  sha256Time: number;
  totalTime: number;
  size: number;
  performanceGain: number;
}

interface BatchCRC32Options {
  batchSize?: number;
  cacheResults?: boolean;
}

interface BatchCRC32Result {
  hashes: number[];
  duration: number;
  throughput: number;
  averageTime: number;
  cacheHits: number;
  cacheMisses: number;
}

interface BufferAllocOptions {
  type?: string;
  reuse?: boolean;
}

interface HashBenchmarkResult {
  size: number;
  crc32: {
    hash: number;
    time: number;
    speed: string;
  };
  sha256: {
    hash: string;
    time: number;
    speed: string;
  };
  speedup: number;
  recommendation: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  crc32CacheSize: number;
  bufferCacheSize: number;
}

interface HashPerformanceEntry {
  operation: string;
  time: number;
  size: number;
  timestamp: number;
}

export class Tier1380HashSystem {
  private static readonly BUFFER_CACHE = new Map<string, Buffer>();
  private static readonly CRC32_CACHE = new Map<string, number>();
  private static readonly PERFORMANCE_LOG: HashPerformanceEntry[] = [];
  private static readonly MAX_BUFFER_CACHE_ENTRIES = 50;
  private static readonly MAX_CRC32_CACHE_ENTRIES = 1000;
  private static cacheHits = 0;
  private static cacheMisses = 0;

  // CRC32 with caching for large buffers
  static crc32(data: Buffer | string): number {
    const buffer = typeof data === "string"
      ? Buffer.from(data)
      : data;

    // Cache hot paths for 1MB+ buffers
    if (buffer.length >= 1024 * 1024) {
      const cacheKey = this.getCacheKey(buffer);
      if (this.CRC32_CACHE.has(cacheKey)) {
        this.cacheHits++;
        return this.CRC32_CACHE.get(cacheKey)!;
      }
      this.cacheMisses++;
    }

    const startTime = performance.now();
    const hash = Bun.hash.crc32(buffer);
    const duration = performance.now() - startTime;

    // Cache large buffers
    if (buffer.length >= 1024 * 1024) {
      const cacheKey = this.getCacheKey(buffer);
      this.CRC32_CACHE.set(cacheKey, hash);
      this.evictCRC32Cache();
      this.recordPerformance("crc32", duration, buffer.length);
    }

    return hash;
  }

  // Hybrid validation: fast CRC32 + optional SHA-256 for security paths
  static async verifyIntegrity(
    data: Buffer,
    options: VerifyOptions = {}
  ): Promise<IntegrityResult> {
    const startTime = performance.now();

    // Fast path: CRC32
    const crc32Hash = this.crc32(data);
    const crc32Time = performance.now() - startTime;

    let sha256: string | undefined;
    let sha256Time = 0;

    // Security path: SHA-256 for high-security or quantum-sealed data
    if (options.securityLevel === "high" || options.quantumSeal) {
      const sha256Start = performance.now();
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      sha256 = Buffer.from(hashBuffer).toString("hex");
      sha256Time = performance.now() - sha256Start;
    }

    const totalTime = performance.now() - startTime;

    return {
      valid: options.expectedCRC32 !== undefined
        ? crc32Hash === options.expectedCRC32
        : true,
      crc32: crc32Hash,
      crc32Time,
      sha256,
      sha256Time,
      totalTime,
      size: data.length,
      performanceGain: sha256Time > 0 ? sha256Time / crc32Time : Infinity,
    };
  }

  // Batch CRC32 computation
  static crc32Batch(
    buffers: Buffer[],
    options: BatchCRC32Options = {}
  ): BatchCRC32Result {
    const startTime = performance.now();
    const batchSize = options.batchSize || 100;
    const results: number[] = [];
    let hits = 0;
    let misses = 0;

    for (let i = 0; i < buffers.length; i += batchSize) {
      const batch = buffers.slice(i, i + batchSize);

      for (const buffer of batch) {
        if (options.cacheResults && buffer.length >= 1024 * 1024) {
          const cacheKey = this.getCacheKey(buffer);
          if (this.CRC32_CACHE.has(cacheKey)) {
            results.push(this.CRC32_CACHE.get(cacheKey)!);
            hits++;
            continue;
          }
          misses++;
        }

        const hash = Bun.hash.crc32(buffer);

        if (options.cacheResults) {
          const cacheKey = this.getCacheKey(buffer);
          this.CRC32_CACHE.set(cacheKey, hash);
        }

        results.push(hash);
      }
    }

    const duration = performance.now() - startTime;
    const throughput = buffers.length / (duration / 1000);

    return {
      hashes: results,
      duration,
      throughput: Math.round(throughput),
      averageTime: buffers.length > 0 ? duration / buffers.length : 0,
      cacheHits: hits,
      cacheMisses: misses,
    };
  }

  // Buffer allocation with optional reuse for large buffers
  static allocateBuffer(size: number, options: BufferAllocOptions = {}): Buffer {
    const cacheKey = `buffer:${size}:${options.type || "default"}`;

    if (options.reuse && this.BUFFER_CACHE.has(cacheKey)) {
      const buffer = this.BUFFER_CACHE.get(cacheKey)!;
      buffer.fill(0);
      return buffer;
    }

    const startTime = performance.now();
    const buffer = Buffer.alloc(size);
    const duration = performance.now() - startTime;

    if (options.reuse && size >= 1024 * 1024) {
      this.BUFFER_CACHE.set(cacheKey, buffer);
      this.evictBufferCache();
    }

    this.recordPerformance("buffer_alloc", duration, size);

    return buffer;
  }

  // Benchmark CRC32 vs SHA-256 performance
  static async benchmark(size: number = 1024 * 1024): Promise<HashBenchmarkResult> {
    const buffer = this.allocateBuffer(size);

    // Benchmark CRC32
    const crc32Start = performance.now();
    const crc32Hash = Bun.hash.crc32(buffer);
    const crc32Time = performance.now() - crc32Start;

    // Benchmark SHA-256 (async - must be awaited)
    const sha256Start = performance.now();
    const sha256ArrayBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const sha256Time = performance.now() - sha256Start;
    const sha256Hex = Buffer.from(sha256ArrayBuffer).toString("hex");

    const speedup = sha256Time / crc32Time;

    return {
      size,
      crc32: {
        hash: crc32Hash,
        time: crc32Time,
        speed: `${(size / (crc32Time / 1000) / 1024 / 1024).toFixed(2)} MB/s`,
      },
      sha256: {
        hash: sha256Hex,
        time: sha256Time,
        speed: `${(size / (sha256Time / 1000) / 1024 / 1024).toFixed(2)} MB/s`,
      },
      speedup: Math.round(speedup * 10) / 10,
      recommendation: speedup > 15
        ? "Use CRC32 for non-security integrity checks"
        : "Consider SHA-256 for security-critical data",
    };
  }

  static getCacheStats(): CacheStats {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      crc32CacheSize: this.CRC32_CACHE.size,
      bufferCacheSize: this.BUFFER_CACHE.size,
    };
  }

  static clearCaches(): void {
    this.CRC32_CACHE.clear();
    this.BUFFER_CACHE.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  static getPerformanceLog(): HashPerformanceEntry[] {
    return [...this.PERFORMANCE_LOG];
  }

  // Use full content hash for cache key correctness (not partial bytes)
  private static getCacheKey(buffer: Buffer): string {
    return `${buffer.length}:${Bun.hash(buffer)}`;
  }

  private static recordPerformance(operation: string, time: number, size: number): void {
    this.PERFORMANCE_LOG.push({ operation, time, size, timestamp: Date.now() });
    if (this.PERFORMANCE_LOG.length > 10000) {
      this.PERFORMANCE_LOG.shift();
    }
  }

  private static evictCRC32Cache(): void {
    while (this.CRC32_CACHE.size > this.MAX_CRC32_CACHE_ENTRIES) {
      const oldest = this.CRC32_CACHE.keys().next().value;
      if (oldest !== undefined) this.CRC32_CACHE.delete(oldest);
      else break;
    }
  }

  private static evictBufferCache(): void {
    while (this.BUFFER_CACHE.size > this.MAX_BUFFER_CACHE_ENTRIES) {
      const oldest = this.BUFFER_CACHE.keys().next().value;
      if (oldest !== undefined) this.BUFFER_CACHE.delete(oldest);
      else break;
    }
  }
}
