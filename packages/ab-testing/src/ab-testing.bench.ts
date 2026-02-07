// lib/ab-testing/ab-testing.bench.ts — AB Testing Performance Benchmark
// Run: bun lib/ab-testing/ab-testing.bench.ts

import { ABTestManager } from './manager';
import { ABTestingManager } from './cookie-manager';

const ITERATIONS = 10_000;

interface BenchResult {
  operation: string;
  'ops/s': string;
  'ns/op': string;
  iters: number;
}

function bench(name: string, fn: () => void, iters = ITERATIONS): BenchResult {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iters; i++) fn();
  const totalNs = Bun.nanoseconds() - t0;
  const nsPerOp = totalNs / iters;

  return {
    operation: name,
    'ops/s': (1e9 / nsPerOp).toFixed(0),
    'ns/op': nsPerOp.toFixed(1),
    iters,
  };
}

console.log('AB Testing Performance Benchmark');
console.log('='.repeat(60));

const results: BenchResult[] = [];

// 1. CookieMap construction (empty)
results.push(
  bench('CookieMap() empty', () => {
    new Bun.CookieMap('');
  })
);

// 2. CookieMap construction (with cookies)
const cookieStr = 'ab_test1=a; ab_test2=b; ab_test3=c; session=xyz123; lang=en';
results.push(
  bench('CookieMap() parse 5 cookies', () => {
    new Bun.CookieMap(cookieStr);
  })
);

// 3. Manager construction
results.push(
  bench('ABTestManager()', () => {
    new ABTestManager();
  })
);

// 4. Manager construction with cookie header
results.push(
  bench('ABTestManager(cookies)', () => {
    new ABTestManager(cookieStr);
  })
);

// 5. registerTest
{
  const m = new ABTestManager();
  results.push(
    bench('registerTest (2 variants)', () => {
      m.registerTest({ id: 'bench', variants: ['a', 'b'] });
    })
  );
}

// 6. registerTest with weights
{
  const m = new ABTestManager();
  results.push(
    bench('registerTest (3 variants, weighted)', () => {
      m.registerTest({ id: 'bench-w', variants: ['a', 'b', 'c'], weights: [50, 30, 20] });
    })
  );
}

// 7. getVariant (first call — assigns)
results.push(
  bench('getVariant (assign new)', () => {
    const m = new ABTestManager();
    m.registerTest({ id: 'gv', variants: ['a', 'b'] });
    m.getVariant('gv');
  })
);

// 8. getVariant (subsequent — reads cookie)
{
  const m = new ABTestManager();
  m.registerTest({ id: 'cached', variants: ['a', 'b'] });
  m.getVariant('cached'); // first call sets cookie
  results.push(
    bench('getVariant (cached read)', () => {
      m.getVariant('cached');
    })
  );
}

// 9. getVariant from pre-set cookie
results.push(
  bench('getVariant (from cookie header)', () => {
    const m = new ABTestManager('ab_preset=b');
    m.registerTest({ id: 'preset', variants: ['a', 'b'], cookieName: 'ab_preset' });
    m.getVariant('preset');
  })
);

// 10. forceAssign
{
  const m = new ABTestManager();
  m.registerTest({ id: 'fa', variants: ['a', 'b'] });
  results.push(
    bench('forceAssign', () => {
      m.forceAssign('fa', 'b');
    })
  );
}

// 11. getAllAssignments
{
  const m = new ABTestManager();
  for (let i = 0; i < 5; i++) {
    m.registerTest({ id: `t${i}`, variants: ['a', 'b'] });
    m.getVariant(`t${i}`);
  }
  results.push(
    bench('getAllAssignments (5 tests)', () => {
      m.getAllAssignments();
    })
  );
}

// 12. getSetCookieHeaders
{
  const m = new ABTestManager();
  for (let i = 0; i < 5; i++) {
    m.registerTest({ id: `h${i}`, variants: ['a', 'b'] });
    m.getVariant(`h${i}`);
  }
  results.push(
    bench('getSetCookieHeaders (5 cookies)', () => {
      m.getSetCookieHeaders();
    })
  );
}

// 13. Full request cycle: parse → assign → serialize
results.push(
  bench('Full cycle (parse→assign→serialize)', () => {
    const m = new ABTestManager(cookieStr);
    m.registerTest({ id: 'full', variants: ['control', 'treatment'], weights: [50, 50] });
    m.getVariant('full');
    m.getSetCookieHeaders();
  })
);

// 14. Legacy wrapper full cycle
results.push(
  bench('Legacy wrapper full cycle', () => {
    const m = new ABTestingManager(cookieStr);
    m.registerTest('legacy', ['a', 'b'], { weights: [60, 40] });
    m.getVariant('legacy');
    m.getResponseHeaders();
  })
);

// 15. clear
{
  const m = new ABTestManager();
  m.registerTest({ id: 'clr', variants: ['a', 'b'] });
  m.getVariant('clr');
  results.push(
    bench('clear (single test)', () => {
      m.clear('clr');
    })
  );
}

// Print results
console.log('');
console.log(Bun.inspect.table(results));

// Summary
const fullCycle = results.find(r => r.operation.startsWith('Full cycle'));
const cachedRead = results.find(r => r.operation.includes('cached read'));
const serialize = results.find(r => r.operation.includes('SetCookieHeaders'));

console.log('Summary:');
console.log(`  Full request cycle: ${fullCycle?.['ns/op']}ns/op (${fullCycle?.['ops/s']} ops/s)`);
console.log(
  `  Cached variant read: ${cachedRead?.['ns/op']}ns/op (${cachedRead?.['ops/s']} ops/s)`
);
console.log(`  Cookie serialization: ${serialize?.['ns/op']}ns/op (${serialize?.['ops/s']} ops/s)`);

// Save results
const report = {
  timestamp: new Date().toISOString(),
  runtime: `Bun ${Bun.version}`,
  iterations: ITERATIONS,
  results: results.map(r => ({
    ...r,
    'ops/s': parseInt(r['ops/s']),
    'ns/op': parseFloat(r['ns/op']),
  })),
};
await Bun.write('lib/ab-testing/bench-results.json', JSON.stringify(report, null, 2));
console.log('\nResults saved to lib/ab-testing/bench-results.json');
