/**
 * Unicode-Aware Table Formatter
 * Uses Bun.stringWidth() for perfect alignment with emojis, flags, and special characters
 */

export interface TableColumn {
  header: string;
  key?: string; // For object data
  width?: number; // Fixed width (optional)
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface TableOptions {
  columns: TableColumn[];
  data?: Record<string, any>[];
  borders?: boolean;
  padding?: number;
  headerColor?: boolean;
  alternateRowColors?: boolean;
}

export class TableFormatter {
  /**
   * Calculate actual display width using Bun.stringWidth
   * Handles emojis, flags, ANSI codes, etc.
   */
  private static getDisplayWidth(text: string): number {
    // Remove ANSI escape codes for width calculation
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    const cleanText = text.replace(ansiRegex, '');
    return Bun.stringWidth(cleanText);
  }

  /**
   * Pad text to target width with proper Unicode handling
   */
  private static padText(
    text: string,
    width: number,
    align: 'left' | 'center' | 'right' = 'left',
    padding: number = 1
  ): string {
    const displayWidth = this.getDisplayWidth(text);
    const availableWidth = width - displayWidth;
    const padChar = ' ';

    if (availableWidth <= 0) {
      return text;
    }

    switch (align) {
      case 'right':
        return padChar.repeat(availableWidth) + text;
      case 'center':
        const leftPad = Math.floor(availableWidth / 2);
        const rightPad = availableWidth - leftPad;
        return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
      default: // left
        return text + padChar.repeat(availableWidth);
    }
  }

  /**
   * Create a horizontal border line
   */
  private static createBorder(widths: number[], padding: number): string {
    const segments = widths.map(w => '─'.repeat(w + padding * 2));
    return '├' + segments.join('┼') + '┤';
  }

  /**
   * Create a top/bottom border
   */
  private static createTopBorder(widths: number[], padding: number): string {
    const segments = widths.map(w => '─'.repeat(w + padding * 2));
    return '┌' + segments.join('┬') + '┐';
  }

  private static createBottomBorder(widths: number[], padding: number): string {
    const segments = widths.map(w => '─'.repeat(w + padding * 2));
    return '└' + segments.join('┴') + '┘';
  }

  /**
   * Format a single row
   */
  private static formatRow(
    values: string[],
    widths: number[],
    columns: TableColumn[],
    padding: number,
    borders: boolean
  ): string {
    const cells = values.map((value, index) => {
      const column = columns[index];
      const align = column?.align || 'left';
      const padded = this.padText(value, widths[index], align, padding);
      return borders ? `│ ${padded} ` : ` ${padded} `;
    });

    return borders ? cells.join('│') + '│' : cells.join('│');
  }

  /**
   * Calculate column widths based on content
   */
  private static calculateWidths(
    columns: TableColumn[],
    data: Record<string, any>[],
    padding: number
  ): number[] {
    return columns.map((column, index) => {
      // Use fixed width if specified
      if (column.width) {
        return column.width;
      }

      // Calculate width from header
      let maxWidth = this.getDisplayWidth(column.header);

      // Calculate width from data
      if (data) {
        data.forEach((row) => {
          const value = column.key ? row[column.key] : Object.values(row)[index];
          const formatted = column.format ? column.format(value) : String(value || '');
          const width = this.getDisplayWidth(formatted);
          maxWidth = Math.max(maxWidth, width);
        });
      }

      return maxWidth;
    });
  }

  /**
   * Format table with beautiful Unicode-aware alignment
   */
  static format(options: TableOptions): string {
    const {
      columns,
      data = [],
      borders = true,
      padding = 1,
      headerColor = false,
      alternateRowColors = false,
    } = options;

    const widths = this.calculateWidths(columns, data, padding);
    const lines: string[] = [];

    // Top border
    if (borders) {
      lines.push(this.createTopBorder(widths, padding));
    }

    // Header row
    const headers = columns.map((col) => col.header);
    const headerRow = this.formatRow(headers, widths, columns, padding, borders);
    if (headerColor) {
      lines.push(`\x1b[1;36m${headerRow}\x1b[0m`); // Bold cyan
    } else {
      lines.push(headerRow);
    }

    // Separator
    if (borders) {
      lines.push(this.createBorder(widths, padding));
    }

    // Data rows
    data.forEach((row, rowIndex) => {
      const values = columns.map((col) => {
        const value = col.key ? row[col.key] : Object.values(row)[columns.indexOf(col)];
        return col.format ? col.format(value) : String(value || '');
      });

      let rowText = this.formatRow(values, widths, columns, padding, borders);

      if (alternateRowColors && rowIndex % 2 === 1) {
        rowText = `\x1b[90m${rowText}\x1b[0m`; // Dim gray
      }

      lines.push(rowText);
    });

    // Bottom border
    if (borders) {
      lines.push(this.createBottomBorder(widths, padding));
    }

    return lines.join('\n');
  }

  /**
   * Quick table helper for simple cases
   */
  static simple(rows: (string | number)[][], headers?: string[]): string {
    const columns: TableColumn[] = headers
      ? headers.map((h) => ({ header: h }))
      : rows[0].map((_, i) => ({ header: `Column ${i + 1}` }));

    const data = rows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, i) => {
        obj[col.key || `col${i}`] = row[i];
      });
      return obj;
    });

    // Add keys to columns
    columns.forEach((col, i) => {
      if (!col.key) {
        col.key = `col${i}`;
      }
    });

    return this.format({ columns, data, borders: true });
  }
}

/**
 * Convenience function for creating beautiful Unicode-aware tables
 */
export function createTable(options: TableOptions): string {
  return TableFormatter.format(options);
}

/**
 * Example usage demonstrating Unicode alignment
 */
export function exampleTable(): void {
  console.log('\n📊 Unicode-Aware Table Example\n');

  const table = TableFormatter.format({
    columns: [
      { header: '🇺🇸 Country', key: 'country', align: 'left' },
      { header: '📱 Phone', key: 'phone', align: 'center' },
      { header: '✅ Status', key: 'status', align: 'center' },
      { header: '📊 Score', key: 'score', align: 'right', format: (v) => `${v}%` },
    ],
    data: [
      { country: '🇺🇸 USA', phone: '📱 iPhone 14', status: '✅ Active', score: 95 },
      { country: '🇬🇧 UK', phone: '📱 Samsung S21', status: '✅ Active', score: 88 },
      { country: '🇯🇵 Japan', phone: '📱 Pixel 7', status: '⚠️ Pending', score: 92 },
      { country: '🇨🇦 Canada', phone: '📱 OnePlus 11', status: '❌ Inactive', score: 75 },
    ],
    borders: true,
    padding: 1,
    headerColor: true,
    alternateRowColors: true,
  });

  console.log(table);
  console.log('\n✅ Perfect alignment with emojis, flags, and Unicode!');
}


