/**
 * Enterprise Validation System
 * 
 * Comprehensive validation utilities for enterprise-grade
 * input validation, type checking, and constraint enforcement.
 * 
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { Validator, EnterpriseResult, SafeString, Base64String, HexString, UUID, ISO8601String } from './core-types';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { EnterpriseErrorCode, createValidationError } from './core-errors';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: string[];
}

/**
 * Detailed validation result with field-level errors
 */
export interface DetailedValidationResult extends ValidationResult {
  readonly fieldErrors: Map<string, ValidationError[]>;
  readonly validFields: Set<string>;
}

/**
 * Validation rule configuration
 */
export interface ValidationRule<T = unknown> {
  readonly name: string;
  readonly validator: Validator<T>;
  readonly message?: string;
  readonly severity?: 'error' | 'warning';
  readonly required?: boolean;
}

// ============================================================================
// CORE VALIDATORS
// ============================================================================

/**
 * String validators
 */

/**
 * Check if string matches regex pattern
 */
const matchesPattern = (pattern: RegExp): Validator<string> => {
  return (value: string): boolean => pattern.test(value);
};

export const StringValidators = {
  /**
   * Check if value is a non-empty string
   */
  isNonEmpty: (value: unknown): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  /**
   * Check if string matches regex pattern
   */
  matchesPattern,

  /**
   * Check if string length is within bounds
   */
  hasLength: (min: number, max?: number): Validator<string> => {
    return (value: string): boolean => {
      const length = value.length;
      return length >= min && (max === undefined || length <= max);
    };
  },

  /**
   * Check if string is a valid email
   */
  isEmail: (value: string): boolean => 
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),

  /**
   * Check if string is a valid URL
   */
  isURL: (value: string): boolean =>
    /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/.test(value),

  /**
   * Check if string is a valid UUID
   */
  isUUID: (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),

  /**
   * Check if string is valid base64
   */
  isBase64: (value: string): boolean =>
    /^[A-Za-z0-9+/]*={0,2}$/.test(value),

  /**
   * Check if string is valid hex
   */
  isHex: (value: string): boolean =>
    /^[0-9a-fA-F]+$/.test(value),

  /**
   * Check if string is valid ISO8601 date
   */
  isISO8601: (value: string): boolean =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value)
};

/**
 * Number validators
 */
export const NumberValidators = {
  /**
   * Check if value is a finite number
   */
  isFinite: (value: unknown): boolean => {
    return typeof value === 'number' && Number.isFinite(value);
  },

  /**
   * Check if number is within range
   */
  isInRange: (min: number, max: number): Validator<number> => {
    return (value: number): boolean => value >= min && value <= max;
  },

  /**
   * Check if number is positive
   */
  isPositive: (value: number): boolean => value > 0,

  /**
   * Check if number is non-negative
   */
  isNonNegative: (value: number): boolean => value >= 0,

  /**
   * Check if number is an integer
   */
  isInteger: (value: number): boolean => Number.isInteger(value),

  /**
   * Check if number is divisible by divisor
   */
  isDivisibleBy: (divisor: number): Validator<number> => {
    return (value: number): boolean => value % divisor === 0;
  }
};

/**
 * Array validators
 */
