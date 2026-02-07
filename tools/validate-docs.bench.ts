#!/usr/bin/env bun
// tools/validate-docs.bench.ts — Performance benchmark for documentation validator
// Run: bun tools/validate-docs.bench.ts

import { checkUrls, checkEnums, checkImports } from './validate-docs';

const ITERATIONS = 50;

interface BenchResult {
  operation: string;
  'ops/s': string;
  'ns/op': string;
  'ms/op': string;
  iters: number;
}

function bench(name: string, fn: () => Promise<void>, iters = ITERATIONS): Promise<BenchResult> {
  return (async () => {
    // Warm up (3 iterations for async file-scanning benchmarks)
    for (let i = 0; i < 3; i++) await fn();

    const t0 = Bun.nanoseconds();
    for (let i = 0; i < iters; i++) await fn();
    const totalNs = Bun.nanoseconds() - t0;
    const nsPerOp = totalNs / iters;

    return {
      operation: name,
      'ops/s': (1e9 / nsPerOp).toFixed(0),
      'ns/op': nsPerOp.toFixed(1),
      'ms/op': (nsPerOp / 1e6).toFixed(2),
      iters,
    };
  })();
}

console.log('validate-docs Performance Benchmark');
console.log('='.repeat(60));

const results: BenchResult[] = [];

// 1. checkUrls — scans all files for broken URL patterns
results.push(await bench('checkUrls()', async () => {
  await checkUrls();
}));

// 2. checkEnums — scans for duplicate enum definitions
results.push(await bench('checkEnums()', async () => {
  await checkEnums();
}));

// 3. checkImports — scans for broken import paths
results.push(await bench('checkImports()', async () => {
  await checkImports();
}));

// 4. All three checks (simulates `all` command)
results.push(await bench('all checks combined', async () => {
  await Promise.all([checkUrls(), checkEnums(), checkImports()]);
}));

// 5. All checks sequential (simulates actual CLI flow)
results.push(await bench('all checks sequential', async () => {
  await checkUrls();
  await checkEnums();
  await checkImports();
}));

// Print results
console.log('');
console.log(Bun.inspect.table(results));

// Summary
const all = results.find(r => r.operation === 'all checks combined');
const seq = results.find(r => r.operation === 'all checks sequential');
const urls = results.find(r => r.operation === 'checkUrls()');

console.log('Summary:');
console.log(`  All checks (parallel):    ${all?.['ms/op']}ms/op (${all?.['ops/s']} ops/s)`);
console.log(`  All checks (sequential):  ${seq?.['ms/op']}ms/op (${seq?.['ops/s']} ops/s)`);
console.log(`  URL check alone:          ${urls?.['ms/op']}ms/op (${urls?.['ops/s']} ops/s)`);

// Save results
const report = {
  timestamp: new Date().toISOString(),
  runtime: `Bun ${Bun.version}`,
  iterations: ITERATIONS,
  results: results.map(r => ({
    ...r,
    'ops/s': parseInt(r['ops/s']),
    'ns/op': parseFloat(r['ns/op']),
    'ms/op': parseFloat(r['ms/op']),
  })),
};
await Bun.write('tools/validate-docs.bench-results.json', JSON.stringify(report, null, 2));
console.log('\nResults saved to tools/validate-docs.bench-results.json');
