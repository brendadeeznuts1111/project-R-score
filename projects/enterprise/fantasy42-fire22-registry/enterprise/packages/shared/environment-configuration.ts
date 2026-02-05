/**
 * Environment Configuration System
 * Domain-Driven Design Implementation
 *
 * Provides centralized environment variable management with validation
 * and type safety for the entire domain system.
 */

import { TimezoneUtils, SupportedTimezone, TimezoneContext } from './timezone-configuration';

// Re-export timezone types for convenience
export { SupportedTimezone, TimezoneContext };

export interface DatabaseConfig {
  url: string;
  connectionPoolSize: number;
  connectionTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ExternalServiceConfig {
  fantasy402: {
    apiUrl: string;
    apiKey: string;
    timeout: number;
    retryAttempts: number;
  };
  paymentProcessor: {
    apiUrl: string;
    apiKey: string;
    webhookSecret: string;
    timeout: number;
  };
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: string;
  encryptionKey: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface BusinessRulesConfig {
  maxBetAmount: number;
  minBetAmount: number;
  creditLimitMultiplier: number;
  riskScoreThreshold: number;
  manualReviewThreshold: number;
  autoSettlementEnabled: boolean;
}

export interface MonitoringConfig {
  healthCheckInterval: number;
  metricsRetentionDays: number;
  alertEmailRecipients: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
  logFilePath: string;
}

export interface FeatureFlags {
  advancedAnalytics: boolean;
  realTimeReporting: boolean;
  multiCurrency: boolean;
  autoSettlement: boolean;
  enhancedRiskAssessment: boolean;
  auditTrail: boolean;
}

export class EnvironmentConfiguration {
  private static instance: EnvironmentConfiguration;
  private config: {
    app: {
      env: string;
      isDevelopment: boolean;
      isProduction: boolean;
      isTest: boolean;
      port: number;
    };
    timezone: {
      default: SupportedTimezone;
      context: TimezoneContext;
    };
    database: DatabaseConfig;
    externalServices: ExternalServiceConfig;
    security: SecurityConfig;
    businessRules: BusinessRulesConfig;
    monitoring: MonitoringConfig;
    featureFlags: FeatureFlags;
  };

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): EnvironmentConfiguration {
    if (!EnvironmentConfiguration.instance) {
      EnvironmentConfiguration.instance = new EnvironmentConfiguration();
    }
    return EnvironmentConfiguration.instance;
  }

  private loadConfiguration() {
    const nodeEnv = this.getEnvString('NODE_ENV', 'development');
    const bunEnv = this.getEnvString('BUN_ENV', nodeEnv);

    return {
      app: {
        env: nodeEnv,
        isDevelopment: nodeEnv === 'development',
        isProduction: nodeEnv === 'production',
        isTest: nodeEnv === 'test',
        port: this.getEnvNumber('PORT', 3000),
      },
      timezone: {
        default: this.getEnvTimezone('BUN_TIMEZONE', 'TZ', 'America/Chicago' as SupportedTimezone),
        context: this.getTimezoneContext(nodeEnv),
      },
      database: this.loadDatabaseConfig(),
      externalServices: this.loadExternalServicesConfig(),
      security: this.loadSecurityConfig(),
      businessRules: this.loadBusinessRulesConfig(),
      monitoring: this.loadMonitoringConfig(),
      featureFlags: this.loadFeatureFlags(),
    };
  }

  private getEnvString(key: string, defaultValue: string): string {
    return Bun.env[key] || process.env[key] || defaultValue;
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = Bun.env[key] || process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = Bun.env[key] || process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private getEnvTimezone(
    primaryKey: string,
    fallbackKey: string,
    defaultValue: SupportedTimezone
  ): SupportedTimezone {
    const primaryValue = Bun.env[primaryKey] || process.env[primaryKey];
    const fallbackValue = Bun.env[fallbackKey] || process.env[fallbackKey];

    const timezoneValue = primaryValue || fallbackValue || defaultValue;

    // Simple validation without TimezoneUtils to avoid circular dependency
    const validTimezones = [
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
      'UTC',
      'America/Chicago',
    ];

    if (validTimezones.includes(timezoneValue)) {
      return timezoneValue as SupportedTimezone;
    }

    console.warn(`Invalid timezone "${timezoneValue}", using default "${defaultValue}"`);
    return defaultValue;
  }

  private getTimezoneContext(nodeEnv: string): TimezoneContext {
    switch (nodeEnv) {
      case 'test':
        return 'testing' as TimezoneContext;
      case 'production':
        return 'financial_reporting' as TimezoneContext;
      default:
        return 'business_operations' as TimezoneContext;
    }
  }

  private loadDatabaseConfig(): DatabaseConfig {
    return {
      url: this.getEnvString('DATABASE_URL', 'sqlite://./financial-reporting-demo.db'),
      connectionPoolSize: this.getEnvNumber('DB_CONNECTION_POOL_SIZE', 10),
      connectionTimeout: this.getEnvNumber('DB_CONNECTION_TIMEOUT', 30000),
      maxRetries: this.getEnvNumber('DB_MAX_RETRIES', 3),
      retryDelay: this.getEnvNumber('DB_RETRY_DELAY', 1000),
    };
  }

  private loadExternalServicesConfig(): ExternalServiceConfig {
    return {
      fantasy402: {
        apiUrl: this.getEnvString('FANTASY402_API_URL', 'https://api.fantasy402.com'),
        apiKey: this.getEnvString('FANTASY402_API_KEY', ''),
        timeout: this.getEnvNumber('FANTASY402_TIMEOUT', 30000),
        retryAttempts: this.getEnvNumber('FANTASY402_RETRY_ATTEMPTS', 3),
      },
      paymentProcessor: {
        apiUrl: this.getEnvString('PAYMENT_PROCESSOR_URL', 'https://api.payment-processor.com'),
        apiKey: this.getEnvString('PAYMENT_PROCESSOR_API_KEY', ''),
        webhookSecret: this.getEnvString('PAYMENT_WEBHOOK_SECRET', ''),
        timeout: this.getEnvNumber('PAYMENT_TIMEOUT', 15000),
      },
    };
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.getEnvString('JWT_SECRET', 'default_jwt_secret_change_in_production'),
      jwtExpiry: this.getEnvString('JWT_EXPIRY', '24h'),
      encryptionKey: this.getEnvString(
        'ENCRYPTION_KEY',
        'default_encryption_key_change_in_production'
      ),
      corsOrigins: this.getEnvString('CORS_ORIGINS', 'http://localhost:3000').split(','),
      rateLimit: {
        windowMs: this.getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
        maxRequests: this.getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      },
    };
  }

  private loadBusinessRulesConfig(): BusinessRulesConfig {
    return {
      maxBetAmount: this.getEnvNumber('MAX_BET_AMOUNT', 10000),
      minBetAmount: this.getEnvNumber('MIN_BET_AMOUNT', 1),
      creditLimitMultiplier: this.getEnvNumber('CREDIT_LIMIT_MULTIPLIER', 5),
      riskScoreThreshold: this.getEnvNumber('RISK_SCORE_THRESHOLD', 75),
      manualReviewThreshold: this.getEnvNumber('MANUAL_REVIEW_THRESHOLD', 5000),
      autoSettlementEnabled: this.getEnvBoolean('AUTO_SETTLEMENT_ENABLED', true),
    };
  }

  private loadMonitoringConfig(): MonitoringConfig {
    return {
      healthCheckInterval: this.getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
      metricsRetentionDays: this.getEnvNumber('METRICS_RETENTION_DAYS', 30),
      alertEmailRecipients: this.getEnvString('ALERT_EMAIL_RECIPIENTS', 'admin@fire22.ag').split(
        ','
      ),
      logLevel: this.getEnvString('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
      logFormat: this.getEnvString('LOG_FORMAT', 'json') as 'json' | 'text',
      logFilePath: this.getEnvString('LOG_FILE_PATH', './logs/app.log'),
    };
  }

  private loadFeatureFlags(): FeatureFlags {
    return {
      advancedAnalytics: this.getEnvBoolean('FEATURE_ADVANCED_ANALYTICS', true),
      realTimeReporting: this.getEnvBoolean('FEATURE_REAL_TIME_REPORTING', false),
      multiCurrency: this.getEnvBoolean('FEATURE_MULTI_CURRENCY', true),
      autoSettlement: this.getEnvBoolean('FEATURE_AUTO_SETTLEMENT', true),
      enhancedRiskAssessment: this.getEnvBoolean('FEATURE_ENHANCED_RISK_ASSESSMENT', true),
      auditTrail: this.getEnvBoolean('FEATURE_AUDIT_TRAIL', true),
    };
  }

  // Public getters
  get app() {
    return this.config.app;
  }
  get timezone() {
    return this.config.timezone;
  }
  get database() {
    return this.config.database;
  }
  get externalServices() {
    return this.config.externalServices;
  }
  get security() {
    return this.config.security;
  }
  get businessRules() {
    return this.config.businessRules;
  }
  get monitoring() {
    return this.config.monitoring;
  }
  get featureFlags() {
    return this.config.featureFlags;
  }

  // Utility methods
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.featureFlags[feature];
  }

  getCurrentTimezone(): SupportedTimezone {
    return this.config.timezone.default;
  }

  getCurrentTimezoneContext(): TimezoneContext {
    return this.config.timezone.context;
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required configurations
    if (!this.config.externalServices.fantasy402.apiKey) {
      errors.push('FANTASY402_API_KEY is required');
    }

    if (
      !this.config.security.jwtSecret ||
      this.config.security.jwtSecret === 'default_jwt_secret_change_in_production'
    ) {
      errors.push('JWT_SECRET must be configured for production');
    }

    if (
      !this.config.security.encryptionKey ||
      this.config.security.encryptionKey === 'default_encryption_key_change_in_production'
    ) {
      errors.push('ENCRYPTION_KEY must be configured for production');
    }

    // Validate business rules
    if (this.config.businessRules.maxBetAmount <= this.config.businessRules.minBetAmount) {
      errors.push('MAX_BET_AMOUNT must be greater than MIN_BET_AMOUNT');
    }

    if (this.config.businessRules.manualReviewThreshold >= this.config.businessRules.maxBetAmount) {
      errors.push('MANUAL_REVIEW_THRESHOLD should be less than MAX_BET_AMOUNT');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Configuration summary for debugging
  getConfigurationSummary(): Record<string, any> {
    return {
      environment: this.config.app.env,
      timezone: this.config.timezone.default,
      database: {
        type: this.config.database.url.startsWith('sqlite') ? 'sqlite' : 'other',
        poolSize: this.config.database.connectionPoolSize,
      },
      features: Object.entries(this.config.featureFlags)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      businessRules: {
        betLimits: `${this.config.businessRules.minBetAmount} - ${this.config.businessRules.maxBetAmount}`,
        riskThreshold: this.config.businessRules.riskScoreThreshold,
        autoSettlement: this.config.businessRules.autoSettlementEnabled,
      },
    };
  }
}

/**
 * Environment Configuration Factory
 * Creates and validates environment configuration
 */
export class EnvironmentConfigurationFactory {
  static create(): EnvironmentConfiguration {
    const config = EnvironmentConfiguration.getInstance();

    // Validate configuration in production
    if (config.app.isProduction) {
      const validation = config.validateConfiguration();
      if (!validation.isValid) {
        throw new Error(
          `Environment configuration validation failed:\n${validation.errors.join('\n')}`
        );
      }
    }

    return config;
  }

  static createForTesting(overrides: Partial<any> = {}): EnvironmentConfiguration {
    // For testing, we could create a mock configuration
    // For now, just return the real configuration
    return EnvironmentConfiguration.getInstance();
  }
}

// Global configuration instance
export const envConfig = EnvironmentConfigurationFactory.create();
