/**
 * Bun-Native Peek-Based Async Orchestration
 * 
 * Execute tasks only if not already running using Bun.peek optimization
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface TaskResult<T = any> {
  key: string;
  result: T;
  cached: boolean;
  executionTime: number;
  timestamp: number;
}

export interface OrchestrationStats {
  totalTasks: number;
  cachedTasks: number;
  executedTasks: number;
  cacheHitRate: number;
  averageExecutionTime: number;
  activeTasks: number;
}

export interface TaskOptions {
  ttl?: number; // Time to live in milliseconds
  priority?: 'high' | 'medium' | 'low';
  retries?: number;
  timeout?: number;
}

export class BunPeekOrchestrator {
  private tasks = new Map<string, Promise<any>>();
  private results = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private stats: OrchestrationStats = {
    totalTasks: 0,
    cachedTasks: 0,
    executedTasks: 0,
    cacheHitRate: 0,
    averageExecutionTime: 0,
    activeTasks: 0
  };

  /**
   * Execute task only if not already running (peek optimization)
   */
  async executeOnce<T>(key: string, fn: () => Promise<T>, options: TaskOptions = {}): Promise<T> {
    const { ttl = 300000, retries = 0, timeout = 30000 } = options;
    const startTime = Bun.nanoseconds();
    
    // Check if task is already running without await
    const existing = this.tasks.get(key);
    if (existing) {
      const status = Bun.peek.status(existing);
      if (status === 'pending') {
        return existing; // Return existing promise
      }
      if (status === 'fulfilled') {
        const result = Bun.peek(existing);
        if (result !== undefined) {
          this.stats.cachedTasks++;
          return result; // Return cached result
        }
      }
    }

    // Check cache for expired results
    const cached = this.results.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      this.stats.cachedTasks++;
      return cached.result;
    }

    // Start new task
    const promise = this.executeWithRetry(fn, retries, timeout);
    this.tasks.set(key, promise);
    this.stats.totalTasks++;
    this.stats.executedTasks++;
    this.stats.activeTasks++;

    try {
      const result = await promise;
      const endTime = Bun.nanoseconds();
      const executionTime = (endTime - startTime) / 1_000_000;

      // Cache result
      this.results.set(key, { result, timestamp: Date.now(), ttl });

      // Update stats
      this.updateAverageExecutionTime(executionTime);

      // Cleanup on completion
      promise.finally(() => {
        this.tasks.delete(key);
        this.stats.activeTasks--;
      });

      return result;
    } catch (error) {
      // Cleanup on error
      this.tasks.delete(key);
      this.stats.activeTasks--;
      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, retries: number, timeout: number): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const promise = fn();
        
        // Add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout);
        });

        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          // Exponential backoff
          await Bun.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Batch process with peek optimization
   */
  async batchProcess<T>(items: string[], processor: (item: string) => Promise<T>, options: TaskOptions = {}): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    const promises = items.map(async item => {
      const result = await this.executeOnce(`task:${item}`, () => processor(item), options);
      return { item, result };
    });

    const settled = await Promise.allSettled(promises);
    
    for (const promise of settled) {
      if (promise.status === 'fulfilled') {
        results.set(promise.value.item, promise.value.result);
      }
    }
    
    return results;
  }

  /**
   * Concurrent batch processing with concurrency limit
   */
  async concurrentBatch<T>(
    items: string[], 
    processor: (item: string) => Promise<T>, 
    concurrency: number = 10,
    options: TaskOptions = {}
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const chunks = this.chunkArray(items, concurrency);
    
    for (const chunk of chunks) {
      const chunkResults = await this.batchProcess(chunk, processor, options);
      for (const [item, result] of chunkResults) {
        results.set(item, result);
      }
    }
    
    return results;
  }

  /**
   * Execute task with priority queue
   */
  async executeWithPriority<T>(
    key: string, 
    fn: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low' = 'medium',
    options: TaskOptions = {}
  ): Promise<T> {
    const priorityKey = `${priority}:${key}`;
    return this.executeOnce(priorityKey, fn, options);
  }

  /**
   * Execute task with dependency
   */
  async executeWithDependency<T, D>(
    key: string,
    dependencyKey: string,
    fn: (dependency: D) => Promise<T>,
    options: TaskOptions = {}
  ): Promise<T> {
    // First ensure dependency is executed
    const dependency = await this.executeOnce(dependencyKey, async () => {
      throw new Error(`Dependency ${dependencyKey} not found`);
    });

    // Then execute main task
    return this.executeOnce(key, () => fn(dependency), options);
  }

  /**
   * Execute task with caching disabled
   */
  async executeNoCache<T>(key: string, fn: () => Promise<T>, options: TaskOptions = {}): Promise<T> {
    // Clear existing cache
    this.tasks.delete(key);
    this.results.delete(key);
    
    return this.executeOnce(key, fn, { ...options, ttl: 0 });
  }

  /**
   * Execute task with custom cache key
   */
  async executeWithCustomKey<T>(
    baseKey: string,
    params: Record<string, any>,
    fn: (params: Record<string, any>) => Promise<T>,
    options: TaskOptions = {}
  ): Promise<T> {
    const customKey = `${baseKey}:${this.hashParams(params)}`;
    return this.executeOnce(customKey, () => fn(params), options);
  }

  /**
   * Get task status without awaiting
   */
  getTaskStatus(key: string): 'pending' | 'fulfilled' | 'rejected' | 'not_found' {
    const task = this.tasks.get(key);
    if (!task) return 'not_found';
    
    const status = Bun.peek.status(task);
    return status as 'pending' | 'fulfilled' | 'rejected';
  }

  /**
   * Get cached result if available
   */
  getCachedResult<T>(key: string): T | null {
    const cached = this.results.get(key);
    if (!cached) return null;
    
    if ((Date.now() - cached.timestamp) > cached.ttl) {
      this.results.delete(key);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear matching keys
      for (const key of this.results.keys()) {
        if (key.includes(pattern)) {
          this.results.delete(key);
        }
      }
      for (const key of this.tasks.keys()) {
        if (key.includes(pattern)) {
          this.tasks.delete(key);
        }
      }
    } else {
      // Clear all
      this.results.clear();
      this.tasks.clear();
    }
  }

  /**
   * Get orchestration statistics
   */
  getStats(): OrchestrationStats {
    this.stats.cacheHitRate = this.stats.totalTasks > 0 
      ? (this.stats.cachedTasks / this.stats.totalTasks) * 100 
      : 0;
    
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      cachedTasks: 0,
      executedTasks: 0,
      cacheHitRate: 0,
      averageExecutionTime: 0,
      activeTasks: this.tasks.size
    };
  }

  /**
   * Wait for all active tasks to complete
   */
  async waitForCompletion(): Promise<void> {
    const promises = Array.from(this.tasks.values());
    await Promise.allSettled(promises);
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll(): void {
    for (const [key, task] of this.tasks) {
      // Note: Bun doesn't support promise cancellation, so we just remove from tracking
      this.tasks.delete(key);
    }
    this.stats.activeTasks = 0;
  }

  /**
   * Get active task keys
   */
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Get cached keys
   */
  getCachedKeys(): string[] {
    return Array.from(this.results.keys());
  }

  // Private helper methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private hashParams(params: Record<string, any>): string {
    const str = JSON.stringify(params, Object.keys(params).sort());
    return Bun.hash(str).toString(36);
  }

  private updateAverageExecutionTime(newTime: number): void {
    const total = this.stats.executedTasks;
    const current = this.stats.averageExecutionTime;
    this.stats.averageExecutionTime = ((current * (total - 1)) + newTime) / total;
  }
}

