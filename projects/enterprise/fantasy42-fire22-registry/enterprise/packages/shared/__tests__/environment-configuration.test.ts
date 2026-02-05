/**
 * Environment Configuration Tests
 * Domain-Driven Design Implementation
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  EnvironmentConfiguration,
  EnvironmentConfigurationFactory,
  SupportedTimezone,
  TimezoneContext,
} from '../environment-configuration';
import { SupportedTimezone as TZSupportedTimezone } from '../timezone-configuration';

// Environment configuration tests for domain-driven architecture

describe('Environment Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment for clean tests
    delete process.env.NODE_ENV;
    delete process.env.BUN_ENV;
    delete process.env.TZ;
    delete process.env.BUN_TIMEZONE;
    delete process.env.DATABASE_URL;
    delete process.env.FANTASY402_API_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.MAX_BET_AMOUNT;
    delete process.env.MIN_BET_AMOUNT;
    delete process.env.FEATURE_ADVANCED_ANALYTICS;

    // Reset the singleton instance for each test
    (EnvironmentConfiguration as any).instance = null;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Reset singleton after each test
    (EnvironmentConfiguration as any).instance = null;
  });

  test('EnvironmentConfiguration provides singleton instance', () => {
    const instance1 = EnvironmentConfiguration.getInstance();
    const instance2 = EnvironmentConfiguration.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(EnvironmentConfiguration);
  });

  test('loads default development configuration', () => {
    const config = EnvironmentConfiguration.getInstance();

    expect(config.app.env).toBe('development');
    expect(config.app.isDevelopment).toBe(true);
    expect(config.app.isProduction).toBe(false);
    expect(config.app.isTest).toBe(false);
    expect(config.app.port).toBe(3000);
  });

  test('loads production configuration from environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.app.env).toBe('production');
    expect(config.app.isDevelopment).toBe(false);
    expect(config.app.isProduction).toBe(true);
    expect(config.app.port).toBe(8080);
  });

  test('loads timezone configuration', () => {
    process.env.BUN_TIMEZONE = 'America/New_York';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.timezone.default).toBe(SupportedTimezone.NEW_YORK);
  });

  test('falls back to TZ environment variable for timezone', () => {
    process.env.TZ = 'Europe/London';
    delete process.env.BUN_TIMEZONE;

    const config = EnvironmentConfiguration.getInstance();

    expect(config.timezone.default).toBe(SupportedTimezone.LONDON);
  });

  test('uses default timezone when invalid timezone provided', () => {
    process.env.BUN_TIMEZONE = 'Invalid/Timezone';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.timezone.default).toBe(SupportedTimezone.CDT); // default
  });

  test('loads database configuration', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/fire22';
    process.env.DB_CONNECTION_POOL_SIZE = '20';
    process.env.DB_CONNECTION_TIMEOUT = '45000';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.database.url).toBe('postgresql://localhost:5432/fire22');
    expect(config.database.connectionPoolSize).toBe(20);
    expect(config.database.connectionTimeout).toBe(45000);
  });

  test('loads external services configuration', () => {
    process.env.FANTASY402_API_URL = 'https://staging.fantasy402.com';
    process.env.FANTASY402_API_KEY = 'test_api_key';
    process.env.FANTASY402_TIMEOUT = '45000';
    process.env.PAYMENT_PROCESSOR_API_KEY = 'payment_key';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.externalServices.fantasy402.apiUrl).toBe('https://staging.fantasy402.com');
    expect(config.externalServices.fantasy402.apiKey).toBe('test_api_key');
    expect(config.externalServices.fantasy402.timeout).toBe(45000);
    expect(config.externalServices.paymentProcessor.apiKey).toBe('payment_key');
  });

  test('loads security configuration', () => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_EXPIRY = '12h';
    process.env.ENCRYPTION_KEY = 'test_encryption_key';
    process.env.CORS_ORIGINS = 'http://localhost:3000,https://app.fire22.ag';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.security.jwtSecret).toBe('test_jwt_secret');
    expect(config.security.jwtExpiry).toBe('12h');
    expect(config.security.encryptionKey).toBe('test_encryption_key');
    expect(config.security.corsOrigins).toEqual(['http://localhost:3000', 'https://app.fire22.ag']);
  });

  test('loads business rules configuration', () => {
    process.env.MAX_BET_AMOUNT = '50000';
    process.env.MIN_BET_AMOUNT = '10';
    process.env.CREDIT_LIMIT_MULTIPLIER = '10';
    process.env.RISK_SCORE_THRESHOLD = '80';
    process.env.MANUAL_REVIEW_THRESHOLD = '10000';
    process.env.AUTO_SETTLEMENT_ENABLED = 'false';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.businessRules.maxBetAmount).toBe(50000);
    expect(config.businessRules.minBetAmount).toBe(10);
    expect(config.businessRules.creditLimitMultiplier).toBe(10);
    expect(config.businessRules.riskScoreThreshold).toBe(80);
    expect(config.businessRules.manualReviewThreshold).toBe(10000);
    expect(config.businessRules.autoSettlementEnabled).toBe(false);
  });

  test('loads feature flags', () => {
    process.env.FEATURE_ADVANCED_ANALYTICS = 'false';
    process.env.FEATURE_REAL_TIME_REPORTING = 'true';
    process.env.FEATURE_MULTI_CURRENCY = 'false';
    process.env.FEATURE_AUTO_SETTLEMENT = 'true';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.featureFlags.advancedAnalytics).toBe(false);
    expect(config.featureFlags.realTimeReporting).toBe(true);
    expect(config.featureFlags.multiCurrency).toBe(false);
    expect(config.featureFlags.autoSettlement).toBe(true);
  });

  test('validates configuration correctly', () => {
    // Test with missing required values
    process.env.FANTASY402_API_KEY = '';
    process.env.JWT_SECRET = 'default_jwt_secret_change_in_production';
    process.env.ENCRYPTION_KEY = 'default_encryption_key_change_in_production';

    const config = EnvironmentConfiguration.getInstance();
    const validation = config.validateConfiguration();

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors).toContain('FANTASY402_API_KEY is required');
    expect(validation.errors).toContain('JWT_SECRET must be configured for production');
  });

  test('passes validation with proper configuration', () => {
    process.env.FANTASY402_API_KEY = 'valid_api_key';
    process.env.JWT_SECRET = 'proper_jwt_secret';
    process.env.ENCRYPTION_KEY = 'proper_encryption_key';

    const config = EnvironmentConfiguration.getInstance();
    const validation = config.validateConfiguration();

    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('provides configuration summary', () => {
    process.env.NODE_ENV = 'production';
    process.env.FEATURE_ADVANCED_ANALYTICS = 'false';
    process.env.MAX_BET_AMOUNT = '50000';

    const config = EnvironmentConfiguration.getInstance();
    const summary = config.getConfigurationSummary();

    expect(summary.environment).toBe('production');
    expect(summary.database.type).toBe('sqlite');
    expect(summary.businessRules.betLimits).toBe('1 - 50000');
  });

  test('determines timezone context based on environment', () => {
    // Test development environment
    process.env.NODE_ENV = 'development';
    (EnvironmentConfiguration as any).instance = null; // Reset singleton
    let config = EnvironmentConfiguration.getInstance();
    expect(config.timezone.context).toBe(TimezoneContext.BUSINESS_OPERATIONS);

    // Test production environment
    process.env.NODE_ENV = 'production';
    (EnvironmentConfiguration as any).instance = null; // Reset singleton
    config = EnvironmentConfiguration.getInstance();
    expect(config.timezone.context).toBe(TimezoneContext.FINANCIAL_REPORTING);

    // Test test environment
    process.env.NODE_ENV = 'test';
    (EnvironmentConfiguration as any).instance = null; // Reset singleton
    config = EnvironmentConfiguration.getInstance();
    expect(config.timezone.context).toBe(TimezoneContext.TESTING);
  });

  test('EnvironmentConfigurationFactory creates and validates configuration', () => {
    process.env.FANTASY402_API_KEY = 'valid_key';
    process.env.JWT_SECRET = 'valid_secret';
    process.env.ENCRYPTION_KEY = 'valid_key';

    const config = EnvironmentConfigurationFactory.create();

    expect(config).toBeInstanceOf(EnvironmentConfiguration);
    expect(config.app.env).toBe('development');
  });

  test('isFeatureEnabled method works correctly', () => {
    process.env.FEATURE_ADVANCED_ANALYTICS = 'true';
    process.env.FEATURE_REAL_TIME_REPORTING = 'false';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.isFeatureEnabled('advancedAnalytics')).toBe(true);
    expect(config.isFeatureEnabled('realTimeReporting')).toBe(false);
  });

  test('getCurrentTimezone and getCurrentTimezoneContext work', () => {
    process.env.BUN_TIMEZONE = 'America/New_York';
    process.env.NODE_ENV = 'production';

    const config = EnvironmentConfiguration.getInstance();

    expect(config.getCurrentTimezone()).toBe(SupportedTimezone.NEW_YORK);
    expect(config.getCurrentTimezoneContext()).toBe(TimezoneContext.FINANCIAL_REPORTING);
  });
});
