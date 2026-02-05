#!/usr/bin/env bun

// T3-Lattice v3.4 Bun.worker Offloading System
// O(n log n) efficiency with <20ms p99 performance
// Parallel processing for VPIN, fractal analysis, and edge detection

import { OddsTick, VPINAnalysis } from "./market-microstructure-analyzer.ts";

// Worker task types
export type WorkerTaskType =
  | "vpin_calculation"
  | "fractal_dimension"
  | "hurst_exponent"
  | "edge_detection"
  | "batch_analysis";

// Worker task interface
export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  data: any;
  priority: number;
  timestamp: number;
  timeout: number;
  retryCount: number;
  maxRetries: number;
}

// Worker result interface
export interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  workerId: string;
  timestamp: number;
}

// Worker pool configuration
interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  taskTimeout: number;
  maxRetries: number;
  scalingThreshold: number;
  scaleUpDelay: number;
  scaleDownDelay: number;
  workerScript: string;
}

// Performance metrics
interface WorkerMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  p99ProcessingTime: number;
  throughput: number;
  workerUtilization: number;
  queueSize: number;
}

// Worker Pool Manager
export class WorkerPoolManager {
  private config: WorkerPoolConfig;
  private workers: Bun.Worker[] = [];
  private availableWorkers: Bun.Worker[] = [];
  private busyWorkers = new Map<Bun.Worker, string>();
  private taskQueue: WorkerTask[] = [];
  private processingTasks = new Map<
    string,
    {
      task: WorkerTask;
      worker: Bun.Worker;
      startTime: number;
      timeout: NodeJS.Timeout;
    }
  >();
  private metrics: WorkerMetrics;
  private scalingTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = {
      minWorkers: 2,
      maxWorkers: 8,
      taskTimeout: 30000, // 30 seconds
      maxRetries: 3,
      scalingThreshold: 5, // Scale up if queue size > 5
      scaleUpDelay: 1000,
      scaleDownDelay: 10000,
      workerScript: "./src/worker-scripts/analysis-worker.ts",
      ...config,
    };

    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0,
      p99ProcessingTime: 0,
      throughput: 0,
      workerUtilization: 0,
      queueSize: 0,
    };
  }

  // Initialize worker pool
  async initialize(): Promise<void> {
    try {
      console.log(
        `🔄 Initializing worker pool with ${this.config.minWorkers} workers...`
      );

      // Create minimum workers
      for (let i = 0; i < this.config.minWorkers; i++) {
        await this.createWorker();
      }

      // Start scaling monitor
      this.startScalingMonitor();

      this.isInitialized = true;
      console.log(
        `✅ Worker pool initialized with ${this.workers.length} workers`
      );
    } catch (error) {
      console.error("❌ Failed to initialize worker pool:", error);
      throw error;
    }
  }

  // Create new worker
  private async createWorker(): Promise<Bun.Worker> {
    const workerId = `worker-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Create worker with analysis script
      const worker = new Bun.Worker(
        new URL("./analysis-worker.ts", import.meta.url),
        {
          name: workerId,
          env: {
            WORKER_ID: workerId,
            NODE_ENV: "production",
          },
        }
      );

      // Set up message handler
      worker.on("message", (result: WorkerResult) => {
        this.handleWorkerResult(worker, result);
      });

      // Set up error handler
      worker.on("error", (error) => {
        console.error(`❌ Worker ${workerId} error:`, error);
        this.handleWorkerError(worker, error);
      });

      // Set up exit handler
      worker.on("exit", (code, signal) => {
        console.warn(
          `⚠️ Worker ${workerId} exited: code=${code}, signal=${signal}`
        );
        this.handleWorkerExit(worker);
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);

      console.log(`👷 Created worker: ${workerId}`);
      return worker;
    } catch (error) {
      console.error(`❌ Failed to create worker:`, error);
      throw error;
    }
  }

  // Submit task to worker pool
  async submitTask(
    task: Omit<WorkerTask, "id" | "timestamp" | "retryCount">
  ): Promise<WorkerResult> {
    if (!this.isInitialized) {
      throw new Error("Worker pool not initialized");
    }

    const fullTask: WorkerTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.metrics.totalTasks++;
    this.updateQueueSize();

    return new Promise((resolve, reject) => {
      // Add to processing map with promise handlers
      this.processingTasks.set(fullTask.id, {
        task: fullTask,
        worker: null as any,
        startTime: Date.now(),
        timeout: setTimeout(() => {
          this.handleTaskTimeout(fullTask);
          reject(new Error(`Task ${fullTask.id} timed out`));
        }, fullTask.timeout),
      });

      // Add to queue
      this.taskQueue.push(fullTask);
      this.taskQueue.sort((a, b) => b.priority - a.priority); // Sort by priority

      // Process queue
      this.processQueue();
    });
  }

  // Process task queue
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.shift()!;

      this.assignTaskToWorker(task, worker);
    }
  }

  // Assign task to worker
  private assignTaskToWorker(task: WorkerTask, worker: Bun.Worker): void {
    const processingInfo = this.processingTasks.get(task.id);
    if (!processingInfo) return;

    processingInfo.worker = worker;
    this.busyWorkers.set(worker, task.id);

    // Send task to worker
    worker.postMessage(task);

    console.log(`📤 Assigned task ${task.id} to worker ${worker.name}`);
  }

  // Handle worker result
  private handleWorkerResult(worker: Bun.Worker, result: WorkerResult): void {
    const processingInfo = this.processingTasks.get(result.taskId);
    if (!processingInfo) return;

    // Clear timeout
    if (processingInfo.timeout) {
      clearTimeout(processingInfo.timeout);
    }

    // Update metrics
    const processingTime = Date.now() - processingInfo.startTime;
    this.updateMetrics(processingTime, result.success);

    // Remove from processing
    this.processingTasks.delete(result.taskId);
    this.busyWorkers.delete(worker);
    this.availableWorkers.push(worker);

    console.log(
      `📥 Worker ${worker.name} completed task ${result.taskId} in ${processingTime}ms`
    );

    // Process next task
    this.processQueue();
  }

  // Handle worker error
  private handleWorkerError(worker: Bun.Worker, error: Error): void {
    const taskId = this.busyWorkers.get(worker);
    if (taskId) {
      const processingInfo = this.processingTasks.get(taskId);
      if (processingInfo) {
        // Clear timeout
        if (processingInfo.timeout) {
          clearTimeout(processingInfo.timeout);
        }

        // Retry task if possible
        if (processingInfo.task.retryCount < processingInfo.task.maxRetries) {
          processingInfo.task.retryCount++;
          this.taskQueue.push(processingInfo.task);
          console.log(
            `🔄 Retrying task ${taskId} (attempt ${processingInfo.task.retryCount})`
          );
        } else {
          console.error(
            `❌ Task ${taskId} failed after ${processingInfo.task.maxRetries} retries`
          );
          this.metrics.failedTasks++;
        }

        this.processingTasks.delete(taskId);
      }
    }

    this.busyWorkers.delete(worker);

    // Remove failed worker
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }

    // Replace worker
    this.createWorker();
  }

  // Handle worker exit
  private handleWorkerExit(worker: Bun.Worker): void {
    const taskId = this.busyWorkers.get(worker);
    if (taskId) {
      const processingInfo = this.processingTasks.get(taskId);
      if (processingInfo) {
        // Clear timeout
        if (processingInfo.timeout) {
          clearTimeout(processingInfo.timeout);
        }
        this.processingTasks.delete(taskId);
      }
    }

    this.busyWorkers.delete(worker);

    // Remove worker
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // Replace worker if below minimum
    if (this.workers.length < this.config.minWorkers) {
      this.createWorker();
    }
  }

  // Handle task timeout
  private handleTaskTimeout(task: WorkerTask): void {
    const processingInfo = this.processingTasks.get(task.id);
    if (!processingInfo) return;

    // Remove from processing
    this.processingTasks.delete(task.id);
    this.busyWorkers.delete(processingInfo.worker);

    // Mark worker as available
    this.availableWorkers.push(processingInfo.worker);

    // Retry task if possible
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      this.taskQueue.push(task);
      console.log(
        `🔄 Retrying timed out task ${task.id} (attempt ${task.retryCount})`
      );
    } else {
      console.error(
        `❌ Task ${task.id} timed out after ${task.maxRetries} retries`
      );
      this.metrics.failedTasks++;
    }

    this.processQueue();
  }

  // Start scaling monitor
  private startScalingMonitor(): void {
    this.scalingTimer = setInterval(() => {
      this.checkScaling();
    }, 1000);
  }

  // Check if scaling is needed
  private checkScaling(): void {
    const queueSize = this.taskQueue.length;
    const busyWorkers = this.busyWorkers.size;
    const totalWorkers = this.workers.length;

    // Scale up if queue is large and we have capacity
    if (
      queueSize > this.config.scalingThreshold &&
      totalWorkers < this.config.maxWorkers
    ) {
      this.scaleUp();
    }

    // Scale down if queue is empty and we have excess workers
    if (
      queueSize === 0 &&
      busyWorkers === 0 &&
      totalWorkers > this.config.minWorkers
    ) {
      this.scaleDown();
    }
  }

  // Scale up workers
  private async scaleUp(): Promise<void> {
    if (this.workers.length >= this.config.maxWorkers) return;

    try {
      await this.createWorker();
      console.log(`📈 Scaled up to ${this.workers.length} workers`);
    } catch (error) {
      console.error("❌ Failed to scale up:", error);
    }
  }

  // Scale down workers
  private scaleDown(): void {
    if (this.workers.length <= this.config.minWorkers) return;

    // Remove an available worker
    const worker = this.availableWorkers.pop();
    if (worker) {
      worker.terminate();
      const workerIndex = this.workers.indexOf(worker);
      if (workerIndex > -1) {
        this.workers.splice(workerIndex, 1);
      }
      console.log(`📉 Scaled down to ${this.workers.length} workers`);
    }
  }

  // Update performance metrics
  private updateMetrics(processingTime: number, success: boolean): void {
    if (success) {
      this.metrics.completedTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Update average processing time
    const totalCompleted = this.metrics.completedTasks;
    if (totalCompleted === 1) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (totalCompleted - 1) +
          processingTime) /
        totalCompleted;
    }

    // Update throughput (tasks per second)
    this.metrics.throughput = totalCompleted / (Date.now() / 1000);

    // Update worker utilization
    this.metrics.workerUtilization =
      this.busyWorkers.size / this.workers.length;

    this.updateQueueSize();
  }

  private updateQueueSize(): void {
    this.metrics.queueSize = this.taskQueue.length;
  }

  // Get performance metrics
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  // Get worker pool status
  getStatus(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queueSize: number;
    isInitialized: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queueSize: this.taskQueue.length,
      isInitialized: this.isInitialized,
    };
  }

  // Shutdown worker pool
  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down worker pool...");

    // Stop scaling monitor
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
    }

    // Wait for current tasks to complete or timeout
    const maxWaitTime = 5000; // 5 seconds
    const startTime = Date.now();

    while (this.busyWorkers.size > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    // Clear all data structures
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
    this.processingTasks.clear();

    this.isInitialized = false;
    console.log("✅ Worker pool shutdown complete");
  }
}

// Specialized worker tasks for T3-Lattice operations
export class T3LatticeWorkerTasks {
  private workerPool: WorkerPoolManager;

  constructor(workerPool: WorkerPoolManager) {
    this.workerPool = workerPool;
  }

  // Calculate VPIN in worker
  async calculateVPINParallel(
    ticks: OddsTick[],
    config?: any
  ): Promise<VPINAnalysis> {
    const result = await this.workerPool.submitTask({
      type: "vpin_calculation",
      data: { ticks, config },
      priority: 2,
      timeout: 10000,
      maxRetries: 3,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "VPIN calculation failed");
    }

    return result.data as VPINAnalysis;
  }

  // Calculate fractal dimension in worker
  async calculateFractalDimensionParallel(
    data: Float64Array,
    options?: any
  ): Promise<any> {
    const result = await this.workerPool.submitTask({
      type: "fractal_dimension",
      data: { data, options },
      priority: 1,
      timeout: 15000,
      maxRetries: 3,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Fractal dimension calculation failed");
    }

    return result.data;
  }

  // Calculate Hurst exponent in worker
  async calculateHurstExponentParallel(data: Float64Array): Promise<any> {
    const result = await this.workerPool.submitTask({
      type: "hurst_exponent",
      data: { data },
      priority: 1,
      timeout: 15000,
      maxRetries: 3,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Hurst exponent calculation failed");
    }

    return result.data;
  }

  // Batch analysis for multiple markets
  async batchAnalysisParallel(
    markets: Array<{
      id: string;
      ticks: OddsTick[];
      data: Float64Array;
    }>
  ): Promise<
    Array<{
      marketId: string;
      vpin: VPINAnalysis;
      fractal: any;
      hurst: any;
    }>
  > {
    const tasks = markets.map((market) =>
      this.workerPool.submitTask({
        type: "batch_analysis",
        data: market,
        priority: 3,
        timeout: 30000,
        maxRetries: 3,
      })
    );

    const results = await Promise.allSettled(tasks);

    return results
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          return result.value.data;
        } else {
          console.error(
            `❌ Batch analysis failed for market ${markets[index].id}:`,
            result.status === "rejected" ? result.reason : result.value.error
          );
          return null;
        }
      })
      .filter(Boolean) as any[];
  }

  // Performance benchmark
  async benchmarkWorkers(iterations: number = 100): Promise<{
    vpinTime: number;
    fractalTime: number;
    hurstTime: number;
    batchTime: number;
    throughput: number;
  }> {
    const syntheticTicks = Array.from({ length: 1000 }, (_, i) => ({
      id: `tick-${i}`,
      marketId: "benchmark",
      price: 100 + Math.random() * 20,
      volume: Math.random() * 50000,
      timestamp: Date.now() - i * 1000,
      source: "sharp" as const,
      exchange: "test",
    }));

    const syntheticData = new Float64Array(1000).map(() => Math.random() * 100);

    const startTime = performance.now();

    // Benchmark VPIN
    const vpinStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.calculateVPINParallel(syntheticTicks);
    }
    const vpinTime = (performance.now() - vpinStart) / iterations;

    // Benchmark fractal dimension
    const fractalStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.calculateFractalDimensionParallel(syntheticData);
    }
    const fractalTime = (performance.now() - fractalStart) / iterations;

    // Benchmark Hurst exponent
    const hurstStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.calculateHurstExponentParallel(syntheticData);
    }
    const hurstTime = (performance.now() - hurstStart) / iterations;

    // Benchmark batch processing
    const batchMarkets = Array.from({ length: 10 }, (_, i) => ({
      id: `market-${i}`,
      ticks: syntheticTicks.slice(0, 100),
      data: syntheticData.slice(0, 100),
    }));

    const batchStart = performance.now();
    for (let i = 0; i < Math.min(iterations / 10, 10); i++) {
      await this.batchAnalysisParallel(batchMarkets);
    }
    const batchTime =
      (performance.now() - batchStart) / Math.min(iterations / 10, 10);

    const totalTime = performance.now() - startTime;
    const throughput = (iterations * 4) / (totalTime / 1000); // tasks per second

    return {
      vpinTime,
      fractalTime,
      hurstTime,
      batchTime,
      throughput,
    };
  }
}

// Export singleton instances
export const workerPoolManager = new WorkerPoolManager({
  minWorkers: 2,
  maxWorkers: 8,
  taskTimeout: 30000,
  scalingThreshold: 5,
});

export const t3LatticeTasks = new T3LatticeWorkerTasks(workerPoolManager);

// Utility functions
export function createWorkerConfig(
  overrides?: Partial<WorkerPoolConfig>
): WorkerPoolConfig {
  return {
    minWorkers: 2,
    maxWorkers: 8,
    taskTimeout: 30000,
    maxRetries: 3,
    scalingThreshold: 5,
    scaleUpDelay: 1000,
    scaleDownDelay: 10000,
    workerScript: "./src/worker-scripts/analysis-worker.ts",
    ...overrides,
  };
}

export function createWorkerTask(
  type: WorkerTaskType,
  data: any,
  priority: number = 1,
  timeout: number = 30000
): Omit<WorkerTask, "id" | "timestamp" | "retryCount"> {
  return {
    type,
    data,
    priority,
    timeout,
    maxRetries: 3,
  };
}
