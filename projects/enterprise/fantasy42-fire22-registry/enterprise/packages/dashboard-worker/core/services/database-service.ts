/**
 * Database Service
 * Provides high-level database operations
 */

import { BaseService } from './base-service';
import { Database } from '../../infrastructure/database';

export interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  timeout: number;
  retryAttempts: number;
}

export class DatabaseService extends BaseService {
  private db: Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super('DatabaseService');
    this.config = config;
    this.db = new Database();
  }

  async initialize(): Promise<void> {
    await super.initialize();

    if (!this.validateConfig(this.config)) {
      throw new Error('Invalid database configuration');
    }

    await this.db.connect();
    console.log('Database service initialized successfully');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
    await super.cleanup();
  }

  protected validateConfig(config: DatabaseConfig): boolean {
    return !!(
      config.connectionString &&
      config.poolSize > 0 &&
      config.timeout > 0 &&
      config.retryAttempts >= 0
    );
  }

  // Database operations
  async query(sql: string, params?: any[]): Promise<any[]> {
    return await this.db.query(sql, params);
  }

  async findById(table: string, id: string | number): Promise<any> {
    const results = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return results[0];
  }

  async findAll(table: string, limit: number = 100): Promise<any[]> {
    return await this.query(`SELECT * FROM ${table} LIMIT ?`, [limit]);
  }

  async insert(table: string, data: Record<string, any>): Promise<number> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map(() => '?')
      .join(', ');
    const values = Object.values(data);

    const result = await this.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return result.insertId || 0;
  }

  async update(table: string, id: string | number, data: Record<string, any>): Promise<boolean> {
    const updates = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    const result = await this.query(`UPDATE ${table} SET ${updates} WHERE id = ?`, values);

    return result.affectedRows > 0;
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    const result = await this.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}
