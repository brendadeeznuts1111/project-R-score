/**
 * Bun Utilities Wrapper
 *
 * Convenience wrappers and helpers for Bun's utility functions:
 * - Bun.inspect.table()
 * - Bun.inspect.custom
 * - Bun.deepEquals()
 * - Bun.escapeHTML()
 * - Bun.stringWidth()
 *
 * Reference: https://bun.com/docs/runtime/utils
 */

import { inspect } from "bun";

/**
 * Table formatting utilities
 */
export const TableUtils = {
  /**
   * Format data as a table string
   */
  format(data: object | unknown[], properties?: string[], options?: { colors?: boolean }): string {
    return inspect.table(data, properties, options);
  },

  /**
   * Format with colors enabled
   */
  formatColored(data: object | unknown[], properties?: string[]): string {
    return inspect.table(data, properties, { colors: true });
  },

  /**
   * Format specific columns only
   */
  formatColumns(data: object[], columns: string[]): string {
    return inspect.table(data, columns);
  },
};

/**
 * Deep equality utilities
 */
export const DeepEquals = {
  /**
   * Check if two values are deeply equal (loose mode)
   */
  equal(a: unknown, b: unknown): boolean {
    return Bun.deepEquals(a, b, false);
  },

  /**
   * Check if two values are deeply equal (strict mode)
   */
  strictEqual(a: unknown, b: unknown): boolean {
    return Bun.deepEquals(a, b, true);
  },

  /**
   * Check if two arrays are deeply equal
   */
  arraysEqual<T>(a: T[], b: T[], strict = false): boolean {
    return Bun.deepEquals(a, b, strict);
  },

  /**
   * Check if two objects are deeply equal
   */
  objectsEqual(a: Record<string, any>, b: Record<string, any>, strict = false): boolean {
    return Bun.deepEquals(a, b, strict);
  },
};

/**
 * HTML escaping utilities
 */
export const HTMLUtils = {
  /**
   * Escape HTML entities in a string
   */
  escape(text: string): string {
    return Bun.escapeHTML(text);
  },

  /**
   * Safely create HTML from template string
   */
  safeTemplate(template: string, ...values: any[]): string {
    return template.replace(/\{\{(\d+)\}\}/g, (_, index) => {
      return Bun.escapeHTML(String(values[parseInt(index)] || ''));
    });
  },

  /**
   * Escape all values in an object
   */
  escapeObject(obj: Record<string, any>): Record<string, string> {
    const escaped: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      escaped[key] = Bun.escapeHTML(String(value));
    }
    return escaped;
  },
};

/**
 * String width utilities
 */
export const StringWidth = {
  /**
   * Calculate display width of a string (handles Unicode, emojis, etc.)
   */
  width(text: string): number {
    return Bun.stringWidth(text);
  },

  /**
   * Pad string to target width (respects Unicode width)
   */
  pad(text: string, targetWidth: number, padChar: string = ' ', align: 'left' | 'right' | 'center' = 'left'): string {
    const currentWidth = Bun.stringWidth(text);
    const paddingNeeded = targetWidth - currentWidth;

    if (paddingNeeded <= 0) {
      return text;
    }

    const padding = padChar.repeat(paddingNeeded);

    switch (align) {
      case 'right':
        return padding + text;
      case 'center':
        const leftPad = Math.floor(paddingNeeded / 2);
        const rightPad = paddingNeeded - leftPad;
        return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
      default: // left
        return text + padding;
    }
  },

  /**
   * Truncate string to max width (respects Unicode width)
   */
  truncate(text: string, maxWidth: number, ellipsis: string = '...'): string {
    const ellipsisWidth = Bun.stringWidth(ellipsis);
    const maxContentWidth = maxWidth - ellipsisWidth;

    if (Bun.stringWidth(text) <= maxWidth) {
      return text;
    }

    // Simple truncation - could be improved with binary search
    let truncated = '';
    for (const char of text) {
      if (Bun.stringWidth(truncated + char) > maxContentWidth) {
        break;
      }
      truncated += char;
    }

    return truncated + ellipsis;
  },

  /**
   * Calculate column widths for table formatting
   */
  columnWidths(rows: Array<Array<string>>, headers?: string[]): number[] {
    const numColumns = headers ? headers.length : (rows[0]?.length || 0);
    const widths: number[] = [];

    for (let i = 0; i < numColumns; i++) {
      let maxWidth = headers ? Bun.stringWidth(headers[i]) : 0;
      for (const row of rows) {
        if (row[i]) {
          maxWidth = Math.max(maxWidth, Bun.stringWidth(String(row[i])));
        }
      }
      widths.push(maxWidth);
    }

    return widths;
  },
};

/**
 * Custom inspect helper
 */
export const CustomInspect = {
  /**
   * Create a simple custom inspect method
   */
  createSimple(name: string, props: Record<string, any>): () => string {
    return function () {
      const entries = Object.entries(props)
        .map(([key, value]) => {
          const valStr = typeof value === 'string' ? `"${value}"` : String(value);
          return `${key}=${valStr}`;
        })
        .join(', ');
      return `${name}(${entries})`;
    };
  },
};

/**
 * Combined utilities for common use cases
 */
export const BunUtils = {
  table: TableUtils,
  deepEquals: DeepEquals,
  html: HTMLUtils,
  stringWidth: StringWidth,
  inspect: CustomInspect,

  /**
   * Create a safe HTML element with escaped content
   */
  safeElement(tag: string, content: string, attributes?: Record<string, string>): string {
    const escapedContent = Bun.escapeHTML(content);
    const attrs = attributes
      ? ' ' + Object.entries(attributes)
          .map(([key, value]) => `${key}="${Bun.escapeHTML(value)}"`)
          .join(' ')
      : '';
    return `<${tag}${attrs}>${escapedContent}</${tag}>`;
  },

  /**
   * Format data for console display with proper width handling
   */
  formatForDisplay(data: Record<string, any>, maxWidth: number = 80): string {
    const lines: string[] = [];
    const maxKeyWidth = Math.max(...Object.keys(data).map(k => Bun.stringWidth(k)));

    for (const [key, value] of Object.entries(data)) {
      const keyPadded = StringWidth.pad(key, maxKeyWidth);
      const valueStr = String(value);
      const valueTruncated = StringWidth.truncate(valueStr, maxWidth - maxKeyWidth - 3);
      lines.push(`${keyPadded}: ${valueTruncated}`);
    }

    return lines.join('\n');
  },
};


