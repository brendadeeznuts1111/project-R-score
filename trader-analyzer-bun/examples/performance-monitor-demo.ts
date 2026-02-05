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
	console.log('🚀 Performance Monitor Demo\n');

	// Example 1: Synchronous function wrapping
	console.log('📊 Example 1: Synchronous Function Wrapping');
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
	console.log();

	// Example 2: Asynchronous function wrapping
	console.log('📊 Example 2: Asynchronous Function Wrapping');
	const asyncOperation = withAsyncPerformance('Async Task', async (url: string) => {
		await Bun.sleep(Math.random() * 100);
		return { url, status: 'ok' };
	});

	await asyncOperation('https://example.com');
	await asyncOperation('https://api.example.com');
	await asyncOperation('https://data.example.com');
	console.log();

	// Example 3: Direct measurement
	console.log('📊 Example 3: Direct Measurement');
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
	console.log();

	// Example 4: Get specific metrics
	console.log('📊 Example 4: Get Specific Metrics');
	const calcMetrics = monitor.getMetrics('Expensive Calculation');
	if (calcMetrics) {
		console.log('Expensive Calculation metrics:');
		console.log(`  Calls: ${calcMetrics.count}`);
		console.log(`  Average: ${(calcMetrics.avgDuration / 1_000_000).toFixed(3)}ms`);
		console.log(`  Min: ${(Number(calcMetrics.minDuration) / 1_000_000).toFixed(3)}ms`);
		console.log(`  Max: ${(Number(calcMetrics.maxDuration) / 1_000_000).toFixed(3)}ms`);
		console.log(`  Calls/sec: ${calcMetrics.callsPerSecond.toFixed(2)}`);
	}
	console.log();

	// Example 5: Format all metrics
	console.log('📊 Example 5: Formatted Metrics Table');
	console.log(monitor.formatMetrics());
	console.log();

	// Example 6: Reset metrics
	console.log('📊 Example 6: Reset Metrics');
	monitor.reset('Expensive Calculation');
	console.log('Reset Expensive Calculation metrics');
	console.log(`Remaining metrics: ${monitor.getMetrics()?.length || 0}`);
	console.log();

	console.log('✅ Demo complete');
}

main().catch(console.error);
