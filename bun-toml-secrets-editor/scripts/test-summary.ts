#!/usr/bin/env bun
/**
 * Test Execution Summary
 * Shows the organized test structure and provides quick access to test runs
 */

console.log("🧪 Test Organization Summary\n");

const testCategories = {
	"Unit Tests": {
		pattern: "src/__tests__/unit/**/*.test.ts",
		description: "Individual module and function tests",
		command: "bun run test:unit",
		count: 0,
	},
	"Integration Tests": {
		pattern: "src/__tests__/integration/**/*.test.ts",
		description: "Module interaction and workflow tests",
		command: "bun run test:integration",
		count: 0,
	},
	"Edge Cases": {
		pattern: "src/__tests__/edge-cases/**/*.test.ts",
		description: "Boundary condition and unusual scenario tests",
		command: "bun run test:edge",
		count: 0,
	},
	"E2E Tests": {
		pattern: "src/__tests__/e2e/**/*.test.ts",
		description: "End-to-end workflow tests",
		command: "bun run test:e2e",
		count: 0,
	},
	"Performance Tests": {
		pattern: "src/__tests__/performance/**/*.test.ts",
		description: "Benchmarks and performance validation",
		command: "bun run test:performance",
		count: 0,
	},
};

// Count test files in each category
async function countTests() {
	for (const [_name, config] of Object.entries(testCategories)) {
		try {
			const result =
				await Bun.$`find src/__tests__ -name "*.test.ts" -path "${config.pattern}" | wc -l`.text();
			config.count = parseInt(result.trim(), 10);
		} catch {
			config.count = 0;
		}
	}
}

async function displaySummary() {
	await countTests();

	console.log("📊 Test Categories:");
	console.log("");

	let totalTests = 0;
	for (const [name, config] of Object.entries(testCategories)) {
		totalTests += config.count;
		const status = config.count > 0 ? "✅" : "⚪";
		console.log(
			`${status} ${name.padEnd(20)} ${config.count.toString().padStart(3)} files`,
		);
		console.log(`   ${config.description}`);
		console.log(`   Command: ${config.command}`);
		console.log("");
	}

	console.log(`📈 Total Test Files: ${totalTests}`);
	console.log("");

	console.log("🚀 Quick Commands:");
	console.log("");
	console.log("Run all tests in order:");
	console.log("  bun run test:organized");
	console.log("");
	console.log("Run by category:");
	Object.entries(testCategories).forEach(([name, config]) => {
		if (config.count > 0) {
			console.log(`  ${config.command.padEnd(25)} # ${name}`);
		}
	});
	console.log("");
	console.log("Security tests:");
	console.log("  bun run test:security");
	console.log("");
	console.log("Custom runner:");
	console.log("  bun run src/__tests__/runner.ts [category]");
	console.log("");

	console.log("📁 Test Structure:");
	console.log("src/__tests__/");
	console.log("├── unit/           # Individual module tests");
	console.log("├── integration/    # Module interaction tests");
	console.log("├── edge-cases/     # Boundary condition tests");
	console.log("├── e2e/            # End-to-end workflow tests");
	console.log("├── performance/    # Benchmark and load tests");
	console.log("├── fixtures/       # Test data");
	console.log("├── mocks/          # Mock implementations");
	console.log("├── setup.ts        # Test setup and configuration");
	console.log("├── test-config.ts  # Test configuration");
	console.log("├── runner.ts       # Custom test runner");
	console.log("└── README.md       # Test documentation");
}

displaySummary().catch(console.error);
