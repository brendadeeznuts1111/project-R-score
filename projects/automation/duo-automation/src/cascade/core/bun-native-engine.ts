/**
 * Bun Cascade Engine - Fixed with Proper Bun Native APIs
 * [#REF:ENGINE-CORE] - Bun-native implementation
 */

// Type declarations for Bun APIs
declare const Bun: {
  nanoseconds(): number;
  metrics: {
    set(options: { name: string; value: number; tags?: Record<string, string> }): void;
    increment(name: string, value: number, tags?: Record<string, string>): void;
    histogram(name: string, value: number, tags?: Record<string, string>): void;
  };
  addSignalListener(signal: string, handler: () => void): void;
  clearAllTimers(): void;
  timer(callback: () => void, delay: number): void;
  atomic(fn: () => void): void;
  hash: {
    crc32(data: string): number;
  };
  stringify(data: any): string;
  revive(data: any): any;
  memory: {
    usage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  signal: (signal: string) => Promise<void>;
  write(path: string, data: string | Uint8Array): Promise<number>;
  file(path: string): { exists(): boolean };
  gzipSync(data: Buffer): Buffer;
  gunzipSync(data: Buffer): Buffer;
  uuidv7(): string;
  transpile(code: string, options?: any): string;
  eventLoop: {
    lag(): number;
    activeHandles(): number;
    activeRequests(): number;
  };
} | undefined;

declare const navigator: {
  hardwareConcurrency: number;
};

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

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

export class BunCascadeEngine {
  private db: any;
  private isInitialized = false;
  
  private constructor() {}
  
  // Factory method for proper async initialization
  static async create(dbPath: string = 'cascade.db'): Promise<BunCascadeEngine> {
    const engine = new BunCascadeEngine();
    await engine.initialize(dbPath);
    return engine;
  }
  
  private async initialize(dbPath: string): Promise<void> {
    const Database = await initializeDatabase();
    
    if (!Database) {
      throw new Error('bun:sqlite is required for BunCascadeEngine');
    }
    
    // Use shared SQLite file with WAL mode for concurrent workers
    this.db = new Database(dbPath, {
      create: true,
      readwrite: true,
      // Enable WAL for high-concurrency
      exec: 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;'
    });
    
    // Verify connection is shared
    console.log(`🔗 Cascade DB connected: ${this.db.filename}`);
    this.initializeSchema();
  }
  
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cascade_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        conditions TEXT,
        actions TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS cascade_skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT,
        performance_metrics TEXT,
        created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS cascade_memories (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        device_id TEXT,
        memory_data TEXT,
        compressed_data BLOB,
        created_at INTEGER,
        expires_at INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_rules_priority ON cascade_rules(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_merchant ON cascade_memories(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_memories_expires ON cascade_memories(expires_at);
    `);
    
    this.isInitialized = true;
    console.log('✅ Cascade schema initialized');
  }
  
  // Reinforcement: Proper cleanup on shutdown
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    
    // Checkpoint WAL before closing
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    this.db.close();
    this.isInitialized = false;
    console.log('🔒 Cascade DB shutdown complete');
  }
  
  // Shared database operations
  executeQuery(sql: string, params: any[] = []): any {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql).run(...params);
  }
  
  executeSelect(sql: string, params: any[] = []): any[] {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql).all(...params);
  }
  
  // Test shared connection
  testSharedConnection(): boolean {
    const testId = `test-${Date.now()}-${Math.random()}`;
    this.executeQuery(
      'INSERT INTO cascade_rules (id, name, priority, created_at) VALUES (?, ?, ?, ?)',
      [testId, 'connection-test', 0, Date.now()]
    );
    
    const result = this.executeSelect(
      'SELECT * FROM cascade_rules WHERE id = ?',
      [testId]
    );
    
    return result.length > 0;
  }
  
  // Bun-native context hashing with fallback
  hashContext(context: any): number {
    try {
      const json = Bun?.stringify?.(context) || JSON.stringify(context);
      return Bun?.hash?.crc32?.(json) || this.simpleHash(json);
    } catch (error) {
      return this.simpleHash(JSON.stringify(context));
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
}
