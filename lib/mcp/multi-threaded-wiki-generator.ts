// lib/mcp/multi-threaded-wiki-generator.ts - Multi-threaded wiki generation with worker pools

import { MCPWikiGenerator, WikiTemplate, WikiGenerationRequest, WikiGenerationResult } from './wiki-generator-mcp';
import { EventEmitter } from 'events';

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  workerScript: string;
  taskTimeout: number;
  maxRetries: number;
}

export interface WikiGenerationTask {
  id: string;
  template: WikiTemplate;
  request: WikiGenerationRequest;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  retries: number;
  resolve: (result: WikiGenerationResult) => void;
  reject: (error: Error) => void;
}

export interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  throughputPerSecond: number;
}

/**
 * Multi-threaded wiki generator with worker pool management
 */
export class MultiThreadedWikiGenerator extends EventEmitter {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WikiGenerationTask[] = [];
  private activeTasks = new Map<string, WikiGenerationTask>();
  private config: WorkerPoolConfig;
  private stats: WorkerStats;
  private isShuttingDown = false;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();
    
    this.config = {
      minWorkers: 2,
      maxWorkers: Math.min(8, navigator.hardwareConcurrency ?? 4),
      workerScript: new URL('./wiki-worker.ts', import.meta.url).href,
      taskTimeout: 30000, // 30 seconds
      maxRetries: 3,
      ...config
    };

    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0,
      throughputPerSecond: 0
    };

    this.initializeWorkerPool();
  }

  /**
   * Initialize the worker pool with minimum workers
   */
  private async initializeWorkerPool(): Promise<void> {
    const promises = [];
    for (let i = 0; i < this.config.minWorkers; i++) {
      promises.push(this.createWorker());
    }
    
    await Promise.all(promises);
    this.emit('workerPoolInitialized', this.stats);
  }

  /**
   * Create a new worker and set up event handlers
   */
  private async createWorker(): Promise<Worker> {
    const worker = new Worker(this.config.workerScript);

    worker.onmessage = (event: MessageEvent) => {
      this.handleWorkerMessage(worker, event.data);
    };

    worker.onerror = (event: ErrorEvent) => {
      this.handleWorkerError(worker, new Error(event.message));
    };

    this.workers.push(worker);
    this.availableWorkers.push(worker);
    this.stats.totalWorkers = this.workers.length;

    return worker;
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(worker: Worker, result: { taskId: string; data: WikiGenerationResult | Error }): void {
    const task = this.activeTasks.get(result.taskId);
    if (!task) return;

    this.activeTasks.delete(result.taskId);
    this.availableWorkers.push(worker);
    this.stats.activeWorkers = this.activeTasks.size;

    if (result.data instanceof Error) {
      this.handleTaskFailure(task, result.data);
    } else {
      this.handleTaskSuccess(task, result.data);
    }

    this.processQueue();
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: Worker, error: Error): void {
    console.error(`Worker error: ${error.message}`);
    
    // Find and fail any active tasks on this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      this.activeTasks.delete(taskId);
      this.handleTaskFailure(task, error);
    }

    this.removeWorker(worker);
    this.replaceWorker();
  }

  /**
   * Remove worker from pools
   */
  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }
    
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    
    this.stats.totalWorkers = this.workers.length;
    this.stats.activeWorkers = this.activeTasks.size;
  }

  /**
   * Replace a failed worker
   */
  private async replaceWorker(): Promise<void> {
    if (this.workers.length < this.config.minWorkers && !this.isShuttingDown) {
      try {
        await this.createWorker();
      } catch (error) {
        console.error('Failed to replace worker:', error);
        // Retry after delay
        setTimeout(() => this.replaceWorker(), 5000);
      }
    }
  }

  /**
   * Scale up workers based on queue size
   */
  private async scaleUp(): Promise<void> {
    const queuePressure = this.taskQueue.length / this.availableWorkers.length;
    
    if (queuePressure > 2 && this.workers.length < this.config.maxWorkers) {
      const workersToAdd = Math.min(
        Math.ceil(queuePressure / 2),
        this.config.maxWorkers - this.workers.length
      );
      
      for (let i = 0; i < workersToAdd; i++) {
        try {
          await this.createWorker();
        } catch (error) {
          console.error('Failed to scale up workers:', error);
          break;
        }
      }
    }
  }

  /**
   * Scale down workers if idle
   */
  private scaleDown(): void {
    const idleWorkers = this.availableWorkers.length;
    const minNeeded = Math.max(this.config.minWorkers, Math.ceil(this.taskQueue.length / 2));
    
    if (idleWorkers > minNeeded && this.workers.length > this.config.minWorkers) {
      const workersToRemove = Math.min(
        idleWorkers - minNeeded,
        this.workers.length - this.config.minWorkers
      );
      
      for (let i = 0; i < workersToRemove; i++) {
        const worker = this.availableWorkers.pop();
        if (worker) {
          worker.terminate();
        }
      }
    }
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      const worker = this.availableWorkers.pop();
      if (!worker) {
        this.taskQueue.unshift(task);
        break;
      }

      this.executeTask(worker, task);
    }

    this.stats.queuedTasks = this.taskQueue.length;
    
    // Auto-scaling
    this.scaleUp();
    this.scaleDown();
  }

  /**
   * Execute a task on a worker
   */
  private executeTask(worker: Worker, task: WikiGenerationTask): void {
    this.activeTasks.set(task.id, task);
    this.stats.activeWorkers = this.activeTasks.size;

    const timeout = setTimeout(() => {
      this.handleTaskTimeout(task);
    }, this.config.taskTimeout);

    try {
      worker.postMessage({
        taskId: task.id,
        template: task.template,
        request: task.request
      });

      // Clear timeout when message is sent successfully
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      this.handleTaskFailure(task, error as Error);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(task: WikiGenerationTask): void {
    console.error(`Task ${task.id} timed out`);
    this.activeTasks.delete(task.id);
    this.handleTaskFailure(task, new Error('Task timeout'));
  }

  /**
   * Handle task success
   */
  private handleTaskSuccess(task: WikiGenerationTask, result: WikiGenerationResult): void {
    const processingTime = Date.now() - task.createdAt.getTime();
    
    this.stats.completedTasks++;
    this.updateAverageProcessingTime(processingTime);
    this.updateThroughput();

    task.resolve(result);
    this.emit('taskCompleted', { task, result, processingTime });
  }

  /**
   * Handle task failure with retry logic
   */
  private handleTaskFailure(task: WikiGenerationTask, error: Error): void {
    task.retries++;
    
    if (task.retries <= this.config.maxRetries) {
      console.log(`Retrying task ${task.id} (attempt ${task.retries}/${this.config.maxRetries})`);
      this.taskQueue.unshift(task);
      this.processQueue();
    } else {
      this.stats.failedTasks++;
      task.reject(error);
      this.emit('taskFailed', { task, error });
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const totalTasks = this.stats.completedTasks + this.stats.failedTasks;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalTasks - 1) + processingTime) / totalTasks;
  }

  /**
   * Update throughput calculation
   */
  private updateThroughput(): void {
    const timeWindow = 60000; // 1 minute
    const recentTasks = this.stats.completedTasks;
    this.stats.throughputPerSecond = recentTasks / (timeWindow / 1000);
  }

  /**
   * Generate wiki content asynchronously
   */
  public async generateWiki(
    template: WikiTemplate,
    request: WikiGenerationRequest,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<WikiGenerationResult> {
    return new Promise((resolve, reject) => {
      const task: WikiGenerationTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        template,
        request,
        priority,
        createdAt: new Date(),
        retries: 0,
        resolve,
        reject
      };

      // Insert task based on priority
      this.insertTaskByPriority(task);
      this.processQueue();
      
      this.emit('taskQueued', task);
    });
  }

  /**
   * Insert task into queue based on priority
   */
  private insertTaskByPriority(task: WikiGenerationTask): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];
    
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (priorityOrder[this.taskQueue[i].priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, task);
    this.stats.queuedTasks = this.taskQueue.length;
  }

  /**
   * Generate multiple wiki contents in parallel
   */
  public async generateBatch(
    templates: WikiTemplate[],
    request: WikiGenerationRequest,
    options: { concurrency?: number; failFast?: boolean } = {}
  ): Promise<WikiGenerationResult[]> {
    const { concurrency = 4, failFast = false } = options;
    const results: WikiGenerationResult[] = [];
    const errors: Error[] = [];

    // Process in batches
    for (let i = 0; i < templates.length; i += concurrency) {
      const batch = templates.slice(i, i + concurrency);
      const batchPromises = batch.map(template => 
        this.generateWiki(template, request).catch(error => {
          if (failFast) throw error;
          errors.push(error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      
      if (failFast && errors.length > 0) {
        throw errors[0];
      }

      results.push(...batchResults.filter(r => r !== null));
    }

    if (errors.length > 0 && !failFast) {
      console.warn(`${errors.length} tasks failed in batch generation`);
    }

    return results;
  }

  /**
   * Get current worker statistics
   */
  public getStats(): WorkerStats {
    return { ...this.stats };
  }

  /**
   * Gracefully shutdown all workers
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Wait for active tasks to complete or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    const terminationPromises = this.workers.map(worker => 
      worker.terminate().catch(error => 
        console.error('Error terminating worker:', error)
      )
    );

    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    
    this.emit('shutdown');
  }
}

export default MultiThreadedWikiGenerator;
