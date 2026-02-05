import "./types.d.ts";
// infrastructure/v1-3-3/worker-thread-safety-engine.ts
// Component #74: Worker Thread Safety Engine for N-API Stability


// Helper function to check both build-time features and runtime environment variables
function isFeatureEnabled(featureName: string): boolean {
  // Check build-time feature first (must use string literals)
  let buildTimeFeature = false;
  switch (featureName) {
    case "SOURCEMAP_INTEGRITY":
      buildTimeFeature = process.env.FEATURE_SOURCEMAP_INTEGRITY === "1";
      break;
    case "NAPI_THREADSAFE":
      buildTimeFeature = process.env.FEATURE_NAPI_THREADSAFE === "1";
      break;
    case "WS_FRAGMENT_GUARD":
      buildTimeFeature = process.env.FEATURE_WS_FRAGMENT_GUARD === "1";
      break;
    case "WORKER_THREAD_SAFETY":
      buildTimeFeature = process.env.FEATURE_WORKER_THREAD_SAFETY === "1";
      break;
    case "YAML_DOC_END_FIX":
      buildTimeFeature = process.env.FEATURE_YAML_DOC_END_FIX === "1";
      break;
    case "INFRASTRUCTURE_HEALTH_CHECKS":
      buildTimeFeature = process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1";
      break;
  }

  if (buildTimeFeature) {
    return true;
  }
  // Fallback to runtime environment variable
  const envVar = `FEATURE_${featureName}`;
  return process.env[envVar] === "1";
}

// Export interfaces for type safety
export interface WorkerSafetyOptions {
  env?: Record<string, string>;
  script?: string;
  type?: "module" | "classic";
}

export interface WorkerNapiTracking {
  worker: Worker;
  loadedModules: Set<string>;
  cleanupInProgress: boolean;
  terminationTimeout?: NodeJS.Timeout;
}

export interface WorkerSafetyMetrics {
  activeWorkers: number;
  napiModulesLoaded: number;
  cleanupTimeouts: number;
  successfulTerminations: number;
  failedTerminations: number;
}

// Proper termination; prevents N-API crashes
export class WorkerThreadSafetyEngine {
  private static trackedWorkers = new Map<string, WorkerNapiTracking>();
  private static metrics: WorkerSafetyMetrics = {
    activeWorkers: 0,
    napiModulesLoaded: 0,
    cleanupTimeouts: 0,
    successfulTerminations: 0,
    failedTerminations: 0,
  };

  // Zero-cost when WORKER_THREAD_SAFETY is disabled
  static createWorker(
    script: string,
    options: WorkerSafetyOptions = {}
  ): Worker {
    if (!isFeatureEnabled("WORKER_THREAD_SAFETY")) {
      // Legacy: may crash on terminate with N-API
      return new Worker(script, options);
    }

    // Component #74: Create worker with N-API safety hooks
    const worker = new Worker(script, {
      ...options,
      env: {
        ...options.env,
        __BUN_WORKER_NAPI_SAFE: "1",
      },
    });

    const workerId = this.generateWorkerId();

    // Track N-API modules loaded in worker
    const tracking: WorkerNapiTracking = {
      worker,
      loadedModules: new Set<string>(),
      cleanupInProgress: false,
    };

    this.trackedWorkers.set(workerId, tracking);
    this.metrics.activeWorkers++;

    worker.addEventListener("message", (event: any) => {
      if (event.data?.type === "napi_module_loaded") {
        tracking.loadedModules.add(event.data.module);
        this.metrics.napiModulesLoaded++;
        console.log(
          `[WORKER-SAFETY] Worker ${workerId} loaded N-API module: ${event.data.module}`
        );
      }
    });

    // Override terminate to wait for N-API cleanup
    const originalTerminate = worker.terminate.bind(worker);

    worker.terminate = async (): Promise<void> => {
      if (tracking.cleanupInProgress) {
        console.warn(`[WORKER-SAFETY] Worker ${workerId} already terminating`);
        return;
      }

      tracking.cleanupInProgress = true;

      if (tracking.loadedModules.size > 0) {
        console.log(
          `[WORKER-SAFETY] Worker ${workerId} has ${tracking.loadedModules.size} N-API modules, initiating cleanup`
        );

        // Signal N-API modules to cleanup
        worker.postMessage({ type: "napi_cleanup" });

        // Wait for cleanup completion (max 1 second)
        const cleanupResult = await this.waitForNapiCleanup(
          worker,
          workerId,
          1000
        );

        if (!cleanupResult) {
          this.metrics.cleanupTimeouts++;
          console.warn(`[WORKER-SAFETY] Worker ${workerId} cleanup timeout`);
        }
      }

      // Now safe to terminate
      try {
        await originalTerminate();
        this.metrics.successfulTerminations++;
        console.log(
          `[WORKER-SAFETY] Worker ${workerId} terminated successfully`
        );
      } catch (error) {
        this.metrics.failedTerminations++;
        console.error(
          `[WORKER-SAFETY] Worker ${workerId} termination failed:`,
          error
        );
      } finally {
        this.trackedWorkers.delete(workerId);
        this.metrics.activeWorkers--;
      }
    };

    // Monitor for termination issues (Component #12)
    this.monitorWorkerTermination(worker, workerId);

    return worker;
  }

