/**
 * Compare URLPattern vs Bun-native routing optimizations
 *
 * Tests:
 * 1. URLPattern (our current implementation)
 * 2. Map-based exact matching (Bun optimized)
 * 3. Switch statement (Bun optimized)
 * 4. Bun's SIMD URI decoding
 */

import { bench, suite, PERFORMANCE_TARGETS, reportToConsole, getBenchmarkResults } from '../packages/benchmarks/src/index';

// Setup test data
const testPaths = [
  '/mcp/health',
  '/mcp/registry/@scope/package',
  '/mcp/tools/fs/read',
  '/api/r2/bucket/file.txt',
];

// Method 1: URLPattern (current)
const urlPatterns = {
  health: new URLPattern({ pathname: '/mcp/health' }),
  registry: new URLPattern({ pathname: '/mcp/registry/:scope?/:name' }),
  tools: new URLPattern({ pathname: '/mcp/tools/*' }),
  r2: new URLPattern({ pathname: '/api/r2/*' }),
};

function matchURLPattern(pathname: string) {
  if (urlPatterns.health.test(`http://localhost${pathname}`)) return 'health';
  if (urlPatterns.registry.test(`http://localhost${pathname}`)) return 'registry';
  if (urlPatterns.tools.test(`http://localhost${pathname}`)) return 'tools';
  if (urlPatterns.r2.test(`http://localhost${pathname}`)) return 'r2';
  return null;
}

// Method 2: Map-based (Bun optimized with C++ hash table)
const exactRoutes = new Map([
  ['/mcp/health', 'health'],
  ['/mcp/metrics', 'metrics'],
  ['/api/status', 'status'],
]);

function matchMap(pathname: string) {
  // Exact match first (O(1) hash lookup in C++)
  const exact = exactRoutes.get(pathname);
  if (exact) return exact;

  // Pattern matching fallback
  if (pathname.startsWith('/mcp/registry/')) return 'registry';
  if (pathname.startsWith('/mcp/tools/')) return 'tools';
  if (pathname.startsWith('/api/r2/')) return 'r2';

  return null;
}

// Method 3: Switch statement (Bun optimizes to jump table)
function matchSwitch(pathname: string) {
  switch (pathname) {
    case '/mcp/health':
      return 'health';
    case '/mcp/metrics':
      return 'metrics';
    case '/api/status':
      return 'status';
    default:
      // Pattern matching
      if (pathname.startsWith('/mcp/registry/')) return 'registry';
      if (pathname.startsWith('/mcp/tools/')) return 'tools';
      if (pathname.startsWith('/api/r2/')) return 'r2';
      return null;
  }
}

// Method 4: SIMD URI decoding test
const encodedURI = '/mcp/registry/%40scope%2Fpackage';
const standardDecoded = decodeURIComponent(encodedURI);

suite('Routing Method Comparison', () => {
  bench('URLPattern.test() [CURRENT]', () => {
    matchURLPattern('/mcp/health');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS,
    category: 'routing',
    iterations: 100000,
  });

  bench('Map.get() + startsWith [BUN OPTIMIZED]', () => {
    matchMap('/mcp/health');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS * 0.1, // Should be 10x faster!
    category: 'routing',
    iterations: 100000,
  });

  bench('switch + startsWith [BUN OPTIMIZED]', () => {
    matchSwitch('/mcp/health');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS * 0.1,
    category: 'routing',
    iterations: 100000,
  });

  bench('URLPattern with params', () => {
    matchURLPattern('/mcp/registry/@scope/package');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS,
    category: 'routing',
    iterations: 100000,
  });

  bench('Map + startsWith with params', () => {
    matchMap('/mcp/registry/@scope/package');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS * 0.1,
    category: 'routing',
    iterations: 100000,
  });

  bench('decodeURIComponent (standard)', () => {
    decodeURIComponent(encodedURI);
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS,
    category: 'routing',
    iterations: 100000,
  });
});

