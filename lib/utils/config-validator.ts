/**
 * Configuration Validation Utilities
 *
 * Provides comprehensive configuration validation with type safety,
 * environment variable validation, and schema validation.
 */

import { logger } from './logger';
import { ErrorHandler } from './error-handler';

export interface ConfigValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'port' | 'path';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  default?: any;
  description?: string;
  envVar?: string;
}

export interface ConfigSchema {
  [key: string]: ConfigValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, any>;
}

/**
 * Configuration validator with comprehensive validation rules
 */
export class ConfigValidator {
  private static instance: ConfigValidator;
  private validatedConfigs: Map<string, ValidationResult> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  /**
   * Validate configuration against schema
   */
  validate(
    config: Record<string, any>,
    schema: ConfigSchema,
    context?: { module?: string; environment?: string }
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedConfig: Record<string, any> = { ...config };

    logger.info('Starting configuration validation', {
      module: context?.module,
      configKeys: Object.keys(schema),
    });

    for (const [key, rule] of Object.entries(schema)) {
      const value = config[key];
      const envVar = rule.envVar || key.toUpperCase();

      try {
        // Check if required
        if (rule.required && (value === undefined || value === null)) {
          // Try to get from environment
          const envValue = process.env[envVar] || Bun.env[envVar];
          if (envValue !== undefined) {
            validatedConfig[key] = envValue;
            logger.debug(`Using environment variable for ${key}`, {
              module: context?.module,
              envVar,
            });
          } else if (rule.default !== undefined) {
            validatedConfig[key] = rule.default;
            logger.debug(`Using default value for ${key}`, {
              module: context?.module,
              defaultValue: rule.default,
            });
          } else {
            errors.push(`${key} is required but not provided`);
            continue;
          }
        }

        // Use the (possibly updated) value
        const finalValue = validatedConfig[key];

        // Skip validation if value is undefined and not required
        if (finalValue === undefined && !rule.required) {
          continue;
        }

        // Type validation
        if (rule.type && !this.validateType(finalValue, rule.type)) {
          errors.push(`${key} must be of type ${rule.type}`);
          continue;
        }

        // String validations
        if (rule.type === 'string' && typeof finalValue === 'string') {
          if (rule.minLength !== undefined && finalValue.length < rule.minLength) {
            errors.push(`${key} must be at least ${rule.minLength} characters long`);
          }
          if (rule.maxLength !== undefined && finalValue.length > rule.maxLength) {
            errors.push(`${key} must be no more than ${rule.maxLength} characters long`);
          }
        }

        // Number validations
        if (rule.type === 'number' && typeof finalValue === 'number') {
          if (rule.min !== undefined && finalValue < rule.min) {
            errors.push(`${key} must be at least ${rule.min}`);
          }
          if (rule.max !== undefined && finalValue > rule.max) {
            errors.push(`${key} must be no more than ${rule.max}`);
          }
        }

        // Pattern validation
        if (rule.pattern && typeof finalValue === 'string' && !rule.pattern.test(finalValue)) {
          errors.push(`${key} does not match required pattern`);
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(finalValue)) {
          errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
        }

        // Specific type validations
        if (rule.type === 'url' && typeof finalValue === 'string') {
          const urlValidation = this.validateURL(finalValue);
          if (!urlValidation.isValid) {
            errors.push(`${key} must be a valid URL: ${urlValidation.errors.join(', ')}`);
          }
        }

        if (rule.type === 'email' && typeof finalValue === 'string') {
          const emailValidation = this.validateEmail(finalValue);
          if (!emailValidation.isValid) {
            errors.push(`${key} must be a valid email address`);
          }
        }

        if (rule.type === 'port' && typeof finalValue === 'number') {
          if (finalValue < 1 || finalValue > 65535) {
            errors.push(`${key} must be a valid port number (1-65535)`);
          }
        }

        if (rule.type === 'path' && typeof finalValue === 'string') {
          const pathValidation = this.validatePath(finalValue);
          if (!pathValidation.isValid) {
            errors.push(`${key} must be a valid file path: ${pathValidation.errors.join(', ')}`);
          }
        }
      } catch (error) {
        const errorMsg = ErrorHandler.handle(error, {
          module: 'ConfigValidator',
          function: 'validate',
          operation: 'config-validation',
          configKey: key,
        });
        errors.push(`Failed to validate ${key}: ${errorMsg.message}`);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      config: validatedConfig,
    };

    // Log validation results
    if (result.isValid) {
      logger.info('Configuration validation passed', {
        module: context?.module,
        configKeys: Object.keys(validatedConfig),
      });
    } else {
      logger.error('Configuration validation failed', {
        module: context?.module,
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return result;
  }

  /**
   * Validate value type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'url':
      case 'email':
      case 'port':
      case 'path':
        return typeof value === 'string' || typeof value === 'number';
      default:
        return true;
    }
  }

  /**
   * Validate URL
   */
  private validateURL(value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const url = new URL(value);
      const allowedProtocols = ['http:', 'https:'];

      if (!allowedProtocols.includes(url.protocol)) {
        errors.push('Only HTTP and HTTPS URLs are allowed');
      }

      return { isValid: errors.length === 0, errors };
    } catch {
      errors.push('Invalid URL format');
      return { isValid: false, errors };
    }
  }

  /**
   * Validate email
   */
  private validateEmail(value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)) {
      errors.push('Invalid email format');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate file path
   */
  private validatePath(value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for path traversal
    if (value.includes('..')) {
      errors.push('Path traversal not allowed');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(value)) {
      errors.push('Path contains invalid characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get cached validation result
   */
  getCachedResult(key: string): ValidationResult | undefined {
    return this.validatedConfigs.get(key);
  }

  /**
   * Cache validation result
   */
  cacheResult(key: string, result: ValidationResult): void {
    this.validatedConfigs.set(key, result);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validatedConfigs.clear();
  }
}

// Predefined schemas for common configurations
export const COMMON_SCHEMAS = {
  server: {
    port: {
      type: 'port' as const,
      required: true,
      min: 1,
      max: 65535,
      description: 'Server port number',
      envVar: 'PORT',
    },
    host: {
      type: 'string' as const,
      required: false,
      default: process.env.SERVER_HOST || process.env.HOST || 'localhost',
      description: 'Server host',
      envVar: 'HOST',
    },
    environment: {
      type: 'string' as const,
      required: false,
      default: 'development',
      enum: ['development', 'staging', 'production'],
      description: 'Environment',
      envVar: 'NODE_ENV',
    },
  },

  database: {
    url: {
      type: 'url' as const,
      required: true,
      description: 'Database connection URL',
      envVar: 'DATABASE_URL',
    },
    ssl: {
      type: 'boolean' as const,
      required: false,
      default: false,
      description: 'Use SSL for database connection',
      envVar: 'DATABASE_SSL',
    },
    timeout: {
      type: 'number' as const,
      required: false,
      default: 30000,
      min: 1000,
      max: 300000,
      description: 'Database connection timeout (ms)',
      envVar: 'DATABASE_TIMEOUT',
    },
  },

  security: {
    sessionSecret: {
      type: 'string' as const,
      required: true,
      minLength: 16,
      description: 'Session secret key',
      envVar: 'SESSION_SECRET',
    },
    jwtSecret: {
      type: 'string' as const,
      required: false,
      minLength: 32,
      description: 'JWT signing secret',
      envVar: 'JWT_SECRET',
    },
    corsOrigins: {
      type: 'string' as const,
      required: false,
      default: '*',
      description: 'CORS allowed origins',
      envVar: 'CORS_ORIGINS',
    },
  },
};

// Export singleton instance
export const configValidator = ConfigValidator.getInstance();

/**
 * Convenience function for configuration validation
 */
export function validateConfig(
  config: Record<string, any>,
  schema: ConfigSchema,
  context?: { module?: string; environment?: string }
): ValidationResult {
  return configValidator.validate(config, schema, context);
}
