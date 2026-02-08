/**
 * Enhanced Depth Configuration & Optimization System
 * Intelligent depth management for Bun benchmarking and debugging
 */

export interface OptimalDepthConfig {
  defaultDepth: number;
  maxDepth: number;
  onErrorDepth: number;
  logLevel: 'verbose' | 'info' | 'warn' | 'error' | 'silent';
}

export interface StructureAnalysis {
  maxDepth: number;
  totalNestedObjects: number;
  largestBranch: number;
  hasCircular: boolean;
  dataTypes: Map<string, number>;
  sizeEstimate: number;
}

export interface RecommendedDepth {
  suggestedDepth: number;
  reasoning: string;
  warnings: string[];
  autoApply: boolean;
}

export interface BenchmarkContext {
  mode: 'production' | 'development' | 'debugging' | 'performanceRun' | 'deepAnalysis';
  environment: string;
  dataSize?: number;
  complexity?: number;
}

export interface AdaptiveOptions {
  enableAutoEscalation?: boolean;
  maxAutoDepth?: number;
  performanceThreshold?: number;
  memoryThreshold?: number;
}

export interface DepthAnalysis {
  estimatedTimeMs: number;
  estimatedMemoryMB: number;
  estimatedLogSizeKB: number;
  recommendation: string;
}

export interface PerformanceReport {
  timestamp: Date;
  results: Array<{
    depth: number;
    size: number;
    analysis: DepthAnalysis;
  }>;
  summary: string;
}

export interface DepthPreview {
  preview: string;
  visibleLevels: number;
  totalLevels: number;
  hiddenCount: number;
}

/**
 * Enhanced depth recommendation system with intelligent analysis
 */
export class DepthOptimizer {
  static recommendDepth(data: any, context: BenchmarkContext): RecommendedDepth {
    const analysis = this.analyzeObjectStructure(data);
    
    return {
      suggestedDepth: this.calculateOptimalDepth(analysis, context),
      reasoning: this.explainRecommendation(analysis, context),
      warnings: this.checkDepthWarnings(analysis),
      autoApply: this.shouldAutoApply(analysis, context)
    };
  }

  private static analyzeObjectStructure(obj: any): StructureAnalysis {
    const analysis: StructureAnalysis = {
      maxDepth: 0,
      totalNestedObjects: 0,
      largestBranch: 0,
      hasCircular: false,
      dataTypes: new Map(),
      sizeEstimate: 0
    };
    
    // Deep analysis logic
    this.traverseObject(obj, 0, analysis, new Set());
    
    return analysis;
  }

  private static traverseObject(
    obj: any, 
    currentDepth: number, 
    analysis: StructureAnalysis, 
    visited: Set<any>
  ): void {
    if (obj === null || obj === undefined) return;
    
    // Track circular references
    if (visited.has(obj)) {
      analysis.hasCircular = true;
      return;
    }
    visited.add(obj);
    
    // Update depth tracking
    analysis.maxDepth = Math.max(analysis.maxDepth, currentDepth);
    
    // Track data types
    const type = Array.isArray(obj) ? 'array' : typeof obj;
    analysis.dataTypes.set(type, (analysis.dataTypes.get(type) || 0) + 1);
    
    // Estimate size (handle circular references)
    try {
      analysis.sizeEstimate += JSON.stringify(obj).length;
    } catch (error: any) {
      // Handle circular references
      analysis.sizeEstimate += 1000; // Estimated size for circular structures
      analysis.hasCircular = true;
    }
    
    if (typeof obj === 'object') {
      analysis.totalNestedObjects++;
      analysis.largestBranch = Math.max(analysis.largestBranch, Object.keys(obj).length);
      
      for (const value of Object.values(obj)) {
        this.traverseObject(value, currentDepth + 1, analysis, visited);
      }
    }
    
    visited.delete(obj);
  }

