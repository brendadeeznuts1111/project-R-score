#!/usr/bin/env bun
/**
 * @fileoverview Message Broker Demo
 * @description Demonstrates request-response pattern with WorkerMessageBroker
 */

import { WorkerMessageBroker } from '../../src/workers/message-broker';

const WORKER_SCRIPT = new URL('../../src/workers/examples/example-worker.ts', import.meta.url).href;

async function main() {
	console.info('🚀 Message Broker Demo\n');

	const worker = new Worker(WORKER_SCRIPT);
	const broker = new WorkerMessageBroker(worker);

	// Setup worker to handle requests
	worker.onmessage = (event) => {
		const { taskId, result, error } = event.data;
		// Broker handles this automatically
	};

	// Example 1: Single request
	console.info('📨 Example 1: Single Request');
	const result = await broker.request('processData', [1, 2, 3, 4, 5]);
	console.info('Result:', result);
	console.info();

	// Example 2: Batch requests
	console.info('📨 Example 2: Batch Requests');
	const batchResults = await broker.batch({
		userStats: { userId: 123 },
		orders: { limit: 10 },
		recommendations: { category: 'books' }
	});
	console.info('Batch results:', batchResults);
	console.info();

	// Example 3: Streaming
	console.info('📨 Example 3: Streaming Data');
	let totalReceived = 0;
	for await (const chunk of broker.stream('fetchLargeDataset', { dataset: 'logs' }, 100)) {
		totalReceived += chunk.length;
		console.info(`Received chunk: ${chunk.length} items (total: ${totalReceived})`);
	}
	console.info();

	worker.terminate();
	console.info('✅ Demo complete');
}

main().catch(console.error);
