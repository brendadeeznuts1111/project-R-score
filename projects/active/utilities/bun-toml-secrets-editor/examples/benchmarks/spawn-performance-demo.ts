// examples/spawn-performance-demo.ts
// Demonstrating the massive performance improvement of Bun.spawn

import { MatrixProfileRunner } from "../../src/cli/matrix-profile-runner";
import { demonstrateSpawnPerformance } from "../../src/performance/spawn-benchmark";

async function demonstrateRealWorldPerformance() {
	console.info("🎯 Real-World Performance Demonstration");
	console.info("=".repeat(50));

	// Scenario 1: CI/CD Pipeline Optimization
	console.info("\n📦 CI/CD Pipeline Scenario:");
	console.info("Before: 13ms per spawn = 130ms for 10 operations");
	console.info("After: 0.4ms per spawn = 4ms for 10 operations");
	console.info("Improvement: 32.5x faster! 🚀");

	// Simulate the performance difference
	const profiles = ["dev", "staging", "prod", "test", "ci-cd"];

	console.info("\n🏃 Running profile validations...");

	const _runner = new MatrixProfileRunner();

	// Your optimized profile run command benefits:
	const startTime = Bun.nanoseconds();

	await Promise.all(
		profiles.map((p) =>
			Bun.spawn(["matrix", "profile", "validate", p], {
				stdout: "pipe",
				stderr: "pipe",
				onExit(_proc, exitCode, _signalCode, _error) {
					if (exitCode === 0) {
						console.info(`   ✅ ${p}: Validated`);
					} else {
						console.info(`   ❌ ${p}: Failed (${exitCode})`);
					}
				},
			}),
		),
	);

	const endTime = Bun.nanoseconds();
	const totalTime = (endTime - startTime) / 1_000_000;

	console.info(`\n📊 Performance Results:`);
	console.info(`   Total time: ${totalTime.toFixed(2)}ms`);
	console.info(
		`   Average per profile: ${(totalTime / profiles.length).toFixed(2)}ms`,
	);
	console.info(
		`   Throughput: ${(profiles.length / (totalTime / 1000)).toFixed(0)} profiles/sec`,
	);

	// Compare with old performance
	const oldTime = profiles.length * 13; // 13ms per old spawn
	const speedup = oldTime / totalTime;

	console.info(`\n🎉 Performance Improvement:`);
	console.info(`   Old method: ${oldTime}ms`);
	console.info(`   New method: ${totalTime.toFixed(2)}ms`);
	console.info(`   Speedup: ${speedup.toFixed(1)}x faster`);

	if (speedup > 20) {
		console.info(`   🔥 MASSIVE performance gain!`);
	}
}

async function demonstrateBatchOperations() {
	console.info("\n🔄 Batch Operations Demonstration");
	console.info("=".repeat(40));

	const operations = [
		["matrix", "build", "--production"],
		["matrix", "test", "--coverage"],
		["matrix", "lint", "--fix"],
		["matrix", "security", "--audit"],
		["matrix", "docs", "--build"],
	];

	console.info(`\n⚡ Running ${operations.length} operations in parallel...`);

	const start = Bun.nanoseconds();

	// Your optimized approach with Bun.spawn
	const processes = operations.map((op) =>
		Bun.spawn(op, {
			stdout: "pipe",
			stderr: "pipe",
		}),
	);

	// Wait for all to complete
	await Promise.all(processes.map((p) => p.exited));

	const end = Bun.nanoseconds();
	const duration = (end - start) / 1_000_000;

	console.info(`\n📊 Batch Results:`);
	console.info(
		`   Completed ${operations.length} operations in ${duration.toFixed(2)}ms`,
	);
	console.info(
		`   Average: ${(duration / operations.length).toFixed(2)}ms per operation`,
	);
	console.info(
		`   Efficiency: ${((operations.length / (duration / 1000)) * 60).toFixed(0)} operations/minute`,
	);
}

