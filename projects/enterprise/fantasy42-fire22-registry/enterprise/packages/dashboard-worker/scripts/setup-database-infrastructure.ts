#!/usr/bin/env bun

/**
 * Fire22 Dashboard Database Infrastructure Setup
 * Comprehensive setup for D1/R2/KV with Fire22 L-key mapping
 */

import { $ } from 'bun';

// !==!== Fire22 L-Key to Database Field Mappings !==!==

export const FIRE22_DATABASE_FIELD_MAPPINGS = {
  // Customer Management L-keys
  'L-603': 'customer_id', // Customer ID
  'L-526': 'customer_name', // Name
  'L-152': 'customer_type', // Type
  'L-214': 'password_hash', // Password

  // Financial Operation L-keys
  'L-69': 'amount', // Amount
  'L-627': 'risk_amount', // Risk Amount
  'L-628': 'win_amount', // Win Amount
  'L-187': 'balance', // Balance
  'L-202': 'deposit_amount', // Deposit
  'L-206': 'withdrawal_amount', // Withdrawal

  // Betting Operation L-keys
  'L-12': 'straights_bet', // Straights
  'L-15': 'parlays_bet', // Parlays
  'L-16': 'if_bets', // If Bets
  'L-85': 'teasers_bet', // Teasers
  'L-1390': 'live_props_bet', // Live/Props

  // System Interface L-keys
  'L-407': 'settings_config', // Settings
  'L-449': 'date_today', // Today
  'L-792': 'status_okay', // Okay
  'L-880': 'filter_all', // All
  'L-1351': 'dashboard_view', // Dashboard

  // Advanced Operations L-keys
  'L-849': 'report_settings', // Report Settings
  'L-885': 'order_by_field', // Order By
  'L-886': 'sort_direction', // Sort
  'L-892': 'filter_criteria', // Filter
  'L-888': 'agent_id', // Agent ID
  'L-889': 'login_id', // Login ID

  // Security & Compliance L-keys
  'L-848': 'fraud_detection', // Fraud Detection
  'L-1389': 'risk_management', // Risk Management
  'L-1387': 'security_settings', // Security Settings
  'L-1388': 'account_verification', // Account Verification
  'L-1391': 'audit_trail', // Audit Trail
  'L-842': 'transaction_history', // Transaction History
  'L-846': 'account_balance', // Account Balance
  'L-1385': 'third_party_limits', // 3rd Party Limits
} as const;

// !==!== Environment Configuration !==!==

interface DatabaseConfig {
  environment: 'development' | 'staging' | 'production';
  d1Config: {
    mainDatabase: {
      binding: string;
      name: string;
      retention_days: number;
    };
    registryDatabase: {
      binding: string;
      name: string;
      retention_days: number;
    };
  };
  r2Config: {
    binding: string;
    bucket: string;
    archivePath: string;
    compressionEnabled: boolean;
    retention_years: number;
  };
  kvConfig: {
    dataCache: {
      binding: string;
      ttl_seconds: number;
    };
    authCache: {
      binding: string;
      ttl_seconds: number;
    };
    registryCache: {
      binding: string;
      ttl_seconds: number;
    };
  };
  fire22Config: {
    api_base_url: string;
    auth_cache_duration: number;
    customer_cache_duration: number;
    security_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    permission_strict_mode: boolean;
  };
  dnsConfig: {
    ttl_seconds: number;
    verbose_fetch: boolean;
  };
}

