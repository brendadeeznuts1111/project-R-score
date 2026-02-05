/**
 * Environment Configuration & Security Setup
 * 
 * Addresses HIGH priority environment configuration issues:
 * - Replace placeholder domains with production domain
 * - Add proper secrets management
 * - Environment validation script
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface EnvironmentConfig {
  domain: string;
  apiDomain: string;
  webhookUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    lightningNetwork: boolean;
    cashAppPremium: boolean;
    monitoring: boolean;
    webhooks: boolean;
  };
  security: {
    webhookSecret: string;
    apiKey: string;
    corsOrigins: string[];
    rateLimiting: boolean;
  };
  external: {
    cashAppApiKey?: string;
    lndRestUrl?: string;
    lndMacaroon?: string;
    monitoringService?: string;
  };
}

class EnvironmentManager {
  private static readonly PRODUCTION_DOMAIN = 'factory-wager.ai';
  private static readonly STAGING_DOMAIN = 'staging.factory-wager.ai';
  private static readonly DEVELOPMENT_DOMAIN = 'localhost:3000';
  
  private static readonly REQUIRED_ENV_VARS = [
    'FACTORY_WAGER_WEBHOOK_SECRET',
    'FACTORY_WAGER_API_KEY',
    'NODE_ENV'
  ];
  
  private static readonly OPTIONAL_ENV_VARS = [
    'CASHAPP_API_KEY',
    'LND_REST_URL',
    'LND_MACAROON',
    'MONITORING_SERVICE',
    'SENTRY_DSN',
    'DATADOG_API_KEY'
  ];

  /**
   * 🔧 Generate environment configuration
   */
  static generateConfig(): EnvironmentConfig {
    const env = process.env.NODE_ENV || 'development';
    
    const config: EnvironmentConfig = {
      // 🔴 FIXED: Replace placeholder domain with proper domain
      domain: this.getDomain(env),
      apiDomain: this.getApiDomain(env),
      webhookUrl: this.getWebhookUrl(env),
      environment: env as 'development' | 'staging' | 'production',
      
      features: {
        lightningNetwork: !!process.env.LND_REST_URL,
        cashAppPremium: !!process.env.CASHAPP_API_KEY,
        monitoring: !!process.env.MONITORING_SERVICE || !!process.env.SENTRY_DSN,
        webhooks: true
      },
      
      security: {
        webhookSecret: process.env.FACTORY_WAGER_WEBHOOK_SECRET || 'default-secret-change-in-production',
        apiKey: process.env.FACTORY_WAGER_API_KEY || 'default-api-key-change-in-production',
        corsOrigins: this.getCorsOrigins(env),
        rateLimiting: env !== 'development'
      },
      
      external: {
        cashAppApiKey: process.env.CASHAPP_API_KEY,
        lndRestUrl: process.env.LND_REST_URL,
        lndMacaroon: process.env.LND_MACAROON,
        monitoringService: process.env.MONITORING_SERVICE
      }
    };
    
    return config;
  }

  /**
   * 🌐 Get domain based on environment
   */
  private static getDomain(env: string): string {
    switch (env) {
      case 'production':
        return this.PRODUCTION_DOMAIN;
      case 'staging':
        return this.STAGING_DOMAIN;
      default:
        return this.DEVELOPMENT_DOMAIN;
    }
  }

  /**
   * 🔗 Get API domain based on environment
   */
  private static getApiDomain(env: string): string {
    switch (env) {
      case 'production':
        return `api.${this.PRODUCTION_DOMAIN}`;
      case 'staging':
        return `api.${this.STAGING_DOMAIN}`;
      default:
        return this.DEVELOPMENT_DOMAIN;
    }
  }

  /**
   * 🪝 Get webhook URL based on environment
   */
  private static getWebhookUrl(env: string): string {
    const protocol = env === 'production' ? 'https' : 'http';
    const domain = this.getDomain(env);
    return `${protocol}://${domain}/webhook/payment`;
  }

  /**
   * 🌐 Get CORS origins based on environment
   */
  private static getCorsOrigins(env: string): string[] {
    switch (env) {
      case 'production':
        return [
          `https://${this.PRODUCTION_DOMAIN}`,
          `https://app.${this.PRODUCTION_DOMAIN}`,
          `https://api.${this.PRODUCTION_DOMAIN}`
        ];
      case 'staging':
        return [
          `https://${this.STAGING_DOMAIN}`,
          `https://app.${this.STAGING_DOMAIN}`,
          `https://api.${this.STAGING_DOMAIN}`,
          'http://localhost:3000',
          'http://localhost:5173'
        ];
      default:
        return [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8080'
        ];
    }
  }

  /**
   * ✅ Validate environment configuration
   */
  static validateEnvironment(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    config: EnvironmentConfig;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = this.generateConfig();

    // Check required environment variables
    for (const envVar of this.REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Security checks
    if (config.environment === 'production') {
      if (config.security.webhookSecret === 'default-secret-change-in-production') {
        errors.push('FACTORY_WAGER_WEBHOOK_SECRET must be changed from default in production');
      }
      
      if (config.security.apiKey === 'default-api-key-change-in-production') {
        errors.push('FACTORY_WAGER_API_KEY must be changed from default in production');
      }
      
      if (!config.security.webhookSecret || config.security.webhookSecret.length < 32) {
        errors.push('FACTORY_WAGER_WEBHOOK_SECRET must be at least 32 characters in production');
      }
      
      if (config.domain.includes('localhost') || config.domain.includes('your-app.com')) {
        errors.push('Domain cannot be localhost or your-app.com in production');
      }
    }

    // Feature warnings
    if (!config.features.lightningNetwork) {
      warnings.push('Lightning Network support is disabled (LND_REST_URL not set)');
    }
    
    if (!config.features.cashAppPremium) {
      warnings.push('Cash App premium features are disabled (CASHAPP_API_KEY not set)');
    }
    
    if (!config.features.monitoring) {
      warnings.push('Monitoring is disabled (MONITORING_SERVICE not set)');
    }

    // External service validation
    if (config.external.lndRestUrl && !config.external.lndMacaroon) {
      warnings.push('LND REST URL is set but LND_MACAROON is missing');
    }
    
    if (config.external.lndMacaroon && !config.external.lndRestUrl) {
      warnings.push('LND macaroon is set but LND_REST_URL is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }

  /**
   * 📝 Generate .env file template
   */
  static generateEnvTemplate(env: 'development' | 'staging' | 'production' = 'development'): string {
    const config = this.generateConfig();
    
    const template = `# FactoryWager Payment System Environment Configuration
# Environment: ${env.toUpperCase()}
# Generated on: ${new Date().toISOString()}

# Core Configuration
NODE_ENV=${env}
FACTORY_WAGER_DOMAIN=${config.domain}
FACTORY_WAGER_API_DOMAIN=${config.apiDomain}
FACTORY_WAGER_WEBHOOK_URL=${config.webhookUrl}

# Security (REQUIRED)
FACTORY_WAGER_WEBHOOK_SECRET=${config.security.webhookSecret}
FACTORY_WAGER_API_KEY=${config.security.apiKey}

# Cash App Integration (Optional - Premium Features)
CASHAPP_API_KEY=${config.external.cashAppApiKey || ''}
CASHAPP_WEBHOOK_SECRET=${config.security.webhookSecret}

# Lightning Network Integration (Optional)
LND_REST_URL=${config.external.lndRestUrl || ''}
LND_MACAROON=${config.external.lndMacaroon || ''}

# Monitoring & Observability (Optional)
MONITORING_SERVICE=${config.external.monitoringService || ''}
SENTRY_DSN=${process.env.SENTRY_DSN || ''}
DATADOG_API_KEY=${process.env.DATADOG_API_KEY || ''}

# Database Configuration
DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://localhost/factory-wager'}
REDIS_URL=${process.env.REDIS_URL || 'redis://localhost:6379'}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGINS=${config.security.corsOrigins.join(',')}

# Feature Flags
ENABLE_LIGHTNING_NETWORK=${config.features.lightningNetwork}
ENABLE_CASHAPP_PREMIUM=${config.features.cashAppPremium}
ENABLE_MONITORING=${config.features.monitoring}
ENABLE_WEBHOOKS=${config.features.webhooks}

# Logging
LOG_LEVEL=${env === 'production' ? 'info' : 'debug'}
LOG_FORMAT=json

# Session Configuration
SESSION_SECRET=${config.security.webhookSecret}
SESSION_EXPIRY_MS=3600000

# Payment Configuration
DEFAULT_TTL_MS=900000
MAX_PAYMENT_AMOUNT=10000
MIN_PAYMENT_AMOUNT=1

# Currency Configuration
DEFAULT_CURRENCY=USD
SUPPORTED_CURRENCIES=USD,EUR,GBP

# Bitcoin Configuration
BITCOIN_NETWORK=mainnet
BITCOIN_FEE_SAT_PER_BYTE=10
LIGHTNING_FEE_SAT_MSAT=1000
`;

    return template;
  }

  /**
   * 🔧 Replace placeholder domains in configuration files
   */
  static replacePlaceholderDomains(): void {
    const filesToUpdate = [
      'src/@automation/visual-flows/venmo-oauth-flow.ts',
      'src/@payment/qr-payment-system.ts',
      'src/@payment/quest-router.ts',
      'docs/archive/completion-reports/VISUAL_FLOWS_COMPLETE.md'
    ];

    const replacements = [
      {
        from: 'your-app.com',
        to: this.PRODUCTION_DOMAIN
      },
      {
        from: 'localhost:3000',
        to: this.PRODUCTION_DOMAIN
      },
      {
        from: 'https://your-app.com',
        to: `https://${this.PRODUCTION_DOMAIN}`
      },
      {
        from: 'http://your-app.com',
        to: `https://${this.PRODUCTION_DOMAIN}`
      }
    ];

    for (const filePath of filesToUpdate) {
      if (existsSync(filePath)) {
        let content = readFileSync(filePath, 'utf-8');
        
        for (const replacement of replacements) {
          content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
        }
        
        writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Updated domains in ${filePath}`);
      }
    }
  }

  /**
   * 🔐 Generate secure secrets
   */
  static generateSecureSecret(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * 🚀 Setup environment for deployment
   */
  static setupEnvironment(env: 'development' | 'staging' | 'production'): void {
    console.log(`🔧 Setting up ${env} environment...`);
    
    // Validate environment
    const validation = this.validateEnvironment();
    
    if (!validation.valid) {
      console.error('❌ Environment validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    // Show warnings
    if (validation.warnings.length > 0) {
      console.log('⚠️  Environment warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Replace placeholder domains
    if (env === 'production') {
      console.log('🔄 Replacing placeholder domains...');
      this.replacePlaceholderDomains();
    }
    
    // Generate .env file if it doesn't exist
    const envFile = `.env.${env}`;
    if (!existsSync(envFile)) {
      console.log(`📝 Generating ${envFile}...`);
      const template = this.generateEnvTemplate(env);
      writeFileSync(envFile, template, 'utf-8');
      console.log(`✅ Created ${envFile}`);
    }
    
    console.log(`✅ ${env} environment setup complete!`);
  }

  /**
   * 📊 Get environment summary
   */
  static getEnvironmentSummary(): {
    environment: string;
    domain: string;
    features: Record<string, boolean>;
    security: Record<string, boolean>;
    external: Record<string, boolean>;
  } {
    const config = this.generateConfig();
    
    return {
      environment: config.environment,
      domain: config.domain,
      features: {
        lightningNetwork: config.features.lightningNetwork,
        cashAppPremium: config.features.cashAppPremium,
        monitoring: config.features.monitoring,
        webhooks: config.features.webhooks
      },
      security: {
        webhookSecretSet: config.security.webhookSecret !== 'default-secret-change-in-production',
        apiKeySet: config.security.apiKey !== 'default-api-key-change-in-production',
        rateLimitingEnabled: config.security.rateLimiting,
        corsConfigured: config.security.corsOrigins.length > 0
      },
      external: {
        cashAppConnected: !!config.external.cashAppApiKey,
        lightningConnected: !!(config.external.lndRestUrl && config.external.lndMacaroon),
        monitoringConnected: !!config.external.monitoringService
      }
    };
  }
}

// CLI interface for environment management
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] as 'development' | 'staging' | 'production' || 'development';
  
  switch (command) {
    case 'setup':
      EnvironmentManager.setupEnvironment(environment);
      break;
      
    case 'validate':
      const validation = EnvironmentManager.validateEnvironment();
      console.log('Environment Validation Results:');
      console.log(`Valid: ${validation.valid}`);
      
      if (validation.errors.length > 0) {
        console.log('\nErrors:');
        validation.errors.forEach(error => console.log(`  ❌ ${error}`));
      }
      
      if (validation.warnings.length > 0) {
        console.log('\nWarnings:');
        validation.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
      }
      break;
      
    case 'summary':
      const summary = EnvironmentManager.getEnvironmentSummary();
      console.log('Environment Summary:');
      console.log(JSON.stringify(summary, null, 2));
      break;
      
    case 'generate-env':
      const template = EnvironmentManager.generateEnvTemplate(environment);
      console.log(template);
      break;
      
    case 'generate-secret':
      const secret = EnvironmentManager.generateSecureSecret(64);
      console.log(`Generated secure secret: ${secret}`);
      break;
      
    default:
      console.log('Available commands:');
      console.log('  setup [env]     - Setup environment configuration');
      console.log('  validate        - Validate current environment');
      console.log('  summary         - Show environment summary');
      console.log('  generate-env    - Generate .env template');
      console.log('  generate-secret - Generate secure secret');
      break;
  }
}

export default EnvironmentManager;
export type { EnvironmentConfig };
