#!/usr/bin/env bun

/**
 * Test Organization Script
 * Reorganizes and standardizes the test structure
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("🔧 Organizing test structure...\n");

// Define the organized test structure
const testStructure = {
	unit: {
		description: "Unit tests for individual modules and functions",
		directories: [
			"src/__tests__/unit/logging",
			"src/__tests__/unit/security",
			"src/__tests__/unit/utils",
			"src/__tests__/unit/cli",
			"src/__tests__/unit/integration",
			"src/__tests__/unit/rss",
		],
	},
	integration: {
		description: "Integration tests for module interactions",
		directories: [
			"src/__tests__/integration/security",
			"src/__tests__/integration/profile-rss",
			"src/__tests__/integration/api",
			"src/__tests__/integration/cli",
		],
	},
	edge: {
		description: "Edge cases and boundary condition tests",
		directories: [
			"src/__tests__/edge-cases/ssrf",
			"src/__tests__/edge-cases/logger",
			"src/__tests__/edge-cases/concurrency",
			"src/__tests__/edge-cases/security",
		],
	},
	e2e: {
		description: "End-to-end tests for complete workflows",
		directories: ["src/__tests__/e2e/workflows", "src/__tests__/e2e/scenarios"],
	},
	performance: {
		description: "Performance and benchmark tests",
		directories: [
			"src/__tests__/performance/benchmarks",
			"src/__tests__/performance/load",
		],
	},
};

// Create the organized directory structure
for (const [category, config] of Object.entries(testStructure)) {
	console.log(`📁 Creating ${category} test directories...`);

	for (const dir of config.directories) {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
			console.log(`  Created: ${dir}`);

			// Create an index file for each directory
			const indexPath = join(dir, "index.ts");
			if (!existsSync(indexPath)) {
				writeFileSync(
					indexPath,
					`// ${category} tests for ${dir.split("/").pop()}\n// Add test imports here\n`,
				);
			}
		}
	}
}

// Create a test configuration file
writeFileSync(
	"src/__tests__/test-config.ts",
	`/**
 * Test Configuration
 * Central configuration for all test suites
 */

export const TEST_CONFIG = {
  // Timeout settings
  TIMEOUT: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    E2E: 60000
  },
  
  // Test data paths
  PATHS: {
    FIXTURES: "./fixtures",
    MOCKS: "./mocks",
    TEMP: "./temp"
  },
  
  // Environment settings
  ENV: {
    TEST: "test",
    CI: process.env.CI === "true",
    DEBUG: process.env.DEBUG === "true"
  },
  
  // Feature flags for testing
  FEATURES: {
    SKIP_SLOW: process.env.SKIP_SLOW_TESTS === "true",
    SKIP_NETWORK: process.env.SKIP_NETWORK_TESTS === "true",
    PARALLEL: !process.env.CI // Run in parallel unless in CI
  }
} as const;

// Test helpers
export const createTestTimeout = (ms: number) => ({
  timeout: TEST_CONFIG.TIMEOUT[ms as keyof typeof TEST_CONFIG.TIMEOUT] || ms
});

export const skipIfCI = () => {
  if (TEST_CONFIG.ENV.CI) {
    test.skip("Skipping in CI environment");
  }
};

export const skipIfSlow = () => {
  if (TEST_CONFIG.FEATURES.SKIP_SLOW) {
    test.skip("Skipping slow tests");
  }
};
`,
);

// Create a test runner configuration
writeFileSync(
	"src/__tests__/runner.ts",
	`/**
 * Test Runner Configuration
 * Custom test runner with organized test execution
 */

import { TEST_CONFIG } from "./test-config";

// Test categories with their execution order
const TEST_CATEGORIES = [
  { name: "unit", pattern: "src/__tests__/unit/**/*.test.ts", parallel: true },
  { name: "integration", pattern: "src/__tests__/integration/**/*.test.ts", parallel: false },
  { name: "edge", pattern: "src/__tests__/edge-cases/**/*.test.ts", parallel: true },
  { name: "performance", pattern: "src/__tests__/performance/**/*.test.ts", parallel: false },
  { name: "e2e", pattern: "src/__tests__/e2e/**/*.test.ts", parallel: false }
] as const;

