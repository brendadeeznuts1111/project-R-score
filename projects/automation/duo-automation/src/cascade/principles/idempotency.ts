/**
 * Cascade Idempotency Principle
 * Ensures all state-changing operations are safe to retry
 * [#REF:PRINCIPLES-IDEMPOTENCY]
 */

// Type declarations for Bun APIs
declare const Bun: {
  hash?: {
    crc32(data: string): number;
  };
} | undefined;

// Dynamic import for SQLite
const getDatabase = () => import('bun:sqlite');

export interface IdempotencyRecord {
  key: string;
  operation: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  expiresAt: number;
  retryCount: number;
}

export interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
  source: string;
}

export class IdempotencyManager {
  private store: any; // Database instance
  private readonly DEFAULT_TTL = 86400000; // 24 hours
  
  constructor(dbPath?: string) {
    // Initialize database asynchronously
    this.initializeDatabase(dbPath);
  }
  
  private async initializeDatabase(dbPath?: string): Promise<void> {
    try {
      const { Database } = await getDatabase();
      this.store = new Database(dbPath || './data/idempotency.db');
      this.initializeSchema();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }
  
  private initializeSchema(): void {
    this.store.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_expires ON idempotency_keys(expires_at);
      CREATE INDEX IF NOT EXISTS idx_status ON idempotency_keys(status);
      CREATE INDEX IF NOT EXISTS idx_operation ON idempotency_keys(operation);
    `);
  }
  
  /**
   * Execute operation with idempotency guarantee
   */
  async executeWithIdempotency<T>(
    idempotencyKey: string,
    operation: string,
    handler: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check if already executed
    const existing = this.getRecord(idempotencyKey);
    
    if (existing) {
      switch (existing.status) {
        case 'completed':
          if (existing.result) {
            console.log(`🔄 Returning cached result for ${operation}`);
            return JSON.parse(existing.result);
          }
          break;
          
        case 'in_progress':
          throw new ConflictError(`Operation ${operation} already in progress`);
          
        case 'failed':
          // Allow retry for failed operations
          console.log(`🔄 Retrying failed operation ${operation}`);
          break;
          
        case 'pending':
          // Take ownership of pending operation
          break;
      }
    }
    
    // Record execution start
    this.upsertRecord({
      key: idempotencyKey,
      operation,
      status: 'in_progress',
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      retryCount: existing?.retryCount || 0
    });
    
    try {
      // Execute main logic
      const result = await handler();
      
      // Cache result
      this.upsertRecord({
        key: idempotencyKey,
        operation,
        status: 'completed',
        result: JSON.stringify(result),
        createdAt: existing?.createdAt || Date.now(),
        expiresAt: Date.now() + ttlMs,
        retryCount: 0
      });
      
      console.log(`✅ Completed operation ${operation} with idempotency`);
      return result;
      
    } catch (error) {
      // Mark as failed (allows retry)
      this.upsertRecord({
        key: idempotencyKey,
        operation,
        status: 'failed',
        createdAt: existing?.createdAt || Date.now(),
        expiresAt: Date.now() + ttlMs,
        retryCount: (existing?.retryCount || 0) + 1
      });
      
      console.error(`❌ Operation ${operation} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Generate idempotency key for operations
   */
  generateKey(operation: string, context: Record<string, any>): string {
    const contextStr = JSON.stringify(context);
    const contextHash = Bun?.hash?.crc32 ? Bun.hash.crc32(contextStr) : this.simpleHash(contextStr);
    return `${operation}:${contextHash.toString(16)}`;
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  /**
   * Check if operation was completed
   */
  isCompleted(idempotencyKey: string): boolean {
    const record = this.getRecord(idempotencyKey);
    return record?.status === 'completed';
  }
  
  /**
   * Get operation result if completed
   */
  getResult<T>(idempotencyKey: string): T | null {
    const record = this.getRecord(idempotencyKey);
    if (record?.status === 'completed' && record.result) {
      return JSON.parse(record.result);
    }
    return null;
  }
  
  /**
   * Cleanup expired keys
   */
  cleanupExpiredKeys(): number {
    const result = this.store.run(
      `DELETE FROM idempotency_keys WHERE expires_at < ?`,
      Date.now()
    );
    
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} expired idempotency keys`);
    }
    
    return result.changes;
  }
  
  /**
   * Get statistics
   */
  getStats(): Record<string, number> {
    const stats = this.store.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(retry_count) as avg_retries
      FROM idempotency_keys 
      WHERE expires_at > ?
      GROUP BY status
    `).all(Date.now());
    
    const result: Record<string, number> = {};
    for (const row of stats) {
      result[`${row.status}_count`] = row.count;
      result[`${row.status}_avg_retries`] = Math.round(row.avg_retries * 100) / 100;
    }
    
    return result;
  }
  
  private getRecord(key: string): IdempotencyRecord | null {
    const row = this.store.query(
      `SELECT * FROM idempotency_keys WHERE key = ? AND expires_at > ?`
    ).get(key, Date.now());
    
    if (!row) return null;
    
    return {
      key: row.key,
      operation: row.operation,
      status: row.status,
      result: row.result,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      retryCount: row.retry_count
    };
  }
  
  private upsertRecord(record: Partial<IdempotencyRecord>): void {
    this.store.run(`
      INSERT OR REPLACE INTO idempotency_keys 
      (key, operation, status, result, created_at, expires_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, 
      record.key,
      record.operation,
      record.status,
      record.result || null,
      record.createdAt,
      record.expiresAt,
      record.retryCount || 0
    );
  }
}

/**
 * Usage example for workflow execution
 */
export class CascadeWorkflowExecutor {
  private idempotency: IdempotencyManager;
  
  constructor() {
    this.idempotency = new IdempotencyManager();
    
    // Cleanup expired keys every hour
    setInterval(() => this.idempotency.cleanupExpiredKeys(), 3600000);
  }
  
  async executeWorkflow(
    workflowId: string, 
    context: { merchantId: string; requestId: string; [key: string]: any }
  ): Promise<any> {
    const idempotencyKey = this.idempotency.generateKey('workflow', {
      workflowId,
      merchantId: context.merchantId,
      requestId: context.requestId
    });
    
    return await this.idempotency.executeWithIdempotency(
      idempotencyKey,
      workflowId,
      async () => {
        // Main workflow logic
        return await this.runWorkflowSteps(workflowId, context);
      }
    );
  }
  
  private async runWorkflowSteps(workflowId: string, context: any): Promise<any> {
    // Placeholder workflow execution
    console.log(`🔄 Executing workflow ${workflowId} for merchant ${context.merchantId}`);
    
    // Simulate workflow steps
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      workflowId,
      merchantId: context.merchantId,
      requestId: context.requestId,
      status: 'completed',
      executedAt: Date.now()
    };
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
