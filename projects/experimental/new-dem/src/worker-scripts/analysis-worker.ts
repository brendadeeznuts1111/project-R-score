#!/usr/bin/env bun

// T3-Lattice v3.4 Analysis Worker Script
// Executes computational tasks in isolated worker threads
// VPIN, fractal dimension, Hurst exponent, and edge detection calculations

import { computeFractalDimension } from "../persona/engines/fractal-dimension.ts";
import { computeHurstExponent } from "../persona/engines/hurst-exponent.ts";
import {
  calculateVPIN,
  OddsTick,
  VPINAnalysis,
} from "./market-microstructure-analyzer.ts";

// Worker task types (matching main thread)
type WorkerTaskType =
  | "vpin_calculation"
  | "fractal_dimension"
  | "hurst_exponent"
  | "batch_analysis";

// Worker task interface
interface WorkerTask {
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
interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  workerId: string;
  timestamp: number;
}

// Get worker ID from environment
const WORKER_ID = process.env.WORKER_ID || `worker-${Date.now()}`;

console.log(`🏃 Analysis worker ${WORKER_ID} started`);

// Performance optimization: Pre-allocate commonly used arrays
const PREALLOCATED_SIZE = 10000;
const preallocatedArrays = {
  float64: new Float64Array(PREALLOCATED_SIZE),
  uint8: new Uint8Array(PREALLOCATED_SIZE),
  ticks: new Array<OddsTick>(PRELOCATED_SIZE),
};

// Task execution handlers
const taskHandlers = {
  // VPIN calculation handler
  vpin_calculation: async (data: {
    ticks: OddsTick[];
    config?: any;
  }): Promise<VPINAnalysis> => {
    const { ticks, config } = data;

    if (!ticks || ticks.length === 0) {
      throw new Error("No ticks provided for VPIN calculation");
    }

    // Use pre-allocated array if possible
    const startTime = Bun.nanoseconds();
    const result = calculateVPIN(ticks, config);
    const endTime = Bun.nanoseconds();

    // Add performance metadata
    result.computationTimeNs = endTime - startTime;

    return result;
  },

  // Fractal dimension calculation handler
  fractal_dimension: async (data: {
    data: Float64Array;
    options?: any;
  }): Promise<any> => {
    const { data: inputData, options } = data;

    if (!inputData || inputData.length === 0) {
      throw new Error("No data provided for fractal dimension calculation");
    }

    const startTime = Bun.nanoseconds();
    const result = await computeFractalDimension(inputData, {
      method: "box_counting",
      resolution: 1000,
      ...options,
    });
    const endTime = Bun.nanoseconds();

    // Add performance metadata
    result.computationTimeNs = endTime - startTime;

    return result;
  },

  // Hurst exponent calculation handler
  hurst_exponent: async (data: { data: Float64Array }): Promise<any> => {
    const { data: inputData } = data;

    if (!inputData || inputData.length === 0) {
      throw new Error("No data provided for Hurst exponent calculation");
    }

    const startTime = Bun.nanoseconds();
    const result = await computeHurstExponent(inputData);
    const endTime = Bun.nanoseconds();

    // Add performance metadata
    result.computationTimeNs = endTime - startTime;

    return result;
  },

  // Batch analysis handler
  batch_analysis: async (data: {
    id: string;
    ticks: OddsTick[];
    data: Float64Array;
  }): Promise<{
    marketId: string;
    vpin: VPINAnalysis;
    fractal: any;
    hurst: any;
    processingTime: number;
  }> => {
    const { id, ticks, data: inputData } = data;

    if (!ticks || ticks.length === 0) {
      throw new Error("No ticks provided for batch analysis");
    }

    if (!inputData || inputData.length === 0) {
      throw new Error("No data provided for batch analysis");
    }

    const startTime = performance.now();

    // Parallel execution of all calculations
    const [vpinResult, fractalResult, hurstResult] = await Promise.all([
      taskHandlers.vpin_calculation({ ticks }),
      taskHandlers.fractal_dimension({ data: inputData }),
      taskHandlers.hurst_exponent({ data: inputData }),
    ]);

    const processingTime = performance.now() - startTime;

    return {
      marketId: id,
      vpin: vpinResult,
      fractal: fractalResult,
      hurst: hurstResult,
      processingTime,
    };
  },
};

