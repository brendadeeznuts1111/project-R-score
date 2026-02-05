/**
 * @fileoverview Thread Utilities
 * @description Thread detection and thread-local storage utilities
 * @module workers/thread-utils
 */

/**
 * Thread Utilities
 * 
 * Provides utilities for thread detection, thread-local storage,
 * and performance measurement in worker contexts.
 */
export class ThreadUtils {
	static isMainThread = typeof Bun !== 'undefined' && Bun.isMainThread !== undefined 
		? Bun.isMainThread 
		: true; // Fallback for environments without Bun.isMainThread
	
	static threadId = Math.random().toString(36).substr(2, 9);
	
	/**
	 * Get thread information
	 */
	static getThreadInfo() {
		return {
			isMainThread: this.isMainThread,
			threadId: this.threadId,
			pid: process.pid,
			memory: process.memoryUsage(),
			uptime: process.uptime()
		};
	}
	
	/**
	 * Run code in a worker thread
	 */
	static async runInWorker<T>(script: string, data: any): Promise<T> {
		if (!this.isMainThread) {
			throw new Error('Cannot spawn workers from worker threads');
		}
		
		return new Promise((resolve, reject) => {
			const worker = new Worker(script, {
				smol: true
			});
			
			worker.onmessage = (event) => {
				if (event.data.type === 'result') {
					resolve(event.data.result);
					worker.terminate();
				} else if (event.data.type === 'error') {
					reject(new Error(event.data.error));
					worker.terminate();
				}
			};
			
			worker.onerror = (error) => {
				reject(error);
				worker.terminate();
			};
			
			worker.postMessage(data);
		});
	}
	
	/**
	 * Create thread-local storage
	 */
	static createThreadLocal<T>(initialValue: T): () => T {
		const store = new Map<string, T>();
		
		return () => {
			if (!store.has(this.threadId)) {
				store.set(this.threadId, initialValue);
			}
			return store.get(this.threadId)!;
		};
	}
	
	/**
	 * Measure thread performance
	 */
	static measureThreadPerformance(label: string, fn: () => any) {
		const startMemory = process.memoryUsage();
		const startTime = Bun.nanoseconds();
		
		const result = fn();
		
		const endTime = Bun.nanoseconds();
		const endMemory = process.memoryUsage();
		
		const duration = (endTime - startTime) / 1_000_000; // ms
		const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
		
		console.log(`[Thread ${this.threadId}] ${label}:`);
		console.log(`  Duration: ${duration.toFixed(2)}ms`);
		console.log(`  Memory: ${(memoryDiff / 1024).toFixed(2)}KB`);
		
		return result;
	}
}
