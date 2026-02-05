// database/sqlite-optimizer.ts
import { Database } from 'bun:sqlite'
import { LRUCache } from 'lru-cache'

export class Tier1380SQLite {
  private db: Database
  private statementCache: LRUCache<string, any>
  private queryMetrics = new Map<string, QueryStats>()

  // Public getters for access
  get cacheSize() { return this.statementCache.size }
  get metrics() { return Array.from(this.queryMetrics.entries()).map(([sql, stats]) => ({ query: sql.substring(0, 100) + '...', ...stats })) }
  get database() { return this.db } // Public access to database

  constructor(dbPath: string, private options: SQLiteOptions = {}) {
    this.db = new Database(dbPath, {
      // Native Bun SQLite optimizations
      readonly: options.readonly ?? false,
      create: options.create ?? true,
      strict: options.strict ?? true // Type checking
      // Note: Some options like wal might not be available in Bun's SQLite wrapper
      // We'll use PRAGMA statements for additional optimizations
    })

    // Apply performance optimizations
    this.optimizeDatabase()

    // LRU cache for prepared statements
    this.statementCache = new LRUCache({
      max: 100, // Cache 100 statements
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
      allowStale: false,

      dispose: (key, stmt) => {
        // Statement cleanup - simplified for Bun's SQLite
        // if (stmt && typeof stmt.finalize === 'function') {
        //   stmt.finalize()
        // }
        console.log(`Cache evicted: ${key}`)
      }
    })

    // Performance monitoring
    this.setupMetrics()
  }

  private optimizeDatabase(): void {
    // Apply SQLite performance optimizations
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -10000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 268435456; -- 256MB
      PRAGMA page_size = 4096;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `)
  }

  /**
   * Smart query with caching, metrics, and retry logic
   */
  async query<T = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = performance.now()
    const queryId = this.hashQuery(sql, params)

    try {
      // Get or prepare statement
      let stmt = this.statementCache.get(queryId)
      if (!stmt) {
        stmt = this.db.prepare(sql)
        this.statementCache.set(queryId, stmt)

        // Track statement preparation
        this.recordMetric('statement_prepared', 1)
      }

      // Execute with retry logic for busy database
      const maxRetries = options.retries ?? 3
      let lastError: Error

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const rows = stmt.all(...params) as T[]
          const duration = performance.now() - startTime

          // Update metrics
          this.updateQueryMetrics(sql, duration, rows.length)

          return {
            rows,
            duration,
            cached: attempt === 0,
            metrics: this.getQueryStats(sql),
            plan: options.explain ? this.explainQuery(sql, params) : undefined
          }
        } catch (error: any) {
          lastError = error

          if (error.code === 'SQLITE_BUSY' && attempt < maxRetries) {
            // Exponential backoff
            await Bun.sleep(2 ** attempt * 50)
            continue
          }

          // SQLITE_SCHEMA error - need to re-prepare
          if (error.code === 'SQLITE_SCHEMA') {
            this.statementCache.delete(queryId)
            stmt = this.db.prepare(sql)
            this.statementCache.set(queryId, stmt)
            continue
          }

          throw error
        }
      }

      throw lastError!
    } catch (error) {
      this.recordMetric('query_error', 1)
      throw error
    }
  }

  /**
   * Batch insert with transaction optimization
   */
  async batchInsert<T extends Record<string, any>>(
    table: string,
    data: T[],
    batchSize = 1000
  ): Promise<BatchResult> {
    if (data.length === 0) return { inserted: 0, duration: 0, rate: 0, memory: 0 }

    // Security: Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    // Resource protection: Limit batch size
    const maxBatchSize = 10000
    const safeBatchSize = Math.min(batchSize, maxBatchSize)
    if (data.length > maxBatchSize * 10) {
      throw new Error(`Batch size too large: ${data.length}. Maximum allowed: ${maxBatchSize * 10}`)
    }

    const startTime = performance.now()
    const columns = Object.keys(data[0])

    // Security: Validate column names
    if (!columns.every(col => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col))) {
      throw new Error('Invalid column names detected')
    }

    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    const stmt = this.db.prepare(sql)

    // Transaction for atomicity and speed
    this.db.exec('BEGIN TRANSACTION;')

    try {
      let inserted = 0

      for (let i = 0; i < data.length; i += safeBatchSize) {
        const batch = data.slice(i, i + safeBatchSize)

        for (const row of batch) {
          const values = columns.map(col => row[col])
          stmt.run(...values)
          inserted++
        }

        // Periodic commit to avoid huge transactions
        if (i % (safeBatchSize * 10) === 0) {
          this.db.exec('COMMIT; BEGIN TRANSACTION;')
        }
      }

      this.db.exec('COMMIT;')
      const duration = performance.now() - startTime

      return {
        inserted,
        duration,
        rate: inserted / (duration / 1000),
        memory: process.memoryUsage().heapUsed
      }
    } catch (error) {
      this.db.exec('ROLLBACK;')
      throw error
    }
  }

  /**
   * Query plan analysis
   */
  private explainQuery(sql: string, params: any[]): QueryPlan {
    const stmt = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`)
    const planRows = stmt.all(...params) as any[]

