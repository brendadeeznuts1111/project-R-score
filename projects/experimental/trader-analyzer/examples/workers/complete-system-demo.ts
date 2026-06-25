#!/usr/bin/env bun
/**
 * @fileoverview Complete Worker System Demo
 * @description Demonstrates the integrated WorkerSystem
 */

import { WorkerSystem } from '../../src/workers/system';
import { EnvironmentManager } from '../../src/workers/environment';

const WORKER_SCRIPT = new URL('../../src/workers/examples/example-worker.ts', import.meta.url).href;

async function main() {
	console.info('🚀 Complete Worker System Demo\n');

	// Initialize environment
	EnvironmentManager.initialize({
		apiBaseUrl: 'https://api.production.com',
		maxRetries: 5,
		database: {
			host: 'localhost',
			port: 5432
		}
	});

	// Create worker system
	const workerSystem = new WorkerSystem(WORKER_SCRIPT, 4, {
		enableHealthChecks: true,
		memoryLimitMB: 50,
		timeoutMs: 10000
	});

	// Process multiple tasks
	console.info('📦 Processing Tasks');
	const tasks = Array.from({ length: 100 }, (_, i) => ({ 
		id: i, 
		data: `task-${i}` 
	}));
	
	const results = await workerSystem.processBatch(tasks);
	console.info(`✅ Processed ${results.length} tasks`);
	console.info();

	// Get system metrics
	console.info('📊 System Metrics');
	const metrics = workerSystem.getMetrics();
	console.info(JSON.stringify(metrics, null, 2));
	console.info();

	// Broadcast configuration update
	console.info('📡 Broadcasting Config Update');
	await workerSystem.broadcast({
		type: 'configUpdate',
		config: { maxBatchSize: 1000 }
	});
	console.info();

	// Graceful shutdown
	workerSystem.shutdown();
	console.info('✅ Demo complete');
}

main().catch(console.error);