  private static async waitForNapiCleanup(
    worker: Worker,
    workerId: string,
    timeout: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const cleanupTimeout = setTimeout(() => {
        // Force terminate if cleanup hangs
        console.warn(
          `[WORKER-SAFETY] Worker ${workerId} cleanup timeout; forcing termination`
        );
        resolve(false);
      }, timeout);

      const cleanupListener = (event: any) => {
        if (event.data?.type === "napi_cleanup_complete") {
          clearTimeout(cleanupTimeout);
          worker.removeEventListener("message", cleanupListener);
          console.log(
            `[WORKER-SAFETY] Worker ${workerId} N-API cleanup completed`
          );
          resolve(true);
        }
      };

      worker.addEventListener("message", cleanupListener);
    });
  }

  private static monitorWorkerTermination(
    worker: Worker,
    workerId: string
  ): void {
    worker.addEventListener("error", (error: any) => {
      if (
        error.message?.includes("napi") ||
        error.message?.includes("ThreadSafeFunction")
      ) {
        // Log N-API related worker crash (Component #11 audit)
        this.logWorkerNapiCrash(workerId, error);
      }
    });

    // Monitor for unexpected termination
    worker.addEventListener("message", (event: any) => {
      if (event.data?.type === "worker_termination_request") {
        console.log(`[WORKER-SAFETY] Worker ${workerId} requested termination`);
      }
    });
  }

  private static logWorkerNapiCrash(workerId: string, error: any): void {
    if (!process.env.FEATURE_INFRASTRUCTURE_HEALTH_CHECKS === "1") return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 74,
        action: "worker_napi_crash",
        workerId,
        error: error.message,
        severity: "high",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  // Send cleanup signal to worker
  static sendCleanupSignal(worker: Worker): void {
    if (!process.env.FEATURE_WORKER_THREAD_SAFETY === "1") return;

    worker.postMessage({ type: "napi_cleanup" });
  }

  // Get worker tracking info
  static getWorkerInfo(workerId: string): WorkerNapiTracking | null {
    return this.trackedWorkers.get(workerId) || null;
  }

  // Get all active workers
  static getAllWorkers(): string[] {
    return Array.from(this.trackedWorkers.keys());
  }

  // Get current metrics
  static getMetrics(): WorkerSafetyMetrics {
    return { ...this.metrics };
  }

  // Cleanup all workers (for shutdown)
  static async cleanupAll(): Promise<void> {
    const entries = Array.from(this.trackedWorkers.entries());

    for (const [workerId, tracking] of entries) {
      try {
        // Worker doesn't have readyState, just try to terminate
        await tracking.worker.terminate();
      } catch (error) {
        console.error(
          `[WORKER-SAFETY] Failed to cleanup worker ${workerId}:`,
          error
        );
      }
    }

    this.trackedWorkers.clear();
    this.metrics.activeWorkers = 0;
    console.log("[WORKER-SAFETY] Cleaned up all workers");
  }

  // Generate unique worker ID
  private static generateWorkerId(): string {
    return `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate worker environment
  static validateWorkerEnvironment(options: WorkerSafetyOptions): boolean {
    if (!isFeatureEnabled("WORKER_THREAD_SAFETY")) {
      return true; // Legacy: no validation
    }

    // Check if environment has safety flag
    if (!options.env || !options.env.__BUN_WORKER_NAPI_SAFE) {
      console.warn(
        "[WORKER-SAFETY] Worker environment missing N-API safety flag"
      );
      return false;
    }

    return true;
  }

  // Create isolated worker context
  static createIsolatedWorker(
    script: string,
    options: WorkerSafetyOptions = {}
  ): Worker {
    const safeOptions: WorkerSafetyOptions = {
      ...options,
      env: {
        ...options.env,
        __BUN_WORKER_NAPI_SAFE: "1",
        __BUN_ISOLATED: "1",
      },
    };

    return this.createWorker(script, safeOptions);
  }
}

// Zero-cost export
export const {
  createWorker,
  sendCleanupSignal,
  getWorkerInfo,
  getAllWorkers,
  getMetrics,
  cleanupAll,
  validateWorkerEnvironment,
  createIsolatedWorker,
} = process.env.FEATURE_WORKER_THREAD_SAFETY === "1"
  ? WorkerThreadSafetyEngine
  : {
      createWorker: (script: string, options: WorkerSafetyOptions = {}) =>
        new Worker(script, options),
      sendCleanupSignal: () => {},
      getWorkerInfo: () => null,
      getAllWorkers: () => [],
      getMetrics: () => ({
        activeWorkers: 0,
        napiModulesLoaded: 0,
        cleanupTimeouts: 0,
        successfulTerminations: 0,
        failedTerminations: 0,
      }),
      cleanupAll: async () => {},
      validateWorkerEnvironment: () => true,
      createIsolatedWorker: (
        script: string,
        options: WorkerSafetyOptions = {}
      ) => new Worker(script, options),
    };
