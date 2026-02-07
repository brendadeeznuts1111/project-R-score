// lib/core/global-error-handler.ts — Global error handling for uncaught exceptions

import {
  EnterpriseErrorHandler,
  EnterpriseErrorFactory,
  EnterpriseErrorCode,
  SecurityError,
} from './core-errors';
import { SecurityRiskLevel } from './core-types';

/**
 * Global error handler configuration
 */
export interface GlobalErrorConfig {
  /** Exit process on uncaught exception */
  exitOnUncaughtException: boolean;
  /** Exit process on unhandled rejection */
  exitOnUnhandledRejection: boolean;
  /** Custom handler for uncaught exceptions */
  onUncaughtException?: (error: Error) => void;
  /** Custom handler for unhandled rejections */
  onUnhandledRejection?: (reason: unknown, promise: Promise<unknown>) => void;
  /** Custom handler for warnings */
  onWarning?: (warning: Error) => void;
  /** Graceful shutdown timeout in ms */
  shutdownTimeout: number;
}

/**
 * Default global error configuration
 */
const DEFAULT_CONFIG: GlobalErrorConfig = {
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false, // Allow recovery for promise rejections
  shutdownTimeout: 5000,
};

/**
 * Global error state tracking
 */
interface GlobalErrorState {
  uncaughtExceptions: number;
  unhandledRejections: number;
  warnings: number;
  lastErrorTime: number | null;
  isShuttingDown: boolean;
}

