// infrastructure/napi-threadsafety-guard.ts
import { feature } from "bun:bundle";

// ThreadSafeFunction finalizer environment retention
export class NAPIThreadSafetyGuard {
  private static activeThreads = new Map<number, any>();

  // Zero-cost when NAPI_THREADSAFE is disabled
  static createThreadSafeFunction(fn: (value: any) => any, options: any = {}): any {
    if (!feature("NAPI_THREADSAFE")) {
      // Legacy: may crash on finalize
      return { call: fn, finalize: () => {} };
    }

    const id = Math.random();
    const thread = {
      id,
      fn,
      resourceName: options.resourceName || "threadsafe",
      maxQueueSize: options.maxQueueSize || 1000,
      queue: [] as any[],
      refCount: 1 // Component #94: Retain env during dispatch
    };

    this.activeThreads.set(id, thread);

    // Override finalize
    const wrappedFn = {
      call: (value: any) => {
        thread.queue.push(value);
        return Promise.resolve(fn(value));
      },
      finalize: () => this.scheduleFinalize(id)
    };

    // Component #11 audit
    this.logThreadCreated(id);

    return wrappedFn;
  }

  private static scheduleFinalize(id: number): void {
    const thread = this.activeThreads.get(id);
    if (!thread) return;

    // Wait for queue to drain before finalizing
    if (thread.queue.length > 0) {
      setTimeout(() => this.scheduleFinalize(id), 10);
      return;
    }

    this.activeThreads.delete(id);
    this.logThreadFinalized(id);
  }

  private static logThreadCreated(id: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 94,
        action: "threadsafe_fn_created",
        threadId: id,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static logThreadFinalized(id: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 94,
        action: "threadsafe_fn_finalized",
        threadId: id,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { createThreadSafeFunction } = feature("NAPI_THREADSAFE")
  ? NAPIThreadSafetyGuard
  : { createThreadSafeFunction: (fn: (value: any) => any) => ({ call: fn, finalize: () => {} }) };
