export type WorkerType = "cpu" | "io" | "memory" | "network";

export interface EnterpriseWorkerConfig {
  id: string;
  script: string;
  type: WorkerType;
  priority: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
  healthCheck?: {
    intervalMs: number;
    timeoutMs: number;
  };
}

export interface WorkerMetricsSnapshot {
  id: string;
  uptime: number;
  messageCount: number;
  errorCount: number;
  errorRate: number;
  avgMemory: number;
}

interface InternalMetrics {
  startTime: number;
  messageCount: number;
  errorCount: number;
  memoryUsage: number[];
}

const RESOURCE_LIMITS: Record<WorkerType, { maxOldGenerationSizeMb: number; maxYoungGenerationSizeMb: number }> = {
  cpu: { maxOldGenerationSizeMb: 4096, maxYoungGenerationSizeMb: 512 },
  io: { maxOldGenerationSizeMb: 1024, maxYoungGenerationSizeMb: 128 },
  memory: { maxOldGenerationSizeMb: 8192, maxYoungGenerationSizeMb: 1024 },
  network: { maxOldGenerationSizeMb: 2048, maxYoungGenerationSizeMb: 256 },
};

export class EnterpriseWorkerFactory {
  private workers = new Map<string, Worker>();
  private configs = new Map<string, EnterpriseWorkerConfig>();
  private metrics = new Map<string, InternalMetrics>();
  private healthIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private metricsIntervals = new Map<string, ReturnType<typeof setInterval>>();

  create(config: EnterpriseWorkerConfig): Worker {
    if (this.workers.has(config.id)) {
      throw new Error(`Worker "${config.id}" already exists`);
    }

    const worker = new Worker(config.script, {
      name: config.id,
      smol: config.type === "io" || config.type === "network",
      ref: config.priority > 0,
    });

    this.workers.set(config.id, worker);
    this.configs.set(config.id, config);
    this.setupMonitoring(config.id, worker);

    if (config.healthCheck) {
      this.setupHealthChecks(config.id, worker, config.healthCheck);
    }

    return worker;
  }

  get(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  terminate(id: string): boolean {
    const worker = this.workers.get(id);
    if (!worker) return false;
    this.cleanup(id);
    worker.terminate();
    return true;
  }

  terminateAll(): number {
    let count = 0;
    for (const [id, worker] of this.workers) {
      this.cleanup(id);
      worker.terminate();
      count++;
    }
    return count;
  }

  getMetrics(id: string): WorkerMetricsSnapshot | undefined {
    const m = this.metrics.get(id);
    if (!m) return undefined;
    return {
      id,
      uptime: Date.now() - m.startTime,
      messageCount: m.messageCount,
      errorCount: m.errorCount,
      errorRate: m.messageCount > 0 ? m.errorCount / m.messageCount : 0,
      avgMemory: m.memoryUsage.length
        ? m.memoryUsage.reduce((a, b) => a + b, 0) / m.memoryUsage.length
        : 0,
    };
  }

  getAllMetrics(): WorkerMetricsSnapshot[] {
    return [...this.metrics.keys()]
      .map((id) => this.getMetrics(id))
      .filter((m): m is WorkerMetricsSnapshot => m !== undefined);
  }

  get size(): number {
    return this.workers.size;
  }

  static getResourceLimits(type: WorkerType) {
    return { ...RESOURCE_LIMITS[type] };
  }

  private setupMonitoring(id: string, worker: Worker): void {
    const m: InternalMetrics = {
      startTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      memoryUsage: [],
    };
    this.metrics.set(id, m);

    worker.addEventListener("message", () => {
      m.messageCount++;
    });

    worker.addEventListener("error", () => {
      m.errorCount++;
    });

    const interval = setInterval(() => {
      if (!this.workers.has(id)) {
        clearInterval(interval);
        return;
      }
      const mem = process.memoryUsage();
      m.memoryUsage.push(mem.heapUsed);
      if (m.memoryUsage.length > 100) m.memoryUsage.shift();
    }, 1_000);

    this.metricsIntervals.set(id, interval);
  }

  private setupHealthChecks(
    id: string,
    worker: Worker,
    config: { intervalMs: number; timeoutMs: number },
  ): void {
    const interval = setInterval(() => {
      if (!this.workers.has(id)) {
        clearInterval(interval);
        return;
      }

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.handleHealthFailure(id);
        }
      }, config.timeoutMs);

      const handler = (e: MessageEvent) => {
        if (e.data?.type === "health_response" && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          worker.removeEventListener("message", handler);
        }
      };

      worker.addEventListener("message", handler);
      worker.postMessage({ type: "health_check" });
    }, config.intervalMs);

    this.healthIntervals.set(id, interval);
  }

  private handleHealthFailure(id: string): void {
    const config = this.configs.get(id);
    if (!config?.retryPolicy) return;

    this.terminate(id);

    let attempt = 0;
    const retry = () => {
      attempt++;
      if (attempt > config.retryPolicy!.maxAttempts) return;
      setTimeout(() => {
        try {
          this.create(config);
        } catch {
          retry();
        }
      }, config.retryPolicy!.backoffMs * Math.pow(2, attempt - 1));
    };

    retry();
  }

  private cleanup(id: string): void {
    const hi = this.healthIntervals.get(id);
    if (hi) clearInterval(hi);
    this.healthIntervals.delete(id);

    const mi = this.metricsIntervals.get(id);
    if (mi) clearInterval(mi);
    this.metricsIntervals.delete(id);

    this.workers.delete(id);
    this.configs.delete(id);
    this.metrics.delete(id);
  }
}
