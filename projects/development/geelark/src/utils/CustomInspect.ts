/**
 * Custom Inspect Utilities
 *
 * Helper utilities for implementing Bun.inspect.custom in classes
 *
 * Reference: https://bun.com/docs/runtime/utils#bun-inspect-custom
 */

import { inspect } from "bun";

/**
 * Create a custom inspect function for a class
 */
export interface CustomInspectOptions {
  name?: string;
  prefix?: string;
  showPrivate?: boolean;
  maxDepth?: number;
  format?: 'single-line' | 'multi-line' | 'table';
}

/**
 * Helper to create formatted object representation
 */
export class CustomInspectHelper {
  /**
   * Create a simple custom inspect string
   */
  static simple(name: string, props: Record<string, any>): string {
    const entries = Object.entries(props)
      .map(([key, value]) => {
        const valStr = typeof value === 'string' ? `"${value}"` : String(value);
        return `${key}=${valStr}`;
      })
      .join(', ');
    return `${name}(${entries})`;
  }

  /**
   * Create a multi-line formatted representation
   */
  static multiLine(title: string, props: Record<string, any>, options?: { emoji?: string }): string {
    const lines = [`${options?.emoji || '📋'} ${title}:`];
    for (const [key, value] of Object.entries(props)) {
      const formattedValue = this.formatValue(value);
      lines.push(`  ${key.padEnd(20)}: ${formattedValue}`);
    }
    return lines.join('\n');
  }

  /**
   * Create a table-formatted representation
   */
  static table(headers: string[], rows: Array<Array<string | number>>): string {
    if (rows.length === 0) {
      return 'Table(empty)';
    }

    // Calculate column widths
    const widths = headers.map((header, i) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => String(row[i] || '').length)
      );
      return maxWidth;
    });

    // Create header row
    const headerRow = headers.map((header, i) => header.padEnd(widths[i])).join(' | ');
    const separator = widths.map(w => '-'.repeat(w)).join('-+-');

    const lines = [headerRow, separator];
    for (const row of rows) {
      const rowStr = row.map((cell, i) => String(cell || '').padEnd(widths[i])).join(' | ');
      lines.push(rowStr);
    }

    return lines.join('\n');
  }

  /**
   * Format a value for display
   */
  private static formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (typeof value === 'object') return `Object(${Object.keys(value).length} keys)`;
    return String(value);
  }

  /**
   * Create a custom inspect method that respects depth
   */
  static createInspectMethod(
    className: string,
    getProps: (instance: any) => Record<string, any>,
    options?: CustomInspectOptions
  ) {
    return function (this: any, depth: number, opts: any) {
      const props = getProps(this);
      const maxDepth = options?.maxDepth ?? 3;

      if (depth >= maxDepth) {
        return `${className}(...)`;
      }

      if (options?.format === 'multi-line') {
        return this.multiLine(className, props, { emoji: options.prefix });
      }

      if (options?.format === 'table') {
        const headers = Object.keys(props);
        const rows = [Object.values(props).map(v => String(v))];
        return this.table(headers, rows);
      }

      return this.simple(className, props);
    };
  }

  /**
   * Add custom inspect to an existing class prototype
   */
  static addCustomInspect<T extends new (...args: any[]) => any>(
    Class: T,
    inspectFn: (instance: InstanceType<T>) => string
  ): T {
    (Class.prototype as any)[Bun.inspect.custom] = inspectFn;
    return Class;
  }
}

/**
 * Decorator-like function to add custom inspect to a class
 */
export function WithCustomInspect(
  inspectFn: (instance: any) => string
) {
  return function <T extends new (...args: any[]) => any>(Class: T): T {
    (Class.prototype as any)[Bun.inspect.custom] = inspectFn;
    return Class;
  };
}

/**
 * Example usage:
 *
 * ```typescript
 * class MyClass {
 *   constructor(private name: string, private value: number) {}
 *
 *   [Bun.inspect.custom]() {
 *     return CustomInspectHelper.simple('MyClass', {
 *       name: this.name,
 *       value: this.value,
 *     });
 *   }
 * }
 *
 * // Or using the decorator-like helper:
 * @WithCustomInspect(function() {
 *   return CustomInspectHelper.multiLine('MyClass', {
 *     name: this.name,
 *     value: this.value,
 *   });
 * })
 * class MyOtherClass {
 *   constructor(private name: string, private value: number) {}
 * }
 * ```
 */


