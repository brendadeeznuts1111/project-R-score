/**
 * @fileoverview Worker Pool Manager
 * @description Efficient worker pool with task queue and lifecycle management
 * @module workers/pool
 * 
 * @see {@link https://bun.com/docs/runtime/workers Bun Workers Documentation}
 */

export interface WorkerOptions {
	smol?: boolean;
	name?: string;
	preload?: string[];
}

export interface PoolStats {
	totalWorkers: number;
	idleWorkers: number;
	busyWorkers: number;
	queuedTasks: number;
	activeTasks: number;
}

/**
 * Worker Pool Manager
 * 
 * Manages a pool of workers for parallel task execution with automatic
 * task queuing, worker lifecycle management, and error recovery.
 */
export class WorkerPool<T = any, R = any> {
	private workers: Worker[] = [];
	private idleWorkers: Worker[] = [];
	private taskQueue: Array<{
		task: T;
		resolve: (value: R) => void;
		reject: (error: any) => void;
		taskId: number;
	}> = [];
	private results = new Map<number, { resolve: Function; reject: Function }>();
	private taskId = 0;

	constructor(
		private workerScript: string,
		private poolSize: number = navigator.hardwareConcurrency || 4,
		private options: WorkerOptions = {}
	) {
		this.initializeWorkers();
	}

	private initializeWorkers() {
		for (let i = 0; i < this.poolSize; i++) {
			const worker = this.createWorker(`worker-${i}`);
			this.workers.push(worker);
			this.idleWorkers.push(worker);
		}
	}

	private createWorker(name: string): Worker {
		const worker = new Worker(this.workerScript, {
			...this.options,
			name: name,
		});

		worker.onmessage = (event) => {
			const { taskId, result, error } = event.data;
			const handlers = this.results.get(taskId);
			
			if (handlers) {
				if (error) {
					handlers.reject(new Error(error));
				} else {
					handlers.resolve(result);
				}
				this.results.delete(taskId);
			}
			
			// Return worker to idle pool
			this.idleWorkers.push(worker);
			this.processNextTask();
		};

		worker.onerror = (error) => {
			console.error(`Worker ${name} error:`, error);
			// Remove faulty worker and create a replacement
			const index = this.workers.indexOf(worker);
			if (index > -1) {
				worker.terminate();
				this.workers.splice(index, 1);
				this.idleWorkers = this.idleWorkers.filter(w => w !== worker);
				this.createReplacementWorker();
			}
		};

		return worker;
	}

	private createReplacementWorker() {
		const newWorker = this.createWorker(`worker-replacement-${this.workers.length}`);
		this.workers.push(newWorker);
		this.idleWorkers.push(newWorker);
	}

	/**
	 * Execute a single task in the worker pool
	 */
	public async execute(task: T): Promise<R> {
		return new Promise((resolve, reject) => {
			const taskId = ++this.taskId;
			this.results.set(taskId, { resolve, reject });
			this.taskQueue.push({ task, resolve, reject, taskId });
			this.processNextTask();
		});
	}

	private processNextTask() {
		if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) return;

		const { task, taskId } = this.taskQueue.shift()!;
		const worker = this.idleWorkers.shift()!;
		
		worker.postMessage({ taskId, task });
	}

	/**
	 * Execute multiple tasks in parallel
	 * 
	 * @param tasks - Array of tasks to execute
	 * @param concurrency - Optional concurrency limit (defaults to pool size)
	 */
	public async map(tasks: T[], concurrency?: number): Promise<R[]> {
		if (concurrency) {
			const batchSize = Math.ceil(tasks.length / concurrency);
			const results: R[] = [];
			
			for (let i = 0; i < tasks.length; i += batchSize) {
				const batch = tasks.slice(i, i + batchSize);
				const batchResults = await Promise.all(batch.map(task => this.execute(task)));
				results.push(...batchResults);
			}
			
			return results;
		}
		
		return Promise.all(tasks.map(task => this.execute(task)));
	}

	/**
	 * Get current pool statistics
	 */
	public getStats(): PoolStats {
		return {
			totalWorkers: this.workers.length,
			idleWorkers: this.idleWorkers.length,
			busyWorkers: this.workers.length - this.idleWorkers.length,
			queuedTasks: this.taskQueue.length,
			activeTasks: this.results.size
		};
	}

	/**
	 * Terminate all workers and clear the pool
	 */
	public terminate() {
		this.workers.forEach(worker => worker.terminate());
		this.workers = [];
		this.idleWorkers = [];
		this.taskQueue = [];
		this.results.clear();
	}
}
