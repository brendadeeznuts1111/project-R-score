#!/usr/bin/env bun

/**
 * @fire22/version-manager Benchmark Suite
 *
 * Comprehensive performance benchmarking using Bun.nanoseconds()
 */

import { VersionUtils } from './index';

// Colors for output
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number; // milliseconds
  avgTime: number; // microseconds per operation
  opsPerSecond: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatTime(microseconds: number): string {
  if (microseconds < 1) {
    return `${(microseconds * 1000).toFixed(2)}ns`;
  } else if (microseconds < 1000) {
    return `${microseconds.toFixed(2)}μs`;
  } else {
    return `${(microseconds / 1000).toFixed(2)}ms`;
  }
}

function runBenchmark(
  name: string,
  operation: () => void,
  iterations: number = 100000
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
    operation();
  }

  // Actual benchmark
  const startTime = Bun.nanoseconds();

  for (let i = 0; i < iterations; i++) {
    operation();
  }

  const endTime = Bun.nanoseconds();
  const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  const avgTime = (totalTime / iterations) * 1000; // Convert to microseconds
  const opsPerSecond = Math.round(1000000 / avgTime); // Operations per second

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime,
    opsPerSecond,
  };
}

async function main() {
  console.info(colors.bold(colors.cyan('🏁 Fire22 Version Manager Benchmark Suite')));
  console.info(colors.cyan('=' + '='.repeat(60)));
  console.info(`Runtime: ${colors.yellow(`Bun ${Bun.version}`)}`);
  console.info(`Platform: ${colors.yellow(`${process.platform} ${process.arch}`)}`);
  console.info(`Date: ${colors.yellow(new Date().toISOString())}`);
  console.info();

  const results: BenchmarkResult[] = [];
  const iterations = 100000;

  // 1. Version Parsing Benchmark
  console.info(colors.blue('📊 Version Parsing Performance'));
  console.info('-'.repeat(40));

  const parseSimple = runBenchmark(
    'Parse Simple Version (3.1.0)',
    () => VersionUtils.parse('3.1.0'),
    iterations
  );
  results.push(parseSimple);

  const parseComplex = runBenchmark(
    'Parse Complex Version (3.1.0-beta.1+build.123)',
    () => VersionUtils.parse('3.1.0-beta.1+build.123'),
    iterations
  );
  results.push(parseComplex);

  const parsePrerelease = runBenchmark(
    'Parse Prerelease (1.0.0-alpha.2)',
    () => VersionUtils.parse('1.0.0-alpha.2'),
    iterations
  );
  results.push(parsePrerelease);

  // 2. Version Comparison Benchmark
  console.info('\n' + colors.blue('🔄 Version Comparison Performance'));
  console.info('-'.repeat(40));

  const compareSimple = runBenchmark(
    'Compare Simple Versions (3.1.0 vs 3.0.0)',
    () => VersionUtils.compare('3.1.0', '3.0.0'),
    iterations
  );
  results.push(compareSimple);

  const comparePrerelease = runBenchmark(
    'Compare Prerelease (3.1.0-beta.1 vs 3.1.0-beta.2)',
    () => VersionUtils.compare('3.1.0-beta.1', '3.1.0-beta.2'),
    iterations
  );
  results.push(comparePrerelease);

  const compareComplex = runBenchmark(
    'Compare Complex (2.0.0-rc.1+exp vs 2.0.0)',
    () => VersionUtils.compare('2.0.0-rc.1+exp.sha.5114f85', '2.0.0'),
    iterations
  );
  results.push(compareComplex);

  // 3. Range Satisfaction Benchmark
  console.info('\n' + colors.blue('✅ Range Satisfaction Performance'));
  console.info('-'.repeat(40));

  const satisfiesSimple = runBenchmark(
    'Simple Range (3.1.0 satisfies ^3.0.0)',
    () => VersionUtils.satisfies('3.1.0', '^3.0.0'),
    iterations
  );
  results.push(satisfiesSimple);

  const satisfiesTilde = runBenchmark(
    'Tilde Range (3.1.2 satisfies ~3.1.0)',
    () => VersionUtils.satisfies('3.1.2', '~3.1.0'),
    iterations
  );
  results.push(satisfiesTilde);

  const satisfiesComplex = runBenchmark(
    'Complex Range (3.1.0 satisfies >=3.0.0 <4.0.0)',
    () => VersionUtils.satisfies('3.1.0', '>=3.0.0 <4.0.0'),
    iterations
  );
  results.push(satisfiesComplex);

  // 4. Version Validation Benchmark
  console.info('\n' + colors.blue('🔍 Version Validation Performance'));
  console.info('-'.repeat(40));

  const validateValid = runBenchmark(
    'Validate Valid Version (3.1.0-beta.1)',
    () => VersionUtils.isValid('3.1.0-beta.1'),
    iterations
  );
  results.push(validateValid);

  const validateInvalid = runBenchmark(
    'Validate Invalid Version (not.a.version)',
    () => VersionUtils.isValid('not.a.version'),
    iterations
  );
  results.push(validateInvalid);

  // 5. Version Sorting Benchmark
  console.info('\n' + colors.blue('🔄 Version Sorting Performance'));
  console.info('-'.repeat(40));

  const testVersions = [
    '1.0.0',
    '2.0.0-alpha.1',
    '1.2.0',
    '2.0.0',
    '1.10.0',
    '2.0.0-beta.1',
    '1.1.0',
    '2.0.0-rc.1',
    '3.0.0',
    '1.0.0-alpha.1',
  ];

  const sortVersions = runBenchmark(
    'Sort 10 Versions',
    () => VersionUtils.sort([...testVersions]),
    iterations / 10 // Fewer iterations for sorting
  );
  results.push(sortVersions);

  const filterVersions = runBenchmark(
    'Filter 10 Versions by Range (^2.0.0)',
    () => VersionUtils.filterByRange([...testVersions], '^2.0.0'),
    iterations / 10
  );
  results.push(filterVersions);

  // 6. Next Version Generation Benchmark
  console.info('\n' + colors.blue('🚀 Version Generation Performance'));
  console.info('-'.repeat(40));

  const nextVersions = runBenchmark(
    'Generate Next Versions (patch, minor, major, prerelease)',
    () => VersionUtils.getNextVersions('3.1.0'),
    iterations
  );
  results.push(nextVersions);

  // 7. Memory Usage Test
  console.info('\n' + colors.blue('💾 Memory Usage Test'));
  console.info('-'.repeat(40));

  const initialMemory = process.memoryUsage();

  // Create many version objects to test memory
  const versions: any[] = [];
  for (let i = 0; i < 10000; i++) {
    versions.push(VersionUtils.parse(`${i}.0.0`));
  }

  const afterMemory = process.memoryUsage();
  const memoryDelta = afterMemory.heapUsed - initialMemory.heapUsed;

  console.info(
    `Memory for 10,000 version objects: ${colors.cyan(formatNumber(Math.round(memoryDelta / 1024)))}KB`
  );
  console.info(`Average per version: ${colors.cyan(Math.round(memoryDelta / 10000))}bytes`);

  // Results Summary
  console.info('\n' + colors.bold(colors.green('📊 BENCHMARK RESULTS SUMMARY')));
  console.info(colors.green('=' + '='.repeat(80)));

  const tableData = results.map(result => [
    result.operation,
    formatNumber(result.iterations),
    `${result.totalTime.toFixed(2)}ms`,
    formatTime(result.avgTime),
    formatNumber(result.opsPerSecond),
  ]);

  // Calculate column widths
  const headers = ['Operation', 'Iterations', 'Total Time', 'Avg Time', 'Ops/Second'];
  const colWidths = headers.map((header, i) =>
    Math.max(header.length, ...tableData.map(row => row[i].length))
  );

  // Print table header
  console.info();
  const headerRow = headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ');
  console.info(colors.bold(headerRow));
  console.info(colors.bold('-'.repeat(headerRow.length)));

  // Print table rows
  tableData.forEach(row => {
    const formattedRow = row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ');
    console.info(formattedRow);
  });

  // Performance Analysis
  console.info('\n' + colors.bold(colors.yellow('🎯 PERFORMANCE ANALYSIS')));
  console.info(colors.yellow('=' + '='.repeat(50)));

  const fastestParsing = results
    .filter(r => r.operation.includes('Parse'))
    .reduce((min, curr) => (curr.avgTime < min.avgTime ? curr : min));

  const fastestComparison = results
    .filter(r => r.operation.includes('Compare'))
    .reduce((min, curr) => (curr.avgTime < min.avgTime ? curr : min));

  const fastestSatisfies = results
    .filter(r => r.operation.includes('satisfies'))
    .reduce((min, curr) => (curr.avgTime < min.avgTime ? curr : min));

  console.info(`${colors.green('🏆')} Fastest Parsing: ${colors.bold(fastestParsing.operation)}`);
  console.info(`    ${formatTime(fastestParsing.avgTime)} per operation`);

  console.info(
    `${colors.green('🏆')} Fastest Comparison: ${colors.bold(fastestComparison.operation)}`
  );
  console.info(`    ${formatTime(fastestComparison.avgTime)} per operation`);

  console.info(
    `${colors.green('🏆')} Fastest Satisfaction: ${colors.bold(fastestSatisfies.operation)}`
  );
  console.info(`    ${formatTime(fastestSatisfies.avgTime)} per operation`);

  // Performance Targets
  console.info('\n' + colors.bold(colors.blue('🎯 PERFORMANCE TARGETS')));
  console.info(colors.blue('=' + '='.repeat(40)));

  const targets = {
    parsing: 5, // < 5μs
    comparison: 1, // < 1μs
    satisfaction: 10, // < 10μs
  };

  const parsingResult = results.find(r => r.operation.includes('Parse Simple'));
  const comparisonResult = results.find(r => r.operation.includes('Compare Simple'));
  const satisfiesResult = results.find(r => r.operation.includes('Simple Range'));

  function checkTarget(actual: number, target: number, name: string) {
    const status = actual <= target ? colors.green('✅ PASS') : colors.red('❌ FAIL');
    const actualStr = formatTime(actual);
    const targetStr = formatTime(target);
    console.info(`${name}: ${actualStr} (target: ${targetStr}) ${status}`);
  }

  if (parsingResult) checkTarget(parsingResult.avgTime, targets.parsing, 'Version Parsing   ');
  if (comparisonResult)
    checkTarget(comparisonResult.avgTime, targets.comparison, 'Version Comparison');
  if (satisfiesResult)
    checkTarget(satisfiesResult.avgTime, targets.satisfaction, 'Range Satisfaction');

  // Export Results
  console.info('\n' + colors.bold(colors.cyan('💾 BENCHMARK EXPORT')));
  console.info(colors.cyan('=' + '='.repeat(30)));

  const benchmarkReport = {
    timestamp: new Date().toISOString(),
    runtime: `Bun ${Bun.version}`,
    platform: `${process.platform} ${process.arch}`,
    results: results.map(r => ({
      operation: r.operation,
      iterations: r.iterations,
      totalTimeMs: r.totalTime,
      avgTimeMicroseconds: r.avgTime,
      operationsPerSecond: r.opsPerSecond,
    })),
    memoryUsage: {
      objects: 10000,
      totalMemoryKB: Math.round(memoryDelta / 1024),
      avgBytesPerObject: Math.round(memoryDelta / 10000),
    },
    summary: {
      fastestParsing: {
        operation: fastestParsing.operation,
        avgTimeMicroseconds: fastestParsing.avgTime,
      },
      fastestComparison: {
        operation: fastestComparison.operation,
        avgTimeMicroseconds: fastestComparison.avgTime,
      },
      fastestSatisfaction: {
        operation: fastestSatisfies.operation,
        avgTimeMicroseconds: fastestSatisfies.avgTime,
      },
    },
  };

  const reportPath = './packages/version-manager/benchmark-report.json';
  await Bun.write(reportPath, JSON.stringify(benchmarkReport, null, 2));
  console.info(`Report saved to: ${colors.green(reportPath)}`);

  console.info('\n' + colors.bold(colors.green('🎉 BENCHMARK COMPLETE')));
  console.info(colors.green('All operations completed successfully with Bun.semver!'));
  console.info(
    `Total benchmark time: ${colors.cyan((results.reduce((sum, r) => sum + r.totalTime, 0) / 1000).toFixed(2))}s`
  );
}

// Run benchmark
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(colors.red(`❌ Benchmark failed: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}
