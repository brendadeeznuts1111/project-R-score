/**
 * Cascade Hook Registry - Adaptive Infrastructure
 * Enables self-reinforcing architecture with automatic optimization
 * [#REF:HOOKS-CORE]
 */

// Type declarations for Bun APIs
declare const Bun: {
  nanoseconds(): number;
  metrics?: {
    set(options: { name: string; value: number; tags: Record<string, string> }): void;
  };
  hash?: {
    crc32(data: string): number;
  };
} | undefined;

declare const process: {
  env: Record<string, string | undefined>;
};

export interface HookContext<T = any> {
  operation: string;
  data?: T;
  result?: T;
  error?: Error;
  timestamp: number;
  requestId: string;
  [key: string]: any;
}

export interface CascadeHook<T = any> {
  id: string;
  type: 'pre' | 'post' | 'around' | 'error';
  priority: number;
  handler: (context: HookContext<T>) => Promise<T> | T;
  condition?: (context: HookContext<T>) => boolean;
  metadata?: {
    createdBy: string;
    version: string;
    testCoverage: number;
  };
}

export interface HookPerformanceMetrics {
  avgDuration: number;
  calls: number;
  successRate: number;
  lastCalled: number;
}

export class HookRegistry {
  private static instance: HookRegistry;
  private hooks = new Map<string, CascadeHook[]>();
  private performanceMetrics = new Map<string, HookPerformanceMetrics>();
  private optimizationThreshold = 100; // Optimize every 100 calls

  static getInstance(): HookRegistry {
    if (!HookRegistry.instance) {
      HookRegistry.instance = new HookRegistry();
    }
    return HookRegistry.instance;
  }

  private constructor() {
    this.initializeBuiltinHooks();
  }

  /**
   * Adaptive: Auto-register hooks based on rules/skills/workflows
   */
  async discoverAndRegisterHooks(): Promise<void> {
    console.log('🔍 Discovering adaptive hooks...');
    
    const ruleHooks = await this.extractHooksFromRules();
    const skillHooks = await this.extractHooksFromSkills();
    const workflowHooks = await this.extractHooksFromWorkflows();
    
    const allHooks = [...ruleHooks, ...skillHooks, ...workflowHooks];
    
    for (const hook of allHooks) {
      this.register(hook);
    }
    
    console.log(`✅ Discovered and registered ${allHooks.length} adaptive hooks`);
  }

  /**
   * Register a new hook
   */
  register<T>(hook: CascadeHook<T>): void {
    const operation = this.extractOperationFromHookId(hook.id);
    
    if (!this.hooks.has(operation)) {
      this.hooks.set(operation, []);
    }
    
    const hooks = this.hooks.get(operation)!;
    hooks.push(hook);
    
    // Sort by priority (higher first)
    hooks.sort((a, b) => b.priority - a.priority);
    
    console.log(`🪝 Registered hook: ${hook.id} (priority: ${hook.priority})`);
  }

  /**
   * Reinforcement: Every execution is measured and optimized
   */
  async executeWithHooks<T>(
    operation: string,
    context: HookContext<T>,
    mainLogic: () => Promise<T>
  ): Promise<T> {
    const hooks = this.getHooksForOperation(operation, context);
    const startTime = Bun?.nanoseconds() || Date.now() * 1000000;
    
    try {
      // Pre-hooks
      for (const hook of hooks.filter(h => h.type === 'pre')) {
        if (this.shouldExecuteHook(hook, context)) {
          await this.executeHookWithMetrics(hook, context);
        }
      }

      let result: T;
      const aroundHooks = hooks.filter(h => h.type === 'around');
      
      if (aroundHooks.length > 0) {
        // Chain around hooks
        result = await this.chainAroundHooks(aroundHooks, context, mainLogic);
      } else {
        // Main logic with error handling
        try {
          result = await mainLogic();
        } catch (error) {
          // Error hooks
          for (const hook of hooks.filter(h => h.type === 'error')) {
            if (this.shouldExecuteHook(hook, context)) {
              await this.executeHookWithMetrics(hook, { ...context, error: error as Error });
            }
          }
          throw error;
        }
      }

      // Post-hooks
      for (const hook of hooks.filter(h => h.type === 'post')) {
        if (this.shouldExecuteHook(hook, context)) {
          await this.executeHookWithMetrics(hook, { ...context, result });
        }
      }

      return result;
    } finally {
      // Record operation metrics
      const endTime = Bun?.nanoseconds() || Date.now() * 1000000;
      const duration = (endTime - startTime) / 1_000_000; // Convert to ms
      this.recordOperationMetrics(operation, duration);
    }
  }

  /**
   * Adaptive: Automatically optimize hook order based on performance
   */
  private optimizeHookOrder(operation: string): void {
    const hooks = this.hooks.get(operation);
    if (!hooks || hooks.length <= 1) return;

    const sorted = hooks.sort((a, b) => {
      const perfA = this.performanceMetrics.get(a.id);
      const perfB = this.performanceMetrics.get(b.id);
      
      if (!perfA || !perfB) return b.priority - a.priority;
      
      // Sort by (priority / avgDuration) ratio for max efficiency
      const scoreA = a.priority / (perfA.avgDuration || 1);
      const scoreB = b.priority / (perfB.avgDuration || 1);
      
      return scoreB - scoreA;
    });
    
    this.hooks.set(operation, sorted);
    console.log(`⚡ Optimized hook order for ${operation}`);
  }

