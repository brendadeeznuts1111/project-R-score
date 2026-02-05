import { color } from "bun" with { type: "macro" };

// CLI color definitions optimized for terminal output
export const CLI_COLORS = {
  // Standard CLI colors
  success: color("green", "ansi"),
  error: color("red", "ansi"),
  warning: color("yellow", "ansi"),
  info: color("cyan", "ansi"),
  debug: color("blue", "ansi"),
  
  // Financial CLI colors
  profit: color("brightGreen", "ansi"),
  loss: color("brightRed", "ansi"),
  neutral: color("brightYellow", "ansi"),
  
  // Highlight colors
  highlight: color("brightCyan", "ansi"),
  accent: color("magenta", "ansi"),
  primary: color("brightBlue", "ansi"),
  
  // Status indicators
  online: color("brightGreen", "ansi"),
  offline: color("gray", "ansi"),
  pending: color("brightYellow", "ansi"),
  
  // Text formatting
  bold: color("white", "ansi"),
  dim: color("gray", "ansi"),
  underline: color("white", "ansi"),
  
  // Special effects
  successBg: color("black", "ansi"), // Used with green text
  errorBg: color("black", "ansi"),   // Used with red text
  warningBg: color("black", "ansi"), // Used with yellow text
} as const;

export type CliColor = keyof typeof CLI_COLORS;

// CLI formatting utilities
export class CliFormatter {
  // Colorize text with specified color
  static colorize(text: string, color: CliColor): string {
    const colorCode = CLI_COLORS[color];
    return `\x1b[${colorCode}m${text}\x1b[0m`;
  }

  // Success formatting
  static success(text: string): string {
    return this.colorize(`✅ ${text}`, 'success');
  }

  // Error formatting
  static error(text: string): string {
    return this.colorize(`❌ ${text}`, 'error');
  }

  // Warning formatting
  static warning(text: string): string {
    return this.colorize(`⚠️ ${text}`, 'warning');
  }

  // Info formatting
  static info(text: string): string {
    return this.colorize(`ℹ️ ${text}`, 'info');
  }

  // Profit formatting (financial)
  static profit(amount: string | number): string {
    const formatted = typeof amount === 'number' ? 
      `+$${amount.toLocaleString()}` : 
      `+${amount}`;
    return this.colorize(`💰 ${formatted}`, 'profit');
  }

  // Loss formatting (financial)
  static loss(amount: string | number): string {
    const formatted = typeof amount === 'number' ? 
      `-$${amount.toLocaleString()}` : 
      `-${amount}`;
    return this.colorize(`💸 ${formatted}`, 'loss');
  }

  // Neutral formatting (financial)
  static neutral(amount: string | number): string {
    const formatted = typeof amount === 'number' ? 
      `$${amount.toLocaleString()}` : 
      `${amount}`;
    return this.colorize(`💵 ${formatted}`, 'neutral');
  }

  // Status formatting
  static status(status: 'online' | 'offline' | 'pending'): string {
    const icons = {
      online: '🟢',
      offline: '🔴',
      pending: '🟡',
    };
    return this.colorize(`${icons[status]} ${status}`, status);
  }

  // Progress bar
  static progressBar(current: number, total: number, width: number = 30): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentageText = `${percentage}%`.padStart(4);
    
    return this.colorize(`[${bar}] ${percentageText}`, 'primary');
  }

  // Table formatting
  static table(headers: string[], rows: string[][]): string {
    if (rows.length === 0) return this.info('No data to display');
    
    // Calculate column widths
    const widths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => (row[i] || '').length))
    );
    
    // Format header
    const headerRow = headers.map((header, i) => 
      this.colorize(header.padEnd(widths[i]), 'accent')
    ).join(' | ');
    
    // Format separator
    const separator = widths.map(width => '-'.repeat(width)).join('-+-');
    
    // Format data rows
    const dataRows = rows.map(row => 
      row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' | ')
    );
    
    return [
      headerRow,
      separator,
      ...dataRows
    ].join('\n');
  }

  // Box formatting
  static box(content: string, title?: string, color: CliColor = 'primary'): string {
    const lines = content.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    
    const boxWidth = maxLineLength + 4; // 2 padding on each side
    const horizontalLine = '─'.repeat(boxWidth);
    
    const result: string[] = [];
    
    // Top border with title
    if (title) {
      const titleWithPadding = ` ${title} `;
      const titleLineLength = titleWithPadding.length;
      const remainingWidth = boxWidth - titleLineLength - 2; // 2 corners
      const leftPadding = Math.floor(remainingWidth / 2);
      const rightPadding = remainingWidth - leftPadding;
      
      result.push(this.colorize(`┌${'─'.repeat(leftPadding)}${titleWithPadding}${'─'.repeat(rightPadding)}┐`, color));
    } else {
      result.push(this.colorize(`┌${horizontalLine}┐`, color));
    }
    
    // Content
    for (const line of lines) {
      const paddedLine = ` ${line.padEnd(maxLineLength)} `;
      result.push(this.colorize(`│${paddedLine}│`, color));
    }
    
    // Bottom border
    result.push(this.colorize(`└${horizontalLine}┘`, color));
    
    return result.join('\n');
  }

  // Highlight keywords in text
  static highlight(text: string, keywords: string[], color: CliColor = 'highlight'): string {
    let result = text;
    
    for (const keyword of keywords) {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, this.colorize('$1', color));
    }
    
    return result;
  }

  // Spinner for long operations
  static spinner(frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']): string[] {
    return frames.map(frame => this.colorize(frame, 'primary'));
  }
}

// Quick access functions for common CLI operations
export const cli = {
  success: (text: string) => CliFormatter.success(text),
  error: (text: string) => CliFormatter.error(text),
  warning: (text: string) => CliFormatter.warning(text),
  info: (text: string) => CliFormatter.info(text),
  profit: (amount: string | number) => CliFormatter.profit(amount),
  loss: (amount: string | number) => CliFormatter.loss(amount),
  neutral: (amount: string | number) => CliFormatter.neutral(amount),
  status: (status: 'online' | 'offline' | 'pending') => CliFormatter.status(status),
  progress: (current: number, total: number, width?: number) => CliFormatter.progressBar(current, total, width),
  table: (headers: string[], rows: string[][]) => CliFormatter.table(headers, rows),
  box: (content: string, title?: string, color?: CliColor) => CliFormatter.box(content, title, color),
  colorize: (text: string, color: CliColor) => CliFormatter.colorize(text, color),
};

// Export for use in compiled binaries
export type { CliColor };
export { CLI_COLORS };

// Example usage in CLI:
// console.log(cli.success("Operation completed"));
// console.log(cli.profit(1234.56));
// console.log(cli.progress(75, 100));
// console.log(cli.table(["Name", "Value"], [["Item 1", "100"], ["Item 2", "200"]]));