// Memory optimization: Clean up pre-allocated arrays periodically
let cleanupCounter = 0;
function performMemoryCleanup(): void {
  cleanupCounter++;

  if (cleanupCounter % 100 === 0) {
    // Reset pre-allocated arrays
    preallocatedArrays.float64.fill(0);
    preallocatedArrays.uint8.fill(0);
    preallocatedArrays.ticks.length = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log(`🧹 Worker ${WORKER_ID} performed memory cleanup`);
  }
}

// Main message handler
Bun.serve({
  port: 0, // Use any available port
  fetch(req, server) {
    return new Response("Worker ready", { status: 200 });
  },
});

// Listen for messages from main thread
process.on("message", async (task: WorkerTask) => {
  const startTime = performance.now();

  try {
    console.log(
      `📨 Worker ${WORKER_ID} received task ${task.id} (${task.type})`
    );

    // Validate task
    if (!task || !task.id || !task.type) {
      throw new Error("Invalid task format");
    }

    // Get appropriate handler
    const handler = taskHandlers[task.type];
    if (!handler) {
      throw new Error(`Unknown task type: ${task.type}`);
    }

    // Execute task with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Task timeout")), task.timeout);
    });

    const taskPromise = handler(task.data);

    const result = await Promise.race([taskPromise, timeoutPromise]);

    const processingTime = performance.now() - startTime;

    // Send success result
    const workerResult: WorkerResult = {
      taskId: task.id,
      success: true,
      data: result,
      processingTime,
      workerId: WORKER_ID,
      timestamp: Date.now(),
    };

    process.postMessage(workerResult);

    console.log(
      `✅ Worker ${WORKER_ID} completed task ${
        task.id
      } in ${processingTime.toFixed(2)}ms`
    );
  } catch (error) {
    const processingTime = performance.now() - startTime;

    // Send error result
    const workerResult: WorkerResult = {
      taskId: task.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime,
      workerId: WORKER_ID,
      timestamp: Date.now(),
    };

    process.postMessage(workerResult);

    console.error(`❌ Worker ${WORKER_ID} failed task ${task.id}:`, error);
  } finally {
    // Perform memory cleanup
    performMemoryCleanup();
  }
});

// Health check handler
process.on("health-check", () => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  process.postMessage({
    type: "health-check-response",
    workerId: WORKER_ID,
    memoryUsage,
    uptime,
    timestamp: Date.now(),
  });
});

// Graceful shutdown handler
process.on("shutdown", () => {
  console.log(`🛑 Worker ${WORKER_ID} shutting down...`);

  // Clean up resources
  preallocatedArrays.float64 = new Float64Array(0);
  preallocatedArrays.uint8 = new Uint8Array(0);
  preallocatedArrays.ticks = [];

  process.exit(0);
});

// Performance monitoring
let taskCount = 0;
let totalProcessingTime = 0;

// Override process.postMessage to track metrics
const originalPostMessage = process.postMessage.bind(process);
process.postMessage = (message: any) => {
  // Track performance metrics
  if (message.taskId && message.processingTime) {
    taskCount++;
    totalProcessingTime += message.processingTime;

    // Log performance every 50 tasks
    if (taskCount % 50 === 0) {
      const avgTime = totalProcessingTime / taskCount;
      console.log(
        `📊 Worker ${WORKER_ID} performance: ${taskCount} tasks, avg ${avgTime.toFixed(
          2
        )}ms/task`
      );
    }
  }

  return originalPostMessage(message);
};

// Signal handlers for graceful shutdown
process.on("SIGINT", () => {
  console.log(`📡 Worker ${WORKER_ID} received SIGINT`);
  process.emit("shutdown");
});

process.on("SIGTERM", () => {
  console.log(`📡 Worker ${WORKER_ID} received SIGTERM`);
  process.emit("shutdown");
});

// Unhandled exception handler
process.on("uncaughtException", (error) => {
  console.error(`💥 Uncaught exception in worker ${WORKER_ID}:`, error);
  process.emit("shutdown");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`💥 Unhandled rejection in worker ${WORKER_ID}:`, reason);
  process.emit("shutdown");
});

// Worker ready notification
console.log(`✅ Analysis worker ${WORKER_ID} ready for tasks`);

// Notify main thread that worker is ready
process.postMessage({
  type: "worker-ready",
  workerId: WORKER_ID,
  timestamp: Date.now(),
});

// Export for testing (not used in production)
export { taskHandlers, WORKER_ID };
