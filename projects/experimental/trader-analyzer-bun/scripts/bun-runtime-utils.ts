#!/usr/bin/env bun

/**
 * @fileoverview Complete Bun Runtime Utilities Implementation
 * @description Comprehensive implementation of all Bun utility functions
 * @module bun-runtime-utils
 */

import { inspectTable, ProgressBar, HTMLSanitizer } from "../src/utils/bun";
import { RateLimiter, SlidingWindowRateLimiter, RateLimiterFactory } from "./rate-limiter";
import { PromiseUtils, PromisePool } from "./promise-utils";
import { PathResolver, ExecutableFinder } from "./path-resolver";
import { MigrationHelper } from "./migration-helper";
import { BunPerformanceBenchmarks } from "./performance-benchmarks";

/**
 * Runtime Information Utilities
 */
export class BunRuntimeUtils {
  /**
   * Get Bun version
   */
  static get version(): string {
    return Bun.version;
  }

  /**
   * Get Bun revision (git commit)
   */
  static get revision(): string {
    return Bun.revision;
  }

  /**
   * Get environment variables (alias for process.env)
   */
  static get env() {
    return Bun.env;
  }

  /**
   * Get main script path
   */
  static get main(): string {
    return Bun.main;
  }

  /**
   * Check if current script is main module
   */
  static isMain(): boolean {
    return import.meta.path === Bun.main;
  }
}

/**
 * Timing and Sleeping Utilities
 */