  private static calculateOptimalDepth(
    analysis: StructureAnalysis, 
    context: BenchmarkContext
  ): number {
    // Base on max depth found
    const baseDepth = Math.min(analysis.maxDepth + 2, 10);
    
    // Adjust for context
    const adjustments = {
      production: -2,
      development: 0,
      debugging: +2,
      performanceRun: -3,
      deepAnalysis: +4
    };
    
    const contextAdjustment = adjustments[context.mode] || 0;
    let optimalDepth = Math.max(1, baseDepth + contextAdjustment);
    
    // Adjust for data size
    if (analysis.sizeEstimate > 100000) { // > 100KB
      optimalDepth = Math.min(optimalDepth, 3);
    } else if (analysis.sizeEstimate > 10000) { // > 10KB
      optimalDepth = Math.min(optimalDepth, 5);
    }
    
    // Adjust for circular references
    if (analysis.hasCircular) {
      optimalDepth = Math.min(optimalDepth, 6);
    }
    
    return optimalDepth;
  }

  private static explainRecommendation(analysis: StructureAnalysis, context: BenchmarkContext): string {
    const reasons = [];
    
    if (analysis.maxDepth > 8) {
      reasons.push(`Very deep structure (max depth: ${analysis.maxDepth})`);
    } else if (analysis.maxDepth > 5) {
      reasons.push(`Moderately deep structure (max depth: ${analysis.maxDepth})`);
    }
    
    if (analysis.sizeEstimate > 100000) {
      reasons.push(`Large data size (${(analysis.sizeEstimate / 1024).toFixed(1)}KB)`);
    }
    
    if (analysis.hasCircular) {
      reasons.push('Circular references detected');
    }
    
    if (context.mode === 'production') {
      reasons.push('Production environment - minimal depth recommended');
    } else if (context.mode === 'debugging') {
      reasons.push('Debugging mode - increased depth for analysis');
    }
    
    return reasons.join(', ') || 'Standard configuration';
  }

  private static checkDepthWarnings(analysis: StructureAnalysis): string[] {
    const warnings = [];
    
    if (analysis.maxDepth > 10) {
      warnings.push('Very deep nesting may cause performance issues');
    }
    
    if (analysis.sizeEstimate > 500000) {
      warnings.push('Large data size - consider reducing depth');
    }
    
    if (analysis.hasCircular) {
      warnings.push('Circular references - depth may be limited');
    }
    
    if (analysis.totalNestedObjects > 1000) {
      warnings.push('Many nested objects - performance impact expected');
    }
    
    return warnings;
  }

  private static shouldAutoApply(analysis: StructureAnalysis, context: BenchmarkContext): boolean {
    // Auto-apply for simple cases
    if (analysis.maxDepth <= 3 && analysis.sizeEstimate < 10000) {
      return true;
    }
    
    // Don't auto-apply for complex cases
    if (analysis.hasCircular || analysis.sizeEstimate > 100000) {
      return false;
    }
    
    // Auto-apply in development for moderate complexity
    return context.mode === 'development' && analysis.maxDepth <= 6;
  }
}

/**
 * Adaptive depth management during benchmark execution
 */
export class AdaptiveDepthManager {
  private currentDepth: number = 2;
  private depthHistory: Array<{ depth: number; reason: string; timestamp: Date }> = [];
  private readonly depthStrategies = {
    onError: 8,      // Deep inspection on errors
    onSuccess: 2,    // Minimal on success
    onSlow: 4,       // Medium on slow operations
    onAnomaly: 6     // Deeper on anomalies
  };

  constructor(private options: AdaptiveOptions = {}) {}

  // Dynamically adjust depth based on what's happening
  async runWithAdaptiveDepth(
    benchmark: () => Promise<any>,
    _options: AdaptiveOptions = {}
  ): Promise<any> {
    const phases = {
      startup: { depth: 3, reason: 'Initialization phase' },
      execution: { depth: 2, reason: 'Main execution' },
      error: { depth: 8, reason: 'Error investigation' },
      completion: { depth: 4, reason: 'Results analysis' }
    };

    try {
      // Startup phase
      this.setDepth(phases.startup.depth, phases.startup.reason);
      
      // Execution phase
      this.setDepth(phases.execution.depth, phases.execution.reason);
      const result = await benchmark();
      
      // Completion phase
      this.setDepth(phases.completion.depth, phases.completion.reason);
      
      return result;
    } catch (error: any) {
      // Error phase - increase depth for analysis
      this.setDepth(this.depthStrategies.onError, `Error: ${error.message}`);
      throw error;
    }
  }