const DATABASE_CONFIGS: Record<string, DatabaseConfig> = {
  development: {
    environment: 'development',
    d1Config: {
      mainDatabase: {
        binding: 'DB',
        name: 'fire22-dashboard-dev',
        retention_days: 30,
      },
      registryDatabase: {
        binding: 'REGISTRY_DB',
        name: 'fire22-registry-dev',
        retention_days: 30,
      },
    },
    r2Config: {
      binding: 'REGISTRY_STORAGE',
      bucket: 'fire22-packages-dev',
      archivePath: 'logs/archived/dev',
      compressionEnabled: true,
      retention_years: 2,
    },
    kvConfig: {
      dataCache: {
        binding: 'FIRE22_DATA_CACHE',
        ttl_seconds: 1800, // 30 minutes for dev
      },
      authCache: {
        binding: 'FIRE22_AUTH_CACHE',
        ttl_seconds: 3600, // 1 hour for dev
      },
      registryCache: {
        binding: 'REGISTRY_CACHE',
        ttl_seconds: 900, // 15 minutes for dev
      },
    },
    fire22Config: {
      api_base_url: 'https://dev-api.fire22.com',
      auth_cache_duration: 3600,
      customer_cache_duration: 1800,
      security_level: 'MEDIUM',
      permission_strict_mode: false,
    },
    dnsConfig: {
      ttl_seconds: 5,
      verbose_fetch: true,
    },
  },
  staging: {
    environment: 'staging',
    d1Config: {
      mainDatabase: {
        binding: 'DB',
        name: 'fire22-dashboard-staging',
        retention_days: 60,
      },
      registryDatabase: {
        binding: 'REGISTRY_DB',
        name: 'fire22-registry-staging',
        retention_days: 60,
      },
    },
    r2Config: {
      binding: 'REGISTRY_STORAGE',
      bucket: 'fire22-packages-staging',
      archivePath: 'logs/archived/staging',
      compressionEnabled: true,
      retention_years: 3,
    },
    kvConfig: {
      dataCache: {
        binding: 'FIRE22_DATA_CACHE',
        ttl_seconds: 3600, // 1 hour for staging
      },
      authCache: {
        binding: 'FIRE22_AUTH_CACHE',
        ttl_seconds: 7200, // 2 hours for staging
      },
      registryCache: {
        binding: 'REGISTRY_CACHE',
        ttl_seconds: 1800, // 30 minutes for staging
      },
    },
    fire22Config: {
      api_base_url: 'https://staging-api.fire22.com',
      auth_cache_duration: 7200,
      customer_cache_duration: 3600,
      security_level: 'HIGH',
      permission_strict_mode: true,
    },
    dnsConfig: {
      ttl_seconds: 15,
      verbose_fetch: false,
    },
  },
  production: {
    environment: 'production',
    d1Config: {
      mainDatabase: {
        binding: 'DB',
        name: 'fire22-dashboard',
        retention_days: 90,
      },
      registryDatabase: {
        binding: 'REGISTRY_DB',
        name: 'fire22-registry',
        retention_days: 90,
      },
    },
    r2Config: {
      binding: 'REGISTRY_STORAGE',
      bucket: 'fire22-packages',
      archivePath: 'logs/archived/production',
      compressionEnabled: true,
      retention_years: 7,
    },
    kvConfig: {
      dataCache: {
        binding: 'FIRE22_DATA_CACHE',
        ttl_seconds: 3600, // 1 hour for production
      },
      authCache: {
        binding: 'FIRE22_AUTH_CACHE',
        ttl_seconds: 43200, // 12 hours for production
      },
      registryCache: {
        binding: 'REGISTRY_CACHE',
        ttl_seconds: 3600, // 1 hour for production
      },
    },
    fire22Config: {
      api_base_url: 'https://fire22.ag/cloud/api',
      auth_cache_duration: 43200,
      customer_cache_duration: 21600,
      security_level: 'CRITICAL',
      permission_strict_mode: true,
    },
    dnsConfig: {
      ttl_seconds: 30,
      verbose_fetch: false,
    },
  },
};

// !==!== Database Setup Functions !==!==

class Fire22DatabaseInfrastructureSetup {
  private config: DatabaseConfig;
  private environment: string;

  constructor(environment: string = 'development') {
    this.environment = environment;
    this.config = DATABASE_CONFIGS[environment];

    if (!this.config) {
      throw new Error(
        `Invalid environment: ${environment}. Available: ${Object.keys(DATABASE_CONFIGS).join(', ')}`
      );
    }
  }

