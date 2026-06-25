/**
 * Input Validation Utility for CLI and Command Processing
 * Provides standard validation for command arguments and user inputs
 * 
 * Pattern: Validate early, throw with descriptive errors
 */

import { ERROR_CODES, ErrorHandler } from "./ErrorHandlingPattern";

export interface ValidationRule<T> {
  validate: (value: any) => boolean;
  message: string;
  transform?: (value: any) => T;
}

export interface CommandSchema {
  command: string;
  args?: Record<string, ValidationRule<any>>;
  requiredArgs?: string[];
  description?: string;
}

/**
 * Validation rules for common input types
 */
export const ValidationRules = {
  /**
   * Validate that a value is a valid string
   */
  string: (): ValidationRule<string> => ({
    validate: (value) => typeof value === "string" && value.length > 0,
    message: "Must be a non-empty string",
    transform: (value) => String(value).trim(),
  }),

  /**
   * Validate that a value is a number
   */
  number: (min?: number, max?: number): ValidationRule<number> => ({
    validate: (value) => {
      const num = Number(value);
      if (isNaN(num)) return false;
      if (min !== undefined && num < min) return false;
      if (max !== undefined && num > max) return false;
      return true;
    },
    message: `Must be a number${min !== undefined ? ` >= ${min}` : ""}${max !== undefined ? ` <= ${max}` : ""}`,
    transform: (value) => Number(value),
  }),

  /**
   * Validate that a value is a boolean
   */
  boolean: (): ValidationRule<boolean> => ({
    validate: (value) => typeof value === "boolean" || value === "true" || value === "false",
    message: "Must be a boolean (true/false)",
    transform: (value) => value === true || value === "true",
  }),

  /**
   * Validate that value is one of allowed options
   */
  enum: <T extends string>(options: T[]): ValidationRule<T> => ({
    validate: (value) => options.includes(value),
    message: `Must be one of: ${options.join(", ")}`,
    transform: (value) => value,
  }),

  /**
   * Validate array of items
   */
  array: <T>(itemRule: ValidationRule<T>): ValidationRule<T[]> => ({
    validate: (value) => {
      if (!Array.isArray(value)) return false;
      return value.every((item: any) => itemRule.validate(item));
    },
    message: `Must be an array where each item: ${itemRule.message}`,
    transform: (value) => {
      if (!Array.isArray(value)) value = [value];
      return value.map((item: any) => itemRule.transform?.(item) ?? item);
    },
  }),

  /**
   * Validate email format
   */
  email: (): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "Must be a valid email address",
    transform: (value) => String(value).toLowerCase().trim(),
  }),

  /**
   * Validate URL format
   */
  url: (): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "Must be a valid URL",
    transform: (value) => String(value).trim(),
  }),

  /**
   * Validate path format
   */
  path: (): ValidationRule<string> => ({
    validate: (value) => {
      const str = String(value);
      return str.length > 0 && !str.includes("\0");
    },
    message: "Must be a valid path",
    transform: (value) => String(value).trim(),
  }),

  /**
   * Optional validation - always passes but transforms
   */
  optional: <T>(rule: ValidationRule<T>): ValidationRule<T | undefined> => ({
    validate: (value) => value === undefined || value === null || rule.validate(value),
    message: rule.message,
    transform: (value) => value === undefined || value === null ? undefined : rule.transform?.(value) ?? value,
  }),
};

/**
 * Command Input Validator
 */
export class CommandValidator {
  /**
   * Validate command arguments against schema
   */
  static validateCommand(command: string, args: string[], schema: CommandSchema): Record<string, any> {
    // Validate command name
    if (command !== schema.command) {
      ErrorHandler.throw(
        `Invalid command: ${command}. Expected: ${schema.command}`,
        ERROR_CODES.COMMAND_NOT_FOUND,
        { command, expected: schema.command }
      );
    }

    // Validate required args
    if (schema.requiredArgs && args.length < schema.requiredArgs.length) {
      ErrorHandler.throw(
        `Missing required arguments: ${schema.requiredArgs.join(", ")}`,
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { required: schema.requiredArgs, provided: args.length }
      );
    }

    // Validate arg types
    const validated: Record<string, any> = { command };
    if (schema.args) {
      let argIndex = 0;
      for (const [argName, rule] of Object.entries(schema.args)) {
        const value = args[argIndex];

        if (value !== undefined) {
          if (!rule.validate(value)) {
            ErrorHandler.throw(
              `Invalid argument "${argName}": ${rule.message}`,
              ERROR_CODES.INVALID_COMMAND_ARGS,
              { argument: argName, value, rule: rule.message }
            );
          }
          validated[argName] = rule.transform?.(value) ?? value;
        }
        argIndex++;
      }
    }

    return validated;
  }

  /**
   * Validate single value against a rule
   */
  static validateValue<T>(value: any, rule: ValidationRule<T>, fieldName: string = "value"): T {
    if (!rule.validate(value)) {
      ErrorHandler.throw(
        `Invalid value for "${fieldName}": ${rule.message}`,
        ERROR_CODES.INVALID_INPUT,
        { field: fieldName, value }
      );
    }
    return rule.transform?.(value) ?? value;
  }

  /**
   * Validate object against schema
   */
  static validateObject<T extends Record<string, any>>(
    obj: any,
    schema: Record<keyof T, ValidationRule<any>>
  ): T {
    const validated: any = {};

    for (const [key, rule] of Object.entries(schema)) {
      const value = obj?.[key];

      if (!rule.validate(value)) {
        ErrorHandler.throw(
          `Invalid field "${key}": ${rule.message}`,
          ERROR_CODES.VALIDATION_FAILED,
          { field: key, value }
        );
      }
      validated[key] = rule.transform?.(value) ?? value;
    }

    return validated as T;
  }
}

/**
 * Predefined command schemas for common operations
 */
export const COMMAND_SCHEMAS: Record<string, CommandSchema> = {
  // Status command
  status: {
    command: "status",
    args: {
      watch: ValidationRules.optional(ValidationRules.boolean()),
      interval: ValidationRules.optional(ValidationRules.number(1, 3600)),
    },
    description: "Display system status",
  },

  // Config command
  config: {
    command: "config",
    args: {
      action: ValidationRules.enum(["show", "validate", "export"]),
    },
    requiredArgs: ["action"],
    description: "View and validate configuration",
  },

  // Flags command
  flags: {
    command: "flags",
    args: {
      action: ValidationRules.enum(["list", "enable", "disable", "toggle", "reset", "rotate"]),
      flag: ValidationRules.optional(ValidationRules.string()),
    },
    requiredArgs: ["action"],
    description: "Manage feature flags",
  },

  // Health command
  health: {
    command: "health",
    args: {
      detailed: ValidationRules.optional(ValidationRules.boolean()),
      integrations: ValidationRules.optional(ValidationRules.boolean()),
    },
    description: "Check system health",
  },

  // Export command
  export: {
    command: "export",
    args: {
      format: ValidationRules.enum(["json", "csv", "html"]),
    },
    requiredArgs: ["format"],
    description: "Export dashboard data",
  },
};
