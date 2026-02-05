/**
 * @fileoverview NEXUS Gateway Router - Priority-Aware Request Routing with Worker Pools
 * @description Industrial-grade gateway with AI evolution role-based worker pools
 * @module gateway
 */

import type { ArbitrageOpportunity, MarketCategory } from '../arbitrage/types';
import { globalPatternRegistry } from '../patterns';
import { colors, formatDuration } from '../utils';

/**
 * Worker pool roles based on AI evolution levels
 */
export enum WorkerRole {
  SCOUT = 'scout',       // Fast, lightweight scanning
  SENTINEL = 'sentinel', // Balanced monitoring and alerting
  KING = 'king',         // Heavy computation and analysis
}

/**
 * Worker pool configuration
 */
interface WorkerPoolConfig {
  role: WorkerRole;
  minWorkers: number;
  maxWorkers: number;
  taskTimeout: number; // ms
  priority: number; // Higher = more important
}

/**
 * Worker task types
 */
export enum TaskType {
  PATTERN_EXECUTION = 'pattern_execution',
  MARKET_ANALYSIS = 'market_analysis',
  ARBITRAGE_SCAN = 'arbitrage_scan',
  DATA_PROCESSING = 'data_processing',
  ALERT_PROCESSING = 'alert_processing',
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  CRITICAL = 5,  // Immediate execution required
  HIGH = 4,      // Execute within seconds
  MEDIUM = 3,    // Execute within minutes
  LOW = 2,       // Execute when resources available
  BACKGROUND = 1,// Execute during idle time
}

/**
 * Gateway task definition
 */
export interface GatewayTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  data: any;
  createdAt: number;
  timeout?: number;
  retries: number;
  maxRetries: number;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  workerRole: WorkerRole;
}

/**
 * Worker pool statistics
 */
interface PoolStats {
  role: WorkerRole;
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
}

/**
 * NEXUS Gateway Router - Priority-aware worker pool management
 *
 * Features:
 * - Role-based worker pools (Scout/Sentinel/King)
 * - Priority queue with deadline scheduling
 * - Automatic scaling based on load
 * - Circuit breaker pattern for reliability
 * - Performance monitoring and metrics
 */
export class GatewayRouter {
  private pools = new Map<WorkerRole, WorkerPool>();
  private taskQueue: GatewayTask[] = [];
  private processingTasks = new Set<string>();
  private results = new Map<string, TaskResult>();
  private eventListeners: Array<(event: string, data: any) => void> = [];

