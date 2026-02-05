import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/bun-utils.ts - Enhanced Bun runtime utilities for odds protocol
import { estimateShallowMemoryUsageOf } from "bun:jsc";

export class BunUtils {
  // UUID v7 generation with timestamp ordering
  static generateId(encoding: "hex" | "base64" | "base64url" = "hex", timestamp?: number): string {
    return Bun.randomUUIDv7(encoding, timestamp);
  }

  static generateIdBuffer(timestamp?: number): Buffer {
    return Bun.randomUUIDv7("buffer", timestamp);
  }

  // High-precision timing
  static getNanoseconds(): number {
    return Bun.nanoseconds();
  }

  // Environment detection
  static isMainScript(): boolean {
    return import.meta.path === Bun.main;
  }

  static getBunInfo() {
    return {
      version: Bun.version,
      revision: Bun.revision,
      main: Bun.main
    };
  }

  // Compression utilities for market data
  static compressData(data: Buffer | Uint8Array, compression: 'gzip' | 'deflate' | 'zstd' = 'gzip'): Uint8Array {
    switch (compression) {
      case 'gzip':
        return Bun.gzipSync(data);
      case 'deflate':
        return Bun.deflateSync(data);
      case 'zstd':
        return Bun.zstdCompressSync(data, { level: 6 });
      default:
        throw new Error(`Unsupported compression: ${compression}`);
    }
  }

  static decompressData(data: Buffer | Uint8Array, compression: 'gzip' | 'deflate' | 'zstd' = 'gzip'): Uint8Array {
    switch (compression) {
      case 'gzip':
        return Bun.gunzipSync(data);
      case 'deflate':
        return Bun.inflateSync(data);
      case 'zstd':
        return Bun.zstdDecompressSync(data);
      default:
        throw new Error(`Unsupported compression: ${compression}`);
    }
  }

  // Stream utilities for API responses
  static async streamToJSON<T = any>(stream: ReadableStream): Promise<T> {
    return await Bun.readableStreamToJSON(stream);
  }

  static async streamToText(stream: ReadableStream): Promise<string> {
    return await Bun.readableStreamToText(stream);
  }

  static async streamToBytes(stream: ReadableStream): Promise<Uint8Array> {
    return await Bun.readableStreamToBytes(stream);
  }

  static async streamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
    return await Bun.readableStreamToArrayBuffer(stream);
  }

  // Path resolution utilities
  static resolvePath(module: string, fromPath?: string): string {
    return Bun.resolveSync(module, fromPath || import.meta.dir);
  }

  static findExecutable(bin: string): string | null {
    return Bun.which(bin);
  }

  // Memory estimation for optimization
  static estimateMemoryUsage(obj: any): number {
    return estimateShallowMemoryUsageOf(obj);
  }

  // Sleep utilities with better precision
  static async sleep(ms: number): Promise<void> {
    return await Bun.sleep(ms);
  }

  static async sleepUntil(date: Date): Promise<void> {
    return await Bun.sleep(date);
  }

  static sleepSync(ms: number): void {
    Bun.sleepSync(ms);
  }

  // HTML escaping for security
  static escapeHTML(unsafe: string): string {
    return Bun.escapeHTML(unsafe);
  }

  // String utilities for display formatting
  static getStringWidth(str: string): number {
    return Bun.stringWidth(str);
  }

  // Deep equality for data validation
  static deepEquals(a: any, b: any): boolean {
    return Bun.deepEquals(a, b);
  }

  // File utilities
  static openInEditor(filePath: string): void {
    Bun.openInEditor(filePath);
  }

  static peek<T>(value: T): T {
    return Bun.peek(value);
  }

  // URL utilities
  static fileURLToPath(url: string | URL): string {
    return Bun.fileURLToPath(url.toString());
  }

  static pathToFileURL(path: string): string {
    return Bun.pathToFileURL(path).toString();
  }

  // ANSI stripping for logs
  static stripANSI(text: string): string {
    return Bun.stripANSI(text);
  }
}

// Specialized utilities for odds protocol
export class OddsProtocolUtils {
  // Compress market tick data for transmission
  static compressTickData(ticks: any[]): { compressed: Uint8Array; originalSize: number; compressionRatio: number } {
    const jsonString = JSON.stringify(ticks);
    const originalBuffer = Buffer.from(jsonString);
    const compressed = BunUtils.compressData(originalBuffer, 'zstd');
    
    return {
      compressed,
      originalSize: originalBuffer.length,
      compressionRatio: compressed.length / originalBuffer.length
    };
  }

  // Decompress tick data
  static decompressTickData(compressed: Uint8Array): any[] {
    const decompressed = BunUtils.decompressData(compressed, 'zstd');
    return JSON.parse(decompressed.toString());
  }

  // Generate ordered IDs for market events
  static generateMarketEventId(): string {
    return BunUtils.generateId('hex');
  }

  // Generate batch IDs with timestamp ordering
  static generateBatchId(timestamp?: number): string {
    return BunUtils.generateId('hex', timestamp);
  }

  // Memory usage tracking for large datasets
  static trackMemoryUsage<T>(data: T): { data: T; memoryUsage: number; sizeEstimate: string } {
    const memoryUsage = BunUtils.estimateMemoryUsage(data);
    const sizeEstimate = memoryUsage > 1024 * 1024 
      ? `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`
      : memoryUsage > 1024 
        ? `${(memoryUsage / 1024).toFixed(2)} KB`
        : `${memoryUsage} bytes`;
    
    return {
      data,
      memoryUsage,
      sizeEstimate
    };
  }

  // High-precision timing for market data processing
  static createTimer(): { start: number; elapsed: () => number; elapsedNanos: () => number } {
    const start = Date.now();
    const startNanos = BunUtils.getNanoseconds();
    
    return {
      start,
      elapsed: () => Date.now() - start,
      elapsedNanos: () => BunUtils.getNanoseconds() - startNanos
    };
  }

  // Process market data streams efficiently
  static async processMarketStream<T>(
    stream: ReadableStream,
    processor: (data: T) => Promise<void>
  ): Promise<void> {
    const array = await Bun.readableStreamToArray(stream);
    
    // Process in batches to avoid blocking
    const batchSize = 100;
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      await Promise.all(batch.map(item => processor(item as T) as Promise<void>));
      
      // Yield to event loop
      await BunUtils.sleep(0);
    }
  }

  // Validate data integrity with deep equality
  static validateDataIntegrity<T>(original: T, processed: T): { valid: boolean; details?: string } {
    try {
      const isValid = BunUtils.deepEquals(original, processed);
      return {
        valid: isValid,
        details: isValid ? 'Data integrity verified' : 'Data integrity check failed'
      };
    } catch (error) {
      return {
        valid: false,
        details: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Format market data for display
  static formatMarketData(data: any, maxWidth: number = 80): string {
    const jsonString = JSON.stringify(data, null, 2);
    const lines = jsonString.split('\n');
    
    return lines.map(line => {
      if (BunUtils.getStringWidth(line) <= maxWidth) {
        return line;
      }
      
      // Truncate long lines
      return line.substring(0, maxWidth - 3) + '...';
    }).join('\n');
  }
}

export default BunUtils;
