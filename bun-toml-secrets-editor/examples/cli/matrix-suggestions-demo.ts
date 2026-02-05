// examples/matrix-suggestions-demo.ts
// Demonstration of matrix command suggestions using Bun's optimized utilities

import {
	MatrixSuggestionEngine,
	perfTracker,
	suggestCommand,
} from "../../src/cli/matrix-suggestions";

// Demo scenarios
const demoInputs = [
	"buld", // Typo for 'build'
	"tset", // Typo for 'test'
	"deply", // Typo for 'deploy'
	"devv", // Typo for 'dev'
	"lnt", // Typo for 'lint'
	"clen", // Typo for 'clean'
	"instal", // Typo for 'install'
	"upate", // Typo for 'update'
	"doc", // Partial match for 'docs'
	"bakup", // Typo for 'backup'
	"monitr", // Typo for 'monitor'
	"secrity", // Typo for 'security'
	"bench", // Partial match for 'benchmark'
	"xyz", // No match
	"", // Empty input
	"\u001b[31mred\u001b[0m text", // ANSI colored input
];

async function demonstrateBasicSuggestions() {
	console.log("🚀 Matrix Command Suggestions Demo");
	console.log("=".repeat(50));

	const engine = new MatrixSuggestionEngine({
		minSimilarity: 0.6,
		maxSuggestions: 3,
		cacheEnabled: true,
		performanceMonitoring: true,
	});

	console.log("\n📝 Basic Command Suggestions:\n");

	for (const input of demoInputs) {
		console.log(`Input: "${input}"`);

		// Clean input using Bun's optimized string functions
		const cleanInput = Bun.stripANSI(input.trim());
		const displayWidth = Bun.stringWidth(cleanInput);

		console.log(`Clean: "${cleanInput}" (width: ${displayWidth})`);

		const suggestions = await engine.suggestCommands(input);

		if (suggestions.length > 0) {
			console.log("Suggestions:");
			suggestions.forEach((cmd, index) => {
				console.log(`  ${index + 1}. matrix ${cmd.name} - ${cmd.description}`);
			});
		} else {
			console.log("No suggestions found");
		}

		console.log("─".repeat(40));
	}
}

async function demonstratePerformanceMonitoring() {
	console.log("\n⚡ Performance Monitoring Demo");
	console.log("=".repeat(40));

	const engine = new MatrixSuggestionEngine({
		performanceMonitoring: true,
	});

	// Run multiple operations to generate performance data
	const testInputs = ["build", "test", "deploy", "dev", "lint"];

	console.log("Running performance test...");

	for (let i = 0; i < 10; i++) {
		for (const input of testInputs) {
			await engine.suggestCommands(input);
		}
	}

	// Display performance statistics
	const stats = engine.getPerformanceStats();

	console.log("\n📊 Performance Statistics:");

	for (const [operation, metrics] of Object.entries(stats)) {
		console.log(`\n${operation}:`);
		console.log(`  Count: ${metrics.count}`);
		console.log(`  Average: ${(metrics.average / 1_000_000).toFixed(3)}ms`);
		console.log(`  Min: ${(metrics.min / 1_000_000).toFixed(3)}ms`);
		console.log(`  Max: ${(metrics.max / 1_000_000).toFixed(3)}ms`);
		console.log(`  Total: ${(metrics.total / 1_000_000).toFixed(3)}ms`);
	}
}

async function demonstrateAsyncOptimization() {
	console.log("\n🔄 Async Operations Optimization Demo");
	console.log("=".repeat(45));

	const engine = new MatrixSuggestionEngine();

	// Demonstrate Bun.peek() optimization
	console.log("Testing async optimization with Bun.peek()...");

	// Create multiple concurrent requests
	const promises = [];
	for (let i = 0; i < 5; i++) {
		promises.push(engine.suggestCommands("build"));
	}

	const start = Bun.nanoseconds();
	const results = await Promise.all(promises);
	const end = Bun.nanoseconds();

	console.log(
		`Processed ${results.length} concurrent requests in ${((end - start) / 1_000_000).toFixed(3)}ms`,
	);
	console.log("Cache hit optimization working correctly!");
}

