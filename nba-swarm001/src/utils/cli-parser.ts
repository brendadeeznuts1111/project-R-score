/**
 * Command-line argument parser utility
 * 
 * Wraps Bun/Node.js built-in util.parseArgs for consistent CLI parsing across all scripts
 * Uses Node.js util.parseArgs which is available in Bun
 */

import { parseArgs as nodeParseArgs } from "node:util";

export interface CliOptions {
  [key: string]: string | number | boolean | undefined;
}

export interface ParseArgsOptions {
  /**
   * Option definitions for type-safe parsing
   */
  options?: Record<
    string,
    {
      type?: "string" | "boolean";
      multiple?: boolean;
      short?: string;
      default?: string | boolean | string[] | boolean[];
    }
  >;
  /**
   * Whether to allow positional arguments
   */
  allowPositionals?: boolean;
  /**
   * Whether to use strict mode (throw on unknown options)
   */
  strict?: boolean;
}

/**
 * Parse command-line arguments using Bun's built-in util.parseArgs
 * Supports formats: --key=value, --key value, --flag (boolean)
 * 
 * @param userOptions - Optional option definitions for type-safe parsing
 * @returns Parsed options object with values and positionals
 * 
 * @example
 * ```ts
 * // Simple usage
 * const { values } = parseArgs();
 * const port = values.port; // string | undefined
 * 
 * // Type-safe usage
 * const { values } = parseArgs({
 *   options: {
 *     port: { type: 'string' },
 *     verbose: { type: 'boolean', short: 'v' },
 *   },
 *   strict: true,
 * });
 * ```
 */
export function parseArgs(
  userOptions: ParseArgsOptions = {}
): {
  values: Record<string, string | boolean | string[] | boolean[] | undefined>;
  positionals: string[];
} {
  const defaultOptions: ParseArgsOptions = {
    allowPositionals: true,
    strict: false,
    ...userOptions,
  };

  return nodeParseArgs({
    args: Bun.argv.slice(2),
    ...defaultOptions,
  });
}

/**
 * Get a specific option value with type safety and default
 * 
 * @param values - Parsed values from parseArgs()
 * @param key - Option key name
 * @param defaultValue - Default value if option is not present
 * @returns The option value or default
 */
export function getOption<T extends string | number | boolean>(
  values: Record<string, string | boolean | string[] | boolean[] | undefined>,
  key: string,
  defaultValue?: T
): T | undefined {
  const value = values[key];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  // Handle array values (take first element)
  if (Array.isArray(value)) {
    return (value[0] as unknown) as T;
  }
  
  return value as T;
}

/**
 * Require a specific option, throwing if not present
 * 
 * @param values - Parsed values from parseArgs()
 * @param key - Option key name
 * @param errorMessage - Custom error message
 * @returns The option value (never undefined)
 * @throws Error if option is missing
 */
export function requireOption<T extends string | number | boolean>(
  values: Record<string, string | boolean | string[] | boolean[] | undefined>,
  key: string,
  errorMessage?: string
): T {
  const value = values[key];
  
  if (value === undefined) {
    throw new Error(
      errorMessage || `Required option --${key} is missing`
    );
  }
  
  // Handle array values (take first element)
  if (Array.isArray(value)) {
    return (value[0] as unknown) as T;
  }
  
  return value as T;
}

