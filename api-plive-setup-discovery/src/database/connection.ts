import { Pool, PoolConfig } from 'pg';
import { config } from '../api/config/api-config';
import { logger } from '../api/utils/logger';

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected = false;

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async connect(): Promise<void> {
    try {
      if (this.pool) {
        logger.warn('Database already connected');
        return;
      }

      const dbConfig: DatabaseConfig = {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      };

      this.pool = new Pool(dbConfig);

      // Handle pool events
      this.pool.on('connect', (client) => {
        logger.debug('New database client connected');
      });

      this.pool.on('error', (err, client) => {
        logger.error('Unexpected database error on idle client', { error: err });
      });

      this.pool.on('remove', (client) => {
        logger.debug('Database client removed from pool');
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('Database connected successfully', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name
      });

    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from database', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      logger.error('Database query error', { error, query: text, params });
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database transaction error', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  getStatus(): { connected: boolean; totalCount: number; idleCount: number; waitingCount: number } {
    if (!this.pool) {
      return { connected: false, totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      connected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Export singleton instance
export const db = new DatabaseConnection();
