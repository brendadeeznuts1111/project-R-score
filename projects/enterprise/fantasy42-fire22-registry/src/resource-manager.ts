/**
 * Resource Manager - Enterprise Resource Cleanup
 *
 * Proper resource management with automatic cleanup, connection pooling,
 * and resource leak prevention for database connections, prepared statements,
 * and other system resources.
 */

import { Database } from 'bun:sqlite';
import { APPLICATION_CONSTANTS } from './constants';
import { DatabaseError } from './errors';

// ============================================================================
// RESOURCE CLEANUP INTERFACES
// ============================================================================

export interface Disposable {
  dispose(): void | Promise<void>;
}

export interface AsyncDisposable {
  dispose(): Promise<void>;
}

// ============================================================================
// HIGH-PERFORMANCE DATABASE CONNECTION POOL
// ============================================================================

class DatabaseConnectionPool {
  private connections: Map<string, Database> = new Map();
  private maxConnections: number = APPLICATION_CONSTANTS.MAX_CONNECTIONS;
  private connectionQueue: Array<{
    path: string;
    resolve: (db: Database) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeConnections: Map<string, number> = new Map();

  async getConnectionAsync(path: string): Promise<Database> {
    // Fast path - connection already exists
    if (this.connections.has(path)) {
      const activeCount = this.activeConnections.get(path) || 0;
      this.activeConnections.set(path, activeCount + 1);
      return this.connections.get(path)!;
    }

    // Check if we've hit the connection limit
    if (this.connections.size >= this.maxConnections) {
      // Queue the request instead of failing immediately
      return new Promise<Database>((resolve, reject) => {
        this.connectionQueue.push({ path, resolve, reject });
      });
    }

    // Create new connection
    try {
      const db = new Database(path);
      this.connections.set(path, db);
      this.activeConnections.set(path, 1);

      // Enable WAL mode and optimizations for better performance
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -64000;
        PRAGMA temp_store = MEMORY;
      `);

      return db;
    } catch (error) {
      throw new DatabaseError(`Failed to create database connection for ${path}`, error as Error);
    }
  }

  // Keep the sync version for backward compatibility
  getConnection(path: string): Database {
    if (this.connections.has(path)) {
      return this.connections.get(path)!;
    }

    if (this.connections.size >= this.maxConnections) {
      throw new DatabaseError('Maximum database connections exceeded');
    }

    const db = new Database(path);
    this.connections.set(path, db);
    return db;
  }

  closeConnection(path: string): void {
    const db = this.connections.get(path);
    if (db) {
      try {
        db.close();
      } catch (error) {
        console.warn(`Warning: Failed to close database connection ${path}:`, error);
      } finally {
        this.connections.delete(path);
        this.activeConnections.delete(path);
        // Process queued connection requests now that a slot is available
        this.processConnectionQueue();
      }
    }
  }

  /**
   * Process queued connection requests when connections become available.
   * This prevents deadlocks by ensuring the queue is always drained.
   */
  private processConnectionQueue(): void {
    while (
      this.connectionQueue.length > 0 &&
      this.connections.size < this.maxConnections
    ) {
      const request = this.connectionQueue.shift();
      if (!request) break;

      try {
        const db = new Database(request.path);
        this.connections.set(request.path, db);
        this.activeConnections.set(request.path, 1);

        // Enable WAL mode and optimizations
        db.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA synchronous = NORMAL;
          PRAGMA cache_size = -64000;
          PRAGMA temp_store = MEMORY;
        `);

        request.resolve(db);
      } catch (error) {
        request.reject(
          new DatabaseError(
            `Failed to create database connection for ${request.path}`,
            error as Error
          )
        );
      }
    }
  }

  closeAll(): void {
    for (const [path] of this.connections) {
      this.closeConnection(path);
    }
  }

  getStats(): { active: number; max: number } {
    return {
      active: this.connections.size,
      max: this.maxConnections,
    };
  }
}

// ============================================================================
// HIGH-PERFORMANCE PREPARED STATEMENT CACHE WITH LRU
// ============================================================================

