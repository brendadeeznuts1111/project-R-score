/**
 * 🗄️ Fire22 Dashboard - Database Types Index
 * Unified exports for all database types and interfaces
 */

// Base types
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
  EntityKey,
  EntityValues,
  PartialEntity,
  CreateEntity,
  UpdateEntity,
} from './base';

// Core entity types
export type {
  Customer,
  CustomerProfile,
  BettingPattern,
  Agent,
  AgentHierarchy,
  Transaction,
  Wager,
  WagerLeg,
  SportEvent,
  BettingMarket,
  BettingLine,
  Activity,
  SystemConfig,
  AuditLog,
  Notification,
  Report,
} from './entities';

// Workspace-specific types
export {
  CoreDashboard,
  SportsBetting,
  TelegramIntegration,
  APIClient,
  SecurityRegistry,
  PatternSystem,
  BuildSystem,
} from './workspaces';

// Re-export constants types for convenience
export type {
  DatabaseStatus,
  TransactionType,
  WagerStatus,
  BetType,
  SportType,
  EventStatus,
  CustomerTier,
  RiskLevel,
  AgentLevel,
} from '../../constants';

// === UTILITY TYPES ===

/**
 * Extract all entity types from the database schema
 */
export type DatabaseEntity =
  | Customer
  | Agent
  | Transaction
  | Wager
  | SportEvent
  | BettingMarket
  | BettingLine
  | Activity
  | SystemConfig
  | AuditLog
  | Notification
  | Report;

/**
 * Extract all auditable entity types
 */
export type AuditableDatabaseEntity =
  | Customer
  | Agent
  | Transaction
  | Wager
  | SportEvent
  | BettingMarket
  | BettingLine
  | SystemConfig
  | Report;

/**
 * Type-safe entity name mapping
 */
export type EntityName = {
  customer: Customer;
  agent: Agent;
  transaction: Transaction;
  wager: Wager;
  sport_event: SportEvent;
  betting_market: BettingMarket;
  betting_line: BettingLine;
  activity: Activity;
  system_config: SystemConfig;
  audit_log: AuditLog;
  notification: Notification;
  report: Report;
};

/**
 * Repository type mapping
 */
export type EntityRepository<T extends keyof EntityName> = Repository<EntityName[T]>;

/**
 * Create input type for each entity
 */
export type CreateEntityInput<T extends keyof EntityName> = CreateEntity<EntityName[T]>;

/**
 * Update input type for each entity
 */
export type UpdateEntityInput<T extends keyof EntityName> = UpdateEntity<EntityName[T]>;

/**
 * Search params for each entity type
 */
export type EntitySearchParams<T extends keyof EntityName> = SearchParams & {
  entity_specific?: Partial<EntityName[T]>;
};

/**
 * Search result for each entity type
 */
export type EntitySearchResult<T extends keyof EntityName> = SearchResult<EntityName[T]>;

// === DATABASE SCHEMA TYPES ===

/**
 * Complete database schema definition
 */
export interface DatabaseSchema {
  version: string;
  tables: {
    customers: Customer;
    agents: Agent;
    transactions: Transaction;
    wagers: Wager;
    sport_events: SportEvent;
    betting_markets: BettingMarket;
    betting_lines: BettingLine;
    activities: Activity;
    system_configs: SystemConfig;
    audit_logs: AuditLog;
    notifications: Notification;
    reports: Report;
  };
  relationships: {
    customer_agent: {
      from: 'customers';
      to: 'agents';
      type: 'many_to_one';
      foreign_key: 'agent_id';
    };
    transaction_customer: {
      from: 'transactions';
      to: 'customers';
      type: 'many_to_one';
      foreign_key: 'customer_id';
    };
    wager_customer: {
      from: 'wagers';
      to: 'customers';
      type: 'many_to_one';
      foreign_key: 'customer_id';
    };
    wager_event: {
      from: 'wagers';
      to: 'sport_events';
      type: 'many_to_one';
      foreign_key: 'event_id';
    };
    market_event: {
      from: 'betting_markets';
      to: 'sport_events';
      type: 'many_to_one';
      foreign_key: 'event_id';
    };
    line_market: {
      from: 'betting_lines';
      to: 'betting_markets';
      type: 'many_to_one';
      foreign_key: 'market_id';
    };
  };
  indexes: string[];
  constraints: string[];
  triggers: string[];
}

/**
 * Database operations interface
 */