/**
 * Global Error Handler
 * 
 * Centralizes handling of:
 * - Uncaught exceptions
 * - Unhandled promise rejections
 * - Process warnings
 * - Signal-based shutdown
 * 
 * @example
 * ```typescript
 * import { initializeGlobalErrorHandling } from './lib/core/global-error-handler';
 * 
 * initializeGlobalErrorHandling({
 *   exitOnUncaughtException: true,
 *   exitOnUnhandledRejection: false,
 *   shutdownTimeout: 10000,
 * });
 * ```
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private config: GlobalErrorConfig;
  private state: GlobalErrorState;
  private shutdownHandlers: Array<() => Promise<void>> = [];

  private constructor(config: Partial<GlobalErrorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      uncaughtExceptions: 0,
      unhandledRejections: 0,
      warnings: 0,
      lastErrorTime: null,
      isShuttingDown: false,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<GlobalErrorConfig>): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(config);
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Initialize global error handling
   */
  public initialize(): void {
    // Prevent multiple initializations
    if (this.isInitialized()) {
      console.warn('[GlobalErrorHandler] Already initialized');
      return;
    }

    // Uncaught exceptions
    process.on('uncaughtException', this.handleUncaughtException.bind(this));

    // Unhandled promise rejections
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));

    // Warnings
    process.on('warning', this.handleWarning.bind(this));

    // Signal-based shutdown
    process.on('SIGINT', () => this.handleSignal('SIGINT'));
    process.on('SIGTERM', () => this.handleSignal('SIGTERM'));

    console.log('✅ Global error handling initialized');
  }

  /**
   * Check if handlers are already registered
   */
  private isInitialized(): boolean {
    return process.listenerCount('uncaughtException') > 0;
  }

  /**
   * Handle uncaught exceptions
   */
  private handleUncaughtException(error: Error): void {
    this.state.uncaughtExceptions++;
    this.state.lastErrorTime = Date.now();

    const enhancedError = this.enhanceError(error, 'UNCAUGHT_EXCEPTION');
    
    console.error('\n🚨 UNCAUGHT EXCEPTION');
    console.error('======================');
    console.error(`Error: ${enhancedError.message}`);
    console.error(`Type: ${enhancedError.name}`);
    console.error(`Stack: ${enhancedError.stack}`);
    console.error('======================\n');

    // Log to enterprise error handler
    EnterpriseErrorHandler.getInstance().handleUnknown(enhancedError);

    // Call custom handler if provided
    if (this.config.onUncaughtException) {
      try {
        this.config.onUncaughtException(enhancedError);
      } catch (handlerError) {
        console.error('Custom uncaught exception handler failed:', handlerError);
      }
    }

    if (this.config.exitOnUncaughtException) {
      this.gracefulShutdown(1);
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>
  ): void {
    this.state.unhandledRejections++;
    this.state.lastErrorTime = Date.now();

    const error = reason instanceof Error 
      ? reason 
      : new Error(String(reason));

    const enhancedError = this.enhanceError(error, 'UNHANDLED_REJECTION');

    console.error('\n⚠️  UNHANDLED PROMISE REJECTION');
    console.error('=================================');
    console.error(`Reason: ${enhancedError.message}`);
    console.error(`Type: ${enhancedError.name}`);
    console.error('=================================\n');

    // Log to enterprise error handler
    EnterpriseErrorHandler.getInstance().handleUnknown(enhancedError);

    // Call custom handler if provided
    if (this.config.onUnhandledRejection) {
      try {
        this.config.onUnhandledRejection(reason, promise);
      } catch (handlerError) {
        console.error('Custom unhandled rejection handler failed:', handlerError);
      }
    }

    if (this.config.exitOnUnhandledRejection) {
      this.gracefulShutdown(1);
    }
  }

  /**
   * Handle process warnings
   */
  private handleWarning(warning: Error): void {
    this.state.warnings++;

    console.warn('\n⚡ PROCESS WARNING');
    console.warn('==================');
    console.warn(`Warning: ${warning.message}`);
    console.warn(`Name: ${warning.name}`);
    if (warning.stack) {
      console.warn(`Stack: ${warning.stack}`);
    }
    console.warn('==================\n');

    if (this.config.onWarning) {
      try {
        this.config.onWarning(warning);
      } catch (handlerError) {
        console.error('Custom warning handler failed:', handlerError);
      }
    }
  }

  /**
   * Handle shutdown signals
   */
  private handleSignal(signal: string): void {
    console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
    this.gracefulShutdown(0);
  }

  /**
   * Perform graceful shutdown
   */
  private async gracefulShutdown(exitCode: number): Promise<void> {
    if (this.state.isShuttingDown) {
      return;
    }

    this.state.isShuttingDown = true;

    // Set a timeout to force exit
    const timeoutId = setTimeout(() => {
      console.error('⏱️  Shutdown timeout exceeded, forcing exit');
      process.exit(exitCode);
    }, this.config.shutdownTimeout);

    try {
      // Run all shutdown handlers
      console.log(`🔄 Running ${this.shutdownHandlers.length} shutdown handlers...`);
      
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          console.error('Shutdown handler failed:', error);
        }
      }

      console.log('✅ Graceful shutdown complete');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    } finally {
      clearTimeout(timeoutId);
      process.exit(exitCode);
    }
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: Error, type: string): Error {
    const enhanced = new Error(`[${type}] ${error.message}`);
    enhanced.name = error.name;
    enhanced.stack = error.stack;
    (enhanced as any).originalError = error;
    (enhanced as any).errorType = type;
    (enhanced as any).timestamp = new Date().toISOString();
    (enhanced as any).processUptime = process.uptime();
    return enhanced;
  }

  /**
   * Register a shutdown handler
   */
  public registerShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Get current error state
   */
  public getState(): Readonly<GlobalErrorState> {
    return { ...this.state };
  }

  /**
   * Get error statistics
   */
  public getStatistics(): {
    uncaughtExceptions: number;
    unhandledRejections: number;
    warnings: number;
    totalErrors: number;
    uptime: number;
    errorRate: number; // errors per minute
  } {
    const uptime = process.uptime();
    const totalErrors = this.state.uncaughtExceptions + this.state.unhandledRejections;
    const errorRate = uptime > 0 ? (totalErrors / (uptime / 60)) : 0;

    return {
      uncaughtExceptions: this.state.uncaughtExceptions,
      unhandledRejections: this.state.unhandledRejections,
      warnings: this.state.warnings,
      totalErrors,
      uptime,
      errorRate,
    };
  }
}

/**
 * Convenience function to initialize global error handling
 */
export function initializeGlobalErrorHandling(
  config?: Partial<GlobalErrorConfig>
): GlobalErrorHandler {
  const handler = GlobalErrorHandler.getInstance(config);
  handler.initialize();
  return handler;
}

/**
 * Convenience function to register shutdown handler
 */
export function onShutdown(handler: () => Promise<void>): void {
  GlobalErrorHandler.getInstance().registerShutdownHandler(handler);
}

/**
 * Get global error statistics
 */
export function getGlobalErrorStatistics(): ReturnType<GlobalErrorHandler['getStatistics']> {
  return GlobalErrorHandler.getInstance().getStatistics();
}

// Entry guard for testing
if (import.meta.main) {
  console.log('🧪 Global Error Handler Test Mode');
  console.log('=================================\n');

  initializeGlobalErrorHandling({
    exitOnUncaughtException: false,
    exitOnUnhandledRejection: false,
    shutdownTimeout: 3000,
  });

  // Register test shutdown handler
  onShutdown(async () => {
    console.log('📝 Test shutdown handler executed');
    await Bun.sleep(100);
  });

  console.log('Global error handler initialized. Stats:');
  console.log(getGlobalErrorStatistics());

  console.log('\nTest complete. Press Ctrl+C to test shutdown handlers.');
}
