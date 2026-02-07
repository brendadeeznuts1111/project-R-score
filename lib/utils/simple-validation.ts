// lib/utils/simple-validation.ts — Lightweight validation system

export type ValidationType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'port'
  | 'apiKey'
  | 'jwtSecret'
  | 'encryptionKey'
  | 'logLevel'
  | 'environment';

export interface ValidationSchema<T = any> {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  transform?: (value: any) => T;
  defaultValue?: T;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SimpleValidator {
  /**
   * Validate a value against a schema
   */
  static validate<T>(value: any, schema: ValidationSchema<T>): T {
    // Handle undefined/null
    if (value === undefined || value === null) {
      if (schema.required) {
        throw new ValidationError('Value is required');
      }
      return schema.defaultValue as T;
    }

    let validatedValue: any = value;

    // Apply transformation if provided
    if (schema.transform) {
      validatedValue = schema.transform(value);
    }

    // Type-specific validation
    switch (schema.type) {
      case 'string':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected string');
        }
        if (schema.min !== undefined && validatedValue.length < schema.min) {
          throw new ValidationError(`String must be at least ${schema.min} characters`);
        }
        if (schema.max !== undefined && validatedValue.length > schema.max) {
          throw new ValidationError(`String must be at most ${schema.max} characters`);
        }
        if (schema.pattern && !schema.pattern.test(validatedValue)) {
          throw new ValidationError('String does not match required pattern');
        }
        break;

      case 'number':
        if (typeof validatedValue !== 'number') {
          throw new ValidationError('Expected number');
        }
        if (schema.min !== undefined && validatedValue < schema.min) {
          throw new ValidationError(`Number must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && validatedValue > schema.max) {
          throw new ValidationError(`Number must be at most ${schema.max}`);
        }
        break;

      case 'boolean':
        if (typeof validatedValue !== 'boolean') {
          // Transform common boolean strings
          if (typeof validatedValue === 'string') {
            const lower = validatedValue.toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(lower)) {
              validatedValue = true;
            } else if (['false', '0', 'no', 'off'].includes(lower)) {
              validatedValue = false;
            } else {
              throw new ValidationError('Expected boolean');
            }
          } else {
            throw new ValidationError('Expected boolean');
          }
        }
        break;

      case 'email':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected email string');
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(validatedValue)) {
          throw new ValidationError('Invalid email format');
        }
        break;

      case 'url':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected URL string');
        }
        try {
          new URL(validatedValue);
        } catch {
          throw new ValidationError('Invalid URL format');
        }
        break;

      case 'port':
        if (typeof validatedValue !== 'number') {
          // Try to convert string to number
          if (typeof validatedValue === 'string') {
            const num = parseInt(validatedValue, 10);
            if (isNaN(num)) {
              throw new ValidationError('Expected port number');
            }
            validatedValue = num;
          } else {
            throw new ValidationError('Expected port number');
          }
        }
        if (validatedValue < 1 || validatedValue > 65535) {
          throw new ValidationError('Port must be between 1 and 65535');
        }
        break;

      case 'apiKey':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected API key string');
        }
        if (validatedValue.length < 16) {
          throw new ValidationError('API key must be at least 16 characters');
        }
        if (validatedValue.length > 256) {
          throw new ValidationError('API key must be at most 256 characters');
        }
        break;

      case 'jwtSecret':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected JWT secret string');
        }
        if (validatedValue.length < 32) {
          throw new ValidationError('JWT secret must be at least 32 characters');
        }
        break;

      case 'encryptionKey':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected encryption key string');
        }
        if (validatedValue.length !== 64) {
          throw new ValidationError(
            'Encryption key must be exactly 64 characters (256-bit in hex)'
          );
        }
        if (!/^[a-fA-F0-9]+$/.test(validatedValue)) {
          throw new ValidationError('Encryption key must be hexadecimal');
        }
        break;

      case 'logLevel':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected log level string');
        }
        const validLogLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLogLevels.includes(validatedValue)) {
          throw new ValidationError(`Log level must be one of: ${validLogLevels.join(', ')}`);
        }
        break;

      case 'environment':
        if (typeof validatedValue !== 'string') {
          throw new ValidationError('Expected environment string');
        }
        const validEnvironments = ['development', 'staging', 'production'];
        if (!validEnvironments.includes(validatedValue)) {
          throw new ValidationError(`Environment must be one of: ${validEnvironments.join(', ')}`);
        }
        break;

      default:
        throw new ValidationError(`Unknown validation type: ${schema.type}`);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(validatedValue)) {
      throw new ValidationError(`Value must be one of: ${schema.enum.join(', ')}`);
    }

    return validatedValue as T;
  }

  /**
   * Create a validation schema
   */
  static schema<T>(
    type: ValidationType,
    options: Partial<ValidationSchema<T>> = {}
  ): ValidationSchema<T> {
    return {
      type,
      required: false,
      ...options,
    } as ValidationSchema<T>;
  }
}

// Common validation schemas
export const Schemas = {
  string: () => SimpleValidator.schema<string>('string'),
  number: () => SimpleValidator.schema<number>('number'),
  boolean: () => SimpleValidator.schema<boolean>('boolean'),
  email: () => SimpleValidator.schema<string>('email'),
  url: () => SimpleValidator.schema<string>('url'),
  port: () =>
    SimpleValidator.schema<number>('port', {
      transform: (val: any) => (typeof val === 'string' ? parseInt(val, 10) : val),
    }),
  apiKey: () => SimpleValidator.schema<string>('apiKey'),
  jwtSecret: () => SimpleValidator.schema<string>('jwtSecret'),
  encryptionKey: () => SimpleValidator.schema<string>('encryptionKey'),
  logLevel: () => SimpleValidator.schema<string>('logLevel'),
  environment: () => SimpleValidator.schema<string>('environment'),
  nonEmptyString: () => SimpleValidator.schema<string>('string', { min: 1 }),
  boundedString: (min: number, max: number) =>
    SimpleValidator.schema<string>('string', { min, max }),
  boundedNumber: (min: number, max: number) =>
    SimpleValidator.schema<number>('number', { min, max }),
  enum: (values: string[]) => SimpleValidator.schema<string>('string', { enum: values }),
};
