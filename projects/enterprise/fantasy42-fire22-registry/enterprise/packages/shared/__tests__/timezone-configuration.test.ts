/**
 * Timezone Configuration Tests
 * Domain-Driven Design Implementation
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  TimezoneConfigurationRegistry,
  TimezoneUtils,
  TestTimezoneConfiguration,
  SupportedTimezone,
  TimezoneContext,
} from '../timezone-configuration';
import { EnvironmentConfiguration } from '../environment-configuration';

describe('Timezone Configuration System', () => {
  let registry: TimezoneConfigurationRegistry;

  beforeEach(() => {
    registry = TimezoneConfigurationRegistry.getInstance();
    TestTimezoneConfiguration.setup();
    // Reset environment configuration singleton for clean test state
    (EnvironmentConfiguration as any).instance = null;
  });

  afterEach(() => {
    TestTimezoneConfiguration.teardown();
    // Reset singleton after each test
    (EnvironmentConfiguration as any).instance = null;
  });

  test('TimezoneConfigurationRegistry provides singleton instance', () => {
    const instance1 = TimezoneConfigurationRegistry.getInstance();
    const instance2 = TimezoneConfigurationRegistry.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(TimezoneConfigurationRegistry);
  });

  test('Registry initializes with default configurations', () => {
    const configs = registry.getAllConfigurations();

    expect(configs.size).toBeGreaterThan(0);
    expect(configs.has(TimezoneContext.BUSINESS_OPERATIONS)).toBe(true);
    expect(configs.has(TimezoneContext.FINANCIAL_REPORTING)).toBe(true);
    expect(configs.has(TimezoneContext.TESTING)).toBe(true);
  });

  test('Can retrieve configuration by context', () => {
    const businessConfig = registry.getConfiguration(TimezoneContext.BUSINESS_OPERATIONS);

    expect(businessConfig.timezone).toBe(SupportedTimezone.CDT);
    expect(businessConfig.regulatoryCompliant).toBe(true);
    expect(businessConfig.businessHours).toBeDefined();
  });

  test('Throws error for unknown context', () => {
    expect(() => {
      registry.getConfiguration('unknown' as TimezoneContext);
    }).toThrow('No timezone configuration found');
  });

  test('Can set custom configuration', () => {
    const customConfig = {
      timezone: SupportedTimezone.NEW_YORK,
      context: TimezoneContext.BUSINESS_OPERATIONS,
      description: 'Custom Eastern Time configuration',
      regulatoryCompliant: true,
    };

    registry.setConfiguration(TimezoneContext.BUSINESS_OPERATIONS, customConfig);

    const retrieved = registry.getConfiguration(TimezoneContext.BUSINESS_OPERATIONS);
    expect(retrieved.timezone).toBe(SupportedTimezone.NEW_YORK);
    expect(retrieved.description).toBe('Custom Eastern Time configuration');
  });
});

describe('TimezoneUtils', () => {
  beforeEach(() => {
    TestTimezoneConfiguration.setup();
    // Reset environment configuration singleton for clean test state
    (EnvironmentConfiguration as any).instance = null;
  });

  afterEach(() => {
    TestTimezoneConfiguration.teardown();
    // Reset singleton after each test
    (EnvironmentConfiguration as any).instance = null;
  });

  test('Creates timezone-aware date for context', () => {
    const date = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.TESTING);

    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  test('Formats date for business context', () => {
    const testDate = new Date('2024-01-15T12:00:00Z');
    const formatted = TimezoneUtils.formatForBusiness(testDate, TimezoneContext.TESTING);

    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024-01-15');
  });

  test('Formats date for financial reporting (UTC)', () => {
    const testDate = new Date('2024-01-15T12:00:00Z');
    const formatted = TimezoneUtils.formatForFinancialReporting(testDate);

    expect(typeof formatted).toBe('string');
    expect(formatted).toBe('2024-01-15T12:00:00.000Z');
  });

  test('Validates supported timezones', () => {
    expect(TimezoneUtils.isValidTimezone(SupportedTimezone.UTC)).toBe(true);
    expect(TimezoneUtils.isValidTimezone(SupportedTimezone.CDT)).toBe(true);
    expect(TimezoneUtils.isValidTimezone('Invalid/Timezone')).toBe(false);
  });

  test('Provides timezone information', () => {
    const utcInfo = TimezoneUtils.getTimezoneInfo(SupportedTimezone.UTC);

    expect(utcInfo.name).toBe('UTC');
    expect(utcInfo.offset).toBe('+00:00');
    expect(utcInfo.description).toContain('Universal');

    const cdtInfo = TimezoneUtils.getTimezoneInfo(SupportedTimezone.CDT);

    expect(cdtInfo.name).toBe('CDT');
    expect(cdtInfo.offset).toBe('-05:00/-06:00');
    expect(cdtInfo.description).toContain('Central');
  });

  test('Determines business hours', () => {
    // For testing context, should always return true since no business hours defined
    const isBusinessHours = TimezoneUtils.isBusinessHours(TimezoneContext.TESTING);
    expect(typeof isBusinessHours).toBe('boolean');
  });

  test('Provides current context information', () => {
    // Explicitly set NODE_ENV for this test
    process.env.NODE_ENV = 'test';
    (EnvironmentConfiguration as any).instance = null; // Reset singleton

    const contextInfo = TimezoneUtils.getCurrentContextInfo();

    expect(contextInfo.context).toBe(TimezoneContext.TESTING); // Should be testing in test environment
    expect(contextInfo.timezone).toBe(SupportedTimezone.UTC);
    expect(contextInfo.currentTime).toBeInstanceOf(Date);
    expect(typeof contextInfo.isBusinessHours).toBe('boolean');
    expect(contextInfo.timezoneInfo).toBeDefined();
  });
});

describe('TestTimezoneConfiguration', () => {
  test('Sets up and tears down timezone correctly', () => {
    const originalTZ = process.env.TZ;

    TestTimezoneConfiguration.setup();
    expect(process.env.TZ).toBe(SupportedTimezone.UTC);

    TestTimezoneConfiguration.teardown();
    expect(process.env.TZ).toBe(originalTZ);
  });

  test('Executes function with specific timezone', () => {
    const result = TestTimezoneConfiguration.withTimezone(SupportedTimezone.NEW_YORK, () => {
      return process.env.TZ;
    });

    expect(result).toBe(SupportedTimezone.NEW_YORK);
  });

  test('Restores original timezone after withTimezone', () => {
    const originalTZ = process.env.TZ;

    TestTimezoneConfiguration.withTimezone(SupportedTimezone.TOKYO, () => {
      // Do nothing
    });

    expect(process.env.TZ).toBe(originalTZ);
  });
});

describe('Timezone Integration Scenarios', () => {
  beforeEach(() => {
    TestTimezoneConfiguration.setup();
    // Reset environment configuration singleton for clean test state
    (EnvironmentConfiguration as any).instance = null;
  });

  afterEach(() => {
    TestTimezoneConfiguration.teardown();
    // Reset singleton after each test
    (EnvironmentConfiguration as any).instance = null;
  });

  test('Payment processing uses consistent timezone', () => {
    // Simulate payment creation timing
    const paymentTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.PAYMENT_PROCESSING);
    const formattedTime = TimezoneUtils.formatForBusiness(
      paymentTime,
      TimezoneContext.PAYMENT_PROCESSING
    );

    expect(paymentTime).toBeInstanceOf(Date);
    expect(typeof formattedTime).toBe('string');
  });

  test('Financial reporting uses UTC for consistency', () => {
    const reportTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.FINANCIAL_REPORTING);
    const utcFormatted = TimezoneUtils.formatForFinancialReporting(reportTime);

    expect(reportTime).toBeInstanceOf(Date);
    expect(utcFormatted).toContain('Z'); // UTC indicator
  });

  test('Domain events use consistent timezone', () => {
    const eventTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.DOMAIN_EVENTS);
    const eventFormatted = TimezoneUtils.formatDateInTimezone(eventTime, SupportedTimezone.UTC);

    expect(eventTime).toBeInstanceOf(Date);
    expect(eventFormatted).toContain('Z');
  });
});
