/**
 * Structured Logger - v2.4.1 Hardened Baseline
 * High-performance logging using Bun's native console APIs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  pid: number;
}

export class Logger {
  private component: string;
  private minLevel: LogLevel;
  private format: 'json' | 'pretty';

  private static levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(component: string, minLevel: LogLevel = 'info', format: 'json' | 'pretty' = 'pretty') {
    this.component = component;
    this.minLevel = minLevel;
    this.format = format;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      pid: process.pid,
      ...(data && { data }),
    };

    if (this.format === 'json') {
      return JSON.stringify(entry);
    }

    // Pretty format for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };

    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const levelColor = levelColors[level];
    const levelLabel = level.toUpperCase().padEnd(5);

    let output = `${dim}${entry.timestamp}${reset} ${levelColor}${levelLabel}${reset} ${dim}[${this.component}]${reset} ${message}`;

    if (data) {
      output += `\n${dim}${JSON.stringify(data, null, 2)}${reset}`;
    }

    return output;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      const data = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.formatMessage('error', message, data));
    }
  }

  /**
   * Create a child logger with a sub-component name
   */
  child(subComponent: string): Logger {
    return new Logger(
      `${this.component}:${subComponent}`,
      this.minLevel,
      this.format
    );
  }
}
