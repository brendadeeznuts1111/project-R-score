import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import { join } from 'path';
import { DATABASE_CONSTANTS } from '../src/constants';
import { DatabaseResourceManager, setupGracefulShutdown } from '../src/resource-manager';
import { queryCache } from '../src/cache';
import { parallelMap, retryWithBackoff } from '../src/parallel';

export interface DatabaseConnection {
  db: Database;
  initialize: () => Promise<void>;
  close: () => void;
  healthCheck: () => Promise<boolean>;
  optimize: () => void;
}

export function createDatabaseConnection(): DatabaseConnection {
  const dbPath = process.env.DATABASE_URL || ':memory:';
  const isDev = process.env.NODE_ENV !== 'production';
  const isTest = process.env.NODE_ENV === 'test';

  console.log(`📊 Initializing database connection: ${dbPath}`);

  const db = new Database(dbPath);

  // Enterprise SQLite optimizations
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = ${DATABASE_CONSTANTS.CACHE_SIZE}; -- 64MB cache
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = ${DATABASE_CONSTANTS.MMAP_SIZE}; -- 256MB memory map
    PRAGMA busy_timeout = ${DATABASE_CONSTANTS.BUSY_TIMEOUT};
    PRAGMA wal_autocheckpoint = ${DATABASE_CONSTANTS.WAL_CHECKPOINT};
  `);

  const initialize = async (): Promise<void> => {
    try {
      // Load core schema asynchronously
      const schemaPath = join(process.cwd(), 'schema.sql');
      if (existsSync(schemaPath)) {
        console.log('📋 Loading database schema...');
        const schema = Bun.file(schemaPath);
        const schemaSQL = await schema.text();
        db.exec(schemaSQL);
      }

      // Load seed data in development (not in test) asynchronously
      if (isDev && !isTest) {
        const seedPath = join(process.cwd(), 'seed.sql');
        if (existsSync(seedPath)) {
          console.log('🌱 Loading seed data...');
          const seed = Bun.file(seedPath);
          const seedSQL = await seed.text();
          db.exec(seedSQL);
        }
      }

      // Create indexes for performance asynchronously
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
        CREATE INDEX IF NOT EXISTS idx_packages_created ON packages(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      `);

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  };

  const close = (): void => {
    console.log('🔒 Closing database connection...');
    db.close();
  };

  const healthCheck = async (): Promise<boolean> => {
    try {
      const result = db.prepare('SELECT 1 as health_check').get() as { health_check: number };
      return result.health_check === 1;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  };

  const optimize = (): void => {
    console.log('⚡ Optimizing database...');
    try {
      // Run optimization queries
      db.exec(`
        PRAGMA optimize;
        PRAGMA wal_checkpoint(TRUNCATE);
        VACUUM;
      `);
      console.log('✅ Database optimization completed');
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
    }
  };

  return {
    db,
    initialize,
    close,
    healthCheck,
    optimize,
  };
}

// Enterprise database utilities with high-performance features
export class DatabaseUtils {
  private preparedStatements: Map<string, any> = new Map();
  private batchProcessor: any;

  constructor(private db: Database) {
    // Initialize batch processor for high-throughput operations
    this.initializeBatchProcessor();
  }

  private initializeBatchProcessor(): void {
    // Create a batch processor for database operations
    // This will be implemented to handle multiple queries efficiently
  }

  // Execute with transaction support and retry logic
  async executeTransaction<T>(callback: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    return retryWithBackoff(async () => {
      const transaction = this.db.transaction(callback);

      try {
        const result = await transaction();
        return result;
      } catch (error) {
        console.error('❌ Transaction failed, rolling back:', error);
        throw error;
      }
    }, maxRetries);
  }

  // High-performance batch operations
  async batchInsert(table: string, data: Record<string, any>[]): Promise<void> {
    if (data.length === 0) return;

    // Process in smaller chunks for better memory management
    const chunkSize = 100;
    const chunks: Record<string, any>[][] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    // Process chunks in parallel for better performance
    await parallelMap(chunks, async (chunk: Record<string, any>[]) => {
      await this.executeTransaction(async () => {
        const columns = Object.keys(chunk[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        const insert = this.prepareStatement(sql);

        for (const row of chunk) {
          insert.run(...columns.map(col => row[col]));
        }
      });
    });
  }

  // Cached query with performance optimization
  async queryCached<T>(sql: string, params: any[] = [], ttl: number = 30000): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const cacheKey = `${sql}:${JSON.stringify(params)}`;

    // Try cache first
    const cached = queryCache.getQuery(sql, params);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await this.query(sql, params);

    // Cache result
    queryCache.setQuery(sql, params, result, ttl);

    return result;
  }

  // Optimized single query execution
  async query(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.prepareStatement(sql);

    try {
      // Use .all() for SELECT queries that return multiple rows, .get() for single row or aggregates
      const upperSql = sql.trim().toUpperCase();
      const isSelectQuery = upperSql.startsWith('SELECT');

      if (isSelectQuery) {
        // Check if this is an aggregate query (COUNT, SUM, etc.) that returns single value
        const isAggregateQuery = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(upperSql);
        if (isAggregateQuery) {
          return params.length > 0 ? stmt.get(...params) : stmt.get();
        } else {
          return params.length > 0 ? stmt.all(...params) : stmt.all();
        }
      } else {
        return params.length > 0 ? stmt.run(...params) : stmt.run();
      }
    } catch (error) {
      console.error(`❌ Query failed: ${sql}`, error);
      throw error;
    }
  }

  // Prepared statement caching
  private prepareStatement(sql: string): any {
    if (this.preparedStatements.has(sql)) {
      return this.preparedStatements.get(sql);
    }

    const stmt = this.db.prepare(sql);
    this.preparedStatements.set(sql, stmt);
    return stmt;
  }

  // High-performance query with pagination and caching
  async queryWithPaginationCached<T>(
    sql: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 50,
    cacheTTL: number = 30000
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const cacheKey = `pagination:${sql}:${JSON.stringify(params)}:${page}:${limit}`;

    // Try cache first
    const cached = queryCache.getQuery(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute pagination query
    const result = await this.queryWithPagination(sql, params, page, limit);

    // Cache result
    queryCache.setQuery(cacheKey, [], result, cacheTTL);

    return result;
  }

  // Enhanced query with pagination support
  async queryWithPagination<T>(
    sql: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Get total count with caching
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const totalResult = await this.queryCached(countSql, params, 60000); // Cache for 1 minute
    const total = totalResult.total;

    // Get paginated data
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const data = await this.query(paginatedSql, [...params, limit, offset]) as T[];

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Backup database
  async backup(backupPath: string): Promise<void> {
    console.log(`💾 Creating database backup: ${backupPath}`);

    try {
      // Bun SQLite doesn't have backup API, use file copy instead
      const dbFile = this.db.filename || ':memory:';
      if (dbFile === ':memory:') {
        console.warn('⚠️ Cannot backup in-memory database');
        return;
      }
      
      // Use Bun.file to copy the database file
      const sourceFile = Bun.file(dbFile);
      await Bun.write(backupPath, sourceFile);

      console.log('✅ Database backup completed');
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance for enterprise use
export const db = createDatabaseConnection();

// Setup proper resource cleanup
setupGracefulShutdown();