// CLI interface
if (import.meta.main) {
  const orchestrator = new BunPeekOrchestrator();
  const args = process.argv.slice(2);
  
  if (args[0] === 'demo') {
    // Demo with SMS extraction
    console.log('=== Peek Orchestration Demo ===');
    
    const phoneNumbers = [
      '+15005551234',
      '+15005551234', // Duplicate
      '+15005551235',
      '+15005551236',
      '+15005551234'  // Duplicate again
    ];
    
    const processor = async (phone: string) => {
      await Bun.sleep(100); // Simulate processing
      return `${phone}:${Math.random().toString().substring(2, 8)}`;
    };
    
    const startTime = Bun.nanoseconds();
    const results = await orchestrator.batchProcess(phoneNumbers, processor);
    const endTime = Bun.nanoseconds();
    
    console.log(`Processed: ${results.size} unique numbers in ${((endTime - startTime) / 1e6).toFixed(2)}ms`);
    
    for (const [phone, result] of results) {
      console.log(`${phone} -> ${result}`);
    }
    
    const stats = orchestrator.getStats();
    console.log('\n=== Statistics ===');
    console.log(`Total tasks: ${stats.totalTasks}`);
    console.log(`Cached tasks: ${stats.cachedTasks}`);
    console.log(`Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
    console.log(`Average execution time: ${stats.averageExecutionTime.toFixed(2)}ms`);
  } else if (args[0] === 'concurrent') {
    // Concurrent demo
    console.log('=== Concurrent Processing Demo ===');
    
    const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);
    const processor = async (item: string) => {
      await Bun.sleep(50);
      return `${item}-processed`;
    };
    
    const results = await orchestrator.concurrentBatch(items, processor, 5);
    console.log(`Processed ${results.size} items concurrently`);
    
    const stats = orchestrator.getStats();
    console.log(`Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`);
  } else {
    console.log('Usage:');
    console.log('  bun peek-orchestrator.ts demo');
    console.log('  bun peek-orchestrator.ts concurrent');
  }
}
