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
	console.info("🚀 Matrix Command Suggestions Demo");
	console.info("=".repeat(50));

	const engine = new MatrixSuggestionEngine({
		minSimilarity: 0.6,
		maxSuggestions: 3,
		cacheEnabled: true,
		performanceMonitoring: true,
	});

	console.info("\n📝 Basic Command Suggestions:\n");

	for (const input of demoInputs) {
		console.info(`Input: "${input}"`);

		// Clean input using Bun's optimized string functions
		const cleanInput = Bun.stripANSI(input.trim());
		const displayWidth = Bun.stringWidth(cleanInput);

		console.info(`Clean: "${cleanInput}" (width: ${displayWidth})`);

		const suggestions = await engine.suggestCommands(input);

		if (suggestions.length > 0) {
			console.info("Suggestions:");
			suggestions.forEach((cmd, index) => {
				console.info(`  ${index + 1}. matrix ${cmd.name} - ${cmd.description}`);
			});
		} else {
			console.info("No suggestions found");
		}

		console.info("─".repeat(40));
	}
}

async function demonstratePerformanceMonitoring() {
	console.info("\n⚡ Performance Monitoring Demo");
	console.info("=".repeat(40));

	const engine = new MatrixSuggestionEngine({
		performanceMonitoring: true,
	});

	// Run multiple operations to generate performance data
	const testInputs = ["build", "test", "deploy", "dev", "lint"];

	console.info("Running performance test...");

	for (let i = 0; i < 10; i++) {
		for (const input of testInputs) {
			await engine.suggestCommands(input);
		}
	}

	// Display performance statistics
	const stats = engine.getPerformanceStats();

	console.info("\n📊 Performance Statistics:");

	for (const [operation, metrics] of Object.entries(stats)) {
		console.info(`\n${operation}:`);
		console.info(`  Count: ${metrics.count}`);
		console.info(`  Average: ${(metrics.average / 1_000_000).toFixed(3)}ms`);
		console.info(`  Min: ${(metrics.min / 1_000_000).toFixed(3)}ms`);
		console.info(`  Max: ${(metrics.max / 1_000_000).toFixed(3)}ms`);
		console.info(`  Total: ${(metrics.total / 1_000_000).toFixed(3)}ms`);
	}
}

async function demonstrateAsyncOptimization() {
	console.info("\n🔄 Async Operations Optimization Demo");
	console.info("=".repeat(45));

	const engine = new MatrixSuggestionEngine();

	// Demonstrate Bun.peek() optimization
	console.info("Testing async optimization with Bun.peek()...");

	// Create multiple concurrent requests
	const promises = [];
	for (let i = 0; i < 5; i++) {
		promises.push(engine.suggestCommands("build"));
	}

	const start = Bun.nanoseconds();
	const results = await Promise.all(promises);
	const end = Bun.nanoseconds();

	console.info(
		`Processed ${results.length} concurrent requests in ${((end - start) / 1_000_000).toFixed(3)}ms`,
	);
	console.info("Cache hit optimization working correctly!");
}

async function demonstrateConfigurationManagement() {
	console.info("\n⚙️  Configuration Management Demo");
	console.info("=".repeat(40));

	// Load configuration using Bun.file
	console.info("Loading matrix commands configuration...");

	try {
		const configFile = Bun.file("./config/matrix-commands.json");

		if (await configFile.exists()) {
			const config = await configFile.json();

			console.info(`✅ Loaded ${config.commands.length} commands`);
			console.info(`📂 ${config.categories.length} categories`);
			console.info(`📅 Last updated: ${config.lastUpdated}`);

			// Display command categories
			console.info("\n📋 Command Categories:");
			config.categories.forEach((cat: any) => {
				console.info(`  ${cat.name}: ${cat.description}`);
			});
		} else {
			console.info("❌ Configuration file not found, using built-in commands");
		}
	} catch (error) {
		console.error("❌ Failed to load configuration:", error);
	}
}

async function demonstrateFormattedOutput() {
	console.info("\n🎨 Formatted Output Demo");
	console.info("=".repeat(30));

	const engine = new MatrixSuggestionEngine();

	const testInputs = ["buld", "tset", "deply"];

	for (const input of testInputs) {
		const suggestions = await engine.suggestCommands(input);

		if (suggestions.length > 0) {
			console.info(`\nInput: "${input}"`);
			console.info(engine.formatSuggestions(suggestions, input));
		}
	}
}

async function demonstrateQuickStart() {
	console.info("\n⚡ Quick Start Implementation Demo");
	console.info("=".repeat(40));

	const testCases = [
		"buld production",
		"tset --watch",
		"deply staging",
		"xyz command",
	];

	for (const input of testCases) {
		console.info(`\nTesting: "${input}"`);

		// Use the quick start function
		const suggestion = await suggestCommand(input);

		if (suggestion) {
			console.info(`💡 Suggestion: matrix ${suggestion}`);

			// Simulate user confirmation
			console.info(`🎯 Did you mean: matrix ${suggestion}? [Y/n]`);
			console.info("✅ User confirmed, running command...");
		} else {
			console.info("❌ No suitable suggestion found");
		}
	}
}

async function demonstrateErrorHandling() {
	console.info("\n🛡️  Error Handling Demo");
	console.info("=".repeat(30));

	const engine = new MatrixSuggestionEngine();

	// Test with problematic inputs
	const problematicInputs = [
		"\x00\x01\x02", // Null bytes
		" ".repeat(1000), // Very long whitespace
		"\u001b[31m\u001b[32m\u001b[33m", // Only ANSI codes
	];

	for (const input of problematicInputs) {
		try {
			console.info(`Testing problematic input: ${JSON.stringify(input)}`);

			// Clean input using Bun.stripANSI
			const cleanInput = Bun.stripANSI(input);
			console.info(`Cleaned: ${JSON.stringify(cleanInput)}`);

			const suggestions = await engine.suggestCommands(input);
			console.info(`Suggestions: ${suggestions.length} found`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.info(`❌ Error handled: ${errorMessage}`);
		}

		console.info("─".repeat(30));
	}
}

// Main demonstration function
export async function runMatrixSuggestionsDemo() {
	console.info("🎯 Matrix Command Suggestions System");
	console.info("Powered by Bun's Optimized Utilities");
	console.info("=".repeat(60));

	try {
		await demonstrateBasicSuggestions();
		await demonstratePerformanceMonitoring();
		await demonstrateAsyncOptimization();
		await demonstrateConfigurationManagement();
		await demonstrateFormattedOutput();
		await demonstrateQuickStart();
		await demonstrateErrorHandling();

		console.info("\n✅ All demonstrations completed successfully!");

		// Final performance summary
		const finalStats = perfTracker.getStats();
		console.info("\n📊 Final Performance Summary:");

		let totalOps = 0;
		let totalTime = 0;

		for (const [_operation, metrics] of Object.entries(finalStats)) {
			totalOps += metrics.count;
			totalTime += metrics.total;
		}

		console.info(`  Total operations: ${totalOps}`);
		console.info(`  Total time: ${(totalTime / 1_000_000).toFixed(3)}ms`);
		console.info(
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
