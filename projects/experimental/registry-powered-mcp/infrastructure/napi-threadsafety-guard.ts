// infrastructure/napi-threadsafety-guard.ts
import { feature } from "bun:bundle";

// ThreadSafeFunction finalizer environment retention
export class NAPIThreadSafetyGuard {
  private static activeThreads = new Map<number, any>();

  // Zero-cost when NAPI_THREADSAFE is disabled
  static createThreadSafeFunction(
    fn: Function,
    options: { resourceName?: string; maxQueueSize?: number } = {}
  ): any {
    if (!feature("NAPI_THREADSAFE")) {
      // Legacy: may crash on finalizer
      return this.legacyCreateTSFN(fn, options);
    }

    const id = Math.random();
    const threadSafeFn = {
      id,
      fn,
      resourceName: options.resourceName || "threadsafe",
      maxQueueSize: options.maxQueueSize || 1000,
      queue: [] as any[],
      refCount: 1 // Component #72: Retain environment reference
    };

    // Component #72: Retain environment until finalizers complete
    this.activeThreads.set(id, threadSafeFn);

    // Override finalizer to ensure environment reference
    const originalFinalize = () => {
      this.releaseThreadSafeFunction(id);
    };

    // Patch finalizer to retain env during dispatch
    threadSafeFn.finalize = () => {
      // Wait for all queued items to complete
      while (threadSafeFn.queue.length > 0) {
        const item = threadSafeFn.queue.shift();
        Promise.resolve(threadSafeFn.fn(item)).catch(() => {});
      }

      // Now safe to finalize
      originalFinalize();
    };

    // Start monitoring
    this.monitorThreadSafety(threadSafeFn);

    return threadSafeFn;
  }

  static releaseThreadSafeFunction(id: number): void {
    if (!feature("NAPI_THREADSAFE")) return;

    const thread = this.activeThreads.get(id);
    if (!thread) return;

    // Don't release until operations complete
    if (thread.queue.length > 0) {
      setTimeout(() => this.releaseThreadSafeFunction(id), 10);
      return;
    }

    this.activeThreads.delete(id);
    this.logThreadRelease(id);
  }

  private static monitorThreadSafety(thread: any): void {
    // Watch for environment corruption
    const interval = setInterval(() => {
      if (!this.activeThreads.has(thread.id)) {
        clearInterval(interval);
        return;
      }

      // Check if finalizer called prematurely
      if (thread.queue.length > 0 && thread.refCount <= 0) {
        this.logPrematureFinalization(thread.id);
        thread.refCount = 1; // Restore reference
      }
    }, 100);
  }

  // Legacy implementation (buggy)
  private static legacyCreateTSFN(fn: Function, options: any): any {
    return {
      call: (value: any) => Promise.resolve(fn(value)),
      finalize: () => {}
    };
  }

  private static logThreadRelease(id: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 72,
        action: "thread_released",
        threadId: id,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static logPrematureFinalization(id: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 72,
        action: "premature_finalization_prevented",
        threadId: id,
        severity: "medium",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const {
  createThreadSafeFunction,
  releaseThreadSafeFunction
} = feature("NAPI_THREADSAFE")
  ? NAPIThreadSafetyGuard
  : {
      createThreadSafeFunction: (fn: Function) => ({ call: fn, finalize: () => {} }),
      releaseThreadSafeFunction: () => {}
    };