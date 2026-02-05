/**
 * Domain Logger
 * Simple and efficient logging utility for domain services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  operation?: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private serviceName: string = 'DomainService';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static configure(serviceName: string, level: LogLevel = LogLevel.INFO): Logger {
    const logger = Logger.getInstance();
    logger.serviceName = serviceName;
    logger.logLevel = level;
    return logger;
  }

  static info(message: string, metadata?: Record<string, any>): void {
    Logger.getInstance().log(LogLevel.INFO, message, metadata);
  }

  static warn(message: string, metadata?: Record<string, any>): void {
    Logger.getInstance().log(LogLevel.WARN, message, metadata);
  }

  static error(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    Logger.getInstance().log(LogLevel.ERROR, message, metadata, error);
  }

  static debug(message: string, metadata?: Record<string, any>): void {
    Logger.getInstance().log(LogLevel.DEBUG, message, metadata);
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error | any
  ): void {
    // Only log if level is at or above configured level
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        service: this.serviceName,
        metadata,
        error: error instanceof Error ? error : undefined,
      };

      // Format log message
      const formattedMessage = this.formatLogEntry(logEntry);

      // Output based on level
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.log(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          if (error instanceof Error && error.stack) {
            console.error(error.stack);
          }
          break;
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.service ? `[${entry.service}]` : '',
      entry.message,
    ];

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(`| Metadata: ${JSON.stringify(entry.metadata)}`);
    }

    if (entry.error && !(entry.error instanceof Error)) {
      parts.push(`| Error: ${JSON.stringify(entry.error)}`);
    }

    return parts.filter(Boolean).join(' ');
  }

  // Service-specific logger methods
  forService(serviceName: string): Logger {
    const childLogger = Object.create(this);
    childLogger.serviceName = serviceName;
    return childLogger;
  }

  withOperation(operation: string): Logger {
    return this.forService(`${this.serviceName}:${operation}`);
  }

  withUser(userId: string): Logger {
    return this.forService(`${this.serviceName}[${userId}]`);
  }
}

// Export singleton instance for convenience
export const logger = Logger.getInstance();