// Run benchmarks
setTimeout(() => {
  const results = getBenchmarkResults();
  const summary = reportToConsole(results);

  // Enhanced comparison table with protocol and type
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 ROUTING METHOD COMPARISON TABLE                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

  const urlPatternTime = results[0]?.stats.mean || 0;
  const mapTime = results[1]?.stats.mean || 0;
  const switchTime = results[2]?.stats.mean || 0;
  const decodeTime = results[5]?.stats.mean || 0;

  // Method metadata
  const methods = [
    {
      name: 'URLPattern.test()',
      protocol: 'Web Standards API',
      type: 'Pattern Matching (RegExp)',
      time: urlPatternTime,
      speedup: 1.0,
      impl: 'JavaScript → C++ (regex engine)',
    },
    {
      name: 'Map.get() + startsWith',
      protocol: 'Bun C++ HashMap',
      type: 'Hash Table (O(1))',
      time: mapTime,
      speedup: urlPatternTime / mapTime,
      impl: 'JavaScript → C++ (hash lookup)',
    },
    {
      name: 'switch + startsWith',
      protocol: 'JSC Jump Table',
      type: 'Computed Jump (O(1))',
      time: switchTime,
      speedup: urlPatternTime / switchTime,
      impl: 'JavaScriptCore (jump table)',
    },
    {
      name: 'decodeURIComponent',
      protocol: 'Bun SIMD (x86_64)',
      type: 'Vectorized (16 bytes/op)',
      time: decodeTime,
      speedup: urlPatternTime / decodeTime,
      impl: 'C++ SIMD (AVX2/SSE4.2)',
    },
  ];

  // Table header
  console.log('┌────────────────────────────┬─────────────────────┬───────────────────────┬──────────┬──────────┐');
  console.log('│ Method                     │ Protocol            │ Type                  │ Time (μs)│ Speedup  │');
  console.log('├────────────────────────────┼─────────────────────┼───────────────────────┼──────────┼──────────┤');

  methods.forEach((method) => {
    const timeUs = (method.time * 1000).toFixed(3).padStart(8);
    const speedupStr = method.speedup >= 1
      ? `${method.speedup.toFixed(1)}x`.padStart(8)
      : 'baseline'.padStart(8);

    console.log(
      `│ ${method.name.padEnd(26)} │ ${method.protocol.padEnd(19)} │ ${method.type.padEnd(21)} │ ${timeUs} │ ${speedupStr} │`
    );
  });

  console.log('└────────────────────────────┴─────────────────────┴───────────────────────┴──────────┴──────────┘');

  // Implementation details
  console.log('\n📋 Implementation Details:');
  methods.forEach((method, idx) => {
    console.log(`   ${idx + 1}. ${method.name}: ${method.impl}`);
  });

  // Key insights
  console.log('\n💡 Key Insights:');
  if (urlPatternTime > 0) {
    console.log(`   • Map.get() is ${(urlPatternTime / mapTime).toFixed(1)}x faster (C++ hash table)`);
    console.log(`   • switch is ${(urlPatternTime / switchTime).toFixed(1)}x faster (JSC jump table optimization)`);
    console.log(`   • SIMD decode is ${(urlPatternTime / decodeTime).toFixed(1)}x faster (processes 16 bytes/instruction)`);
    console.log(`   • URLPattern uses regex engine (slower but flexible for complex patterns)`);
  }

  // Architecture recommendation
  console.log('\n🏗️  Architecture Recommendation:');
  console.log('   ┌─────────────────────────────────────────────────────────────┐');
  console.log('   │ Hybrid Router:                                              │');
  console.log('   │   1. Map.get() for exact routes (/health, /metrics)        │');
  console.log('   │   2. switch for common paths (if < 10 cases)               │');
  console.log('   │   3. URLPattern for dynamic params (/:scope/:name)         │');
  console.log('   └─────────────────────────────────────────────────────────────┘');

  process.exit(summary.failed > 0 ? 1 : 0);
}, 100);
