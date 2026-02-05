// Resource management with manual cleanup (fallback for DisposableStack)
import type { OddsTick } from '../types';

export class TickProcessor {
  /**
   * Process ticks with proper resource cleanup
   */
  async processTicks(ticks: OddsTick[]): Promise<ProcessResult> {
    const resources: any[] = [];
    
    try {
      // Acquire resources that need cleanup
      const databaseConnection = this.acquireDatabaseConnection();
      const cacheConnection = this.acquireCacheConnection();
      const fileHandle = this.acquireLogFile();
      
      resources.push(databaseConnection, cacheConnection, fileHandle);
      
      // Process each tick
      const results: ProcessResult[] = [];
      
      for (const tick of ticks) {
        const result = await this.processSingleTick(tick, {
          db: databaseConnection,
          cache: cacheConnection,
          log: fileHandle
        });
        results.push(result);
      }
      
      // Aggregate results
      const finalResult = this.aggregateResults(results);
      
      // Manual cleanup
      resources.forEach(resource => {
        if (resource[Symbol.dispose]) {
          resource[Symbol.dispose]();
        }
      });
      
      return finalResult;
      
    } catch (error) {
      console.error('Tick processing failed:', error);
      
      // Cleanup on error
      resources.forEach(resource => {
        if (resource[Symbol.dispose]) {
          resource[Symbol.dispose]();
        }
      });
      
      throw error;
    }
  }

  private acquireDatabaseConnection() {
    return {
      [Symbol.dispose]() {
        console.log('🔌 Database connection closed');
        // Actual cleanup logic here
      },
      
      query: async (sql: string) => {
        // Database query implementation
        return { rows: [] };
      }
    };
  }

  private acquireCacheConnection() {
    return {
      [Symbol.dispose]() {
        console.log('🔌 Cache connection closed');
        // Actual cleanup logic here
      },
      
      set: async (key: string, value: any) => {
        // Cache set implementation
      },
      
      get: async (key: string) => {
        // Cache get implementation
        return null;
      }
    };
  }

  private acquireLogFile() {
    return {
      [Symbol.dispose]() {
        console.log('📝 Log file closed');
        // Actual cleanup logic here
      },
      
      write: async (data: string) => {
        // File write implementation
      }
    };
  }

  private async processSingleTick(
    tick: OddsTick, 
    resources: any
  ): Promise<ProcessResult> {
    // Process tick using acquired resources
    await resources.db.query('INSERT INTO ticks ...');
    await resources.cache.set(`tick:${(tick as any).id || 'unknown'}`, tick);
    await resources.log.write(JSON.stringify(tick));
    
    return {
      tickId: (tick as any).id || 'unknown',
      processed: true,
      timestamp: Date.now()
    };
  }

  private aggregateResults(results: ProcessResult[]): ProcessResult {
    return {
      processed: results.every(r => r.processed),
      totalTicks: results.length,
      successful: results.filter(r => r.processed).length,
      timestamp: Date.now()
    };
  }

  /**
   * Batch processing with resource management
   */
  async processBatch(
    ticks: OddsTick[],
    batchSize: number = 100
  ): Promise<void> {
    await using stack = new AsyncDisposableStack();
    
    // Acquire batch processing resources
    const batchProcessor = stack.use(this.createBatchProcessor());
    const progressTracker = stack.use(this.createProgressTracker());
    
    for (let i = 0; i < ticks.length; i += batchSize) {
      const batch = ticks.slice(i, i + batchSize);
      
      await using batchStack = new AsyncDisposableStack();
      const batchResources = batchStack.use(this.acquireBatchResources());
      
      try {
        await batchProcessor.process(batch, batchResources);
        await progressTracker.update(i + batch.length, ticks.length);
      } catch (error) {
        console.error(`Batch ${i / batchSize} failed:`, error);
        // Continue with next batch
      }
    }
  }

  private createBatchProcessor() {
    return {
      [Symbol.asyncDispose]: async () => {
        console.log('🔄 Batch processor disposed');
      },
      
      process: async (batch: OddsTick[], resources: any) => {
        // Batch processing logic
      }
    };
  }

  private createProgressTracker() {
    return {
      [Symbol.asyncDispose]: async () => {
        console.log('📊 Progress tracker disposed');
      },
      
      update: async (current: number, total: number) => {
        const percent = ((current / total) * 100).toFixed(1);
        console.log(`Progress: ${percent}% (${current}/${total})`);
      }
    };
  }

  private acquireBatchResources() {
    return {
      [Symbol.asyncDispose]: async () => {
        console.log('📦 Batch resources disposed');
      }
    };
  }
}

interface ProcessResult {
  tickId?: string;
  processed: boolean;
  totalTicks?: number;
  successful?: number;
  timestamp: number;
}
