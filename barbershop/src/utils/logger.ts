/**
 * 🪵 Structured Logger for Barbershop Demo
 * 
 * Replaces console.log statements with proper structured logging
 * Supports different log levels and development/production modes
 */

import { env } from 'bun';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  component?: string;
  data?: any;
  correlationId?: string;
}

class BarbershopLogger {
  private isDevelopment = env.NODE_ENV === 'development';
  private enableDebug = env.DEBUG_BARBERSHOP === 'true' || this.isDevelopment;

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const component = entry.component ? `[${entry.component}]` : '';
    const correlationId = entry.correlationId ? `[${entry.correlationId}]` : '';
    
    let message = `${timestamp} ${component}${correlationId} [${entry.level.toUpperCase()}] ${entry.message}`;
    
    if (entry.data && this.isDevelopment) {
      message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return message;
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'debug' && !this.enableDebug) {
      return false;
    }
    return true;
  }

  private log(level: LogLevel, message: string, data?: any, component?: string, correlationId?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      component,
      data,
      correlationId
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(`\x1b[36m${formatted}\x1b[0m`); // Cyan
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(`\x1b[33m${formatted}\x1b[0m`); // Yellow
        break;
      case 'error':
        console.error(`\x1b[31m${formatted}\x1b[0m`); // Red
        break;
    }
  }

  debug(message: string, data?: any, component?: string, correlationId?: string): void {
    this.log('debug', message, data, component, correlationId);
  }

  info(message: string, data?: any, component?: string, correlationId?: string): void {
    this.log('info', message, data, component, correlationId);
  }

  warn(message: string, data?: any, component?: string, correlationId?: string): void {
    this.log('warn', message, data, component, correlationId);
  }

  error(message: string, data?: any, component?: string, correlationId?: string): void {
    this.log('error', message, data, component, correlationId);
  }

  // Component-specific loggers
  server(message: string, data?: any, correlationId?: string): void {
    this.info(message, data, 'SERVER', correlationId);
  }

  dashboard(message: string, data?: any, correlationId?: string): void {
    this.info(message, data, 'DASHBOARD', correlationId);
  }

  tickets(message: string, data?: any, correlationId?: string): void {
    this.info(message, data, 'TICKETS', correlationId);
  }

  fusion(message: string, data?: any, correlationId?: string): void {
    this.info(message, data, 'FUSION', correlationId);
  }

  // Utility methods for common patterns
  validation(component: string, result: { valid: boolean; errors: any[]; warnings: any[] }): void {
    const status = result.valid ? '✅' : '❌';
    this.info(
      `${component}: ${status} ${result.errors.length} errors, ${result.warnings.length} warnings`,
      { errors: result.errors, warnings: result.warnings },
      'VALIDATION'
    );
  }

  performance(operation: string, duration: number, data?: any): void {
    this.info(`${operation} completed in ${duration}ms`, data, 'PERFORMANCE');
  }

  security(event: string, data?: any): void {
    this.warn(`Security event: ${event}`, data, 'SECURITY');
  }

  errorBoundary(error: Error, component?: string, correlationId?: string): void {
    this.error(
      `Unhandled error in ${component || 'unknown'}`,
      { error: error.message, stack: error.stack },
      component,
      correlationId
    );
  }
}

// Export singleton instance
export const logger = new BarbershopLogger();

// Export type for dependency injection
export type Logger = typeof logger;