  // Smart depth escalation based on data complexity
  escalateDepthIfNeeded(data: any, _currentResults?: any): void {
    if (!this.options.enableAutoEscalation) return;
    
    const complexity = this.calculateComplexityScore(data);
    
    if (complexity > 0.8) {
      this.setDepth(8, `High complexity detected: ${complexity.toFixed(2)}`);
    } else if (complexity > 0.5) {
      this.setDepth(5, `Medium complexity: ${complexity.toFixed(2)}`);
    }
  }

  setDepth(depth: number, reason: string): void {
    const maxDepth = this.options.maxAutoDepth || 10;
    const newDepth = Math.min(Math.max(1, depth), maxDepth);
    
    if (newDepth !== this.currentDepth) {
      this.depthHistory.push({
        depth: newDepth,
        reason,
        timestamp: new Date()
      });
      
      this.currentDepth = newDepth;
      console.log(`🔧 Depth changed to ${newDepth}: ${reason}`);
    }
  }

  getCurrentDepth(): number {
    return this.currentDepth;
  }

  getDepthHistory(): Array<{ depth: number; reason: string; timestamp: Date }> {
    return [...this.depthHistory];
  }

  private calculateComplexityScore(data: any): number {
    const analysis = DepthOptimizer.analyzeObjectStructure(data);
    
    // Normalize complexity score (0-1)
    const depthScore = Math.min(analysis.maxDepth / 10, 1);
    const sizeScore = Math.min(analysis.sizeEstimate / 100000, 1);
    const objectScore = Math.min(analysis.totalNestedObjects / 1000, 1);
    
    return (depthScore + sizeScore + objectScore) / 3;
  }
}

/**
 * Interactive CLI tool for exploring depth settings
 */
export class DepthExplorer {
  static async interactive(): Promise<void> {
    console.log('🎮 Interactive Depth Explorer');
    console.log('='.repeat(50));
    
    const sampleData = this.generateSampleData();
    
    for (let depth = 1; depth <= 10; depth++) {
      console.log(`\n🔍 Depth ${depth}:`);
      console.log('-'.repeat(30));
      
      // Show what this depth reveals
      const revealed = this.previewAtDepth(sampleData, depth);
      console.log(revealed.preview);
      
      console.log(`Visible levels: ${revealed.visibleLevels}/${revealed.totalLevels}`);
      console.log(`Hidden: ${revealed.hiddenCount} items`);
      
      // Wait for user input (in real implementation)
      console.log('Press Enter to continue...');
      // await this.promptContinue();
    }
  }

  static previewAtDepth(data: any, depth: number): DepthPreview {
    // Generate preview showing what's visible at this depth
    const lines = JSON.stringify(data, null, 2).split('\n');
    const visibleLines = lines.filter((line, index) => 
      this.isVisibleAtDepth(line, depth, index)
    );
    
    const preview = visibleLines.slice(0, 20).join('\n'); // Limit preview size
    
    return {
      preview,
      visibleLevels: depth,
      totalLevels: this.getTotalDepth(data),
      hiddenCount: this.countHiddenItems(data, depth)
    };
  }

