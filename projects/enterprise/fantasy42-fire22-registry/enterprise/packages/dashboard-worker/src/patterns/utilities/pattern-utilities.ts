/**
 * Pattern Utilities Module
 * Utility functions for working with patterns, pipelines, and pattern operations
 */

import type {
  PatternType,
  PatternExecutionContext,
  PatternResult,
  PatternPipeline,
  PatternExecutionOptions,
  TabularResult,
} from '../core/pattern-types';

export class PatternUtils {
  private static pipelines: Map<string, PatternPipeline> = new Map();

  /**
   * Apply multiple patterns in sequence (chain)
   */
  static async chain(
    ...contexts: Array<{ pattern: PatternType; context: any }>
  ): Promise<PatternResult[]> {
    const results: PatternResult[] = [];

    for (const { pattern, context } of contexts) {
      const startTime = Date.now();

      try {
        // Apply the pattern (this would normally call the pattern weaver)
        const result = await this.applyPattern(pattern, context);
        const executionTime = Date.now() - startTime;

        results.push({
          success: true,
          data: result,
          executionTime,
          pattern,
        });
      } catch (error) {
        const executionTime = Date.now() - startTime;

        results.push({
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
          pattern,
        });

        // Stop chain on first error
        break;
      }
    }

    return results;
  }

  /**
   * Apply multiple patterns in parallel
   */
  static async parallel(
    ...contexts: Array<{ pattern: PatternType; context: any }>
  ): Promise<PatternResult[]> {
    const promises = contexts.map(async ({ pattern, context }) => {
      const startTime = Date.now();

      try {
        const result = await this.applyPattern(pattern, context);
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          data: result,
          executionTime,
          pattern,
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;

        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
          pattern,
        };
      }
    });

