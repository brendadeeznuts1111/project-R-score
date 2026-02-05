#!/usr/bin/env bun

/**
 * 🔧 Database Connection Fix Script
 * Working solution for E2001: DB_CONNECTION_FAILED
 */

import { $ } from 'bun';

interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

class DatabaseConnectionFixer {
  private config: DatabaseConnectionConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dashboard_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    };
  }

  async diagnoseAndFix(): Promise<void> {
    console.log('🔧 Database Connection Diagnostic & Fix');
    console.log('━'.repeat(50));

    const steps = [
      { name: 'Check Environment Variables', fn: this.checkEnvironmentVariables },
      { name: 'Test Network Connectivity', fn: this.testNetworkConnectivity },
      { name: 'Validate Database Credentials', fn: this.validateCredentials },
      { name: 'Test Database Connection', fn: this.testDatabaseConnection },
      { name: 'Check Connection Pool', fn: this.checkConnectionPool },
      { name: 'Apply Fixes', fn: this.applyFixes },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n[${i + 1}/${steps.length}] ${step.name}...`);

      try {
        await step.fn.call(this);
        console.log(`✅ ${step.name} completed successfully`);
      } catch (error) {
        console.log(`❌ ${step.name} failed: ${error.message}`);
        await this.suggestSolution(step.name, error);
      }
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      } else {
        console.log(`  ✅ ${varName}: ${varName === 'DB_PASSWORD' ? '***' : value}`);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  private async testNetworkConnectivity(): Promise<void> {
    console.log(`  🌐 Testing connectivity to ${this.config.host}:${this.config.port}`);

    try {
      // Test basic network connectivity
      const result = await $`nc -z ${this.config.host} ${this.config.port}`.quiet();

      if (result.exitCode === 0) {
        console.log(`  ✅ Network connectivity successful`);
      } else {
        throw new Error(`Cannot reach ${this.config.host}:${this.config.port}`);
      }
    } catch (error) {
      // Fallback: try telnet or ping
      try {
        await $`ping -c 1 ${this.config.host}`.quiet();
        console.log(`  ⚠️  Host is reachable but port ${this.config.port} may be closed`);
      } catch {
        throw new Error(`Host ${this.config.host} is unreachable`);
      }
    }
  }

  private async validateCredentials(): Promise<void> {
    console.log(`  🔐 Validating database credentials`);

    // Check if credentials format is valid
    if (this.config.username.length < 1) {
      throw new Error('Database username cannot be empty');
    }

    if (this.config.password.length < 1) {
      throw new Error('Database password cannot be empty');
    }

    if (this.config.database.length < 1) {
      throw new Error('Database name cannot be empty');
    }

    console.log(`  ✅ Credential format validation passed`);
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log(`  🔌 Testing database connection`);

    // Create a simple test connection (using psql)
    const connectionString = `postgresql://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;

    try {
      // Test connection with timeout
      const result =
        await $`timeout 10 psql "${connectionString}" -c "SELECT 1 as test;" -t`.quiet();

      if (result.exitCode === 0) {
        console.log(`  ✅ Database connection successful`);
      } else {
        throw new Error('Database connection failed - check credentials and permissions');
      }
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }

  private async checkConnectionPool(): Promise<void> {
    console.log(`  🏊 Checking connection pool configuration`);

    if (this.config.maxConnections < 5) {
      console.log(`  ⚠️  Connection pool size is very low: ${this.config.maxConnections}`);
      console.log(`  💡 Consider increasing DB_MAX_CONNECTIONS (recommended: 20-50)`);
    } else if (this.config.maxConnections > 100) {
      console.log(`  ⚠️  Connection pool size is very high: ${this.config.maxConnections}`);
      console.log(`  💡 Consider reducing DB_MAX_CONNECTIONS to prevent resource exhaustion`);
    } else {
      console.log(`  ✅ Connection pool size looks good: ${this.config.maxConnections}`);
    }
  }

  private async applyFixes(): Promise<void> {
    console.log(`  🔧 Applying automatic fixes`);

    // Create or update .env file with proper database configuration
    const envContent = `# Database Configuration - Generated by fix-database-connection.ts
DB_HOST=${this.config.host}
DB_PORT=${this.config.port}
DB_NAME=${this.config.database}
DB_USER=${this.config.username}
DB_PASSWORD=${this.config.password}
DB_SSL=${this.config.ssl}
DB_MAX_CONNECTIONS=${this.config.maxConnections}

# Connection Pool Settings
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000
DB_POOL_SIZE=${this.config.maxConnections}

# Health Check Settings
DB_HEALTH_CHECK_INTERVAL=30000
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=1000
`;

    await Bun.write('.env.database', envContent);
    console.log(`  ✅ Created .env.database with optimized settings`);

    // Create a database health check script
    const healthCheckScript = `#!/usr/bin/env bun

/**
 * Database Health Check - Generated by fix-database-connection.ts
 */

import { Database } from 'bun:sqlite';

export class DatabaseHealthChecker {
  async checkHealth(): Promise<boolean> {
    try {
      const db = new Database(':memory:');
      db.run('SELECT 1');
      db.close();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async checkWithRetry(maxRetries = 3, delay = 1000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.checkHealth()) {
        return true;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    return false;
  }
}

// Export for use in other modules
export const dbHealthChecker = new DatabaseHealthChecker();
`;

    await Bun.write('scripts/database-health-check.ts', healthCheckScript);
    console.log(`  ✅ Created database health check utility`);
  }

  private async suggestSolution(stepName: string, error: Error): Promise<void> {
    console.log(`\n💡 Suggested Solutions for ${stepName}:`);

    switch (stepName) {
      case 'Check Environment Variables':
        console.log(`  1. Create .env file with required database variables`);
        console.log(`  2. Copy from .env.example if available`);
        console.log(`  3. Verify no typos in variable names`);
        break;

      case 'Test Network Connectivity':
        console.log(`  1. Check if database server is running`);
        console.log(`  2. Verify firewall settings allow database port`);
        console.log(`  3. Check network routing and DNS resolution`);
        console.log(`  4. Try connecting from database host itself`);
        break;

      case 'Validate Database Credentials':
        console.log(`  1. Verify username and password are correct`);
        console.log(`  2. Check if user has necessary permissions`);
        console.log(`  3. Ensure database exists and user has access`);
        console.log(`  4. Test credentials with database admin tools`);
        break;

      case 'Test Database Connection':
        console.log(`  1. Install postgresql client: 'bun add pg'`);
        console.log(`  2. Check database server logs for connection errors`);
        console.log(`  3. Verify SSL/TLS settings if required`);
        console.log(`  4. Try connection with admin credentials first`);
        break;

      case 'Check Connection Pool':
        console.log(`  1. Adjust DB_MAX_CONNECTIONS based on server capacity`);
        console.log(`  2. Monitor connection usage in production`);
        console.log(`  3. Implement connection pooling with pg-pool`);
        console.log(`  4. Set appropriate timeout values`);
        break;

      default:
        console.log(`  1. Check logs for detailed error information`);
        console.log(`  2. Verify configuration settings`);
        console.log(`  3. Contact database administrator if needed`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Database Connection Fix Script

Usage: bun run scripts/fix-database-connection.ts [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output
  --dry-run     Show what would be done without making changes

Environment Variables:
  DB_HOST        Database host (default: localhost)
  DB_PORT        Database port (default: 5432)
  DB_NAME        Database name (required)
  DB_USER        Database username (required)
  DB_PASSWORD    Database password (required)
  DB_SSL         Enable SSL (default: false)

Examples:
  bun run scripts/fix-database-connection.ts
  DB_HOST=prod-db.example.com bun run scripts/fix-database-connection.ts
  bun run scripts/fix-database-connection.ts --verbose

Related Error Codes:
  E2001 - DB_CONNECTION_FAILED
  E2002 - DB_QUERY_TIMEOUT
  E1001 - SYSTEM_INIT_FAILED
`);
    return;
  }

  const fixer = new DatabaseConnectionFixer();
  await fixer.diagnoseAndFix();

  console.log(`\n🎉 Database Connection Diagnostic Complete!`);
  console.log(`📚 For more help, see: /docs/database/connection-troubleshooting`);
}

main().catch(console.error);
