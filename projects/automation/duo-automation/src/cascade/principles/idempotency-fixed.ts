/**
 * Idempotency Manager - Fixed with Web-Compatible Types
 * [#REF:PRINCIPLES-IDEMPOTENCY] - Fixed environment compatibility
 */

// Type declarations for Bun APIs
declare const Bun: {
  stringify(data: any): string;
  revive(data: any): any;
  hash: {
    crc32(data: string): number;
  };
} | undefined;

// Dynamic import for SQLite with fallback
let Database: any;
let DatabaseInitialized = false;

async function initializeDatabase() {
  if (DatabaseInitialized) return Database;
  
  try {
    const sqliteModule = await import('bun:sqlite');
    Database = sqliteModule.Database;
  } catch (error) {
    console.warn('⚠️ bun:sqlite not available, using fallback');
    Database = null;
  }
  
  DatabaseInitialized = true;
  return Database;
}

export interface IdempotencyRecord {
  key: string;
  operation: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  expiresAt: number;
  retryCount: number;
}

export class IdempotencyManager {
  private store: any;
  private readonly DEFAULT_TTL = 86400000; // 24 hours
  private cleanupInterval: number | null = null;
  
  private constructor() {}
  
  // Factory method for proper async initialization
  static async create(dbPath?: string): Promise<IdempotencyManager> {
    const manager = new IdempotencyManager();
    await manager.initialize(dbPath);
    return manager;
  }
  
  private async initialize(dbPath?: string): Promise<void> {
    const Database = await initializeDatabase();
    
    if (!Database) {
      throw new Error('bun:sqlite is required for IdempotencyManager');
    }
    
    this.store = new Database(dbPath || './data/idempotency.db');
    this.initializeSchema();
    this.startCleanupLoop();
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
   * Execute operation with idempotency guarantee and TTL
   */
  async executeWithIdempotency<T>(
    idempotencyKey: string,
    operation: string,
    handler: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<T> {
    const expiresAt = Date.now() + ttlMs;
    
    // Check if already executed
    const existing = this.getRecord(idempotencyKey);
    
    if (existing) {
      switch (existing.status) {
        case 'completed':
          if (existing.result) {
            console.log(`🔄 Returning cached result for ${operation}`);
            return this.parseResult(existing.result);
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
    
    // Record execution start with TTL
    this.upsertRecord({
      key: idempotencyKey,
      operation,
      status: 'in_progress',
      createdAt: Date.now(),
      expiresAt,
      retryCount: existing?.retryCount || 0
    });
    
    try {
      // Execute main logic
      const result = await handler();
      
      // Cache result with TTL
      this.upsertRecord({
        key: idempotencyKey,
        operation,
        status: 'completed',
        result: this.stringifyResult(result),
        createdAt: existing?.createdAt || Date.now(),
        expiresAt,
        retryCount: 0
      });
      
      console.log(`✅ Completed operation ${operation} with idempotency`);
      return result;
      
    } catch (error) {
      // Mark as failed but keep for debugging (shorter TTL)
      this.upsertRecord({
        key: idempotencyKey,
        operation,
        status: 'failed',
        createdAt: existing?.createdAt || Date.now(),
        expiresAt: Date.now() + 3600000, // Keep failed ops for 1 hour
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
      return this.parseResult(record.result);
    }
    return null;
  }
  
  /**
   * NEW: Background cleanup of expired keys
   */
  private startCleanupLoop(): void {
    // Use web-compatible setInterval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredKeys();
    }, 3600000) as unknown as number;
    
    console.log('🧹 Idempotency cleanup loop started (hourly)');
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
    
    // Add total count
    const totalResult = this.store.query(
      'SELECT COUNT(*) as total FROM idempotency_keys WHERE expires_at > ?'
    ).get(Date.now());
    result.total_active = totalResult.total;
    
    return result;
  }
  
  /**
   * Force cleanup of all expired keys
   */
  forceCleanup(): number {
    return this.cleanupExpiredKeys();
  }
  
  /**
   * Get expiration info for a key
   */
  getExpirationInfo(idempotencyKey: string): { exists: boolean; expiresAt?: number; timeToExpiry?: number } | null {
    const record = this.getRecord(idempotencyKey);
    if (!record) return null;
    
    const now = Date.now();
    return {
      exists: true,
      expiresAt: record.expiresAt,
      timeToExpiry: record.expiresAt - now
    };
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
  
  private stringifyResult(result: any): string {
    try {
      return Bun?.stringify?.(result) || JSON.stringify(result);
    } catch (error) {
      return JSON.stringify(result);
    }
  }
  
  private parseResult(result: string): any {
    try {
      return Bun?.revive?.(JSON.parse(result)) || JSON.parse(result);
    } catch (error) {
      return JSON.parse(result);
    }
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
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Final cleanup
    this.cleanupExpiredKeys();
    this.store.close();
    console.log('🔒 Idempotency manager shutdown complete');
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * ✅ USAGE EXAMPLE:
 */
export class IdempotencyExample {
  private idempotency: IdempotencyManager;
  
  constructor() {
    this.idempotency = new IdempotencyManager();
  }
  
  async processPayment(paymentData: any): Promise<any> {
    const key = this.idempotency.generateKey('payment', {
      merchantId: paymentData.merchantId,
      amount: paymentData.amount,
      timestamp: paymentData.timestamp
    });
    
    return await this.idempotency.executeWithIdempotency(
      key,
      'payment',
      async () => {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          paymentId: `pay_${Date.now()}`,
          status: 'completed',
          amount: paymentData.amount
        };
      },
      300000 // 5 minutes TTL for payments
    );
  }
  
  async demonstrateCleanup(): Promise<void> {
    console.log('🧹 Demonstrating idempotency cleanup...');
    
    // Create some test records with different TTLs
    await this.idempotency.executeWithIdempotency(
      'test-short',
      'test',
      async () => ({ result: 'short-lived' }),
      1000 // 1 second
    );
    
    await this.idempotency.executeWithIdempotency(
      'test-long',
      'test',
      async () => ({ result: 'long-lived' }),
      60000 // 1 minute
    );
    
    console.log('📊 Initial stats:', this.idempotency.getStats());
    
    // Wait for short TTL to expire
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force cleanup
    const cleaned = this.idempotency.forceCleanup();
    console.log(`🧹 Cleaned ${cleaned} expired records`);
    
    console.log('📊 Final stats:', this.idempotency.getStats());
  }
}
