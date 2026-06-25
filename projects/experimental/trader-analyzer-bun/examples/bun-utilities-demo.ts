#!/usr/bin/env bun
/**
 * @fileoverview Bun Utilities Demo
 * @description Demonstrates the unified BunUtilities namespace
 */

import { BunUtilities } from '../src/utils/bun-utilities';

async function main() {
	console.info('🚀 Bun Utilities Demo\n');

	// UUID Generation
	console.info('📦 UUID Generation');
	const uuid1 = BunUtilities.uuid();
	const uuid2 = BunUtilities.uuid();
	console.info('UUID 1:', uuid1);
	console.info('UUID 2:', uuid2);
	console.info();

	// String Measurement
	console.info('📏 String Measurement');
	const text = 'Hello, \x1b[31mworld\x1b[0m! 🌍🎉';
	console.info('Text:', text);
	console.info('Width:', BunUtilities.stringWidth(text));
	console.info('Without ANSI:', BunUtilities.stripANSI(text));
	console.info();

	// Progress Bar
	console.info('📊 Progress Bar');
	console.info(BunUtilities.createProgressBar(75, 100, 30, { color: 'cyan' }));
	console.info();

	// Table
	console.info('📋 Table');
	const tableData = [
		{ name: 'Alice', age: 30, city: 'New York' },
		{ name: 'Bob', age: 25, city: 'Los Angeles' },
		{ name: 'Charlie', age: 35, city: 'Chicago' }
	];
	console.info(BunUtilities.formatTable(tableData));
	console.info();

	// HTML Utils
	console.info('🌐 HTML Utils');
	const userInput = '<script>alert("XSS")</script><b>Safe text</b>';
	console.info('Escaped:', BunUtilities.escapeHTML(userInput));
	console.info('Sanitized:', BunUtilities.sanitizeHTML(userInput));
	console.info();

	// Color Utils
	console.info('🎨 Color Utils');
	const rgb = BunUtilities.hexToRGB('#FF5733');
	console.info('HEX to RGB:', rgb);
	console.info('RGB to HEX:', BunUtilities.rgbToHex(rgb));
	console.info();

	// Benchmark
	console.info('⚡ Benchmark');
	const results = BunUtilities.benchmark([
		{ name: 'Array.map', fn: () => [1, 2, 3].map(x => x * 2) },
		{ name: 'Array.forEach', fn: () => { const arr = []; [1, 2, 3].forEach(x => arr.push(x * 2)); } }
	], 10000);
	console.info('Benchmark results:');
	results.forEach(r => {
		console.info(`  ${r.name}: ${r.avgTime.toFixed(4)}ms avg (${r.totalTime.toFixed(2)}ms total)`);
	});
	console.info();

	// Performance Monitor
	console.info('📈 Performance Monitor');
	const monitor = BunUtilities.createMonitor();
	monitor.measure('test-operation', () => {
		let sum = 0;
		for (let i = 0; i < 1000000; i++) {
			sum += i;
		}
		return sum;
	});
	const metrics = monitor.getMetrics('test-operation');
	if (metrics) {
		console.info(`Operation: ${metrics.label}`);
		console.info(`  Calls: ${metrics.count}`);
		console.info(`  Average: ${(metrics.avgDuration / 1_000_000).toFixed(3)}ms`);
	}
	console.info();

	console.info('✅ Demo complete');
}

main().catch(console.error);
