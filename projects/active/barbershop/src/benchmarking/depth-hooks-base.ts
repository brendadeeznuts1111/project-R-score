/**
 * Enhanced Depth Configuration Hooks (Base - Non-React)
 * Core depth management functionality without React dependencies
 */

import {
  DepthOptimizer,
  AdaptiveDepthManager,
  DepthPerformanceAnalyzer,
  EnvironmentDepthConfig,
  type BenchmarkContext,
  type RecommendedDepth,
  type AdaptiveOptions
} from './depth-optimizer';

/**
 * Base depth configuration state management
 */
export class DepthConfigManager {
  private depth: number;
  private maxDepth: number;
  private autoDepth: boolean;

  constructor() {
    this.depth = parseInt(process.env.BUN_CONSOLE_DEPTH || '2');
    this.maxDepth = parseInt(process.env.BENCHMARK_MAX_DEPTH || '10');
    this.autoDepth = process.env.BENCHMARK_AUTO_DEPTH === 'true';
  }

  getDepth(): number {
    return this.depth;
  }

  getMaxDepth(): number {
    return this.maxDepth;
  }

  getAutoDepth(): boolean {
    return this.autoDepth;
  }

  updateDepth(newDepth: number): void {
    const clampedDepth = Math.max(1, Math.min(newDepth, this.maxDepth));
    this.depth = clampedDepth;
    process.env.BUN_CONSOLE_DEPTH = clampedDepth.toString();
  }

  updateMaxDepth(newMaxDepth: number): void {
    this.maxDepth = newMaxDepth;
    process.env.BENCHMARK_MAX_DEPTH = newMaxDepth.toString();
    
    // Adjust current depth if it exceeds new max
    if (this.depth > newMaxDepth) {
      this.updateDepth(newMaxDepth);
    }
  }

  toggleAutoDepth(): void {
    this.autoDepth = !this.autoDepth;
    process.env.BENCHMARK_AUTO_DEPTH = this.autoDepth.toString();
  }

  resetToDefaults(): void {
    const envConfig = EnvironmentDepthConfig.getCurrentConfig();
    this.depth = envConfig.defaultDepth;
    this.maxDepth = envConfig.maxDepth;
    process.env.BUN_CONSOLE_DEPTH = envConfig.defaultDepth.toString();
    process.env.BENCHMARK_MAX_DEPTH = envConfig.maxDepth.toString();
  }
}

/**
 * Base depth metrics tracking
 */
export class DepthMetricsTracker {
  private metrics: {
    totalOperations: number;
    averageDepth: number;
    depthChanges: number;
    performanceImpacts: Array<{
      depth: number;
      timeMs: number;
      memoryMB: number;
      timestamp: Date;
    }>;
  };

  constructor() {
    this.metrics = {
      totalOperations: 0,
      averageDepth: 2,
      depthChanges: 0,
      performanceImpacts: []
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  recordOperation(depth: number, dataSize: number, actualTimeMs?: number): void {
    const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, dataSize);
    
    const newPerformanceImpacts = [
      ...this.metrics.performanceImpacts,
      {
        depth,
        timeMs: actualTimeMs || analysis.estimatedTimeMs,
        memoryMB: analysis.estimatedMemoryMB,
        timestamp: new Date()
      }
    ].slice(-100); // Keep last 100 operations

    const totalOps = this.metrics.totalOperations + 1;
    const avgDepth = ((this.metrics.averageDepth * this.metrics.totalOperations) + depth) / totalOps;

    this.metrics = {
      totalOperations: totalOps,
      averageDepth: avgDepth,
      depthChanges: this.metrics.depthChanges,
      performanceImpacts: newPerformanceImpacts
    };
  }

  recordDepthChange(): void {
    this.metrics.depthChanges++;
  }

  getPerformanceTrend(): 'optimal' | 'moderate' | 'slow' | 'memory_heavy' | 'insufficient_data' {
    const recent = this.metrics.performanceImpacts.slice(-10);
    if (recent.length < 2) return 'insufficient_data';

    const avgRecentTime = recent.reduce((sum, p) => sum + p.timeMs, 0) / recent.length;
    const avgRecentMemory = recent.reduce((sum, p) => sum + p.memoryMB, 0) / recent.length;

    if (avgRecentTime > 500) return 'slow';
    if (avgRecentMemory > 50) return 'memory_heavy';
    if (avgRecentTime < 50 && avgRecentMemory < 10) return 'optimal';
    return 'moderate';
  }

  clearMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      averageDepth: 2,
      depthChanges: 0,
      performanceImpacts: []
    };
  }
}

/**
 * Base depth manager combining all functionality
 */