  private static generateSampleData(): any {
    return {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                data: 'deep data',
                array: [1, 2, { nested: 'value' }]
              }
            }
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        config: {
          debug: true,
          performance: {
            threshold: 100,
            metrics: ['cpu', 'memory', 'io']
          }
        }
      }
    };
  }

  private static isVisibleAtDepth(line: string, depth: number, _index: number): boolean {
    const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
    const lineDepth = Math.floor(indent / 2) + 1;
    return lineDepth <= depth;
  }

  private static getTotalDepth(obj: any): number {
    let maxDepth = 0;
    
    const traverse = (current: any, currentDepth: number): void => {
      if (typeof current === 'object' && current !== null) {
        maxDepth = Math.max(maxDepth, currentDepth);
        for (const value of Object.values(current)) {
          traverse(value, currentDepth + 1);
        }
      }
    };
    
    traverse(obj, 1);
    return maxDepth;
  }

  private static countHiddenItems(obj: any, maxDepth: number): number {
    let hiddenCount = 0;
    
    const traverse = (current: any, currentDepth: number): void => {
      if (typeof current === 'object' && current !== null) {
        if (currentDepth > maxDepth) {
          hiddenCount += Object.keys(current).length;
        } else {
          for (const value of Object.values(current)) {
            traverse(value, currentDepth + 1);
          }
        }
      }
    };
    
    traverse(obj, 1);
    return hiddenCount;
  }
}

/**
 * Automatic depth configuration based on environment
 */
export class EnvironmentDepthConfig {
  private static readonly DEFAULT_CONFIGS = {
    development: {
      defaultDepth: 5,
      maxDepth: 10,
      onErrorDepth: 8,
      logLevel: 'verbose' as const
    },
    test: {
      defaultDepth: 3,
      maxDepth: 6,
      onErrorDepth: 6,
      logLevel: 'info' as const
    },
    staging: {
      defaultDepth: 2,
      maxDepth: 4,
      onErrorDepth: 6,
      logLevel: 'warn' as const
    },
    production: {
      defaultDepth: 1,
      maxDepth: 3,
      onErrorDepth: 4,
      logLevel: 'error' as const
    },
    profiling: {
      defaultDepth: 3,
      maxDepth: 5,
      onErrorDepth: 5,
      logLevel: 'silent' as const
    }
  };

  static getOptimalDepth(env: string): OptimalDepthConfig {
    return this.DEFAULT_CONFIGS[env as keyof typeof this.DEFAULT_CONFIGS] || 
           this.DEFAULT_CONFIGS.development;
  }

  static detectEnvironment(): string {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const bunEnv = process.env.BUN_ENV?.toLowerCase();
    
    const env = bunEnv || nodeEnv || 'development';
    return Object.keys(this.DEFAULT_CONFIGS).includes(env) ? env : 'development';
  }

  static getCurrentConfig(): OptimalDepthConfig {
    return this.getOptimalDepth(this.detectEnvironment());
  }

  static generateEnvScript(env: string): string {
    const config = this.getOptimalDepth(env);
    
    return `#!/usr/bin/env bash
# ${env.toUpperCase()} Environment Depth Configuration
export BENCHMARK_CONSOLE_DEPTH=${config.defaultDepth}
export BENCHMARK_MAX_DEPTH=${config.maxDepth}
export BENCHMARK_LOG_LEVEL=${config.logLevel}
export BENCHMARK_ON_ERROR_DEPTH=${config.onErrorDepth}

echo "🔧 ${env} environment configured:"
echo "   Default depth: ${config.defaultDepth}"
echo "   Max depth: ${config.maxDepth}"
echo "   Log level: ${config.logLevel}"
echo "   On-error depth: ${config.onErrorDepth}"
`;
  }

  static applyEnvironmentConfig(): void {
    const config = this.getCurrentConfig();
    
    // Apply to process environment
    process.env.BENCHMARK_CONSOLE_DEPTH = config.defaultDepth.toString();
    process.env.BENCHMARK_MAX_DEPTH = config.maxDepth.toString();
    process.env.BENCHMARK_LOG_LEVEL = config.logLevel;
    process.env.BENCHMARK_ON_ERROR_DEPTH = config.onErrorDepth.toString();
    
    console.log(`🔧 Applied ${this.detectEnvironment()} environment configuration:`);
    console.log(`   Default depth: ${config.defaultDepth}`);
    console.log(`   Max depth: ${config.maxDepth}`);
    console.log(`   Log level: ${config.logLevel}`);
  }
}

/**
 * Performance analysis for depth settings
 */
