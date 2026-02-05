/**
 * @fileoverview Worker Health Monitor
 * @description Health monitoring and automatic worker restart
 * @module workers/health
 */

interface WorkerStats {
	startTime: number;
	taskCount: number;
	errorCount: number;
	avgResponseTime: number;
	lastHeartbeat: number;
	isHealthy: boolean;
}

interface HealthMetrics {
	totalTasks: number;
	successfulTasks: number;
	failedTasks: number;
	totalResponseTime: number;
	activeWorkers: number;
	healthyWorkers: number;
	avgTaskTime: number;
	successRate: number;
}

/**
 * Worker Health Monitor
 * 
 * Monitors worker health, tracks metrics, and automatically
 * restarts unhealthy workers.
 */
export class WorkerHealthMonitor {
	private workers = new Map<Worker, WorkerStats>();
	private heartbeatIntervals = new Map<Worker, Timer>();
	
	private metrics: {
		totalTasks: number;
		successfulTasks: number;
		failedTasks: number;
		totalResponseTime: number;
	} = {
		totalTasks: 0,
		successfulTasks: 0,
		failedTasks: 0,
		totalResponseTime: 0
	};

	constructor(private checkInterval: number = 30000) {
		this.startHealthChecks();
	}

	private startHealthChecks() {
		setInterval(() => {
			this.checkWorkerHealth();
		}, this.checkInterval);
	}

	private checkWorkerHealth() {
		const now = Date.now();
		const heartbeatTimeout = 60000; // 1 minute

		for (const [worker, stats] of this.workers.entries()) {
			// Check heartbeat
			if (now - stats.lastHeartbeat > heartbeatTimeout) {
				console.warn(`Worker ${(worker as any).name || 'unknown'} unresponsive, restarting...`);
				this.restartWorker(worker);
				continue;
			}

			// Check error rate
			const errorRate = stats.errorCount / Math.max(stats.taskCount, 1);
			if (errorRate > 0.5) { // 50% error rate
				console.warn(`Worker ${(worker as any).name || 'unknown'} has high error rate: ${(errorRate * 100).toFixed(1)}%`);
				stats.isHealthy = false;
			}

			// Check response time
			if (stats.avgResponseTime > 10000) { // 10 seconds average
				console.warn(`Worker ${(worker as any).name || 'unknown'} has slow response time: ${stats.avgResponseTime}ms`);
				stats.isHealthy = false;
			}
		}
	}

	private restartWorker(worker: Worker) {
		const oldStats = this.workers.get(worker);
		const scriptURL = (worker as any).scriptURL || (worker as any).url;
		
		// Clean up
		const interval = this.heartbeatIntervals.get(worker);
		if (interval) {
			clearInterval(interval);
			this.heartbeatIntervals.delete(worker);
		}
		
		worker.terminate();
		
		// Create replacement worker
		if (scriptURL) {
			const newWorker = new Worker(scriptURL, {
				name: (worker as any).name,
				smol: true
			});
			
			this.workers.delete(worker);
			this.registerWorker(newWorker);
		} else {
			this.workers.delete(worker);
		}
	}

	/**
	 * Register a worker for health monitoring
	 */
	registerWorker(worker: Worker) {
		this.workers.set(worker, {
			startTime: Date.now(),
			taskCount: 0,
			errorCount: 0,
			avgResponseTime: 0,
			lastHeartbeat: Date.now(),
			isHealthy: true
		});

		// Setup heartbeat
		const heartbeatInterval = setInterval(() => {
			const stats = this.workers.get(worker);
			if (stats) {
				stats.lastHeartbeat = Date.now();
				worker.postMessage({ type: 'heartbeat' });
			}
		}, 10000);

		this.heartbeatIntervals.set(worker, heartbeatInterval);

		// Listen for responses
		worker.addEventListener('message', (event) => {
			const stats = this.workers.get(worker);
			if (stats && event.data?.type === 'heartbeatResponse') {
				stats.lastHeartbeat = Date.now();
			}
		});

		worker.addEventListener('error', () => {
			const stats = this.workers.get(worker);
			if (stats) {
				stats.errorCount++;
				stats.isHealthy = false;
			}
		});
	}

	/**
	 * Record a task execution
	 */
	recordTask(worker: Worker, startTime: number, success: boolean) {
		const stats = this.workers.get(worker);
		if (stats) {
			stats.taskCount++;
			if (!success) stats.errorCount++;
			
			const responseTime = Date.now() - startTime;
			stats.avgResponseTime = 
				(stats.avgResponseTime * (stats.taskCount - 1) + responseTime) / stats.taskCount;
		}

		this.metrics.totalTasks++;
		if (success) {
			this.metrics.successfulTasks++;
		} else {
			this.metrics.failedTasks++;
		}
		this.metrics.totalResponseTime += Date.now() - startTime;
	}

	/**
	 * Get current health metrics
	 */
	getMetrics(): HealthMetrics {
		return {
			...this.metrics,
			activeWorkers: this.workers.size,
			healthyWorkers: Array.from(this.workers.values()).filter(w => w.isHealthy).length,
			avgTaskTime: this.metrics.totalTasks > 0 
				? this.metrics.totalResponseTime / this.metrics.totalTasks 
				: 0,
			successRate: this.metrics.totalTasks > 0
				? this.metrics.successfulTasks / this.metrics.totalTasks
				: 1
		};
	}

	/**
	 * Clean up all monitoring
	 */
	cleanup() {
		for (const [worker, interval] of this.heartbeatIntervals.entries()) {
			clearInterval(interval);
		}
		this.heartbeatIntervals.clear();
		this.workers.clear();
	}
}
