// lib/ai/ai.bench.ts — Performance benchmarks for lib/ai/ Bun-native APIs
// Run: bun lib/ai/ai.bench.ts
// Tip: MIMALLOC_SHOW_STATS=1 bun lib/ai/ai.bench.ts for allocator stats

import { AdvancedLRUCache, AIOperationsManager } from './ai-operations-manager';
import { AnomalyDetector } from './anomaly-detector';
import { SmartCacheManager } from './smart-cache-manager';
import { heapStats } from 'bun:jsc';

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
    'ops/s': Math.floor(1e9 / nsPerOp).toLocaleString(),
    'ns/op': nsPerOp.toFixed(1),
    iters,
  };
}

async function benchAsync(
  name: string, fn: () => Promise<void>, iters = ITERATIONS,
): Promise<BenchResult> {
  for (let i = 0; i < 10; i++) await fn();

  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iters; i++) await fn();
  const totalNs = Bun.nanoseconds() - t0;
  const nsPerOp = totalNs / iters;

  return {
    operation: name,
    'ops/s': Math.floor(1e9 / nsPerOp).toLocaleString(),
    'ns/op': nsPerOp.toFixed(1),
    iters,
  };
}

console.log('lib/ai/ Performance Benchmark');
console.log('='.repeat(60));

// Heap snapshot BEFORE benchmarks
const heapBefore = heapStats();

const results: BenchResult[] = [];

// ============================================================================
// 1. LRU CACHE (AdvancedLRUCache)
// ============================================================================

console.log('\n' + '— LRU Cache —');

const cache = new AdvancedLRUCache<string>({
  maxSize: 10_000,
  defaultTtl: 60_000,
  enableStats: true,
});

results.push(
  bench('LRU set()', () => {
    cache.set(`key-${Math.random()}`, 'value');
  }),
);

// Pre-fill for get benchmarks
for (let i = 0; i < 1000; i++) cache.set(`bench-${i}`, `val-${i}`);

results.push(
  bench('LRU get() hit', () => {
    cache.get('bench-500');
  }),
);

results.push(
  bench('LRU get() miss', () => {
    cache.get('nonexistent');
  }),
);

results.push(
  bench('LRU getStats()', () => {
    cache.getStats();
  }),
);

// ============================================================================
// 2. ID GENERATION (Bun.randomUUIDv7 vs old Date.now+Math.random)
// ============================================================================

console.log('— ID Generation —');

results.push(
  bench('Bun.randomUUIDv7()', () => {
    Bun.randomUUIDv7();
  }),
);

results.push(
  bench('Bun.randomUUIDv7("base64url")', () => {
    Bun.randomUUIDv7("base64url");
  }),
);

