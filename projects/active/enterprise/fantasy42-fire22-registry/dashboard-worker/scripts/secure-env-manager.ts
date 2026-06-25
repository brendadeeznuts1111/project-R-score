#!/usr/bin/env bun

/**
 * 🔐 Fire22 Secure Environment Manager
 *
 * Integrates Bun.secrets with existing environment management
 * Provides secure credential storage and retrieval for Fire22 dashboard
 */

import { secrets } from 'bun';
import { Fire22SecureCredentialManager } from './bun-secrets-demo';

interface EnvironmentConfig {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  defaultValue?: string;
  validation?: RegExp;
}

class SecureEnvironmentManager {
  private readonly serviceName = 'fire22-dashboard';
  private credManager = new Fire22SecureCredentialManager();

  private readonly environmentConfigs: EnvironmentConfig[] = [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL connection string for Fire22 dashboard',
      required: true,
      sensitive: true,
      validation: /^postgresql:\/\/.+/,
    },
    {
      name: 'FIRE22_API_TOKEN',
      description: 'Fire22 API authentication token',
      required: true,
      sensitive: true,
      validation: /^f22_[a-zA-Z0-9_]+/,
    },
    {
      name: 'TELEGRAM_BOT_TOKEN',
      description: 'Telegram bot token for notifications',
      required: true,
      sensitive: true,
      validation: /^\d+:[A-Za-z0-9_-]+/,
    },
    {
      name: 'CLOUDFLARE_API_TOKEN',
      description: 'Cloudflare Workers API token',
      required: true,
      sensitive: true,
      validation: /^[A-Za-z0-9_-]+/,
    },
    {
      name: 'JWT_SECRET',
      description: 'JWT signing secret for authentication',
      required: true,
      sensitive: true,
      validation: /.{32,}/,
    },
    {
      name: 'NODE_ENV',
      description: 'Runtime environment',
      required: true,
      sensitive: false,
      defaultValue: 'development',
      validation: /^(development|staging|production|test)$/,
    },
    {
      name: 'PORT',
      description: 'Server port number',
      required: false,
      sensitive: false,
      defaultValue: '3001',
      validation: /^\d{4,5}$/,
    },
    {
      name: 'LOG_LEVEL',
      description: 'Application logging level',
      required: false,
      sensitive: false,
      defaultValue: 'info',
      validation: /^(debug|info|warn|error)$/,
    },
  ];

  /**
   * Setup environment with secure credential management
   */
  async setupEnvironment(env: string = 'development'): Promise<void> {
    console.info(`🚀 Fire22 Secure Environment Setup - ${env.toUpperCase()}\n`);

    for (const config of this.environmentConfigs) {
      console.info(`⚙️ Configuring: ${config.name}`);
      console.info(`   Description: ${config.description}`);
      console.info(`   Sensitive: ${config.sensitive ? '🔐 YES' : '📝 NO'}`);
      console.info(`   Required: ${config.required ? '✅ YES' : '⚪ NO'}\n`);

      if (config.sensitive) {
        await this.handleSensitiveVariable(config, env);
      } else {
        await this.handlePublicVariable(config, env);
      }

      console.info(''); // spacing
    }
  }

  /**
   * Handle sensitive environment variables with Bun.secrets
   */
  private async handleSensitiveVariable(config: EnvironmentConfig, env: string): Promise<void> {
    const keyName = `${config.name.toLowerCase()}_${env}`;

    // Check if already exists in keychain
    const existing = await this.credManager.getCredential(keyName);

    if (existing) {
      console.info(`✅ Found existing secure credential for ${config.name}`);

      // Validate if possible
      if (config.validation && !config.validation.test(existing)) {
        console.info(`⚠️ Validation failed for ${config.name}, prompting for new value...`);
        await this.promptForSensitiveValue(config, env, keyName);
      }
    } else {
      console.info(`🔍 No existing credential found for ${config.name}`);
      if (config.required) {
        await this.promptForSensitiveValue(config, env, keyName);
      }
    }
  }

  /**
   * Handle non-sensitive environment variables
   */
  private async handlePublicVariable(config: EnvironmentConfig, env: string): Promise<void> {
    // For demo purposes, just show how these would be handled
    const envValue = process.env[config.name] || config.defaultValue;

    if (envValue) {
      if (config.validation && !config.validation.test(envValue)) {
        console.info(`❌ Invalid value for ${config.name}: ${envValue}`);
        console.info(`   Expected pattern: ${config.validation.source}`);
      } else {
        console.info(`✅ Valid public environment variable: ${config.name}=${envValue}`);
      }
    } else if (config.required) {
      console.info(`❌ Missing required environment variable: ${config.name}`);
      console.info(`   Set with: export ${config.name}=<value>`);
    } else {
      console.info(`⚪ Optional environment variable not set: ${config.name}`);
    }
  }

  /**
   * Prompt for sensitive values (in real implementation, would be interactive)
   */
  private async promptForSensitiveValue(
    config: EnvironmentConfig,
    env: string,
    keyName: string
  ): Promise<void> {
    // For demo, generate example values
    let demoValue: string;

    switch (config.name) {
      case 'DATABASE_URL':
        demoValue = `postgresql://fire22_${env}:secure_pass_${Date.now()}@localhost:5432/fire22_${env}`;
        break;
      case 'FIRE22_API_TOKEN':
        demoValue = `f22_${env}_api_${Math.random().toString(36).substring(2, 15)}`;
        break;
      case 'TELEGRAM_BOT_TOKEN':
        demoValue = `${Math.floor(Math.random() * 1000000000)}:AAH${Math.random().toString(36).substring(2, 25)}`;
        break;
      case 'CLOUDFLARE_API_TOKEN':
        demoValue = `cf_${env}_${Math.random().toString(36).substring(2, 20)}`;
        break;
      case 'JWT_SECRET':
        demoValue =
          Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        break;
      default:
        demoValue = `secure_value_${Math.random().toString(36).substring(2, 15)}`;
    }

    console.info(`🔐 Storing secure credential for ${config.name}...`);
    await this.credManager.storeCredential(keyName, demoValue, `${config.description} (${env})`);
  }

  /**
   * Load environment from secure storage
   */
  async loadEnvironment(env: string = 'development'): Promise<Record<string, string>> {
    console.info(`🔄 Loading Fire22 environment: ${env.toUpperCase()}\n`);

    const environment: Record<string, string> = {};
    const errors: string[] = [];

    for (const config of this.environmentConfigs) {
      if (config.sensitive) {
        const keyName = `${config.name.toLowerCase()}_${env}`;
        const value = await this.credManager.getCredential(keyName);

        if (value) {
          environment[config.name] = value;
          console.info(`✅ Loaded ${config.name} from keychain`);
        } else if (config.required) {
          errors.push(`Missing required credential: ${config.name}`);
          console.info(`❌ Missing required credential: ${config.name}`);
        }
      } else {
        const value = process.env[config.name] || config.defaultValue;
        if (value) {
          environment[config.name] = value;
          console.info(`✅ Using ${config.name}=${value}`);
        } else if (config.required) {
          errors.push(`Missing required environment variable: ${config.name}`);
          console.info(`❌ Missing required variable: ${config.name}`);
        }
      }
    }

    if (errors.length > 0) {
      console.info('\n❌ Environment validation failed:');
      errors.forEach(error => console.info(`   • ${error}`));
      throw new Error('Environment validation failed');
    }

    console.info(
      `\n✅ Environment loaded successfully (${Object.keys(environment).length} variables)`
    );
    return environment;
  }

  /**
   * Migrate from .env to secure storage
   */
  async migrateFromDotEnv(envPath: string = '.env'): Promise<void> {
    console.info(`🔄 Migrating from ${envPath} to secure storage\n`);

    try {
      const envFile = Bun.file(envPath);
      if (!(await envFile.exists())) {
        console.info(`⚠️ File ${envPath} not found, skipping migration`);
        return;
      }

      const content = await envFile.text();
      const lines = content.split('\n');
      let migrated = 0;
      let skipped = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...valueParts] = trimmed.split('=');
        if (!key || valueParts.length === 0) continue;

        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        const config = this.environmentConfigs.find(c => c.name === key);

        if (config?.sensitive) {
          const keyName = `${key.toLowerCase()}_development`; // Default to dev env
          await this.credManager.storeCredential(keyName, value, `Migrated from ${envPath}`);
          console.info(`✅ Migrated ${key} to secure storage`);
          migrated++;
        } else {
          console.info(`⚪ Skipped ${key} (not sensitive)`);
          skipped++;
        }
      }

      console.info(`\n📊 Migration Summary:`);
      console.info(`   ✅ Migrated: ${migrated} sensitive credentials`);
      console.info(`   ⚪ Skipped: ${skipped} public variables`);
      console.info(`\n💡 Next steps:`);
      console.info(`   1. Verify credentials with: bun run loadEnvironment`);
      console.info(`   2. Remove sensitive values from ${envPath}`);
      console.info(`   3. Add ${envPath} to .gitignore`);
    } catch (error) {
      console.error(`❌ Migration failed: ${error}`);
    }
  }

  /**
   * Security audit of current environment
   */
  async auditEnvironment(): Promise<void> {
    console.info('🔍 Fire22 Environment Security Audit\n');

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for .env files in repository
    const envFiles = ['.env', '.env.local', '.env.production', '.env.staging'];
    for (const envFile of envFiles) {
      const file = Bun.file(envFile);
      if (await file.exists()) {
        try {
          const content = await file.text();
          const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /api[_-]?key/i];

          for (const pattern of sensitivePatterns) {
            if (pattern.test(content)) {
              issues.push(`Potential sensitive data in ${envFile}`);
              break;
            }
          }
        } catch (error) {
          warnings.push(`Could not read ${envFile}: ${error}`);
        }
      }
    }

    // Check environment variable security
    const processEnv = process.env;
    for (const config of this.environmentConfigs) {
      if (config.sensitive && processEnv[config.name]) {
        warnings.push(`Sensitive variable ${config.name} found in process.env`);
      }
    }

    // Generate audit report
    console.info('🛡️ Security Audit Results');
    console.info('='.repeat(30));

    if (issues.length === 0 && warnings.length === 0) {
      console.info('✅ No security issues found!');
    } else {
      if (issues.length > 0) {
        console.info(`\n🚨 Issues (${issues.length}):`);
        issues.forEach(issue => console.info(`   • ${issue}`));
      }

      if (warnings.length > 0) {
        console.info(`\n⚠️ Warnings (${warnings.length}):`);
        warnings.forEach(warning => console.info(`   • ${warning}`));
      }
    }

    console.info('\n💡 Security Best Practices:');
    console.info('   • Use Bun.secrets for all sensitive credentials');
    console.info('   • Keep .env files out of version control');
    console.info('   • Rotate credentials regularly');
    console.info('   • Use environment-specific credentials');
    console.info('   • Audit environment security monthly');
  }
}