class PreparedStatementCache {
  private cache: Map<string, { stmt: any; lastUsed: number; accessCount: number }> = new Map();
  private maxSize: number = 100;
  private accessOrder: string[] = [];

  get(db: Database, sql: string): any {
    const key = `${db}:${sql}`;
    const now = Date.now();

    // Fast path - cache hit
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.lastUsed = now;
      entry.accessCount++;

      // Move to end of access order (most recently used)
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);

      return entry.stmt;
    }

    // Cache miss - check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Prepare new statement
    try {
      const stmt = db.prepare(sql);
      this.cache.set(key, { stmt, lastUsed: now, accessCount: 1 });
      this.accessOrder.push(key);
      return stmt;
    } catch (error) {
      throw new DatabaseError(`Failed to prepare statement: ${sql}`, error as Error);
    }
  }

  private evictLRU(): void {
    // Find least recently used item
    let oldestKey = this.accessOrder[0];
    let oldestTime = this.cache.get(oldestKey)?.lastUsed || 0;

    for (const key of this.accessOrder) {
      const entry = this.cache.get(key);
      if (entry && entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    // Remove the LRU item
    if (oldestKey) {
      try {
        const entry = this.cache.get(oldestKey);
        if (entry?.stmt?.finalize) {
          entry.stmt.finalize();
        }
      } catch (error) {
        console.warn(`Warning: Failed to finalize statement for ${oldestKey}`, error);
      }

      this.cache.delete(oldestKey);
      const index = this.accessOrder.indexOf(oldestKey);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { cached: number; max: number } {
    return {
      cached: this.cache.size,
      max: this.maxSize,
    };
  }
}

// ============================================================================
// RESOURCE CLEANUP MANAGER
// ============================================================================

class ResourceCleanupManager {
  private resources: Set<Disposable | AsyncDisposable> = new Set();
  private asyncResources: Set<AsyncDisposable> = new Set();
  private cleanupTimeout: NodeJS.Timeout | null = null;

  register(resource: Disposable | AsyncDisposable): void {
    if (this.isAsyncDisposable(resource)) {
      this.asyncResources.add(resource);
    } else {
      this.resources.add(resource);
    }
  }

  unregister(resource: Disposable | AsyncDisposable): void {
    this.resources.delete(resource);
    this.asyncResources.delete(resource);
  }

  private isAsyncDisposable(resource: any): resource is AsyncDisposable {
    return (
      typeof resource.dispose === 'function' &&
      resource.dispose.constructor.name === 'AsyncFunction'
    );
  }

  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Clean up sync resources
    for (const resource of this.resources) {
      try {
        resource.dispose();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    this.resources.clear();

    // Clean up async resources
    for (const resource of this.asyncResources) {
      try {
        await resource.dispose();
      } catch (error) {
        errors.push(error as Error);
      }
    }
    this.asyncResources.clear();

    if (errors.length > 0) {
      console.warn(`Resource cleanup completed with ${errors.length} errors:`, errors);
    }
  }

  scheduleCleanup(delay: number = 1000): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }

    this.cleanupTimeout = setTimeout(async () => {
      await this.cleanup();
    }, delay);
  }

  getStats(): { syncResources: number; asyncResources: number } {
    return {
      syncResources: this.resources.size,
      asyncResources: this.asyncResources.size,
    };
  }
}

// ============================================================================
// HIGH-PERFORMANCE BATCH PROCESSOR
// ============================================================================

export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> =
    [];
  private processing = false;
  private batchSize: number;
  private delay: number;
  private processor: (items: T[]) => Promise<R[]>;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: { batchSize?: number; delay?: number } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.delay = options.delay || 100;
  }

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.scheduleProcessing();
    });
  }

  private scheduleProcessing(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (this.queue.length >= this.batchSize) {
      this.processBatch();
    } else {
      setTimeout(() => this.processBatch(), this.delay);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const batch = this.queue.splice(0, this.batchSize);
      const items = batch.map(item => item.item);

      const results = await this.processor(items);

      // Resolve all promises in the batch
      batch.forEach((item, index) => {
        if (index < results.length) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('Batch processing returned fewer results than expected'));
        }
      });
    } catch (error) {
      // Reject all promises in the batch on error
      this.queue.splice(0, this.batchSize).forEach(item => {
        item.reject(error as Error);
      });
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        setTimeout(() => this.processBatch(), this.delay);
      }
    }
  }

  async flush(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      if (!this.processing && this.queue.length > 0) {
        await this.processBatch();
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// ============================================================================
// DATABASE RESOURCE MANAGER WITH BATCH SUPPORT
// ============================================================================

export class DatabaseResourceManager implements AsyncDisposable {
  private db: Database;
  private preparedStatements: Map<string, any> = new Map();
  private transactions: any[] = [];
  private isClosed = false;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds
  private batchProcessor: BatchProcessor<any, any>;

  constructor(db: Database) {
    this.db = db;
    this.batchProcessor = new BatchProcessor(
      (queries: Array<{ sql: string; params?: any[] }>) => this.executeBatch(queries),
      { batchSize: 20, delay: 50 }
    );
  }

  prepare(sql: string): any {
    if (this.isClosed) {
      throw new DatabaseError('Database connection is closed');
    }

    if (this.preparedStatements.has(sql)) {
      return this.preparedStatements.get(sql);
    }

    try {
      const stmt = this.db.prepare(sql);
      this.preparedStatements.set(sql, stmt);
      return stmt;
    } catch (error) {
      throw new DatabaseError(`Failed to prepare statement: ${sql}`, error as Error);
    }
  }

  async executeTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.isClosed) {
      throw new DatabaseError('Database connection is closed');
    }

    const transaction = this.db.transaction(callback);
    this.transactions.push(transaction);

    try {
      const result = await transaction();
      return result;
    } catch (error) {
      throw new DatabaseError('Transaction failed', error as Error);
    } finally {
      // Remove from tracking
      const index = this.transactions.indexOf(transaction);
      if (index > -1) {
        this.transactions.splice(index, 1);
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Clean up prepared statements
    for (const [sql, stmt] of this.preparedStatements) {
      try {
        stmt.finalize?.();
      } catch (error) {
        console.warn(`Warning: Failed to finalize prepared statement: ${sql}`, error);
      }
    }
    this.preparedStatements.clear();

    // Wait for any pending transactions
    while (this.transactions.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Close database connection
    try {
      this.db.close();
    } catch (error) {
      console.warn('Warning: Failed to close database connection:', error);
    }
  }

  isHealthy(): boolean {
    if (this.isClosed) {
      return false;
    }

    try {
      const result = this.db.prepare('SELECT 1').get();
      return result?.[0] === 1;
    } catch {
      return false;
    }
  }

  // High-performance cached query
  async queryCached(sql: string, params: any[] = []): Promise<any> {
    if (this.isClosed) {
      throw new DatabaseError('Database connection is closed');
    }

    const cacheKey = `${sql}:${JSON.stringify(params)}`;
    const now = Date.now();

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    // Execute query
    const result = await this.query(sql, params);

    // Cache result
    this.queryCache.set(cacheKey, { result, timestamp: now });

    // Clean up expired cache entries
    this.cleanupExpiredCache(now);

    return result;
  }

  // Execute single query
  async query(sql: string, params: any[] = []): Promise<any> {
    if (this.isClosed) {
      throw new DatabaseError('Database connection is closed');
    }

    try {
      const stmt = this.prepare(sql);
      return params.length > 0 ? stmt.get(...params) : stmt.get();
    } catch (error) {
      throw new DatabaseError(`Query execution failed: ${sql}`, error as Error);
    }
  }

  // Execute batch queries with high performance
  async executeBatch(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    if (this.isClosed) {
      throw new DatabaseError('Database connection is closed');
    }

    return await this.executeTransaction(async () => {
      const results: any[] = [];

      for (const query of queries) {
        const result = await this.query(query.sql, query.params || []);
        results.push(result);
      }

      return results;
    });
  }

  // Add query to batch processor
  async addToBatch(sql: string, params: any[] = []): Promise<any> {
    return this.batchProcessor.add({ sql, params });
  }

  // Flush batch processor
  async flushBatch(): Promise<void> {
    await this.batchProcessor.flush();
  }

  private cleanupExpiredCache(now: number): void {
    const expiredKeys: string[] = [];

    for (const [key, value] of this.queryCache) {
      if (now - value.timestamp >= this.cacheTTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.queryCache.delete(key));
  }
}

// ============================================================================
// FILE RESOURCE MANAGER
// ============================================================================

export class FileResourceManager implements AsyncDisposable {
  private fileHandles: any[] = [];
  private tempFiles: string[] = [];

  async openFile(path: string): Promise<BunFile> {
    try {
      const file = Bun.file(path);
      this.fileHandles.push(file);
      return file;
    } catch (error) {
      throw new Error(`Failed to open file: ${path}`);
    }
  }

  registerTempFile(path: string): void {
    this.tempFiles.push(path);
  }

  async dispose(): Promise<void> {
    // Clean up file handles (Bun files don't need explicit cleanup)

    // Clean up temp files
    for (const tempFile of this.tempFiles) {
      try {
        await Bun.file(tempFile).delete();
      } catch (error) {
        console.warn(`Warning: Failed to delete temp file: ${tempFile}`, error);
      }
    }
    this.tempFiles = [];
  }
}

// ============================================================================
// GLOBAL RESOURCE MANAGER INSTANCE
// ============================================================================

export const resourceManager = new ResourceCleanupManager();
export const dbConnectionPool = new DatabaseConnectionPool();
export const statementCache = new PreparedStatementCache();

// ============================================================================
// GRACEFUL SHUTDOWN HANDLER
// ============================================================================

export function setupGracefulShutdown(): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

    try {
      // Close database connections
      dbConnectionPool.closeAll();

      // Clean up all resources
      await resourceManager.cleanup();

      console.log('✅ All resources cleaned up successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle common termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  console.log('🛡️ Resource cleanup handlers configured');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute a function with automatic resource cleanup
 */
export async function withResource<T extends Disposable | AsyncDisposable, R>(
  resource: T,
  callback: (resource: T) => Promise<R>
): Promise<R> {
  resourceManager.register(resource);

  try {
    return await callback(resource);
  } finally {
    try {
      if (resource instanceof DatabaseResourceManager) {
        await resource.dispose();
      } else {
        resource.dispose();
      }
    } catch (error) {
      console.warn('Warning: Failed to cleanup resource:', error);
    } finally {
      resourceManager.unregister(resource);
    }
  }
}

/**
 * Get resource usage statistics
 */
export function getResourceStats(): {
  database: { active: number; max: number };
  statements: { cached: number; max: number };
  resources: { syncResources: number; asyncResources: number };
} {
  return {
    database: dbConnectionPool.getStats(),
    statements: statementCache.getStats(),
    resources: resourceManager.getStats(),
  };
}

// ============================================================================
// MEMORY MONITORING
// ============================================================================

export class MemoryMonitor implements Disposable {
  private intervalId: NodeJS.Timeout | null = null;
  private thresholds = {
    heapUsed: 100 * 1024 * 1024, // 100MB
    heapTotal: 500 * 1024 * 1024, // 500MB
    external: 50 * 1024 * 1024, // 50MB
  };

  start(interval: number = 30000): void {
    // Check every 30 seconds
    this.intervalId = setInterval(() => {
      const memUsage = process.memoryUsage();

      if (memUsage.heapUsed > this.thresholds.heapUsed) {
        console.warn(`⚠️ High heap usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }

      if (memUsage.heapTotal > this.thresholds.heapTotal) {
        console.warn(`⚠️ High total heap: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
      }

      if (memUsage.external > this.thresholds.external) {
        console.warn(`⚠️ High external memory: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
      }
    }, interval);
  }

  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