export class BunTimingUtils {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return Bun.sleep(ms);
  }

  /**
   * Sleep until specific date/time
   */
  static sleepUntil(date: Date): Promise<void> {
    return Bun.sleep(date);
  }

  /**
   * Blocking sleep (synchronous)
   */
  static sleepSync(ms: number): void {
    return Bun.sleepSync(ms);
  }

  /**
   * Get high-precision nanoseconds since process start
   */
  static nanoseconds(): bigint {
    return BigInt(Bun.nanoseconds());
  }

  /**
   * Create a simple timer
   */
  static timer() {
    const start = Bun.nanoseconds();
    return {
      elapsed(): number {
        return Number(Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
      },
      elapsedFormatted(): string {
        const ms = this.elapsed();
        if (ms < 1000) return `${ms.toFixed(2)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
      }
    };
  }
}

/**
 * File System and Path Utilities
 */
export class BunFileUtils {
  /**
   * Find executable in PATH
   */
  static which(command: string, options?: { PATH?: string; cwd?: string }): string | null {
    return Bun.which(command, options);
  }

  /**
   * Convert file:// URL to absolute path
   */
  static fileURLToPath(url: URL): string {
    return Bun.fileURLToPath(url);
  }

  /**
   * Convert absolute path to file:// URL
   */
  static pathToFileURL(path: string): URL {
    return Bun.pathToFileURL(path);
  }

  /**
   * Resolve module/file path
   */
  static resolveSync(path: string, root?: string): string {
    return Bun.resolveSync(path, root || process.cwd());
  }

  /**
   * Open file in editor
   */
  static openInEditor(file: string, options?: { editor?: "vscode" | "subl"; line?: number; column?: number }): void {
    Bun.openInEditor(file, options);
  }
}

/**
 * UUID Generation Utilities
 */
export class BunUUIDUtils {
  /**
   * Generate UUID v7 (time-ordered)
   */
  static randomUUIDv7(encoding?: "hex" | "base64" | "base64url", timestamp?: number): string {
    return Bun.randomUUIDv7(encoding, timestamp);
  }

  /**
   * Generate UUID v7 as buffer
   */
  static randomUUIDv7Buffer(timestamp?: number): Buffer {
    return Bun.randomUUIDv7("buffer", timestamp);
  }
}

/**
 * Promise and Stream Utilities
 */
export class BunPromiseUtils {
  /**
   * Peek at promise result without consuming it
   */
  static peek<T>(promise: Promise<T>): T | Promise<T> {
    return Bun.peek(promise);
  }

  /**
   * Check promise status
   */
  static peekStatus<T>(promise: Promise<T>): "pending" | "fulfilled" | "rejected" {
    return Bun.peek.status(promise);
  }

  /**
   * Convert ReadableStream to ArrayBuffer
   */
  static async readableStreamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
    return Bun.readableStreamToArrayBuffer(stream);
  }

  /**
   * Convert ReadableStream to Uint8Array
   */
  static async readableStreamToBytes(stream: ReadableStream): Promise<Uint8Array> {
    return Bun.readableStreamToBytes(stream);
  }

  /**
   * Convert ReadableStream to Blob
   */
  static async readableStreamToBlob(stream: ReadableStream): Promise<Blob> {
    return Bun.readableStreamToBlob(stream);
  }

  /**
   * Convert ReadableStream to JSON
   */
  static async readableStreamToJSON<T = any>(stream: ReadableStream): Promise<T> {
    return Bun.readableStreamToJSON(stream);
  }

  /**
   * Convert ReadableStream to text
   */
  static async readableStreamToText(stream: ReadableStream): Promise<string> {
    return Bun.readableStreamToText(stream);
  }

  /**
   * Convert ReadableStream to array of chunks
   */
  static async readableStreamToArray(stream: ReadableStream): Promise<unknown[]> {
    return Bun.readableStreamToArray(stream);
  }

  /**
   * Convert ReadableStream to FormData
   */
  static async readableStreamToFormData(stream: ReadableStream, boundary?: string): Promise<FormData> {
    return Bun.readableStreamToFormData(stream, boundary);
  }
}

/**
 * Comparison and Equality Utilities
 */
export class BunComparisonUtils {
  /**
   * Deep equality check
   */
  static deepEquals(a: unknown, b: unknown, strict?: boolean): boolean {
    return Bun.deepEquals(a, b, strict);
  }
}

/**
 * HTML and String Utilities
 */
export class BunStringUtils {
  /**
   * Escape HTML special characters
   */
  static escapeHTML(input: string | object | number | boolean): string {
    return Bun.escapeHTML(input);
  }

  /**
   * Get display width of string (handles ANSI, emoji, wide chars)
   */
  static stringWidth(input: string, options?: { countAnsiEscapeCodes?: boolean; ambiguousIsNarrow?: boolean }): number {
    return Bun.stringWidth(input, options);
  }

  /**
   * Strip ANSI escape codes from string
   */
  static stripANSI(text: string): string {
    return Bun.stripANSI(text);
  }
}

/**
 * Compression Utilities
 */
export class BunCompressionUtils {
  /**
   * GZIP compression (synchronous)
   */
  static gzipSync(data: string | ArrayBuffer | Uint8Array<ArrayBufferLike>, options?: any): Uint8Array {
    return Bun.gzipSync(data as any, options);
  }

  /**
   * GZIP decompression (synchronous)
   */
  static gunzipSync(data: string | ArrayBuffer | Uint8Array<ArrayBufferLike>): Uint8Array {
    return Bun.gunzipSync(data as any);
  }

  /**
   * DEFLATE compression (synchronous)
   */
  static deflateSync(data: string | ArrayBuffer | Uint8Array<ArrayBufferLike>, options?: any): Uint8Array {
    return Bun.deflateSync(data as any, options);
  }

  /**
   * DEFLATE decompression (synchronous)
   */
  static inflateSync(data: string | ArrayBuffer | Uint8Array<ArrayBufferLike>): Uint8Array {
    return Bun.inflateSync(data as any);
  }

  /**
   * Zstandard compression (synchronous)
   */
  static zstdCompressSync(data: Uint8Array, options?: { level?: number }): Uint8Array {
    return Bun.zstdCompressSync(data, options);
  }

  /**
   * Zstandard compression (asynchronous)
   */
  static async zstdCompress(data: Uint8Array, options?: { level?: number }): Promise<Uint8Array> {
    return Bun.zstdCompress(data, options);
  }

  /**
   * Zstandard decompression (synchronous)
   */
  static zstdDecompressSync(data: Uint8Array): Uint8Array {
    return Bun.zstdDecompressSync(data);
  }

  /**
   * Zstandard decompression (asynchronous)
   */
  static async zstdDecompress(data: Uint8Array): Promise<Uint8Array> {
    return Bun.zstdDecompress(data);
  }
}

/**
 * Inspection and Serialization Utilities
 */
export class BunInspectUtils {
  /**
   * Inspect object as string
   */
  static inspect(value: unknown, options?: any): string {
    return Bun.inspect(value, options);
  }

  /**
   * Format tabular data as table
   */
  static table(tabularData: any[], properties?: string[], options?: { colors?: boolean }): string {
    return Bun.inspect.table(tabularData, properties, options);
  }

  /**
   * Custom inspect symbol
   */
  static get inspectCustom(): symbol {
    return Bun.inspect.custom;
  }
}

/**
 * WebSocket Handler Utility
 */
export class BunWebSocketUtils {
  /**
   * Create WebSocket handler with utilities
   */
  static createWebSocketHandler(url: string) {
    const ws = new WebSocket(url);

    return {
      send: (data: any) => ws.send(JSON.stringify(data)),
      close: () => ws.close(),

      onMessage: (callback: (data: any) => void) => {
        ws.onmessage = (event) => {
          try {
            callback(JSON.parse(event.data as string));
          } catch {
            callback(event.data);
          }
        };
      },

      onOpen: (callback: () => void) => {
        ws.onopen = callback;
      },

      onClose: (callback: () => void) => {
        ws.onclose = callback;
      },

      onError: (callback: (error: Event) => void) => {
        ws.onerror = callback;
      }
    };
  }
}

/**
 * Complete Bun Utilities Suite
 */
export class BunUtils {
  // Runtime info
  static get version() { return BunRuntimeUtils.version; }
  static get revision() { return BunRuntimeUtils.revision; }
  static get env() { return BunRuntimeUtils.env; }
  static get main() { return BunRuntimeUtils.main; }
  static isMain = BunRuntimeUtils.isMain;

  // Timing
  static sleep = BunTimingUtils.sleep;
  static sleepUntil = BunTimingUtils.sleepUntil;
  static sleepSync = BunTimingUtils.sleepSync;
  static nanoseconds = BunTimingUtils.nanoseconds;
  static timer = BunTimingUtils.timer;

  // File system
  static which = BunFileUtils.which;
  static fileURLToPath = BunFileUtils.fileURLToPath;
  static pathToFileURL = BunFileUtils.pathToFileURL;
  static resolveSync = BunFileUtils.resolveSync;
  static openInEditor = BunFileUtils.openInEditor;

  // UUID
  static randomUUIDv7 = BunUUIDUtils.randomUUIDv7;
  static randomUUIDv7Buffer = BunUUIDUtils.randomUUIDv7Buffer;

  // Promises and streams
  static peek = BunPromiseUtils.peek;
  static peekStatus = BunPromiseUtils.peekStatus;
  static readableStreamToArrayBuffer = BunPromiseUtils.readableStreamToArrayBuffer;
  static readableStreamToBytes = BunPromiseUtils.readableStreamToBytes;
  static readableStreamToBlob = BunPromiseUtils.readableStreamToBlob;
  static readableStreamToJSON = BunPromiseUtils.readableStreamToJSON;
  static readableStreamToText = BunPromiseUtils.readableStreamToText;
  static readableStreamToArray = BunPromiseUtils.readableStreamToArray;
  static readableStreamToFormData = BunPromiseUtils.readableStreamToFormData;

  // Comparison
  static deepEquals = BunComparisonUtils.deepEquals;

  // Strings
  static escapeHTML = BunStringUtils.escapeHTML;
  static stringWidth = BunStringUtils.stringWidth;
  static stripANSI = BunStringUtils.stripANSI;

  // Compression
  static gzipSync = BunCompressionUtils.gzipSync;
  static gunzipSync = BunCompressionUtils.gunzipSync;
  static deflateSync = BunCompressionUtils.deflateSync;
  static inflateSync = BunCompressionUtils.inflateSync;
  static zstdCompressSync = BunCompressionUtils.zstdCompressSync;
  static zstdCompress = BunCompressionUtils.zstdCompress;
  static zstdDecompressSync = BunCompressionUtils.zstdDecompressSync;
  static zstdDecompress = BunCompressionUtils.zstdDecompress;

  // Inspection
  static inspect = BunInspectUtils.inspect;
  static inspectTable = BunInspectUtils.table;
  static inspectCustom = BunInspectUtils.inspectCustom;

  // WebSocket
  static createWebSocket = BunWebSocketUtils.createWebSocketHandler;

  // Rate Limiting
  static createRateLimiter = RateLimiterFactory.tokenBucket;
  static createSlidingWindowLimiter = RateLimiterFactory.slidingWindow;

  // Promise Utilities
  static peekPromise = PromiseUtils.peek;
  static raceWithTimeout = PromiseUtils.raceWithTimeout;
  static createDeferred = PromiseUtils.createDeferred;
  static retry = PromiseUtils.retry;

  // Path Resolution
  static resolvePath = PathResolver.resolve;
  static resolveModulePath = PathResolver.resolveModule;
  static toFileURL = PathResolver.toFileURL;
  static fromFileURL = PathResolver.fromFileURL;

  // Executable Finding
  static findCommand = ExecutableFinder.find;
  static findExecutable = ExecutableFinder.findWithFallback;

  // Migration Helper
  static getMigrationReplacements = MigrationHelper.getReplacements;
  static printMigrationGuide = MigrationHelper.printMigrationGuide;

  // Performance Benchmarks
  static runBenchmarks = BunPerformanceBenchmarks.runAllBenchmarks;
}

/**
 * Demo function showcasing all Bun utilities
 */
async function demo() {
  console.log('🚀 Bun Runtime Utilities Demo\n');

  // 1. Runtime Information
  console.log('📋 Runtime Information:');
  console.log(`Bun Version: ${BunUtils.version}`);
  console.log(`Bun Revision: ${BunUtils.revision}`);
  console.log(`Main Script: ${BunUtils.main}`);
  console.log(`Is Main Module: ${BunUtils.isMain()}`);
  console.log();

  // 2. Timing Utilities
  console.log('⏱️  Timing Utilities:');
  const timer = BunUtils.timer();
  await BunUtils.sleep(100);
  console.log(`Slept for: ${timer.elapsedFormatted()}`);
  console.log(`Nanoseconds since start: ${BunUtils.nanoseconds()}`);
  console.log();

  // 3. File System Utilities
  console.log('📁 File System Utilities:');
  const lsPath = BunUtils.which("ls");
  console.log(`ls executable: ${lsPath || 'not found'}`);

  const fileURL = BunUtils.pathToFileURL("/tmp/test.txt");
  console.log(`File URL: ${fileURL}`);

  const filePath = BunUtils.fileURLToPath(fileURL);
  console.log(`File path: ${filePath}`);
  console.log();

  // 4. UUID Generation
  console.log('🆔 UUID Generation:');
  console.log(`UUID v7: ${BunUtils.randomUUIDv7()}`);
  console.log(`UUID v7 (base64): ${BunUtils.randomUUIDv7("base64")}`);
  console.log();

  // 5. Promise Utilities
  console.log('🔮 Promise Utilities:');
  const promise = Promise.resolve("hello");
  console.log(`Promise peek: ${BunUtils.peek(promise)}`);
  console.log(`Promise status: ${BunUtils.peekStatus(promise)}`);
  console.log();

  // 6. String Utilities
  console.log('📝 String Utilities:');
  const coloredText = "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m";
  console.log(`Colored text: ${coloredText}`);
  console.log(`String width: ${BunUtils.stringWidth(coloredText)}`);
  console.log(`Stripped ANSI: "${BunUtils.stripANSI(coloredText)}"`);

  const htmlText = '<script>alert("xss")</script><b>Bold</b>';
  console.log(`HTML escaped: ${BunUtils.escapeHTML(htmlText)}`);
  console.log();

  // 7. Compression
  console.log('🗜️  Compression:');
  const data = new TextEncoder().encode("Hello World! ".repeat(100)) as Uint8Array;
  const compressed = BunUtils.gzipSync(data);
  const decompressed = BunUtils.gunzipSync(compressed);
  console.log(`Original size: ${data.length} bytes`);
  console.log(`Compressed size: ${compressed.length} bytes`);
  console.log(`Compression ratio: ${(compressed.length / data.length * 100).toFixed(1)}%`);
  console.log(`Decompressed matches: ${BunUtils.deepEquals(data, decompressed)}`);
  console.log();

  // 8. Inspection
  console.log('🔍 Inspection:');
  const testObj = {
    string: "hello",
    number: 42,
    array: [1, 2, 3],
    nested: { deep: { value: true } },
    date: new Date(),
    regex: /test/i,
    buffer: Buffer.from("test")
  };

  console.log('Object inspection:');
  console.log(BunUtils.inspect(testObj, { colors: true, depth: 3 }));
  console.log();

  // 9. Table formatting
  console.log('📊 Table Formatting:');
  const tableData = [
    { name: 'Alice', age: 30, city: 'NYC' },
    { name: 'Bob', age: 25, city: 'LA' },
    { name: 'Charlie', age: 35, city: 'Chicago' }
  ];

  console.log(BunUtils.inspectTable(tableData, ['name', 'age'], { colors: true }));
  console.log();

  // 10. Deep equality
  console.log('🔍 Deep Equality:');
  const obj1 = { a: 1, b: { c: 2 } };
  const obj2 = { a: 1, b: { c: 2 } };
  const obj3 = { a: 1, b: { c: 3 } };

  console.log(`obj1 === obj2: ${BunUtils.deepEquals(obj1, obj2)}`);
  console.log(`obj1 === obj3: ${BunUtils.deepEquals(obj1, obj3)}`);
  console.log();

  console.log('✨ Demo complete! All Bun utilities are working correctly.');
}

// Rate Limiting
export { RateLimiter, SlidingWindowRateLimiter, RateLimiterFactory };

// Promise Utilities
export { PromiseUtils, PromisePool };

// Path Resolution
export { PathResolver, ExecutableFinder };

// Migration Helper
export { MigrationHelper };

// Performance Benchmarks
export { BunPerformanceBenchmarks };

// Serialization (from bun:jsc)
export { serialize, deserialize } from "../src/utils/bun";

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}