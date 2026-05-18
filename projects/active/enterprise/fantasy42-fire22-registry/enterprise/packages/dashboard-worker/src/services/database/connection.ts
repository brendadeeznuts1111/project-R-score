/**
 * 🗄️ Fire22 Dashboard - Database Connection Service
 * Centralized database connection management with connection pooling
 */

import { Database } from 'bun:sqlite';
import type { DatabaseConfig, SQLiteDatabase } from '../../types/database';
import CONSTANTS from '../../config/constants.js';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private isConnected: boolean = false;
  private connectionConfig: DatabaseConfig;

  private constructor() {
    this.connectionConfig = {
      connectionTimeoutMillis: CONSTANTS.DATABASE_CONFIG.CONNECTION_TIMEOUT,
      idleTimeoutMillis: CONSTANTS.DATABASE_CONFIG.QUERY_TIMEOUT,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to database
   */
  public async connect(databasePath?: string): Promise<void> {
    try {
      const dbPath = databasePath || CONSTANTS.DATABASE_CONFIG.DEFAULT_PATH;

      if (this.db) {
        this.db.close();
      }

      this.db = new Database(dbPath);
      this.isConnected = true;

      // Test connection
      await this.testConnection();
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection failed:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Database disconnection error:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): Database {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const result = this.db.query('SELECT 1 as test').get();
      return result && (result as any).test === 1;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if database is connected
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected && this.db !== null;
  }

  /**
   * Execute query with error handling
   */
  public async executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const query = this.db.query(sql);
      return query.all(...params) as T[];
    } catch (error) {
      console.error('Query execution error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute single row query
   */
  public async executeQuerySingle<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const query = this.db.query(sql);
      return query.get(...params) as T | null;
    } catch (error) {
      console.error('Single query execution error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute insert/update/delete query
   */
  public async executeUpdate(
    sql: string,
    params: any[] = []
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const query = this.db.query(sql);
      return query.run(...params);
    } catch (error) {
      console.error('Update execution error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  public async executeTransaction(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    this.db.exec('BEGIN TRANSACTION');

    try {
      for (const statement of statements) {
        const query = this.db.query(statement.sql);
        query.run(...(statement.params || []));
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get database schema information
   */
  public async getSchemaInfo(): Promise<{
    tables: string[];
    fire22Schema: boolean;
    tableCount: number;
  }> {
    try {
      const tables = await this.executeQuery<{ name: string }>(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

      const tableNames = tables.map(t => t.name);
      const requiredTables = CONSTANTS.DATABASE_CONFIG.REQUIRED_TABLES;
      const fire22Schema = requiredTables.every(table => tableNames.includes(table));

      return {
        tables: tableNames,
        fire22Schema,
        tableCount: tableNames.length,
      };
    } catch (error) {
      console.error('Schema info error:', error);
      return {
        tables: [],
        fire22Schema: false,
        tableCount: 0,
      };
    }
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<{
    customers: number;
    transactions: number;
    bets: number;
    totalRecords: number;
  }> {
    try {
      const [customerCount, transactionCount, betCount] = await Promise.all([
        this.executeQuerySingle<{ count: number }>('SELECT COUNT(*) as count FROM customers'),
        this.executeQuerySingle<{ count: number }>('SELECT COUNT(*) as count FROM transactions'),
        this.executeQuerySingle<{ count: number }>('SELECT COUNT(*) as count FROM bets'),
      ]);

      const customers = customerCount?.count || 0;
      const transactions = transactionCount?.count || 0;
      const bets = betCount?.count || 0;

      return {
        customers,
        transactions,
        bets,
        totalRecords: customers + transactions + bets,
      };
    } catch (error) {
      console.error('Database stats error:', error);
      return {
        customers: 0,
        transactions: 0,
        bets: 0,
        totalRecords: 0,
      };
    }
  }

  /**
   * Initialize database schema
   */
  public async initializeSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const schemaSQL = `
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        customer_id TEXT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY,
        customer_id TEXT,
        amount REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        agent_id TEXT DEFAULT 'BLAKEPPH',
        tran_code TEXT,
        tran_type TEXT,
        document_number TEXT,
        entered_by TEXT,
        freeplay_balance REAL DEFAULT 0,
        freeplay_pending_balance REAL DEFAULT 0,
        freeplay_pending_count INTEGER DEFAULT 0,
        grade_num INTEGER,
        login TEXT,
        short_desc TEXT,
        tran_datetime TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        amount REAL,
        odds REAL,
        type TEXT,
        status TEXT DEFAULT 'pending',
        outcome TEXT,
        teams TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_bets_customer_id ON bets(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
      CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);
    `;

    this.db.exec(schemaSQL);
  }

  /**
   * Health check for the database
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    fire22Schema: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = performance.now();

    try {
      const isConnected = await this.testConnection();
      const schemaInfo = await this.getSchemaInfo();
      const responseTime = performance.now() - startTime;

      return {
        connected: isConnected,
        fire22Schema: schemaInfo.fire22Schema,
        responseTime: Math.round(responseTime * 100) / 100,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        connected: false,
        fire22Schema: false,
        responseTime: Math.round(responseTime * 100) / 100,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
export default databaseService;
