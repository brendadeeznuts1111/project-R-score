/**
 * Schema Initializer for Odds Movement Integration
 * Multi-database schema initialization with YAML configuration
 */

import { YAML } from 'bun';
import { databaseManager } from './database-manager';
import { SQL } from 'bun';

export interface ColumnDefinition {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  primary?: boolean;
  unique?: boolean;
  indexed?: boolean;
  foreign_key?: string;
  default?: any;
  values?: string[];
}

export interface TableDefinition {
  columns: ColumnDefinition[];
}

export interface IndexDefinition {
  table: string;
  columns: string[];
  name: string;
  unique?: boolean;
}

export interface ViewDefinition {
  query: string;
}

export interface SchemaConfig {
  tables: { [tableName: string]: TableDefinition };
  indexes: IndexDefinition[];
  views: { [viewName: string]: ViewDefinition };
}

export class SchemaInitializer {
  private config: SchemaConfig;
  private db: SQL;
  private adapter: string;

  constructor() {
    this.config = this.loadSchemaConfig();
    // Database connection will be set when initializeSchema is called
    this.db = null as any;
    this.adapter = 'sqlite'; // Default, will be updated during initialization
  }

  /**
   * Load schema configuration from YAML
   */
  private loadSchemaConfig(): SchemaConfig {
    try {
      const configPath = './src/domains/financial-reporting/config/schema.yaml';
      if (!Bun.file(configPath).exists()) {
        console.warn('Schema YAML config not found, using default schema');
        return this.getDefaultSchema();
      }
      const yamlContent = YAML.parse(Bun.file(configPath).text());
      return yamlContent as SchemaConfig;
    } catch (error) {
      console.error('Failed to load schema configuration:', error);
      console.warn('Using default schema configuration');
      return this.getDefaultSchema();
    }
  }

