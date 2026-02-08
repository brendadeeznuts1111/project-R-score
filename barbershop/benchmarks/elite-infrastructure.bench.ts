#!/usr/bin/env bun
/**
 * ELITE Infrastructure Module Benchmarks
 * 
 * Tests performance of:
 * - Logger (all levels, batching, formatting)
 * - Config (schema validation, loading)
 * - Fast hashing (Wyhash, xxHash)
 */

import { EliteLogger } from '../src/utils/elite-logger';
import { s } from '../src/utils/elite-config';
import { EliteFastHash } from '../src/utils/elite-security';

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║  🏗️ ELITE INFRASTRUCTURE MODULE BENCHMARKS                      ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  Logger • Config • Fast Hashing • Throughput                     ║');
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
// LOGGER BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('EliteLogger - Log Levels');
console.log('──────────────────────────────────────────────────────────────────');

const logger = new EliteLogger({
  level: 'DEBUG',
  pretty: false,
  output: 'stdout',
  batchSize: 1,
});

await benchmark('DEBUG log', () => {
  logger.debug('Debug message for benchmarking');
}, 100000);

await benchmark('INFO log', () => {
  logger.info('Info message for benchmarking');
}, 100000);

await benchmark('WARN log', () => {
  logger.warn('Warning message for benchmarking');
}, 100000);

await benchmark('log with metadata', () => {
  logger.info('Message with context', {
    userId: '123',
    action: 'benchmark',
    duration: 42,
  });
}, 100000);

await logger.close();

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER BATCHING
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nEliteLogger - Batching Performance');
console.log('──────────────────────────────────────────────────────────────────');

await benchmark('batch size 1 (immediate)', async () => {
  const l = new EliteLogger({
    level: 'INFO',
    pretty: false,
    output: 'stdout',
    batchSize: 1,
  });
  for (let i = 0; i < 100; i++) {
    l.info(`Batch test message ${i}`);
  }
  await l.close();
}, 100);

await benchmark('batch size 10', async () => {
  const l = new EliteLogger({
    level: 'INFO',
    pretty: false,
    output: 'stdout',
    batchSize: 10,
    batchTimeoutMs: 1000,
  });
  for (let i = 0; i < 100; i++) {
    l.info(`Batch test message ${i}`);
  }
  await l.close();
}, 100);

await benchmark('batch size 100', async () => {
  const l = new EliteLogger({
    level: 'INFO',
    pretty: false,
    output: 'stdout',
    batchSize: 100,
    batchTimeoutMs: 1000,
  });
  for (let i = 0; i < 100; i++) {
    l.info(`Batch test message ${i}`);
  }
  await l.close();
}, 100);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG SCHEMA BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nEliteConfig - Schema Building');
console.log('──────────────────────────────────────────────────────────────────');

await benchmark('simple string schema', () => {
  s.string().parse('test');
}, 1000000);

await benchmark('string with default', () => {
  const schema = s.string().default('default-value');
  schema.parse(undefined);
}, 1000000);

await benchmark('number schema', () => {
  s.number().parse(42);
}, 1000000);

await benchmark('boolean schema', () => {
  s.boolean().parse(true);
}, 1000000);

await benchmark('enum schema', () => {
  s.enum('a', 'b', 'c').parse('b');
}, 1000000);

await benchmark('array schema', () => {
  s.array(s.string()).parse(['a', 'b', 'c']);
}, 500000);

const complexSchema = s.object({
  name: s.string(),
  age: s.number(),
  active: s.boolean(),
});

await benchmark('object schema', () => {
  complexSchema.parse({
    name: 'Test',
    age: 25,
    active: true,
  });
}, 500000);

// ═══════════════════════════════════════════════════════════════════════════════
// FAST HASHING BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nFast Hashing - Data Sizes');
console.log('──────────────────────────────────────────────────────────────────');

const small = 'test';
const medium = 'x'.repeat(100);
const large = 'x'.repeat(10000);

await benchmark('Wyhash - 4 bytes', () => {
  EliteFastHash.hash(small);
}, 1000000);

await benchmark('Wyhash - 100 bytes', () => {
  EliteFastHash.hash(medium);
}, 1000000);

await benchmark('Wyhash - 10KB', () => {
  EliteFastHash.hash(large);
}, 100000);

await benchmark('CRC32 - 4 bytes', () => {
  EliteFastHash.crc32(small);
}, 1000000);

await benchmark('xxHash32 - 4 bytes', () => {
  EliteFastHash.xxHash32(small);
}, 1000000);

// ═══════════════════════════════════════════════════════════════════════════════
// THROUGHPUT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nThroughput Summary');
console.log('──────────────────────────────────────────────────────────────────');

const hashStart = performance.now();
for (let i = 0; i < 1000000; i++) {
  EliteFastHash.hash(`data-${i}`);
}
const hashElapsed = performance.now() - hashStart;
console.log(`1M Wyhash operations`.padEnd(45) + `${Math.round(1000000 / hashElapsed * 1000).toString().padStart(10)} ops/s`);

const schemaStart = performance.now();
const testSchema = s.object({
  id: s.number(),
  name: s.string(),
});
for (let i = 0; i < 1000000; i++) {
  testSchema.parse({ id: i, name: `Item ${i}` });
}
const schemaElapsed = performance.now() - schemaStart;
console.log(`1M schema validations`.padEnd(45) + `${Math.round(1000000 / schemaElapsed * 1000).toString().padStart(10)} ops/s`);

console.log('\n✅ Infrastructure benchmarks complete!\n');
