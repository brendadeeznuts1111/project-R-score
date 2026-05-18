#!/usr/bin/env bun

/**
 * ✅ Fire22 Configuration Validator
 *
 * Provides comprehensive input validation, configuration checking,
 * and validation rules for all Fire22 scripts
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

interface ValidationRule<T> {
  name: string;
  validator: (value: T) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningCount: number;
    infoCount: number;
  };
}

interface ValidationError {
  field: string;
  message: string;
  value: any;
  rule: string;
  severity: 'error';
}

interface ValidationWarning {
  field: string;
  message: string;
  value: any;
  rule: string;
  severity: 'warning';
}

interface ValidationInfo {
  field: string;
  message: string;
  value: any;
  rule: string;
  severity: 'info';
}

interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    default?: any;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean;
    message?: string;
  };
}

class ConfigValidator {
  private static instance: ConfigValidator;
  private validationHistory: ValidationResult[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  /**
   * Validate configuration against a schema
   */
  validateConfig(config: Record<string, any>, schema: ConfigSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Validate each field in the schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      totalChecks++;
      const fieldValue = config[fieldName];

      // Check if required field is present
      if (fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push({
          field: fieldName,
          message: fieldSchema.message || `Field '${fieldName}' is required`,
          value: fieldValue,
          rule: 'required',
          severity: 'error',
        });
        continue;
      }

      // If field is not required and not present, skip validation
      if (!fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
        passedChecks++;
        continue;
      }

      // Type validation
      if (!this.validateType(fieldValue, fieldSchema.type)) {
        errors.push({
          field: fieldName,
          message:
            fieldSchema.message || `Field '${fieldName}' must be of type '${fieldSchema.type}'`,
          value: fieldValue,
          rule: 'type',
          severity: 'error',
        });
        continue;
      }

      // Range validation for numbers
      if (fieldSchema.type === 'number' && typeof fieldValue === 'number') {
        if (fieldSchema.min !== undefined && fieldValue < fieldSchema.min) {
          errors.push({
            field: fieldName,
            message:
              fieldSchema.message || `Field '${fieldName}' must be at least ${fieldSchema.min}`,
            value: fieldValue,
            rule: 'min',
            severity: 'error',
          });
          continue;
        }

        if (fieldSchema.max !== undefined && fieldValue > fieldSchema.max) {
          errors.push({
            field: fieldName,
            message:
              fieldSchema.message || `Field '${fieldName}' must be at most ${fieldSchema.max}`,
            value: fieldValue,
            rule: 'max',
            severity: 'error',
          });
          continue;
        }
      }

      // Length validation for strings and arrays
      if ((fieldSchema.type === 'string' || fieldSchema.type === 'array') && fieldValue) {
        const length = fieldSchema.type === 'string' ? fieldValue.length : fieldValue.length;

        if (fieldSchema.min !== undefined && length < fieldSchema.min) {
          errors.push({
            field: fieldName,
            message:
              fieldSchema.message ||
              `Field '${fieldName}' must have at least ${fieldSchema.min} characters/items`,
            value: fieldValue,
            rule: 'min',
            severity: 'error',
          });
          continue;
        }

        if (fieldSchema.max !== undefined && length > fieldSchema.max) {
          errors.push({
            field: fieldName,
            message:
              fieldSchema.message ||
              `Field '${fieldName}' must have at most ${fieldSchema.max} characters/items`,
            value: fieldValue,
            rule: 'max',
            severity: 'error',
          });
          continue;
        }
      }

      // Pattern validation for strings
      if (
        fieldSchema.type === 'string' &&
        fieldSchema.pattern &&
        !fieldSchema.pattern.test(fieldValue)
      ) {
        errors.push({
          field: fieldName,
          message: fieldSchema.message || `Field '${fieldName}' does not match required pattern`,
          value: fieldValue,
          rule: 'pattern',
          severity: 'error',
        });
        continue;
      }

      // Enum validation
      if (fieldSchema.enum && !fieldSchema.enum.includes(fieldValue)) {
        errors.push({
          field: fieldName,
          message:
            fieldSchema.message ||
            `Field '${fieldName}' must be one of: ${fieldSchema.enum.join(', ')}`,
          value: fieldValue,
          rule: 'enum',
          severity: 'error',
        });
        continue;
      }

      // Custom validation
      if (fieldSchema.custom && !fieldSchema.custom(fieldValue)) {
        errors.push({
          field: fieldName,
          message: fieldSchema.message || `Field '${fieldName}' failed custom validation`,
          value: fieldValue,
          rule: 'custom',
          severity: 'error',
        });
        continue;
      }

      // All validations passed for this field
      passedChecks++;
    }

    // Check for unknown fields
    const schemaFields = new Set(Object.keys(schema));
    for (const [fieldName, fieldValue] of Object.entries(config)) {
      if (!schemaFields.has(fieldName)) {
        warnings.push({
          field: fieldName,
          message: `Unknown field '${fieldName}' - this field is not defined in the schema`,
          value: fieldValue,
          rule: 'unknown_field',
          severity: 'warning',
        });
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks,
        warningCount: warnings.length,
        infoCount: info.length,
      },
    };

    // Add to history
    this.addToHistory(result);

    return result;
  }

  /**
   * Validate a single value with multiple rules
   */
  validateValue<T>(
    value: T,
    rules: ValidationRule<T>[],
    fieldName: string = 'value'
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];
    let totalChecks = rules.length;
    let passedChecks = 0;

    for (const rule of rules) {
      if (rule.validator(value)) {
        passedChecks++;
        if (rule.severity === 'info') {
          info.push({
            field: fieldName,
            message: rule.message,
            value,
            rule: rule.name,
            severity: 'info',
          });
        }
      } else {
        switch (rule.severity) {
          case 'error':
            errors.push({
              field: fieldName,
              message: rule.message,
              value,
              rule: rule.name,
              severity: 'error',
            });
            break;
          case 'warning':
            warnings.push({
              field: fieldName,
              message: rule.message,
              value,
              rule: rule.name,
              severity: 'warning',
            });
            break;
          case 'info':
            info.push({
              field: fieldName,
              message: rule.message,
              value,
              rule: rule.name,
              severity: 'info',
            });
            break;
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks,
        warningCount: warnings.length,
        infoCount: info.length,
      },
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * Common validation rules
   */
  static getCommonRules() {
    return {
      // String validations
      nonEmptyString: {
        name: 'nonEmptyString',
        validator: (value: string) => typeof value === 'string' && value.trim().length > 0,
        message: 'Value must be a non-empty string',
        severity: 'error' as const,
      },

      validEmail: {
        name: 'validEmail',
        validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Value must be a valid email address',
        severity: 'error' as const,
      },

      validUrl: {
        name: 'validUrl',
        validator: (value: string) => {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Value must be a valid URL',
        severity: 'error' as const,
      },

      // Number validations
      positiveNumber: {
        name: 'positiveNumber',
        validator: (value: number) => typeof value === 'number' && value > 0,
        message: 'Value must be a positive number',
        severity: 'error' as const,
      },

      nonNegativeNumber: {
        name: 'nonNegativeNumber',
        validator: (value: number) => typeof value === 'number' && value >= 0,
        message: 'Value must be a non-negative number',
        severity: 'error' as const,
      },

      // Array validations
      nonEmptyArray: {
        name: 'nonEmptyArray',
        validator: (value: any[]) => Array.isArray(value) && value.length > 0,
        message: 'Value must be a non-empty array',
        severity: 'error' as const,
      },

      // Object validations
      nonEmptyObject: {
        name: 'nonEmptyObject',
        validator: (value: object) =>
          typeof value === 'object' && value !== null && Object.keys(value).length > 0,
        message: 'Value must be a non-empty object',
        severity: 'error' as const,
      },

      // Boolean validations
      isBoolean: {
        name: 'isBoolean',
        validator: (value: boolean) => typeof value === 'boolean',
        message: 'Value must be a boolean',
        severity: 'error' as const,
      },
    };
  }

  /**
   * Validate file paths
   */
  validateFilePath(path: string): ValidationResult {
    const rules = [
      {
        name: 'nonEmptyString',
        validator: (value: string) => typeof value === 'string' && value.trim().length > 0,
        message: 'File path must not be empty',
        severity: 'error' as const,
      },
      {
        name: 'noTraversal',
        validator: (value: string) => !value.includes('..') && !value.includes('~'),
        message: 'File path must not contain directory traversal characters',
        severity: 'error' as const,
      },
      {
        name: 'validFormat',
        validator: (value: string) => /^[a-zA-Z0-9\/\-_.]+$/.test(value),
        message: 'File path contains invalid characters',
        severity: 'warning' as const,
      },
    ];

    return this.validateValue(path, rules, 'filePath');
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables(env: Record<string, string>, required: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];
    let totalChecks = required.length;
    let passedChecks = 0;

    for (const varName of required) {
      const value = env[varName];

      if (!value || value.trim().length === 0) {
        errors.push({
          field: varName,
          message: `Environment variable '${varName}' is required`,
          value: value || 'undefined',
          rule: 'required',
          severity: 'error',
        });
      } else {
        passedChecks++;

        // Check for common issues
        if (value === 'undefined' || value === 'null') {
          warnings.push({
            field: varName,
            message: `Environment variable '${varName}' has suspicious value`,
            value,
            rule: 'suspicious_value',
            severity: 'warning',
          });
        }

        if (value.length < 3) {
          warnings.push({
            field: varName,
            message: `Environment variable '${varName}' is very short`,
            value,
            rule: 'short_value',
            severity: 'warning',
          });
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks,
        warningCount: warnings.length,
        infoCount: info.length,
      },
    };

    this.addToHistory(result);
    return result;
  }

  /**
   * Generate validation report
   */
  generateValidationReport(result: ValidationResult): string {
    const report = [
      '✅ Fire22 Configuration Validation Report',
      '!==!==!==!==!==!==!==!==\n',
      `📊 Summary:`,
      `   Total Checks: ${result.summary.totalChecks}`,
      `   Passed: ${result.summary.passedChecks}`,
      `   Failed: ${result.summary.failedChecks}`,
      `   Warnings: ${result.summary.warningCount}`,
      `   Info: ${result.summary.infoCount}`,
      `   Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`,
      '',
    ];

    if (result.errors.length > 0) {
      report.push('❌ Errors:');
      result.errors.forEach(error => {
        report.push(`   • ${error.field}: ${error.message} (${error.rule})`);
        report.push(`     Value: ${JSON.stringify(error.value)}`);
      });
      report.push('');
    }

    if (result.warnings.length > 0) {
      report.push('⚠️  Warnings:');
      result.warnings.forEach(warning => {
        report.push(`   • ${warning.field}: ${warning.message} (${warning.rule})`);
        report.push(`     Value: ${JSON.stringify(warning.value)}`);
      });
      report.push('');
    }

    if (result.info.length > 0) {
      report.push('ℹ️  Info:');
      result.info.forEach(info => {
        report.push(`   • ${info.field}: ${info.message} (${info.rule})`);
        report.push(`     Value: ${JSON.stringify(info.value)}`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Get validation history
   */
  getValidationHistory(limit?: number): ValidationResult[] {
    if (limit) {
      return this.validationHistory.slice(-limit);
    }
    return [...this.validationHistory];
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory = [];
  }

  /**
   * Private helper methods
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  private addToHistory(result: ValidationResult): void {
    this.validationHistory.push(result);

    // Maintain history size
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory = this.validationHistory.slice(-this.maxHistorySize);
    }
  }
}

// Export the class and convenience functions
export { ConfigValidator, ValidationResult, ValidationRule, ConfigSchema };
export const validateConfig = ConfigValidator.getInstance().validateConfig.bind(
  ConfigValidator.getInstance()
);
export const validateValue = ConfigValidator.getInstance().validateValue.bind(
  ConfigValidator.getInstance()
);
export const validateFilePath = ConfigValidator.getInstance().validateFilePath.bind(
  ConfigValidator.getInstance()
);
export const validateEnvironmentVariables =
  ConfigValidator.getInstance().validateEnvironmentVariables.bind(ConfigValidator.getInstance());
export const getCommonRules = ConfigValidator.getCommonRules;
export default ConfigValidator;
