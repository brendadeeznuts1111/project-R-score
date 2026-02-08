#!/usr/bin/env bun
/**
 * ELITE Resilience Module Benchmarks
 * 
 * Tests performance of:
 * - Circuit Breaker state transitions
 * - Rate Limiter token bucket
 * - Middleware overhead
 */

import { EliteCircuitBreaker } from '../src/utils/elite-circuit-breaker';
import { EliteRateLimiter, MultiTierRateLimiter } from '../src/utils/elite-rate-limiter';

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║  ⚡ ELITE RESILIENCE MODULE BENCHMARKS                           ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  Circuit Breaker • Rate Limiter • Multi-Tier • Middleware        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// Benchmark helper
async function benchmark(name: string, fn: () => void | Promise<void>, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const elapsed = performance.now() - start;
  const opsPerSecond = Math.round((iterations / elapsed) * 1000);
  const avgMs = (elapsed / iterations).toFixed(4);
  
  console.log(`${name.padEnd(45)} ${opsPerSecond.toString().padStart(10)} ops/s  (${avgMs} ms/op)`);
  return opsPerSecond;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('Circuit Breaker');
console.log('──────────────────────────────────────────────────────────────────');

const breaker = new EliteCircuitBreaker('benchmark', {
  failureThreshold: 1000,
  successThreshold: 10,
  timeoutMs: 60000,
  resetTimeoutMs: 5000,
  healthCheckIntervalMs: 10000,
});

await benchmark('successful execution', async () => {
  await breaker.execute(async () => {
    return { status: 'success' };
  });
}, 10000);

await benchmark('execution with fallback', async () => {
  await breaker.execute(
    async () => { throw new Error('Service down'); },
    () => ({ status: 'fallback' })
  );
}, 10000);

await benchmark('state check', () => {
  breaker.getState();
}, 1000000);

await benchmark('metrics retrieval', () => {
  breaker.getMetrics();
}, 100000);

await benchmark('Prometheus format', () => {
  breaker.toPrometheus();
}, 100000);

breaker.destroy();

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nRate Limiter - Token Bucket');
console.log('──────────────────────────────────────────────────────────────────');

const limiter = new EliteRateLimiter({
  strategy: 'token_bucket',
  maxRequests: 100000,
  windowMs: 60000,
  burstSize: 10000,
});

await benchmark('check rate limit (allowed)', async () => {
  await limiter.check('user-1');
}, 50000);

await benchmark('check rate limit (different keys)', async () => {
  for (let i = 0; i < 10; i++) {
    await limiter.check(`user-${i}`);
  }
}, 5000);

await benchmark('get headers', async () => {
  const result = await limiter.check('user-headers');
  limiter.getHeaders(result);
}, 50000);

await benchmark('reset rate limit', async () => {
  await limiter.check('reset-test');
  await limiter.reset('reset-test');
}, 10000);

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nRate Limiter - Strategy Comparison');
console.log('──────────────────────────────────────────────────────────────────');

const tokenBucket = new EliteRateLimiter({
  strategy: 'token_bucket',
  maxRequests: 100000,
  windowMs: 60000,
  burstSize: 10000,
});

const fixedWindow = new EliteRateLimiter({
  strategy: 'fixed_window',
  maxRequests: 100000,
  windowMs: 60000,
});

await benchmark('token bucket', async () => {
  await tokenBucket.check('tb-test');
}, 50000);

await benchmark('fixed window', async () => {
  await fixedWindow.check('fw-test');
}, 50000);

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-TIER RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nMulti-Tier Rate Limiter');
console.log('──────────────────────────────────────────────────────────────────');

const multiTier = new MultiTierRateLimiter();

const freeTier = new EliteRateLimiter({
  strategy: 'token_bucket',
  maxRequests: 10000,
  windowMs: 60000,
  burstSize: 100,
});

const premiumTier = new EliteRateLimiter({
  strategy: 'token_bucket',
  maxRequests: 100000,
  windowMs: 60000,
  burstSize: 1000,
});

multiTier.addTier('free', freeTier, 1);
multiTier.addTier('premium', premiumTier, 2);

await benchmark('check single tier', async () => {
  await multiTier.check('user-tier', 'free');
}, 50000);

await benchmark('check all tiers', async () => {
  await multiTier.check('user-all');
}, 50000);

// ═══════════════════════════════════════════════════════════════════════════════
// THROUGHPUT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nThroughput Summary');
console.log('──────────────────────────────────────────────────────────────────');

const cbStart = performance.now();
const throughputBreaker = new EliteCircuitBreaker('throughput', {
  failureThreshold: 10000,
  successThreshold: 10,
  timeoutMs: 60000,
});
for (let i = 0; i < 100000; i++) {
  await throughputBreaker.execute(async () => ({ id: i }));
}
throughputBreaker.destroy();
const cbElapsed = performance.now() - cbStart;
console.log(`100k circuit breaker executions`.padEnd(45) + `${Math.round(100000 / cbElapsed * 1000).toString().padStart(10)} ops/s`);

const rlStart = performance.now();
const throughputLimiter = new EliteRateLimiter({
  strategy: 'token_bucket',
  maxRequests: 1000000,
  windowMs: 60000,
  burstSize: 100000,
});
for (let i = 0; i < 100000; i++) {
  await throughputLimiter.check(`user-${i % 100}`);
}
const rlElapsed = performance.now() - rlStart;
console.log(`100k rate limiter checks`.padEnd(45) + `${Math.round(100000 / rlElapsed * 1000).toString().padStart(10)} ops/s`);

console.log('\n✅ Resilience benchmarks complete!\n');
