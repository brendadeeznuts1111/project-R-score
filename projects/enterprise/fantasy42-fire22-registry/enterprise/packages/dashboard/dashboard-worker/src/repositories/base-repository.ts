/**
 * 🗄️ Fire22 Dashboard - Base Repository Pattern
 * Foundation repository implementation with type-safe operations
 */

import type {
  Repository,
  AuditableRepository,
  BaseEntity,
  AuditableEntity,
  DatabaseConnection,
  DatabaseTransaction,
  PaginationParams,
  PaginationResult,
  SortParams,
  FilterParams,
  SearchParams,
  SearchResult,
  QueryResult,
} from '../types/database/base';

import {
  Entity,
  AuditableEntityClass,
  EntityCollection,
  type ValidationResult,
} from '../entities/base';
import { DATABASE, ERROR_MESSAGES } from '../constants';

/**
 * Base repository implementation with CRUD operations
 */
export abstract class BaseRepository<TEntity extends Entity> implements Repository<TEntity> {
  protected tableName: string;
  protected connection: DatabaseConnection;

  constructor(tableName: string, connection: DatabaseConnection) {
    this.tableName = tableName;
    this.connection = connection;
  }

  /**
   * Create entity instance from data
   */
  protected abstract createEntityInstance(data: any): TEntity;

