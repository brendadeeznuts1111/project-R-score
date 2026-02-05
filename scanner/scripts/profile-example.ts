#!/usr/bin/env bun
/**
 * Example script for CPU/Heap profiling demonstration
 *
 * This script performs some CPU-intensive work to generate useful profiles.
 *
 * Usage:
 *   # CPU profiling (markdown only)
 *   bun --cpu-prof-md scripts/profile-example.ts
 *
 *   # CPU profiling (both formats)
 *   bun --cpu-prof --cpu-prof-md scripts/profile-example.ts
 *
 *   # Heap profiling (markdown only)
 *   bun --heap-prof-md scripts/profile-example.ts
 *
 *   # Both CPU and heap profiling
 *   bun --cpu-prof-md --heap-prof-md scripts/profile-example.ts
 */

function cpuIntensiveWork(iterations: number): number {
	let sum = 0;
	for (let i = 0; i < iterations; i++) {
		sum += Math.sqrt(i) * Math.sin(i);
	}
	return sum;
}

function createLargeObject(size: number): Record<string, number> {
	const obj: Record<string, number> = {};
	for (let i = 0; i < size; i++) {
		obj[`key_${i}`] = Math.random();
	}
	return obj;
}

async function main(): Promise<void> {
	console.log('🚀 Starting profiling example...\n');

	// CPU-intensive operations
	console.log('📊 Performing CPU-intensive work...');
	const start1 = Bun.nanoseconds();
	cpuIntensiveWork(1_000_000);
	const time1 = (Bun.nanoseconds() - start1) / 1_000_000;
	console.log(`  Completed in ${time1.toFixed(2)}ms`);

	console.log('📊 More CPU work...');
	const start2 = Bun.nanoseconds();
	cpuIntensiveWork(5_000_000);
	const time2 = (Bun.nanoseconds() - start2) / 1_000_000;
	console.log(`  Completed in ${time2.toFixed(2)}ms`);

	// Memory-intensive operations
	console.log('\n💾 Creating large objects...');
	const objects: Record<string, number>[] = [];
	for (let i = 0; i < 100; i++) {
		objects.push(createLargeObject(1000));
	}
	console.log(`  Created ${objects.length} objects`);

	// Async operations
	console.log('\n⏱️  Performing async operations...');
	await Promise.all([Bun.sleep(10), Bun.sleep(20), Bun.sleep(30)]);
	console.log('  Async operations completed');

	// More CPU work
	console.log('\n📊 Final CPU work...');
	const start3 = Bun.nanoseconds();
	cpuIntensiveWork(2_000_000);
	const time3 = (Bun.nanoseconds() - start3) / 1_000_000;
	console.log(`  Completed in ${time3.toFixed(2)}ms`);

	console.log('\n✅ Profiling example complete!');
	console.log('\n📝 Profile files generated:');
	console.log('  • CPU profile: Check current directory for .cpuprofile or .md files');
	console.log('  • Heap profile: Check current directory for .heapsnapshot or .md files');
}

if (import.meta.main) {
	void main();
}
