/**
 * CLI Output Formatter
 * Advanced formatting options for CLI output (table, JSON, CSV)
 */

import { empireLog, chalk } from '../../utils/bun-console-colors';

export interface FormatOptions {
  format: 'table' | 'json' | 'csv';
  colors?: boolean;
  headers?: boolean;
  pretty?: boolean;
  delimiter?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export class OutputFormatter {
  private options: FormatOptions;

  constructor(options: Partial<FormatOptions> = {}) {
    this.options = {
      format: 'table',
      colors: true,
      headers: true,
      pretty: true,
      delimiter: ',',
      ...options
    };
  }

  /**
   * Format data according to specified format
   */
  format(data: any[], columns?: TableColumn[]): string {
    switch (this.options.format) {
      case 'json':
        return this.formatJSON(data);
      case 'csv':
        return this.formatCSV(data, columns);
      case 'table':
      default:
        return this.formatTable(data, columns);
    }
  }

  /**
   * Format as JSON
   */
  private formatJSON(data: any[]): string {
    const indent = this.options.pretty ? 2 : 0;
    return JSON.stringify(data, null, indent);
  }

  /**
   * Format as CSV
   */
  private formatCSV(data: any[], columns?: TableColumn[]): string {
    if (!data || data.length === 0) return '';

    const cols = columns || this.inferColumns(data[0]);
    const rows: string[] = [];

    // Add headers
    if (this.options.headers) {
      rows.push(cols.map(col => col.label).join(this.options.delimiter!));
    }

    // Add data rows
    data.forEach(item => {
      const row = cols.map(col => {
        const value = this.getNestedValue(item, col.key);
        const formatted = col.format ? col.format(value) : this.formatValue(value);
        return this.escapeCSVValue(formatted);
      });
      rows.push(row.join(this.options.delimiter!));
    });

    return rows.join('\n');
  }

  /**
   * Format as table
   */
  private formatTable(data: any[], columns?: TableColumn[]): string {
    if (!data || data.length === 0) {
      return chalk.yellow('No data to display');
    }

    const cols = columns || this.inferColumns(data[0]);
    const calculatedWidths = this.calculateColumnWidths(data, cols);
    
    const lines: string[] = [];

    // Add header
    if (this.options.headers) {
      const header = cols.map(col => {
        const width = col.width || calculatedWidths[col.key] || col.label.length;
        return this.padString(col.label, width, col.align);
      }).join(' | ');
      
      lines.push(chalk.cyan(header));
      lines.push(chalk.gray('-'.repeat(header.length)));
    }

    // Add data rows
    data.forEach((item, index) => {
      const row = cols.map(col => {
        const value = this.getNestedValue(item, col.key);
        const formatted = col.format ? col.format(value) : this.formatValue(value);
        const width = col.width || calculatedWidths[col.key] || formatted.length;
        return this.padString(formatted, width, col.align);
      }).join(' | ');
      
      lines.push(row);
    });

    // Add summary
    if (data.length > 1) {
      lines.push('');
      lines.push(chalk.gray(`Total: ${data.length} items`));
    }

    return lines.join('\n');
  }

  /**
   * Infer columns from data object
   */
  private inferColumns(item: any): TableColumn[] {
    if (!item || typeof item !== 'object') {
      return [{ key: 'value', label: 'Value' }];
    }

    return Object.keys(item).map(key => ({
      key,
      label: this.capitalize(key.replace(/_/g, ' ')),
      align: this.getColumnAlignment(item[key]) as 'left' | 'center' | 'right'
    }));
  }

  /**
   * Calculate optimal column widths
   */
  private calculateColumnWidths(data: any[], columns: TableColumn[]): Record<string, number> {
    const widths: Record<string, number> = {};

    columns.forEach(col => {
      let maxWidth = col.label.length;

      data.forEach(item => {
        const value = this.getNestedValue(item, col.key);
        const formatted = col.format ? col.format(value) : this.formatValue(value);
        maxWidth = Math.max(maxWidth, formatted.length);
      });

      widths[col.key] = maxWidth;
    });

    return widths;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return chalk.gray('N/A');
    }

    if (typeof value === 'boolean') {
      return value ? chalk.green('✓') : chalk.red('✗');
    }

    if (typeof value === 'number') {
      if (value > 1000000) {
        return chalk.yellow((value / 1000000).toFixed(1) + 'M');
      }
      if (value > 1000) {
        return chalk.yellow((value / 1000).toFixed(1) + 'K');
      }
      return chalk.yellow(value.toString());
    }

    if (typeof value === 'string') {
      // Truncate long strings
      if (value.length > 50) {
        return value.substring(0, 47) + '...';
      }
      return value;
    }

    if (value instanceof Date) {
      return chalk.blue(value.toISOString());
    }

    if (Array.isArray(value)) {
      return chalk.gray(`[${value.length} items]`);
    }

    if (typeof value === 'object') {
      return chalk.gray('{Object}');
    }

    return String(value);
  }

