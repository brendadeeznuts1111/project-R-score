/**
 * Database Pool Wrappers v3.20
 * 
 * PostgreSQL and MySQL pool compatibility layers
 * Pg/MySQL compat via pg.Pool and mysql2.Pool
 */

// PostgreSQL Pool Wrapper
export class PostgreSQLPool {
  private pool: any;
  private config: any;
  
  constructor(config: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
  }) {
    this.config = {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      ...config
    };
    
    // Dynamic import to avoid bundling issues
    this.initializePool();
  }
  
  private async initializePool() {
    try {
      const { Pool } = await import('pg');
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ PostgreSQL pool initialized');
    } catch (error) {
      console.error('❌ PostgreSQL pool initialization failed:', error);
      throw error;
    }
  }
  
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }
    
    const start = performance.now();
    try {
      const result = await this.pool.query(text, params);
      const latency = performance.now() - start;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        latency: latency
      };
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    }
  }
  
  async insertProfile(sessionId: string, profile: any, member: string = 'anonymous', document: string = 'unknown'): Promise<string> {
    const profileId = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.query(`
      INSERT INTO profiles (id, session, profile, timestamp, member, document) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        session = EXCLUDED.session,
        profile = EXCLUDED.profile,
        timestamp = EXCLUDED.timestamp,
        member = EXCLUDED.member,
        document = EXCLUDED.document
    `, [profileId, sessionId, JSON.stringify(profile), timestamp, member, document]);
    
    return profileId;
  }
  
  async querySessions(member: string = '*'): Promise<any[]> {
    let query = 'SELECT * FROM profiles';
    const params: any[] = [];
    
    if (member !== '*') {
      query += ' WHERE member LIKE $1 ORDER BY timestamp DESC';
      params.push(`%${member}%`);
    } else {
      query += ' ORDER BY timestamp DESC LIMIT 100';
    }
    
    const result = await this.query(query, params);
    return result.rows;
  }
  
  async getPoolStats(): Promise<any> {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      config: this.config
    };
  }
  
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ PostgreSQL pool closed');
    }
  }
}

// MySQL Pool Wrapper
export class MySQLPool {
  private pool: any;
  private config: any;
  
  constructor(config: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionLimit?: number;
    acquireTimeout?: number;
    timeout?: number;
  }) {
    this.config = {
      connectionLimit: 20,
      acquireTimeout: 60000,
      timeout: 60000,
      ...config
    };
    
    this.initializePool();
  }
  
  private async initializePool() {
    try {
      const mysql = await import('mysql2/promise');
      this.pool = mysql.createPool(this.config);
      
      // Test connection
      const [rows] = await this.pool.execute('SELECT 1');
      console.log('✅ MySQL pool initialized');
    } catch (error) {
      console.error('❌ MySQL pool initialization failed:', error);
      throw error;
    }
  }
  
  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized');
    }
    
    const start = performance.now();
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      const latency = performance.now() - start;
      
      return {
        rows,
        fields,
        latency
      };
    } catch (error) {
      console.error('MySQL query error:', error);
      throw error;
    }
  }
  
  async insertProfile(sessionId: string, profile: any, member: string = 'anonymous', document: string = 'unknown'): Promise<string> {
    const profileId = crypto.randomUUID();
    const timestamp = Date.now();
    
    await this.query(`
      INSERT INTO profiles (id, session, profile, timestamp, member, document) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        session = VALUES(session),
        profile = VALUES(profile),
        timestamp = VALUES(timestamp),
        member = VALUES(member),
        document = VALUES(document)
    `, [profileId, sessionId, JSON.stringify(profile), timestamp, member, document]);
    
    return profileId;
  }
  
  async querySessions(member: string = '*'): Promise<any[]> {
    let query = 'SELECT * FROM profiles';
    const params: any[] = [];
    
    if (member !== '*') {
      query += ' WHERE member LIKE ? ORDER BY timestamp DESC';
      params.push(`%${member}%`);
    } else {
      query += ' ORDER BY timestamp DESC LIMIT 100';
    }
    
    const result = await this.query(query, params);
    return result.rows;
  }
  
  async getPoolStats(): Promise<any> {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }
    
    // MySQL2 pool doesn't expose the same stats as pg
    return {
      config: this.config,
      status: 'active'
    };
  }
  
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ MySQL pool closed');
    }
  }
}

// Universal Pool Factory
export class DatabasePoolFactory {
  static createPool(type: 'sqlite' | 'postgresql' | 'mysql', config: any) {
    switch (type) {
      case 'sqlite':
        const { TelemetryPool } = require('../scripts/pool-telemetry');
        return new TelemetryPool();
      case 'postgresql':
        return new PostgreSQLPool(config);
      case 'mysql':
        return new MySQLPool(config);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}

// Pool Manager for multiple database types
export class PoolManager {
  private pools: Map<string, any> = new Map();
  
  async addPool(name: string, type: 'sqlite' | 'postgresql' | 'mysql', config: any): Promise<void> {
    const pool = DatabasePoolFactory.createPool(type, config);
    this.pools.set(name, pool);
    console.log(`✅ Added pool '${name}' (${type})`);
  }
  
  getPool(name: string): any {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Pool '${name}' not found`);
    }
    return pool;
  }
  
  async insertProfile(poolName: string, sessionId: string, profile: any, member?: string, document?: string): Promise<string> {
    const pool = this.getPool(poolName);
    return await pool.insertProfile(sessionId, profile, member, document);
  }
  
  async querySessions(poolName: string, member: string = '*'): Promise<any[]> {
    const pool = this.getPool(poolName);
    return await pool.querySessions(member);
  }
  
  async getAllPoolStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [name, pool] of this.pools) {
      try {
        stats[name] = await pool.getPoolStats();
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }
  
  async closeAll(): Promise<void> {
    console.log(`🔒 Closing all pools...`);
    
    for (const [name, pool] of this.pools) {
      try {
        await pool.close();
        console.log(`✅ Closed pool '${name}'`);
      } catch (error) {
        console.error(`❌ Error closing pool '${name}':`, error);
      }
    }
    
    this.pools.clear();
    console.log(`✅ All pools closed`);
  }
}

// Example usage and configuration
export const POOL_CONFIGS = {
  postgresql: {
    connectionString: process.env.PG_URL || 'postgresql://user:pass@localhost:5432/telemetry',
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || 'telemetry',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000
  },
  sqlite: {
    dbPath: process.env.DB_PATH || './telemetry.db',
    poolSize: parseInt(process.env.POOL_SIZE || '20')
  }
};
