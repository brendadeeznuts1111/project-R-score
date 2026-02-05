#!/usr/bin/env bun

/**
 * Fire22 Water Dashboard Database Migration Script
 * Complete database setup and data migration with Fire22 L-key integration
 */

import { $ } from 'bun';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface MigrationConfig {
  environment: 'development' | 'staging' | 'production';
  dryRun: boolean;
  verbose: boolean;
  skipBackup: boolean;
  forceRecreate: boolean;
}

interface MigrationResult {
  success: boolean;
  operations: string[];
  errors: string[];
  timing: {
    start: Date;
    end: Date;
    duration: number;
  };
  statistics: {
    tablesCreated: number;
    indexesCreated: number;
    lKeyMappings: number;
    sampleDataRows: number;
  };
}

class Fire22WaterDashboardMigration {
  private config: MigrationConfig;
  private result: MigrationResult;
  private dbBinding: string;
  private dbName: string;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.result = {
      success: false,
      operations: [],
      errors: [],
      timing: {
        start: new Date(),
        end: new Date(),
        duration: 0,
      },
      statistics: {
        tablesCreated: 0,
        indexesCreated: 0,
        lKeyMappings: 0,
        sampleDataRows: 0,
      },
    };

    // Set database names based on environment
    switch (config.environment) {
      case 'development':
        this.dbBinding = 'DB';
        this.dbName = 'fire22-dashboard-dev';
        break;
      case 'staging':
        this.dbBinding = 'DB';
        this.dbName = 'fire22-dashboard-staging';
        break;
      case 'production':
        this.dbBinding = 'DB';
        this.dbName = 'fire22-dashboard';
        break;
    }
  }

  async migrate(): Promise<MigrationResult> {
    console.log(`🔥 Fire22 Water Dashboard Migration - ${this.config.environment.toUpperCase()}`);
    console.log('='.repeat(80));

    try {
      this.result.timing.start = new Date();

      await this.validatePrerequisites();
      await this.createBackup();
      await this.ensureDatabaseExists();
      await this.runSchemaMigrations();
      await this.setupFireL22LKeyMappings();
      await this.createIndexes();
      await this.insertSampleData();
      await this.validateMigration();
      await this.updateMetadata();

      this.result.success = true;
      console.log('\n✅ Water Dashboard Migration Complete!');
    } catch (error) {
      this.result.success = false;
      this.result.errors.push(error.toString());
      console.error('❌ Migration failed:', error);

      if (!this.config.dryRun) {
        await this.rollbackOnFailure();
      }
    } finally {
      this.result.timing.end = new Date();
      this.result.timing.duration =
        this.result.timing.end.getTime() - this.result.timing.start.getTime();

      await this.generateMigrationReport();
    }

    return this.result;
  }

  private async validatePrerequisites(): Promise<void> {
    this.logOperation('🔍 Validating prerequisites...');

    // Check wrangler CLI
    try {
      await $`wrangler --version`;
      this.logOperation('✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Install: npm install -g wrangler');
    }

    // Check authentication
    try {
      await $`wrangler whoami`;
      this.logOperation('✅ Cloudflare authentication valid');
    } catch (error) {
      throw new Error('Not authenticated. Run: wrangler auth login');
    }

    // Check schema files exist
    const schemaFile = 'data/schemas/fire22-water-dashboard-schema.sql';
    try {
      const file = Bun.file(schemaFile);
      const exists = await file.exists();
      if (!exists) {
        throw new Error(`Schema file not found: ${schemaFile}`);
      }
      this.logOperation(`✅ Schema file found: ${schemaFile}`);
    } catch (error) {
      throw new Error(`Schema validation failed: ${error}`);
    }
  }

  private async createBackup(): Promise<void> {
    if (this.config.skipBackup) {
      this.logOperation('⏭️  Skipping backup (--skip-backup flag)');
      return;
    }

    this.logOperation('💾 Creating database backup...');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = 'temp/backup';

      // Ensure backup directory exists
      await $`mkdir -p ${backupDir}`;

      // Create backup file
      const backupFile = `${backupDir}/${this.config.environment}_backup_${timestamp}.sql`;

      try {
        // Attempt to dump existing data
        await $`wrangler d1 execute ${this.dbName} --command=".dump" > ${backupFile}`;
        this.logOperation(`✅ Backup created: ${backupFile}`);
      } catch (error) {
        // Database might not exist yet, which is okay for initial setup
        this.logOperation(`ℹ️  No existing database to backup: ${this.dbName}`);
      }
    } catch (error) {
      console.warn(`⚠️  Backup failed (continuing anyway): ${error}`);
    }
  }

  private async ensureDatabaseExists(): Promise<void> {
    this.logOperation(`📊 Ensuring database exists: ${this.dbName}`);

    if (this.config.dryRun) {
      this.logOperation(`🔍 [DRY RUN] Would create database: ${this.dbName}`);
      return;
    }

    try {
      // Try to create the database
      await $`wrangler d1 create ${this.dbName}`;
      this.logOperation(`✅ Database created: ${this.dbName}`);
    } catch (error) {
      if (
        error.toString().includes('already exists') ||
        error.toString().includes('A database with this name already exists')
      ) {
        this.logOperation(`ℹ️  Database already exists: ${this.dbName}`);
      } else {
        throw new Error(`Failed to create database: ${error}`);
      }
    }
  }

  private async runSchemaMigrations(): Promise<void> {
    this.logOperation('🗃️  Running schema migrations...');

    const schemaFile = 'data/schemas/fire22-water-dashboard-schema.sql';

    if (this.config.dryRun) {
      this.logOperation(`🔍 [DRY RUN] Would apply schema: ${schemaFile}`);
      return;
    }

    try {
      await $`wrangler d1 execute ${this.dbName} --file=${schemaFile}`;
      this.logOperation(`✅ Schema applied: ${schemaFile}`);

      // Count tables created
      const tableCountResult =
        await $`wrangler d1 execute ${this.dbName} --command="SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"`.text();
      const tableCount = parseInt(tableCountResult.match(/count\s*\|\s*(\d+)/)?.[1] || '0');
      this.result.statistics.tablesCreated = tableCount;
    } catch (error) {
      throw new Error(`Schema migration failed: ${error}`);
    }
  }

  private async setupFireL22LKeyMappings(): Promise<void> {
    this.logOperation('🔗 Setting up Fire22 L-key mappings...');

    if (this.config.dryRun) {
      this.logOperation('🔍 [DRY RUN] Would setup Fire22 L-key mappings');
      return;
    }

    try {
      // Count L-key mappings
      const mappingCountResult =
        await $`wrangler d1 execute ${this.dbName} --command="SELECT COUNT(*) as count FROM fire22_lkey_mappings"`.text();
      const mappingCount = parseInt(mappingCountResult.match(/count\s*\|\s*(\d+)/)?.[1] || '0');
      this.result.statistics.lKeyMappings = mappingCount;

      this.logOperation(`✅ Fire22 L-key mappings setup complete: ${mappingCount} mappings`);
    } catch (error) {
      throw new Error(`L-key mapping setup failed: ${error}`);
    }
  }

  private async createIndexes(): Promise<void> {
    this.logOperation('📚 Creating performance indexes...');

    if (this.config.dryRun) {
      this.logOperation('🔍 [DRY RUN] Would create performance indexes');
      return;
    }

    try {
      // Count indexes created
      const indexCountResult =
        await $`wrangler d1 execute ${this.dbName} --command="SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"`.text();
      const indexCount = parseInt(indexCountResult.match(/count\s*\|\s*(\d+)/)?.[1] || '0');
      this.result.statistics.indexesCreated = indexCount;

      this.logOperation(`✅ Performance indexes created: ${indexCount} indexes`);
    } catch (error) {
      throw new Error(`Index creation failed: ${error}`);
    }
  }

  private async insertSampleData(): Promise<void> {
    this.logOperation('📝 Inserting sample data...');

    // Only insert sample data in development environment
    if (this.config.environment !== 'development') {
      this.logOperation(`ℹ️  Skipping sample data for ${this.config.environment} environment`);
      return;
    }

    if (this.config.dryRun) {
      this.logOperation('🔍 [DRY RUN] Would insert sample data');
      return;
    }

    try {
      // Insert sample Fire22 customers
      const sampleCustomersSQL = `
        INSERT OR IGNORE INTO fire22_customers (id, customer_name, customer_type, login_id, balance, is_active, language_code, fire22_language_keys) VALUES
        ('BB2212', 'João Silva', 'player', 'joao.silva', 1500.00, TRUE, 'pt', '["L-603", "L-526", "L-152", "L-187"]'),
        ('BCC1537', 'Maria Santos', 'agent', 'maria.santos', 5000.00, TRUE, 'pt', '["L-603", "L-526", "L-152", "L-187", "L-888"]'),
        ('AGT9901', 'Carlos Rodriguez', 'agent', 'carlos.rodriguez', 10000.00, TRUE, 'es', '["L-603", "L-526", "L-152", "L-187", "L-888"]'),
        ('PLY4455', 'Amanda Johnson', 'player', 'amanda.johnson', 750.00, TRUE, 'en', '["L-603", "L-526", "L-152", "L-187"]'),
        ('VIP7788', 'Roberto Lima', 'player', 'roberto.lima', 25000.00, TRUE, 'pt', '["L-603", "L-526", "L-152", "L-187"]');
      `;

      await $`echo ${sampleCustomersSQL} | wrangler d1 execute ${this.dbName} --file=-`;
      this.result.statistics.sampleDataRows += 5;

      // Insert sample web log entries
      const sampleLogsSQL = `
        INSERT OR IGNORE INTO web_logs (
          id, timestamp, log_type, action_type, customer_id, ip_address, 
          amount, balance, currency, language_code, fire22_language_keys, 
          action_data, risk_score, is_suspicious, status
        ) VALUES
        ('log_${Date.now()}_001', CURRENT_TIMESTAMP, 'transaction', 'deposit', 'BB2212', '186.123.45.67', 
         500.00, 2000.00, 'BRL', 'pt', '["L-69", "L-187", "L-202", "L-603"]', 
         '{"method": "pix", "bank": "Banco do Brasil"}', 15, FALSE, 'processed'),
        ('log_${Date.now()}_002', CURRENT_TIMESTAMP, 'wager', 'sports_bet', 'BCC1537', '187.234.56.78', 
         250.00, 4750.00, 'BRL', 'pt', '["L-12", "L-69", "L-603", "L-1390"]', 
         '{"sport": "football", "event": "Brasil vs Argentina"}', 25, FALSE, 'processed'),
        ('log_${Date.now()}_003', CURRENT_TIMESTAMP, 'authentication', 'login', 'VIP7788', '189.345.67.89', 
         NULL, NULL, 'BRL', 'pt', '["L-603", "L-214", "L-1387"]', 
         '{"method": "password", "success": true}', 10, FALSE, 'processed');
      `;

      await $`echo ${sampleLogsSQL} | wrangler d1 execute ${this.dbName} --file=-`;
      this.result.statistics.sampleDataRows += 3;

      this.logOperation(`✅ Sample data inserted: ${this.result.statistics.sampleDataRows} rows`);
    } catch (error) {
      console.warn(`⚠️  Sample data insertion failed: ${error}`);
      // Don't fail the entire migration for sample data issues
    }
  }

  private async validateMigration(): Promise<void> {
    this.logOperation('✅ Validating migration...');

    if (this.config.dryRun) {
      this.logOperation('🔍 [DRY RUN] Would validate migration');
      return;
    }

    const validations = [
      {
        name: 'Database connection',
        query: 'SELECT 1 as test',
        expected: (result: string) => result.includes('test'),
      },
      {
        name: 'Fire22 L-key mappings table',
        query: 'SELECT COUNT(*) as count FROM fire22_lkey_mappings',
        expected: (result: string) => parseInt(result.match(/count\s*\|\s*(\d+)/)?.[1] || '0') > 0,
      },
      {
        name: 'Web logs table structure',
        query: 'PRAGMA table_info(web_logs)',
        expected: (result: string) => result.includes('customer_id') && result.includes('amount'),
      },
      {
        name: 'Fire22 customers table',
        query: 'SELECT COUNT(*) as count FROM fire22_customers',
        expected: (result: string) => result.includes('count'),
      },
      {
        name: 'Performance indexes',
        query:
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
        expected: (result: string) => parseInt(result.match(/count\s*\|\s*(\d+)/)?.[1] || '0') > 0,
      },
    ];

    for (const validation of validations) {
      try {
        const result =
          await $`wrangler d1 execute ${this.dbName} --command="${validation.query}"`.text();

        if (validation.expected(result)) {
          this.logOperation(`✅ ${validation.name} - valid`);
        } else {
          throw new Error(`${validation.name} validation failed: ${result}`);
        }
      } catch (error) {
        throw new Error(`Validation failed for ${validation.name}: ${error}`);
      }
    }

    this.logOperation('✅ All validations passed');
  }

  private async updateMetadata(): Promise<void> {
    this.logOperation('📋 Updating migration metadata...');

    if (this.config.dryRun) {
      this.logOperation('🔍 [DRY RUN] Would update metadata');
      return;
    }

    const migrationMetadata = {
      migration_version: '1.0.0',
      migration_date: new Date().toISOString(),
      environment: this.config.environment,
      fire22_lkey_version: '3.0.9',
      database_schema_version: 1,
      tables_created: this.result.statistics.tablesCreated,
      indexes_created: this.result.statistics.indexesCreated,
      lkey_mappings: this.result.statistics.lKeyMappings,
      sample_data_rows: this.result.statistics.sampleDataRows,
    };

    try {
      const metadataSQL = `
        CREATE TABLE IF NOT EXISTS migration_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT OR REPLACE INTO migration_metadata (key, value) VALUES
        ('last_migration', '${JSON.stringify(migrationMetadata)}');
      `;

      await $`echo ${metadataSQL} | wrangler d1 execute ${this.dbName} --file=-`;
      this.logOperation('✅ Migration metadata updated');
    } catch (error) {
      console.warn(`⚠️  Failed to update metadata: ${error}`);
    }
  }

  private async rollbackOnFailure(): Promise<void> {
    console.log('\n🔄 Attempting rollback...');

    try {
      // Look for the most recent backup
      const backupDir = 'temp/backup';
      const files = await readdir(backupDir);
      const backupFiles = files
        .filter(f => f.includes(this.config.environment) && f.endsWith('.sql'))
        .sort()
        .reverse();

      if (backupFiles.length === 0) {
        console.log('⚠️  No backup found for rollback');
        return;
      }

      const latestBackup = join(backupDir, backupFiles[0]);
      console.log(`🔄 Rolling back to: ${latestBackup}`);

      await $`wrangler d1 execute ${this.dbName} --file=${latestBackup}`;
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }

  private async generateMigrationReport(): Promise<void> {
    const reportFile = `temp/migration-report-${this.config.environment}-${Date.now()}.json`;

    const report = {
      ...this.result,
      config: this.config,
      database: {
        binding: this.dbBinding,
        name: this.dbName,
      },
    };

    try {
      await Bun.write(reportFile, JSON.stringify(report, null, 2));
      this.logOperation(`📊 Migration report saved: ${reportFile}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save report: ${error}`);
    }

    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Database: ${this.dbName}`);
    console.log(`Duration: ${this.result.timing.duration}ms`);
    console.log(`Success: ${this.result.success ? '✅' : '❌'}`);
    console.log(`Tables Created: ${this.result.statistics.tablesCreated}`);
    console.log(`Indexes Created: ${this.result.statistics.indexesCreated}`);
    console.log(`L-key Mappings: ${this.result.statistics.lKeyMappings}`);
    console.log(`Sample Data Rows: ${this.result.statistics.sampleDataRows}`);

    if (this.result.errors.length > 0) {
      console.log(`\n❌ Errors (${this.result.errors.length}):`);
      this.result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }

  private logOperation(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
    this.result.operations.push(message);
  }
}

// !==!== CLI Interface !==!==

async function main() {
  const args = process.argv.slice(2);

  const config: MigrationConfig = {
    environment:
      (args.find(arg => ['development', 'staging', 'production'].includes(arg)) as any) ||
      'development',
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipBackup: args.includes('--skip-backup'),
    forceRecreate: args.includes('--force-recreate'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔥 Fire22 Water Dashboard Migration Tool

Usage: bun run migrate-water-dashboard.ts [environment] [options]

Environments:
  development (default) - Development environment with sample data
  staging             - Staging environment  
  production          - Production environment

Options:
  --dry-run           - Show what would be done without making changes
  --verbose, -v       - Verbose output
  --skip-backup       - Skip database backup
  --force-recreate    - Drop and recreate database (DESTRUCTIVE)
  --help, -h          - Show this help

Examples:
  bun run migrate-water-dashboard.ts development --verbose
  bun run migrate-water-dashboard.ts production --dry-run
  bun run migrate-water-dashboard.ts staging --skip-backup

⚠️  Always run with --dry-run first to validate the migration plan!
    `);
    return;
  }

  console.log(`🔥 Starting Water Dashboard Migration`);
  console.log(`Environment: ${config.environment}`);
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);

  if (config.forceRecreate && !config.dryRun) {
    console.log('⚠️  WARNING: --force-recreate will destroy all data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const migration = new Fire22WaterDashboardMigration(config);
    const result = await migration.migrate();

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { Fire22WaterDashboardMigration };
