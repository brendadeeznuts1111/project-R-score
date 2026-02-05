#!/usr/bin/env bun

// T3-Lattice v3.4 Bun MCP Worker Implementation
// High-performance worker for VPIN, quantum, and market analysis operations

import { parentPort, workerData } from "worker_threads";
import { MLKEM768 } from "../ml-kem-768-quantum.ts";
import { computeFractalDimension } from "../persona/engines/fractal-dimension.ts";
import { computeHurstExponent } from "../persona/engines/hurst-exponent.ts";
import { OddsTick, VPINAnalysis, calculateVPIN } from "../persona/market-microstructure.ts";

// Worker task interface
interface WorkerTask {
  id: string;
  type: "vpin_calculation" | "quantum_operation" | "market_analysis" | "fractal_dimension" | "hurst_exponent";
  data: any;
  priority: number;
  timestamp: number;
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

// Performance optimization: Pre-allocated arrays
const PREALLOCATED_SIZE = 10000;
const preallocatedArrays = {
  float64: new Float64Array(PREALLOCATED_SIZE),
  ticks: new Array<OddsTick>(PREALLOCATED_SIZE),
  results: new Array<any>(1000)
};

// Worker class
class T3LatticeWorker {
  private workerId: string;
  private taskQueue: WorkerTask[] = [];
  private isProcessing = false;
  private metrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0
  };

  constructor(workerId: string) {
    this.workerId = workerId;
    this.setupMessageHandlers();
    console.log(`🏃 T3-Lattice Worker ${workerId} initialized`);
  }

  private setupMessageHandlers(): void {
    if (!parentPort) return;

    parentPort.on("message", async (task: WorkerTask) => {
      await this.handleTask(task);
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log(`🛑 Worker ${this.workerId} shutting down...`);
      process.exit(0);
    });
  }

