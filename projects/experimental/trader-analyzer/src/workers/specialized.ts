/**
 * @fileoverview Specialized Worker Types
 * @description Base worker classes for CPU-intensive and I/O operations
 * @module workers/specialized
 */

export interface WorkerMessage<T, R> {
	id: string;
	data: T;
	type?: string;
}

export interface WorkerResponse<R> {
	id: string;
	type: 'success' | 'error';
	result?: R;
	error?: string;
}

/**
 * Base Worker class with common message handling
 */
export abstract class BaseWorker<T, R> {
	protected worker: Worker;
	
	constructor(script: string, options: WorkerOptions = {}) {
		this.worker = new Worker(script, {
			smol: true, // Enable smol mode for memory efficiency
			...options
		});
		
		this.setupMessageHandlers();
	}
	
	/**
	 * Process message - to be implemented by subclasses if needed
	 * Note: In most cases, the worker script handles processing
	 */
	protected processMessage(data: T): R | Promise<R> {
		// Default implementation - worker script handles processing
		return data as unknown as R;
	}
	
	private setupMessageHandlers() {
		// Message handler is set up in execute method per request
		// This allows multiple concurrent requests
	}
	
	/**
	 * Execute a task and wait for the result
	 */
	execute(data: T): Promise<R> {
		return new Promise((resolve, reject) => {
			const id = Math.random().toString(36).substr(2, 9);
			
			const messageHandler = (event: MessageEvent<WorkerResponse<R>>) => {
				if (event.data.id === id) {
					this.worker.removeEventListener('message', messageHandler);
					
					if (event.data.type === 'success') {
						resolve(event.data.result!);
					} else {
						reject(new Error(event.data.error || 'Unknown error'));
					}
				}
			};
			
			this.worker.addEventListener('message', messageHandler);
			
			// Send task to worker - worker will process and respond
			this.worker.postMessage({ id, data } as WorkerMessage<T, R>);
		});
	}
	
	terminate() {
		this.worker.terminate();
	}
}

/**
 * CPU-intensive worker for heavy computations
 * 
 * Note: This class expects the worker script to handle the processing.
 * The worker script should match the message format expected by BaseWorker.
 */
export class CPUWorker extends BaseWorker<number[], number[]> {
	// Worker script handles processing - this is just a type-safe wrapper
}

/**
 * I/O simulation worker for file operations
 * 
 * Note: This class expects the worker script to handle the I/O operations.
 * The worker script should match the message format expected by BaseWorker.
 */
export class IOWorker extends BaseWorker<string, string> {
	// Worker script handles I/O - this is just a type-safe wrapper
}

interface WorkerOptions {
	smol?: boolean;
	name?: string;
	preload?: string[];
}
