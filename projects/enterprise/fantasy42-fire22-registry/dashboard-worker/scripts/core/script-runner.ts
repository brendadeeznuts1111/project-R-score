#!/usr/bin/env bun

/**
 * 🚀 Fire22 Script Runner - Performance Wrapper & Execution Engine
 *
 * This core utility provides:
 * - Performance monitoring (timing, memory usage)
 * - Standardized error handling
 * - Execution logging and tracking
 * - Resource usage optimization
 * - Script dependency management
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

interface RunOptions {
  silent?: boolean;
  timeout?: number;
  retries?: number;
  captureOutput?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  tags?: string[];
  metadata?: Record<string, any>;
}

interface RunResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  performance: {
    duration: number;
    memoryDelta: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  metadata: {
    scriptName: string;
    timestamp: string;
    executionId: string;
    tags: string[];
    retryCount: number;
  };
  output?: {
    stdout: string;
    stderr: string;
  };
}

interface ScriptMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  averageMemoryUsage: number;
  lastExecuted: string;
  errorRate: number;
}

class ScriptRunner {
  private static instance: ScriptRunner;
  private metrics: Map<string, ScriptMetrics> = new Map();
  private executionHistory: Array<RunResult<any>> = [];
  private maxHistorySize = 1000;

  private constructor() {}

  static getInstance(): ScriptRunner {
    if (!ScriptRunner.instance) {
      ScriptRunner.instance = new ScriptRunner();
    }
    return ScriptRunner.instance;
  }

  /**
   * Execute a script with comprehensive monitoring
   */
  static async run<T>(
    scriptName: string,
    fn: () => Promise<T>,
    options: RunOptions = {}
  ): Promise<RunResult<T>> {
    const runner = ScriptRunner.getInstance();
    return runner.executeScript(scriptName, fn, options);
  }

  /**
   * Execute a script with full monitoring
   */
  private async executeScript<T>(
    scriptName: string,
    fn: () => Promise<T>,
    options: RunOptions = {}
  ): Promise<RunResult<T>> {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    const defaultOptions: RunOptions = {
      silent: false,
      timeout: 300000, // 5 minutes
      retries: 0,
      captureOutput: true,
      logLevel: 'info',
      tags: [],
      metadata: {},
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (!finalOptions.silent) {
      this.log(`🚀 Executing script: ${scriptName}`, finalOptions.logLevel);
      this.log(`📊 Execution ID: ${executionId}`, finalOptions.logLevel);
    }

    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= finalOptions.retries) {
      try {
        // Set up timeout if specified
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Script execution timed out after ${finalOptions.timeout}ms`)),
            finalOptions.timeout
          );
        });

        // Execute the script
        const result = await Promise.race([fn(), timeoutPromise]);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();

        const runResult: RunResult<T> = {
          success: true,
          data: result,
          performance: {
            duration: endTime - startTime,
            memoryDelta: {
              rss: endMemory.rss - startMemory.rss,
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              external: endMemory.external - startMemory.external,
            },
            cpuUsage: {
              user: endCpu.user - startCpu.user,
              system: endCpu.system - startCpu.system,
            },
          },
          metadata: {
            scriptName,
            timestamp: new Date().toISOString(),
            executionId,
            tags: finalOptions.tags || [],
            retryCount,
          },
        };

        // Update metrics
        this.updateMetrics(scriptName, runResult);

        // Add to history
        this.addToHistory(runResult);

        if (!finalOptions.silent) {
          this.log(
            `✅ Script executed successfully in ${runResult.performance.duration.toFixed(2)}ms`,
            finalOptions.logLevel
          );
          this.log(
            `💾 Memory delta: ${(runResult.performance.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            finalOptions.logLevel
          );
        }

        return runResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        if (retryCount <= finalOptions.retries) {
          this.log(
            `⚠️  Script failed, retrying (${retryCount}/${finalOptions.retries})...`,
            finalOptions.logLevel
          );
          await this.delay(1000 * retryCount); // Exponential backoff
        } else {
          const endTime = performance.now();
          const endMemory = process.memoryUsage();
          const endCpu = process.cpuUsage();

          const runResult: RunResult<T> = {
            success: false,
            error: lastError,
            performance: {
              duration: endTime - startTime,
              memoryDelta: {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                external: endMemory.external - startMemory.external,
              },
              cpuUsage: {
                user: endCpu.user - startCpu.user,
                system: endCpu.system - startCpu.system,
              },
            },
            metadata: {
              scriptName,
              timestamp: new Date().toISOString(),
              executionId,
              tags: finalOptions.tags || [],
              retryCount,
            },
          };

          // Update metrics
          this.updateMetrics(scriptName, runResult);

          // Add to history
          this.addToHistory(runResult);

          if (!finalOptions.silent) {
            this.log(
              `❌ Script failed after ${finalOptions.retries + 1} attempts`,
              finalOptions.logLevel
            );
            this.log(`💥 Error: ${lastError.message}`, finalOptions.logLevel);
          }

          return runResult;
        }
      }
    }

    throw new Error('Unexpected execution path');
  }

  /**
   * Get performance metrics for a script
   */
  getScriptMetrics(scriptName: string): ScriptMetrics | undefined {
    return this.metrics.get(scriptName);
  }

  /**
   * Get all script metrics
   */
  getAllMetrics(): Map<string, ScriptMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): Array<RunResult<any>> {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const report = ['📊 Fire22 Script Performance Report', '!==!==!==!==!==!==!==\n'];

    for (const [scriptName, metrics] of this.metrics) {
      report.push(`🔧 ${scriptName}:`);
      report.push(`   📈 Total Executions: ${metrics.totalExecutions}`);
      report.push(
        `   ✅ Success Rate: ${((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`
      );
      report.push(`   ⏱️  Average Duration: ${metrics.averageDuration.toFixed(2)}ms`);
      report.push(
        `   💾 Average Memory: ${(metrics.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
      report.push(`   🕒 Last Executed: ${metrics.lastExecuted}`);
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Private helper methods
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(scriptName: string, result: RunResult<any>): void {
    const existing = this.metrics.get(scriptName) || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      averageMemoryUsage: 0,
      lastExecuted: '',
      errorRate: 0,
    };

    existing.totalExecutions++;
    existing.lastExecuted = result.metadata.timestamp;

    if (result.success) {
      existing.successfulExecutions++;
    } else {
      existing.failedExecutions++;
    }

    // Update averages
    existing.averageDuration =
      (existing.averageDuration * (existing.totalExecutions - 1) + result.performance.duration) /
      existing.totalExecutions;
    existing.averageMemoryUsage =
      (existing.averageMemoryUsage * (existing.totalExecutions - 1) +
        result.performance.memoryDelta.heapUsed) /
      existing.totalExecutions;
    existing.errorRate = (existing.failedExecutions / existing.totalExecutions) * 100;

    this.metrics.set(scriptName, existing);
  }

  private addToHistory(result: RunResult<any>): void {
    this.executionHistory.push(result);

    // Maintain history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string, level: string = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

// Export the class and a convenience function
export { ScriptRunner };
export const runScript = ScriptRunner.run;
export default ScriptRunner;
