import { UltraWorkerPool, type WorkerPoolConfig } from "../workers/ultra-pool";
import { ProtocolOrchestrator, type ExecuteRequest, type ExecuteResult } from "./protocol-matrix";

export interface BridgeConfig {
  sizeThreshold: number;
  pool?: Partial<WorkerPoolConfig>;
}

export interface BridgeMetrics {
  mainThreadExecutions: number;
  workerOffloadedExecutions: number;
  totalExecutions: number;
}

export class ProtocolWorkerBridge {
  private readonly pool: UltraWorkerPool<ExecuteRequest, ExecuteResult>;
  private readonly sizeThreshold: number;
  private mainThreadCount = 0;
  private workerCount = 0;
  private terminated = false;

  constructor(config: BridgeConfig) {
    this.sizeThreshold = config.sizeThreshold;

    const poolConfig: WorkerPoolConfig = {
      workerUrl: new URL("../workers/protocol-bridge-worker.ts", import.meta.url).href,
      minWorkers: config.pool?.minWorkers ?? 2,
      maxWorkers: config.pool?.maxWorkers ?? 4,
      maxQueueSize: config.pool?.maxQueueSize ?? 100,
      taskTimeoutMs: config.pool?.taskTimeoutMs ?? 60_000,
    };

    this.pool = new UltraWorkerPool<ExecuteRequest, ExecuteResult>(poolConfig);
  }

  async execute(request: ExecuteRequest): Promise<ExecuteResult> {
    if (this.terminated) {
      throw new Error("ProtocolWorkerBridge is terminated");
    }

    const size = request.size ?? JSON.stringify(request.data).length;

    if (size < this.sizeThreshold) {
      this.mainThreadCount++;
      return ProtocolOrchestrator.execute(request);
    }

    this.workerCount++;
    return this.pool.execute(request);
  }

  getMetrics(): BridgeMetrics {
    return {
      mainThreadExecutions: this.mainThreadCount,
      workerOffloadedExecutions: this.workerCount,
      totalExecutions: this.mainThreadCount + this.workerCount,
    };
  }

  terminate(): void {
    this.terminated = true;
    this.pool.terminateAll("bridge terminated");
  }
}
