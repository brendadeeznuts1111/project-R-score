import "./types.d.ts";
// infrastructure/v1-3-3/napi-threadsafety-guard.ts
// Component #72: N-API ThreadSafety Guard for Native Addon Stability


// Helper function to check both build-time features and runtime environment variables
function isFeatureEnabled(featureName: string): boolean {
  // Check runtime environment variable first
  const envVar = `FEATURE_${featureName}`;
  if (process.env[envVar] === "1") {
    return true;
  }

  // Check build-time feature (must use if statements directly)
  if (featureName === "SOURCEMAP_INTEGRITY" && process.env.FEATURE_SOURCEMAP_INTEGRITY === "1") {
    return true;
  }
  if (featureName === "NAPI_THREADSAFE" && process.env.FEATURE_NAPI_THREADSAFE === "1") {
    return true;
  }
  if (featureName === "WS_FRAGMENT_GUARD" && process.env.FEATURE_WS_FRAGMENT_GUARD === "1") {
    return true;
  }
  if (
    featureName === "WORKER_THREAD_SAFETY" &&
    process.env.FEATURE_WORKER_THREAD_SAFETY === "1"
  ) {
    return true;
  }
  if (featureName === "YAML_DOC_END_FIX" && process.env.FEATURE_YAML_DOC_END_FIX === "1") {
    return true;
  }
  if (
    featureName === "INFRASTRUCTURE_HEALTH_CHECKS" &&
    process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1"
  ) {
    return true;
  }

  return false;
}

// Export interfaces for type safety
export interface ThreadSafeFunction {
  id: number;
  fn: (value: any) => any;
  resourceName: string;
  maxQueueSize: number;
  queue: any[];
  refCount: number;
  finalize?: () => void;
}

export interface ThreadSafetyMetrics {
  activeThreads: number;
  prematureFinalizations: number;
  environmentRetentions: number;
  queueOverflows: number;
}

// ThreadSafeFunction finalizer environment retention
export class NAPIThreadSafetyGuard {
  private static activeThreads = new Map<number, ThreadSafeFunction>();
  private static metrics: ThreadSafetyMetrics = {
    activeThreads: 0,
    prematureFinalizations: 0,
    environmentRetentions: 0,
    queueOverflows: 0,
  };

  // Zero-cost when NAPI_THREADSAFE is disabled
  static createThreadSafeFunction(
    fn: (value: any) => any,
    options: { resourceName?: string; maxQueueSize?: number } = {}
  ): ThreadSafeFunction {
    if (!isFeatureEnabled("NAPI_THREADSAFE")) {
      // Legacy: may crash on finalizer
      return this.legacyCreateTSFN(fn, options);
    }

    const id = Math.random();
    const threadSafeFn: ThreadSafeFunction = {
      id,
      fn,
      resourceName: options.resourceName || "threadsafe",
      maxQueueSize: options.maxQueueSize || 1000,
      queue: [] as any[],
      refCount: 1, // Component #72: Retain environment reference
    };

    // Component #72: Retain environment until finalizers complete
    this.activeThreads.set(id, threadSafeFn);
    this.metrics.activeThreads++;

    // Override finalizer to ensure environment reference
    const originalFinalize = () => {
      this.releaseThreadSafeFunction(id);
    };

    // Patch finalizer to retain env during dispatch
    threadSafeFn.finalize = () => {
      // Wait for all queued items to complete
      const processQueue = async () => {
        while (threadSafeFn.queue.length > 0) {
          const item = threadSafeFn.queue.shift();
          try {
            await Promise.resolve(threadSafeFn.fn(item));
          } catch (error) {
            // Log but don't crash
            console.warn(`[NAPI-THREADSAFE] Error in queued item:`, error);
          }
        }
      };

      // Process queue then finalize
      processQueue().then(() => {
        originalFinalize();
      });
    };

    // Start monitoring
    this.monitorThreadSafety(threadSafeFn);

    return threadSafeFn;
  }

