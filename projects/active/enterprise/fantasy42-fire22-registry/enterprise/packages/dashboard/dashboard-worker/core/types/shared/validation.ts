/**
 * Shared Validation Types
 * Consolidated validation interfaces used across the application
 */

/**
 * Standard validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Standard validation error interface
 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Standard validation rule interface
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'numeric' | 'date' | 'custom';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
  message?: string;
}

/**
 * Validation options interface
 */
export interface ValidationOptions {
  strict?: boolean;
  skipWarnings?: boolean;
  customRules?: ValidationRule[];
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  field: string;
  isValid: boolean;
  error?: ValidationError;
  value: any;
}

/**
 * Bulk validation result
 */
export interface BulkValidationResult {
  overallValid: boolean;
  fieldResults: FieldValidationResult[];
  summary: {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    warnings: number;
  };
}