  /**
   * Get default schema configuration when YAML is not available
   */
  private getDefaultSchema(): SchemaConfig {
    return {
      tables: {
        odds_movements: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'event_id', type: 'string', length: 100, indexed: true },
            { name: 'market_id', type: 'string', length: 100, indexed: true },
            {
              name: 'selection_id',
              type: 'string',
              length: 100,
              indexed: true,
            },
            {
              name: 'odds_type',
              type: 'enum',
              values: ['decimal', 'american', 'fractional'],
            },
            { name: 'previous_odds', type: 'decimal', precision: 10, scale: 3 },
            { name: 'current_odds', type: 'decimal', precision: 10, scale: 3 },
            {
              name: 'movement_type',
              type: 'enum',
              values: ['increase', 'decrease', 'no_change'],
            },
            {
              name: 'movement_percentage',
              type: 'decimal',
              precision: 8,
              scale: 4,
            },
            { name: 'timestamp', type: 'timestamp' },
            { name: 'source', type: 'string', length: 100 },
            { name: 'metadata', type: 'json' },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
        bet_timing_analysis: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            {
              name: 'bet_id',
              type: 'string',
              length: 100,
              unique: true,
              indexed: true,
            },
            { name: 'customer_id', type: 'string', length: 100, indexed: true },
            { name: 'event_id', type: 'string', length: 100, indexed: true },
            { name: 'market_id', type: 'string', length: 100, indexed: true },
            {
              name: 'selection_id',
              type: 'string',
              length: 100,
              indexed: true,
            },
            { name: 'bet_amount', type: 'decimal', precision: 18, scale: 2 },
            { name: 'bet_odds', type: 'decimal', precision: 10, scale: 3 },
            { name: 'bet_timestamp', type: 'timestamp', indexed: true },
            {
              name: 'timing_category',
              type: 'enum',
              values: ['early', 'mid', 'late', 'peak'],
            },
            {
              name: 'odds_position',
              type: 'enum',
              values: ['favorable', 'unfavorable', 'neutral'],
            },
            {
              name: 'potential_savings',
              type: 'decimal',
              precision: 18,
              scale: 2,
              default: 0,
            },
            {
              name: 'risk_assessment',
              type: 'enum',
              values: ['low', 'medium', 'high'],
            },
            { name: 'odds_movements_count', type: 'integer', default: 0 },
            { name: 'analysis_timestamp', type: 'timestamp' },
            { name: 'metadata', type: 'json' },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
        events: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'event_name', type: 'string', length: 255 },
            { name: 'start_time', type: 'timestamp', indexed: true },
            { name: 'sport', type: 'string', length: 100 },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
        customers: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'username', type: 'string', length: 100, unique: true },
            { name: 'email', type: 'string', length: 255, unique: true },
            {
              name: 'status',
              type: 'enum',
              values: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
              default: 'ACTIVE',
            },
            { name: 'currency', type: 'string', length: 3, default: 'USD' },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
        accounts: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'account_type', type: 'string', length: 50 },
            {
              name: 'customer_id',
              type: 'uuid',
              foreign_key: 'customers(id)',
              indexed: true,
            },
            {
              name: 'current_balance',
              type: 'decimal',
              precision: 18,
              scale: 2,
              default: 0,
            },
            { name: 'is_active', type: 'boolean', default: true },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
        ledger_entries: {
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            {
              name: 'account_id',
              type: 'uuid',
              foreign_key: 'accounts(id)',
              indexed: true,
            },
            {
              name: 'customer_id',
              type: 'uuid',
              foreign_key: 'customers(id)',
              indexed: true,
            },
            { name: 'amount', type: 'decimal', precision: 18, scale: 2 },
            { name: 'currency', type: 'string', length: 3 },
            {
              name: 'type',
              type: 'enum',
              values: ['BET', 'WIN', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'],
            },
            { name: 'description', type: 'string', length: 500 },
            {
              name: 'reference_id',
              type: 'string',
              length: 100,
              indexed: true,
            },
            {
              name: 'status',
              type: 'enum',
              values: ['pending', 'posted', 'voided'],
              default: 'posted',
            },
            { name: 'entry_date', type: 'date', indexed: true },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        },
      },
      indexes: [
        {
          table: 'odds_movements',
          columns: ['event_id', 'market_id', 'selection_id'],
          name: 'idx_odds_movements_composite',
        },
        {
          table: 'bet_timing_analysis',
          columns: ['customer_id', 'bet_timestamp'],
          name: 'idx_bet_timing_customer_time',
        },
        {
          table: 'ledger_entries',
          columns: ['customer_id', 'entry_date', 'type'],
          name: 'idx_ledger_customer_date_type',
        },
      ],
      views: {
        odds_movement_summary: {
          query: `
            SELECT
              event_id, market_id, selection_id,
              COUNT(*) as total_movements,
              AVG(movement_percentage) as avg_movement_percentage,
              MAX(ABS(movement_percentage)) as max_movement_percentage,
              SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements,
              MIN(timestamp) as first_movement,
              MAX(timestamp) as last_movement,
              COUNT(DISTINCT DATE(timestamp)) as active_days
            FROM odds_movements
            GROUP BY event_id, market_id, selection_id
          `,
        },
        bet_timing_impact: {
          query: `
            SELECT
              bta.*,
              oms.total_movements,
              oms.avg_movement_percentage,
              oms.significant_movements,
              CASE
                WHEN bta.timing_category = 'peak' AND ABS(oms.avg_movement_percentage) > 5 THEN 'high_risk'
                WHEN bta.odds_position = 'unfavorable' AND oms.significant_movements > 3 THEN 'high_risk'
                WHEN bta.potential_savings > bta.bet_amount * 0.1 THEN 'opportunity_missed'
                ELSE 'normal'
              END as risk_category
            FROM bet_timing_analysis bta
            LEFT JOIN odds_movement_summary oms ON
              bta.event_id = oms.event_id AND
              bta.market_id = oms.market_id AND
              bta.selection_id = oms.selection_id
          `,
        },
        odds_movement_financial_impact: {
          query: `
            SELECT
              om.event_id, om.market_id, DATE(om.timestamp) as movement_date,
              COUNT(*) as movements_count, AVG(om.movement_percentage) as avg_movement,
              SUM(bta.potential_savings) as total_potential_savings,
              SUM(CASE WHEN bta.odds_position = 'favorable' THEN bta.potential_savings ELSE 0 END) as favorable_savings,
              SUM(CASE WHEN bta.odds_position = 'unfavorable' THEN bta.potential_savings ELSE 0 END) as unfavorable_cost,
              COUNT(CASE WHEN bta.risk_assessment = 'high' THEN 1 END) as high_risk_bets
            FROM odds_movements om
            LEFT JOIN bet_timing_analysis bta ON
              om.event_id = bta.event_id AND om.market_id = bta.market_id AND om.selection_id = bta.selection_id AND
              DATE(om.timestamp) = DATE(bta.bet_timestamp)
            WHERE bta.bet_timestamp > om.timestamp
            GROUP BY om.event_id, om.market_id, DATE(om.timestamp)
          `,
        },
      },
    };
  }

  /**
   * Initialize the complete database schema
   */
  async initializeSchema(): Promise<void> {
    try {
      // Ensure database manager is initialized
      if (!databaseManager.defaultConnection) {
        await databaseManager.initialize();
      }

      // Set up database connection and adapter
      this.db = databaseManager.getDefaultConnection();
      this.adapter = databaseManager.getConfig().main.adapter;

      console.log(`🏗️ Initializing schema for ${this.adapter} database...`);

      // Create tables
      for (const [tableName, tableDef] of Object.entries(this.config.tables)) {
        await this.createTable(tableName, tableDef);
        console.log(`✅ Created table: ${tableName}`);
      }

      // Create indexes
      for (const indexDef of this.config.indexes) {
        await this.createIndex(indexDef);
        console.log(`✅ Created index: ${indexDef.name}`);
      }

      // Create views
      for (const [viewName, viewDef] of Object.entries(this.config.views)) {
        await this.createView(viewName, viewDef);
        console.log(`✅ Created view: ${viewName}`);
      }

      console.log('🎉 Schema initialization completed successfully');
    } catch (error) {
      console.error('❌ Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a table based on adapter-specific syntax
   */
  private async createTable(tableName: string, tableDef: TableDefinition): Promise<void> {
    const columnDefinitions = tableDef.columns.map(col => this.generateColumnDefinition(col));
    const createTableSQL = this.generateCreateTableSQL(tableName, columnDefinitions);

    await this.db`${createTableSQL}`;
  }

  /**
   * Generate column definition based on adapter
   */
  private generateColumnDefinition(column: ColumnDefinition): string {
    const parts: string[] = [];

    switch (this.adapter) {
      case 'sqlite':
        return this.generateSQLiteColumnDefinition(column);
      case 'mysql':
        return this.generateMySQLColumnDefinition(column);
      case 'postgres':
        return this.generatePostgreSQLColumnDefinition(column);
      default:
        throw new Error(`Unsupported database adapter: ${this.adapter}`);
    }
  }

  /**
   * Generate SQLite column definition
   */
  private generateSQLiteColumnDefinition(column: ColumnDefinition): string {
    const parts: string[] = [column.name];

    switch (column.type) {
      case 'uuid':
        parts.push('TEXT');
        break;
      case 'string':
        parts.push(`TEXT${column.length ? `(${column.length})` : ''}`);
        break;
      case 'integer':
        parts.push('INTEGER');
        break;
      case 'decimal':
        parts.push('REAL');
        break;
      case 'boolean':
        parts.push('INTEGER'); // SQLite uses 0/1 for boolean
        break;
      case 'timestamp':
        parts.push('DATETIME');
        break;
      case 'date':
        parts.push('DATE');
        break;
      case 'json':
        parts.push('TEXT'); // SQLite stores JSON as TEXT
        break;
      case 'enum':
        if (column.values) {
          parts.push(`TEXT CHECK (${column.name} IN ('${column.values.join("','")}'))`);
        } else {
          parts.push('TEXT');
        }
        break;
      default:
        parts.push('TEXT');
    }

    if (column.primary) {
      parts.push('PRIMARY KEY');
    }

    if (column.unique) {
      parts.push('UNIQUE');
    }

    if (column.default !== undefined) {
      if (typeof column.default === 'string' && column.default !== 'CURRENT_TIMESTAMP') {
        parts.push(`DEFAULT '${column.default}'`);
      } else {
        parts.push(`DEFAULT ${column.default}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Generate MySQL column definition
   */
  private generateMySQLColumnDefinition(column: ColumnDefinition): string {
    const parts: string[] = [column.name];

    switch (column.type) {
      case 'uuid':
        parts.push('VARCHAR(36)');
        break;
      case 'string':
        parts.push(`VARCHAR(${column.length || 255})`);
        break;
      case 'integer':
        parts.push('INT');
        break;
      case 'decimal':
        parts.push(`DECIMAL(${column.precision || 10}, ${column.scale || 2})`);
        break;
      case 'boolean':
        parts.push('TINYINT(1)');
        break;
      case 'timestamp':
        parts.push('TIMESTAMP');
        break;
      case 'date':
        parts.push('DATE');
        break;
      case 'json':
        parts.push('JSON');
        break;
      case 'enum':
        if (column.values) {
          parts.push(`ENUM('${column.values.join("','")}')`);
        } else {
          parts.push('VARCHAR(50)');
        }
        break;
      default:
        parts.push('VARCHAR(255)');
    }

    if (column.primary) {
      parts.push('PRIMARY KEY');
    }

    if (column.unique) {
      parts.push('UNIQUE');
    }

    if (column.default !== undefined) {
      if (typeof column.default === 'string' && column.default !== 'CURRENT_TIMESTAMP') {
        parts.push(`DEFAULT '${column.default}'`);
      } else {
        parts.push(`DEFAULT ${column.default}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Generate PostgreSQL column definition
   */
  private generatePostgreSQLColumnDefinition(column: ColumnDefinition): string {
    const parts: string[] = [column.name];

    switch (column.type) {
      case 'uuid':
        parts.push('UUID');
        break;
      case 'string':
        parts.push(`VARCHAR(${column.length || 255})`);
        break;
      case 'integer':
        parts.push('INTEGER');
        break;
      case 'decimal':
        parts.push(`DECIMAL(${column.precision || 10}, ${column.scale || 2})`);
        break;
      case 'boolean':
        parts.push('BOOLEAN');
        break;
      case 'timestamp':
        parts.push('TIMESTAMP WITH TIME ZONE');
        break;
      case 'date':
        parts.push('DATE');
        break;
      case 'json':
        parts.push('JSONB');
        break;
      case 'enum':
        if (column.values) {
          parts.push(`VARCHAR(50) CHECK (${column.name} IN ('${column.values.join("','")}'))`);
        } else {
          parts.push('VARCHAR(50)');
        }
        break;
      default:
        parts.push('VARCHAR(255)');
    }

    if (column.primary) {
      parts.push('PRIMARY KEY');
    }

    if (column.unique) {
      parts.push('UNIQUE');
    }

    if (column.default !== undefined) {
      if (typeof column.default === 'string' && column.default !== 'CURRENT_TIMESTAMP') {
        parts.push(`DEFAULT '${column.default}'`);
      } else {
        parts.push(`DEFAULT ${column.default}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Generate CREATE TABLE SQL based on adapter
   */
  private generateCreateTableSQL(tableName: string, columnDefinitions: string[]): string {
    const columnsSQL = columnDefinitions.join(',\n  ');

    switch (this.adapter) {
      case 'sqlite':
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnsSQL}\n)`;

      case 'mysql':
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnsSQL}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

      case 'postgres':
        return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnsSQL}\n)`;

      default:
        throw new Error(`Unsupported database adapter: ${this.adapter}`);
    }
  }

  /**
   * Create an index
   */
  private async createIndex(indexDef: IndexDefinition): Promise<void> {
    const unique = indexDef.unique ? 'UNIQUE' : '';
    const indexSQL = `CREATE ${unique} INDEX IF NOT EXISTS ${indexDef.name} ON ${indexDef.table} (${indexDef.columns.join(', ')})`;

    await this.db`${indexSQL}`;
  }

  /**
   * Create a view
   */
  private async createView(viewName: string, viewDef: ViewDefinition): Promise<void> {
    const viewSQL = `CREATE VIEW IF NOT EXISTS ${viewName} AS\n${viewDef.query}`;

    await this.db`${viewSQL}`;
  }

  /**
   * Drop all tables, indexes, and views
   */
  async dropSchema(): Promise<void> {
    try {
      console.log('🗑️ Dropping existing schema...');

      // Drop views first
      for (const viewName of Object.keys(this.config.views)) {
        await this.db`DROP VIEW IF EXISTS ${viewName}`;
        console.log(`✅ Dropped view: ${viewName}`);
      }

      // Drop indexes
      for (const indexDef of this.config.indexes) {
        await this.db`DROP INDEX IF EXISTS ${indexDef.name}`;
        console.log(`✅ Dropped index: ${indexDef.name}`);
      }

      // Drop tables
      for (const tableName of Object.keys(this.config.tables)) {
        await this.db`DROP TABLE IF EXISTS ${tableName}`;
        console.log(`✅ Dropped table: ${tableName}`);
      }

      console.log('🎉 Schema dropped successfully');
    } catch (error) {
      console.error('❌ Failed to drop schema:', error);
      throw error;
    }
  }

  /**
   * Recreate the entire schema
   */
  async recreateSchema(): Promise<void> {
    await this.dropSchema();
    await this.initializeSchema();
  }

  /**
   * Get schema information
   */
  async getSchemaInfo(): Promise<{
    tables: string[];
    indexes: string[];
    views: string[];
  }> {
    const tables = Object.keys(this.config.tables);
    const indexes = this.config.indexes.map(idx => idx.name);
    const views = Object.keys(this.config.views);

    return { tables, indexes, views };
  }
}

// Export factory function for lazy initialization
let schemaInitializerInstance: SchemaInitializer | null = null;
export function getSchemaInitializer(): SchemaInitializer {
  if (!schemaInitializerInstance) {
    schemaInitializerInstance = new SchemaInitializer();
  }
  return schemaInitializerInstance;
}

// For backward compatibility - create on demand
export const schemaInitializer = {
  initializeSchema: async () => (await getSchemaInitializer()).initializeSchema(),
  dropSchema: async () => (await getSchemaInitializer()).dropSchema(),
  recreateSchema: async () => (await getSchemaInitializer()).recreateSchema(),
  getSchemaInfo: async () => (await getSchemaInitializer()).getSchemaInfo(),
};

// Export convenience functions
export async function initializeDatabaseSchema(): Promise<void> {
  await schemaInitializer.initializeSchema();
}

export async function recreateDatabaseSchema(): Promise<void> {
  await schemaInitializer.recreateSchema();
}