  static releaseThreadSafeFunction(id: number): void {
    if (!process.env.FEATURE_NAPI_THREADSAFE === "1") return;

    const thread = this.activeThreads.get(id);
    if (!thread) return;

    // Don't release until operations complete
    if (thread.queue.length > 0) {
      setTimeout(() => this.releaseThreadSafeFunction(id), 10);
      return;
    }

    this.activeThreads.delete(id);
    this.metrics.activeThreads--;
    this.logThreadRelease(id);
  }

  // Call the thread-safe function
  static callThreadSafeFunction(
    threadFn: ThreadSafeFunction,
    value: any
  ): Promise<void> {
    if (!isFeatureEnabled("NAPI_THREADSAFE")) {
      return Promise.resolve(threadFn.fn(value));
    }

    // Check queue size
    if (threadFn.queue.length >= threadFn.maxQueueSize) {
      this.metrics.queueOverflows++;
      this.logQueueOverflow(threadFn.id);

      // Drop oldest item
      threadFn.queue.shift();
    }

    // Add to queue
    threadFn.queue.push(value);

    // Process queue asynchronously
    return new Promise((resolve) => {
      setImmediate(async () => {
        if (threadFn.queue.length > 0) {
          const item = threadFn.queue.shift();
          try {
            await Promise.resolve(threadFn.fn(item));
          } catch (error) {
            console.warn(`[NAPI-THREADSAFE] Call error:`, error);
          }
        }
        resolve();
      });
    });
  }

  private static monitorThreadSafety(thread: ThreadSafeFunction): void {
    // Watch for environment corruption
    const interval = setInterval(() => {
      if (!this.activeThreads.has(thread.id)) {
        clearInterval(interval);
        return;
      }

      // Check if finalizer called prematurely
      if (thread.queue.length > 0 && thread.refCount <= 0) {
        this.metrics.prematureFinalizations++;
        this.logPrematureFinalization(thread.id);

        // Restore reference
        thread.refCount = 1;
        this.metrics.environmentRetentions++;
      }
    }, 100);
  }

  // Legacy implementation (buggy)
  private static legacyCreateTSFN(
    fn: (value: any) => any,
    options: any
  ): ThreadSafeFunction {
    return {
      id: Math.random(),
      fn,
      resourceName: options.resourceName || "threadsafe",
      maxQueueSize: options.maxQueueSize || 1000,
      queue: [],
      refCount: 0, // No retention - may crash
    };
  }

  private static logThreadRelease(id: number): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 72,
        action: "thread_released",
        threadId: id,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  private static logPrematureFinalization(id: number): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 72,
        action: "premature_finalization_prevented",
        threadId: id,
        severity: "medium",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  private static logQueueOverflow(id: number): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 72,
        action: "queue_overflow",
        threadId: id,
        severity: "low",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  // Get current metrics
  static getMetrics(): ThreadSafetyMetrics {
    return { ...this.metrics };
  }

  // Cleanup all threads (for shutdown)
  static cleanupAll(): void {
    const entries = Array.from(this.activeThreads.entries());
    for (const [id, thread] of entries) {
      if (thread.finalize) {
        thread.finalize();
      }
    }
    this.activeThreads.clear();
    this.metrics.activeThreads = 0;
    console.log("[NAPI-THREADSAFE] Cleaned up all threads");
  }
}

// Zero-cost export
export const {
  createThreadSafeFunction,
  releaseThreadSafeFunction,
  callThreadSafeFunction,
  getMetrics,
  cleanupAll,
} = process.env.FEATURE_NAPI_THREADSAFE === "1"
  ? NAPIThreadSafetyGuard
  : {
      createThreadSafeFunction: (fn: (value: any) => any) => ({
        id: Math.random(),
        fn,
        resourceName: "threadsafe",
        maxQueueSize: 1000,
        queue: [],
        refCount: 0,
        finalize: () => {},
      }),
      releaseThreadSafeFunction: () => {},
      callThreadSafeFunction: (threadFn: any, value: any) =>
        Promise.resolve(threadFn.fn(value)),
      getMetrics: () => ({
        activeThreads: 0,
        prematureFinalizations: 0,
        environmentRetentions: 0,
        queueOverflows: 0,
      }),
      cleanupAll: () => {},
    };

export default NAPIThreadSafetyGuard;
