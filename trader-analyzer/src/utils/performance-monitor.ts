/**
 * @fileoverview Simple Performance Monitor
 * @description Lightweight performance monitoring with decorator functions
 * @module utils/performance-monitor
 * 
 * A simpler alternative to the enterprise PerformanceMonitor, focused on
 * function wrapping and basic metrics tracking.
 */

interface Metric {
	count: number;
	totalDuration: bigint;
	minDuration: bigint;
	maxDuration: bigint;
	lastCall: number;
}

interface FormattedMetric {
	Operation: string;
	Calls: number;
	'Total Time': string;
	Average: string;
	Min: string;
	Max: string;
	'Last Call': string;
}

/**
 * Simple Performance Monitor
 * 
 * Lightweight performance monitoring with decorator functions for easy
 * function wrapping. Uses Bun.nanoseconds() for high-resolution timing.
 * 
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 * 
 * const expensiveOp = monitor.withPerformance('Expensive Calculation', (a: number, b: number) => {
 *   let result = 0;
 *   for (let i = 0; i < 1000000; i++) {
 *     result += Math.sqrt(a * i) * Math.sin(b * i);
 *   }
 *   return result;
 * });
 * 
 * expensiveOp(5, 10);
 * console.log(monitor.formatMetrics());
 * ```
 */
export class PerformanceMonitor {
	private metrics = new Map<string, Metric>();
	private static instance: PerformanceMonitor | null = null;

	/**
	 * Get singleton instance
	 */
	static getInstance(): PerformanceMonitor {
		if (!this.instance) {
			this.instance = new PerformanceMonitor();
		}
		return this.instance;
	}

	/**
	 * Measure a synchronous function
	 */
	measure<T>(label: string, fn: () => T): T {
		const start = Bun.nanoseconds();
		try {
			return fn();
		} finally {
			const end = Bun.nanoseconds();
			this.recordMeasurement(label, end - start);
		}
	}

	/**
	 * Measure an asynchronous function
	 */
	async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
		const start = Bun.nanoseconds();
		try {
			return await fn();
		} finally {
			const end = Bun.nanoseconds();
			this.recordMeasurement(label, end - start);
		}
	}

	/**
	 * Record a measurement
	 */
	private recordMeasurement(label: string, duration: bigint): void {
		const existing = this.metrics.get(label);
		
		if (!existing) {
			this.metrics.set(label, {
				count: 1,
				totalDuration: duration,
				minDuration: duration,
				maxDuration: duration,
				lastCall: Date.now()
			});
			return;
		}

		existing.count++;
		existing.totalDuration = existing.totalDuration + duration;
		existing.minDuration = duration < existing.minDuration ? duration : existing.minDuration;
		existing.maxDuration = duration > existing.maxDuration ? duration : existing.maxDuration;
		existing.lastCall = Date.now();
	}

	/**
	 * Get metrics for a specific operation or all operations
	 */
	getMetrics(label?: string) {
		if (label) {
			const metric = this.metrics.get(label);
			if (!metric) return null;

			const timeSinceLastCall = Date.now() - metric.lastCall;
			const timeWindowSeconds = Math.max(timeSinceLastCall / 1000, 1); // At least 1 second

			return {
				label,
				...metric,
				avgDuration: Number(metric.totalDuration) / metric.count,
				callsPerSecond: metric.count / timeWindowSeconds
			};
		}

		return Array.from(this.metrics.entries()).map(([label, metric]) => ({
			label,
			...metric,
			avgDuration: Number(metric.totalDuration) / metric.count
		}));
	}

	/**
	 * Format metrics as a table using Bun.inspect.table()
	 */
	formatMetrics(): string {
		const metrics = this.getMetrics() as Array<{
			label: string;
			count: number;
			totalDuration: bigint;
			minDuration: bigint;
			maxDuration: bigint;
			avgDuration: number;
			lastCall: number;
		}>;

		if (metrics.length === 0) {
			return 'No performance metrics available.';
		}

		const summary: FormattedMetric[] = metrics.map(m => {
			const timeSinceLastCall = Date.now() - m.lastCall;
			const secondsAgo = Math.floor(timeSinceLastCall / 1000);

			return {
				Operation: m.label,
				Calls: m.count,
				'Total Time': `${(Number(m.totalDuration) / 1_000_000_000).toFixed(3)}s`,
				Average: `${(m.avgDuration / 1_000_000).toFixed(3)}ms`,
				Min: `${(Number(m.minDuration) / 1_000_000).toFixed(3)}ms`,
				Max: `${(Number(m.maxDuration) / 1_000_000).toFixed(3)}ms`,
				'Last Call': secondsAgo < 60 
					? `${secondsAgo}s ago` 
					: `${Math.floor(secondsAgo / 60)}m ago`
			};
		});

		// Sort by total time descending
		summary.sort((a, b) => {
			const aTime = parseFloat(a['Total Time'].replace('s', ''));
			const bTime = parseFloat(b['Total Time'].replace('s', ''));
			return bTime - aTime;
		});

		return Bun.inspect.table(summary, {
			colors: true,
			sort: 'Total Time',
			title: 'Performance Metrics'
		});
	}

	/**
	 * Reset metrics for a specific operation or all operations
	 */
	reset(label?: string) {
		if (label) {
			this.metrics.delete(label);
		} else {
			this.metrics.clear();
		}
	}
}

/**
 * Wrap a synchronous function with performance monitoring
 * 
 * @example
 * ```typescript
 * const expensiveOperation = withPerformance('Expensive Calculation', (a: number, b: number) => {
 *   let result = 0;
 *   for (let i = 0; i < 1000000; i++) {
 *     result += Math.sqrt(a * i) * Math.sin(b * i);
 *   }
 *   return result;
 * });
 * 
 * expensiveOperation(5, 10);
 * ```
 */
export function withPerformance<T extends (...args: any[]) => any>(
	label: string,
	fn: T
): (...args: Parameters<T>) => ReturnType<T> {
	const monitor = PerformanceMonitor.getInstance();

	return function(this: any, ...args: Parameters<T>): ReturnType<T> {
		return monitor.measure(label, () => fn.apply(this, args));
	};
}

/**
 * Wrap an asynchronous function with performance monitoring
 * 
 * @example
 * ```typescript
 * const asyncOperation = withAsyncPerformance('Async Task', async (url: string) => {
 *   await Bun.sleep(100);
 *   return fetch(url);
 * });
 * 
 * await asyncOperation('https://example.com');
 * ```
 */
export function withAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
	label: string,
	fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	const monitor = PerformanceMonitor.getInstance();

	return async function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
		return monitor.measureAsync(label, () => fn.apply(this, args));
	};
}

/**
 * Default performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
