/**
 * Timezone Configuration System
 * Domain-Driven Design Implementation
 *
 * Provides consistent timezone handling across all domains for:
 * - Financial reporting compliance
 * - Payment processing timestamps
 * - Cross-domain event consistency
 * - Regulatory requirements
 *
 * Integrates with EnvironmentConfiguration for runtime settings
 */

import { EnvironmentConfiguration } from './environment-configuration';

export enum SupportedTimezone {
  // Major financial hubs
  NEW_YORK = 'America/New_York',
  LONDON = 'Europe/London',
  TOKYO = 'Asia/Tokyo',
  SINGAPORE = 'Asia/Singapore',
  SYDNEY = 'Australia/Sydney',

  // UTC for consistency
  UTC = 'UTC',

  // CDT (Central Daylight Time) - as used in project
  CDT = 'America/Chicago',
}

export enum TimezoneContext {
  BUSINESS_OPERATIONS = 'business_operations',
  FINANCIAL_REPORTING = 'financial_reporting',
  REGULATORY_COMPLIANCE = 'regulatory_compliance',
  PAYMENT_PROCESSING = 'payment_processing',
  AUDIT_TRAIL = 'audit_trail',
  DOMAIN_EVENTS = 'domain_events',
  TESTING = 'testing',
}

export interface TimezoneConfiguration {
  timezone: SupportedTimezone;
  context: TimezoneContext;
  description: string;
  regulatoryCompliant: boolean;
  businessHours?: {
    start: number; // Hour in 24h format
    end: number;
    timezone: SupportedTimezone;
  };
}

/**
 * Timezone Configuration Registry
 * Centralizes timezone management for the entire domain system
 */
export class TimezoneConfigurationRegistry {
  private static instance: TimezoneConfigurationRegistry;
  private configurations: Map<TimezoneContext, TimezoneConfiguration> = new Map();

  private constructor() {
    this.initializeDefaultConfigurations();
  }

  static getInstance(): TimezoneConfigurationRegistry {
    if (!TimezoneConfigurationRegistry.instance) {
      TimezoneConfigurationRegistry.instance = new TimezoneConfigurationRegistry();
    }
    return TimezoneConfigurationRegistry.instance;
  }

  private initializeDefaultConfigurations(): void {
    // Business Operations - CDT (Central Time)
    this.configurations.set(TimezoneContext.BUSINESS_OPERATIONS, {
      timezone: SupportedTimezone.CDT,
      context: TimezoneContext.BUSINESS_OPERATIONS,
      description: 'Primary business operations timezone',
      regulatoryCompliant: true,
      businessHours: {
        start: 8, // 8 AM CDT
        end: 18, // 6 PM CDT
        timezone: SupportedTimezone.CDT,
      },
    });

    // Financial Reporting - UTC for consistency
    this.configurations.set(TimezoneContext.FINANCIAL_REPORTING, {
      timezone: SupportedTimezone.UTC,
      context: TimezoneContext.FINANCIAL_REPORTING,
      description: 'Financial reporting and regulatory compliance',
      regulatoryCompliant: true,
    });

    // Payment Processing - CDT for business operations
    this.configurations.set(TimezoneContext.PAYMENT_PROCESSING, {
      timezone: SupportedTimezone.CDT,
      context: TimezoneContext.PAYMENT_PROCESSING,
      description: 'Payment processing and collections',
      regulatoryCompliant: true,
      businessHours: {
        start: 0, // 24/7 processing
        end: 23,
        timezone: SupportedTimezone.CDT,
      },
    });

    // Domain Events - UTC for consistency
    this.configurations.set(TimezoneContext.DOMAIN_EVENTS, {
      timezone: SupportedTimezone.UTC,
      context: TimezoneContext.DOMAIN_EVENTS,
      description: 'Domain events and cross-domain communication',
      regulatoryCompliant: true,
    });

    // Testing - UTC for deterministic tests
    this.configurations.set(TimezoneContext.TESTING, {
      timezone: SupportedTimezone.UTC,
      context: TimezoneContext.TESTING,
      description: 'Test environment for deterministic behavior',
      regulatoryCompliant: false,
    });
  }

  getConfiguration(context: TimezoneContext): TimezoneConfiguration {
    const config = this.configurations.get(context);
    if (!config) {
      throw new Error(`No timezone configuration found for context: ${context}`);
    }
    return config;
  }

  setConfiguration(context: TimezoneContext, config: TimezoneConfiguration): void {
    this.configurations.set(context, config);
  }

  getAllConfigurations(): Map<TimezoneContext, TimezoneConfiguration> {
    return new Map(this.configurations);
  }
}

/**
 * Timezone Utility Functions
 * Provides timezone-aware date/time operations
 */
export class TimezoneUtils {
  private static registry = TimezoneConfigurationRegistry.getInstance();

  /**
   * Create a timezone-aware Date for a specific context
   */
  static createTimezoneAwareDate(context: TimezoneContext): Date {
    const config = this.registry.getConfiguration(context);
    return this.createDateInTimezone(config.timezone);
  }

