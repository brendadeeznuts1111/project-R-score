// duoplus/bun-native/worker-pool-executor.ts
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WorkerTask {
  id: string;
  type: 'RPA_MONITOR' | 'LOG_PARSER' | 'HEALTH_CHECK' | 'METRICS_COLLECTOR';
  data: any;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  timeout?: number;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  workerId: number;
}

export interface WorkerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  activeWorkers: number;
  queueSize: number;
}

export class BunWorkerPoolExecutor {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private busyWorkers: Set<number> = new Set();
  private maxWorkerThreads: number;
  private transferListEnabled: boolean;
  private taskResults: Map<string, WorkerResult> = new Map();
  private isRunning = false;

  constructor(options: {
    maxWorkerThreads?: number;
    transferListEnabled?: boolean;
  } = {}) {
    this.maxWorkerThreads = options.maxWorkerThreads ?? require('os').cpus().length;
    this.transferListEnabled = options.transferListEnabled ?? true;
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    console.log(`🚀 Initializing worker pool with ${this.maxWorkerThreads} threads`);
    
    for (let i = 0; i < this.maxWorkerThreads; i++) {
      const worker = new Worker(join(__dirname, 'worker-thread.js'), {
        transferList: this.transferListEnabled ? [] : undefined
      });
      
      worker.on('message', this.handleWorkerMessage.bind(this, i));
      worker.on('error', this.handleWorkerError.bind(this, i));
      worker.on('exit', this.handleWorkerExit.bind(this, i));
      
      this.workers.push(worker);
    }
    
    this.isRunning = true;
    this.startTaskProcessor();
  }