  private async handleTask(task: WorkerTask): Promise<void> {
    const startTime = performance.now();

    try {
      this.metrics.totalTasks++;

      let result: any;

      switch (task.type) {
        case "vpin_calculation":
          result = await this.handleVPINCalculation(task.data);
          break;
        case "quantum_operation":
          result = await this.handleQuantumOperation(task.data);
          break;
        case "market_analysis":
          result = await this.handleMarketAnalysis(task.data);
          break;
        case "fractal_dimension":
          result = await this.handleFractalDimension(task.data);
          break;
        case "hurst_exponent":
          result = await this.handleHurstExponent(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, true);

      const workerResult: WorkerResult = {
        taskId: task.id,
        success: true,
        data: result,
        processingTime,
        workerId: this.workerId,
        timestamp: Date.now()
      };

      parentPort?.postMessage(workerResult);

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, false);

      const workerResult: WorkerResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        workerId: this.workerId,
        timestamp: Date.now()
      };

      parentPort?.postMessage(workerResult);
    }
  }

  // VPIN Calculation Handler
  private async handleVPINCalculation(data: {
    ticks: OddsTick[];
    bucketSize?: number;
    windowSize?: number;
  }): Promise<VPINAnalysis> {
    const { ticks, bucketSize = 500, windowSize = 20 } = data;

    if (!ticks || ticks.length === 0) {
      throw new Error("No ticks provided for VPIN calculation");
    }

    // Use pre-allocated array if possible
    const startTime = Bun.nanoseconds();

    // Enhanced VPIN calculation with source weighting
    const sourceWeights = {
      sharp: 1.5,
      public: 0.5,
      dark: 1.2,
      whale: 2.0
    };

    // Apply source weights to volumes
    const weightedTicks = ticks.map(tick => ({
      ...tick,
      volume: tick.volume * (sourceWeights[tick.source as keyof typeof sourceWeights] || 1.0)
    }));

    const result = calculateVPIN(weightedTicks, {
      bucketSize,
      windowSize,
      sourceWeights: true
    });

    const endTime = Bun.nanoseconds();
    result.computationTimeNs = endTime - startTime;

    return result;
  }

  // Quantum Operations Handler
  private async handleQuantumOperation(data: {
    operation: "generate_keys" | "encrypt" | "decrypt" | "sign" | "verify";
    data?: string;
    publicKey?: string;
    privateKey?: string;
  }): Promise<any> {
    const { operation, data: operationData, publicKey, privateKey } = data;

    switch (operation) {
      case "generate_keys":
        return await MLKEM768.generateKeyPair();

      case "encrypt":
        if (!operationData || !publicKey) {
          throw new Error("Data and public key required for encryption");
        }
        return await MLKEM768.encrypt(operationData, publicKey);

      case "decrypt":
        if (!operationData || !privateKey) {
          throw new Error("Data and private key required for decryption");
        }
        return await MLKEM768.decrypt(operationData, privateKey);

      case "sign":
        if (!operationData || !privateKey) {
          throw new Error("Data and private key required for signing");
        }
        return await MLKEM768.sign(operationData, privateKey);

      case "verify":
        if (!operationData || !publicKey) {
          throw new Error("Data and public key required for verification");
        }
        return await MLKEM768.verify(operationData, publicKey);

      default:
        throw new Error(`Unknown quantum operation: ${operation}`);
    }
  }

  // Market Analysis Handler
  private async handleMarketAnalysis(data: {
    marketData: any[];
    analysisType: "vpin" | "fractal" | "hurst" | "liquidity" | "impact";
    timeWindow?: number;
  }): Promise<any> {
    const { marketData, analysisType, timeWindow = 3600000 } = data;

    if (!marketData || marketData.length === 0) {
      throw new Error("No market data provided for analysis");
    }

    const now = Date.now();
    const filteredData = marketData.filter(item =>
      now - item.timestamp <= timeWindow
    );

    switch (analysisType) {
      case "vpin":
        return await this.handleVPINCalculation({
          ticks: filteredData,
          bucketSize: 500,
          windowSize: 20
        });

      case "fractal":
        return await this.handleFractalDimension({
          data: new Float64Array(filteredData.map(item => item.price || item.value))
        });

      case "hurst":
        return await this.handleHurstExponent({
          data: new Float64Array(filteredData.map(item => item.price || item.value))
        });

      case "liquidity":
        return this.calculateLiquidityMetrics(filteredData);

      case "impact":
        return this.calculatePriceImpact(filteredData);

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  // Fractal Dimension Handler
  private async handleFractalDimension(data: {
    data: Float64Array;
    options?: any;
  }): Promise<any> {
    const { data: inputData, options } = data;

    if (!inputData || inputData.length === 0) {
      throw new Error("No data provided for fractal dimension calculation");
    }

    const startTime = Bun.nanoseconds();

    const result = await computeFractalDimension(inputData, {
      method: "box_counting",
      resolution: 1000,
      ...options
    });

    const endTime = Bun.nanoseconds();
    result.computationTimeNs = endTime - startTime;

    return result;
  }

  // Hurst Exponent Handler
  private async handleHurstExponent(data: {
    data: Float64Array;
  }): Promise<any> {
    const { data: inputData } = data;

    if (!inputData || inputData.length === 0) {
      throw new Error("No data provided for Hurst exponent calculation");
    }

    const startTime = Bun.nanoseconds();

    const result = await computeHurstExponent(inputData);

    const endTime = Bun.nanoseconds();
    result.computationTimeNs = endTime - startTime;

    return result;
  }

  // Liquidity Metrics Calculation
  private calculateLiquidityMetrics(marketData: any[]): any {
    const volumes = marketData.map(item => item.volume || 0);
    const prices = marketData.map(item => item.price || item.value || 0);

    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const avgVolume = totalVolume / volumes.length;
    const volumeStdDev = Math.sqrt(
      volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length
    );

    const priceVolatility = this.calculateVolatility(prices);
    const liquidityRatio = avgVolume / (priceVolatility || 1);

    return {
      totalVolume,
      avgVolume,
      volumeStdDev,
      priceVolatility,
      liquidityRatio,
      timestamp: Date.now()
    };
  }

  // Price Impact Calculation
  private calculatePriceImpact(marketData: any[]): any {
    const sortedData = marketData.sort((a, b) => a.timestamp - b.timestamp);
    const priceChanges = [];

    for (let i = 1; i < sortedData.length; i++) {
      const priceChange = sortedData[i].price - sortedData[i-1].price;
      const volume = sortedData[i].volume;
      priceChanges.push({ priceChange, volume });
    }

    const avgImpact = priceChanges.reduce((sum, item) =>
      sum + Math.abs(item.priceChange) / item.volume, 0) / priceChanges.length;

    return {
      avgPriceImpact: avgImpact,
      totalTrades: priceChanges.length,
      timestamp: Date.now()
    };
  }

  // Volatility Calculation
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i-1]));
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  // Metrics Update
  private updateMetrics(processingTime: number, success: boolean): void {
    if (success) {
      this.metrics.completedTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.totalTasks;
  }

  // Get Worker Metrics
  getMetrics(): any {
    return {
      ...this.metrics,
      workerId: this.workerId,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Memory Cleanup
  performMemoryCleanup(): void {
    // Reset pre-allocated arrays
    preallocatedArrays.float64.fill(0);
    preallocatedArrays.ticks.length = 0;
    preallocatedArrays.results.length = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log(`🧹 Worker ${this.workerId} performed memory cleanup`);
  }
}

// Initialize worker
const workerId = workerData?.workerId || `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const worker = new T3LatticeWorker(workerId);

// Periodic memory cleanup
setInterval(() => {
  worker.performMemoryCleanup();
}, 60000); // Every minute

// Export for testing
export { T3LatticeWorker, WorkerResult, WorkerTask };
