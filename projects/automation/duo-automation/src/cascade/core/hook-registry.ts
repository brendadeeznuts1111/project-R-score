/**
 * Hook Registry - Fixed with Bun Native API Fallbacks
 * [#REF:HOOKS-CORE] - Fixed API compatibility issues
 */

// Type declarations for Bun APIs
declare const Bun: {
  nanoseconds(): number;
  metrics: {
    set(options: { name: string; value: number; tags?: Record<string, string> }): void;
    increment(name: string, value: number, tags?: Record<string, string> }): void;
    histogram(name: string, value: number, tags?: Record<string, string> }): void;
  };
  atomic(fn: () => void): void;
} | undefined;

export interface CascadeHook<T = any> {
  id: string;
  type: 'pre' | 'post' | 'around' | 'error';
  priority: number;
  handler: (context: HookContext<T>) => Promise<void>;
  condition?: (context: HookContext<T>) => boolean;
  disabled?: boolean;
}

export interface HookContext<T = any> {
  operation: string;
  data?: T;
  result?: T;
  error?: Error;
  timestamp: number;
  requestId: string;
  [key: string]: any;
}

export interface HookPerformanceMetrics {
  hookId: string;
  averageDuration: number;
  callCount: number;
  failureCount: number;
  lastCalled: number;
  disabled: boolean;
}

export class HookRegistry {
  private hooks = new Map<string, CascadeHook[]>();
  private performanceMetrics = new Map<string, HookPerformanceMetrics>();
  private hookFailures = new Map<string, number>();
  private readonly optimizationThreshold = 100;
  private readonly failureThreshold = 5;
  
  /**
   * Reinforcement: Error isolation with circuit breaker
   */
  private async executeHooks<T>(
    hooks: CascadeHook<T>[],
    context: HookContext<T>
  ): Promise<void> {
    for (const hook of hooks) {
      // Skip disabled hooks
      if (hook.disabled) {
        console.log(`⏭️  Skipping disabled hook ${hook.id}`);
        continue;
      }
      
      try {
        // Adaptive: Skip if condition fails
        if (hook.condition && !(await hook.condition(context))) {
          console.log(`⏭️  Skipping hook ${hook.id}: condition false`);
          continue;
        }
        
        // Bun-native timing with fallback
        const start = Bun?.nanoseconds?.() || Date.now() * 1000000;
        await hook.handler(context);
        const end = Bun?.nanoseconds?.() || Date.now() * 1000000;
        const duration = (end - start) / 1000;
        
        this.recordPerformance(hook.id, duration);
        
        // Reinforcement: Log slow hooks
        if (duration > 10000) { // > 10ms
          console.warn(`⚠️  Hook ${hook.id} slow: ${duration.toFixed(2)}µs`);
        }
      } catch (error) {
        // Adaptive: Circuit breaker after 5 failures
        const failures = this.recordHookFailure(hook.id);
        
        if (failures < this.failureThreshold) {
          console.error(`⚠️  Hook ${hook.id} failed (${failures}/${this.failureThreshold}):`, error);
        } else {
          console.error(`🚨 Hook ${hook.id} DISABLED after ${this.failureThreshold} failures`);
          hook.disabled = true; // Disable problematic hook
        }
        
        // Continue with other hooks (don't fail the operation)
      }
    }
  }
  
  /**
   * Execute operation with hooks and error isolation
   */
  async executeWithHooks<T>(
    operation: string,
    context: HookContext<T>,
    mainLogic: () => Promise<T>
  ): Promise<T> {
    const hooks = this.hooks.get(operation) || [];
    
    // Bun-native timing with fallback
    const startTime = Bun?.nanoseconds?.() || Date.now() * 1000000;
    
    try {
      // Pre-hooks
      const preHooks = hooks.filter(h => h.type === 'pre');
      await this.executeHooks(preHooks, context);
      
      // Main logic
      const result = await mainLogic();
      context.result = result;
      
      // Post-hooks
      const postHooks = hooks.filter(h => h.type === 'post');
      await this.executeHooks(postHooks, context);
      
      return result;
    } catch (error) {
      context.error = error as Error;
      
      // Error hooks
      const errorHooks = hooks.filter(h => h.type === 'error');
      await this.executeHooks(errorHooks, context);
      
      throw error;
    } finally {
      // Record operation metrics
      const endTime = Bun?.nanoseconds?.() || Date.now() * 1000000;
      const duration = (endTime - startTime) / 1000000; // Convert to ms
      
      // Bun-native metrics with fallback
      if (Bun?.metrics) {
        Bun.metrics.set({
          name: 'cascade.operation.duration',
          value: duration,
          tags: {
            operation,
            timestamp: Date.now().toString()
          }
        });
      }
    }
  }
  
  /**
   * Register hook with validation
   */
  register<T>(hook: CascadeHook<T>): void {
    if (!hook.id || !hook.type || !hook.handler) {
      throw new Error('Hook must have id, type, and handler');
    }
    
    const operation = hook.id.split(':')[0];
    if (!this.hooks.has(operation)) {
      this.hooks.set(operation, []);
    }
    
    const hooks = this.hooks.get(operation)!;
    hooks.push(hook);
    
    // Sort by priority (higher first)
    hooks.sort((a, b) => b.priority - a.priority);
    
    // Initialize metrics
    if (!this.performanceMetrics.has(hook.id)) {
      this.performanceMetrics.set(hook.id, {
        hookId: hook.id,
        averageDuration: 0,
        callCount: 0,
        failureCount: 0,
        lastCalled: 0,
        disabled: false
      });
    }
  }
  
  private recordPerformance(hookId: string, durationMicros: number): void {
    const existing = this.performanceMetrics.get(hookId);
    if (!existing) return;
    
    existing.callCount++;
    existing.lastCalled = Date.now();
    
    // Exponential moving average
    const alpha = 0.1;
    existing.averageDuration = existing.averageDuration * (1 - alpha) + durationMicros * alpha;
    
    this.performanceMetrics.set(hookId, existing);
  }
  
  private recordHookFailure(hookId: string): number {
    const failures = this.hookFailures.get(hookId) || 0;
    this.hookFailures.set(hookId, failures + 1);
    
    // Update metrics
    const metrics = this.performanceMetrics.get(hookId);
    if (metrics) {
      metrics.failureCount++;
    }
    
    return failures + 1;
  }
  
  /**
   * Get hook metrics
   */
  getHookMetrics(hookId: string): HookPerformanceMetrics | undefined {
    return this.performanceMetrics.get(hookId);
  }
  
  /**
   * Get slow hooks
   */
  getSlowHooks(thresholdMicros: number): string[] {
    const slow: string[] = [];
    for (const [hookId, metrics] of this.performanceMetrics.entries()) {
      if (metrics.averageDuration > thresholdMicros) {
        slow.push(hookId);
      }
    }
    return slow;
  }
  
  /**
   * Check if operation has hooks
   */
  hasHooks(operation: string): boolean {
    const hooks = this.hooks.get(operation);
    return hooks && hooks.length > 0;
  }
  
  /**
   * Get hook count
   */
  getHookCount(): number {
    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }
  
  /**
   * Get hook statistics
   */
  getHookStats(): any {
    return {
      totalHooks: this.getHookCount(),
      operations: this.hooks.size,
      disabledHooks: Array.from(this.performanceMetrics.values()).filter(m => m.disabled).length,
      averagePerformance: Array.from(this.performanceMetrics.values())
        .reduce((sum, m) => sum + m.averageDuration, 0) / this.performanceMetrics.size
    };
  }
}
