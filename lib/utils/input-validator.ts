/**
 * Input Validation Utilities
 *
 * Provides comprehensive input validation for API endpoints and user inputs
 * with type safety and security considerations.
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  whitelist?: string[];
  blacklist?: string[];
  sanitize?: boolean;
  transform?: (value: string) => string;
}

export interface ValidationResult {
  isValid: boolean;
  value?: string;
  errors: string[];
  sanitized?: boolean;
}

export interface InputValidator {
  validate(value: unknown, rules: ValidationRule): ValidationResult;
  sanitize(value: string): string;
  validateURL(value: string): ValidationResult;
  validateKey(value: string): ValidationResult;
  validateEmail(value: string): ValidationResult;
  validateJSON(value: string): ValidationResult;
}

/**
 * Comprehensive input validator with security focus
 */
export class SecureInputValidator implements InputValidator {
  private static readonly DEFAULT_MAX_LENGTH = 10000;
  private static readonly SANITIZATION_PATTERNS = [
    { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, replacement: '' },
    { pattern: /javascript:/gi, replacement: '' },
    { pattern: /on\w+\s*=/gi, replacement: '' },
    { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, replacement: '' }, // Control characters
  ];

  /**
   * Validate input against provided rules
   */
  validate(value: unknown, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let processedValue: string | undefined;
    let wasSanitized = false;

    // Handle null/undefined
    if (value === null || value === undefined) {
      if (rules.required) {
        errors.push('Value is required');
      }
      return { isValid: errors.length === 0, errors, sanitized: false };
    }

    // Convert to string
    processedValue = String(value);

    // Apply transformation if provided
    if (rules.transform) {
      try {
        processedValue = rules.transform(processedValue);
      } catch (error) {
        errors.push('Transformation failed');
      }
    }

    // Sanitize if requested
    if (rules.sanitize !== false) {
      const originalValue = processedValue;
      processedValue = this.sanitize(processedValue);
      wasSanitized = originalValue !== processedValue;
    }

    // Length validation
    if (rules.minLength && processedValue.length < rules.minLength) {
      errors.push(`Value must be at least ${rules.minLength} characters long`);
    }

    if (rules.maxLength && processedValue.length > rules.maxLength) {
      errors.push(`Value must be no more than ${rules.maxLength} characters long`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(processedValue)) {
      errors.push('Value does not match required pattern');
    }

    // Whitelist validation
    if (rules.whitelist && !rules.whitelist.includes(processedValue)) {
      errors.push('Value is not in allowed list');
    }

    // Blacklist validation
    if (rules.blacklist && rules.blacklist.includes(processedValue)) {
      errors.push('Value is not allowed');
    }

    return {
      isValid: errors.length === 0,
      value: processedValue,
      errors,
      sanitized: wasSanitized,
    };
  }

  /**
   * Sanitize input string by removing potentially dangerous content
   */
  sanitize(value: string): string {
    let sanitized = value;

    // Apply sanitization patterns
    for (const { pattern, replacement } of SecureInputValidator.SANITIZATION_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Validate URL with security checks
   */
  validateURL(value: string): ValidationResult {
    const errors: string[] = [];

    try {
      const url = new URL(value);

      // Protocol validation
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(url.protocol)) {
        errors.push('Only HTTP and HTTPS URLs are allowed');
      }

      // Hostname validation
      if (!url.hostname) {
        errors.push('URL must have a valid hostname');
      }

      // Prevent localhost in production
      if (Bun.env.NODE_ENV === 'production') {
        const DEFAULT_HOST = process.env.SERVER_HOST || process.env.HOST || 'localhost';
        const localhostPatterns = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '[::1]',
          ...(DEFAULT_HOST !== 'localhost' ? [] : []),
        ];
        if (localhostPatterns.some(pattern => url.hostname.includes(pattern))) {
          errors.push('Localhost URLs are not allowed in production');
        }
      }

      // Length validation
      if (value.length > 2048) {
        errors.push('URL is too long (max 2048 characters)');
      }

      return {
        isValid: errors.length === 0,
        value: value,
        errors,
        sanitized: false,
      };
    } catch (error) {
      errors.push('Invalid URL format');
      return { isValid: false, errors, sanitized: false };
    }
  }

  /**
   * Validate key names (for object keys, cache keys, etc.)
   */
  validateKey(value: string): ValidationResult {
    const errors: string[] = [];
    const sanitized = this.sanitize(value);

    // Key pattern validation (alphanumeric, dots, dashes, underscores)
    const keyPattern = /^[a-zA-Z0-9._-]+$/;
    if (!keyPattern.test(sanitized)) {
      errors.push('Key can only contain letters, numbers, dots, dashes, and underscores');
    }

    // Length validation
    if (sanitized.length === 0) {
      errors.push('Key cannot be empty');
    }

    if (sanitized.length > 255) {
      errors.push('Key is too long (max 255 characters)');
    }

    // Prevent path traversal
    if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
      errors.push('Key cannot contain path traversal characters');
    }

    return {
      isValid: errors.length === 0,
      value: sanitized,
      errors,
      sanitized: sanitized !== value,
    };
  }

  /**
   * Validate email format
   */
  validateEmail(value: string): ValidationResult {
    const errors: string[] = [];
    const sanitized = this.sanitize(value.toLowerCase().trim());

    // Basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(sanitized)) {
      errors.push('Invalid email format');
    }

    // Length validation
    if (sanitized.length > 254) {
      errors.push('Email is too long (max 254 characters)');
    }

    return {
      isValid: errors.length === 0,
      value: sanitized,
      errors,
      sanitized: sanitized !== value,
    };
  }

  /**
   * Validate JSON string
   */
  validateJSON(value: string): ValidationResult {
    const errors: string[] = [];

    try {
      JSON.parse(value);

      // Size validation
      if (value.length > SecureInputValidator.DEFAULT_MAX_LENGTH) {
        errors.push(
          `JSON is too large (max ${SecureInputValidator.DEFAULT_MAX_LENGTH} characters)`
        );
      }

      return {
        isValid: errors.length === 0,
        value,
        errors,
        sanitized: false,
      };
    } catch (error) {
      errors.push('Invalid JSON format');
      return { isValid: false, errors, sanitized: false };
    }
  }
}

// Singleton instance
export const inputValidator = new SecureInputValidator();

/**
 * Convenience functions for common validations
 */
export const validateURL = (value: string) => inputValidator.validateURL(value);
export const validateKey = (value: string) => inputValidator.validateKey(value);
export const validateEmail = (value: string) => inputValidator.validateEmail(value);
export const validateJSON = (value: string) => inputValidator.validateJSON(value);
