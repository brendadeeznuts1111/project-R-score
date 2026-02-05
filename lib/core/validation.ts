#!/usr/bin/env bun

/**
 * 🔍 Comprehensive Input Validation System
 * 
 * Type-safe validation with detailed error reporting and sanitization
 */

import { ValidationError } from './error-handling.ts';

/**
 * Validation result interface
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

/**
 * Validator function type
 */
export type Validator<T = any> = (input: unknown) => ValidationResult<T>;

/**
 * Schema definition for object validation
 */
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: Validator;
    sanitize?: boolean;
  };
}

/**
 * Input sanitizer
 */
export class InputSanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return String(input || '');
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript protocols
      .replace(/data:/gi, '') // Remove data URLs
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize number input
   */
  static sanitizeNumber(input: unknown): number {
    const num = Number(input);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: unknown): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true';
    }
    return Boolean(input);
  }

  /**
   * Sanitize array input
   */
  static sanitizeArray(input: unknown): any[] {
    if (!Array.isArray(input)) {
      return [];
    }
    
    return input
      .filter(item => item !== null && item !== undefined)
      .slice(0, 100); // Limit array size
  }

  /**
   * Sanitize object input
   */
  static sanitizeObject(input: unknown): Record<string, any> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }
    
    const sanitized: Record<string, any> = {};
    const keys = Object.keys(input).slice(0, 50); // Limit object size
    
    for (const key of keys) {
      if (typeof key === 'string' && key.length <= 100) {
        sanitized[key] = input[key];
      }
    }
    
    return sanitized;
  }
}

/**
 * Main validator class
 */
export class Validator {
  /**
   * Validate string input
   */
  static string(options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
    sanitize?: boolean;
  } = {}): Validator<string> {
    return (input: unknown): ValidationResult<string> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check if required
      if (options.required && (input === null || input === undefined)) {
        errors.push('Field is required');
        return { isValid: false, errors, warnings };
      }
      
      // Allow empty if not required
      if (input === null || input === undefined) {
        return { isValid: true, data: '', errors, warnings };
      }
      
      // Type check
      if (typeof input !== 'string') {
        errors.push('Must be a string');
        return { isValid: false, errors, warnings };
      }
      
      let value = input;
      
      // Sanitize if requested
      if (options.sanitize) {
        value = InputSanitizer.sanitizeString(input);
        if (value !== input) {
          warnings.push('Input was sanitized');
        }
      }
      
      // Length validation
      if (options.minLength !== undefined && value.length < options.minLength) {
        errors.push(`Must be at least ${options.minLength} characters`);
      }
      
      if (options.maxLength !== undefined && value.length > options.maxLength) {
        errors.push(`Must be no more than ${options.maxLength} characters`);
      }
      
      // Pattern validation
      if (options.pattern && !options.pattern.test(value)) {
        errors.push('Invalid format');
      }
      
      // Enum validation
      if (options.enum && !options.enum.includes(value)) {
        errors.push(`Must be one of: ${options.enum.join(', ')}`);
      }
      
      return {
        isValid: errors.length === 0,
        data: value,
        errors,
        warnings
      };
    };
  }

  /**
   * Validate number input
   */
  static number(options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    sanitize?: boolean;
  } = {}): Validator<number> {
    return (input: unknown): ValidationResult<number> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (options.required && (input === null || input === undefined)) {
        errors.push('Field is required');
        return { isValid: false, errors, warnings };
      }
      
      if (input === null || input === undefined) {
        return { isValid: true, data: 0, errors, warnings };
      }
      
      let value = Number(input);
      
      if (isNaN(value)) {
        errors.push('Must be a valid number');
        return { isValid: false, errors, warnings };
      }
      
      if (options.sanitize) {
        const sanitized = InputSanitizer.sanitizeNumber(input);
        if (sanitized !== value) {
          value = sanitized;
          warnings.push('Input was sanitized');
        }
      }
      
      if (options.min !== undefined && value < options.min) {
        errors.push(`Must be at least ${options.min}`);
      }
      
      if (options.max !== undefined && value > options.max) {
        errors.push(`Must be no more than ${options.max}`);
      }
      
      if (options.integer && !Number.isInteger(value)) {
        errors.push('Must be an integer');
      }
      
      return {
        isValid: errors.length === 0,
        data: value,
        errors,
        warnings
      };
    };
  }

  /**
   * Validate boolean input
   */
  static boolean(options: {
    required?: boolean;
    sanitize?: boolean;
  } = {}): Validator<boolean> {
    return (input: unknown): ValidationResult<boolean> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (options.required && (input === null || input === undefined)) {
        errors.push('Field is required');
        return { isValid: false, errors, warnings };
      }
      
      if (input === null || input === undefined) {
        return { isValid: true, data: false, errors, warnings };
      }
      
      let value: boolean;
      
      if (typeof input === 'boolean') {
        value = input;
      } else if (typeof input === 'string') {
        value = input.toLowerCase() === 'true';
      } else {
        value = Boolean(input);
      }
      
      if (options.sanitize) {
        const sanitized = InputSanitizer.sanitizeBoolean(input);
        if (sanitized !== value) {
          value = sanitized;
          warnings.push('Input was sanitized');
        }
      }
      
      return {
        isValid: true,
        data: value,
        errors,
        warnings
      };
    };
  }

  /**
   * Validate array input
   */
  static array<T>(itemValidator: Validator<T>, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    sanitize?: boolean;
  } = {}): Validator<T[]> {
    return (input: unknown): ValidationResult<T[]> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (options.required && (input === null || input === undefined)) {
        errors.push('Field is required');
        return { isValid: false, errors, warnings };
      }
      
      if (input === null || input === undefined) {
        return { isValid: true, data: [], errors, warnings };
      }
      
      if (!Array.isArray(input)) {
        errors.push('Must be an array');
        return { isValid: false, errors, warnings };
      }
      
      let value = input;
      
      if (options.sanitize) {
        value = InputSanitizer.sanitizeArray(input);
        if (value.length !== input.length) {
          warnings.push('Array was sanitized');
        }
      }
      
      if (options.minLength !== undefined && value.length < options.minLength) {
        errors.push(`Must have at least ${options.minLength} items`);
      }
      
      if (options.maxLength !== undefined && value.length > options.maxLength) {
        errors.push(`Must have no more than ${options.maxLength} items`);
      }
      
      // Validate each item
      const validatedItems: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator(value[i]);
        if (!itemResult.isValid) {
          errors.push(`Item ${i}: ${itemResult.errors.join(', ')}`);
        } else {
          validatedItems.push(itemResult.data!);
        }
        if (itemResult.warnings.length > 0) {
          warnings.push(`Item ${i}: ${itemResult.warnings.join(', ')}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        data: validatedItems,
        errors,
        warnings
      };
    };
  }

  /**
   * Validate object input against schema
   */
  static object(schema: ValidationSchema): Validator<Record<string, any>> {
    return (input: unknown): ValidationResult<Record<string, any>> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        errors.push('Must be an object');
        return { isValid: false, errors, warnings };
      }
      
      const obj = input as Record<string, any>;
      const validated: Record<string, any> = {};
      
      // Validate each field in schema
      for (const [key, rules] of Object.entries(schema)) {
        const value = obj[key];
        let validator: Validator;
        
        // Create validator based on type
        switch (rules.type) {
          case 'string':
            validator = Validator.string({
              required: rules.required,
              minLength: rules.minLength,
              maxLength: rules.maxLength,
              pattern: rules.pattern,
              enum: rules.enum,
              sanitize: rules.sanitize
            });
            break;
          case 'number':
            validator = Validator.number({
              required: rules.required,
              min: rules.min,
              max: rules.max,
              sanitize: rules.sanitize
            });
            break;
          case 'boolean':
            validator = Validator.boolean({
              required: rules.required,
              sanitize: rules.sanitize
            });
            break;
          case 'array':
            validator = Validator.array(Validator.string(), {
              required: rules.required,
              sanitize: rules.sanitize
            });
            break;
          case 'object':
            validator = Validator.object({});
            break;
          default:
            validator = Validator.string({ required: rules.required, sanitize: rules.sanitize });
        }
        
        // Apply custom validator if provided
        if (rules.custom) {
          validator = rules.custom;
        }
        
        const result = validator(value);
        if (!result.isValid) {
          errors.push(`${key}: ${result.errors.join(', ')}`);
        } else {
          validated[key] = result.data;
        }
        
        if (result.warnings.length > 0) {
          warnings.push(`${key}: ${result.warnings.join(', ')}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        data: validated,
        errors,
        warnings
      };
    };
  }

  /**
   * Create custom validator
   */
  static custom<T>(
    validatorFn: (input: unknown) => { isValid: boolean; data?: T; error?: string },
    options: { required?: boolean } = {}
  ): Validator<T> {
    return (input: unknown): ValidationResult<T> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (options.required && (input === null || input === undefined)) {
        errors.push('Field is required');
        return { isValid: false, errors, warnings };
      }
      
      if (input === null || input === undefined) {
        return { isValid: true, data: undefined, errors, warnings };
      }
      
      const result = validatorFn(input);
      
      if (!result.isValid) {
        errors.push(result.error || 'Validation failed');
      }
      
      return {
        isValid: errors.length === 0,
        data: result.data,
        errors,
        warnings
      };
    };
  }
}

