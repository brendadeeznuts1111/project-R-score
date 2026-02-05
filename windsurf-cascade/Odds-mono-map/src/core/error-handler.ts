/**
 * Centralized Error Handling System for Odds Protocol Vault
 * Replaces all .catch(console.error) with proper error handling
 * 
 * @fileoverview Unified error handling with logging, context, and recovery
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

// Error severity levels
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
    VALIDATION = 'validation',
    FILE_SYSTEM = 'file_system',
    NETWORK = 'network',
    CONFIGURATION = 'configuration',
    PLUGIN = 'plugin',
    TEMPLATE = 'template',
    VAULT = 'vault'
}

// Standardized error interface
export interface VaultErrorContext {
    script: string;
    function: string;
    line?: number;
    filePath?: string;
    additionalData?: Record<string, any>;
}

// Main error class
export class VaultError extends Error {
    public readonly timestamp: Date;
    public readonly severity: ErrorSeverity;
    public readonly category: ErrorCategory;
    public readonly context: VaultErrorContext;
    public readonly originalError?: Error;
    public readonly errorId: string;

    constructor(
        message: string,
        severity: ErrorSeverity,
        category: ErrorCategory,
        context: VaultErrorContext,
        originalError?: Error
    ) {
        super(message);
        this.name = 'VaultError';
        this.timestamp = new Date();
        this.severity = severity;
        this.category = category;
        this.context = context;
        this.originalError = originalError;
        this.errorId = this.generateErrorId();

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, VaultError);
        }
    }

    private generateErrorId(): string {
        return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    toJSON(): Record<string, any> {
        return {
            errorId: this.errorId,
            name: this.name,
            message: this.message,
            severity: this.severity,
            category: this.category,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : undefined
        };
    }
}

// Logger class for consistent error reporting
export class VaultLogger {
    private static instance: VaultLogger;
    private logPath: string;
    private maxLogSize: number = 10 * 1024 * 1024; // 10MB

    private constructor() {
        this.logPath = join(process.cwd(), 'logs', 'vault-errors.log');
        this.ensureLogDirectory();
    }

    static getInstance(): VaultLogger {
        if (!VaultLogger.instance) {
            VaultLogger.instance = new VaultLogger();
        }
        return VaultLogger.instance;
    }

    /**
     * Safe console output with error boundaries and environment awareness
     */
    private safeConsoleOutput(error: VaultError, message: string): void {
        try {
            // Check if console is available
            if (typeof console === 'undefined') {
                return;
            }

            // Environment-based console control
            const isProduction = process.env.NODE_ENV === 'production';
            const isTest = process.env.NODE_ENV === 'test';

            // Suppress console output in production/test unless critical
            if (isProduction || isTest) {
                if (error.severity !== ErrorSeverity.CRITICAL) {
                    return;
                }
            }

            const consoleMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${message}`;

            // Safe console method calls with validation
            switch (error.severity) {
                case ErrorSeverity.CRITICAL:
                    if (console.error) {
                        console.error(consoleMessage, error.context);
                    }
                    break;
                case ErrorSeverity.HIGH:
                    if (console.error) {
                        console.error(consoleMessage);
                    }
                    break;
                case ErrorSeverity.MEDIUM:
                    if (console.warn) {
                        console.warn(consoleMessage);
                    }
                    break;
                default:
                    if (console.log) {
                        console.log(consoleMessage);
                    }
            }
        } catch (consoleError) {
            // Prevent infinite loops - don't log console errors
            // Silent fallback is better than crashing the entire system
        }
    }

    private ensureLogDirectory(): void {
        const logDir = join(process.cwd(), 'logs');
        if (!existsSync(logDir)) {
            try {
                require('fs').mkdirSync(logDir, { recursive: true });
            } catch (error) {
                // Can't use logger here as it might not be initialized yet
                // Fallback to console for this critical error
                console.error('Failed to create log directory:', error);
            }
        }
    }

    private rotateLogIfNeeded(): void {
        try {
            if (existsSync(this.logPath)) {
                const stats = require('fs').statSync(this.logPath);
                if (stats.size > this.maxLogSize) {
                    const backupPath = this.logPath.replace('.log', `-${Date.now()}.log`);
                    require('fs').renameSync(this.logPath, backupPath);
                }
            }
        } catch (error) {
            console.error('Failed to rotate log:', error);
        }
    }

    logError(error: VaultError): void {
        this.rotateLogIfNeeded();

        const logEntry = {
            timestamp: error.timestamp.toISOString(),
            level: 'ERROR',
            ...error.toJSON()
        };

        try {
            appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');

            // Safe console logging with error boundaries
            this.safeConsoleOutput(error, message);
        } catch (logError) {
            // Prevent infinite loops - only use basic console for system errors
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('Failed to write to log file:', logError);
                    console.error('Original error:', error);
                }
            } catch (consoleError) {
                // Absolute failure - silent fallback
            }
        }
    }

    logInfo(message: string, context?: Partial<VaultErrorContext>): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message,
            context
        };

        try {
            appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
            this.safeConsoleInfo(message);
        } catch (error) {
            // Prevent infinite loops - only use basic console for system errors
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('Failed to write info log:', error);
                }
            } catch (consoleError) {
                // Absolute failure - silent fallback
            }
        }
    }

    /**
     * Safe console info output with environment awareness
     */
    private safeConsoleInfo(message: string): void {
        try {
            // Check if console is available
            if (typeof console === 'undefined' || !console.log) {
                return;
            }

            // Environment-based console control
            const isProduction = process.env.NODE_ENV === 'production';
            const isTest = process.env.NODE_ENV === 'test';

            // Suppress info output in production/test
            if (isProduction || isTest) {
                return;
            }

            console.log(`[INFO] ${message}`);
        } catch (consoleError) {
            // Prevent infinite loops - silent fallback
        }
    }

    /**
     * Safe console warning output with environment awareness
     */
    private safeConsoleWarning(message: string): void {
        try {
            // Check if console is available
            if (typeof console === 'undefined' || !console.warn) {
                return;
            }

            // Environment-based console control
            const isProduction = process.env.NODE_ENV === 'production';

            // Suppress warnings in production
            if (isProduction) {
                return;
            }

            console.warn(`[WARNING] ${message}`);
        } catch (consoleError) {
            // Prevent infinite loops - silent fallback
        }
    }

    logWarning(message: string, context?: Partial<VaultErrorContext>): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'WARNING',
            message,
            context
        };

        try {
            appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
            this.safeConsoleWarning(message);
        } catch (error) {
            // Prevent infinite loops - only use basic console for system errors
            try {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('Failed to write warning log:', error);
                }
            } catch (consoleError) {
                // Absolute failure - silent fallback
            }
        }
    }
}

// Error handler utility functions
export class ErrorHandler {
    private static logger = VaultLogger.getInstance();

    static handleError(
        error: Error,
        severity: ErrorSeverity,
        category: ErrorCategory,
        context: VaultErrorContext
    ): never {
        const vaultError = new VaultError(
            error.message,
            severity,
            category,
            context,
            error
        );

        this.logger.logError(vaultError);

        // Exit process for critical errors
        if (severity === ErrorSeverity.CRITICAL) {
            process.exit(1);
        }

        throw vaultError;
    }

    static async handleAsync<T>(
        operation: () => Promise<T>,
        severity: ErrorSeverity,
        category: ErrorCategory,
        context: VaultErrorContext
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            this.handleError(error as Error, severity, category, context);
        }
    }

    static handleSync<T>(
        operation: () => T,
        severity: ErrorSeverity,
        category: ErrorCategory,
        context: VaultErrorContext
    ): T {
        try {
            return operation();
        } catch (error) {
            this.handleError(error as Error, severity, category, context);
        }
    }

    // Recovery strategies
    static async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000,
        context: VaultErrorContext
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    this.handleError(
                        lastError,
                        ErrorSeverity.HIGH,
                        ErrorCategory.VAULT,
                        { ...context, additionalData: { attempts: maxRetries } }
                    );
                }

                this.logger.logWarning(
                    `Attempt ${attempt} failed, retrying in ${delay}ms...`,
                    { ...context, additionalData: { attempt, error: lastError.message } }
                );

                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }

        throw lastError!;
    }

    // Graceful degradation
    static fallback<T>(
        primaryOperation: () => T,
        fallbackOperation: () => T,
        context: VaultErrorContext
    ): T {
        try {
            return primaryOperation();
        } catch (error) {
            this.logger.logWarning(
                'Primary operation failed, using fallback',
                { ...context, error: (error as Error).message }
            );

            try {
                return fallbackOperation();
            } catch (fallbackError) {
                this.handleError(
                    fallbackError as Error,
                    ErrorSeverity.HIGH,
                    ErrorCategory.VAULT,
                    { ...context, error: 'Both primary and fallback failed' }
                );
            }
        }
    }
}

// Context builder helper
export class ErrorContextBuilder {
    private context: Partial<VaultErrorContext> = {};

    script(name: string): ErrorContextBuilder {
        this.context.script = name;
        return this;
    }

    function(name: string): ErrorContextBuilder {
        this.context.function = name;
        return this;
    }

    line(number: number): ErrorContextBuilder {
        this.context.line = number;
        return this;
    }

    filePath(path: string): ErrorContextBuilder {
        this.context.filePath = path;
        return this;
    }

    data(data: Record<string, any>): ErrorContextBuilder {
        this.context.additionalData = data;
        return this;
    }

    build(): VaultErrorContext {
        return {
            script: this.context.script || 'unknown',
            function: this.context.function || 'unknown',
            line: this.context.line,
            filePath: this.context.filePath,
            additionalData: this.context.additionalData
        };
    }
}

// Convenience function for creating error context
export function createErrorContext(): ErrorContextBuilder {
    return new ErrorContextBuilder();
}

// Export singleton logger instance
export const logger = VaultLogger.getInstance();

export default ErrorHandler;
