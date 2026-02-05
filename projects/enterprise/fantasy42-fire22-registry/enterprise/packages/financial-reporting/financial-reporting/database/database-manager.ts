/**
 * Database Manager for Odds Movement Integration
 * Bun.SQL implementation with multi-database support
 */

import { SQL } from 'bun';
import { YAML } from 'bun';

export interface DatabaseConfig {
  adapter: 'sqlite' | 'mysql' | 'postgres';
  hostname?: string;
  username?: string;
  password?: string;
  database: string;
  port?: number;
  ssl?: boolean;
  filename?: string;
}

export class DatabaseManager {
  private connections: Map<string, SQL> = new Map();
  private config: Map<string, DatabaseConfig> = new Map();
  public defaultConnection: SQL | null = null;

  constructor() {
    this.initializeConfigurations();
  }

  /**
   * Initialize database configurations from environment
   */
  private initializeConfigurations(): void {
    const env = Bun.env.NODE_ENV || 'development';
    console.log(`🔧 Initializing database config for environment: ${env}`);

    // Load YAML configuration if available
    let yamlConfig: any = {};
    try {
      const configPath = './src/domains/financial-reporting/config/database.yaml';
      if (Bun.file(configPath).exists()) {
        yamlConfig = YAML.parse(Bun.file(configPath).text());
        console.log(`📄 Loaded YAML config for ${env}:`, yamlConfig[env]);
      } else {
        console.warn('❌ Database YAML config file not found at:', configPath);
      }
    } catch (error) {
      console.warn('❌ Failed to load database YAML config:', error);
    }

    // Force SQLite for demo/development to avoid connection issues
    const forceSQLite =
      !Bun.env.DB_ADAPTER && (!yamlConfig[env] || yamlConfig[env]?.adapter !== 'sqlite');
    if (forceSQLite) {
      console.log('🔄 Forcing SQLite adapter for demo/development environment');
    }

    // Main database configuration
    const mainConfig: DatabaseConfig = {
      adapter: (Bun.env.DB_ADAPTER ||
        (forceSQLite ? 'sqlite' : yamlConfig[env]?.adapter) ||
        'sqlite') as any,
      hostname: Bun.env.DB_HOST || yamlConfig[env]?.hostname || 'localhost',
      username: Bun.env.DB_USER || yamlConfig[env]?.username,
      password: Bun.env.DB_PASS || yamlConfig[env]?.password,
      database:
        Bun.env.DB_NAME ||
        (forceSQLite ? 'odds_movement_demo' : yamlConfig[env]?.database) ||
        'odds_movement',
      port: Bun.env.DB_PORT
        ? parseInt(Bun.env.DB_PORT)
        : yamlConfig[env]?.port || (yamlConfig[env]?.adapter === 'mysql' ? 3306 : 5432),
      ssl: Bun.env.DB_SSL === 'true' || yamlConfig[env]?.ssl || false,
      filename: forceSQLite ? './odds_movement_demo.sqlite' : yamlConfig[env]?.filename,
    };

    console.log(`🎯 Final database config:`, {
      adapter: mainConfig.adapter,
      database: mainConfig.database,
      filename: mainConfig.filename,
    });

    this.config.set('main', mainConfig);

    // Audit database configuration (separate for security)
    const auditConfig: DatabaseConfig = {
      ...mainConfig,
      database:
        Bun.env.AUDIT_DB_NAME || yamlConfig[env]?.audit_database || mainConfig.database + '_audit',
      filename: forceSQLite ? './odds_movement_demo_audit.sqlite' : yamlConfig[env]?.audit_filename,
    };

    this.config.set('audit', auditConfig);
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    try {
      // Initialize main connection
      this.defaultConnection = await this.createConnection('main');
      this.connections.set('main', this.defaultConnection);

      // Initialize audit connection
      const auditConnection = await this.createConnection('audit');
      this.connections.set('audit', auditConnection);

      console.log(`🎯 Database initialized with ${this.config.get('main')?.adapter} adapter`);
      console.log(`📊 Main database: ${this.config.get('main')?.database}`);
      console.log(`🔒 Audit database: ${this.config.get('audit')?.database}`);
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Create a database connection based on configuration
   */
  private async createConnection(name: string): Promise<SQL> {
    const config = this.config.get(name);
    if (!config) {
      throw new Error(`Database configuration for ${name} not found`);
    }

    console.log(`🔌 Creating ${name} database connection with config:`, {
      adapter: config.adapter,
      database: config.database,
      filename: config.filename,
      hostname: config.hostname,
    });

    try {
      let connection: SQL;

      if (config.adapter === 'sqlite') {
        // SQLite connection - use explicit file path
        const dbPath = config.filename || './odds_movement_demo.sqlite';
        console.log(`📁 SQLite path: ${dbPath}`);
        console.log(`📁 Using Bun.SQL with explicit SQLite path`);
        connection = new SQL(dbPath);
      } else if (config.adapter === 'mysql') {
        // MySQL/MariaDB connection
        const url = `mysql://${config.username}:${config.password}@${config.hostname}:${config.port}/${config.database}`;
        console.log(`🔗 MySQL URL: ${url.replace(/:[^:]*@/, ':***@')}`); // Hide password
        connection = new SQL(url);
      } else if (config.adapter === 'postgres') {
        // PostgreSQL connection
        const url = `postgres://${config.username}:${config.password}@${config.hostname}:${config.port}/${config.database}`;
        console.log(`🔗 PostgreSQL URL: ${url.replace(/:[^:]*@/, ':***@')}`); // Hide password
        connection = new SQL(url);
      } else {
        throw new Error(`Unsupported database adapter: ${config.adapter}`);
      }

      // Test the connection
      console.log(`🧪 Testing ${name} database connection...`);
      await connection`SELECT 1 as test`;

      console.log(`✅ ${name} database connection established (${config.adapter})`);
      return connection;
    } catch (error) {
      console.error(`❌ Failed to create ${name} database connection:`, error);
      console.error(`❌ Error details:`, error.message);
      throw error;
    }
  }

  /**
   * Get a database connection by name
   */
  getConnection(name: string = 'main'): SQL {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(
        `Database connection ${name} not found. Available connections: ${Array.from(this.connections.keys()).join(', ')}`
      );
    }
    return connection;
  }

  /**
   * Get the default database connection
   */
  getDefaultConnection(): SQL {
    if (!this.defaultConnection) {
      throw new Error('Default database connection not initialized');
    }
    return this.defaultConnection;
  }

  /**
   * Execute a transaction across multiple connections if needed
   */
  async executeTransaction<T>(
    callback: (connections: { main: SQL; audit: SQL }) => Promise<T>
  ): Promise<T> {
    const mainDb = this.getConnection('main');
    const auditDb = this.getConnection('audit');

    // Begin transactions
    await mainDb`BEGIN`;
    if (mainDb !== auditDb) {
      await auditDb`BEGIN`;
    }

    try {
      const result = await callback({ main: mainDb, audit: auditDb });

      // Commit transactions
      await mainDb`COMMIT`;
      if (mainDb !== auditDb) {
        await auditDb`COMMIT`;
      }

      return result;
    } catch (error) {
      // Rollback transactions
      try {
        await mainDb`ROLLBACK`;
        if (mainDb !== auditDb) {
          await auditDb`ROLLBACK`;
        }
      } catch (rollbackError) {
        console.error('❌ Failed to rollback transaction:', rollbackError);
      }

      throw error;
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    main: { status: string; adapter: string; database: string };
    audit: { status: string; adapter: string; database: string };
  }> {
    const status = {
      main: { status: 'unknown', adapter: 'unknown', database: 'unknown' },
      audit: { status: 'unknown', adapter: 'unknown', database: 'unknown' },
    };

    // Check main connection
    try {
      const mainConfig = this.config.get('main');
      const mainDb = this.getConnection('main');
      await mainDb`SELECT 1 as health_check`;
      status.main = {
        status: 'healthy',
        adapter: mainConfig?.adapter || 'unknown',
        database: mainConfig?.database || 'unknown',
      };
    } catch (error) {
      status.main.status = 'unhealthy';
    }

    // Check audit connection
    try {
      const auditConfig = this.config.get('audit');
      const auditDb = this.getConnection('audit');
      await auditDb`SELECT 1 as health_check`;
      status.audit = {
        status: 'healthy',
        adapter: auditConfig?.adapter || 'unknown',
        database: auditConfig?.database || 'unknown',
      };
    } catch (error) {
      status.audit.status = 'unhealthy';
    }

    return status;
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    for (const [name, connection] of this.connections) {
      try {
        await connection.end();
        console.log(`✅ ${name} database connection closed`);
      } catch (error) {
        console.error(`❌ Failed to close ${name} database connection:`, error);
      }
    }

    this.connections.clear();
    this.defaultConnection = null;
  }

  /**
   * Get current configuration
   */
  getConfig(): { [key: string]: DatabaseConfig } {
    const result: { [key: string]: DatabaseConfig } = {};
    for (const [name, config] of this.config) {
      result[name] = { ...config };
    }
    return result;
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

// Export convenience functions
export const db = () => databaseManager.getDefaultConnection();
export const auditDb = () => databaseManager.getConnection('audit');

// Export without auto-initialization to avoid circular dependencies
// Call databaseManager.initialize() manually when needed