  // Circuit breaker state
  private circuitBreaker = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed' as 'closed' | 'open' | 'half-open',
  };

  constructor() {
    this.initializePools();
    this.startTaskProcessor();
  }

  /**
   * Initialize worker pools for each role
   */
  private initializePools(): void {
    const configs: WorkerPoolConfig[] = [
      {
        role: WorkerRole.SCOUT,
        minWorkers: 5,
        maxWorkers: 20,
        taskTimeout: 5000, // 5 seconds
        priority: 1,
      },
      {
        role: WorkerRole.SENTINEL,
        minWorkers: 3,
        maxWorkers: 10,
        taskTimeout: 30000, // 30 seconds
        priority: 2,
      },
      {
        role: WorkerRole.KING,
        minWorkers: 1,
        maxWorkers: 5,
        taskTimeout: 120000, // 2 minutes
        priority: 3,
      },
    ];

    for (const config of configs) {
      this.pools.set(config.role, new WorkerPool(config, this));
    }
  }

  /**
   * Submit task to appropriate worker pool
   */
  async submitTask(task: Omit<GatewayTask, 'id' | 'createdAt' | 'retries'>): Promise<string> {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() - this.circuitBreaker.lastFailureTime > 60000) { // 1 minute timeout
        this.circuitBreaker.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    const fullTask: GatewayTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    // Route task to appropriate pool
    const targetPool = this.routeTask(fullTask);

    if (!targetPool) {
      throw new Error(`No suitable worker pool found for task type: ${task.type}`);
    }

    // Add to queue
    this.taskQueue.push(fullTask);
    this.sortTaskQueue();

    this.emit('task_submitted', { taskId: fullTask.id, pool: targetPool.config.role });

    return fullTask.id;
  }

  /**
   * Get task result (async)
   */
  async getTaskResult(taskId: string, timeout = 30000): Promise<TaskResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = this.results.get(taskId);
      if (result) {
        this.results.delete(taskId); // Clean up
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Task ${taskId} timed out`);
  }

  /**
   * Route task to appropriate worker pool based on type and priority
   */
  private routeTask(task: GatewayTask): WorkerPool | null {
    // Route based on task type and priority
    switch (task.type) {
      case TaskType.ARBITRAGE_SCAN:
        return task.priority >= TaskPriority.HIGH
          ? this.pools.get(WorkerRole.KING) || null
          : this.pools.get(WorkerRole.SENTINEL) || null;

      case TaskType.PATTERN_EXECUTION:
        return this.pools.get(WorkerRole.SCOUT) || null;

      case TaskType.MARKET_ANALYSIS:
        return task.priority >= TaskPriority.MEDIUM
          ? this.pools.get(WorkerRole.SENTINEL) || null
          : this.pools.get(WorkerRole.SCOUT) || null;

      case TaskType.DATA_PROCESSING:
        return this.pools.get(WorkerRole.KING) || null;

      case TaskType.ALERT_PROCESSING:
        return this.pools.get(WorkerRole.SCOUT) || null; // Fast alerts

      default:
        return this.pools.get(WorkerRole.SCOUT) || null;
    }
  }

  /**
   * Sort task queue by priority and age
   */
  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Older tasks first (FIFO within priority)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Start task processing loop
   */
  private startTaskProcessor(): void {
    setInterval(() => {
      this.processTaskQueue();
    }, 100); // Process every 100ms
  }

  /**
   * Process queued tasks
   */
  private async processTaskQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Find available pools and assign tasks
    for (const [role, pool] of this.pools) {
      if (pool.canAcceptTask()) {
        // Find suitable task for this pool
        const taskIndex = this.taskQueue.findIndex(task => {
          const targetPool = this.routeTask(task);
          return targetPool?.config.role === role && !this.processingTasks.has(task.id);
        });

        if (taskIndex >= 0) {
          const task = this.taskQueue.splice(taskIndex, 1)[0];
          this.processingTasks.add(task.id);

          // Assign to pool
          pool.processTask(task).catch(error => {
            console.error(`Task ${task.id} failed in pool ${role}:`, error);
            this.handleTaskFailure(task, error);
          });
        }
      }
    }
  }

  /**
   * Handle task completion
   */
  handleTaskCompletion(result: TaskResult): void {
    this.results.set(result.taskId, result);
    this.processingTasks.delete(result.taskId);

    // Update circuit breaker
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failures = 0;
    }

    this.emit('task_completed', result);
  }

  /**
   * Handle task failure
   */
  private handleTaskFailure(task: GatewayTask, error: Error): void {
    this.processingTasks.delete(task.id);

    // Update circuit breaker
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= 5) {
      this.circuitBreaker.state = 'open';
      console.warn('Circuit breaker opened due to repeated failures');
    }

    // Retry logic
    if (task.retries < task.maxRetries) {
      task.retries++;
      task.createdAt = Date.now(); // Reset age for retry
      this.taskQueue.push(task);
      this.sortTaskQueue();

      this.emit('task_retried', { taskId: task.id, retryCount: task.retries });
    } else {
      // Final failure
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        error: error.message,
        executionTime: 0,
        workerRole: WorkerRole.SCOUT, // Default
      };

      this.results.set(task.id, result);
      this.emit('task_failed', result);
    }
  }

  /**
   * Get router statistics
   */
  getStats(): {
    pools: PoolStats[];
    queueLength: number;
    processingCount: number;
    circuitBreaker: typeof this.circuitBreaker;
    totalTasks: number;
  } {
    const pools: PoolStats[] = [];

    for (const [role, pool] of this.pools) {
      pools.push(pool.getStats());
    }

    return {
      pools,
      queueLength: this.taskQueue.length,
      processingCount: this.processingTasks.size,
      circuitBreaker: { ...this.circuitBreaker },
      totalTasks: this.results.size + this.processingTasks.size + this.taskQueue.length,
    };
  }

  /**
   * Event system for monitoring
   */
  on(event: string, listener: (event: string, data: any) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  private emit(event: string, data: any): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Gateway Router...');

    // Wait for processing tasks to complete
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.processingTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Waiting for ${this.processingTasks.size} tasks to complete...`);
    }

    // Force shutdown remaining tasks
    for (const pool of this.pools.values()) {
      pool.shutdown();
    }

    console.log('Gateway Router shutdown complete');
  }
}

