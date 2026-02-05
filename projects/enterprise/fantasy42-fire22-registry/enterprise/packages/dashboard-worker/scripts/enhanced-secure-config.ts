#!/usr/bin/env bun

/**
 * 🔐 Enhanced Secure Configuration Manager for Fire22 Dashboard
 *
 * Integrates Bun.secrets with existing Fire22 security infrastructure
 * Provides secure credential management for Telegram bots and dashboard
 * Extends existing security-core package functionality
 */

import { secrets } from 'bun';
import { Fire22SecureCredentialManager } from './bun-secrets-demo';
import { SecureEnvironmentManager } from './secure-env-manager';

export interface EnhancedSecureConfig {
  // Telegram Bot Configuration
  BOT_TOKEN: string;
  CASHIER_BOT_TOKEN: string;
  ADMIN_BOT_TOKEN?: string;

  // Dashboard Authentication
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;

  // API Security
  FIRE22_API_TOKEN: string;
  WEBHOOK_SECRET: string;

  // Database Security
  DATABASE_URL: string;
  DATABASE_PASSWORD: string;

  // External Service Tokens
  STRIPE_SECRET_KEY?: string;
  SENDGRID_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;

  // Monitoring and Security
  SECURITY_WEBHOOK_URL?: string;
  AUDIT_LOG_ENDPOINT?: string;
}

export class EnhancedConfigManager {
  private readonly serviceName = 'fire22-dashboard-enhanced';
  private credManager = new Fire22SecureCredentialManager();
  private envManager = new SecureEnvironmentManager();

  /**
   * Enhanced credential setup with validation and security checks
   */
  async setupEnhancedConfig(config: Partial<EnhancedSecureConfig>): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    Fire22 Enhanced Security Configuration                    ║
║                                                                              ║
║  🔐 Using Bun.secrets for OS-native credential encryption                  ║
║  🛡️  Enhanced validation and security policy enforcement                    ║
║  🔍 Integration with existing Fire22 security infrastructure               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

    const results = {
      stored: 0,
      failed: 0,
      skipped: 0,
    };

    for (const [key, value] of Object.entries(config)) {
      if (!value) {
        console.log(`⚪ Skipping ${key} (no value provided)`);
        results.skipped++;
        continue;
      }

      try {
        // Enhanced validation based on credential type
        const validationResult = await this.validateCredential(key, value);

        if (validationResult.valid) {
          await secrets.set({
            service: this.serviceName,
            name: key,
            value: value.toString(),
          });

          console.log(`✅ Securely stored ${key} (${validationResult.type})`);
          results.stored++;
        } else {
          console.error(`❌ Validation failed for ${key}: ${validationResult.reason}`);
          results.failed++;
        }
      } catch (error) {
        console.error(`❌ Failed to store ${key}:`, error);
        results.failed++;
      }
    }

