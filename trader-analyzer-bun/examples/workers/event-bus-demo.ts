#!/usr/bin/env bun
/**
 * @fileoverview Event Bus Demo
 * @description Demonstrates event-based worker communication
 */

import { WorkerEventBus } from '../../src/workers/event-bus';

const WORKER_SCRIPT = new URL('../../src/workers/examples/event-worker.ts', import.meta.url).href;

async function main() {
	console.log('🚀 Event Bus Demo\n');

	const eventBus = new WorkerEventBus(WORKER_SCRIPT);

	// Subscribe to events
	eventBus.on('progress', (percent: number) => {
		console.log(`📊 Progress: ${percent}%`);
	});

	eventBus.on('completed', (result: any) => {
		console.log('✅ Task completed:', result);
	});

	// Example 1: Send event
	console.log('📡 Example 1: Sending Event');
	eventBus.post('startProcessing', { file: 'data.csv' });
	
	// Wait for completion
	await Bun.sleep(2000);
	console.log();

	// Example 2: Request-response pattern
	console.log('📡 Example 2: Request-Response');
	const result = await eventBus.request('calculate', { numbers: [1, 2, 3, 4, 5] });
	console.log('Calculation result:', result);
	console.log();

	eventBus.terminate();
	console.log('✅ Demo complete');
}

main().catch(console.error);
