/**
 * 🗄️ Fire22 Dashboard - Base Database Types
 * Foundational types and interfaces for all database entities
 */

import type {
  DatabaseStatus,
  TransactionType,
  WagerStatus,
  BetType,
  CustomerTier,
  RiskLevel,
  AgentLevel,
} from '../../constants';

// === BASE ENTITY INTERFACE ===
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  version?: number;
}

// === AUDIT TRAIL INTERFACE ===
export interface AuditableEntity extends BaseEntity {
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

// === DATABASE CONNECTION TYPES ===
export interface DatabaseConnection {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  transaction<T>(callback: (trx: DatabaseTransaction) => Promise<T>): Promise<T>;
}

export interface DatabaseTransaction {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: FieldInfo[];
  duration?: number;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

// === DATABASE CONFIGURATION ===
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?:
    | boolean
    | {
        rejectUnauthorized?: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      };
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number;
  min?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  logQueries?: boolean;
  migrations?: {
    directory: string;
    tableName: string;
  };
}

// === PAGINATION TYPES ===
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// === SORTING TYPES ===
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: any;
  values?: any[]; // for 'in' and 'between' operators
}

// === SEARCH TYPES ===
export interface SearchParams {
  query?: string;
  filters?: FilterParams[];
  sort?: SortParams[];
  pagination?: PaginationParams;
}

export interface SearchResult<T> extends PaginationResult<T> {
  searchQuery?: string;
  filters?: FilterParams[];
  sort?: SortParams[];
  executionTime?: number;
}

// === MIGRATION TYPES ===
export interface Migration {
  id: string;
  name: string;
  version: string;
  up: string;
  down: string;
  timestamp: string;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migration: Migration;
  error?: string;
  executionTime: number;
  rollbackQuery?: string;
}

export interface MigrationStatus {
  pending: Migration[];
  applied: Migration[];
  current: string | null;
  needsMigration: boolean;
}

// === SEED DATA TYPES ===
export interface SeedData<T = any> {
  table: string;
  data: T[];
  truncate?: boolean;
  onConflict?: 'ignore' | 'replace' | 'update';
  dependencies?: string[];
}

export interface SeedResult {
  table: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  executionTime: number;
}

// === DATABASE HEALTH TYPES ===
export interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  schemaVersion: string;
  tablesCount: number;
  connectionsActive: number;
  connectionsIdle: number;
  lastBackup?: string;
  diskUsage?: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  performance?: {
    slowQueries: number;
    avgQueryTime: number;
    cacheHitRatio: number;
  };
}

// === TABLE METADATA TYPES ===
export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  triggers?: TriggerInfo[];
  statistics?: TableStatistics;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  partial?: string;
  method?: string;
}

export interface ConstraintInfo {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  definition?: string;
}

export interface TriggerInfo {
  name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  definition: string;
  enabled: boolean;
}

export interface TableStatistics {
  rowCount: number;
  size: number;
  indexSize: number;
  lastUpdated: string;
  lastAnalyzed?: string;
  hottest?: {
    reads: number;
    writes: number;
    deletes: number;
  };
}

// === CACHE TYPES ===
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
  maxSize: number;
  evictions: number;
  averageGetTime: number;
  averageSetTime: number;
}

// === ERROR TYPES ===
export interface DatabaseError extends Error {
  code: string;
  severity?: 'ERROR' | 'FATAL' | 'PANIC';
  detail?: string;
  hint?: string;
  position?: string;
  query?: string;
  parameters?: any[];
  table?: string;
  column?: string;
  constraint?: string;
}

// === BACKUP TYPES ===
export interface BackupConfig {
  type: 'full' | 'incremental' | 'differential';
  compression: boolean;
  encryption: boolean;
  destination: string;
  retention: {
    days: number;
    count?: number;
  };
  schedule?: string; // cron expression
}

export interface BackupResult {
  id: string;
  type: BackupConfig['type'];
  startTime: string;
  endTime: string;
  duration: number;
  size: number;
  compressedSize?: number;
  location: string;
  checksum: string;
  status: 'success' | 'failed' | 'partial';
  errors?: string[];
  tablesBackedUp: string[];
}

// === CONNECTION POOL TYPES ===
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  propagateCreateError: boolean;
}

export interface PoolStats {
  size: number;
  available: number;
  borrowed: number;
  invalid: number;
  pending: number;
  max: number;
  min: number;
}

// === UTILITY TYPES ===
export type EntityKey<T> = keyof T;
export type EntityValues<T> = T[keyof T];
export type PartialEntity<T> = Partial<T> & Pick<T, 'id'>;
export type CreateEntity<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateEntity<T> = Partial<Omit<T, 'id' | 'created_at'>> & {
  updated_at?: string;
};

// === REPOSITORY BASE TYPES ===
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(params?: SearchParams): Promise<SearchResult<T>>;
  create(entity: CreateEntity<T>): Promise<T>;
  update(id: string, entity: UpdateEntity<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(filters?: FilterParams[]): Promise<number>;
  exists(id: string): Promise<boolean>;
}

export interface AuditableRepository<T extends AuditableEntity> extends Repository<T> {
  findActive(params?: SearchParams): Promise<SearchResult<T>>;
  findDeleted(params?: SearchParams): Promise<SearchResult<T>>;
  softDelete(id: string, deletedBy: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
}

// Export all types
export type {
  BaseEntity,
  AuditableEntity,
  DatabaseConnection,
  DatabaseTransaction,
  QueryResult,
  FieldInfo,
  DatabaseConfig,
  PaginationParams,
  PaginationResult,
  SortParams,
  FilterParams,
  SearchParams,
  SearchResult,
  Migration,
  MigrationResult,
  MigrationStatus,
  SeedData,
  SeedResult,
  DatabaseHealth,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ConstraintInfo,
  TriggerInfo,
  TableStatistics,
  CacheEntry,
  CacheStats,
  DatabaseError,
  BackupConfig,
  BackupResult,
  PoolConfig,
  PoolStats,
  Repository,
  AuditableRepository,
};