// Old pattern for comparison
results.push(
  bench('Date.now+Math.random (old)', () => {
    `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }),
);

// ============================================================================
// 3. YAML PARSING (Bun YAML vs JSON)
// ============================================================================

console.log('— Parsing —');

import { YAML } from 'bun';

const sampleYaml = `
cookie:
  secret: dev-secret-minimum-32-bytes-long-here-123
  name: ab_variant
  domain: localhost
  secure: false
  httpOnly: true
  sameSite: lax
  maxAgeDays: 30
ab:
  defaultVariants:
    - A
    - B
  trafficSplit: 50
`;

const sampleJson = JSON.stringify({
  cookie: {
    secret: 'dev-secret-minimum-32-bytes-long-here-123',
    name: 'ab_variant', domain: 'localhost', secure: false,
    httpOnly: true, sameSite: 'lax', maxAgeDays: 30,
  },
  ab: { defaultVariants: ['A', 'B'], trafficSplit: 50 },
});

results.push(
  bench('YAML.parse()', () => {
    YAML.parse(sampleYaml);
  }),
);

results.push(
  bench('JSON.parse()', () => {
    JSON.parse(sampleJson);
  }),
);

// ============================================================================
// 4. ANOMALY DETECTOR
// ============================================================================

console.log('— Anomaly Detector —');

const detector = AnomalyDetector.getInstance();

results.push(
  await benchAsync('submitMetrics()', async () => {
    await detector.submitMetrics({
      timestamp: Date.now(),
      source: 'bench',
      metrics: { cpu: 50 + Math.random() * 30, memory: 60 + Math.random() * 20 },
    });
  }, 1000),
);

results.push(
  bench('getAnomalies()', () => {
    detector.getAnomalies();
  }),
);

results.push(
  bench('getStatistics()', () => {
    detector.getStatistics();
  }),
);

// ============================================================================
// 5. SMART CACHE
// ============================================================================

console.log('— Smart Cache —');

const smartCache = new SmartCacheManager({ enablePredictions: false });

results.push(
  await benchAsync('SmartCache set()', async () => {
    await smartCache.set(`key-${Math.random()}`, 'value');
  }, 1000),
);

results.push(
  await benchAsync('SmartCache get() miss', async () => {
    await smartCache.get('nonexistent');
  }, 1000),
);

// ============================================================================
// 6. Bun.deepEquals (used in config comparison)
// ============================================================================

console.log('— Bun.deepEquals —');

const objA = { v: 'A', s: 'abc123', t: 1234567890, nested: { a: 1, b: [1, 2, 3] } };
const objB = { v: 'A', s: 'abc123', t: 1234567890, nested: { a: 1, b: [1, 2, 3] } };

results.push(
  bench('deepEquals(obj, obj, false)', () => {
    Bun.deepEquals(objA, objB, false);
  }),
);

results.push(
  bench('deepEquals(obj, obj, true)', () => {
    Bun.deepEquals(objA, objB, true);
  }),
);

// ============================================================================
// 7. Bun.nanoseconds overhead
// ============================================================================

console.log('— Timing & Introspection —');

results.push(
  bench('Bun.nanoseconds()', () => {
    Bun.nanoseconds();
  }),
);

results.push(
  bench('heapStats()', () => {
    heapStats();
  }, 100), // heavy introspection — lower iterations
);

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(Bun.inspect.table(results, ['operation', 'ns/op', 'ops/s', 'iters']));

// Heap snapshot AFTER benchmarks — show delta
const heapAfter = heapStats();

console.log('\n' + '— JSC Heap (bun:jsc heapStats) —');
console.log(Bun.inspect.table([
  { metric: 'heapSize', before: `${(heapBefore.heapSize / 1024).toFixed(0)} KiB`, after: `${(heapAfter.heapSize / 1024).toFixed(0)} KiB`, delta: `+${((heapAfter.heapSize - heapBefore.heapSize) / 1024).toFixed(0)} KiB` },
  { metric: 'heapCapacity', before: `${(heapBefore.heapCapacity / 1024).toFixed(0)} KiB`, after: `${(heapAfter.heapCapacity / 1024).toFixed(0)} KiB`, delta: `+${((heapAfter.heapCapacity - heapBefore.heapCapacity) / 1024).toFixed(0)} KiB` },
  { metric: 'extraMemorySize', before: `${(heapBefore.extraMemorySize / 1024).toFixed(0)} KiB`, after: `${(heapAfter.extraMemorySize / 1024).toFixed(0)} KiB`, delta: `+${((heapAfter.extraMemorySize - heapBefore.extraMemorySize) / 1024).toFixed(0)} KiB` },
  { metric: 'objectCount', before: String(heapBefore.objectCount), after: String(heapAfter.objectCount), delta: `+${heapAfter.objectCount - heapBefore.objectCount}` },
  { metric: 'protectedObjectCount', before: String(heapBefore.protectedObjectCount), after: String(heapAfter.protectedObjectCount), delta: `+${heapAfter.protectedObjectCount - heapBefore.protectedObjectCount}` },
], ['metric', 'before', 'after', 'delta']));

console.log('Tip: MIMALLOC_SHOW_STATS=1 bun lib/ai/ai.bench.ts for allocator stats');

// Cleanup timers
detector.removeAllListeners();
cache.clear();
process.exit(0);