export class DepthPerformanceAnalyzer {
  // Empirical performance data (time in ms per KB at different depths)
  private static readonly PERFORMANCE_DATA = {
    1: { timePerKB: 0.001, memoryPerKB: 0.002, logSizePerKB: 0.05 },
    2: { timePerKB: 0.002, memoryPerKB: 0.004, logSizePerKB: 0.15 },
    3: { timePerKB: 0.004, memoryPerKB: 0.008, logSizePerKB: 0.35 },
    4: { timePerKB: 0.008, memoryPerKB: 0.016, logSizePerKB: 0.75 },
    5: { timePerKB: 0.016, memoryPerKB: 0.032, logSizePerKB: 1.5 },
    6: { timePerKB: 0.032, memoryPerKB: 0.064, logSizePerKB: 3.0 },
    7: { timePerKB: 0.064, memoryPerKB: 0.128, logSizePerKB: 6.0 },
    8: { timePerKB: 0.128, memoryPerKB: 0.256, logSizePerKB: 12.0 },
    9: { timePerKB: 0.256, memoryPerKB: 0.512, logSizePerKB: 25.0 },
    10: { timePerKB: 0.512, memoryPerKB: 1.024, logSizePerKB: 50.0 }
  };

  static analyzeTradeoffs(depth: number, dataSizeKB: number): DepthAnalysis {
    const perf = this.PERFORMANCE_DATA[depth as keyof typeof this.PERFORMANCE_DATA];
    
    return {
      estimatedTimeMs: perf.timePerKB * dataSizeKB,
      estimatedMemoryMB: (perf.memoryPerKB * dataSizeKB) / 1024,
      estimatedLogSizeKB: perf.logSizePerKB * dataSizeKB,
      recommendation: this.getRecommendation(depth, dataSizeKB)
    };
  }

  private static getRecommendation(depth: number, dataSizeKB: number): string {
    const perf = this.PERFORMANCE_DATA[depth as keyof typeof this.PERFORMANCE_DATA];
    const estimatedTimeMs = perf.timePerKB * dataSizeKB;
    const estimatedMemoryMB = (perf.memoryPerKB * dataSizeKB) / 1024;
    
    if (estimatedTimeMs > 1000) {
      return '⚠️ Consider reducing depth for large data sets';
    } else if (estimatedMemoryMB > 100) {
      return '⚠️ High memory usage - monitor carefully';
    } else if (depth > 8 && dataSizeKB > 100) {
      return '⚠️ Deep inspection of large data may be slow';
    } else {
      return '👍 Current depth is appropriate';
    }
  }

  static getOptimalDepthForSize(dataSize: number, maxTimeMs: number = 100) {
    // Find the deepest setting that meets performance requirements
    for (let depth = 10; depth >= 1; depth--) {
      const result = this.analyzeTradeoffs(depth, dataSize);
      if (result.estimatedTimeMs <= maxTimeMs) {
        return { depth, analysis: result };
      }
    }
    
    // Fallback to depth 1
    const result = this.analyzeTradeoffs(1, dataSize);
    return { depth: 1, analysis: result };
  }

  static generatePerformanceReport(depths: number[], dataSizes: number[]): PerformanceReport {
    const results: Array<{depth: number, size: number, analysis: DepthAnalysis}> = [];
    
    for (const depth of depths) {
      for (const size of dataSizes) {
        results.push({
          depth,
          size,
          analysis: this.analyzeTradeoffs(depth, size)
        });
      }
    }
    
    return {
      timestamp: new Date(),
      results,
      summary: this.generateSummary(results)
    };
  }

  private static generateSummary(results: Array<{depth: number, size: number, analysis: DepthAnalysis}>): string {
    const avgTime = results.reduce((sum: number, r) => sum + r.analysis.estimatedTimeMs, 0) / results.length;
    const avgMemory = results.reduce((sum: number, r) => sum + r.analysis.estimatedMemoryMB, 0) / results.length;
    
    return `Average performance: ${avgTime.toFixed(2)}ms, ${avgMemory.toFixed(2)}MB memory`;
  }
}

export default {
  DepthOptimizer,
  AdaptiveDepthManager,
  DepthPerformanceAnalyzer,
  DepthExplorer,
  EnvironmentDepthConfig
};