  /**
   * Submit a task to the worker pool
   */
  async submitTask(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      // Add promise handlers to the task
      (task as any).resolve = resolve;
      (task as any).reject = reject;
      
      // Add to queue based on priority
      this.insertTaskByPriority(task);
      
      // Try to process immediately
      this.processNextTask();
    });
  }

  /**
   * Submit multiple tasks in batch
   */
  async submitBatch(tasks: WorkerTask[]): Promise<WorkerResult[]> {
    const promises = tasks.map(task => this.submitTask(task));
    return Promise.all(promises);
  }

  /**
   * Insert task into queue based on priority
   */
  private insertTaskByPriority(task: WorkerTask): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const taskPriority = priorityOrder[task.priority];
    
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuePriority = priorityOrder[this.taskQueue[i].priority];
      if (taskPriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;
    
    // Find available worker
    const availableWorkerIndex = this.workers.findIndex((_, index) => 
      !this.busyWorkers.has(index)
    );
    
    if (availableWorkerIndex === -1) return; // No workers available
    
    const task = this.taskQueue.shift()!;
    this.busyWorkers.add(availableWorkerIndex);
    
    // Send task to worker
    const worker = this.workers[availableWorkerIndex];
    const startTime = Date.now();
    
    // Set timeout if specified
    let timeoutHandle: NodeJS.Timeout | null = null;
    if (task.timeout) {
      timeoutHandle = setTimeout(() => {
        this.handleTaskTimeout(availableWorkerIndex, task.id);
      }, task.timeout);
    }
    
    // Store task metadata
    this.taskResults.set(task.id, {
      taskId: task.id,
      success: false,
      processingTime: 0,
      workerId: availableWorkerIndex
    });
    
    try {
      worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data,
        startTime
      });
      
      // Store timeout handle for cleanup
      if (timeoutHandle) {
        (this.taskResults.get(task.id) as any).timeoutHandle = timeoutHandle;
      }
    } catch (error) {
      this.busyWorkers.delete(availableWorkerIndex);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      (task as any).reject(error);
    }
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerIndex: number, message: any): void {
    const { taskId, success, result, error, startTime } = message;
    const processingTime = Date.now() - startTime;
    
    // Clean up timeout
    const taskResult = this.taskResults.get(taskId);
    if (taskResult && (taskResult as any).timeoutHandle) {
      clearTimeout((taskResult as any).timeoutHandle);
    }
    
    // Update result
    const finalResult: WorkerResult = {
      taskId,
      success,
      result,
      error,
      processingTime,
      workerId: workerIndex
    };
    
    this.taskResults.set(taskId, finalResult);
    this.busyWorkers.delete(workerIndex);
    
    // Resolve/reject the original promise
    const task = this.findTaskInQueue(taskId);
    if (task) {
      if (success) {
        (task as any).resolve(finalResult);
      } else {
        (task as any).reject(new Error(error));
      }
    }
    
    // Process next task
    this.processNextTask();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerIndex: number, error: Error): void {
    console.error(`Worker ${workerIndex} error:`, error);
    this.busyWorkers.delete(workerIndex);
    
    // Restart worker
    this.restartWorker(workerIndex);
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(workerIndex: number, code: number): void {
    console.log(`Worker ${workerIndex} exited with code ${code}`);
    this.busyWorkers.delete(workerIndex);
    
    if (code !== 0) {
      // Restart worker if it crashed
      this.restartWorker(workerIndex);
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(workerIndex: number, taskId: string): void {
    console.log(`Task ${taskId} timed out on worker ${workerIndex}`);
    
    const task = this.findTaskInQueue(taskId);
    if (task) {
      (task as any).reject(new Error('Task timeout'));
    }
    
    this.busyWorkers.delete(workerIndex);
    
    // Terminate and restart worker
    this.workers[workerIndex].terminate();
    this.restartWorker(workerIndex);
  }

  /**
   * Restart a worker
   */
  private restartWorker(workerIndex: number): void {
    console.log(`Restarting worker ${workerIndex}`);
    
    const newWorker = new Worker(join(__dirname, 'worker-thread.js'), {
      transferList: this.transferListEnabled ? [] : undefined
    });
    
    newWorker.on('message', this.handleWorkerMessage.bind(this, workerIndex));
    newWorker.on('error', this.handleWorkerError.bind(this, workerIndex));
    newWorker.on('exit', this.handleWorkerExit.bind(this, workerIndex));
    
    this.workers[workerIndex] = newWorker;
  }

  /**
   * Find task in queue by ID
   */
  private findTaskInQueue(taskId: string): WorkerTask | null {
    return this.taskQueue.find(task => task.id === taskId) || null;
  }

  /**
   * Start continuous task processor
   */
  private startTaskProcessor(): void {
    setInterval(() => {
      this.processNextTask();
    }, 10); // Process every 10ms
  }

  /**
   * Get worker pool statistics
   */
  getStats(): WorkerStats {
    const completedTasks = Array.from(this.taskResults.values()).filter(r => r.success).length;
    const failedTasks = Array.from(this.taskResults.values()).filter(r => !r.success).length;
    const totalTasks = this.taskResults.size;
    
    const averageProcessingTime = totalTasks > 0 
      ? Array.from(this.taskResults.values()).reduce((sum, r) => sum + r.processingTime, 0) / totalTasks
      : 0;
    
    return {
      totalTasks,
      completedTasks,
      failedTasks,
      averageProcessingTime,
      activeWorkers: this.busyWorkers.size,
      queueSize: this.taskQueue.length
    };
  }

  /**
   * Shutdown worker pool
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down worker pool...');
    
    this.isRunning = false;
    
    // Wait for all current tasks to complete or timeout
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.busyWorkers.size > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Terminate all workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
    this.taskResults.clear();
    
    console.log('✅ Worker pool shutdown complete');
  }

  /**
   * Create specialized RPA monitoring task
   */
  async monitorRpaTask(phoneId: string, taskId: string): Promise<WorkerResult> {
    return this.submitTask({
      id: `monitor_${phoneId}_${taskId}_${Date.now()}`,
      type: 'RPA_MONITOR',
      data: { phoneId, taskId },
      priority: 'normal',
      createdAt: new Date(),
      timeout: 60000 // 1 minute timeout
    });
  }

  /**
   * Create log parsing task
   */
  async parseLogs(phoneId: string, logData: string[]): Promise<WorkerResult> {
    return this.submitTask({
      id: `parse_logs_${phoneId}_${Date.now()}`,
      type: 'LOG_PARSER',
      data: { phoneId, logData },
      priority: 'low',
      createdAt: new Date(),
      timeout: 30000 // 30 seconds timeout
    });
  }

  /**
   * Create health check task
   */
  async healthCheck(phoneIds: string[]): Promise<WorkerResult> {
    return this.submitTask({
      id: `health_check_${Date.now()}`,
      type: 'HEALTH_CHECK',
      data: { phoneIds },
      priority: 'high',
      createdAt: new Date(),
      timeout: 15000 // 15 seconds timeout
    });
  }

  /**
   * Create metrics collection task
   */
  async collectMetrics(timeRange: { start: Date; end: Date }): Promise<WorkerResult> {
    return this.submitTask({
      id: `metrics_${Date.now()}`,
      type: 'METRICS_COLLECTOR',
      data: { timeRange },
      priority: 'normal',
      createdAt: new Date(),
      timeout: 45000 // 45 seconds timeout
    });
  }
}
