// infrastructure/worker-thread-safety-engine.ts
import { feature } from "bun:bundle";

// Proper termination; prevents N-API crashes
export class WorkerThreadSafetyEngine {
  // Zero-cost when WORKER_THREAD_SAFETY is disabled
  static createWorker(script: string, options: any = {}): Worker {
    if (!feature("WORKER_THREAD_SAFETY")) {
      // Legacy: may crash on terminate with N-API
      return new Worker(script, options);
    }

    // Component #74: Create worker with N-API safety hooks
    const worker = new Worker(script, {
      ...options,
      env: {
        ...options.env,
        __BUN_WORKER_NAPI_SAFE: "1"
      }
    });

    // Track N-API modules loaded in worker
    const loadedNapiModules = new Set<string>();

    worker.addEventListener("message", (event: any) => {
      if (event.data?.type === "napi_module_loaded") {
        loadedNapiModules.add(event.data.module);
      }
    });

    // Override terminate to wait for N-API cleanup
    const originalTerminate = worker.terminate.bind(worker);

    worker.terminate = async (): Promise<void> => {
      if (loadedNapiModules.size > 0) {
        // Signal N-API modules to cleanup
        worker.postMessage({ type: "napi_cleanup" });

        // Wait for cleanup completion (max 1 second)
        await this.waitForNapiCleanup(worker, 1000);
      }

      // Now safe to terminate
      await originalTerminate();
    };

    // Monitor for termination issues (Component #12)
    this.monitorWorkerTermination(worker);

    return worker;
  }

  private static async waitForNapiCleanup(worker: Worker, timeout: number): Promise<void> {
    return new Promise(resolve => {
      const cleanupTimeout = setTimeout(() => {
        // Force terminate if cleanup hangs
        console.warn("N-API cleanup timeout; forcing worker termination");
        resolve();
      }, timeout);

      const cleanupListener = (event: any) => {
        if (event.data?.type === "napi_cleanup_complete") {
          clearTimeout(cleanupTimeout);
          worker.removeEventListener("message", cleanupListener);
          resolve();
        }
      };

      worker.addEventListener("message", cleanupListener);
    });
  }

  private static monitorWorkerTermination(worker: Worker): void {
    worker.addEventListener("error", (error: any) => {
      if (error.message?.includes("napi") || error.message?.includes("ThreadSafeFunction")) {
        // Log N-API related worker crash (Component #11 audit)
        this.logWorkerNapiCrash(error);
      }
    });
  }

  private static logWorkerNapiCrash(error: any): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 74,
        action: "worker_napi_crash",
        error: error.message,
        severity: "high",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { createWorker } = feature("WORKER_THREAD_SAFETY")
  ? WorkerThreadSafetyEngine
  : { createWorker: (script: string, opts: any) => new Worker(script, opts) };