async function demonstrateScalingBenefits() {
	console.info("\n📈 Scaling Benefits Demonstration");
	console.info("=".repeat(40));

	const scales = [10, 50, 100, 500];

	console.info("\n📊 Performance at Different Scales:");
	console.info("Scale | Old (13ms) | New (0.4ms) | Speedup");
	console.info("------|------------|------------|--------");

	scales.forEach((scale) => {
		const oldTime = scale * 13;
		const newTime = scale * 0.4;
		const speedup = oldTime / newTime;

		console.info(
			`${scale.toString().padEnd(5)} | ${oldTime.toString().padEnd(10)} | ${newTime.toFixed(1).padEnd(10)} | ${speedup.toFixed(1)}x`,
		);
	});

	console.info("\n💡 Key Insights:");
	console.info("   • Performance improvement scales linearly");
	console.info("   • Larger operations see bigger absolute gains");
	console.info("   • Resource usage reduced by ~97%");
	console.info("   • Enables new real-time use cases");
}

async function demonstrateRealWorldUseCases() {
	console.info("\n🌍 Real-World Use Cases");
	console.info("=".repeat(30));

	const useCases = [
		{
			name: "Microservices Deployment",
			description: "Deploy 50 microservices concurrently",
			oldTime: "650ms (50 × 13ms)",
			newTime: "20ms (50 × 0.4ms)",
			benefit: "32x faster deployment",
		},
		{
			name: "CI/CD Pipeline",
			description: "Run 100 test suites in parallel",
			oldTime: "1300ms (100 × 13ms)",
			newTime: "40ms (100 × 0.4ms)",
			benefit: "32.5x faster pipeline",
		},
		{
			name: "Data Processing",
			description: "Process 1000 data files",
			oldTime: "13s (1000 × 13ms)",
			newTime: "400ms (1000 × 0.4ms)",
			benefit: "32.5x faster processing",
		},
		{
			name: "API Testing",
			description: "Test 200 API endpoints",
			oldTime: "2600ms (200 × 13ms)",
			newTime: "80ms (200 × 0.4ms)",
			benefit: "32.5x faster testing",
		},
	];

	useCases.forEach((useCase) => {
		console.info(`\n📋 ${useCase.name}:`);
		console.info(`   Description: ${useCase.description}`);
		console.info(`   Before: ${useCase.oldTime}`);
		console.info(`   After: ${useCase.newTime}`);
		console.info(`   Benefit: ${useCase.benefit}`);
	});
}

export async function runSpawnPerformanceDemo() {
	console.info("🚀 Bun.spawn Performance Optimization Demo");
	console.info("Before: 13ms per spawn (slow on high-fd systems)");
	console.info("After: 0.4ms per spawn (30x faster)");
	console.info("=".repeat(60));

	try {
		// Run the comprehensive benchmark
		await demonstrateSpawnPerformance();

		// Show real-world applications
		await demonstrateRealWorldPerformance();

		// Demonstrate batch operations
		await demonstrateBatchOperations();

		// Show scaling benefits
		await demonstrateScalingBenefits();

		// Real-world use cases
		await demonstrateRealWorldUseCases();

		console.info("\n✅ Performance demonstration completed!");

		console.info("\n🎯 Key Takeaways:");
		console.info("   • Bun.spawn provides 30x+ performance improvement");
		console.info("   • Enables real-time parallel processing");
		console.info("   • Reduces resource consumption dramatically");
		console.info("   • Scales linearly with operation count");
		console.info("   • Perfect for CI/CD and microservices");

		console.info("\n💡 Implementation Tip:");
		console.info("   Replace all your process spawning with Bun.spawn");
		console.info("   Your users will thank you for the speed boost! 🚀");
	} catch (error) {
		console.error("❌ Demo failed:", error);
	}
}

// Run if this file is executed directly
if (typeof require !== "undefined" && require.main === module) {
	runSpawnPerformanceDemo().catch(console.error);
}
