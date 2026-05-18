#!/usr/bin/env bun
/**
 * 🚀 Unified Benchmark Runner
 *
 * Runs all benchmark suites with proper organization and reporting
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = './reports';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const JSON_REPORT = join(RESULTS_DIR, `benchmark-${TIMESTAMP}.json`);
const MD_REPORT = join(RESULTS_DIR, `benchmark-${TIMESTAMP}.md`);

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

console.info('🚀 Nolarose Unified Benchmark Suite');
console.info('===================================\n');

const results = {
  timestamp: new Date().toISOString(),
  suites: {} as Record<string, any[]>,
  summary: {
    totalBenchmarks: 0,
    passed: 0,
    failed: 0,
    warnings: [] as string[]
  }
};

// Run a benchmark file and capture results
async function runBenchmark(category: string, file: string): Promise<any> {
  console.info(`\n📊 Running ${category}/${file}...`);

  try {
    const startTime = performance.now();

    // Set JSON output mode for structured results
    process.env.BENCHMARK_RUNNER = '1';

    // Import and run the benchmark
    const module = await import(`./${category}/${file}`);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.info(`✅ Completed in ${duration.toFixed(2)}ms`);

    return {
      status: 'passed',
      duration,
      file,
      category
    };
  } catch (error: unknown) {
    console.error(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    results.summary.failed++;

    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      file,
      category
    };
  }
}

// Get all benchmark files
function getBenchmarkFiles(category: string): string[] {
  const categoryPath = join(process.cwd(), category);

  if (!existsSync(categoryPath)) {
    console.warn(`⚠️  Category ${category} not found`);
    return [];
  }

  return readdirSync(categoryPath)
    .filter((file: string) => file.endsWith('.ts'))
    .filter((file: string) => !file.includes('.test.ts') && !file.includes('.spec.ts'));
}

// Main execution
async function runAllBenchmarks() {
  const categories = ['core', 'utils', 'performance', 'skills'];

  for (const category of categories) {
    console.info(`\n🔍 ${category.toUpperCase()} BENCHMARKS`);
    console.info('-'.repeat(40));

    const files = getBenchmarkFiles(category);
    results.suites[category] = [];

    for (const file of files) {
      const result = await runBenchmark(category, file);
      results.suites[category].push(result);

      if (result.status === 'passed') {
        results.summary.passed++;
      }

      results.summary.totalBenchmarks++;
    }
  }

  // Generate reports
  generateReports();

  // Print summary
  printSummary();
}

function generateReports() {
  // JSON Report
  writeFileSync(JSON_REPORT, JSON.stringify(results, null, 2));
  console.info(`\n📄 JSON report saved: ${JSON_REPORT}`);

  // Markdown Report
  const mdContent = generateMarkdownReport();
  writeFileSync(MD_REPORT, mdContent);
  console.info(`📄 Markdown report saved: ${MD_REPORT}`);
}

function generateMarkdownReport(): string {
  let md = `# Benchmark Report - ${results.timestamp}\n\n`;

  md += `## Summary\n\n`;
  md += `- **Total Benchmarks**: ${results.summary.totalBenchmarks}\n`;
  md += `- **Passed**: ${results.summary.passed}\n`;
  md += `- **Failed**: ${results.summary.failed}\n`;
  md += `- **Success Rate**: ${((results.summary.passed / results.summary.totalBenchmarks) * 100).toFixed(1)}%\n\n`;

  for (const [category, benchmarks] of Object.entries(results.suites)) {
    if ((benchmarks as any[]).length === 0) continue;

    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

    for (const bench of benchmarks as any[]) {
      const status = bench.status === 'passed' ? '✅' : '❌';
      md += `${status} **${bench.file}** - ${bench.duration?.toFixed(2) || 'N/A'}ms\n`;

      if (bench.error) {
        md += `  - Error: ${bench.error}\n`;
      }
    }
    md += '\n';
  }

  if (results.summary.warnings.length > 0) {
    md += `## Warnings\n\n`;
    for (const warning of results.summary.warnings) {
      md += `- ⚠️ ${warning}\n`;
    }
  }

  return md;
}

function printSummary() {
  console.info('\n📈 BENCHMARK SUMMARY');
  console.info('='.repeat(80));
  console.info(`Total Benchmarks: ${results.summary.totalBenchmarks}`);
  console.info(`Passed: ${results.summary.passed} ✅`);
  console.info(`Failed: ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : '✅'}`);
  console.info(`Success Rate: ${((results.summary.passed / results.summary.totalBenchmarks) * 100).toFixed(1)}%`);

  if (results.summary.failed > 0) {
    console.info('\n⚠️  Some benchmarks failed. Check reports for details.');
  } else {
    console.info('\n🎉 All benchmarks passed successfully!');
  }

  console.info('\n📊 Reports generated:');
  console.info(`  JSON: ${JSON_REPORT}`);
  console.info(`  Markdown: ${MD_REPORT}`);
}

// Run if executed directly
if (import.meta.main) {
  runAllBenchmarks().catch(console.error);
}

export { runAllBenchmarks, runBenchmark, getBenchmarkFiles };
