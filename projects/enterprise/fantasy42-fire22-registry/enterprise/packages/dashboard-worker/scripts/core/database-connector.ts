#!/usr/bin/env bun

/**
 * 🗄️ Fire22 Database Connector
 *
 * Real PostgreSQL integration for the Fire22 system:
 * - Connection management with connection pooling
 * - Transaction handling with ACID compliance
 * - Query builders and result processing
 * - Error handling and recovery
 * - Performance monitoring and metrics
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { runScript } from './script-runner';
import { handleError, createError } from './error-handler';
import { validateConfig } from './config-validator';

// Database configuration schema
const dbConfigSchema = {
  host: {
    type: 'string',
    required: true,
    min: 1,
  },
  port: {
    type: 'number',
    required: true,
    min: 1,
    max: 65535,
  },
  database: {
    type: 'string',
    required: true,
    min: 1,
  },
  user: {
    type: 'string',
    required: true,
    min: 1,
  },
  password: {
    type: 'string',
    required: true,
    min: 1,
  },
  ssl: {
    type: 'boolean',
    required: false,
  },
  maxConnections: {
    type: 'number',
    required: false,
    min: 1,
    max: 100,
  },
};

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

// Query result interface
interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rowCount: number;
  duration: number;
}

// Transaction interface
interface Transaction {
  id: string;
  status: 'pending' | 'committed' | 'rolled-back';
  startTime: Date;
  queries: string[];
}

class DatabaseConnector {
  private config: DatabaseConfig;
  private client: any; // PostgreSQL client
  private pool: any; // Connection pool
  private transactions: Map<string, Transaction> = new Map();
  private isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection and pool
   */
  async connect(): Promise<void> {
    return await runScript(
      'database-connect',
      async () => {
        try {
          // Validate configuration
          const validation = validateConfig(this.config, dbConfigSchema);
          if (!validation.isValid) {
            throw createError(
              'Invalid database configuration',
              {
                scriptName: 'database-connector',
                operation: 'connect',
              },
              {
                type: 'configuration',
                severity: 'high',
                recoverable: false,
                details: validation.errors,
              }
            );
          }

          // Import PostgreSQL client dynamically
          const { Client, Pool } = await import('pg');

          // Create connection pool
          this.pool = new Pool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl || false,
            max: this.config.maxConnections || 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          });

          // Test connection
          this.client = new Client({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl || false,
          });

          await this.client.connect();
          this.isConnected = true;

          console.log(
            `✅ Connected to PostgreSQL database: ${this.config.database} on ${this.config.host}:${this.config.port}`
          );

          // Close test client
          await this.client.end();
          this.client = null;
        } catch (error) {
          this.isConnected = false;
          throw createError(
            'Failed to connect to database',
            {
              scriptName: 'database-connector',
              operation: 'connect',
            },
            {
              type: 'connection',
              severity: 'high',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'connection'],
        timeout: 30000,
      }
    );
  }

  /**
   * Execute a query with parameters
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return await runScript(
      'database-query',
      async () => {
        try {
          if (!this.isConnected) {
            throw new Error('Database not connected');
          }

          const startTime = Date.now();
          const result = await this.pool.query(sql, params);
          const duration = Date.now() - startTime;

          return {
            success: true,
            data: result.rows,
            rowCount: result.rowCount,
            duration,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            rowCount: 0,
            duration: 0,
          };
        }
      },
      {
        tags: ['database', 'query'],
        timeout: 30000,
      }
    );
  }

  /**
   * Begin a new transaction
   */
  async beginTransaction(): Promise<string> {
    return await runScript(
      'database-transaction-begin',
      async () => {
        try {
          if (!this.isConnected) {
            throw new Error('Database not connected');
          }

          const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const transaction: Transaction = {
            id: transactionId,
            status: 'pending',
            startTime: new Date(),
            queries: [],
          };

          this.transactions.set(transactionId, transaction);

          // Begin transaction
          await this.pool.query('BEGIN');

          console.log(`✅ Transaction ${transactionId} started`);
          return transactionId;
        } catch (error) {
          throw createError(
            'Failed to begin transaction',
            {
              scriptName: 'database-connector',
              operation: 'begin-transaction',
            },
            {
              type: 'transaction',
              severity: 'medium',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'transaction'],
        timeout: 10000,
      }
    );
  }

  /**
   * Execute query within a transaction
   */
  async executeInTransaction(
    transactionId: string,
    sql: string,
    params: any[] = []
  ): Promise<QueryResult> {
    return await runScript(
      'database-transaction-execute',
      async () => {
        try {
          const transaction = this.transactions.get(transactionId);
          if (!transaction || transaction.status !== 'pending') {
            throw new Error(`Invalid transaction: ${transactionId}`);
          }

          const startTime = Date.now();
          const result = await this.pool.query(sql, params);
          const duration = Date.now() - startTime;

          // Track query in transaction
          transaction.queries.push(sql);

          return {
            success: true,
            data: result.rows,
            rowCount: result.rowCount,
            duration,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            rowCount: 0,
            duration: 0,
          };
        }
      },
      {
        tags: ['database', 'transaction'],
        timeout: 30000,
      }
    );
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    return await runScript(
      'database-transaction-commit',
      async () => {
        try {
          const transaction = this.transactions.get(transactionId);
          if (!transaction || transaction.status !== 'pending') {
            throw new Error(`Invalid transaction: ${transactionId}`);
          }

          await this.pool.query('COMMIT');
          transaction.status = 'committed';

          console.log(`✅ Transaction ${transactionId} committed successfully`);
          console.log(`   Queries executed: ${transaction.queries.length}`);
          console.log(`   Duration: ${Date.now() - transaction.startTime.getTime()}ms`);
        } catch (error) {
          throw createError(
            'Failed to commit transaction',
            {
              scriptName: 'database-connector',
              operation: 'commit-transaction',
            },
            {
              type: 'transaction',
              severity: 'medium',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'transaction'],
        timeout: 10000,
      }
    );
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    return await runScript(
      'database-transaction-rollback',
      async () => {
        try {
          const transaction = this.transactions.get(transactionId);
          if (!transaction || transaction.status !== 'pending') {
            throw new Error(`Invalid transaction: ${transactionId}`);
          }

          await this.pool.query('ROLLBACK');
          transaction.status = 'rolled-back';

          console.log(`🔄 Transaction ${transactionId} rolled back`);
          console.log(`   Queries executed: ${transaction.queries.length}`);
        } catch (error) {
          throw createError(
            'Failed to rollback transaction',
            {
              scriptName: 'database-connector',
              operation: 'rollback-transaction',
            },
            {
              type: 'transaction',
              severity: 'medium',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'transaction'],
        timeout: 10000,
      }
    );
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{ customers: number; transactions: number; bets: number }> {
    return await runScript(
      'database-stats',
      async () => {
        try {
          const [customersResult, transactionsResult, betsResult] = await Promise.all([
            this.query('SELECT COUNT(*) as count FROM customers'),
            this.query('SELECT COUNT(*) as count FROM transactions'),
            this.query('SELECT COUNT(*) as count FROM bets'),
          ]);

          return {
            customers: customersResult.success ? customersResult.data[0].count : 0,
            transactions: transactionsResult.success ? transactionsResult.data[0].count : 0,
            bets: betsResult.success ? betsResult.data[0].count : 0,
          };
        } catch (error) {
          throw createError(
            'Failed to get database statistics',
            {
              scriptName: 'database-connector',
              operation: 'get-stats',
            },
            {
              type: 'query',
              severity: 'low',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'stats'],
        timeout: 15000,
      }
    );
  }

  /**
   * Close database connections
   */
  async disconnect(): Promise<void> {
    return await runScript(
      'database-disconnect',
      async () => {
        try {
          if (this.pool) {
            await this.pool.end();
          }
          if (this.client) {
            await this.client.end();
          }
          this.isConnected = false;
          console.log('✅ Database connections closed');
        } catch (error) {
          throw createError(
            'Failed to close database connections',
            {
              scriptName: 'database-connector',
              operation: 'disconnect',
            },
            {
              type: 'connection',
              severity: 'low',
              recoverable: true,
              originalError: error,
            }
          );
        }
      },
      {
        tags: ['database', 'disconnect'],
        timeout: 10000,
      }
    );
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): { isConnected: boolean; activeTransactions: number } {
    return {
      isConnected: this.isConnected,
      activeTransactions: Array.from(this.transactions.values()).filter(t => t.status === 'pending')
        .length,
    };
  }
}

// Factory function to create database connector
export async function createDatabaseConnector(config: DatabaseConfig): Promise<DatabaseConnector> {
  const connector = new DatabaseConnector(config);
  await connector.connect();
  return connector;
}

// Export types and classes
export { DatabaseConnector, DatabaseConfig, QueryResult, Transaction, dbConfigSchema };
