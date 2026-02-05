import { Bun } from "bun";

// Runtime ANSI color definitions for server-side logging
const LOG_COLORS = {
  // Standard log levels
  success: Bun.color("hsl(145, 63%, 42%)", "ansi"),
  warning: Bun.color("hsl(25, 85%, 55%)", "ansi"),
  error: Bun.color("hsl(0, 75%, 60%)", "ansi"),
  info: Bun.color("hsl(195, 85%, 55%)", "ansi"),
  debug: Bun.color("hsl(210, 50%, 60%)", "ansi"),
  
  // Financial-specific colors
  profit: Bun.color("hsl(145, 70%, 45%)", "ansi"),
  loss: Bun.color("hsl(0, 70%, 55%)", "ansi"),
  neutral: Bun.color("hsl(45, 70%, 55%)", "ansi"),
  
  // System colors
  primary: Bun.color("hsl(210, 90%, 55%)", "ansi"),
  secondary: Bun.color("hsl(220, 85%, 60%)", "ansi"),
  accent: Bun.color("hsl(280, 70%, 60%)", "ansi"),
  
  // Status colors
  online: Bun.color("hsl(145, 70%, 50%)", "ansi"),
  offline: Bun.color("hsl(0, 0%, 60%)", "ansi"),
  pending: Bun.color("hsl(45, 80%, 55%)", "ansi"),
  
  // Special effects
  bold: "font-weight: bold",
  dim: "opacity: 0.7",
  underline: "text-decoration: underline",
} as const;

export type LogLevel = keyof typeof LOG_COLORS;

export interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
  color?: LogLevel;
  bold?: boolean;
  dim?: boolean;
}

class Logger {
  private defaultOptions: LogOptions = {
    timestamp: true,
    color: "info",
  };

  // Core logging function
  private log(message: string, level: LogLevel, options: LogOptions = {}): void {
    const opts = { ...this.defaultOptions, ...options, color: level };
    
    let formattedMessage = message;
    
    // Add timestamp if enabled
    if (opts.timestamp) {
      const timestamp = new Date().toISOString();
      formattedMessage = `[${timestamp}] ${formattedMessage}`;
    }
    
    // Add prefix if specified
    if (opts.prefix) {
      formattedMessage = `[${opts.prefix}] ${formattedMessage}`;
    }
    
    // Build CSS styles
    let styles = `color: ${LOG_COLORS[level]}`;
    
    if (opts.bold) {
      styles += "; font-weight: bold";
    }
    
    if (opts.dim) {
      styles += "; opacity: 0.7";
    }
    
    // Output to console with styling
    console.log(`%c${formattedMessage}`, styles);
  }

  // Standard log methods
  success(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'success', options);
  }

  warning(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'warning', options);
  }

  error(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'error', options);
  }

  info(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'info', options);
  }

  debug(message: string, options?: Omit<LogOptions, 'color'>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(message, 'debug', options);
    }
  }

  // Financial-specific logging
  profit(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'profit', options);
  }

  loss(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'loss', options);
  }

  neutral(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'neutral', options);
  }

  // System logging
  primary(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'primary', options);
  }

  secondary(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'secondary', options);
  }

  accent(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'accent', options);
  }

  // Status logging
  online(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'online', options);
  }

  offline(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'offline', options);
  }

  pending(message: string, options?: Omit<LogOptions, 'color'>): void {
    this.log(message, 'pending', options);
  }

  // Utility methods
  group(label: string, color: LogLevel = 'info'): void {
    console.group(`%c${label}`, `color: ${LOG_COLORS[color]}; font-weight: bold`);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  table(data: Record<string, any>, color: LogLevel = 'info'): void {
    this.log('📊 Data Table:', color);
    console.table(data);
  }

  // Performance logging
  time(label: string): void {
    console.time(`%c${label}`, `color: ${LOG_COLORS.debug}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`%c${label}`, `color: ${LOG_COLORS.debug}`);
  }

  // Progress indicator
  progress(current: number, total: number, label: string = 'Progress'): void {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    
    this.log(`${label}: [${bar}] ${percentage}% (${current}/${total})`, 'info');
  }

  // Separator lines
  separator(char: string = '=', color: LogLevel = 'primary'): void {
    this.log(char.repeat(50), color);
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export convenience functions for quick usage
export const log = {
  success: (message: string, options?: Omit<LogOptions, 'color'>) => logger.success(message, options),
  warning: (message: string, options?: Omit<LogOptions, 'color'>) => logger.warning(message, options),
  error: (message: string, options?: Omit<LogOptions, 'color'>) => logger.error(message, options),
  info: (message: string, options?: Omit<LogOptions, 'color'>) => logger.info(message, options),
  debug: (message: string, options?: Omit<LogOptions, 'color'>) => logger.debug(message, options),
  
  profit: (message: string, options?: Omit<LogOptions, 'color'>) => logger.profit(message, options),
  loss: (message: string, options?: Omit<LogOptions, 'color'>) => logger.loss(message, options),
  neutral: (message: string, options?: Omit<LogOptions, 'color'>) => logger.neutral(message, options),
};

// Export types and utilities
export type { LogOptions };
export { LOG_COLORS };

// Example usage:
// log.success("✅ Build completed successfully");
// log.error("❌ Build failed", { prefix: "CI/CD" });
// log.profit("💰 +$1,234.56", { bold: true });
// logger.progress(75, 100, "Downloading assets");
