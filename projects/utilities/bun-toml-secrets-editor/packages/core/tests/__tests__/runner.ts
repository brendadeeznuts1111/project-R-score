/**
 * Test Runner Configuration
 * Custom test runner with organized test execution
 */

// Test categories with their execution order
const TEST_CATEGORIES = [
	{ name: "unit", pattern: "src/__tests__/unit/**/*.test.ts", parallel: true },
	{
		name: "integration",
		pattern: "src/__tests__/integration/**/*.test.ts",
		parallel: false,
	},
	{
		name: "edge",
		pattern: "src/__tests__/edge-cases/**/*.test.ts",
		parallel: true,
	},
	{
		name: "performance",
		pattern: "src/__tests__/performance/**/*.test.ts",
		parallel: false,
	},
	{ name: "e2e", pattern: "src/__tests__/e2e/**/*.test.ts", parallel: false },
] as const;

export function runTestsByCategory(category: keyof typeof TEST_CATEGORIES) {
	const config = TEST_CATEGORIES.find((c) => c.name === category);
	if (!config) {
		throw new Error(`Unknown test category: ${category}`);
	}

	console.log(`🧪 Running ${category} tests...`);

	return Bun.$`bun test --preload ./tests/setup.ts ${config.pattern} ${config.parallel ? "" : "--no-parallel"}`;
}

// Run all tests in order
export async function runAllTests() {
	console.log("🚀 Running all tests in organized order...");

	for (const category of TEST_CATEGORIES) {
		try {
			await runTestsByCategory(category.name as keyof typeof TEST_CATEGORIES);
			console.log(`✅ ${category.name} tests passed`);
		} catch (error) {
			console.error(`❌ ${category.name} tests failed:`, error);
			process.exit(1);
		}
	}

	console.log("🎉 All tests passed!");
}

// CLI interface
if (import.meta.main) {
	const category = process.argv[2];

	if (category) {
		runTestsByCategory(category as keyof typeof TEST_CATEGORIES);
	} else {
		runAllTests();
	}
}