    console.log(`\n📊 Configuration Summary:`);
    console.log(`   ✅ Successfully stored: ${results.stored}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⚪ Skipped: ${results.skipped}`);
  }

  /**
   * Enhanced credential validation with security policies
   */
  private async validateCredential(
    key: string,
    value: string
  ): Promise<{
    valid: boolean;
    type: string;
    reason?: string;
  }> {
    // Telegram Bot Token validation
    if (key.includes('BOT_TOKEN')) {
      if (!/^\d+:[A-Za-z0-9_-]+$/.test(value)) {
        return {
          valid: false,
          type: 'telegram-bot-token',
          reason: 'Invalid Telegram bot token format',
        };
      }
      return { valid: true, type: 'telegram-bot-token' };
    }

    // JWT Secret validation
    if (key === 'JWT_SECRET') {
      if (value.length < 32) {
        return {
          valid: false,
          type: 'jwt-secret',
          reason: 'JWT secret must be at least 32 characters long',
        };
      }
      return { valid: true, type: 'jwt-secret' };
    }

    // Database URL validation
    if (key === 'DATABASE_URL') {
      if (!/^postgresql:\/\/.+/.test(value)) {
        return {
          valid: false,
          type: 'database-url',
          reason: 'Invalid PostgreSQL connection string format',
        };
      }
      return { valid: true, type: 'database-url' };
    }

    // API Token validation
    if (key === 'FIRE22_API_TOKEN') {
      if (!/^f22_[a-zA-Z0-9_]+/.test(value)) {
        return {
          valid: false,
          type: 'api-token',
          reason: 'Invalid Fire22 API token format',
        };
      }
      return { valid: true, type: 'api-token' };
    }

    // Password validation
    if (key.includes('PASSWORD')) {
      if (value.length < 8) {
        return {
          valid: false,
          type: 'password',
          reason: 'Password must be at least 8 characters long',
        };
      }
      return { valid: true, type: 'password' };
    }

    // Default validation for other credentials
    return { valid: true, type: 'generic-credential' };
  }

  /**
   * Retrieve enhanced configuration with fallback to existing systems
   */
  async getEnhancedConfig(): Promise<Partial<EnhancedSecureConfig>> {
    console.log('🔍 Retrieving enhanced configuration...\n');

    const config: Partial<EnhancedSecureConfig> = {};
    const keys: (keyof EnhancedSecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'FIRE22_API_TOKEN',
      'WEBHOOK_SECRET',
      'DATABASE_URL',
      'DATABASE_PASSWORD',
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY',
      'CLOUDFLARE_API_TOKEN',
      'SECURITY_WEBHOOK_URL',
      'AUDIT_LOG_ENDPOINT',
    ];

    for (const key of keys) {
      try {
        // Try enhanced storage first
        const secret = await secrets.get({
          service: this.serviceName,
          name: key,
        });

        if (secret) {
          config[key] = secret.value;
          console.log(`✅ Retrieved ${key} from enhanced storage`);
          continue;
        }

        // Fallback to existing credential manager
        const fallbackValue = await this.credManager.getCredential(key.toLowerCase());
        if (fallbackValue) {
          config[key] = fallbackValue;
          console.log(`🔄 Retrieved ${key} from fallback storage`);
          continue;
        }

        // Fallback to environment variables
        const envValue = process.env[key];
        if (envValue) {
          config[key] = envValue;
          console.log(`🌍 Retrieved ${key} from environment`);
          continue;
        }

        console.log(`⚠️  ${key} not found in any storage`);
      } catch (error) {
        console.error(`❌ Error retrieving ${key}:`, error);
      }
    }

    return config;
  }

  /**
   * Enhanced security audit with multiple storage backends
   */
  async auditEnhancedSecurity(): Promise<void> {
    console.log('🛡️  Enhanced Security Audit\n');

    const auditResults = {
      enhancedStorage: 0,
      fallbackStorage: 0,
      environmentVars: 0,
      missing: 0,
      securityIssues: 0,
    };

    const keys: (keyof EnhancedSecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'FIRE22_API_TOKEN',
      'WEBHOOK_SECRET',
      'DATABASE_URL',
      'DATABASE_PASSWORD',
    ];

    console.log('🔍 Auditing credential storage across all backends...\n');

    for (const key of keys) {
      let found = false;
      let storageType = '';

      // Check enhanced storage
      try {
        const secret = await secrets.get({
          service: this.serviceName,
          name: key,
        });
        if (secret) {
          auditResults.enhancedStorage++;
          found = true;
          storageType = 'Enhanced Storage (Bun.secrets)';
        }
      } catch (error) {
        // Continue to next storage type
      }

      // Check fallback storage
      if (!found) {
        try {
          const fallbackValue = await this.credManager.getCredential(key.toLowerCase());
          if (fallbackValue) {
            auditResults.fallbackStorage++;
            found = true;
            storageType = 'Fallback Storage (OS Keychain)';
          }
        } catch (error) {
          // Continue to next storage type
        }
      }

      // Check environment variables
      if (!found) {
        const envValue = process.env[key];
        if (envValue) {
          auditResults.environmentVars++;
          found = true;
          storageType = 'Environment Variables';
          auditResults.securityIssues++; // Environment vars are less secure
        }
      }

      if (!found) {
        auditResults.missing++;
        storageType = 'NOT FOUND';
      }

      const status = found ? '✅' : '❌';
      console.log(`${status} ${key}: ${storageType}`);
    }

    console.log('\n📊 Security Audit Summary:');
    console.log(`   🔐 Enhanced Storage (Bun.secrets): ${auditResults.enhancedStorage}`);
    console.log(`   🔑 Fallback Storage (OS Keychain): ${auditResults.fallbackStorage}`);
    console.log(`   🌍 Environment Variables: ${auditResults.environmentVars}`);
    console.log(`   ❌ Missing Credentials: ${auditResults.missing}`);
    console.log(`   ⚠️  Security Issues: ${auditResults.securityIssues}`);

    // Security recommendations
    if (auditResults.missing > 0) {
      console.log('\n🚨 Security Recommendations:');
      console.log(`   • Set up ${auditResults.missing} missing credentials`);
    }

    if (auditResults.securityIssues > 0) {
      console.log('\n⚠️  Security Warnings:');
      console.log(
        `   • Move ${auditResults.securityIssues} credentials from environment to secure storage`
      );
    }

    if (auditResults.enhancedStorage === keys.length) {
      console.log('\n🎉 Excellent! All credentials are using enhanced secure storage.');
    }
  }

  /**
   * Migrate credentials to enhanced storage
   */
  async migrateToEnhancedStorage(): Promise<void> {
    console.log('🔄 Migrating to Enhanced Security Storage\n');

    const keys: (keyof EnhancedSecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'FIRE22_API_TOKEN',
      'WEBHOOK_SECRET',
      'DATABASE_URL',
      'DATABASE_PASSWORD',
    ];

    let migrated = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        // Check if already in enhanced storage
        const existing = await secrets.get({
          service: this.serviceName,
          name: key,
        });

        if (existing) {
          console.log(`✅ ${key} already in enhanced storage`);
          continue;
        }

        // Try to get from fallback storage
        let value = await this.credManager.getCredential(key.toLowerCase());

        // Try environment variables as last resort
        if (!value) {
          value = process.env[key];
        }

        if (value) {
          // Validate before storing
          const validation = await this.validateCredential(key, value);
          if (validation.valid) {
            await secrets.set({
              service: this.serviceName,
              name: key,
              value: value,
            });
            console.log(`✅ Migrated ${key} to enhanced storage`);
            migrated++;
          } else {
            console.log(`⚠️  Skipped ${key} (validation failed: ${validation.reason})`);
            failed++;
          }
        } else {
          console.log(`⚪ ${key} not found in any storage, skipping migration`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate ${key}:`, error);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚪ Skipped: ${keys.length - migrated - failed}`);

    if (migrated > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Verify credentials with: bun run enhanced:audit');
      console.log('   2. Test dashboard functionality');
      console.log('   3. Remove old credentials from fallback storage if desired');
    }
  }

  /**
   * Clear all enhanced credentials
   */
  async clearEnhancedConfig(): Promise<void> {
    console.log('🗑️  Clearing Enhanced Security Configuration\n');

    const keys: (keyof EnhancedSecureConfig)[] = [
      'BOT_TOKEN',
      'CASHIER_BOT_TOKEN',
      'ADMIN_BOT_TOKEN',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'JWT_SECRET',
      'FIRE22_API_TOKEN',
      'WEBHOOK_SECRET',
      'DATABASE_URL',
      'DATABASE_PASSWORD',
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY',
      'CLOUDFLARE_API_TOKEN',
      'SECURITY_WEBHOOK_URL',
      'AUDIT_LOG_ENDPOINT',
    ];

    let deleted = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        await secrets.delete({
          service: this.serviceName,
          name: key,
        });
        console.log(`✅ Deleted ${key}`);
        deleted++;
      } catch (error) {
        console.log(`⚠️  Could not delete ${key} (may not exist)`);
        failed++;
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${deleted}`);
    console.log(`   ⚪ Skipped/not found: ${failed}`);
    console.log('\n✨ Enhanced security configuration cleared');
  }
}

// Export the enhanced config manager
export const enhancedConfigManager = new EnhancedConfigManager();

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'setup':
      console.log('🔐 Enhanced Security Configuration Setup');
      console.log('Please provide credentials interactively or via environment variables');
      break;

    case 'get':
      enhancedConfigManager
        .getEnhancedConfig()
        .then(config => {
          console.log('\n📋 Current Configuration:');
          Object.entries(config).forEach(([key, value]) => {
            const masked = value
              ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
              : 'undefined';
            console.log(`   ${key}: ${masked}`);
          });
        })
        .catch(console.error);
      break;

    case 'audit':
      enhancedConfigManager.auditEnhancedSecurity().catch(console.error);
      break;

    case 'migrate':
      enhancedConfigManager.migrateToEnhancedStorage().catch(console.error);
      break;

    case 'clear':
      enhancedConfigManager.clearEnhancedConfig().catch(console.error);
      break;

    case 'help':
    default:
      console.log(`
🔐 Fire22 Enhanced Security Configuration Manager

Usage: bun run enhanced-secure-config.ts [command]

Commands:
  setup     - Interactive setup for enhanced security configuration
  get       - Display current configuration (masked)
  audit     - Security audit across all storage backends
  migrate   - Migrate existing credentials to enhanced storage
  clear     - Clear all enhanced security configuration
  help      - Show this help message

Examples:
  bun run enhanced-secure-config.ts audit
  bun run enhanced-secure-config.ts migrate
  bun run enhanced-secure-config.ts get
`);
      break;
  }
}
