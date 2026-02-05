/**
 * 🛠️ Enhanced Logger Utility
 * 
 * Centralized logging utility with structured logging, different levels,
 * timestamps, and integration with error handling.
 * 
 * @version 2.0.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  function?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  includeTimestamp: boolean;
  includeModule: boolean;
  jsonOutput: boolean;
  colors: boolean;
  maxLogSize: number;
}

/**
 * Enhanced logger with structured logging capabilities
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure logger settings
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): LoggerConfig {
    return {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      includeTimestamp: Bun.env.NODE_ENV !== 'test',
      includeModule: true,
      jsonOutput: process.env.JSON_LOGS === 'true',
      colors: process.env.NO_COLORS !== 'true' && Bun.env.NODE_ENV !== 'production',
      maxLogSize: 10000
    };
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.config.level];
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.jsonOutput) {
      return JSON.stringify(entry);
    }

    const parts: string[] = [];

    // Add timestamp
    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    // Add level with colors
    const levelStr = this.config.colors ? this.colorizeLevel(entry.level) : entry.level.toUpperCase();
    parts.push(`${levelStr}:`);

    // Add module/function context
    if (this.config.includeModule && entry.module) {
      let context = entry.module;
      if (entry.function) {
        context += `.${entry.function}`;
      }
      parts.push(`[${context}]`);
    }

    // Add message
    parts.push(entry.message);

    // Add metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(JSON.stringify(entry.metadata));
    }

    return parts.join(' ');
  }

  /**
   * Add colors to log level
   */
  private colorizeLevel(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36mDEBUG\x1b[0m',    // Cyan
      info: '\x1b[32mINFO\x1b[0m',      // Green
      warn: '\x1b[33mWARN\x1b[0m',      // Yellow
      error: '\x1b[31mERROR\x1b[0m'     // Red
    };
    return colors[level];
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: {
      module?: string;
      function?: string;
      requestId?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    // Add to buffer (for debugging/monitoring)
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift();
    }

    return entry;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: {
    module?: string;
    function?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context);
    console.log(this.formatLogEntry(entry));
  }

  /**
   * Log info message
   */
  info(message: string, context?: {
    module?: string;
    function?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context);
    console.log(this.formatLogEntry(entry));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: {
    module?: string;
    function?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context);
    console.warn(this.formatLogEntry(entry));
  }

  /**
   * Log error message
   */
  error(message: string, context?: {
    module?: string;
    function?: string;
    requestId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    error?: Error | unknown;
  }): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createLogEntry('error', message, context);
    
    // Add error details if provided
    if (context?.error) {
      if (context.error instanceof Error) {
        entry.metadata = {
          ...entry.metadata,
          errorName: context.error.name,
          errorMessage: context.error.message,
          stackTrace: context.error.stack
        };
      } else {
        entry.metadata = {
          ...entry.metadata,
          error: String(context.error)
        };
      }
    }

    console.error(this.formatLogEntry(entry));
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    this.logBuffer.forEach(entry => {
      byLevel[entry.level]++;
    });

    return {
      total: this.logBuffer.length,
      byLevel,
      oldestEntry: this.logBuffer[0]?.timestamp,
      newestEntry: this.logBuffer[this.logBuffer.length - 1]?.timestamp
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions that match the old interface
export const log = {
  info: (msg: string, ctx?: any) => logger.info(msg, ctx),
  error: (msg: string, ctx?: any) => logger.error(msg, ctx),
  warn: (msg: string, ctx?: any) => logger.warn(msg, ctx),
  debug: (msg: string, ctx?: any) => logger.debug(msg, ctx),
};
