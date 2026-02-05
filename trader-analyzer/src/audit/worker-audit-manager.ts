/**
 * @fileoverview 9.1.5.14.0.0.0: Worker-Based Audit Manager
 * @description Uses Bun's Workers API for parallel documentation audits with shared I/O
 * @module audit/worker-audit-manager
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager (spawn-based alternative)
 * - @see 9.1.5.7.0.0.0 → Orphan Detection System
 * - @see Bun Workers API → https://bun.com/docs/runtime/workers
 */

declare var self: Worker;

/**
 * 9.1.5.14.0.0.0: Worker-Based Audit Manager
 *
 * Uses Bun's Workers API for parallel documentation audits.
 * Workers share I/O resources with the main thread, providing better
 * performance than spawn-based processes for CPU-intensive pattern matching.
 *
 * Benefits over spawn:
 * - Shared I/O resources (faster)
 * - Lower memory overhead
 * - Faster message passing (2-241x faster with fast paths)
 * - Better TypeScript support
 */
export class WorkerAuditManager {
	private workers: Map<string, Worker> = new Map();
	private readonly MAX_WORKERS = 4;

	/**
	 * 9.1.5.14.1.0.0: Create audit worker
	 *
	 * Creates a new worker for parallel pattern scanning.
	 *
	 * @param workerId - Unique identifier for the worker
	 * @returns Worker instance
	 */
	createAuditWorker(workerId: string): Worker {
		const worker = new Worker(
			new URL("./audit-worker.ts", import.meta.url).href,
			{
				preload: ["./audit-worker-shared.ts"],
			},
		);

		worker.addEventListener("open", () => {
			console.log(`✅ Worker ${workerId} is ready`);
		});

		worker.addEventListener("close", (event) => {
			console.log(`👋 Worker ${workerId} closed (exit code: ${event.code})`);
			this.workers.delete(workerId);
		});

		worker.addEventListener("error", (error) => {
			console.error(`❌ Worker ${workerId} error:`, error);
		});

		this.workers.set(workerId, worker);
		return worker;
	}

	/**
	 * 9.1.5.14.2.0.0: Execute parallel pattern scan using workers
	 *
	 * Uses workers for parallel pattern matching with shared I/O resources.
	 *
	 * @param patterns - Array of regex patterns to search
	 * @param directories - Array of directories to scan
	 * @returns Array of pattern scan results
	 */
	async executeParallelPatternScan(
		patterns: string[],
		directories: string[],
	): Promise<PatternScanResult[]> {
		const results: PatternScanResult[] = [];
		const promises: Promise<PatternScanResult>[] = [];

		// Limit concurrent workers
		const semaphore = new Semaphore(this.MAX_WORKERS);

		for (const pattern of patterns) {
			for (const directory of directories) {
				promises.push(
					semaphore
						.acquire()
						.then(() =>
							this.scanPatternWithWorker(pattern, directory).finally(() =>
								semaphore.release(),
							),
						),
				);
			}
		}

		// Wait for all parallel scans
		const scanResults = await Promise.all(promises);
		return scanResults.filter((result) => result.matches > 0);
	}

	/**
	 * 9.1.5.14.3.0.0: Scan pattern using worker
	 *
	 * Uses a worker thread for pattern scanning with fast postMessage.
	 *
	 * @param pattern - Regex pattern to search for
	 * @param directory - Directory to scan
	 * @returns Pattern scan result
	 */
	private async scanPatternWithWorker(
		pattern: string,
		directory: string,
	): Promise<PatternScanResult> {
		const workerId = `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const worker = this.createAuditWorker(workerId);

		return new Promise((resolve, reject) => {
			const matches: any[] = [];
			let matchCount = 0;

			// Set up message handler
			worker.onmessage = (event: MessageEvent) => {
				const data = event.data;

				switch (data.type) {
					case "match":
						matches.push({
							file: data.file,
							line: data.line,
							content: data.content,
						});
						matchCount++;
						break;

					case "complete":
						resolve({
							pattern,
							directory,
							matches: matchCount,
							details: matches,
						});
						worker.terminate();
						break;

					case "error":
						reject(new Error(data.error));
						worker.terminate();
						break;
				}
			};

			// Send scan request (uses fast path for simple objects)
			worker.postMessage({
				type: "scan",
				pattern,
				directory,
			});

			// Timeout after 30 seconds
			setTimeout(() => {
				if (worker.threadId !== undefined) {
					reject(new Error(`Pattern scan timeout: ${pattern} in ${directory}`));
					worker.terminate();
				}
			}, 30000);
		});
	}

	/**
	 * 9.1.5.14.4.0.0: Real-time audit with worker pool
	 *
	 * Creates a pool of workers for real-time auditing with streaming results.
	 *
	 * @param options - Audit configuration
	 * @returns Audit result with event emitter
	 */
	async startRealTimeAudit(options: AuditOptions): Promise<WorkerAuditResult> {
		const workerId = `audit-${Date.now()}`;
		const worker = this.createAuditWorker(workerId);

		// Set up event handlers
		worker.onmessage = (event: MessageEvent) => {
			const data = event.data;
			// Events will be handled by caller via event emitter
		};

		// Send audit request
		worker.postMessage({
			type: "audit",
			targetPath: options.targetPath,
			patterns: options.patterns,
		});

		return {
			workerId,
			worker,
			terminate: () => worker.terminate(),
		};
	}

	/**
	 * 9.1.5.14.5.0.0: Shutdown all workers
	 *
	 * Gracefully terminates all active workers.
	 */
	async shutdown(): Promise<void> {
		const terminatePromises: Promise<void>[] = [];

		for (const [id, worker] of this.workers) {
			terminatePromises.push(
				(async () => {
					try {
						worker.terminate();
						// Wait a bit for graceful shutdown
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (error) {
						console.warn(`Failed to terminate worker ${id}: ${error}`);
					}
				})(),
			);
		}

		await Promise.all(terminatePromises);
		this.workers.clear();
	}
}

// ============ Supporting Classes ============

/**
 * Semaphore for limiting concurrent operations
 */
class Semaphore {
	private tasks: Array<() => void> = [];
	private count: number;

	constructor(count: number) {
		this.count = count;
	}

	acquire(): Promise<void> {
		return new Promise((resolve) => {
			if (this.count > 0) {
				this.count--;
				resolve();
			} else {
				this.tasks.push(() => {
					this.count--;
					resolve();
				});
			}
		});
	}

	release(): void {
		this.count++;
		const next = this.tasks.shift();
		if (next) next();
	}
}

// ============ Type Definitions ============

/**
 * Audit configuration options
 */
export interface AuditOptions {
	targetPath: string;
	patterns: string[];
	timeout?: number;
	maxWorkers?: number;
}

/**
 * Pattern scan result
 */
export interface PatternScanResult {
	pattern: string;
	directory: string;
	matches: number;
	details: any[];
}

/**
 * Worker audit result
 */
export interface WorkerAuditResult {
	workerId: string;
	worker: Worker;
	terminate: () => void;
}
