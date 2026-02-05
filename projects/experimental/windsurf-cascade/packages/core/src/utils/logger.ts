/**
 * Centralized logging utility to replace console.log anti-patterns
 * Provides structured logging with different levels and proper formatting
 */

import { ENVIRONMENT_CONFIG } from '../constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;
    metadata?: Record<string, any>;
}

class Logger {
    private context: string;
    private currentLevel: LogLevel;

    constructor(context: string = 'App') {
        this.context = context;
        this.currentLevel = this.getLogLevelFromEnvironment();
    }

    private getLogLevelFromEnvironment(): LogLevel {
        const env = process.env.NODE_ENV || 'development';
        return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG]?.LOG_LEVEL as LogLevel || 'info';
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            silent: 4
        };

        return levels[level] >= levels[this.currentLevel];
    }

    private formatMessage(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: this.context,
            metadata
        };
    }

    private log(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const logMessage = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;

        switch (entry.level) {
            case 'debug':
            case 'info':
                console.log(logMessage, entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '');
                break;
            case 'warn':
                console.warn(logMessage, entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '');
                break;
            case 'error':
                console.error(logMessage, entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '');
                break;
        }
    }

    debug(message: string, metadata?: Record<string, any>): void {
        this.log(this.formatMessage('debug', message, metadata));
    }

    info(message: string, metadata?: Record<string, any>): void {
        this.log(this.formatMessage('info', message, metadata));
    }

    warn(message: string, metadata?: Record<string, any>): void {
        this.log(this.formatMessage('warn', message, metadata));
    }

    error(message: string, metadata?: Record<string, any>): void {
        this.log(this.formatMessage('error', message, metadata));
    }

    // Create a child logger with a different context
    child(context: string): Logger {
        return new Logger(`${this.context}:${context}`);
    }

    // Set log level dynamically
    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }
}

// Default logger instance
export const logger = new Logger();

// Factory function for creating loggers with specific contexts
export function createLogger(context: string): Logger {
    return new Logger(context);
}

// Convenience exports for backward compatibility
export const log = {
    debug: (message: string, metadata?: Record<string, any>) => logger.debug(message, metadata),
    info: (message: string, metadata?: Record<string, any>) => logger.info(message, metadata),
    warn: (message: string, metadata?: Record<string, any>) => logger.warn(message, metadata),
    error: (message: string, metadata?: Record<string, any>) => logger.error(message, metadata),
};