/**
 * Validate request object structure
 */
export function validateRequest(request: unknown): request is { 
  headers?: { authorization?: string; [key: string]: any };
  method?: string;
  url?: string;
  body?: any;
} {
  if (!request || typeof request !== 'object') {
    return false;
  }
  
  const req = request as any;
  
  // Check that it has reasonable request properties
  return (
    (typeof req.headers === 'object' || req.headers === undefined) &&
    (typeof req.method === 'string' || req.method === undefined) &&
    (typeof req.url === 'string' || req.url === undefined)
  );
}

/**
 * Validate R2 key format
 */
export const validateR2Key = Validator.custom((input: unknown) => {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'R2 key must be a string' };
  }
  
  // R2 key restrictions
  if (input.length === 0 || input.length > 1024) {
    return { isValid: false, error: 'R2 key must be 1-1024 characters' };
  }
  
  if (!/^[a-zA-Z0-9._/-]+$/.test(input)) {
    return { isValid: false, error: 'R2 key contains invalid characters' };
  }
  
  if (input.startsWith('/') || input.endsWith('/')) {
    return { isValid: false, error: 'R2 key cannot start or end with /' };
  }
  
  return { isValid: true, data: input };
}, { required: true });

/**
 * Validate domain name
 */
export const validateDomain = Validator.string({
  required: true,
  minLength: 3,
  maxLength: 253,
  pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  sanitize: true
});

/**
 * Validate evidence ID
 */
export const validateEvidenceId = Validator.string({
  required: true,
  minLength: 1,
  maxLength: 100,
  pattern: /^[a-zA-Z0-9_-]+$/,
  sanitize: true
});