export interface DatabaseOperations {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Transaction management
  beginTransaction(): Promise<DatabaseTransaction>;
  commitTransaction(transaction: DatabaseTransaction): Promise<void>;
  rollbackTransaction(transaction: DatabaseTransaction): Promise<void>;

  // Schema management
  getMigrationStatus(): Promise<MigrationStatus>;
  runMigrations(): Promise<MigrationResult[]>;
  rollbackMigration(version: string): Promise<MigrationResult>;

  // Health and monitoring
  getHealth(): Promise<DatabaseHealth>;
  getStats(): Promise<TableStatistics[]>;

  // Backup and restore
  createBackup(config: BackupConfig): Promise<BackupResult>;
  restoreBackup(backupId: string): Promise<boolean>;

  // Generic entity operations
  findEntity<T extends keyof EntityName>(entityName: T, id: string): Promise<EntityName[T] | null>;

  findEntities<T extends keyof EntityName>(
    entityName: T,
    params?: EntitySearchParams<T>
  ): Promise<EntitySearchResult<T>>;

  createEntity<T extends keyof EntityName>(
    entityName: T,
    data: CreateEntityInput<T>
  ): Promise<EntityName[T]>;

  updateEntity<T extends keyof EntityName>(
    entityName: T,
    id: string,
    data: UpdateEntityInput<T>
  ): Promise<EntityName[T]>;

  deleteEntity<T extends keyof EntityName>(entityName: T, id: string): Promise<boolean>;

  countEntities<T extends keyof EntityName>(
    entityName: T,
    filters?: FilterParams[]
  ): Promise<number>;

  existsEntity<T extends keyof EntityName>(entityName: T, id: string): Promise<boolean>;
}

// === WORKSPACE TYPE MAPPINGS ===

/**
 * Workspace entity type mapping
 */
export interface WorkspaceEntities {
  '@fire22-core-dashboard': {
    dashboard_config: CoreDashboard.DashboardConfig;
    widget: CoreDashboard.Widget;
    kpi: CoreDashboard.KPI;
  };
  '@fire22-sports-betting': {
    odds_movement: SportsBetting.OddsMovement;
    betting_limit: SportsBetting.BettingLimit;
    risk_exposure: SportsBetting.RiskExposure;
    live_odds: SportsBetting.LiveOdds;
    prop_bet: SportsBetting.PropBet;
  };
  '@fire22-telegram-integration': {
    telegram_user: TelegramIntegration.TelegramUser;
    telegram_message: TelegramIntegration.TelegramMessage;
    telegram_bot: TelegramIntegration.TelegramBot;
    queue_item: TelegramIntegration.QueueItem;
    p2p_transaction: TelegramIntegration.P2PTransaction;
  };
  '@fire22-api-consolidated': {
    api_key: APIClient.APIKey;
    api_request: APIClient.APIRequest;
    api_endpoint: APIClient.APIEndpoint;
    webhook: APIClient.Webhook;
  };
  '@fire22-security-registry': {
    security_scan: SecurityRegistry.SecurityScan;
    threat_intelligence: SecurityRegistry.ThreatIntelligence;
    compliance_rule: SecurityRegistry.ComplianceRule;
    security_incident: SecurityRegistry.SecurityIncident;
  };
  '@fire22-pattern-system': {
    pattern: PatternSystem.Pattern;
    pattern_connection: PatternSystem.PatternConnection;
    pattern_execution: PatternSystem.PatternExecution;
  };
  '@fire22-build-system': {
    build_job: BuildSystem.BuildJob;
    deployment: BuildSystem.Deployment;
  };
}

/**
 * Get workspace entity types
 */
export type WorkspaceEntityTypes<T extends keyof WorkspaceEntities> = WorkspaceEntities[T];

/**
 * Get all workspace entity names
 */
export type AllWorkspaceEntities = {
  [K in keyof WorkspaceEntities]: WorkspaceEntities[K];
}[keyof WorkspaceEntities];

// Default export with all types
export default {
  // Base types
  BaseEntity,
  AuditableEntity,
  DatabaseConnection,
  DatabaseTransaction,
  QueryResult,
  DatabaseConfig,
  PaginationResult,
  SearchResult,

  // Entity types
  Customer,
  Agent,
  Transaction,
  Wager,
  SportEvent,
  BettingMarket,
  BettingLine,
  Activity,
  SystemConfig,
  AuditLog,
  Notification,
  Report,

  // Workspace types
  CoreDashboard,
  SportsBetting,
  TelegramIntegration,
  APIClient,
  SecurityRegistry,
  PatternSystem,
  BuildSystem,
};