    return {
      raw: planRows,
      summary: this.analyzeQueryPlan(planRows),
      recommendations: this.generatePlanRecommendations(planRows)
    }
  }

  private analyzeQueryPlan(rows: any[]): string {
    if (rows.length === 0) return 'No plan available'

    const operations = rows.map(row => row.detail).join(' → ')
    return operations
  }

  private generatePlanRecommendations(rows: any[]): string[] {
    const recommendations: string[] = []
    const planText = rows.map(row => row.detail).join(' ')

    if (planText.includes('SCAN')) {
      recommendations.push('Consider adding indexes for scanned tables')
    }

    if (planText.includes('TEMP B-TREE')) {
      recommendations.push('Query uses temporary B-tree - consider optimizing')
    }

    if (planText.includes('SUBQUERY')) {
      recommendations.push('Consider rewriting subqueries as JOINs')
    }

    return recommendations
  }

  private hashQuery(sql: string, params: any[]): string {
    // Simple hash for query caching
    return Bun.hash(sql + JSON.stringify(params)).toString()
  }

  private setupMetrics(): void {
    // Initialize metrics tracking
    this.recordMetric('db_initialized', 1)
  }

  private recordMetric(metric: string, value: number): void {
    // Simple metrics tracking - would use proper metrics in production
    console.log(`Metric: ${metric} = ${value}`)
  }

  private updateQueryMetrics(sql: string, duration: number, rowCount: number): void {
    const stats = this.queryMetrics.get(sql) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      totalRows: 0,
      lastRun: new Date()
    }

    stats.count++
    stats.totalDuration += duration
    stats.avgDuration = stats.totalDuration / stats.count
    stats.totalRows += rowCount
    stats.lastRun = new Date()

    this.queryMetrics.set(sql, stats)
  }

  private getQueryStats(sql: string): QueryStats | undefined {
    return this.queryMetrics.get(sql)
  }

  /**
   * Connection pooling for high concurrency
   */
  static createPool(config: PoolConfig): DatabasePool {
    const pool: Database[] = []

    for (let i = 0; i < config.size; i++) {
      pool.push(new Database(config.path, {
        readonly: config.options?.readonly ?? false,
        create: config.options?.create ?? true
      }))
    }

    let next = 0

    return {
      acquire(): Database {
        const db = pool[next]
        next = (next + 1) % pool.length
        return db
      },

      async transaction<T>(callback: (db: Database) => T): Promise<T> {
        const db = this.acquire()
        try {
          db.exec('BEGIN')
          const result = await callback(db)
          db.exec('COMMIT')
          return result
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
      },

      close(): void {
        pool.forEach(db => db.close())
      }
    }
  }

  // Clean up resources
  close(): void {
    this.statementCache.clear()
    this.db.close()
  }
}

// Type definitions
interface SQLiteOptions {
  readonly?: boolean
  create?: boolean
  strict?: boolean
  wal?: boolean
  // Add other options as needed
}

interface QueryOptions {
  retries?: number
  explain?: boolean
}

interface QueryResult<T> {
  rows: T[]
  duration: number
  cached: boolean
  metrics?: QueryStats
  plan?: QueryPlan
}

interface QueryStats {
  count: number
  totalDuration: number
  avgDuration: number
  totalRows: number
  lastRun: Date
}

interface QueryPlan {
  raw: any[]
  summary: string
  recommendations: string[]
}

interface BatchResult {
  inserted: number
  duration: number
  rate: number
  memory: number
}

interface PoolConfig {
  path: string
  size: number
  options?: SQLiteOptions
}

interface DatabasePool {
  acquire(): Database
  transaction<T>(callback: (db: Database) => T): Promise<T>
  close(): void
}

export default Tier1380SQLite
