#!/usr/bin/env bun
/**
 * @fileoverview Event Bus Demo
 * @description Demonstrates event-based worker communication
 */

import { WorkerEventBus } from '../../src/workers/event-bus';

const WORKER_SCRIPT = new URL('../../src/workers/examples/event-worker.ts', import.meta.url).href;

async function main() {
	console.info('🚀 Event Bus Demo\n');

	const eventBus = new WorkerEventBus(WORKER_SCRIPT);

	// Subscribe to events
	eventBus.on('progress', (percent: number) => {
		console.info(`📊 Progress: ${percent}%`);
	});

	eventBus.on('completed', (result: any) => {
		console.info('✅ Task completed:', result);
	});

	// Example 1: Send event
	console.info('📡 Example 1: Sending Event');
	eventBus.post('startProcessing', { file: 'data.csv' });
	
	// Wait for completion
	await Bun.sleep(2000);
	console.info();

	// Example 2: Request-response pattern
	console.info('📡 Example 2: Request-Response');
	const result = await eventBus.request('calculate', { numbers: [1, 2, 3, 4, 5] });
	console.info('Calculation result:', result);
	console.info();

	eventBus.terminate();
	console.info('✅ Demo complete');
}

main().catch(console.error);