  /**
   * Create a Date object in a specific timezone
   */
  static createDateInTimezone(timezone: SupportedTimezone): Date {
    // Set the process timezone temporarily
    const originalTZ = process.env.TZ;
    process.env.TZ = timezone;
    const date = new Date();

    // Restore original timezone
    if (originalTZ) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }

    return date;
  }

  /**
   * Format date for business context
   */
  static formatForBusiness(
    date: Date,
    context: TimezoneContext = TimezoneContext.BUSINESS_OPERATIONS
  ): string {
    const config = this.registry.getConfiguration(context);
    return this.formatDateInTimezone(date, config.timezone);
  }

  /**
   * Format date for financial reporting
   */
  static formatForFinancialReporting(date: Date): string {
    return this.formatDateInTimezone(date, SupportedTimezone.UTC);
  }

  /**
   * Format date in specific timezone
   */
  static formatDateInTimezone(date: Date, timezone: SupportedTimezone): string {
    const originalTZ = process.env.TZ;
    process.env.TZ = timezone;

    const formatted = date.toISOString();

    // Restore original timezone
    if (originalTZ) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }

    return formatted;
  }

  /**
   * Check if current time is within business hours for a context
   */
  static isBusinessHours(context: TimezoneContext = TimezoneContext.BUSINESS_OPERATIONS): boolean {
    const config = this.registry.getConfiguration(context);

    if (!config.businessHours) {
      return true; // If no business hours defined, assume always available
    }

    const now = this.createDateInTimezone(config.businessHours.timezone);
    const hour = now.getHours();

    return hour >= config.businessHours.start && hour <= config.businessHours.end;
  }

  /**
   * Get timezone information for display
   */
  static getTimezoneInfo(timezone: SupportedTimezone): {
    name: string;
    offset: string;
    description: string;
  } {
    const timezoneInfo = {
      [SupportedTimezone.UTC]: {
        name: 'UTC',
        offset: '+00:00',
        description: 'Coordinated Universal Time',
      },
      [SupportedTimezone.NEW_YORK]: {
        name: 'Eastern Time',
        offset: '-05:00/-04:00',
        description: 'Eastern Standard/Daylight Time',
      },
      [SupportedTimezone.LONDON]: {
        name: 'GMT/BST',
        offset: '+00:00/+01:00',
        description: 'Greenwich Mean Time / British Summer Time',
      },
      [SupportedTimezone.TOKYO]: {
        name: 'JST',
        offset: '+09:00',
        description: 'Japan Standard Time',
      },
      [SupportedTimezone.SINGAPORE]: {
        name: 'SGT',
        offset: '+08:00',
        description: 'Singapore Time',
      },
      [SupportedTimezone.SYDNEY]: {
        name: 'AEST/AEDT',
        offset: '+10:00/+11:00',
        description: 'Australian Eastern Standard/Daylight Time',
      },
      [SupportedTimezone.CDT]: {
        name: 'CDT',
        offset: '-05:00/-06:00',
        description: 'Central Daylight Time',
      },
    };

    return (
      timezoneInfo[timezone] || {
        name: timezone,
        offset: 'Unknown',
        description: 'Custom timezone',
      }
    );
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    return Object.values(SupportedTimezone).includes(timezone as SupportedTimezone);
  }

  /**
   * Get current timezone context information
   */
  static getCurrentContextInfo(): {
    context: TimezoneContext;
    timezone: SupportedTimezone;
    currentTime: Date;
    isBusinessHours: boolean;
    timezoneInfo: any;
  } {
    // Use EnvironmentConfiguration for context determination
    const envConfig = EnvironmentConfiguration.getInstance();

    return {
      context: envConfig.getCurrentTimezoneContext(),
      timezone: envConfig.getCurrentTimezone(),
      currentTime: this.createTimezoneAwareDate(envConfig.getCurrentTimezoneContext()),
      isBusinessHours: this.isBusinessHours(envConfig.getCurrentTimezoneContext()),
      timezoneInfo: this.getTimezoneInfo(envConfig.getCurrentTimezone()),
    };
  }
}

/**
 * Timezone Configuration for Tests
 * Ensures consistent timezone behavior in test environments
 */
export class TestTimezoneConfiguration {
  private static originalTZ: string | undefined;

  static setup(): void {
    // Store original timezone
    this.originalTZ = process.env.TZ;

    // Set to UTC for consistent test behavior (Bun default)
    process.env.TZ = SupportedTimezone.UTC;
  }

  static teardown(): void {
    // Restore original timezone
    if (this.originalTZ) {
      process.env.TZ = this.originalTZ;
    } else {
      delete process.env.TZ;
    }
  }

  static withTimezone<T>(timezone: SupportedTimezone, fn: () => T): T {
    const originalTZ = process.env.TZ;
    process.env.TZ = timezone;

    try {
      return fn();
    } finally {
      if (originalTZ) {
        process.env.TZ = originalTZ;
      } else {
        delete process.env.TZ;
      }
    }
  }
}

// Initialize timezone configuration on module load
TimezoneConfigurationRegistry.getInstance();