    return await Promise.all(promises);
  }

  /**
   * Create a pattern pipeline
   */
  static pipeline(...patterns: PatternType[]): {
    execute: (context: any, options?: PatternExecutionOptions) => Promise<PatternResult[]>;
    id: string;
  } {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execute = async (
      context: any,
      options?: PatternExecutionOptions
    ): Promise<PatternResult[]> => {
      const pipeline: PatternPipeline = {
        id: pipelineId,
        name: `Pipeline ${patterns.join(' → ')}`,
        patterns,
        context,
        options,
        status: 'running',
        createdAt: new Date(),
      };

      this.pipelines.set(pipelineId, pipeline);

      try {
        const results: PatternResult[] = [];

        for (const pattern of patterns) {
          const startTime = Date.now();
          const patternContext = { ...context, previousResult: results[results.length - 1]?.data };

          try {
            const result = await this.applyPattern(pattern, patternContext, options);
            const executionTime = Date.now() - startTime;

            results.push({
              success: true,
              data: result,
              executionTime,
              pattern,
            });
          } catch (error) {
            const executionTime = Date.now() - startTime;

            results.push({
              success: false,
              data: null,
              error: error instanceof Error ? error.message : 'Unknown error',
              executionTime,
              pattern,
            });

            // Update pipeline status
            pipeline.status = 'failed';
            pipeline.completedAt = new Date();
            this.pipelines.set(pipelineId, pipeline);

            return results;
          }
        }

        // Mark pipeline as completed
        pipeline.status = 'completed';
        pipeline.completedAt = new Date();
        pipeline.results = results;
        this.pipelines.set(pipelineId, pipeline);

        return results;
      } catch (error) {
        pipeline.status = 'failed';
        pipeline.completedAt = new Date();
        this.pipelines.set(pipelineId, pipeline);
        throw error;
      }
    };

    return { execute, id: pipelineId };
  }

  /**
   * Create a conditional pattern execution
   */
  static conditional(condition: (context: any) => boolean | Promise<boolean>): {
    then: (...patterns: PatternType[]) => {
      otherwise: (...patterns: PatternType[]) => {
        execute: (context: any, options?: PatternExecutionOptions) => Promise<PatternResult[]>;
      };
    };
  } {
    return {
      then: (...thenPatterns: PatternType[]) => ({
        otherwise: (...otherwisePatterns: PatternType[]) => ({
          execute: async (
            context: any,
            options?: PatternExecutionOptions
          ): Promise<PatternResult[]> => {
            const shouldExecuteThen = await this.evaluateCondition(condition, context);
            const patternsToExecute = shouldExecuteThen ? thenPatterns : otherwisePatterns;

            if (patternsToExecute.length === 0) {
              return [];
            }

            const { execute } = this.pipeline(...patternsToExecute);
            return await execute(context, options);
          },
        }),
      }),
    };
  }

  /**
   * Retry pattern execution with backoff
   */
  static retry(
    pattern: PatternType,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): {
    execute: (context: any, options?: PatternExecutionOptions) => Promise<PatternResult>;
  } {
    return {
      execute: async (context: any, options?: PatternExecutionOptions): Promise<PatternResult> => {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.applyPattern(pattern, context, options);
            return {
              success: true,
              data: result,
              executionTime: 0, // Would be tracked by the pattern itself
              pattern,
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');

            if (attempt < maxRetries) {
              // Wait with exponential backoff
              const delay = backoffMs * Math.pow(2, attempt);
              await this.delay(delay);
            }
          }
        }

        return {
          success: false,
          data: null,
          error: lastError?.message || 'Max retries exceeded',
          executionTime: 0,
          pattern,
        };
      },
    };
  }

  /**
   * Create a pattern composition (combines multiple patterns into one)
   */
  static compose(...patterns: PatternType[]): {
    execute: (context: any, options?: PatternExecutionOptions) => Promise<PatternResult>;
  } {
    return {
      execute: async (context: any, options?: PatternExecutionOptions): Promise<PatternResult> => {
        const startTime = Date.now();

        try {
          // Execute all patterns in parallel and combine results
          const results = await this.parallel(...patterns.map(pattern => ({ pattern, context })));

          const executionTime = Date.now() - startTime;

          // Combine results into a single result
          const combinedData = {
            results: results.map(r => ({ pattern: r.pattern, data: r.data, success: r.success })),
            summary: {
              totalPatterns: patterns.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
            },
          };

          return {
            success: results.every(r => r.success),
            data: combinedData,
            executionTime,
            pattern: patterns[0], // Primary pattern
            metadata: {
              composedPatterns: patterns,
              individualResults: results,
            },
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Composition failed',
            executionTime,
            pattern: patterns[0],
          };
        }
      },
    };
  }

  /**
   * Get pipeline status
   */
  static getPipelineStatus(pipelineId: string): PatternPipeline | null {
    return this.pipelines.get(pipelineId) || null;
  }

  /**
   * Get all active pipelines
   */
  static getActivePipelines(): PatternPipeline[] {
    return Array.from(this.pipelines.values()).filter(p => p.status === 'running');
  }

  /**
   * Cancel a pipeline
   */
  static cancelPipeline(pipelineId: string): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.status !== 'running') {
      return false;
    }

    pipeline.status = 'failed';
    pipeline.completedAt = new Date();
    this.pipelines.set(pipelineId, pipeline);

    return true;
  }

  /**
   * Clean up completed pipelines (older than specified time)
   */
  static cleanupPipelines(olderThanMs: number = 3600000): number {
    // 1 hour default
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [id, pipeline] of this.pipelines) {
      if (pipeline.completedAt && pipeline.completedAt.getTime() < cutoffTime) {
        this.pipelines.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get pipeline statistics
   */
  static getPipelineStatistics(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageExecutionTime: number;
  } {
    const pipelines = Array.from(this.pipelines.values());

    const completedPipelines = pipelines.filter(p => p.status === 'completed');
    const totalExecutionTime = completedPipelines.reduce((sum, p) => {
      if (p.completedAt && p.createdAt) {
        return sum + (p.completedAt.getTime() - p.createdAt.getTime());
      }
      return sum;
    }, 0);

    return {
      total: pipelines.length,
      active: pipelines.filter(p => p.status === 'running').length,
      completed: completedPipelines.length,
      failed: pipelines.filter(p => p.status === 'failed').length,
      averageExecutionTime:
        completedPipelines.length > 0 ? totalExecutionTime / completedPipelines.length : 0,
    };
  }

  // Private helper methods

  private static async applyPattern(
    pattern: PatternType,
    context: any,
    options?: PatternExecutionOptions
  ): Promise<any> {
    // This would normally delegate to the pattern weaver
    // For now, return a mock result
    switch (pattern) {
      case 'LOADER':
        return { loaded: true, path: context };
      case 'TABULAR':
        return this.createTabularResult(context);
      case 'TIMING':
        const start = Date.now();
        const result = typeof context === 'function' ? await context() : context;
        return { result, executionTime: Date.now() - start };
      case 'SHELL':
        return { command: context.command, executed: true };
      case 'BUNX':
        return { package: context.package, executed: true };
      default:
        return { pattern, context, executed: true };
    }
  }

  private static createTabularResult(data: any): TabularResult {
    if (Array.isArray(data)) {
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const rows = data.map(item => headers.map(header => item[header]));

      return {
        headers,
        rows,
        summary: {
          totalRows: data.length,
          totalColumns: headers.length,
          executionTime: 0,
        },
      };
    }

    return {
      headers: ['Key', 'Value'],
      rows: Object.entries(data).map(([key, value]) => [key, String(value)]),
      summary: {
        totalRows: Object.keys(data).length,
        totalColumns: 2,
        executionTime: 0,
      },
    };
  }

  private static async evaluateCondition(
    condition: (context: any) => boolean | Promise<boolean>,
    context: any
  ): Promise<boolean> {
    try {
      return await condition(context);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export utility functions for direct use
export const { chain, parallel, pipeline, conditional, retry, compose } = PatternUtils;
