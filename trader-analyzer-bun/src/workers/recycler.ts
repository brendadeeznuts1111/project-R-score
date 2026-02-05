/**
 * @fileoverview Worker Recycler
 * @description Automatic worker recycling and lifecycle management
 * @module workers/recycler
 */

interface WorkerInfo {
	lastUsed: number;
	taskCount: number;
	memoryUsage: number;
}

/**
 * Worker Recycler
 * 
 * Automatically recycles idle workers and manages memory usage
 * to prevent resource leaks and optimize performance.
 */
export class WorkerRecycler {
	private activeWorkers = new Map<Worker, WorkerInfo>();
	private maxWorkers: number;
	private maxMemory: number;
	private recycleInterval: Timer | null = null;
	private workerScript: string;

	constructor(
		workerScript: string,
		maxWorkers: number = 10,
		maxMemoryMB: number = 100
	) {
		this.workerScript = workerScript;
		this.maxWorkers = maxWorkers;
		this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
		this.startRecycleMonitor();
	}

	private startRecycleMonitor() {
		this.recycleInterval = setInterval(() => {
			this.recycleIdleWorkers();
		}, 60000); // Check every minute
	}

	private async recycleIdleWorkers() {
		const now = Date.now();
		const idleTimeout = 5 * 60 * 1000; // 5 minutes
		
		for (const [worker, info] of this.activeWorkers.entries()) {
			const idleTime = now - info.lastUsed;
			
			if (idleTime > idleTimeout) {
				console.log(`Recycling idle worker (idle for ${Math.floor(idleTime / 1000)}s)`);
				worker.terminate();
				this.activeWorkers.delete(worker);
			}
		}
		
		// Check memory usage
		await this.checkMemoryUsage();
	}

	private async checkMemoryUsage() {
		let totalMemory = 0;
		
		for (const info of this.activeWorkers.values()) {
			totalMemory += info.memoryUsage;
		}
		
		if (totalMemory > this.maxMemory) {
			console.log(`High memory usage: ${Math.round(totalMemory / 1024 / 1024)}MB`);
			// Terminate oldest workers
			const sorted = Array.from(this.activeWorkers.entries())
				.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
			
			for (const [worker] of sorted.slice(0, Math.floor(sorted.length / 2))) {
				worker.terminate();
				this.activeWorkers.delete(worker);
			}
		}
	}

	/**
	 * Acquire a worker from the pool
	 */
	async acquireWorker(): Promise<Worker> {
		// Try to find an idle worker
		for (const [worker, info] of this.activeWorkers.entries()) {
			if (info.taskCount === 0) {
				info.taskCount++;
				info.lastUsed = Date.now();
				return worker;
			}
		}
		
		// Create new worker if under limit
		if (this.activeWorkers.size < this.maxWorkers) {
			const worker = new Worker(this.workerScript, {
				smol: true // Use smol mode for new workers
			});
			
			this.activeWorkers.set(worker, {
				lastUsed: Date.now(),
				taskCount: 1,
				memoryUsage: 0
			});
			
			// Monitor memory usage
			worker.addEventListener('message', (event) => {
				if (event.data?.type === 'memoryReport') {
					const info = this.activeWorkers.get(worker);
					if (info) {
						info.memoryUsage = event.data.memory;
					}
				}
			});
			
			return worker;
		}
		
		// Wait for a worker to become available
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				for (const [worker, info] of this.activeWorkers.entries()) {
					if (info.taskCount === 0) {
						clearInterval(checkInterval);
						info.taskCount++;
						info.lastUsed = Date.now();
						resolve(worker);
						return;
					}
				}
			}, 100);
		});
	}

	/**
	 * Release a worker back to the pool
	 */
	releaseWorker(worker: Worker) {
		const info = this.activeWorkers.get(worker);
		if (info) {
			info.taskCount = Math.max(0, info.taskCount - 1);
			info.lastUsed = Date.now();
		}
	}

	/**
	 * Terminate all workers and stop monitoring
	 */
	terminateAll() {
		if (this.recycleInterval) {
			clearInterval(this.recycleInterval);
			this.recycleInterval = null;
		}
		for (const [worker] of this.activeWorkers.entries()) {
			worker.terminate();
		}
		this.activeWorkers.clear();
	}

	/**
	 * Get current pool statistics
	 */
	getStats() {
		return {
			totalWorkers: this.activeWorkers.size,
			idleWorkers: Array.from(this.activeWorkers.values()).filter(w => w.taskCount === 0).length,
			busyWorkers: Array.from(this.activeWorkers.values()).filter(w => w.taskCount > 0).length,
			totalMemory: Array.from(this.activeWorkers.values()).reduce((sum, w) => sum + w.memoryUsage, 0)
		};
	}
}
