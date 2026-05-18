#!/usr/bin/env bun
/**
 * @fileoverview Performance Monitor Demo
 * @description Demonstrates the simple performance monitor with decorator functions
 */

import { 
	PerformanceMonitor, 
	withPerformance, 
	withAsyncPerformance 
} from '../src/utils/performance-monitor';

async function main() {
	console.info('🚀 Performance Monitor Demo\n');

	// Example 1: Synchronous function wrapping
	console.info('📊 Example 1: Synchronous Function Wrapping');
	const expensiveOperation = withPerformance('Expensive Calculation', (a: number, b: number) => {
		let result = 0;
		for (let i = 0; i < 1000000; i++) {
			result += Math.sqrt(a * i) * Math.sin(b * i);
		}
		return result;
	});

	expensiveOperation(5, 10);
	expensiveOperation(3, 7);
	expensiveOperation(8, 2);
	console.info();

	// Example 2: Asynchronous function wrapping
	console.info('📊 Example 2: Asynchronous Function Wrapping');
	const asyncOperation = withAsyncPerformance('Async Task', async (url: string) => {
		await Bun.sleep(Math.random() * 100);
		return { url, status: 'ok' };
	});

	await asyncOperation('https://example.com');
	await asyncOperation('https://api.example.com');
	await asyncOperation('https://data.example.com');
	console.info();

	// Example 3: Direct measurement
	console.info('📊 Example 3: Direct Measurement');
	const monitor = PerformanceMonitor.getInstance();
	
	monitor.measure('Direct Measurement', () => {
		let sum = 0;
		for (let i = 0; i < 500000; i++) {
			sum += i * Math.sqrt(i);
		}
		return sum;
	});

	await monitor.measureAsync('Direct Async Measurement', async () => {
		await Bun.sleep(50);
		return 'done';
	});
	console.info();

	// Example 4: Get specific metrics
	console.info('📊 Example 4: Get Specific Metrics');
	const calcMetrics = monitor.getMetrics('Expensive Calculation');
	if (calcMetrics) {
		console.info('Expensive Calculation metrics:');
		console.info(`  Calls: ${calcMetrics.count}`);
		console.info(`  Average: ${(calcMetrics.avgDuration / 1_000_000).toFixed(3)}ms`);
		console.info(`  Min: ${(Number(calcMetrics.minDuration) / 1_000_000).toFixed(3)}ms`);
		console.info(`  Max: ${(Number(calcMetrics.maxDuration) / 1_000_000).toFixed(3)}ms`);
		console.info(`  Calls/sec: ${calcMetrics.callsPerSecond.toFixed(2)}`);
	}
	console.info();

	// Example 5: Format all metrics
	console.info('📊 Example 5: Formatted Metrics Table');
	console.info(monitor.formatMetrics());
	console.info();

	// Example 6: Reset metrics
	console.info('📊 Example 6: Reset Metrics');
	monitor.reset('Expensive Calculation');
	console.info('Reset Expensive Calculation metrics');
	console.info(`Remaining metrics: ${monitor.getMetrics()?.length || 0}`);
	console.info();

	console.info('✅ Demo complete');
}

main().catch(console.error);
