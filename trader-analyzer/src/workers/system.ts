/**
 * @fileoverview Complete Worker System
 * @description Integrated worker system with pool, health monitoring, and environment management
 * @module workers/system
 */

import { WorkerPool } from './pool';
import { WorkerMessageBroker } from './message-broker';
import { WorkerHealthMonitor } from './health';
import { EnvironmentManager } from './environment';

export interface WorkerSystemOptions {
	enableHealthChecks?: boolean;
	memoryLimitMB?: number;
	timeoutMs?: number;
}

/**
 * Complete Worker System
 * 
 * Integrated worker system combining pool management, health monitoring,
 * environment sharing, and error handling.
 */
export class WorkerSystem {
	private pool: WorkerPool;
	private broker: WorkerMessageBroker | null = null;
	private healthMonitor: WorkerHealthMonitor | null = null;
	private mainWorker: Worker | null = null;
	
	constructor(
		workerScript: string,
		poolSize: number = 4,
		private options: WorkerSystemOptions = {}
	) {
		// Initialize environment
		EnvironmentManager.initialize({
			maxRetries: 3,
			timeout: options.timeoutMs || 30000
		});
		
		// Create worker pool
		this.pool = new WorkerPool(workerScript, poolSize, {
			smol: options.memoryLimitMB ? true : false
		});
		
		// Setup health monitoring
		if (options.enableHealthChecks) {
			this.healthMonitor = new WorkerHealthMonitor();
			// Note: Would need access to pool's workers
			// This is a simplified version
		}
	}
	
	/**
	 * Process a task using the worker pool
	 */
	async processTask<T, R>(task: T): Promise<R> {
		const startTime = Date.now();
		
		try {
			const result = await this.pool.execute<T, R>(task);
			
			if (this.healthMonitor && this.mainWorker) {
				this.healthMonitor.recordTask(this.mainWorker, startTime, true);
			}
			
			return result;
		} catch (error) {
			if (this.healthMonitor && this.mainWorker) {
				this.healthMonitor.recordTask(this.mainWorker, startTime, false);
			}
			
			// Retry logic
			return this.retryTask(task, error as Error);
		}
	}
	
	private async retryTask<T, R>(task: T, error: Error, attempt: number = 1): Promise<R> {
		const maxRetries = EnvironmentManager.getConfig<number>('maxRetries') || 3;
		
		if (attempt >= maxRetries) {
			throw error;
		}
		
		// Exponential backoff
		const delay = Math.pow(2, attempt) * 100;
		await Bun.sleep(delay);
		
		console.log(`Retrying task (attempt ${attempt + 1}/${maxRetries})`);
		
		return this.processTask(task);
	}
	
	/**
	 * Process multiple tasks in parallel
	 */
	async processBatch<T, R>(tasks: T[]): Promise<R[]> {
		return this.pool.map(tasks);
	}
	
	/**
	 * Broadcast message to all workers
	 */
	async broadcast(message: any) {
		// This would require access to pool's workers
		// Simplified version - in production would iterate through workers
		console.log('Broadcasting message:', message);
	}
	
	/**
	 * Get system metrics
	 */
	getMetrics() {
		const poolStats = this.pool.getStats();
		const healthMetrics = this.healthMonitor?.getMetrics();
		
		return {
			pool: poolStats,
			health: healthMetrics,
			environment: {
				config: EnvironmentManager.getConfig(),
				cacheSize: EnvironmentManager.getCache().size
			},
			system: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				isMainThread: typeof Bun !== 'undefined' && Bun.isMainThread !== undefined 
					? Bun.isMainThread 
					: true
			}
		};
	}
	
	/**
	 * Graceful shutdown
	 */
	shutdown() {
		this.pool.terminate();
		if (this.healthMonitor) {
			this.healthMonitor.cleanup();
		}
	}
}
