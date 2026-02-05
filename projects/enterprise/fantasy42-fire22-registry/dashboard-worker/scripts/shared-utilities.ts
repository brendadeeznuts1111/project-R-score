#!/usr/bin/env bun

/**
 * 🔧 Shared Utilities for Fire22 Workspace Orchestration
 *
 * Consolidated utility functions to eliminate code duplication across
 * the workspace orchestration system. Optimized for memory efficiency,
 * performance, and standardized error handling.
 *
 * Key Features:
 * - Standardized error handling with typed exceptions
 * - Memory-efficient file operations with streaming
 * - Optimized data structures and algorithms
 * - Consistent logging and debugging utilities
 * - Performance monitoring helpers
 * - Type-safe utility functions
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
  createReadStream,
  createWriteStream,
} from 'fs';
import { join, dirname, basename, extname, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';

// === STANDARDIZED ERROR TYPES ===

export class WorkspaceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

export class ValidationError extends WorkspaceError {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends WorkspaceError {
  constructor(
    message: string,
    public path: string,
    public operation: string
  ) {
    super(message, 'FILESYSTEM_ERROR', { path, operation });
    this.name = 'FileSystemError';
  }
}

export class ProcessError extends WorkspaceError {
  constructor(
    message: string,
    public command: string[],
    public exitCode: number
  ) {
    super(message, 'PROCESS_ERROR', { command, exitCode });
    this.name = 'ProcessError';
  }
}

// === PERFORMANCE MONITORING ===

export class PerformanceTimer {
  private startTimeNs: number;
  private checkpoints: Map<string, number> = new Map();

  constructor(private operation: string) {
    this.startTimeNs = Bun.nanoseconds();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Bun.nanoseconds());
  }

  elapsed(checkpoint?: string): number {
    const endTime = checkpoint ? this.checkpoints.get(checkpoint) : Bun.nanoseconds();
    if (!endTime) {
      throw new Error(`Checkpoint '${checkpoint}' not found`);
    }
    return (endTime - this.startTimeNs) / 1_000_000; // Convert to milliseconds
  }

  finish(): PerformanceResult {
    const totalTime = this.elapsed();
    const memory = process.memoryUsage();

    return {
      operation: this.operation,
      totalTime,
      checkpoints: Object.fromEntries(this.checkpoints),
      memoryUsage: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      },
    };
  }
}

export interface PerformanceResult {
  operation: string;
  totalTime: number;
  checkpoints: Record<string, number>;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

// === MEMORY-EFFICIENT FILE OPERATIONS ===

export class FileOperations {
  /**
   * Read file with automatic memory management for large files
   */
  static async readFile(
    filePath: string,
    options: { streaming?: boolean; maxSize?: number } = {}
  ): Promise<string> {
    const { streaming = false, maxSize = 10 * 1024 * 1024 } = options; // 10MB default

    if (!existsSync(filePath)) {
      throw new FileSystemError(`File does not exist: ${filePath}`, filePath, 'read');
    }

    const stats = statSync(filePath);

    // Use streaming for large files to prevent memory issues
    if (streaming || stats.size > maxSize) {
      return this.readFileStreaming(filePath);
    }

    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'read'
      );
    }
  }

  /**
   * Write file with atomic operations to prevent corruption
   */
  static async writeFile(
    filePath: string,
    content: string,
    options: { atomic?: boolean; backup?: boolean } = {}
  ): Promise<void> {
    const { atomic = true, backup = false } = options;

    try {
      // Create backup if requested
      if (backup && existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await this.copyFile(filePath, backupPath);
      }

      if (atomic) {
        // Write to temporary file first, then rename (atomic operation)
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        writeFileSync(tempPath, content, 'utf-8');

        // Atomic rename (on most filesystems)
        await Bun.write(filePath, await Bun.file(tempPath).text());

        // Clean up temp file
        try {
          await Bun.file(tempPath).remove?.();
        } catch {
          // Ignore cleanup errors
        }
      } else {
        writeFileSync(filePath, content, 'utf-8');
      }
    } catch (error) {
      throw new FileSystemError(
        `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'write'
      );
    }
  }

  /**
   * Copy file with streaming for large files
   */
  static async copyFile(sourcePath: string, destPath: string): Promise<void> {
    if (!existsSync(sourcePath)) {
      throw new FileSystemError(`Source file does not exist: ${sourcePath}`, sourcePath, 'copy');
    }

    try {
      // Use Bun's native file copying for better performance
      await Bun.write(destPath, Bun.file(sourcePath));
    } catch (error) {
      throw new FileSystemError(
        `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`,
        sourcePath,
        'copy'
      );
    }
  }

  /**
   * Get file hash for integrity checking
   */
  static async getFileHash(
    filePath: string,
    algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'
  ): Promise<string> {
    if (!existsSync(filePath)) {
      throw new FileSystemError(`File does not exist: ${filePath}`, filePath, 'hash');
    }

    try {
      const hash = createHash(algorithm);
      const content = await Bun.file(filePath).arrayBuffer();
      hash.update(new Uint8Array(content));
      return hash.digest('hex');
    } catch (error) {
      throw new FileSystemError(
        `Failed to hash file: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'hash'
      );
    }
  }

  /**
   * Read file using streaming for memory efficiency
   */
  private static async readFileStreaming(filePath: string): Promise<string> {
    let content = '';
    const stream = createReadStream(filePath, { encoding: 'utf-8' });

    return new Promise((resolve, reject) => {
      stream.on('data', chunk => {
        content += chunk;
      });

      stream.on('end', () => {
        resolve(content);
      });

      stream.on('error', error => {
        reject(
          new FileSystemError(
            `Failed to stream read file: ${error.message}`,
            filePath,
            'stream-read'
          )
        );
      });
    });
  }
}

