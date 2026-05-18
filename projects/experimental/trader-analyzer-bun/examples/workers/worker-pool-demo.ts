#!/usr/bin/env bun
/**
 * @fileoverview Worker Pool Demo
 * @description Demonstrates WorkerPool usage for parallel task processing
 */

import { WorkerPool } from '../../src/workers/pool';

// Example worker script path
const WORKER_SCRIPT = new URL('../../src/workers/examples/example-worker.ts', import.meta.url).href;

async function main() {
	console.info('🚀 Worker Pool Demo\n');

	// Create worker pool with 4 workers
	const pool = new WorkerPool(WORKER_SCRIPT, 4);

	// Example 1: Single task execution
	console.info('📦 Example 1: Single Task');
	const result = await pool.execute({ data: [1, 2, 3, 4, 5] });
	console.info('Result:', result);
	console.info();

	// Example 2: Batch processing
	console.info('📦 Example 2: Batch Processing');
	const tasks = Array.from({ length: 10 }, (_, i) => ({ 
		data: Array.from({ length: 5 }, (_, j) => i * 5 + j) 
	}));
	
	const results = await pool.map(tasks);
	console.info(`Processed ${results.length} tasks`);
	console.info('First result:', results[0]);
	console.info();

	// Example 3: Pool statistics
	console.info('📊 Pool Statistics');
	const stats = pool.getStats();
	console.info(stats);
	console.info();

	// Cleanup
	pool.terminate();
	console.info('✅ Demo complete');
}

main().catch(console.error);
