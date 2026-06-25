#!/usr/bin/env bun
/**
 * Coverage Validation Script
 * Enforces minimum coverage thresholds with detailed reporting
 */

import { $ } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface CoverageThresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

interface CoverageData {
  lines: { pct: number };
  functions: { pct: number };
  branches: { pct: number };
  statements: { pct: number };
}

const THRESHOLDS: CoverageThresholds = {
  lines: 80,
  functions: 75,
  branches: 75,
  statements: 80,
};

const COVERAGE_DIR = "coverage";

function parseCoverageData(): CoverageData | null {
  // Look for lcov-report or coverage-summary.json
  const lcovPath = join(COVERAGE_DIR, "lcov-report", "index.html");
  const jsonPath = join(COVERAGE_DIR, "coverage-summary.json");

  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
      return data.total;
    } catch (error) {
      console.warn("Failed to parse coverage-summary.json:", error);
    }
  }

  // Fallback: parse lcov-report/index.html (basic extraction)
  if (existsSync(lcovPath)) {
    try {
      const html = readFileSync(lcovPath, "utf-8");

      // Extract coverage percentages from HTML (basic regex approach)
      const extractPct = (label: string): number => {
        const regex = new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)%`);
        const match = html.match(regex);
        return match ? parseFloat(match[1]) : 0;
      };

      return {
        lines: { pct: extractPct("Lines") },
        functions: { pct: extractPct("Functions") },
        branches: { pct: extractPct("Branches") },
        statements: { pct: extractPct("Statements") },
      };
    } catch (error) {
      console.warn("Failed to parse lcov-report:", error);
    }
  }

  return null;
}

function generateCoverageReport(coverage: CoverageData): {
  passed: boolean;
  violations: string[];
  summary: string[];
} {
  const violations: string[] = [];
  const summary: string[] = [];

  const checkThreshold = (
    name: keyof CoverageThresholds,
    actual: number,
    threshold: number
  ) => {
    const status = actual >= threshold ? "✅" : "❌";
    const color = actual >= threshold ? "32" : "31"; // Green/Red

    summary.push(`${status} ${name.padEnd(10)}: ${actual.toFixed(1).padStart(5)}% (min: ${threshold}%)`);

    if (actual < threshold) {
      violations.push(`${name}: ${actual.toFixed(1)}% < ${threshold}%`);
    }
  };

  checkThreshold("lines", coverage.lines.pct, THRESHOLDS.lines);
  checkThreshold("functions", coverage.functions.pct, THRESHOLDS.functions);
  checkThreshold("branches", coverage.branches.pct, THRESHOLDS.branches);
  checkThreshold("statements", coverage.statements.pct, THRESHOLDS.statements);

  return {
    passed: violations.length === 0,
    violations,
    summary,
  };
}

function generateBadge(coverage: CoverageData): string {
  const lines = Math.round(coverage.lines.pct);
  const color = lines >= THRESHOLDS.lines ? "brightgreen" : lines >= 70 ? "yellow" : "red";
  return `https://img.shields.io/badge/coverage-${lines}%25-${color}`;
}

async function main() {
  console.info("\n📊 Running comprehensive test coverage analysis\n");

  try {
    // Run tests with coverage
    console.info("Running tests with coverage...");
    await $`bun test --coverage test/`;

    // Parse coverage data
    const coverage = parseCoverageData();
    if (!coverage) {
      console.error("❌ Could not parse coverage data");
      console.info("Make sure coverage files are generated:");
      console.info("  - coverage/coverage-summary.json");
      console.info("  - coverage/lcov-report/index.html");
      process.exit(1);
    }

    console.info("\n📈 Coverage Results:");
    console.info("=".repeat(50));

    const report = generateCoverageReport(coverage);

    // Display results
    report.summary.forEach(line => console.info(line));

    console.info("\n" + "=".repeat(50));

    if (report.passed) {
      console.info("🎉 ALL COVERAGE THRESHOLDS MET!");
      console.info(`\nBadge URL: ${generateBadge(coverage)}`);
    } else {
      console.info("❌ COVERAGE THRESHOLDS NOT MET");
      console.info("\nViolations:");
      report.violations.forEach(violation => console.info(`  • ${violation}`));

      console.info("\n💡 Suggestions:");
      console.info("  • Add tests for uncovered code paths");
      console.info("  • Review test exclusions in uncovered files");
      console.info("  • Consider adding integration tests for complex logic");
      console.info("  • Use --coverage-reporter=lcov for detailed HTML reports");

      process.exit(1);
    }

    console.info("\n✅ Coverage analysis complete\n");

  } catch (error) {
    console.error("\n❌ Coverage analysis failed\n");
    console.error("Error:", error instanceof Error ? error.message : error);

    console.info("\n🔧 Troubleshooting:");
    console.info("  • Ensure all test files are discoverable");
    console.info("  • Check for TypeScript compilation errors");
    console.info("  • Verify test harness imports are correct");
    console.info("  • Run 'bun test' manually to check for test failures");

    process.exit(1);
  }
}

main();