export class BaseDepthManager {
  private config: DepthConfigManager;
  private metrics: DepthMetricsTracker;
  private adaptiveManager: AdaptiveDepthManager | null = null;

  constructor(_initialData?: any, initialContext?: BenchmarkContext) {
    this.config = new DepthConfigManager();
    this.metrics = new DepthMetricsTracker();
    
    // Initialize adaptive manager if needed
    if (initialContext) {
      this.adaptiveManager = new AdaptiveDepthManager({
        enableAutoEscalation: this.config.getAutoDepth(),
        maxAutoDepth: this.config.getMaxDepth()
      });
    }
  }

  // Configuration methods
  getDepth(): number {
    return this.config.getDepth();
  }

  getMaxDepth(): number {
    return this.config.getMaxDepth();
  }

  getAutoDepth(): boolean {
    return this.config.getAutoDepth();
  }

  updateDepth(depth: number): void {
    this.config.updateDepth(depth);
  }

  updateMaxDepth(maxDepth: number): void {
    this.config.updateMaxDepth(maxDepth);
  }

  toggleAutoDepth(): void {
    this.config.toggleAutoDepth();
  }

  resetToDefaults(): void {
    this.config.resetToDefaults();
  }

  // Metrics methods
  getMetrics() {
    return this.metrics.getMetrics();
  }

  recordOperation(depth: number, dataSize: number, actualTimeMs?: number): void {
    this.metrics.recordOperation(depth, dataSize, actualTimeMs);
  }

  recordDepthChange(): void {
    this.metrics.recordDepthChange();
  }

  getPerformanceTrend() {
    return this.metrics.getPerformanceTrend();
  }

  clearMetrics(): void {
    this.metrics.clearMetrics();
  }

  // Intelligence methods
  getRecommendation(data: any, context: BenchmarkContext): RecommendedDepth {
    return DepthOptimizer.recommendDepth(data, context);
  }

  analyzePerformance(depth: number, dataSize: number) {
    return DepthPerformanceAnalyzer.analyzeTradeoffs(depth, dataSize);
  }

  getOptimalDepthForSize(dataSize: number, maxTimeMs: number = 100) {
    // Find the deepest setting that meets performance requirements
    for (let depth = 10; depth >= 1; depth--) {
      const result = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, dataSize);
      if (result.estimatedTimeMs <= maxTimeMs) {
        return { depth, analysis: result };
      }
    }
    
    // Fallback to depth 1
    const result = DepthPerformanceAnalyzer.analyzeTradeoffs(1, dataSize);
    return { depth: 1, analysis: result };
  }

  // Environment methods
  getEnvironmentConfig() {
    return EnvironmentDepthConfig.getCurrentConfig();
  }

  getEnvironment() {
    return EnvironmentDepthConfig.detectEnvironment();
  }

  applyEnvironmentConfig(_environment?: string): void {
    EnvironmentDepthConfig.applyEnvironmentConfig();
    this.config.resetToDefaults(); // Reload from environment
  }

  generateEnvironmentScript(env: string): string {
    return EnvironmentDepthConfig.generateEnvScript(env);
  }

  // Adaptive methods
  async runWithAdaptiveDepth<T>(
    operation: () => Promise<T>,
    customOptions?: AdaptiveOptions
  ): Promise<T> {
    if (!this.adaptiveManager) {
      this.adaptiveManager = new AdaptiveDepthManager({
        enableAutoEscalation: this.config.getAutoDepth(),
        maxAutoDepth: this.config.getMaxDepth()
      });
    }

    const startTime = Date.now();
    
    try {
      const result = await this.adaptiveManager.runWithAdaptiveDepth(operation, customOptions);
      const duration = Date.now() - startTime;
      
      // Record metrics if we have data size estimation
      this.metrics.recordOperation(this.adaptiveManager.getCurrentDepth(), 10000, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordOperation(this.adaptiveManager?.getCurrentDepth() || 2, 10000, duration);
      throw error;
    }
  }

  getCurrentAdaptiveDepth(): number {
    return this.adaptiveManager?.getCurrentDepth() || this.config.getDepth();
  }

  getDepthHistory() {
    return this.adaptiveManager?.getDepthHistory() || [];
  }

  setAdaptiveDepth(depth: number, reason: string): void {
    if (this.adaptiveManager) {
      this.adaptiveManager.setDepth(depth, reason);
      this.metrics.recordDepthChange();
    }
  }

  escalateDepthIfNeeded(data: any, results?: any): void {
    if (this.adaptiveManager) {
      this.adaptiveManager.escalateDepthIfNeeded(data, results);
      this.metrics.recordDepthChange();
    }
  }
}

export default {
  DepthConfigManager,
  DepthMetricsTracker,
  BaseDepthManager
};
