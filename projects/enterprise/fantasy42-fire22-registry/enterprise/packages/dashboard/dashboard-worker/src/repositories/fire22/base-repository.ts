/**
 * 🏈 Fire22 Base Repository
 * Foundation repository class for Fire22 entity data access
 */

import type { DatabaseConnection } from '../../types/database/base';
import { databaseService } from '../../services/database/connection';

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SearchOptions {
  filters?: Record<string, any>;
  search?: string;
  searchFields?: string[];
}

export interface QueryOptions extends PaginationOptions, SearchOptions {}

/**
 * Base repository class with common CRUD operations
 */
export abstract class Fire22BaseRepository<T extends { id?: string | number }> {
  protected db: DatabaseConnection;
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, database?: DatabaseConnection) {
    this.tableName = tableName;
    this.db = database || databaseService.getDatabase();
  }

  // !== CORE CRUD OPERATIONS !==

  /**
   * Find entity by ID
   */
  public async findById(id: string | number): Promise<RepositoryResult<T>> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = (await this.db.prepare(query).bind(id).first()) as T;

      return {
        success: true,
        data: result || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to find ${this.tableName} by ID: ${error.message}`,
      };
    }
  }

  /**
   * Find all entities with optional filtering and pagination
   */
  public async findAll(options: QueryOptions = {}): Promise<RepositoryResult<T[]>> {
    try {
      const { query, params } = this.buildSelectQuery(options);
      const results = (await this.db
        .prepare(query)
        .bind(...params)
        .all()) as T[];

      // Get total count if pagination is used
      let count: number | undefined;
      if (options.page !== undefined || options.limit !== undefined) {
        const countQuery = this.buildCountQuery(options);
        const countResult = (await this.db
          .prepare(countQuery.query)
          .bind(...countQuery.params)
          .first()) as { count: number };
        count = countResult?.count || 0;
      }

      return {
        success: true,
        data: results,
        count,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to find ${this.tableName}: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Find one entity by criteria
   */
  public async findOne(criteria: Record<string, any>): Promise<RepositoryResult<T>> {
    try {
      const { query, params } = this.buildSelectQuery({
        filters: criteria,
        limit: 1,
      });

      const result = (await this.db
        .prepare(query)
        .bind(...params)
        .first()) as T;

      return {
        success: true,
        data: result || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to find one ${this.tableName}: ${error.message}`,
      };
    }
  }

  /**
   * Create new entity
   */
  public async create(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RepositoryResult<T>> {
    try {
      const now = new Date().toISOString();
      const entityData = {
        ...data,
        created_at: now,
        updated_at: now,
      } as any;

      const fields = Object.keys(entityData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => entityData[field]);

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = (await this.db
        .prepare(query)
        .bind(...values)
        .first()) as T;

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create ${this.tableName}: ${error.message}`,
      };
    }
  }

  /**
   * Update entity by ID
   */
  public async update(
    id: string | number,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<RepositoryResult<T>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const fields = Object.keys(updateData);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => updateData[field]);

      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}
        WHERE ${this.primaryKey} = ?
        RETURNING *
      `;

      const result = (await this.db
        .prepare(query)
        .bind(...values, id)
        .first()) as T;

      if (!result) {
        return {
          success: false,
          error: `${this.tableName} with ID ${id} not found`,
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update ${this.tableName}: ${error.message}`,
      };
    }
  }

  /**
   * Delete entity by ID
   */
  public async delete(id: string | number): Promise<RepositoryResult<boolean>> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = await this.db.prepare(query).bind(id).run();

      return {
        success: result.changes > 0,
        data: result.changes > 0,
        error: result.changes === 0 ? `${this.tableName} with ID ${id} not found` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete ${this.tableName}: ${error.message}`,
        data: false,
      };
    }
  }

  /**
   * Soft delete entity (if supported)
   */
  public async softDelete(id: string | number): Promise<RepositoryResult<T>> {
    try {
      return await this.update(id, {
        deleted_at: new Date().toISOString(),
        is_deleted: true,
      } as any);
    } catch (error) {
      return {
        success: false,
        error: `Failed to soft delete ${this.tableName}: ${error.message}`,
      };
    }
  }

  /**
   * Count entities with optional filtering
   */
  public async count(filters: Record<string, any> = {}): Promise<RepositoryResult<number>> {
    try {
      const { query, params } = this.buildCountQuery({ filters });
      const result = (await this.db
        .prepare(query)
        .bind(...params)
        .first()) as { count: number };

      return {
        success: true,
        data: result?.count || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to count ${this.tableName}: ${error.message}`,
        data: 0,
      };
    }
  }

  /**
   * Check if entity exists
   */
  public async exists(criteria: Record<string, any>): Promise<RepositoryResult<boolean>> {
    try {
      const countResult = await this.count(criteria);

      if (!countResult.success) {
        return countResult as RepositoryResult<boolean>;
      }

      return {
        success: true,
        data: (countResult.data || 0) > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check existence in ${this.tableName}: ${error.message}`,
        data: false,
      };
    }
  }

  // !== BATCH OPERATIONS !==

  /**
   * Create multiple entities in a transaction
   */
  public async createMany(
    entities: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<RepositoryResult<T[]>> {
    try {
      const results: T[] = [];
      const now = new Date().toISOString();

      // Begin transaction
      await this.db.exec('BEGIN TRANSACTION');

      try {
        for (const entityData of entities) {
          const data = {
            ...entityData,
            created_at: now,
            updated_at: now,
          } as any;

          const fields = Object.keys(data);
          const placeholders = fields.map(() => '?').join(', ');
          const values = fields.map(field => data[field]);

          const query = `
            INSERT INTO ${this.tableName} (${fields.join(', ')})
            VALUES (${placeholders})
            RETURNING *
          `;

          const result = (await this.db
            .prepare(query)
            .bind(...values)
            .first()) as T;
          results.push(result);
        }

        await this.db.exec('COMMIT');

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create multiple ${this.tableName}: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Update multiple entities by IDs
   */
  public async updateMany(
    ids: Array<string | number>,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<RepositoryResult<T[]>> {
    try {
      const results: T[] = [];

      // Begin transaction
      await this.db.exec('BEGIN TRANSACTION');

      try {
        for (const id of ids) {
          const updateResult = await this.update(id, data);
          if (updateResult.success && updateResult.data) {
            results.push(updateResult.data);
          }
        }

        await this.db.exec('COMMIT');

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update multiple ${this.tableName}: ${error.message}`,
        data: [],
      };
    }
  }

  // !== QUERY BUILDING HELPERS !==

  /**
   * Build SELECT query with options
   */
  protected buildSelectQuery(options: QueryOptions = {}): { query: string; params: any[] } {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    // Add WHERE clause
    const whereClause = this.buildWhereClause(
      options.filters,
      options.search,
      options.searchFields
    );
    if (whereClause.clause) {
      query += ` WHERE ${whereClause.clause}`;
      params.push(...whereClause.params);
    }

    // Add ORDER BY clause
    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'ASC';
      query += ` ORDER BY ${options.sortBy} ${sortOrder}`;
    }

    // Add LIMIT and OFFSET for pagination
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;

      if (options.page && options.page > 1) {
        const offset = (options.page - 1) * options.limit;
        query += ` OFFSET ${offset}`;
      }
    }

    return { query, params };
  }

  /**
   * Build COUNT query with options
   */
  protected buildCountQuery(options: {
    filters?: Record<string, any>;
    search?: string;
    searchFields?: string[];
  }): { query: string; params: any[] } {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    const whereClause = this.buildWhereClause(
      options.filters,
      options.search,
      options.searchFields
    );
    if (whereClause.clause) {
      query += ` WHERE ${whereClause.clause}`;
      params.push(...whereClause.params);
    }

    return { query, params };
  }

  /**
   * Build WHERE clause
   */
  protected buildWhereClause(
    filters?: Record<string, any>,
    search?: string,
    searchFields?: string[]
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Add filter conditions
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            const placeholders = value.map(() => '?').join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            params.push(...value);
          } else {
            conditions.push(`${key} = ?`);
            params.push(value);
          }
        }
      }
    }

    // Add search condition
    if (search && searchFields && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => `${field} LIKE ?`).join(' OR ');
      conditions.push(`(${searchConditions})`);
      searchFields.forEach(() => params.push(`%${search}%`));
    }

    // Add soft delete filter (exclude deleted items by default)
    conditions.push('(deleted_at IS NULL OR deleted_at = "")');

    return {
      clause: conditions.join(' AND '),
      params,
    };
  }

  // !== UTILITY METHODS !==

  /**
   * Execute custom query
   */
  protected async executeQuery<R = any>(
    query: string,
    params: any[] = []
  ): Promise<RepositoryResult<R[]>> {
    try {
      const results = (await this.db
        .prepare(query)
        .bind(...params)
        .all()) as R[];

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: `Query execution failed: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Execute custom single result query
   */
  protected async executeQuerySingle<R = any>(
    query: string,
    params: any[] = []
  ): Promise<RepositoryResult<R>> {
    try {
      const result = (await this.db
        .prepare(query)
        .bind(...params)
        .first()) as R;

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Query execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Begin transaction
   */
  public async beginTransaction(): Promise<void> {
    await this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  public async commitTransaction(): Promise<void> {
    await this.db.exec('COMMIT');
  }

  /**
   * Rollback transaction
   */
  public async rollbackTransaction(): Promise<void> {
    await this.db.exec('ROLLBACK');
  }

  /**
   * Get table name
   */
  public getTableName(): string {
    return this.tableName;
  }

  /**
   * Get primary key field name
   */
  public getPrimaryKey(): string {
    return this.primaryKey;
  }
}