  /**
   * Reinforcement: Self-tuning based on real performance data
   */
  recordPerformance(hookId: string, durationMs: number, success: boolean): void {
    const existing = this.performanceMetrics.get(hookId) || {
      avgDuration: 0,
      calls: 0,
      successRate: 1,
      lastCalled: 0
    };
    
    // Exponential moving average for stability
    existing.avgDuration = existing.avgDuration * 0.9 + durationMs * 0.1;
    existing.calls++;
    existing.successRate = existing.successRate * 0.95 + (success ? 1 : 0) * 0.05;
    existing.lastCalled = Date.now();
    
    this.performanceMetrics.set(hookId, existing);
    
    // Auto-optimize every optimizationThreshold calls
    if (existing.calls % this.optimizationThreshold === 0) {
      this.optimizeHookOrder(hookId.split(':')[0]);
    }
  }

  private async executeHookWithMetrics<T>(hook: CascadeHook<T>, context: HookContext<T>): Promise<void> {
    const startTime = Bun?.nanoseconds() || Date.now() * 1000000; // Fallback to Date.now
    let success = true;
    
    try {
      await hook.handler(context);
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = Bun?.nanoseconds() || Date.now() * 1000000;
      const duration = (endTime - startTime) / 1_000_000; // Convert to ms
      this.recordPerformance(hook.id, duration, success);
    }
  }

  private shouldExecuteHook<T>(hook: CascadeHook<T>, context: HookContext<T>): boolean {
    return hook.condition?.(context) !== false;
  }

  private getHooksForOperation<T>(operation: string, context: HookContext<T>): CascadeHook<T>[] {
    const hooks = this.hooks.get(operation) || [];
    return hooks.filter(hook => this.shouldExecuteHook(hook, context));
  }

  private async chainAroundHooks<T>(
    aroundHooks: CascadeHook<T>[],
    context: HookContext<T>,
    mainLogic: () => Promise<T>
  ): Promise<T> {
    let chainedLogic = mainLogic;
    
    // Chain hooks in reverse order (last hook wraps first)
    for (let i = aroundHooks.length - 1; i >= 0; i--) {
      const hook = aroundHooks[i];
      if (!hook) continue; // Skip undefined hooks
      
      const originalLogic = chainedLogic;
      
      chainedLogic = async () => {
        context.data = await originalLogic();
        return await hook.handler(context);
      };
    }
    
    return await chainedLogic();
  }

  private extractOperationFromHookId(hookId: string): string {
    const parts = hookId.split(':');
    return parts.length >= 2 ? (parts[1] || 'default') : 'default';
  }

  private recordOperationMetrics(operation: string, durationMs: number): void {
    // Record overall operation metrics for system optimization
    if (Bun?.metrics) {
      Bun.metrics.set({
        name: 'cascade.operation.duration',
        value: durationMs,
        tags: {
          operation,
          timestamp: Date.now().toString()
        }
      });
    }
  }

  private initializeBuiltinHooks(): void {
    // Security-first hook
    this.register({
      id: 'hook:security-first',
      type: 'pre',
      priority: 100,
      handler: async (context) => {
        if (context.domain === 'ONBOARDING') {
          context.securityLevel = 'maximum';
          context.requiresBiometric = true;
        }
      },
      condition: (context) => context.domain === 'ONBOARDING',
      metadata: {
        createdBy: 'system',
        version: '2.1',
        testCoverage: 100
      }
    });

    // Performance monitoring hook
    this.register({
      id: 'hook:performance-monitor',
      type: 'post',
      priority: 50,
      handler: async (context) => {
        const duration = Date.now() - context.timestamp;
        if (duration > 100) {
          console.warn(`⚠️ Slow operation detected: ${context.operation} (${duration}ms)`);
        }
      },
      metadata: {
        createdBy: 'system',
        version: '2.1',
        testCoverage: 100
      }
    });
  }

  private async extractHooksFromRules(): Promise<CascadeHook[]> {
    // Placeholder: Extract hooks from rule definitions
    return [
      {
        id: 'hook:rule:device-validation',
        type: 'pre',
        priority: 90,
        handler: async (context) => {
          if (context.deviceInfo) {
            context.deviceValidated = true;
          }
        },
        metadata: {
          createdBy: 'rule-extractor',
          version: '2.1',
          testCoverage: 95
        }
      }
    ];
  }

  private async extractHooksFromSkills(): Promise<CascadeHook[]> {
    // Placeholder: Extract hooks from skill definitions
    return [
      {
        id: 'hook:skill:qr-optimization',
        type: 'around',
        priority: 70,
        handler: async (context) => {
          // Optimize QR generation based on device capabilities
          return context.result;
        },
        metadata: {
          createdBy: 'skill-extractor',
          version: '2.1',
          testCoverage: 90
        }
      }
    ];
  }

  private async extractHooksFromWorkflows(): Promise<CascadeHook[]> {
    // Placeholder: Extract hooks from workflow definitions
    return [
      {
        id: 'hook:workflow:audit-trail',
        type: 'post',
        priority: 60,
        handler: async (context) => {
          // Record workflow execution for audit
          console.log(`📝 Workflow executed: ${context.operation}`);
        },
        metadata: {
          createdBy: 'workflow-extractor',
          version: '2.1',
          testCoverage: 85
        }
      }
    ];
  }

  /**
   * Get hook statistics
   */
  getHookStats(): Record<string, HookPerformanceMetrics> {
    const stats: Record<string, HookPerformanceMetrics> = {};
    
    for (const [hookId, metrics] of this.performanceMetrics.entries()) {
      stats[hookId] = { ...metrics };
    }
    
    return stats;
  }

  /**
   * Get total hook count
   */
  getHookCount(): number {
    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }
}

export default HookRegistry;