export const ArrayValidators = {
  /**
   * Check if value is an array
   */
  isArray: (value: unknown): boolean => Array.isArray(value),

  /**
   * Check if array length is within bounds
   */
  hasLength: (min: number, max?: number): Validator<unknown[]> => {
    return (value: unknown[]): boolean => {
      const length = value.length;
      return length >= min && (max === undefined || length <= max);
    };
  },

  /**
   * Check if all items pass validator
   */
  allItemsPass: <T>(itemValidator: Validator<T>): Validator<T[]> => {
    return (value: T[]): boolean => value.every(itemValidator);
  },

  /**
   * Check if any items pass validator
   */
  anyItemsPass: <T>(itemValidator: Validator<T>): Validator<T[]> => {
    return (value: T[]): boolean => value.some(itemValidator);
  },

  /**
   * Check if array has unique items
   */
  hasUniqueItems: <T>(keySelector?: (item: T) => unknown): Validator<T[]> => {
    return (value: T[]): boolean => {
      const seen = new Set();
      for (const item of value) {
        const key = keySelector ? keySelector(item) : item;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    };
  }
};

/**
 * Object validators
 */
export const ObjectValidators = {
  /**
   * Check if value is a plain object
   */
  isPlainObject: (value: unknown): boolean => {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           !(value instanceof Date) &&
           !(value instanceof RegExp);
  },

  /**
   * Check if object has required properties
   */
  hasProperties: (properties: string[]): Validator<object> => {
    return (value: object): boolean => {
      return properties.every(prop => prop in value);
    };
  },

  /**
   * Check if object has only allowed properties
   */
  hasOnlyProperties: (properties: string[]): Validator<object> => {
    return (value: object): boolean => {
      return Object.keys(value).every(key => properties.includes(key));
    };
  },

  /**
   * Check if object property passes validator
   */
  propertyPasses: <K extends keyof object>(
    property: K,
    validator: Validator<object[K]>
  ): Validator<object> => {
    return (value: object): boolean => {
      return validator(value[property]);
    };
  }
};

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

/**
 * Enterprise validation engine
 */
export class EnterpriseValidationEngine {
  private rules: Map<string, ValidationRule[]> = new Map();

  /**
   * Add validation rule for a field
   */
  public addRule<T>(field: string, rule: ValidationRule<T>): void {
    const existingRules = this.rules.get(field) || [];
    this.rules.set(field, [...existingRules, rule]);
  }

  /**
   * Add multiple validation rules for a field
   */
  public addRules<T>(field: string, rules: ValidationRule<T>[]): void {
    for (const rule of rules) {
      this.addRule(field, rule);
    }
  }

  /**
   * Remove validation rule for a field
   */
  public removeRule(field: string, ruleName: string): void {
    const existingRules = this.rules.get(field);
    if (existingRules) {
      const filteredRules = existingRules.filter(rule => rule.name !== ruleName);
      this.rules.set(field, filteredRules);
    }
  }

  /**
   * Clear all validation rules
   */
  public clearRules(): void {
    this.rules.clear();
  }

  /**
   * Validate object against configured rules
   */
  public validate(target: Record<string, unknown>): DetailedValidationResult {
    const fieldErrors = new Map<string, ValidationError[]>();
    const validFields = new Set<string>();
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const [field, rules] of this.rules.entries()) {
      const value = target[field];
      const fieldValidationErrors: ValidationError[] = [];

      for (const rule of rules) {
        // Check if required field is missing
        if (rule.required && (value === undefined || value === null)) {
          const error = createValidationError(
            EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
            `Field '${field}' is required`,
            field,
            value
          );
          fieldValidationErrors.push(error);
          errors.push(error);
          continue;
        }

        // Skip validation if field is not required and is empty
        if (!rule.required && (value === undefined || value === null)) {
          continue;
        }

        // Apply validator
        try {
          const isValid = rule.validator(value);
          if (!isValid) {
            const message = rule.message || `Field '${field}' failed validation rule '${rule.name}'`;
            const error = createValidationError(
              EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
              message,
              field,
              value
            );
            
            if (rule.severity === 'warning') {
              warnings.push(message);
            } else {
              fieldValidationErrors.push(error);
              errors.push(error);
            }
          }
        } catch (validationError) {
          const error = createValidationError(
            EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
            `Validation error for field '${field}': ${validationError}`,
            field,
            value,
            { originalError: validationError }
          );
          fieldValidationErrors.push(error);
          errors.push(error);
        }
      }

      if (fieldValidationErrors.length === 0) {
        validFields.add(field);
      } else {
        fieldErrors.set(field, fieldValidationErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fieldErrors,
      validFields
    };
  }

  /**
   * Validate single field
   */
  public validateField<T>(field: string, value: T): ValidationResult {
    const rules = this.rules.get(field) || [];
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      // Check if required field is missing
      if (rule.required && (value === undefined || value === null)) {
        const error = createValidationError(
          EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
          `Field '${field}' is required`,
          field,
          value
        );
        errors.push(error);
        continue;
      }

      // Skip validation if field is not required and is empty
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Apply validator
      try {
        const isValid = rule.validator(value);
        if (!isValid) {
          const message = rule.message || `Field '${field}' failed validation rule '${rule.name}'`;
          const error = createValidationError(
            EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
            message,
            field,
            value
          );
          
          if (rule.severity === 'warning') {
            warnings.push(message);
          } else {
            errors.push(error);
          }
        }
      } catch (validationError) {
        const error = createValidationError(
          EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
          `Validation error for field '${field}': ${validationError}`,
          field,
          value,
          { originalError: validationError }
        );
        errors.push(error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard functions
 */
export const TypeGuards = {
  /**
   * Check if value is a safe string
   */
  isSafeString: (value: unknown): value is SafeString => {
    return typeof value === 'string' && 
           value.length > 0 && 
           value.length <= 10000 &&
           !/[<>\"'&]/.test(value);
  },

  /**
   * Check if value is a base64 string
   */
  isBase64String: (value: unknown): value is Base64String => {
    return typeof value === 'string' && StringValidators.isBase64(value);
  },

  /**
   * Check if value is a hex string
   */
  isHexString: (value: unknown): value is HexString => {
    return typeof value === 'string' && StringValidators.isHex(value);
  },

  /**
   * Check if value is a UUID
   */
  isUUID: (value: unknown): value is UUID => {
    return typeof value === 'string' && StringValidators.isUUID(value);
  },

  /**
   * Check if value is an ISO8601 string
   */
  isISO8601String: (value: unknown): value is ISO8601String => {
    return typeof value === 'string' && StringValidators.isISO8601(value);
  }
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create validation rule
 */
export const createValidationRule = <T>(
  name: string,
  validator: Validator<T>,
  options?: {
    message?: string;
    severity?: 'error' | 'warning';
    required?: boolean;
  }
): ValidationRule<T> => {
  return {
    name,
    validator,
    message: options?.message,
    severity: options?.severity || 'error',
    required: options?.required || false
  };
};

/**
 * Validate and throw if invalid
 */
export const validateOrThrow = <T>(
  value: T,
  validator: Validator<T>,
  message?: string
): void => {
  if (!validator(value)) {
    throw createValidationError(
      EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
      message || 'Validation failed',
      undefined,
      value
    );
  }
};

/**
 * Validate with result
 */
export const validateForResult = <T>(
  value: T,
  validator: Validator<T>,
  message?: string
): EnterpriseResult<T> => {
    try {
      if (!validator(value)) {
        return {
          success: false,
          error: createValidationError(
            EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
            message || 'Validation failed',
            undefined,
            value
          )
        };
      }
      return { success: true, data: value };
    } catch (error) {
      return {
        success: false,
        error: createValidationError(
          EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
          'Validation error occurred',
          undefined,
          value,
          { originalError: error }
        )
      };
    }
  };

// ============================================================================
// GLOBAL VALIDATION ENGINE INSTANCE
// ============================================================================

/**
 * Global validation engine instance
 */
export const globalValidationEngine = new EnterpriseValidationEngine();
