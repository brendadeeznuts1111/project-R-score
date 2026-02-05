#!/usr/bin/env bun

/**
 * 🔐 Fire22 Telegram Environment Configuration
 *
 * Environment variables, secrets, and configuration management
 * for the complete Fire22 Telegram integration system
 */

import { z } from 'zod';

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🔐 ENVIRONMENT SCHEMA VALIDATION
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

const TelegramEnvSchema = z.object({
  // Telegram Bot Configuration
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Group Configuration
  TELEGRAM_CASHIER_GROUP_ID: z.string().optional(),
  TELEGRAM_P2P_QUEUE_GROUP_ID: z.string().optional(),
  TELEGRAM_TRANSACTION_CHANNEL_ID: z.string().optional(),
  TELEGRAM_SUPPORT_GROUP_ID: z.string().optional(),

  // Database Configuration
  DATABASE_URL: z.string().optional(),
  DB: z.any().optional(), // For Cloudflare D1 binding

  // Fire22 API Configuration
  FIRE22_API_URL: z.string().url().default('https://api.fire22.ag'),
  FIRE22_API_KEY: z.string().optional(),
  FIRE22_AGENT_TOKEN: z.string().optional(),

  // Queue System Configuration
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),
  QUEUE_MATCH_TIMEOUT: z.coerce.number().default(300000), // 5 minutes
  QUEUE_CLEANUP_INTERVAL: z.coerce.number().default(3600000), // 1 hour

  // Security Configuration
  JWT_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  SESSION_TIMEOUT: z.coerce.number().default(3600000), // 1 hour

  // Performance Configuration
  TRANSLATION_CACHE_SIZE: z.coerce.number().default(1000),
  TRANSLATION_CACHE_TTL: z.coerce.number().default(3600000), // 1 hour
  RATE_LIMIT_COMMANDS: z.coerce.number().default(20),
  RATE_LIMIT_MESSAGES: z.coerce.number().default(10),

  // Feature Flags
  ENABLE_MULTILINGUAL: z.coerce.boolean().default(true),
  ENABLE_P2P_MATCHING: z.coerce.boolean().default(true),
  ENABLE_DEPARTMENT_WORKFLOWS: z.coerce.boolean().default(true),
  ENABLE_NOTIFICATIONS: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(true),

  // Environment Specific
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Cloudflare Workers Specific
  CF_ZONE_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),

  // Monitoring & Analytics
  SENTRY_DSN: z.string().optional(),
  ANALYTICS_API_KEY: z.string().optional(),
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000), // 30 seconds
});

