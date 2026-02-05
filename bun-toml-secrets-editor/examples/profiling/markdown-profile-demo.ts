#!/usr/bin/env bun
/**
 * Markdown Profile Demo - Bun v1.3.7 New Features
 *
 * Demonstrates the new --cpu-prof-md and --heap-prof-md flags
 * for generating profiling data in Markdown format.
 */

console.log("🔥 Bun v1.3.7 Markdown Profiling Demo");
console.log("=====================================\n");

// Simulate some CPU-intensive work for profiling
async function performCPUWork() {
	console.log("📊 Performing CPU-intensive work...");

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

	console.log(`   ✅ Math result: ${result.toFixed(2)}`);
	console.log(`   ✅ Text length: ${text.length}`);
	console.log(`   ✅ Arrays created: ${arrays.length}`);
	console.log(`   ✅ Buffers created: ${buffers.length}`);
}

// Simulate memory allocation patterns for heap profiling
async function performMemoryWork() {
	console.log("💾 Performing memory-intensive work...");

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

	console.log(`   ✅ Objects created: ${objects.length}`);
	console.log(`   ✅ Functions created: ${functions.length}`);

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
		console.log();
		await performMemoryWork();
		console.log();
		console.log("✅ Demo completed! Check generated profile files:");
		console.log("   📄 CPU Profile: CPU.*.md (Markdown format)");
		console.log("   💾 Heap Profile: Heap.*.md (Markdown format)");
		console.log();
		console.log("🔍 View profiles with:");
		console.log("   cat CPU.*.md");
		console.log("   cat Heap.*.md");
		console.log();
		console.log("📊 Key features of Markdown format:");
		console.log("   • Human-readable tables and summaries");
		console.log("   • Easy sharing on GitHub/GitLab");
		console.log("   • LLM-friendly for analysis");
		console.log("   • CLI-friendly with grep/sed/awk");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