export function runTestsByCategory(category: keyof typeof TEST_CATEGORIES) {
  const config = TEST_CATEGORIES.find(c => c.name === category);
  if (!config) {
    throw new Error(\`Unknown test category: \${category}\`);
  }
  
  console.log(\`🧪 Running \${category} tests...\`);
  
  return Bun.$\`bun test --preload ./tests/setup.ts \${config.pattern} \${config.parallel ? "" : "--no-parallel"}\`;
}

// Run all tests in order
export async function runAllTests() {
  console.log("🚀 Running all tests in organized order...");
  
  for (const category of TEST_CATEGORIES) {
    try {
      await runTestsByCategory(category.name as keyof typeof TEST_CATEGORIES);
      console.log(\`✅ \${category.name} tests passed\`);
    } catch (error) {
      console.error(\`❌ \${category.name} tests failed:\`, error);
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
`,
);

// Update package.json with new test scripts
const packageJsonPath = "package.json";
if (existsSync(packageJsonPath)) {
	const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());

	// Add new test scripts
	packageJson.scripts = {
		...packageJson.scripts,
		"test:unit":
			"bun test src/__tests__/unit/**/*.test.ts --preload ./tests/setup.ts",
		"test:integration":
			"bun test src/__tests__/integration/**/*.test.ts --preload ./tests/setup.ts --no-parallel",
		"test:edge":
			"bun test src/__tests__/edge-cases/**/*.test.ts --preload ./tests/setup.ts",
		"test:e2e":
			"bun test src/__tests__/e2e/**/*.test.ts --preload ./tests/setup.ts --no-parallel",
		"test:performance":
			"bun test src/__tests__/performance/**/*.test.ts --preload ./tests/setup.ts --no-parallel",
		"test:organized": "bun run src/__tests__/runner.ts",
		"test:security":
			"bun test src/__tests__/unit/security/**/*.test.ts src/__tests__/integration/security/**/*.test.ts src/__tests__/edge-cases/security/**/*.test.ts --preload ./tests/setup.ts",
	};

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
	console.log("✅ Updated package.json with organized test scripts");
}

// Create a test documentation file
writeFileSync(
	"src/__tests__/README.md",
	`# Test Organization

This directory contains organized tests for the bun-toml-secrets-editor project.

## Test Structure

### 📁 Unit Tests (\`unit/\`)
Tests for individual modules and functions in isolation.
- **logging/**: Logger functionality and configuration
- **security/**: Security utilities and validation
- **utils/**: Helper functions and utilities
- **cli/**: CLI command implementations
- **integration/**: Integration module functions
- **rss/**: RSS fetching and processing

### 🔗 Integration Tests (\`integration/\`)
Tests for module interactions and workflows.
- **security/**: Security integration scenarios
- **profile-rss/**: Profile-RSS bridge functionality
- **api/**: API endpoint testing
- **cli/**: CLI workflow testing

### ⚡ Edge Cases (\`edge-cases/\`)
Tests for boundary conditions and unusual scenarios.
- **ssrf/**: SSRF protection edge cases
- **logger/**: Logger concurrency and edge cases
- **concurrency/**: Concurrent access patterns
- **security/**: Security bypass attempts

### 🎯 End-to-End Tests (\`e2e/\`)
Complete workflow tests from user perspective.
- **workflows/**: Full user workflows
- **scenarios/**: Real-world usage scenarios

### ⚡ Performance Tests (\`performance/\`)
Benchmarks and performance validation.
- **benchmarks/**: Performance benchmarks
- **load/**: Load testing scenarios

## Running Tests

### By Category
\`\`\`bash
# Run all unit tests
bun run test:unit

# Run integration tests
bun run test:integration

# Run edge case tests
bun run test:edge

# Run E2E tests
bun run test:e2e

# Run performance tests
bun run test:performance
\`\`\`

### Organized Execution
\`\`\`bash
# Run all tests in organized order
bun run test:organized

# Run specific category
bun run src/__tests__/runner.ts unit
\`\`\`

### Security Tests
\`\`\`bash
# Run all security-related tests
bun run test:security
\`\`\`

## Test Configuration

See \`test-config.ts\` for:
- Timeout settings
- Environment configuration
- Feature flags
- Test helpers

## Writing New Tests

1. Choose the appropriate category (unit, integration, edge, e2e, performance)
2. Create test file in the corresponding directory
3. Use the test configuration and helpers from \`test-config.ts\`
4. Follow the naming convention: \`*.test.ts\`

## Test Data

- \`fixtures/\`: Static test data
- \`mocks/\`: Mock implementations
- \`temp/\`: Temporary files for testing
`,
);

console.log("\n✅ Test structure organized successfully!");
console.log("\n📋 Next steps:");
console.log("1. Move existing tests to appropriate directories");
console.log("2. Update test imports to use new structure");
console.log("3. Run 'bun run test:organized' to verify");
console.log("4. Update CI/CD to use new test scripts");