export type TelegramEnv = z.infer<typeof TelegramEnvSchema>;

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🔧 ENVIRONMENT CONFIGURATION
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export class TelegramEnvironment {
  private static instance: TelegramEnvironment;
  private config: TelegramEnv;

  private constructor(env: any) {
    this.config = this.validateEnvironment(env);
  }

  static getInstance(env?: any): TelegramEnvironment {
    if (!TelegramEnvironment.instance) {
      TelegramEnvironment.instance = new TelegramEnvironment(env || process.env);
    }
    return TelegramEnvironment.instance;
  }

  private validateEnvironment(env: any): TelegramEnv {
    try {
      return TelegramEnvSchema.parse(env);
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      throw new Error('Invalid environment configuration');
    }
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🎯 CONFIGURATION GETTERS
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  get botToken(): string {
    return this.config.TELEGRAM_BOT_TOKEN;
  }

  get webhookUrl(): string | undefined {
    return this.config.TELEGRAM_WEBHOOK_URL;
  }

  get webhookSecret(): string | undefined {
    return this.config.TELEGRAM_WEBHOOK_SECRET;
  }

  get cashierGroupId(): string | undefined {
    return this.config.TELEGRAM_CASHIER_GROUP_ID;
  }

  get p2pQueueGroupId(): string | undefined {
    return this.config.TELEGRAM_P2P_QUEUE_GROUP_ID;
  }

  get transactionChannelId(): string | undefined {
    return this.config.TELEGRAM_TRANSACTION_CHANNEL_ID;
  }

  get supportGroupId(): string | undefined {
    return this.config.TELEGRAM_SUPPORT_GROUP_ID;
  }

  get databaseUrl(): string | undefined {
    return this.config.DATABASE_URL;
  }

  get database(): any {
    return this.config.DB;
  }

  get fire22ApiUrl(): string {
    return this.config.FIRE22_API_URL;
  }

  get fire22ApiKey(): string | undefined {
    return this.config.FIRE22_API_KEY;
  }

  get fire22AgentToken(): string | undefined {
    return this.config.FIRE22_AGENT_TOKEN;
  }

  get queueConfig() {
    return {
      maxRetries: this.config.QUEUE_MAX_RETRIES,
      matchTimeout: this.config.QUEUE_MATCH_TIMEOUT,
      cleanupInterval: this.config.QUEUE_CLEANUP_INTERVAL,
    };
  }

  get securityConfig() {
    return {
      jwtSecret: this.config.JWT_SECRET,
      encryptionKey: this.config.ENCRYPTION_KEY,
      sessionTimeout: this.config.SESSION_TIMEOUT,
    };
  }

  get performanceConfig() {
    return {
      translationCacheSize: this.config.TRANSLATION_CACHE_SIZE,
      translationCacheTtl: this.config.TRANSLATION_CACHE_TTL,
      rateLimitCommands: this.config.RATE_LIMIT_COMMANDS,
      rateLimitMessages: this.config.RATE_LIMIT_MESSAGES,
    };
  }

  get featureFlags() {
    return {
      enableMultilingual: this.config.ENABLE_MULTILINGUAL,
      enableP2pMatching: this.config.ENABLE_P2P_MATCHING,
      enableDepartmentWorkflows: this.config.ENABLE_DEPARTMENT_WORKFLOWS,
      enableNotifications: this.config.ENABLE_NOTIFICATIONS,
      enableMetrics: this.config.ENABLE_METRICS,
    };
  }

  get environment(): string {
    return this.config.ENVIRONMENT;
  }

  get logLevel(): string {
    return this.config.LOG_LEVEL;
  }

  get isDevelopment(): boolean {
    return this.config.ENVIRONMENT === 'development';
  }

  get isProduction(): boolean {
    return this.config.ENVIRONMENT === 'production';
  }

  get cloudflareConfig() {
    return {
      zoneId: this.config.CF_ZONE_ID,
      apiToken: this.config.CF_API_TOKEN,
    };
  }

  get monitoringConfig() {
    return {
      sentryDsn: this.config.SENTRY_DSN,
      analyticsApiKey: this.config.ANALYTICS_API_KEY,
      healthCheckInterval: this.config.HEALTH_CHECK_INTERVAL,
    };
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🔍 VALIDATION HELPERS
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  validateRequiredSecrets(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.config.TELEGRAM_BOT_TOKEN) {
      missing.push('TELEGRAM_BOT_TOKEN');
    }

    if (this.isProduction) {
      if (!this.config.FIRE22_API_KEY) {
        missing.push('FIRE22_API_KEY');
      }
      if (!this.config.JWT_SECRET) {
        missing.push('JWT_SECRET');
      }
      if (!this.config.ENCRYPTION_KEY) {
        missing.push('ENCRYPTION_KEY');
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 CONFIGURATION SUMMARY
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  getConfigSummary() {
    return {
      environment: this.environment,
      features: {
        multilingual: this.featureFlags.enableMultilingual,
        p2pMatching: this.featureFlags.enableP2pMatching,
        departmentWorkflows: this.featureFlags.enableDepartmentWorkflows,
        notifications: this.featureFlags.enableNotifications,
        metrics: this.featureFlags.enableMetrics,
      },
      performance: {
        translationCacheSize: this.performanceConfig.translationCacheSize,
        rateLimitCommands: this.performanceConfig.rateLimitCommands,
        rateLimitMessages: this.performanceConfig.rateLimitMessages,
      },
      queue: {
        maxRetries: this.queueConfig.maxRetries,
        matchTimeout: this.queueConfig.matchTimeout / 1000 + 's',
        cleanupInterval: this.queueConfig.cleanupInterval / 1000 + 's',
      },
      integrations: {
        fire22: !!this.fire22ApiKey,
        database: !!this.database || !!this.databaseUrl,
        webhook: !!this.webhookUrl,
        cloudflare: !!this.cloudflareConfig.zoneId,
        monitoring: !!this.monitoringConfig.sentryDsn,
      },
    };
  }
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🏭 FACTORY FUNCTIONS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export function createTelegramEnvironment(env?: any): TelegramEnvironment {
  return TelegramEnvironment.getInstance(env);
}

export function validateTelegramEnvironment(env: any): TelegramEnv {
  return TelegramEnvSchema.parse(env);
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 📋 ENVIRONMENT TEMPLATE
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export const ENVIRONMENT_TEMPLATE = `
# !==!==!==!==!==!==!==!==!==!==!==!==!==!====
# 🔥📱 Fire22 Telegram Bot Environment Configuration
# !==!==!==!==!==!==!==!==!==!==!==!==!==!====

# Telegram Bot Configuration (REQUIRED)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Group Configuration
TELEGRAM_CASHIER_GROUP_ID=your_cashier_group_id
TELEGRAM_P2P_QUEUE_GROUP_ID=your_p2p_queue_group_id
TELEGRAM_TRANSACTION_CHANNEL_ID=your_transaction_channel_id
TELEGRAM_SUPPORT_GROUP_ID=your_support_group_id

# Database Configuration
DATABASE_URL=sqlite:./data/fire22.db
# For Cloudflare Workers, DB binding is handled automatically

# Fire22 API Configuration
FIRE22_API_URL=https://api.fire22.ag
FIRE22_API_KEY=your_fire22_api_key
FIRE22_AGENT_TOKEN=your_fire22_agent_token

# Queue System Configuration
QUEUE_MAX_RETRIES=3
QUEUE_MATCH_TIMEOUT=300000
QUEUE_CLEANUP_INTERVAL=3600000

# Security Configuration
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
SESSION_TIMEOUT=3600000

# Performance Configuration
TRANSLATION_CACHE_SIZE=1000
TRANSLATION_CACHE_TTL=3600000
RATE_LIMIT_COMMANDS=20
RATE_LIMIT_MESSAGES=10

# Feature Flags
ENABLE_MULTILINGUAL=true
ENABLE_P2P_MATCHING=true
ENABLE_DEPARTMENT_WORKFLOWS=true
ENABLE_NOTIFICATIONS=true
ENABLE_METRICS=true

# Environment Configuration
ENVIRONMENT=development
LOG_LEVEL=info

# Cloudflare Workers Configuration (Production)
CF_ZONE_ID=your_cloudflare_zone_id
CF_API_TOKEN=your_cloudflare_api_token

# Monitoring & Analytics
SENTRY_DSN=your_sentry_dsn
ANALYTICS_API_KEY=your_analytics_api_key
HEALTH_CHECK_INTERVAL=30000
`;

export default TelegramEnvironment;
