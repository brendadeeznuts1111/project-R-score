// terminal/unicode-formatter.ts
import { getActiveTimezoneConfig } from '../bootstrap-timezone';

export interface TableOptions {
  maxWidth?: number;
  compact?: boolean;
  showIndices?: boolean;
  colors?: boolean;
  sortBy?: SortConfig[];
  filter?: Record<string, any>;
  maxRows?: number;
}

export interface SortConfig {
  column: string;        // supports dot notation: "metadata.created"
  direction: 'asc' | 'desc';
  type?: 'string' | 'number' | 'boolean' | 'date' | 'emoji' | 'auto';
  customComparator?: (a: any, b: any) => number;
}

/**
 * Enhanced Unicode-aware table formatter with deep sorting & filtering
 */
export class UnicodeTableFormatter {
  
  static generateTable(
    rawData: any[],
    options: TableOptions = {}
  ): string {
    const terminalWidth = process.stdout.columns || 120;
    const maxWidth = options.maxWidth || Math.min(terminalWidth, 160);
    
    // Apply filtering first
    let data = this.applyFilters(rawData, options.filter || {});
    
    // Apply sorting
    if (options.sortBy && options.sortBy.length > 0) {
      data = this.sortData(data, options.sortBy);
    }
    
    // Limit rows
    if (options.maxRows && data.length > options.maxRows) {
      data = data.slice(0, options.maxRows);
    }

    if (data.length === 0) {
      return '📭 No data to display (filtered/sorted result empty)';
    }

    // Extract all possible headers (including nested paths)
    const headers = this.extractHeaders(data);
    const columnWidths = this.calculateColumnWidths(data, headers, maxWidth);
    
    let output = '\n';
    
    // Header row
    const headerRow = this.formatRow(headers, columnWidths, 'header');
    const separator = this.createSeparator(columnWidths);
    
    output += headerRow + '\n';
    output += separator + '\n';
    
    // Data rows
    data.forEach((row, index) => {
      const rowValues = headers.map(h => this.getNestedValue(row, h));
      const formattedRow = this.formatRow(rowValues, columnWidths, 'data', index);
      output += formattedRow + '\n';
    });
    
    output += separator + '\n';
    
    // Enhanced summary
    const originalCount = rawData.length;
    const filteredCount = data.length;
    const sortInfo = options.sortBy?.map(s => `${s.column}(${s.direction})`).join(', ') || 'none';
    
    output += `📊 ${filteredCount}/${originalCount} rows • ${headers.length} columns • Sorted: ${sortInfo}\n`;
    output += `📏 Terminal: ${terminalWidth} chars | TZ: ${getActiveTimezoneConfig().displayName}\n`;
    
    return output;
  }