  async setup(): Promise<void> {
    console.log(`🔥 Fire22 Dashboard Infrastructure Setup - ${this.environment.toUpperCase()}`);
    console.log('='.repeat(70));

    try {
      await this.validatePrerequisites();
      await this.setupD1Databases();
      await this.setupR2Storage();
      await this.setupKVNamespaces();
      await this.updateWranglerConfig();
      await this.setupSecrets();
      await this.validateSetup();

      console.log('\n✅ Fire22 Database Infrastructure Setup Complete!');
      console.log(`🌐 Environment: ${this.environment}`);
      console.log('📊 Ready for Water Dashboard integration');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  private async validatePrerequisites(): Promise<void> {
    console.log('\n🔍 Validating Prerequisites...');

    // Check if wrangler is installed and authenticated
    try {
      await $`wrangler --version`;
      console.log('✅ Wrangler CLI available');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Run: npm install -g wrangler');
    }

    try {
      await $`wrangler whoami`;
      console.log('✅ Cloudflare authentication valid');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Run: wrangler auth login');
    }

    // Check Fire22 L-key mappings
    const mappingCount = Object.keys(FIRE22_DATABASE_FIELD_MAPPINGS).length;
    console.log(`✅ Fire22 L-key mappings loaded: ${mappingCount} keys`);
  }

  private async setupD1Databases(): Promise<void> {
    console.log('\n📊 Setting up D1 Databases...');

    // Main dashboard database
    const mainDbName = this.config.d1Config.mainDatabase.name;
    console.log(`Creating main database: ${mainDbName}`);

    try {
      // Create database if it doesn't exist
      await $`wrangler d1 create ${mainDbName}`;
      console.log(`✅ Main database created: ${mainDbName}`);
    } catch (error) {
      if (error.toString().includes('already exists')) {
        console.log(`ℹ️  Main database already exists: ${mainDbName}`);
      } else {
        console.error(`❌ Failed to create main database: ${error}`);
      }
    }

    // Registry database
    const registryDbName = this.config.d1Config.registryDatabase.name;
    console.log(`Creating registry database: ${registryDbName}`);

    try {
      await $`wrangler d1 create ${registryDbName}`;
      console.log(`✅ Registry database created: ${registryDbName}`);
    } catch (error) {
      if (error.toString().includes('already exists')) {
        console.log(`ℹ️  Registry database already exists: ${registryDbName}`);
      } else {
        console.error(`❌ Failed to create registry database: ${error}`);
      }
    }

    // Initialize schemas
    await this.initializeSchemas();
  }

  private async initializeSchemas(): Promise<void> {
    console.log('\n🗃️  Initializing Database Schemas...');

    const schemaFiles = [
      'data/schemas/web-logs-schema.sql',
      'data/schemas/fire22-enhanced-schema.sql',
      'data/schemas/registry-schema.sql',
    ];

    for (const schemaFile of schemaFiles) {
      try {
        const mainDbName = this.config.d1Config.mainDatabase.name;
        await $`wrangler d1 execute ${mainDbName} --file=${schemaFile}`;
        console.log(`✅ Applied schema: ${schemaFile}`);
      } catch (error) {
        console.error(`❌ Failed to apply schema ${schemaFile}:`, error);
      }
    }

    // Apply Fire22 L-key field mappings
    await this.applyLKeyMappings();
  }

  private async applyLKeyMappings(): Promise<void> {
    console.log('\n🔗 Applying Fire22 L-key Mappings...');

    // Create mapping table for L-key to database field relationships
    const mappingSQL = `
      CREATE TABLE IF NOT EXISTS fire22_lkey_mappings (
        lkey TEXT PRIMARY KEY,
        database_field TEXT NOT NULL,
        description TEXT,
        field_type TEXT DEFAULT 'VARCHAR',
        is_indexed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Clear existing mappings
      DELETE FROM fire22_lkey_mappings;

      -- Insert Fire22 L-key mappings
      ${Object.entries(FIRE22_DATABASE_FIELD_MAPPINGS)
        .map(
          ([lkey, field]) => `
        INSERT INTO fire22_lkey_mappings (lkey, database_field, description, is_indexed)
        VALUES ('${lkey}', '${field}', 'Fire22 ${lkey} field mapping', ${
          ['customer_id', 'amount', 'timestamp', 'risk_score'].includes(field) ? 'TRUE' : 'FALSE'
        });
      `
        )
        .join('\n')}
    `;

    try {
      const mainDbName = this.config.d1Config.mainDatabase.name;
      await Bun.write('/tmp/lkey-mappings.sql', mappingSQL);
      await $`wrangler d1 execute ${mainDbName} --file=/tmp/lkey-mappings.sql`;
      console.log(
        `✅ Applied ${Object.keys(FIRE22_DATABASE_FIELD_MAPPINGS).length} L-key mappings`
      );
    } catch (error) {
      console.error('❌ Failed to apply L-key mappings:', error);
    }
  }

  private async setupR2Storage(): Promise<void> {
    console.log('\n🗂️  Setting up R2 Storage...');

    const bucketName = this.config.r2Config.bucket;
    console.log(`Creating R2 bucket: ${bucketName}`);

    try {
      await $`wrangler r2 bucket create ${bucketName}`;
      console.log(`✅ R2 bucket created: ${bucketName}`);
    } catch (error) {
      if (error.toString().includes('already exists')) {
        console.log(`ℹ️  R2 bucket already exists: ${bucketName}`);
      } else {
        console.error(`❌ Failed to create R2 bucket: ${error}`);
      }
    }

    // Create archive directory structure
    await this.setupArchiveStructure();
  }

  private async setupArchiveStructure(): Promise<void> {
    console.log('📁 Setting up archive directory structure...');

    const archiveMetadata = {
      structure: {
        logs: {
          archived: {
            [this.environment]: {
              'transaction-logs': 'Transaction-related logs',
              'wager-logs': 'Betting and wager logs',
              'security-logs': 'Security incident logs',
              'system-logs': 'System operation logs',
            },
          },
        },
      },
      fire22Config: this.config.fire22Config,
      retention: {
        active_days: this.config.d1Config.mainDatabase.retention_days,
        archive_years: this.config.r2Config.retention_years,
      },
      lkey_mappings: FIRE22_DATABASE_FIELD_MAPPINGS,
    };

    const metadataFile = `/tmp/archive-metadata-${this.environment}.json`;
    await Bun.write(metadataFile, JSON.stringify(archiveMetadata, null, 2));

    try {
      const bucketName = this.config.r2Config.bucket;
      await $`wrangler r2 object put ${bucketName}/metadata/structure.json --file=${metadataFile}`;
      console.log('✅ Archive structure metadata uploaded');
    } catch (error) {
      console.error('❌ Failed to upload archive metadata:', error);
    }
  }

  private async setupKVNamespaces(): Promise<void> {
    console.log('\n🔧 Setting up KV Namespaces...');

    const kvNamespaces = [
      {
        name: `fire22-data-cache-${this.environment}`,
        binding: this.config.kvConfig.dataCache.binding,
      },
      {
        name: `fire22-auth-cache-${this.environment}`,
        binding: this.config.kvConfig.authCache.binding,
      },
      {
        name: `fire22-registry-cache-${this.environment}`,
        binding: this.config.kvConfig.registryCache.binding,
      },
    ];

    for (const namespace of kvNamespaces) {
      try {
        await $`wrangler kv:namespace create ${namespace.name}`;
        console.log(`✅ KV namespace created: ${namespace.name}`);
      } catch (error) {
        if (error.toString().includes('already exists')) {
          console.log(`ℹ️  KV namespace already exists: ${namespace.name}`);
        } else {
          console.error(`❌ Failed to create KV namespace ${namespace.name}:`, error);
        }
      }
    }
  }

  private async updateWranglerConfig(): Promise<void> {
    console.log('\n⚙️  Updating Wrangler Configuration...');

    const wranglerConfigPath = 'wrangler.toml';
    let wranglerContent = await Bun.file(wranglerConfigPath).text();

    // Add environment-specific configuration section
    const envConfig = this.generateWranglerEnvConfig();

    // Check if environment section already exists
    if (!wranglerContent.includes(`[env.${this.environment}]`)) {
      wranglerContent += '\n' + envConfig;
      await Bun.write(wranglerConfigPath, wranglerContent);
      console.log(`✅ Added ${this.environment} configuration to wrangler.toml`);
    } else {
      console.log(`ℹ️  ${this.environment} configuration already exists in wrangler.toml`);
    }
  }

  private generateWranglerEnvConfig(): string {
    const config = this.config;

    return `
# ${this.environment.toUpperCase()} Environment Configuration
[env.${this.environment}]

# D1 Databases
[[env.${this.environment}.d1_databases]]
binding = "${config.d1Config.mainDatabase.binding}"
database_name = "${config.d1Config.mainDatabase.name}"

[[env.${this.environment}.d1_databases]]  
binding = "${config.d1Config.registryDatabase.binding}"
database_name = "${config.d1Config.registryDatabase.name}"

# R2 Storage
[[env.${this.environment}.r2_buckets]]
binding = "${config.r2Config.binding}"
bucket_name = "${config.r2Config.bucket}"

# KV Namespaces
[[env.${this.environment}.kv_namespaces]]
binding = "${config.kvConfig.dataCache.binding}"
id = "TBD" # Set after KV creation

[[env.${this.environment}.kv_namespaces]]
binding = "${config.kvConfig.authCache.binding}"  
id = "TBD" # Set after KV creation

[[env.${this.environment}.kv_namespaces]]
binding = "${config.kvConfig.registryCache.binding}"
id = "TBD" # Set after KV creation

# Environment Variables
[env.${this.environment}.vars]
FIRE22_API_BASE_URL = "${config.fire22Config.api_base_url}"
FIRE22_AUTH_CACHE_DURATION = "${config.fire22Config.auth_cache_duration}"
FIRE22_CUSTOMER_CACHE_DURATION = "${config.fire22Config.customer_cache_duration}"
FIRE22_SECURITY_LEVEL = "${config.fire22Config.security_level}"
FIRE22_PERMISSION_STRICT_MODE = "${config.fire22Config.permission_strict_mode}"
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = "${config.dnsConfig.ttl_seconds}"
BUN_CONFIG_VERBOSE_FETCH = "${config.dnsConfig.verbose_fetch}"
LOG_RETENTION_DAYS = "${config.d1Config.mainDatabase.retention_days}"
ARCHIVE_RETENTION_YEARS = "${config.r2Config.retention_years}"
`;
  }

  private async setupSecrets(): Promise<void> {
    console.log('\n🔐 Setting up Secrets...');

    const requiredSecrets = [
      'FIRE22_TOKEN',
      'JWT_SECRET',
      'ADMIN_PASSWORD',
      'FIRE22_WEBHOOK_SECRET',
      'CRON_SECRET',
    ];

    console.log('Required secrets for this environment:');
    requiredSecrets.forEach(secret => {
      console.log(
        `  • ${secret} - Set via: wrangler secret put ${secret} --env ${this.environment}`
      );
    });

    console.log('\nℹ️  Secrets must be set manually using wrangler CLI');
    console.log(`Example: wrangler secret put FIRE22_TOKEN --env ${this.environment}`);
  }

  private async validateSetup(): Promise<void> {
    console.log('\n✅ Validating Setup...');

    const validations = [
      this.validateD1Connection(),
      this.validateR2Access(),
      this.validateKVAccess(),
      this.validateLKeyMappings(),
    ];

    try {
      await Promise.all(validations);
      console.log('✅ All validations passed');
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  private async validateD1Connection(): Promise<void> {
    try {
      const mainDbName = this.config.d1Config.mainDatabase.name;
      await $`wrangler d1 execute ${mainDbName} --command="SELECT 1"`;
      console.log('✅ D1 database connection valid');
    } catch (error) {
      throw new Error(`D1 validation failed: ${error}`);
    }
  }

  private async validateR2Access(): Promise<void> {
    try {
      const bucketName = this.config.r2Config.bucket;
      await $`wrangler r2 object list ${bucketName} --limit=1`;
      console.log('✅ R2 bucket access valid');
    } catch (error) {
      throw new Error(`R2 validation failed: ${error}`);
    }
  }

  private async validateKVAccess(): Promise<void> {
    // KV validation would require namespace IDs which are generated
    // This is a placeholder for when IDs are available
    console.log('ℹ️  KV validation skipped (requires namespace IDs)');
  }

  private async validateLKeyMappings(): Promise<void> {
    try {
      const mainDbName = this.config.d1Config.mainDatabase.name;
      const result =
        await $`wrangler d1 execute ${mainDbName} --command="SELECT COUNT(*) as count FROM fire22_lkey_mappings"`;
      console.log('✅ Fire22 L-key mappings validated');
    } catch (error) {
      throw new Error(`L-key mappings validation failed: ${error}`);
    }
  }

  // !==!== Utility Functions !==!==

  printConfiguration(): void {
    console.log('\n📋 Configuration Summary:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(this.config, null, 2));
  }

  printLKeyMappings(): void {
    console.log('\n🔗 Fire22 L-Key Mappings:');
    console.log('='.repeat(50));

    Object.entries(FIRE22_DATABASE_FIELD_MAPPINGS).forEach(([lkey, field]) => {
      console.log(`${lkey}: ${field}`);
    });
  }
}

// !==!== CLI Interface !==!==

async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'development';
  const command = args[1] || 'setup';

  try {
    const setup = new Fire22DatabaseInfrastructureSetup(environment);

    switch (command) {
      case 'setup':
        await setup.setup();
        break;
      case 'config':
        setup.printConfiguration();
        break;
      case 'mappings':
        setup.printLKeyMappings();
        break;
      case 'validate':
        await setup.validateSetup();
        break;
      default:
        console.log(`
🔥 Fire22 Database Infrastructure Setup

Usage: bun run setup-database-infrastructure.ts [environment] [command]

Environments:
  development (default)
  staging  
  production

Commands:
  setup     - Full infrastructure setup
  config    - Show configuration
  mappings  - Show L-key mappings
  validate  - Validate existing setup

Examples:
  bun run setup-database-infrastructure.ts
  bun run setup-database-infrastructure.ts production setup
  bun run setup-database-infrastructure.ts development mappings
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { Fire22DatabaseInfrastructureSetup, FIRE22_DATABASE_FIELD_MAPPINGS, DATABASE_CONFIGS };
