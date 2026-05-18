#!/usr/bin/env bun
/**
 * Markdown Profile Demo - Bun v1.3.7 New Features
 *
 * Demonstrates the new --cpu-prof-md and --heap-prof-md flags
 * for generating profiling data in Markdown format.
 */

console.info("🔥 Bun v1.3.7 Markdown Profiling Demo");
console.info("=====================================\n");

// Simulate some CPU-intensive work for profiling
async function performCPUWork() {
	console.info("📊 Performing CPU-intensive work...");

	// Mathematical computations
	let result = 0;
	for (let i = 0; i < 1000000; i++) {
		result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
	}

	// String operations
	let text = "";
	for (let i = 0; i < 10000; i++) {
		text += `iteration-${i}-`.padEnd(20, " ");
	}

	// Array operations
	const arrays = Array.from({ length: 1000 }, (_, i) =>
		Array.from({ length: 100 }, (_, j) => i * j),
	);

	// Buffer operations (Bun-optimized)
	const buffers = [];
	for (let i = 0; i < 100; i++) {
		const buffer = new ArrayBuffer(1024 * 10);
		const view = new Uint8Array(buffer);
		view.fill(i % 256);
		buffers.push(buffer);
	}

	console.info(`   ✅ Math result: ${result.toFixed(2)}`);
	console.info(`   ✅ Text length: ${text.length}`);
	console.info(`   ✅ Arrays created: ${arrays.length}`);
	console.info(`   ✅ Buffers created: ${buffers.length}`);
}

// Simulate memory allocation patterns for heap profiling
async function performMemoryWork() {
	console.info("💾 Performing memory-intensive work...");

	const objects = [];

	// Create various object types to show in heap profile
	for (let i = 0; i < 5000; i++) {
		objects.push({
			id: i,
			type: i % 3 === 0 ? "Function" : "Structure",
			data: new Array(100).fill(0).map(() => Math.random()),
			timestamp: Date.now(),
			metadata: {
				processed: false,
				priority: i % 5,
				tags: [`tag-${i % 10}`, `category-${i % 5}`],
			},
		});
	}

	// Create some functions to show in heap profile
	const functions = [];
	for (let i = 0; i < 100; i++) {
		functions.push(() => `function-${i}`);
	}

	// Create circular references (common in real apps)
	objects.forEach((obj, i) => {
		if (i > 0) {
			obj.reference = objects[i - 1];
		}
	});

	console.info(`   ✅ Objects created: ${objects.length}`);
	console.info(`   ✅ Functions created: ${functions.length}`);

	// Simulate some processing
	objects.forEach((obj) => {
		obj.data = obj.data.map((x) => x * 2);
		obj.metadata.processed = true;
	});

	return { objects, functions };
}

// Main execution
async function main() {
	try {
		await performCPUWork();
		console.info();
		await performMemoryWork();
		console.info();
		console.info("✅ Demo completed! Check generated profile files:");
		console.info("   📄 CPU Profile: CPU.*.md (Markdown format)");
		console.info("   💾 Heap Profile: Heap.*.md (Markdown format)");
		console.info();
		console.info("🔍 View profiles with:");
		console.info("   cat CPU.*.md");
		console.info("   cat Heap.*.md");
		console.info();
		console.info("📊 Key features of Markdown format:");
		console.info("   • Human-readable tables and summaries");
		console.info("   • Easy sharing on GitHub/GitLab");
		console.info("   • LLM-friendly for analysis");
		console.info("   • CLI-friendly with grep/sed/awk");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
