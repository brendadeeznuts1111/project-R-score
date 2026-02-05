#!/usr/bin/env bun
/**
 * @fileoverview Bun Utilities Demo
 * @description Demonstrates the unified BunUtilities namespace
 */

import { BunUtilities } from '../src/utils/bun-utilities';

async function main() {
	console.log('🚀 Bun Utilities Demo\n');

	// UUID Generation
	console.log('📦 UUID Generation');
	const uuid1 = BunUtilities.uuid();
	const uuid2 = BunUtilities.uuid();
	console.log('UUID 1:', uuid1);
	console.log('UUID 2:', uuid2);
	console.log();

	// String Measurement
	console.log('📏 String Measurement');
	const text = 'Hello, \x1b[31mworld\x1b[0m! 🌍🎉';
	console.log('Text:', text);
	console.log('Width:', BunUtilities.stringWidth(text));
	console.log('Without ANSI:', BunUtilities.stripANSI(text));
	console.log();

	// Progress Bar
	console.log('📊 Progress Bar');
	console.log(BunUtilities.createProgressBar(75, 100, 30, { color: 'cyan' }));
	console.log();

	// Table
	console.log('📋 Table');
	const tableData = [
		{ name: 'Alice', age: 30, city: 'New York' },
		{ name: 'Bob', age: 25, city: 'Los Angeles' },
		{ name: 'Charlie', age: 35, city: 'Chicago' }
	];
	console.log(BunUtilities.formatTable(tableData));
	console.log();

	// HTML Utils
	console.log('🌐 HTML Utils');
	const userInput = '<script>alert("XSS")</script><b>Safe text</b>';
	console.log('Escaped:', BunUtilities.escapeHTML(userInput));
	console.log('Sanitized:', BunUtilities.sanitizeHTML(userInput));
	console.log();

	// Color Utils
	console.log('🎨 Color Utils');
	const rgb = BunUtilities.hexToRGB('#FF5733');
	console.log('HEX to RGB:', rgb);
	console.log('RGB to HEX:', BunUtilities.rgbToHex(rgb));
	console.log();

	// Benchmark
	console.log('⚡ Benchmark');
	const results = BunUtilities.benchmark([
		{ name: 'Array.map', fn: () => [1, 2, 3].map(x => x * 2) },
		{ name: 'Array.forEach', fn: () => { const arr = []; [1, 2, 3].forEach(x => arr.push(x * 2)); } }
	], 10000);
	console.log('Benchmark results:');
	results.forEach(r => {
		console.log(`  ${r.name}: ${r.avgTime.toFixed(4)}ms avg (${r.totalTime.toFixed(2)}ms total)`);
	});
	console.log();

	// Performance Monitor
	console.log('📈 Performance Monitor');
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
		console.log(`Operation: ${metrics.label}`);
		console.log(`  Calls: ${metrics.count}`);
		console.log(`  Average: ${(metrics.avgDuration / 1_000_000).toFixed(3)}ms`);
	}
	console.log();

	console.log('✅ Demo complete');
}

main().catch(console.error);
