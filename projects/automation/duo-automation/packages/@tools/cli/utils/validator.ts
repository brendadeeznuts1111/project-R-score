/**
 * packages/cli/utils/validator.ts
 * Input validation with comprehensive error messages and recovery suggestions
 * Follows .clinerules TypeScript strict compliance
 */

import { ValidationError } from '../types/errors';
import type { Logger } from './logger';

export interface ValidationRule {
  name: string;
  test: (value: unknown) => boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validator - Input validation with comprehensive error handling
 * Compliant with .clinerules type safety and error handling standards
 */
export class Validator {
  private logger?: Logger;
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Register validation rule for a field
   */
  addRule(field: string, rule: ValidationRule): void {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule);
  }

  /**
   * Validate a single value against all registered rules
   */
  validate(field: string, value: unknown): ValidationResult {
    const fieldRules = this.rules.get(field) || [];
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const rule of fieldRules) {
      try {
        if (!rule.test(value)) {
          result.valid = false;
          result.errors.push(`${field}: ${rule.message}`);
          this.logger?.warn(`Validation failed for ${field}`, { rule: rule.name, value });
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(
          `${field}: Error during validation - ${error instanceof Error ? error.message : String(error)}`
        );
        this.logger?.error(`Validation error for ${field}`, { error });
      }
    }

    return result;
  }

  /**
   * Validate an object against rules
   */
  validateObject(obj: Record<string, unknown>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const [field, value] of Object.entries(obj)) {
      const fieldResult = this.validate(field, value);
      result.valid = result.valid && fieldResult.valid;
      result.errors.push(...fieldResult.errors);
      result.warnings.push(...fieldResult.warnings);
    }

    return result;
  }

  /**
   * Validate string input
   */
  static isString(value: unknown, minLength = 1, maxLength = Infinity): boolean {
    return (
      typeof value === 'string' &&
      value.length >= minLength &&
      value.length <= maxLength
    );
  }

  /**
   * Validate number input
   */
  static isNumber(value: unknown, min = -Infinity, max = Infinity): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
  }

  /**
   * Validate integer input
   */
  static isInteger(value: unknown, min = -Infinity, max = Infinity): boolean {
    return Number.isInteger(value) && Validator.isNumber(value, min, max);
  }

  /**
   * Validate boolean input
   */
  static isBoolean(value: unknown): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Validate email format
   */
  static isEmail(value: unknown): boolean {
    if (!Validator.isString(value)) return false;
    // RFC 5322 simplified pattern
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value as string);
  }

  /**
   * Validate URL format
   */
  static isUrl(value: unknown): boolean {
    if (!Validator.isString(value)) return false;
    try {
      new URL(value as string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate UUID format (v4)
   */
  static isUuid(value: unknown): boolean {
    if (!Validator.isString(value)) return false;
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return pattern.test(value as string);
  }

  /**
   * Validate enum value
   */
  static isEnum<T>(value: unknown, enumValues: readonly T[]): value is T {
    return enumValues.includes(value as T);
  }

  /**
   * Validate array of values
   */
  static isArray<T>(
    value: unknown,
    validator?: (item: unknown) => item is T,
    minLength = 0,
    maxLength = Infinity
  ): value is T[] {
    if (!Array.isArray(value)) return false;
    if (value.length < minLength || value.length > maxLength) return false;
    
    if (validator) {
      return value.every(v => validator(v));
    }
    
    return true;
  }

  /**
   * Validate object shape
   */
  static isObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  /**
   * Validate IANA timezone name (strict compliance with v3.7 baseline)
   */
  static isIanaTimezone(value: unknown): boolean {
    if (!Validator.isString(value)) return false;
    
    // Canonical IANA zones (no legacy links per .clinerules)
    const canonicalZones = new Set([
      // UTC
      'UTC', 'GMT', 'Etc/UTC',
      // Americas
      'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Anchorage', 'America/Honolulu',
      'America/Toronto', 'America/Mexico_City', 'America/Buenos_Aires',
      // Europe
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
      'Europe/Moscow', 'Europe/Istanbul',
      // Asia
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
      'Asia/Bangkok', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
      // Australia
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
      // Africa
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos'
    ]);
    
    return canonicalZones.has(value as string);
  }

  /**
   * Validate scope value
   */
  static isScope(value: unknown): boolean {
    const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
    if (!Validator.isString(value)) return false;
    return validScopes.includes(value as string);
  }

  /**
   * Validate platform value
   */
  static isPlatform(value: unknown): boolean {
    const validPlatforms = ['Darwin', 'Linux', 'Windows_NT'];
    if (!Validator.isString(value)) return false;
    return validPlatforms.includes(value as string);
  }

  /**
   * Validate log level value
   */
  static isLogLevel(value: unknown): boolean {
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!Validator.isString(value)) return false;
    return validLevels.includes(value as string);
  }

  /**
   * Validate secrets configuration
   */
  static isSecretsConfig(value: unknown): boolean {
    if (!Validator.isObject(value)) return false;
    
    const config = value as Record<string, unknown>;
    
    // Check required fields
    if (!Validator.isString(config.service)) return false;
    if (config.encrypted !== undefined && !Validator.isBoolean(config.encrypted)) return false;
    if (config.persist !== undefined && !Validator.isString(config.persist)) return false;
    
    return true;
  }

  /**
   * Validate command name
   */
  static isCommandName(value: unknown): boolean {
    if (!Validator.isString(value)) return false;
    // Allow lowercase, numbers, hyphens
    const pattern = /^[a-z0-9-]+$/;
    return pattern.test(value as string);
  }

  /**
   * Sanitize string input (remove dangerous characters)
   */
  static sanitizeString(value: string, maxLength = 1000): string {
    if (!Validator.isString(value)) {
      throw new ValidationError(
        'Cannot sanitize non-string value',
        { value, type: typeof value }
      );
    }

    return value
      .slice(0, maxLength)
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Validate and extract port number
   */
  static parsePort(value: unknown): number {
    if (!Validator.isNumber(value)) {
      throw new ValidationError(
        'Port must be a number',
        { value }
      );
    }

    if (!(value as number >= 1 && value <= 65535)) {
      throw new ValidationError(
        'Port must be between 1 and 65535',
        { value }
      );
    }

    return value as number;
  }

  /**
   * Validate and extract timeout value (ms)
   */
  static parseTimeout(value: unknown, min = 100, max = 600000): number {
    if (!Validator.isNumber(value)) {
      throw new ValidationError(
        'Timeout must be a number',
        { value }
      );
    }

    const timeout = value as number;
    if (timeout < min || timeout > max) {
      throw new ValidationError(
        `Timeout must be between ${min}ms and ${max}ms`,
        { value, min, max }
      );
    }

    return timeout;
  }

  /**
   * Create comprehensive validation error with suggestions
   */
  throwValidationError(
    context: string,
    errors: string[],
    suggestions?: string[]
  ): never {
    const message = `${context}: ${errors.join('; ')}`;
    throw new ValidationError(message, {
      context,
      errors,
      suggestions
    });
  }
}

/**
 * Global validator instance
 */
let globalValidator: Validator;

export function getGlobalValidator(): Validator {
  if (!globalValidator) {
    globalValidator = new Validator();
  }
  return globalValidator;
}

export function setGlobalValidator(validator: Validator): void {
  globalValidator = validator;
}

export function resetGlobalValidator(): void {
  globalValidator = new Validator();
}