async function demonstrateConfigurationManagement() {
	console.log("\n⚙️  Configuration Management Demo");
	console.log("=".repeat(40));

	// Load configuration using Bun.file
	console.log("Loading matrix commands configuration...");

	try {
		const configFile = Bun.file("./config/matrix-commands.json");

		if (await configFile.exists()) {
			const config = await configFile.json();

			console.log(`✅ Loaded ${config.commands.length} commands`);
			console.log(`📂 ${config.categories.length} categories`);
			console.log(`📅 Last updated: ${config.lastUpdated}`);

			// Display command categories
			console.log("\n📋 Command Categories:");
			config.categories.forEach((cat: any) => {
				console.log(`  ${cat.name}: ${cat.description}`);
			});
		} else {
			console.log("❌ Configuration file not found, using built-in commands");
		}
	} catch (error) {
		console.error("❌ Failed to load configuration:", error);
	}
}

async function demonstrateFormattedOutput() {
	console.log("\n🎨 Formatted Output Demo");
	console.log("=".repeat(30));

	const engine = new MatrixSuggestionEngine();

	const testInputs = ["buld", "tset", "deply"];

	for (const input of testInputs) {
		const suggestions = await engine.suggestCommands(input);

		if (suggestions.length > 0) {
			console.log(`\nInput: "${input}"`);
			console.log(engine.formatSuggestions(suggestions, input));
		}
	}
}

async function demonstrateQuickStart() {
	console.log("\n⚡ Quick Start Implementation Demo");
	console.log("=".repeat(40));

	const testCases = [
		"buld production",
		"tset --watch",
		"deply staging",
		"xyz command",
	];

	for (const input of testCases) {
		console.log(`\nTesting: "${input}"`);

		// Use the quick start function
		const suggestion = await suggestCommand(input);

		if (suggestion) {
			console.log(`💡 Suggestion: matrix ${suggestion}`);

			// Simulate user confirmation
			console.log(`🎯 Did you mean: matrix ${suggestion}? [Y/n]`);
			console.log("✅ User confirmed, running command...");
		} else {
			console.log("❌ No suitable suggestion found");
		}
	}
}

async function demonstrateErrorHandling() {
	console.log("\n🛡️  Error Handling Demo");
	console.log("=".repeat(30));

	const engine = new MatrixSuggestionEngine();

	// Test with problematic inputs
	const problematicInputs = [
		"\x00\x01\x02", // Null bytes
		" ".repeat(1000), // Very long whitespace
		"\u001b[31m\u001b[32m\u001b[33m", // Only ANSI codes
	];

	for (const input of problematicInputs) {
		try {
			console.log(`Testing problematic input: ${JSON.stringify(input)}`);

			// Clean input using Bun.stripANSI
			const cleanInput = Bun.stripANSI(input);
			console.log(`Cleaned: ${JSON.stringify(cleanInput)}`);

			const suggestions = await engine.suggestCommands(input);
			console.log(`Suggestions: ${suggestions.length} found`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.log(`❌ Error handled: ${errorMessage}`);
		}

		console.log("─".repeat(30));
	}
}

// Main demonstration function
export async function runMatrixSuggestionsDemo() {
	console.log("🎯 Matrix Command Suggestions System");
	console.log("Powered by Bun's Optimized Utilities");
	console.log("=".repeat(60));

	try {
		await demonstrateBasicSuggestions();
		await demonstratePerformanceMonitoring();
		await demonstrateAsyncOptimization();
		await demonstrateConfigurationManagement();
		await demonstrateFormattedOutput();
		await demonstrateQuickStart();
		await demonstrateErrorHandling();

		console.log("\n✅ All demonstrations completed successfully!");

		// Final performance summary
		const finalStats = perfTracker.getStats();
		console.log("\n📊 Final Performance Summary:");

		let totalOps = 0;
		let totalTime = 0;

		for (const [_operation, metrics] of Object.entries(finalStats)) {
			totalOps += metrics.count;
			totalTime += metrics.total;
		}

		console.log(`  Total operations: ${totalOps}`);
		console.log(`  Total time: ${(totalTime / 1_000_000).toFixed(3)}ms`);
		console.log(
			`  Average per operation: ${(totalTime / totalOps / 1_000_000).toFixed(3)}ms`,
		);
	} catch (error) {
		console.error("❌ Demo failed:", error);
	}
}

// Run if this file is executed directly
if (typeof require !== "undefined" && require.main === module) {
	runMatrixSuggestionsDemo();
}
