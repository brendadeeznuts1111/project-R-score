/**
 * Input Validation Utilities
 *
 * Provides comprehensive input validation for API endpoints
 * with security-focused sanitization and type checking
 */

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  sanitize?: boolean;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

// ============================================================================
// SECURITY PATTERNS
// ============================================================================

class SecurityPatterns {
  // XSS Prevention patterns
  static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];

  // SQL Injection patterns
  static readonly SQL_INJECTION_PATTERNS = [
    /('|(\\')|(;)|(\-\-)|(\s+(or|and)\s+.*=)|(union\s+select)/gi,
    /(exec(\s|\+)+(s|x)p\w+)/gi,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+\w+\s+set/i,
  ];

  // Path traversal patterns
  static readonly PATH_TRAVERSAL_PATTERNS = [/\.\./g, /%2e%2e/gi, /%252e%252e/gi, /\//g];

  // Command injection patterns
  static readonly COMMAND_INJECTION_PATTERNS = [
    /[;&|`$(){}[\]]/g,
    /\b(cmd|bash|sh|powershell|eval|exec)\b/gi,
  ];

  /**
   * Check if string contains malicious patterns
   */
  static containsMaliciousPatterns(input: string): boolean {
    const allPatterns = [
      ...this.XSS_PATTERNS,
      ...this.SQL_INJECTION_PATTERNS,
      ...this.PATH_TRAVERSAL_PATTERNS,
      ...this.COMMAND_INJECTION_PATTERNS,
    ];

    return allPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize string against common attacks
   */
  static sanitize(input: string): string {
    let sanitized = input;

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove SQL injection patterns
    this.SQL_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove path traversal
    this.PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove command injection
    this.COMMAND_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // HTML encode special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized.trim();
  }
}

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

export class InputValidator {
  /**
   * Validate a single field against a rule
   */
  static validateField(value: any, rule: ValidationRule, fieldName: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = value;

    // Check if required
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    // Skip validation if field is not required and empty
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors, sanitized: null };
    }

    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${fieldName} must be of type ${rule.type}, got ${actualType}`);
        return { isValid: false, errors };
      }
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Check for malicious patterns
      if (SecurityPatterns.containsMaliciousPatterns(value)) {
        errors.push(`${fieldName} contains potentially malicious content`);
      }

      // Length validations
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${fieldName} must be no more than ${rule.maxLength} characters long`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }

      // Sanitize if requested
      if (rule.sanitize !== false) {
        sanitized = SecurityPatterns.sanitize(value);
      }
    }

    // Number-specific validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldName} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldName} must be no more than ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rule.enum.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Validate an object against a schema
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const allErrors: string[] = [];
    const sanitized: any = {};

    // Validate each field in schema
    for (const [fieldName, rule] of Object.entries(schema)) {
      const result = this.validateField(data[fieldName], rule, fieldName);

      if (!result.isValid) {
        allErrors.push(...result.errors);
      } else {
        sanitized[fieldName] = result.sanitized;
      }
    }

    // Check for unexpected fields
    for (const fieldName of Object.keys(data)) {
      if (!schema.hasOwnProperty(fieldName)) {
        allErrors.push(`Unexpected field: ${fieldName}`);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitized,
    };
  }

  /**
   * Validate URL parameters
   */
  static validateUrlParams(url: URL, schema: ValidationSchema): ValidationResult {
    const params: any = {};

    // Extract parameters from URL
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value;
    }

    return this.validate(params, schema);
  }

  /**
   * Validate JSON request body
   */
  static async validateJsonBody(
    request: Request,
    schema: ValidationSchema
  ): Promise<ValidationResult> {
    try {
      const data = await request.json();
      return this.validate(data, schema);
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid JSON in request body'],
      };
    }
  }
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const CommonSchemas = {
  // Project name validation
  projectName: {
    name: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true,
    } as ValidationRule,
  },

  // Secret management schemas
  secretGet: {
    service: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 255,
      sanitize: true,
    } as ValidationRule,
    name: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 255,
      sanitize: true,
    } as ValidationRule,
  },

  secretSet: {
    service: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 255,
      sanitize: true,
    } as ValidationRule,
    name: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 255,
      sanitize: true,
    } as ValidationRule,
    value: {
      required: true,
      type: 'string',
      maxLength: 10000,
      sanitize: false, // Don't sanitize secret values
    } as ValidationRule,
  },

  // Pagination schemas
  pagination: {
    page: {
      required: false,
      type: 'number',
      min: 1,
      max: 1000,
    } as ValidationRule,
    limit: {
      required: false,
      type: 'number',
      min: 1,
      max: 100,
    } as ValidationRule,
  },

  // Environment variable schemas
  envVars: {
    project: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true,
    } as ValidationRule,
    env: {
      required: false,
      type: 'object',
    } as ValidationRule,
  },
};

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

export class ValidationMiddleware {
  /**
   * Create middleware for JSON body validation
   */
  static validateJsonBody(schema: ValidationSchema) {
    return async (request: Request): Promise<ValidationResult> => {
      return await InputValidator.validateJsonBody(request, schema);
    };
  }

  /**
   * Create middleware for URL parameter validation
   */
  static validateUrlParams(schema: ValidationSchema) {
    return (url: URL): ValidationResult => {
      return InputValidator.validateUrlParams(url, schema);
    };
  }

  /**
   * Create middleware for combined validation
   */
  static validateCombined(bodySchema?: ValidationSchema, paramSchema?: ValidationSchema) {
    return async (request: Request, url: URL): Promise<ValidationResult> => {
      const allErrors: string[] = [];
      let sanitized: any = {};

      // Validate body if schema provided
      if (bodySchema) {
        const bodyResult = await InputValidator.validateJsonBody(request, bodySchema);
        if (!bodyResult.isValid) {
          allErrors.push(...bodyResult.errors);
        } else {
          sanitized.body = bodyResult.sanitized;
        }
      }

      // Validate params if schema provided
      if (paramSchema) {
        const paramResult = InputValidator.validateUrlParams(url, paramSchema);
        if (!paramResult.isValid) {
          allErrors.push(...paramResult.errors);
        } else {
          sanitized.params = paramResult.sanitized;
        }
      }

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        sanitized,
      };
    };
  }
}
