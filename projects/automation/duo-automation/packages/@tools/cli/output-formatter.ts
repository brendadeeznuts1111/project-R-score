/**
 * Bun-Native CLI Output Formatting Utilities
 * 
 * Intelligent output formatting with proper width calculation (6756x faster than string-width)
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface TableOptions {
  maxRows?: number;
  showHeaders?: boolean;
  showBorders?: boolean;
  padding?: number;
  compact?: boolean;
}

export interface StatusBadge {
  status: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'magenta' | 'cyan';
  icon?: string;
}

export interface FormatOptions {
  colors?: boolean;
  unicode?: boolean;
  compact?: boolean;
  timestamps?: boolean;
}

export class BunOutputFormatter {
  private static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  };

  /**
   * Format table with proper width calculation (6756x faster than string-width)
   */
  static formatAgentTable(
    agents: Array<{ id: string; status: string; balance: number }>,
    options: TableOptions = {}
  ): string {
    const { maxRows = Infinity, showHeaders = true, showBorders = true, padding = 1, compact = false } = options;
    
    const header = ['ID', 'Status', 'Balance'];
    const rows = agents
      .slice(0, maxRows)
      .map(a => [a.id, a.status, `$${a.balance.toFixed(2)}`]);
    
    // Calculate column widths using Bun.stringWidth
    const allRows = showHeaders ? [header, ...rows] : rows;
    const widths = header.map((h, i) => {
      const maxContent = Math.max(
        Bun.stringWidth(h),
        ...rows.map(r => Bun.stringWidth(r[i] || ''))
      );
      return maxContent + (padding * 2);
    });

    // Build table
    let table = '';
    
    if (showHeaders) {
      if (compact) {
        table += header.map((h, i) => h.padEnd(widths[i] - padding)).join(' ');
      } else {
        table += header.map((h, i) => h.padStart(widths[i] - padding).padEnd(widths[i])).join(' | ');
      }
      table += '\n';
      
      if (showBorders) {
        if (compact) {
          table += widths.map(w => '-'.repeat(w - padding)).join(' ');
        } else {
          table += widths.map(w => '-'.repeat(w)).join('-|-');
        }
        table += '\n';
      }
    }
    
    for (const row of rows) {
      if (compact) {
        table += row.map((c, i) => (c || '').padEnd(widths[i] - padding)).join(' ');
      } else {
        table += row.map((c, i) => (c || '').padStart(widths[i] - padding).padEnd(widths[i])).join(' | ');
      }
      table += '\n';
    }
    
    return table;
  }

  /**
   * Format generic table with custom columns
   */
  static formatTable<T>(
    data: T[],
    columns: TableColumn[],
    options: TableOptions = {}
  ): string {
    const { showHeaders = true, showBorders = true, padding = 1, compact = false } = options;
    
    // Calculate column widths
    const widths = columns.map(col => {
      const headerWidth = Bun.stringWidth(col.header);
      const maxDataWidth = Math.max(
        ...data.map(item => {
          const value = this.getNestedValue(item, col.key);
          const formatted = col.format ? col.format(value) : String(value || '');
          return Bun.stringWidth(formatted);
        })
      );
      return Math.max(headerWidth, maxDataWidth) + (padding * 2);
    });

    let table = '';
    
    // Headers
    if (showHeaders) {
      table += columns.map((col, i) => {
        const header = col.header;
        const width = widths[i];
        const padded = header.padStart(width - padding).padEnd(width);
        return padded;
      }).join(compact ? ' ' : ' | ');
      table += '\n';
      
      if (showBorders) {
        table += widths.map(w => '-'.repeat(w)).join(compact ? ' ' : '-|-');
        table += '\n';
      }
    }
    
    // Data rows
    for (const item of data) {
      table += columns.map((col, i) => {
        const value = this.getNestedValue(item, col.key);
        const formatted = col.format ? col.format(value) : String(value || '');
        const width = widths[i];
        const padded = formatted.padStart(width - padding).padEnd(width);
        return padded;
      }).join(compact ? ' ' : ' | ');
      table += '\n';
    }
    
    return table;
  }

  /**
   * Strip ANSI from logs for clean storage (6-57x faster than strip-ansi)
   */
  static cleanLogs(logs: string): string {
    return Bun.stripANSI(logs);
  }

  /**
   * Generate colored status with width calculation
   */
  static statusBadge(status: string, options: StatusBadge = {}): string {
    const { color = this.getStatusColor(status), icon = this.getStatusIcon(status) } = options;
    
    const coloredStatus = `${this.getColor(color)}${icon} ${status}${this.getColor('reset')}`;
    
    // Calculate visible width (excluding ANSI)
    const visibleWidth = Bun.stringWidth(coloredStatus, { countAnsiEscapeCodes: false });
    
    return coloredStatus;
  }

  /**
   * Format progress bar
   */
  static progressBar(current: number, total: number, width: number = 50, options: FormatOptions = {}): string {
    const { colors = true, unicode = true } = options;
    const percentage = total > 0 ? (current / total) : 0;
    const filled = Math.floor(width * percentage);
    const empty = width - filled;
    
    let bar = '';
    if (unicode) {
      bar = '█'.repeat(filled) + '░'.repeat(empty);
    } else {
      bar = '='.repeat(filled) + '-'.repeat(empty);
    }
    
    if (colors) {
      const color = percentage >= 1 ? this.getColor('green') : 
                   percentage >= 0.5 ? this.getColor('yellow') : 
                   this.getColor('red');
      bar = `${color}${bar}${this.getColor('reset')}`;
    }
    
    return `[${bar}] ${percentage.toFixed(1)}% (${current}/${total})`;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else if (ms < 3600000) {
      return `${(ms / 60000).toFixed(1)}m`;
    } else {
      return `${(ms / 3600000).toFixed(1)}h`;
    }
  }

  /**
   * Format timestamp
   */
  static formatTimestamp(timestamp: number | Date, options: FormatOptions = {}): string {
    const { timestamps = true } = options;
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    
    if (!timestamps) {
      return date.toISOString();
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format JSON with colors
   */
  static formatJson(obj: any, indent: number = 2): string {
    const json = JSON.stringify(obj, null, indent);
    return this.colorizeJson(json);
  }

  /**
   * Colorize JSON string
   */
  private static colorizeJson(json: string): string {
    return json
      .replace(/"([^"]+)":/g, `${this.getColor('cyan')}"$1"${this.getColor('reset')}:`)
      .replace(/:\s*"([^"]*)"/g, `: ${this.getColor('green')}"$1"${this.getColor('reset')}`)
      .replace(/:\s*(true|false)/g, `: ${this.getColor('yellow')}$1${this.getColor('reset')}`)
      .replace(/:\s*(null)/g, `: ${this.getColor('gray')}$1${this.getColor('reset')}`)
      .replace(/:\s*(\d+)/g, `: ${this.getColor('magenta')}$1${this.getColor('reset')}`);
  }

  /**
   * Format list with bullets
   */
  static formatList(items: string[], options: { bullets?: string; indent?: number } = {}): string {
    const { bullets = '•', indent = 2 } = options;
    return items.map(item => `${' '.repeat(indent)}${bullets} ${item}`).join('\n');
  }

  /**
   * Format key-value pairs
   */
  static formatKeyValue(pairs: Record<string, any>, options: FormatOptions = {}): string {
    const { colors = true } = options;
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(pairs)) {
      const formattedKey = colors ? `${this.getColor('cyan')}${key}:${this.getColor('reset')}` : `${key}:`;
      const formattedValue = typeof value === 'object' ? 
        this.formatJson(value) : 
        (colors ? `${this.getColor('green')}${value}${this.getColor('reset')}` : String(value));
      
      lines.push(`${formattedKey} ${formattedValue}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format error message
   */
  static formatError(error: Error | string, options: { stack?: boolean } = {}): string {
    const { stack = false } = options;
    const message = typeof error === 'string' ? error : error.message;
    
    let formatted = `${this.getColor('red')}❌ Error: ${message}${this.getColor('reset')}`;
    
    if (stack && typeof error === 'object' && error.stack) {
      formatted += `\n${this.getColor('dim')}${error.stack}${this.getColor('reset')}`;
    }
    
    return formatted;
  }

  /**
   * Format success message
   */
  static formatSuccess(message: string): string {
    return `${this.getColor('green')}✅ ${message}${this.getColor('reset')}`;
  }

  /**
   * Format warning message
   */
  static formatWarning(message: string): string {
    return `${this.getColor('yellow')}⚠️  ${message}${this.getColor('reset')}`;
  }

  /**
   * Format info message
   */
  static formatInfo(message: string): string {
    return `${this.getColor('blue')}ℹ️  ${message}${this.getColor('reset')}`;
  }

  /**
   * Truncate text to fit width
   */
  static truncate(text: string, width: number, suffix: string = '...'): string {
    const visibleWidth = Bun.stringWidth(text);
    if (visibleWidth <= width) {
      return text;
    }
    
    const suffixWidth = Bun.stringWidth(suffix);
    const targetWidth = width - suffixWidth;
    
    let truncated = '';
    let currentWidth = 0;
    
    for (const char of text) {
      const charWidth = Bun.stringWidth(char);
      if (currentWidth + charWidth > targetWidth) {
        break;
      }
      truncated += char;
      currentWidth += charWidth;
    }
    
    return truncated + suffix;
  }

  /**
   * Wrap text to fit width
   */
  static wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let currentWidth = 0;
    
    for (const word of words) {
      const wordWidth = Bun.stringWidth(word);
      const separatorWidth = currentLine.length > 0 ? 1 : 0; // Space
      
      if (currentWidth + separatorWidth + wordWidth > width) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = word;
          currentWidth = wordWidth;
        } else {
          // Word is longer than width, break it
          lines.push(word);
          currentLine = '';
          currentWidth = 0;
        }
      } else {
        if (currentLine.length > 0) {
          currentLine += ' ' + word;
          currentWidth += separatorWidth + wordWidth;
        } else {
          currentLine = word;
          currentWidth = wordWidth;
        }
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Get color code by name
   */
  private static getColor(colorName: string): string {
    const colorMap: Record<string, string> = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };
    return colorMap[colorName] || '';
  }

  // Private helper methods
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'magenta' | 'cyan' {
    const colors: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'magenta' | 'cyan'> = {
      active: 'green',
      success: 'green',
      completed: 'green',
      online: 'green',
      pending: 'yellow',
      warning: 'yellow',
      processing: 'yellow',
      error: 'red',
      failed: 'red',
      offline: 'red',
      inactive: 'red',
      info: 'blue',
      unknown: 'magenta',
      neutral: 'cyan'
    };
    
    return colors[status.toLowerCase()] || 'gray';
  }

  private static getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      active: '●',
      success: '✓',
      completed: '✓',
      online: '●',
      pending: '○',
      warning: '⚠',
      processing: '⟳',
      error: '✗',
      failed: '✗',
      offline: '○',
      inactive: '○',
      info: 'ℹ',
      unknown: '?',
      neutral: '○'
    };
    
    return icons[status.toLowerCase()] || '•';
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'table') {
    // Demo table formatting
    const agents = Array.from({ length: 50 }, (_, i) => ({
      id: `AG${String(i).padStart(6, '0')}`,
      status: ['active', 'pending', 'error'][i % 3],
      balance: Math.random() * 1000
    }));
    
    console.log(BunOutputFormatter.formatAgentTable(agents, { maxRows: 10 }));
  } else if (args[0] === 'progress') {
    // Demo progress bar
    for (let i = 0; i <= 100; i += 10) {
      console.log(BunOutputFormatter.progressBar(i, 100, 30));
      Bun.sleep(100);
    }
  } else if (args[0] === 'clean') {
    // Demo ANSI cleaning
    const colored = `${BunOutputFormatter.colors.red}Error${BunOutputFormatter.colors.reset} message`;
    const clean = BunOutputFormatter.cleanLogs(colored);
    console.log(`Original: ${colored}`);
    console.log(`Cleaned: ${clean}`);
    console.log(`Visible width: ${Bun.stringWidth(clean)}`);
  } else if (args[0] === 'status') {
    // Demo status badges
    const statuses = ['active', 'pending', 'error', 'success', 'warning'];
    for (const status of statuses) {
      console.log(BunOutputFormatter.statusBadge(status));
    }
  } else {
    console.log('Usage:');
    console.log('  bun output-formatter.ts table');
    console.log('  bun output-formatter.ts progress');
    console.log('  bun output-formatter.ts clean');
    console.log('  bun output-formatter.ts status');
  }
}