  /**
   * Extract all unique field paths from nested objects
   */
  private static extractHeaders(data: any[]): string[] {
    const paths = new Set<string>();
    
    const traverse = (obj: any, prefix = '') => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key;
          paths.add(path);
          if (value && typeof value === 'object' && !this.isPrimitive(value)) {
            traverse(value, path);
          }
        }
      }
    };
    
    data.forEach(item => traverse(item));
    return Array.from(paths).sort();
  }

  /**
   * Check if value is primitive (shouldn't be traversed further)
   */
  private static isPrimitive(value: any): boolean {
    return value === null || 
           value === undefined || 
           typeof value === 'string' || 
           typeof value === 'number' || 
           typeof value === 'boolean' ||
           value instanceof Date;
  }

  /**
   * Get value from nested path (e.g., "user.profile.email")
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Apply filters (exact match only for v3.7)
   */
  private static applyFilters(data: any[], filters: Record<string, any>): any[] {
    if (Object.keys(filters).length === 0) return data;
    
    return data.filter(item => {
      return Object.entries(filters).every(([path, expected]) => {
        const actual = this.getNestedValue(item, path);
        return actual === expected;
      });
    });
  }

  /**
   * Multi-level stable sort with type inference
   */
  private static sortData(data: any[], sortConfigs: SortConfig[]): any[] {
    return [...data].sort((a, b) => {
      for (const config of sortConfigs) {
        const aValue = this.getNestedValue(a, config.column);
        const bValue = this.getNestedValue(b, config.column);
        
        let compareResult: number;
        
        if (config.customComparator) {
          compareResult = config.customComparator(aValue, bValue);
        } else {
          const type = config.type || this.inferType(aValue, bValue);
          compareResult = this.compareValues(aValue, bValue, type);
        }
        
        if (compareResult !== 0) {
          return config.direction === 'asc' ? compareResult : -compareResult;
        }
      }
      return 0; // preserve original order for equal items (stable sort)
    });
  }

  /**
   * Infer data type for sorting
   */
  private static inferType(a: any, b: any): 'string' | 'number' | 'boolean' | 'date' | 'emoji' {
    // Handle nulls
    if (a == null && b == null) return 'string';
    if (a == null) return 'string';
    if (b == null) return 'string';
    
    // Boolean check
    if (typeof a === 'boolean' || typeof b === 'boolean') return 'boolean';
    
    // Number check (including numeric strings)
    const aNum = typeof a === 'number' ? a : (typeof a === 'string' && !isNaN(Number(a)) && !isNaN(parseFloat(a)) ? Number(a) : NaN);
    const bNum = typeof b === 'number' ? b : (typeof b === 'string' && !isNaN(Number(b)) && !isNaN(parseFloat(b)) ? Number(b) : NaN);
    if (!isNaN(aNum) && !isNaN(bNum)) return 'number';
    
    // Date check (ISO strings or Date objects)
    const aDate = a instanceof Date ? a : (typeof a === 'string' && !isNaN(Date.parse(a)) ? new Date(a) : null);
    const bDate = b instanceof Date ? b : (typeof b === 'string' && !isNaN(Date.parse(b)) ? new Date(b) : null);
    if (aDate && bDate) return 'date';
    
    // Emoji detection (basic)
    if (this.isEmoji(String(a)) || this.isEmoji(String(b))) return 'emoji';
    
    return 'string';
  }

  /**
   * Basic emoji detection
   */
  private static isEmoji(str: string): boolean {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return emojiRegex.test(str);
  }

  /**
   * Compare values by type
   */
  private static compareValues(a: any, b: any, type: string): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    switch (type) {
      case 'number':
        return (Number(a) || 0) - (Number(b) || 0);
      
      case 'boolean':
        return (a === true ? 1 : 0) - (b === true ? 1 : 0);
      
      case 'date':
        const aDate = a instanceof Date ? a : new Date(a);
        const bDate = b instanceof Date ? b : new Date(b);
        return aDate.getTime() - bDate.getTime();
      
      case 'emoji':
      case 'string':
      default:
        return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
    }
  }

  /**
   * Calculate column widths with Unicode-aware measurement
   */
  private static calculateColumnWidths(
    data: any[],
    headers: string[],
    maxWidth: number
  ): number[] {
    // Start with header widths
    const widths = headers.map(h => Bun.stringWidth(h));
    
    // Expand based on data
    data.forEach(row => {
      headers.forEach((header, idx) => {
        const value = this.getNestedValue(row, header);
        const formattedValue = this.formatCellValue(value);
        const width = Bun.stringWidth(formattedValue);
        if (width > widths[idx]) {
          widths[idx] = Math.min(width, 50); // Cap at 50 chars
        }
      });
    });
    
    // Adjust for terminal width
    const totalWidth = widths.reduce((sum, w) => sum + w + 3, 0); // +3 for padding
    const maxColumnWidth = Math.floor((maxWidth - 10) / widths.length);
    
    if (totalWidth > maxWidth) {
      return widths.map(w => Math.min(w, maxColumnWidth));
    }
    
    return widths;
  }

  /**
   * Format cell value with Unicode/ANSI awareness
   */
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '📭';
    }
    
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌';
    }
    
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      // Compact object display
      const str = JSON.stringify(value);
      return Bun.stringWidth(str) > 20 
        ? str.slice(0, 17) + '...' 
        : str;
    }
    
    const str = String(value);
    
    // Handle common emoji/Unicode patterns
    return this.normalizeUnicode(str);
  }

  /**
   * Normalize Unicode for consistent width calculation
   */
  private static normalizeUnicode(text: string): string {
    // Remove zero-width characters that don't affect display
    const zeroWidthRegex = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g;
    const normalized = text.replace(zeroWidthRegex, '');
    
    // Replace common emoji sequences with single-width representations
    const emojiMap: Record<string, string> = {
      '🇺🇸': '🇺🇸', // Flag emoji (width 2)
      '👋🏽': '👋🏽', // Emoji + skin tone (width 2)
      '👨‍👩‍👧': '👨‍👩‍👧', // ZWJ family sequence (width 2)
      '1️⃣': '1️⃣',   // Keycap sequence (width 2)
    };
    
    // For table display, we might want to use simpler representations
    const simplified = normalized.replace(
      /[\u{1F1E6}-\u{1F1FF}][\u{1F1E6}-\u{1F1FF}]/gu,
      '🇺🇳' // Generic flag
    );
    
    return simplified;
  }

  /**
   * Format a single row with Unicode-aware padding
   */
  private static formatRow(
    values: any[],
    widths: number[],
    type: 'header' | 'data',
    rowIndex?: number
  ): string {
    const cells = values.map((value, idx) => {
      const cellValue = this.formatCellValue(value);
      const displayWidth = Bun.stringWidth(cellValue);
      const padding = Math.max(0, widths[idx] - displayWidth);
      
      let formatted = cellValue;
      
      // Apply styling based on type
      if (type === 'header') {
        formatted = `\x1b[1m${cellValue}\x1b[0m`; // Bold
      } else if (rowIndex !== undefined && rowIndex % 2 === 1) {
        formatted = `\x1b[90m${cellValue}\x1b[0m`; // Gray for alternating rows
      }
      
      return formatted + ' '.repeat(padding);
    });
    
    const prefix = rowIndex !== undefined ? `${rowIndex.toString().padStart(3)} │ ` : '';
    return prefix + cells.join(' │ ');
  }

  /**
   * Create separator line with proper Unicode characters
   */
  private static createSeparator(widths: number[]): string {
    const parts = widths.map(w => '─'.repeat(w));
    return '    ├─' + parts.join('─┼─') + '─┤';
  }

  /**
   * Generate summary with emoji visualization
   */
  static generateSummary(data: any[], keyField: string): string {
    const groups = new Map<string, number>();
    
    data.forEach(item => {
      const key = this.getNestedValue(item, keyField);
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    
    let output = '\n📊 DATA SUMMARY\n';
    output += '╔' + '═'.repeat(50) + '╗\n';
    
    groups.forEach((count, key) => {
      const barLength = Math.round((count / data.length) * 30);
      const bar = '█'.repeat(barLength);
      const percentage = ((count / data.length) * 100).toFixed(1);
      
      // Unicode-aware truncation
      const displayKey = Bun.stringWidth(String(key)) > 20 
        ? String(key).slice(0, 17) + '...'
        : String(key);
      
      output += `║ ${displayKey.padEnd(20)} ${bar.padEnd(30)} ${percentage}% ║\n`;
    });
    
    output += '╚' + '═'.repeat(50) + '╝\n';
    return output;
  }
}
