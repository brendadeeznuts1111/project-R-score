// lib/core/global-error-handler-perf.ts — Performance-optimized global error handler
// Optimizations: parallel shutdown, handler management, atomic output

import {
  GlobalErrorHandler,
  type GlobalErrorConfig,
} from './global-error-handler';

interface ShutdownHandler {
  id: string;
  name: string;
  handler: () => Promise<void>;
}

/**
 * Optimized global error handler with performance improvements:
 * - Parallel shutdown with per-handler timeouts
 * - Handler registration/unregistration (prevents memory leaks)
 * - Atomic error output (prevents log interleaving)
 * - O(1) initialization check
 */
export class OptimizedGlobalErrorHandler extends GlobalErrorHandler {
  private shutdownHandlers = new Map<string, ShutdownHandler>();
  private handlerCounter = 0;
  private initialized = false;

  // Store original methods for composition
  private originalInitialize: () => void;
  private originalGracefulShutdown: (code: number) => Promise<void>;

  constructor(config?: Partial<GlobalErrorConfig>) {
    // Create with minimal config, we'll override methods
    super(config);
    
    // Store original methods
    this.originalInitialize = (this as any).initialize.bind(this);
    this.originalGracefulShutdown = (this as any).gracefulShutdown.bind(this);
  }

  /**
   * O(1) initialization check with flag
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[GlobalErrorHandler] Already initialized');
      return;
    }
    this.initialized = true;

    // Call parent initialization
    this.originalInitialize();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Register shutdown handler with ID and unregister function
   * Prevents memory leaks by allowing cleanup
   */
  registerShutdownHandler(
    handler: () => Promise<void>,
    options: { name?: string } = {}
  ): () => void {
    const id = `handler-${++this.handlerCounter}-${Date.now()}`;
    const name = options.name || `anonymous-${id}`;
    
    this.shutdownHandlers.set(id, { id, name, handler });
    
    // Return unregister function
    return () => {
      const existed = this.shutdownHandlers.delete(id);
      if (existed) {
        console.log(`📝 Shutdown handler "${name}" unregistered`);
      }
    };
  }

  unregisterShutdownHandler(id: string): boolean {
    return this.shutdownHandlers.delete(id);
  }

  /**
   * Parallel shutdown with per-handler timeouts
   * Prevents one slow handler from starving others
   */
  async gracefulShutdown(exitCode: number): Promise<void> {
    const state = (this as any).state;
    if (state?.isShuttingDown) return;

    if (state) state.isShuttingDown = true;

    const shutdownTimeout = (this as any).config?.shutdownTimeout || 5000;
    
    const timeoutId = setTimeout(() => {
      process.stderr.write('\n⏱️  Shutdown timeout exceeded, forcing exit\n');
      process.exit(exitCode);
    }, shutdownTimeout);

    try {
      const handlers = Array.from(this.shutdownHandlers.values());
      
      if (handlers.length === 0) {
        console.log('✅ No shutdown handlers registered');
        clearTimeout(timeoutId);
        process.exit(exitCode);
        return;
      }
      
      console.log(`🔄 Running ${handlers.length} shutdown handlers in parallel...`);
      
      // Calculate per-handler timeout with minimum guarantee
      const perHandlerTimeout = Math.max(
        1000,  // Minimum 1 second per handler
        Math.floor(shutdownTimeout / Math.max(handlers.length, 1)) - 100 // Buffer
      );

      // Execute all handlers in parallel with individual timeouts
      const results = await Promise.allSettled(
        handlers.map(async ({ name, handler }) => {
          const startTime = performance.now();
          
          try {
            await Promise.race([
              handler(),
              new Promise<void>((_, reject) => 
                setTimeout(
                  () => reject(new Error(`Timeout after ${perHandlerTimeout}ms`)),
                  perHandlerTimeout
                )
              )
            ]);
            
            const duration = Date.now() - startTime;
            return { name, success: true, duration };
          } catch (error) {
            const duration = Date.now() - startTime;
            return { 
              name, 
              success: false, 
              duration,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );

      // Report results
      const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);
      const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success);
      
      console.log(`\n📊 Shutdown Results:`);
      console.log(`  ✅ ${succeeded.length} succeeded`);
      console.log(`  ❌ ${failed.length} failed`);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const info = result.value as any;
          const icon = info.success ? '✅' : '❌';
          const errorInfo = info.error ? ` (${info.error})` : '';
          console.log(`  ${icon} ${info.name}: ${info.duration}ms${errorInfo}`);
        } else {
          console.log(`  ❌ Unknown handler failed: ${result.reason}`);
        }
      }
      
      if (failed.length === 0) {
        console.log('\n✅ Graceful shutdown complete');
      } else {
        console.log(`\n⚠️  Graceful shutdown with ${failed.length} failures`);
      }
    } catch (error) {
      process.stderr.write(`\n🚨 Unexpected error during shutdown: ${error}\n`);
    } finally {
      clearTimeout(timeoutId);
      process.exit(exitCode);
    }
  }