// === OPTIMIZED DATA STRUCTURES ===

/**
 * Memory-efficient Set implementation with automatic cleanup
 */
export class OptimizedSet<T> {
  private items = new Set<T>();
  private maxSize: number;
  private cleanupThreshold: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.cleanupThreshold = Math.floor(maxSize * 0.8);
  }

  add(item: T): this {
    this.items.add(item);

    // Trigger cleanup when approaching max size
    if (this.items.size > this.cleanupThreshold) {
      this.cleanup();
    }

    return this;
  }

  has(item: T): boolean {
    return this.items.has(item);
  }

  delete(item: T): boolean {
    return this.items.delete(item);
  }

  get size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  private cleanup(): void {
    // Simple LRU-like cleanup - keep the most recently used items
    if (this.items.size > this.maxSize) {
      const itemsArray = Array.from(this.items);
      const keepCount = Math.floor(this.maxSize * 0.7);
      const toKeep = itemsArray.slice(-keepCount);

      this.items.clear();
      toKeep.forEach(item => this.items.add(item));
    }
  }
}

/**
 * Memory-efficient Map with automatic cleanup and TTL support
 */
export class OptimizedMap<K, V> {
  private items = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 10000, ttl: number = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: K, value: V): this {
    this.items.set(key, { value, timestamp: Date.now() });

    if (this.items.size > this.maxSize) {
      this.cleanup();
    }

    return this;
  }

  get(key: K): V | undefined {
    const item = this.items.get(key);
    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.items.delete(key);
      return undefined;
    }

    return item.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.items.delete(key);
  }

  get size(): number {
    this.cleanupExpired();
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.items.entries());

    // Remove expired items first
    const validEntries = entries.filter(([_, item]) => now - item.timestamp <= this.ttl);

    // If still too many, keep the most recent ones
    if (validEntries.length > this.maxSize) {
      const keepCount = Math.floor(this.maxSize * 0.8);
      validEntries.sort(([_, a], [__, b]) => b.timestamp - a.timestamp);
      validEntries.splice(keepCount);
    }

    // Rebuild the map
    this.items.clear();
    validEntries.forEach(([key, item]) => this.items.set(key, item));
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.items) {
      if (now - item.timestamp > this.ttl) {
        this.items.delete(key);
      }
    }
  }
}