// Demo execution
async function runSecureEnvDemo(): Promise<void> {
  console.info('🔐 Fire22 Secure Environment Manager Demo');
  console.info('='.repeat(50));

  const envManager = new SecureEnvironmentManager();

  try {
    // Setup development environment
    await envManager.setupEnvironment('development');

    console.info('\n' + '='.repeat(50));

    // Load environment
    const env = await envManager.loadEnvironment('development');
    console.info(`\n🎯 Loaded ${Object.keys(env).length} environment variables`);

    console.info('\n' + '='.repeat(50));

    // Security audit
    await envManager.auditEnvironment();
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }

  console.info('\n🎉 Secure Environment Demo Complete!');
  console.info('\n💡 Integration Benefits:');
  console.info('   • Zero plaintext secrets in code or config');
  console.info('   • OS-native credential encryption');
  console.info('   • Environment-specific credential isolation');
  console.info('   • Automated security auditing');
  console.info('   • Seamless Fire22 dashboard integration');
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'demo';

  const envManager = new SecureEnvironmentManager();

  switch (command) {
    case 'setup':
      await envManager.setupEnvironment(args[1] || 'development');
      break;
    case 'load':
      await envManager.loadEnvironment(args[1] || 'development');
      break;
    case 'migrate':
      await envManager.migrateFromDotEnv(args[1] || '.env');
      break;
    case 'audit':
      await envManager.auditEnvironment();
      break;
    case 'demo':
    default:
      await runSecureEnvDemo();
      break;
  }
}

export { SecureEnvironmentManager };
