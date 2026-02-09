/**
 * Structured Logging Module
 * Production-ready logging with file output and log levels
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private logFile: string;
  private minLevel: number;
  private logToConsole: boolean;

  constructor() {
    this.logFile = config.logFile;
    this.minLevel = LOG_LEVELS[config.logLevel];
    this.logToConsole = config.logToConsole;
    
    // Ensure log directory exists
    const logDir = dirname(this.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(entry: LogEntry): string {
    const base = {
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      message: entry.message,
      ...entry.context,
    };

    if (entry.error) {
      return JSON.stringify({
        ...base,
        error: {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        },
      });
    }

    return JSON.stringify(base);
  }

  private write(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    
    // Write to file
    try {
      appendFileSync(this.logFile, formatted + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
    
    // Write to console if enabled
    if (this.logToConsole) {
      const consoleMethod = entry.level === 'error' ? console.error :
                           entry.level === 'warn' ? console.warn :
                           entry.level === 'debug' ? console.debug : console.log;
      consoleMethod(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '');
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      context,
    });
  }

  // Request logging helper
  logRequest(method: string, path: string, status: number, durationMs: number, ip?: string): void {
    this.info('HTTP Request', {
      method,
      path,
      status,
      durationMs,
      ip,
    });
  }

  // Performance logging
  logPerformance(operation: string, durationMs: number, details?: Record<string, unknown>): void {
    this.debug('Performance', {
      operation,
      durationMs,
      ...details,
    });
  }
}

export const logger = new Logger();
export default logger;