  /**
   * Build WHERE clause from filters
   */
  protected buildWhereClause(filters?: FilterParams[]): { clause: string; params: any[] } {
    if (!filters || filters.length === 0) {
      return { clause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const filter of filters) {
      let condition = '';

      switch (filter.operator) {
        case 'eq':
          condition = `${filter.field} = $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'neq':
          condition = `${filter.field} != $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'gt':
          condition = `${filter.field} > $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'gte':
          condition = `${filter.field} >= $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'lt':
          condition = `${filter.field} < $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'lte':
          condition = `${filter.field} <= $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'like':
          condition = `${filter.field} LIKE $${paramIndex}`;
          params.push(`%${filter.value}%`);
          break;
        case 'in':
          const placeholders = Array.from(
            { length: filter.value.length },
            (_, i) => `$${paramIndex + i}`
          ).join(', ');
          condition = `${filter.field} IN (${placeholders})`;
          params.push(...filter.value);
          paramIndex += filter.value.length - 1;
          break;
        case 'not_in':
          const notPlaceholders = Array.from(
            { length: filter.value.length },
            (_, i) => `$${paramIndex + i}`
          ).join(', ');
          condition = `${filter.field} NOT IN (${notPlaceholders})`;
          params.push(...filter.value);
          paramIndex += filter.value.length - 1;
          break;
        case 'is_null':
          condition = `${filter.field} IS NULL`;
          break;
        case 'is_not_null':
          condition = `${filter.field} IS NOT NULL`;
          break;
        case 'between':
          condition = `${filter.field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
          params.push(filter.value[0], filter.value[1]);
          paramIndex++;
          break;
      }

      if (condition) {
        conditions.push(condition);
        paramIndex++;
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  /**
   * Build ORDER BY clause from sort params
   */
  protected buildOrderByClause(sort?: SortParams[]): string {
    if (!sort || sort.length === 0) {
      return 'ORDER BY created_at DESC';
    }

    const orderBy = sort.map(s => `${s.field} ${s.direction.toUpperCase()}`).join(', ');
    return `ORDER BY ${orderBy}`;
  }

  /**
   * Build LIMIT and OFFSET clause from pagination
   */
  protected buildPaginationClause(pagination?: PaginationParams): {
    clause: string;
    params: any[];
  } {
    if (!pagination) {
      return { clause: '', params: [] };
    }

    const limit = pagination.limit || DATABASE.PAGINATION.DEFAULT_LIMIT;
    const offset = ((pagination.page || 1) - 1) * limit;

    return {
      clause: `LIMIT $1 OFFSET $2`,
      params: [limit, offset],
    };
  }

  /**
   * Execute query and return results
   */
  protected async executeQuery<T = any>(
    query: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    try {
      // This would be implemented with actual database connection
      // For now, returning mock structure
      return {
        rows: [],
        rowCount: 0,
        fields: [],
        command: 'SELECT',
        duration: 0,
      } as QueryResult<T>;
    } catch (error) {
      throw new Error(`Database query failed: ${error}`);
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<TEntity | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`;
    const result = await this.executeQuery(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.createEntityInstance(result.rows[0]);
  }

  /**
   * Find entities with filters, sorting, and pagination
   */
  async find(params?: {
    filters?: FilterParams[];
    sort?: SortParams[];
    pagination?: PaginationParams;
  }): Promise<PaginationResult<TEntity>> {
    const { filters, sort, pagination } = params || {};

    // Build query parts
    const whereClause = this.buildWhereClause([
      ...(filters || []),
      { field: 'deleted_at', operator: 'is_null', value: null },
    ]);

    const orderByClause = this.buildOrderByClause(sort);
    const paginationClause = this.buildPaginationClause(pagination);

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause.clause}`;
    const countResult = await this.executeQuery<{ total: number }>(countQuery, whereClause.params);
    const total = countResult.rows[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause.clause}
      ${orderByClause}
      ${paginationClause.clause}
    `;

    const allParams = [...whereClause.params, ...paginationClause.params];
    const dataResult = await this.executeQuery(dataQuery, allParams);

    const entities = dataResult.rows.map(row => this.createEntityInstance(row));

    const limit = pagination?.limit || DATABASE.PAGINATION.DEFAULT_LIMIT;
    const currentPage = pagination?.page || 1;

    return {
      data: entities,
      total,
      page: currentPage,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: currentPage * limit < total,
      hasPrev: currentPage > 1,
    };
  }

  /**
   * Search entities with text search
   */
  async search(params: SearchParams): Promise<SearchResult<TEntity>> {
    const searchFields = params.fields || ['name', 'description'];
    const searchConditions = searchFields
      .map(field => `${field} ILIKE '%' || $1 || '%'`)
      .join(' OR ');

    const filters: FilterParams[] = [
      ...(params.filters || []),
      { field: 'deleted_at', operator: 'is_null', value: null },
    ];

    // Add search condition to filters
    if (params.query?.trim()) {
      // This would be better implemented with full-text search
      const whereClause = this.buildWhereClause(filters);
      const searchClause = whereClause.clause
        ? `${whereClause.clause} AND (${searchConditions})`
        : `WHERE (${searchConditions})`;

      const query = `
        SELECT * FROM ${this.tableName}
        ${searchClause}
        ${this.buildOrderByClause(params.sort)}
        ${this.buildPaginationClause(params.pagination).clause}
      `;

      const allParams = [
        params.query,
        ...whereClause.params,
        ...this.buildPaginationClause(params.pagination).params,
      ];
      const result = await this.executeQuery(query, allParams);

      const entities = result.rows.map(row => this.createEntityInstance(row));

      return {
        data: entities,
        total: result.rowCount || 0,
        query: params.query,
        filters: params.filters || [],
        executionTime: result.duration || 0,
      };
    }

    // If no search query, fall back to regular find
    const findResult = await this.find({
      filters: params.filters,
      sort: params.sort,
      pagination: params.pagination,
    });

    return {
      data: findResult.data,
      total: findResult.total,
      query: '',
      filters: params.filters || [],
      executionTime: 0,
    };
  }

  /**
   * Create new entity
   */
  async create(entity: TEntity, transaction?: DatabaseTransaction): Promise<TEntity> {
    // Validate entity
    entity.validate();

    // Prepare insert data
    const data = entity.toJSON();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.executeQuery(query, values);

    if (result.rows.length === 0) {
      throw new Error('Failed to create entity');
    }

    return this.createEntityInstance(result.rows[0]);
  }

  /**
   * Update existing entity
   */
  async update(entity: TEntity, transaction?: DatabaseTransaction): Promise<TEntity> {
    // Validate entity
    entity.validate();

    // Touch the entity to update timestamps
    entity.touch();

    const data = entity.toJSON();
    const fields = Object.keys(data).filter(key => key !== 'id');
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const params = [entity.id, ...fields.map(field => data[field])];
    const result = await this.executeQuery(query, params);

    if (result.rows.length === 0) {
      throw new Error('Entity not found or update failed');
    }

    return this.createEntityInstance(result.rows[0]);
  }

  /**
   * Delete entity (hard delete)
   */
  async delete(id: string, transaction?: DatabaseTransaction): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.executeQuery(query, [id]);

    return (result.rowCount || 0) > 0;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL LIMIT 1`;
    const result = await this.executeQuery(query, [id]);

    return result.rows.length > 0;
  }

  /**
   * Count entities
   */
  async count(filters?: FilterParams[]): Promise<number> {
    const whereClause = this.buildWhereClause([
      ...(filters || []),
      { field: 'deleted_at', operator: 'is_null', value: null },
    ]);

    const query = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause.clause}`;
    const result = await this.executeQuery<{ total: number }>(query, whereClause.params);

    return result.rows[0]?.total || 0;
  }

  /**
   * Create multiple entities
   */
  async createMany(entities: TEntity[], transaction?: DatabaseTransaction): Promise<TEntity[]> {
    const results: TEntity[] = [];

    for (const entity of entities) {
      const result = await this.create(entity, transaction);
      results.push(result);
    }

    return results;
  }

  /**
   * Update multiple entities
   */
  async updateMany(entities: TEntity[], transaction?: DatabaseTransaction): Promise<TEntity[]> {
    const results: TEntity[] = [];

    for (const entity of entities) {
      const result = await this.update(entity, transaction);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(ids: string[], transaction?: DatabaseTransaction): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const query = `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`;
    const result = await this.executeQuery(query, ids);

    return result.rowCount || 0;
  }
}

/**
 * Base auditable repository with soft delete support
 */
export abstract class BaseAuditableRepository<TEntity extends AuditableEntityClass>
  extends BaseRepository<TEntity>
  implements AuditableRepository<TEntity>
{
  /**
   * Soft delete entity
   */
  async softDelete(
    id: string,
    deletedBy: string,
    transaction?: DatabaseTransaction
  ): Promise<boolean> {
    const entity = await this.findById(id);
    if (!entity) {
      return false;
    }

    entity.softDelete(deletedBy);
    await this.update(entity, transaction);

    return true;
  }

  /**
   * Restore soft deleted entity
   */
  async restore(id: string, transaction?: DatabaseTransaction): Promise<TEntity | null> {
    // Find entity including soft deleted ones
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.executeQuery(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const entity = this.createEntityInstance(result.rows[0]);
    entity.restore();

    return await this.update(entity, transaction);
  }

  /**
   * Find including soft deleted entities
   */
  async findWithDeleted(params?: {
    filters?: FilterParams[];
    sort?: SortParams[];
    pagination?: PaginationParams;
  }): Promise<PaginationResult<TEntity>> {
    const { filters, sort, pagination } = params || {};

    // Build query parts (without deleted_at filter)
    const whereClause = this.buildWhereClause(filters || []);
    const orderByClause = this.buildOrderByClause(sort);
    const paginationClause = this.buildPaginationClause(pagination);

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause.clause}`;
    const countResult = await this.executeQuery<{ total: number }>(countQuery, whereClause.params);
    const total = countResult.rows[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause.clause}
      ${orderByClause}
      ${paginationClause.clause}
    `;

    const allParams = [...whereClause.params, ...paginationClause.params];
    const dataResult = await this.executeQuery(dataQuery, allParams);

    const entities = dataResult.rows.map(row => this.createEntityInstance(row));

    const limit = pagination?.limit || DATABASE.PAGINATION.DEFAULT_LIMIT;
    const currentPage = pagination?.page || 1;

    return {
      data: entities,
      total,
      page: currentPage,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: currentPage * limit < total,
      hasPrev: currentPage > 1,
    };
  }

  /**
   * Find only soft deleted entities
   */
  async findDeleted(params?: {
    filters?: FilterParams[];
    sort?: SortParams[];
    pagination?: PaginationParams;
  }): Promise<PaginationResult<TEntity>> {
    const { filters = [], sort, pagination } = params || {};

    // Add deleted_at is not null filter
    const deletedFilter: FilterParams = {
      field: 'deleted_at',
      operator: 'is_not_null',
      value: null,
    };

    return await this.findWithDeleted({
      filters: [...filters, deletedFilter],
      sort,
      pagination,
    });
  }

  /**
   * Permanently delete entity (hard delete)
   */
  async forceDelete(id: string, transaction?: DatabaseTransaction): Promise<boolean> {
    return await this.delete(id, transaction);
  }
}

export { BaseRepository, BaseAuditableRepository };