/**
 * Worker pool implementation
 */
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: GatewayTask[] = [];
  private stats = {
    completedTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
  };

  constructor(
    public config: WorkerPoolConfig,
    private router: GatewayRouter
  ) {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(this.config.role);
    this.workers.push(worker);
    this.availableWorkers.push(worker);
    return worker;
  }

  canAcceptTask(): boolean {
    return this.availableWorkers.length > 0 || this.workers.length < this.config.maxWorkers;
  }

  async processTask(task: GatewayTask): Promise<void> {
    let worker: Worker;

    if (this.availableWorkers.length > 0) {
      worker = this.availableWorkers.pop()!;
    } else if (this.workers.length < this.config.maxWorkers) {
      worker = this.createWorker();
    } else {
      // Should not happen due to canAcceptTask check
      throw new Error('No available workers');
    }

    const startTime = performance.now();

    try {
      const result = await worker.executeTask(task);
      const executionTime = performance.now() - startTime;

      // Update stats
      this.stats.completedTasks++;
      this.stats.avgExecutionTime =
        (this.stats.avgExecutionTime * (this.stats.completedTasks - 1) + executionTime) / this.stats.completedTasks;

      this.router.handleTaskCompletion({
        taskId: task.id,
        success: true,
        data: result,
        executionTime,
        workerRole: this.config.role,
      });

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.stats.failedTasks++;

      this.router.handleTaskCompletion({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        workerRole: this.config.role,
      });

    } finally {
      // Return worker to pool
      this.availableWorkers.push(worker);
    }
  }

  getStats(): PoolStats {
    return {
      role: this.config.role,
      activeWorkers: this.workers.length - this.availableWorkers.length,
      idleWorkers: this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      avgExecutionTime: this.stats.avgExecutionTime,
    };
  }

  shutdown(): void {
    // In a real implementation, we'd gracefully shutdown workers
    this.workers.length = 0;
    this.availableWorkers.length = 0;
  }
}

/**
 * Worker implementation (simplified for demo)
 */
class Worker {
  constructor(private role: WorkerRole) {}

  async executeTask(task: GatewayTask): Promise<any> {
    // Simulate different execution times based on role
    const baseTime = {
      [WorkerRole.SCOUT]: 50,      // Fast
      [WorkerRole.SENTINEL]: 200,  // Medium
      [WorkerRole.KING]: 1000,     // Slow but powerful
    }[this.role] || 100;

    const executionTime = baseTime + Math.random() * baseTime;

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, executionTime));

    // Execute based on task type
    switch (task.type) {
      case TaskType.ARBITRAGE_SCAN:
        return this.executeArbitrageScan(task.data);

      case TaskType.PATTERN_EXECUTION:
        return this.executePattern(task.data);

      case TaskType.MARKET_ANALYSIS:
        return this.executeMarketAnalysis(task.data);

      default:
        return { message: `Task executed by ${this.role} worker` };
    }
  }

  private executeArbitrageScan(data: any): any {
    // Simulate arbitrage scanning
    return {
      opportunities: Math.floor(Math.random() * 5),
      scanTime: Math.random() * 1000,
      markets: data.markets || [],
    };
  }

  private executePattern(data: any): any {
    // Simulate pattern execution
    return globalPatternRegistry.executePatterns(data);
  }

  private executeMarketAnalysis(data: any): any {
    // Simulate market analysis
    return {
      trends: ['bullish', 'bearish', 'sideways'][Math.floor(Math.random() * 3)],
      volatility: Math.random(),
      volume: Math.random() * 1000000,
    };
  }
}

/**
 * Global gateway router instance
 */
export const globalGatewayRouter = new GatewayRouter();

/**
 * Create a new gateway router
 */
export function createGatewayRouter(): GatewayRouter {
  return new GatewayRouter();
}