// === STANDARDIZED LOGGING ===

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  static setLevel(level: LogLevel): void {
    this.level = level;
  }

  static debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`🐛 [DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  static info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`ℹ️  [INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  static warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️  [WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  static error(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`❌ [ERROR] ${message}`);
      if (error) {
        if (error instanceof Error) {
          console.error(`  Stack: ${error.stack}`);
        } else {
          console.error(`  Details: ${JSON.stringify(error, null, 2)}`);
        }
      }
    }
  }

  static performance(operation: string, timeMs: number, memoryMb?: number): void {
    if (this.level <= LogLevel.INFO) {
      const memoryInfo = memoryMb ? ` (${memoryMb.toFixed(2)}MB)` : '';
      console.log(`⚡ [PERF] ${operation}: ${timeMs.toFixed(2)}ms${memoryInfo}`);
    }
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Memoization with memory management
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: { maxSize?: number; ttl?: number } = {}
): T {
  const cache = new OptimizedMap<string, ReturnType<T>>(options.maxSize, options.ttl);

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Debounce function with cleanup
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: Timer | undefined;
  let lastArgs: Parameters<T>;

  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delay);
  }) as T & { cancel: () => void; flush: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  debouncedFn.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      fn(...lastArgs);
    }
  };

  return debouncedFn;
}

/**
 * Retry with exponential backoff and memory cleanup
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

      Logger.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Parse JSON with error handling and type safety
 */
export function safeJsonParse<T = any>(json: string, fallback?: T): T | null {
  try {
    return JSON.parse(json);
  } catch (error) {
    Logger.error('Failed to parse JSON', error);
    return fallback ?? null;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * Check if a path is safe (prevents directory traversal)
 */
export function isSafePath(path: string, baseDir: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedBase = resolve(baseDir);

  return resolvedPath.startsWith(resolvedBase);
}

/**
 * Create directory recursively with error handling
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await Bun.write(join(dirPath, '.gitkeep'), '');
  } catch (error) {
    throw new FileSystemError(
      `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
      dirPath,
      'mkdir'
    );
  }
}

/**
 * Get directory size recursively
 */
export function getDirectorySize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  let totalSize = 0;

  const traverse = (currentPath: string) => {
    const stats = statSync(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = readdirSync(currentPath);
      files.forEach(file => {
        traverse(join(currentPath, file));
      });
    }
  };

  traverse(dirPath);
  return totalSize;
}

/**
 * Clean up resources with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Batch process items with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: { concurrency?: number; batchSize?: number } = {}
): Promise<R[]> {
  const { concurrency = 4, batchSize = 100 } = options;
  const results: R[] = [];

  // Process items in batches to prevent memory issues
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const semaphore = new Set<Promise<void>>();

    for (const [index, item] of batch.entries()) {
      // Control concurrency
      while (semaphore.size >= concurrency) {
        await Promise.race(semaphore);
      }

      const promise = processor(item, i + index)
        .then(result => {
          results[i + index] = result;
        })
        .finally(() => {
          semaphore.delete(promise);
        });

      semaphore.add(promise);
    }

    // Wait for current batch to complete
    await Promise.all(semaphore);

    // Trigger garbage collection between batches for large datasets
    if (typeof Bun.gc === 'function' && i % (batchSize * 10) === 0) {
      Bun.gc?.(true);
    }
  }

  return results;
}

export default {
  // Error types
  WorkspaceError,
  ValidationError,
  FileSystemError,
  ProcessError,

  // Classes
  PerformanceTimer,
  FileOperations,
  OptimizedSet,
  OptimizedMap,
  Logger,
  LogLevel,

  // Utility functions
  memoize,
  debounce,
  retry,
  safeJsonParse,
  formatBytes,
  formatDuration,
  isSafePath,
  ensureDirectory,
  getDirectorySize,
  withTimeout,
  batchProcess,
};