  /**
   * Determine column alignment based on data type
   */
  private getColumnAlignment(value: any): 'left' | 'center' | 'right' {
    if (typeof value === 'number') {
      return 'right';
    }
    if (typeof value === 'boolean') {
      return 'center';
    }
    return 'left';
  }

  /**
   * Pad string to specified width with alignment
   */
  private padString(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
    if (str.length >= width) {
      return str;
    }

    const pad = width - str.length;
    
    switch (align) {
      case 'center':
        const leftPad = Math.floor(pad / 2);
        const rightPad = pad - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      case 'right':
        return ' '.repeat(pad) + str;
      case 'left':
      default:
        return str + ' '.repeat(pad);
    }
  }

  /**
   * Escape CSV value
   */
  private escapeCSVValue(value: string): string {
    if (value.includes(this.options.delimiter!) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format risk score with color
   */
  static formatRiskScore(score: number): string {
    if (score >= 70) {
      return chalk.red(score.toString());
    }
    if (score >= 40) {
      return chalk.yellow(score.toString());
    }
    return chalk.green(score.toString());
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format date
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format duration
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    if (ms < 3600000) {
      return `${(ms / 60000).toFixed(1)}m`;
    }
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Create predefined column sets
   */
  static createColumnSets() {
    return {
      cashapp: [
        { key: 'cashtag', label: 'Cashtag', align: 'left' as const },
        { key: 'displayName', label: 'Display Name', align: 'left' as const },
        { key: 'verified', label: 'Verified', align: 'center' as const },
        { key: 'riskScore', label: 'Risk', align: 'right' as const, format: OutputFormatter.formatRiskScore },
        { key: 'transactionCount', label: 'Transactions', align: 'right' as const },
        { key: 'createdAt', label: 'Created', align: 'left' as const, format: OutputFormatter.formatDate }
      ],
      risk: [
        { key: 'cashtag', label: 'Cashtag', align: 'left' as const },
        { key: 'riskLevel', label: 'Risk Level', align: 'center' as const },
        { key: 'overallScore', label: 'Score', align: 'right' as const, format: OutputFormatter.formatRiskScore },
        { key: 'confidence', label: 'Confidence', align: 'right' as const, format: (v: number) => OutputFormatter.formatPercentage(v) },
        { key: 'lastUpdated', label: 'Last Updated', align: 'left' as const, format: OutputFormatter.formatDate }
      ],
      transactions: [
        { key: 'id', label: 'ID', align: 'left' as const },
        { key: 'amount', label: 'Amount', align: 'right' as const, format: OutputFormatter.formatCurrency },
        { key: 'type', label: 'Type', align: 'left' as const },
        { key: 'status', label: 'Status', align: 'center' as const },
        { key: 'timestamp', label: 'Time', align: 'left' as const, format: OutputFormatter.formatDate }
      ]
    };
  }
}

// Export convenience functions
export function formatTable(data: any[], columns?: TableColumn[]): string {
  const formatter = new OutputFormatter({ format: 'table' });
  return formatter.format(data, columns);
}

export function formatJSON(data: any[], pretty: boolean = true): string {
  const formatter = new OutputFormatter({ format: 'json', pretty });
  return formatter.format(data);
}

export function formatCSV(data: any[], columns?: TableColumn[]): string {
  const formatter = new OutputFormatter({ format: 'csv' });
  return formatter.format(data, columns);
}

export default OutputFormatter;