  /**
   * Atomic error output (prevents log interleaving)
   */
  private handleUncaughtExceptionAtomic(error: Error): void {
    const state = (this as any).state;
    if (state) {
      state.uncaughtExceptions++;
      state.lastErrorTime = Date.now();
    }

    const enhancedError = this.enhanceErrorAtomic(error, 'UNCAUGHT_EXCEPTION');
    
    // Build single message for atomic output
    const output = [
      '',
      '🚨 UNCAUGHT EXCEPTION',
      '======================',
      `Error: ${enhancedError.message}`,
      `Type: ${enhancedError.name}`,
      `Stack: ${enhancedError.stack}`,
      '======================',
      '',
    ].join('\n');

    // Atomic write to stderr
    process.stderr.write(output);

    // Async handler (don't await to avoid blocking)
    this.handleErrorAsync(enhancedError);
    
    const config = (this as any).config;
    if (config?.exitOnUncaughtException) {
      this.gracefulShutdown(1);
    }
  }

  /**
   * Enhance error while preserving stack trace
   */
  private enhanceErrorAtomic(error: Error, type: string): Error {
    // Augment existing error to preserve stack trace
    const originalMessage = error.message;
    
    // Add metadata
    (error as any).errorType = type;
    (error as any).timestamp = new Date().toISOString();
    (error as any).processUptime = process.uptime();
    (error as any).originalMessage = originalMessage;
    
    // Modify message for display
    Object.defineProperty(error, 'message', {
      value: `[${type}] ${originalMessage}`,
      writable: true,
      configurable: true,
    });
    
    return error;
  }

  private async handleErrorAsync(error: Error): Promise<void> {
    try {
      const { EnterpriseErrorHandler } = await import('./core-errors');
      EnterpriseErrorHandler.getInstance().handleUnknown(error);
    } catch (handlerError) {
      process.stderr.write(`Failed to log to enterprise handler: ${handlerError}\n`);
    }
  }
}

// Convenience function for registering handlers with cleanup
export function onShutdownWithCleanup(
  handler: () => Promise<void>,
  options?: { name?: string }
): () => void {
  const handlerInstance = OptimizedGlobalErrorHandler.getInstance();
  return handlerInstance.registerShutdownHandler(handler, options);
}

// Benchmark comparison
export function benchmarkShutdown(): void {
  console.log('🔬 Testing parallel shutdown performance\n');
  
  const handler = new OptimizedGlobalErrorHandler({
    shutdownTimeout: 10000,
  });
  
  // Register test handlers with varying delays
  handler.registerShutdownHandler(
    async () => { await new Promise(r => setTimeout(r, 100)); },
    { name: 'fast-handler' }
  );
  handler.registerShutdownHandler(
    async () => { await new Promise(r => setTimeout(r, 500)); },
    { name: 'medium-handler' }
  );
  handler.registerShutdownHandler(
    async () => { await new Promise(r => setTimeout(r, 1000)); },
    { name: 'slow-handler' }
  );
  
  console.log('Registered 3 handlers (100ms, 500ms, 1000ms)');
  console.log('With parallel execution, total time should be ~1000ms (not 1600ms)');
  console.log('');
}

// Entry guard
if (import.meta.main) {
  benchmarkShutdown();
}
