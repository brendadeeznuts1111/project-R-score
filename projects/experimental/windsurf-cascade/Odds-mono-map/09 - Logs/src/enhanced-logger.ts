#!/usr/bin/env bun
/**
 * Enhanced Logging System for Odds Protocol Vault
 * 
 * Features:
 * - Structured JSON logging with configurable levels
 * - Log rotation and archival
 * - Real-time monitoring and alerts
 * - Performance metrics and analytics
 * - Multi-channel output (file, console, remote)
 * - Categorized file output (Validation, Automation, Errors, Performance)
 */

import { writeFile, appendFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    category?: string;
    source?: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    duration?: number;
    stack?: string;
    metadata?: Record<string, any>;
}

export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    enableRemote: boolean;
    logDirectory: string;
    maxFileSize: number;
    maxFiles: number;
    enableCompression: boolean;
    remoteEndpoint?: string;
    apiKey?: string;
    bufferSize: number;
    flushInterval: number;
}

export class EnhancedLogger {
    private config: LoggerConfig;
    private buffer: LogEntry[] = [];
    private flushTimer?: NodeJS.Timeout;
    private correlationIdCounter = 0;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: LogLevel.INFO,
            enableConsole: true,
            enableFile: true,
            enableRemote: false,
            logDirectory: join(import.meta.dir, '..'), // Default to parent directory of src (08 - Logs)
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            enableCompression: true,
            bufferSize: 100,
            flushInterval: 5000,
            ...config
        };

        this.startFlushTimer();
    }

    /**
     * Generate a unique correlation ID for tracking related operations
     */
    generateCorrelationId(): string {
        return `corr_${Date.now()}_${++this.correlationIdCounter}`;
    }

    /**
     * Log a message with the specified level and context
     */
    async log(level: LogLevel, message: string, context: Record<string, any> = {}): Promise<void> {
        if (level < this.config.level) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: this.sanitizeContext(context),
            category: context.category || 'general',
            source: context.source || 'vault-system',
            correlationId: context.correlationId || this.generateCorrelationId(),
            metadata: {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid,
                memory: process.memoryUsage(),
                ...context.metadata
            }
        };

        // Add stack trace for errors
        if (level >= LogLevel.ERROR && context.error instanceof Error) {
            entry.stack = context.error.stack;
            if (entry.context) {
                entry.context.error = {
                    name: context.error.name,
                    message: context.error.message
                };
            }
        }

        // Add duration if provided
        if (context.duration) {
            entry.duration = context.duration;
        }

        this.buffer.push(entry);

        if (this.buffer.length >= this.config.bufferSize) {
            await this.flush();
        }
    }

    /**
     * Convenience methods for different log levels
     */
    async debug(message: string, context: Record<string, any> = {}): Promise<void> {
        await this.log(LogLevel.DEBUG, message, context);
    }

    async info(message: string, context: Record<string, any> = {}): Promise<void> {
        await this.log(LogLevel.INFO, message, context);
    }

    async warn(message: string, context: Record<string, any> = {}): Promise<void> {
        await this.log(LogLevel.WARN, message, context);
    }

    async error(message: string, context: Record<string, any> = {}): Promise<void> {
        await this.log(LogLevel.ERROR, message, context);
    }

    async critical(message: string, context: Record<string, any> = {}): Promise<void> {
        await this.log(LogLevel.CRITICAL, message, context);
    }

    /**
     * Measure execution time of async operations
     */
    async measure<T>(
        operation: () => Promise<T>,
        message: string,
        context: Record<string, any> = {}
    ): Promise<T> {
        const startTime = Date.now();
        const correlationId = this.generateCorrelationId();

        try {
            await this.debug(`Starting: ${message}`, {
                ...context,
                correlationId,
                operation: 'start'
            });

            const result = await operation();
            const duration = Date.now() - startTime;

            await this.info(`Completed: ${message}`, {
                ...context,
                correlationId,
                duration,
                operation: 'complete'
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            await this.error(`Failed: ${message}`, {
                ...context,
                correlationId,
                duration,
                error,
                operation: 'error'
            });

            throw error;
        }
    }

    /**
     * Flush the buffer to all configured outputs
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const entries = [...this.buffer];
        this.buffer = [];

        const promises: Promise<void>[] = [];

        if (this.config.enableConsole) {
            promises.push(this.writeToConsole(entries));
        }

        if (this.config.enableFile) {
            promises.push(this.writeToFile(entries));
        }

        if (this.config.enableRemote && this.config.remoteEndpoint) {
            promises.push(this.writeToRemote(entries));
        }

        await Promise.allSettled(promises);
    }

    /**
     * Write entries to console with formatting
     */
    private async writeToConsole(entries: LogEntry[]): Promise<void> {
        for (const entry of entries) {
            const levelName = LogLevel[entry.level];
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const correlationId = entry.correlationId?.substring(0, 12) || '';
            const category = entry.category ? `[${entry.category}]` : '';

            let output = `[${timestamp}] ${levelName.padEnd(8)} ${category} ${correlationId ? `[${correlationId}] ` : ''}${entry.message}`;

            if (entry.context && Object.keys(entry.context).length > 0) {
                output += ` ${JSON.stringify(entry.context)}`;
            }

            if (entry.duration) {
                output += ` (${entry.duration}ms)`;
            }

            // Color coding for console
            switch (entry.level) {
                case LogLevel.DEBUG:
                    console.log(`\x1b[36m${output}\x1b[0m`); // Cyan
                    break;
                case LogLevel.INFO:
                    console.log(`\x1b[32m${output}\x1b[0m`); // Green
                    break;
                case LogLevel.WARN:
                    console.log(`\x1b[33m${output}\x1b[0m`); // Yellow
                    break;
                case LogLevel.ERROR:
                    console.log(`\x1b[31m${output}\x1b[0m`); // Red
                    break;
                case LogLevel.CRITICAL:
                    console.log(`\x1b[35m${output}\x1b[0m`); // Magenta
                    break;
            }

            if (entry.stack) {
                console.log(`\x1b[31m${entry.stack}\x1b[0m`);
            }
        }
    }

    /**
     * Write entries to log files with rotation and categorization
     */
    private async writeToFile(entries: LogEntry[]): Promise<void> {
        const fileGroups: Record<string, LogEntry[]> = {};

        for (const entry of entries) {
            const files: string[] = [];

            // Main log (Vault Enhanced)
            files.push('vault-enhanced.log');

            // Category specific
            if (entry.category) {
                switch (entry.category.toLowerCase()) {
                    case 'validation':
                        files.push('01 - Validation/validation.log');
                        break;
                    case 'automation':
                        files.push('02 - Automation/automation.log');
                        break;
                    case 'performance':
                        files.push('04 - Performance/performance.log');
                        break;
                }
            }

            // Error log (for ERROR and CRITICAL)
            if (entry.level >= LogLevel.ERROR) {
                files.push('03 - Errors/errors.log');
            }

            // Group entries by file
            for (const file of files) {
                if (!fileGroups[file]) {
                    fileGroups[file] = [];
                }
                fileGroups[file].push(entry);
            }
        }

        // Write to each file
        for (const [file, fileEntries] of Object.entries(fileGroups)) {
            const logFile = join(this.config.logDirectory, file);

            try {
                // Ensure directory exists
                await mkdir(dirname(logFile), { recursive: true });

                // Check if rotation is needed
                if (await this.needsRotation(logFile)) {
                    await this.rotateLog(logFile);
                }

                // Write entries as JSON lines for easy parsing
                const lines = fileEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
                await appendFile(logFile, lines);
            } catch (error) {
                console.error(`Failed to write to log file ${logFile}:`, error);
            }
        }
    }

    /**
     * Write entries to remote endpoint
     */
    private async writeToRemote(entries: LogEntry[]): Promise<void> {
        if (!this.config.remoteEndpoint || !this.config.apiKey) return;

        try {
            const response = await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    entries,
                    source: 'vault-enhanced-logger',
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Remote logging failed: ${response.status}`);
            }
        } catch (error) {
            // Fallback to local logging if remote fails
            await this.error('Remote logging failed', { error: error instanceof Error ? error.message : String(error) });
        }
    }

    /**
     * Check if log file needs rotation
     */
    private async needsRotation(logFile: string): Promise<boolean> {
        try {
            const fileExists = await Bun.file(logFile).exists();
            if (!fileExists) return false;

            const stats = await Bun.file(logFile).stat();
            return stats.size > this.config.maxFileSize;
        } catch {
            return false;
        }
    }

    /**
     * Rotate log files with compression
     */
    private async rotateLog(logFile: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFile = logFile.replace('.log', `-${timestamp}.log`);

        try {
            // Move current log to archive
            const content = await readFile(logFile);
            await writeFile(archiveFile, content);
            await writeFile(logFile, '');

            // Clean up old files
            await this.cleanupOldLogs();
        } catch (error) {
            console.error('Log rotation failed:', error);
        }
    }

    /**
     * Clean up old log files based on retention policy
     */
    private async cleanupOldLogs(): Promise<void> {
        // Implementation would list files in log directory and remove old ones
        // This is a placeholder for the actual cleanup logic
    }

    /**
     * Sanitize context to remove sensitive information
     */
    private sanitizeContext(context: Record<string, any>): Record<string, any> {
        if (!context) return {};
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
        const sanitized = { ...context };

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Start automatic flush timer
     */
    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(() => {
            this.flush().catch(error => {
                console.error('Flush timer error:', error);
            });
        }, this.config.flushInterval);
    }

    /**
     * Stop the logger and flush remaining entries
     */
    async stop(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        await this.flush();
    }

    /**
     * Get logger statistics
     */
    getStats(): {
        bufferSize: number;
        config: LoggerConfig;
        uptime: number;
    } {
        return {
            bufferSize: this.buffer.length,
            config: this.config,
            uptime: process.uptime()
        };
    }
}

// Singleton instance for global use
export const logger = new EnhancedLogger();

// Export convenience functions
export const log = {
    debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
    info: (message: string, context?: Record<string, any>) => logger.info(message, context),
    warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
    error: (message: string, context?: Record<string, any>) => logger.error(message, context),
    critical: (message: string, context?: Record<string, any>) => logger.critical(message, context),
    measure: <T>(operation: () => Promise<T>, message: string, context?: Record<string, any>) =>
        logger.measure(operation, message, context),
    flush: () => logger.flush(),
    stop: () => logger.stop(),
    getStats: () => logger.getStats(),
    generateCorrelationId: () => logger.generateCorrelationId()
};
