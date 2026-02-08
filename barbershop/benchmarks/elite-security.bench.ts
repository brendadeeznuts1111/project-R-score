#!/usr/bin/env bun
/**
 * ELITE Security Module Benchmarks
 * 
 * Tests performance of:
 * - Password hashing (Argon2id)
 * - HMAC request signing
 * - Fast non-cryptographic hashing
 * - Token generation
 */

import {
  ElitePasswordManager,
  EliteRequestSigner,
  EliteFastHash,
  EliteTokenManager,
  timingSafeEqual,
} from '../src/utils/elite-security';

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║  🔐 ELITE SECURITY MODULE BENCHMARKS                             ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  Argon2id • HMAC-SHA256 • Wyhash/xxHash • Token Generation       ║');
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

const passwordManager = new ElitePasswordManager();
const signer = new EliteRequestSigner('test-secret-key-for-benchmarks-only');
const testData = JSON.stringify({
  barberId: 'jb',
  timestamp: Date.now(),
  services: ['Haircut', 'Beard Trim'],
  amount: 45.00,
});

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('Password Hashing (Argon2id)');
console.log('──────────────────────────────────────────────────────────────────');

// Pre-hash for verify benchmarks
const hashedPassword = await passwordManager.hash('benchmark-password-123');

await benchmark('hash password', async () => {
  await passwordManager.hash('benchmark-password-123');
}, 100);

await benchmark('verify password', async () => {
  await passwordManager.verify('benchmark-password-123', hashedPassword);
}, 100);

// ═══════════════════════════════════════════════════════════════════════════════
// HMAC SIGNING BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nHMAC Request Signing (SHA-256)');
console.log('──────────────────────────────────────────────────────────────────');

const signature = signer.sign(testData);
const { signature: tsSig, timestamp } = signer.signWithTimestamp(testData, 300);

await benchmark('sign data', () => {
  signer.sign(testData);
}, 10000);

await benchmark('sign with timestamp', () => {
  signer.signWithTimestamp(testData, 300);
}, 10000);

await benchmark('verify signature', () => {
  signer.verify(testData, signature);
}, 10000);

await benchmark('verify with timestamp', () => {
  signer.verifyWithTimestamp(testData, tsSig, timestamp, 300);
}, 10000);

await benchmark('generate API key', () => {
  signer.generateApiKey('elite');
}, 10000);

// ═══════════════════════════════════════════════════════════════════════════════
// FAST HASHING BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nFast Non-Cryptographic Hashing');
console.log('──────────────────────────────────────────────────────────────────');

const smallData = 'barbershop:elite:v4';
const mediumData = 'x'.repeat(100);
const largeData = 'x'.repeat(10000);

await benchmark('Wyhash (small data)', () => {
  EliteFastHash.hash(smallData);
}, 100000);

await benchmark('Wyhash (medium data)', () => {
  EliteFastHash.hash(mediumData);
}, 100000);

await benchmark('Wyhash (large data)', () => {
  EliteFastHash.hash(largeData);
}, 10000);

await benchmark('CRC32', () => {
  EliteFastHash.crc32(smallData);
}, 100000);

await benchmark('xxHash32', () => {
  EliteFastHash.xxHash32(smallData);
}, 100000);

await benchmark('xxHash64', () => {
  EliteFastHash.xxHash64(smallData);
}, 100000);

await benchmark('ETag generation', () => {
  EliteFastHash.etag(smallData);
}, 100000);

await benchmark('Cache key generation', () => {
  EliteFastHash.cacheKey('barbers', 'active', 123, Date.now());
}, 100000);

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nToken Generation');
console.log('──────────────────────────────────────────────────────────────────');

await benchmark('generate random token (32 bytes)', () => {
  EliteTokenManager.generateToken(32);
}, 50000);

await benchmark('generate UUID v4', () => {
  EliteTokenManager.uuid();
}, 100000);

await benchmark('generate UUID v7', () => {
  EliteTokenManager.uuidv7();
}, 100000);

await benchmark('hash token for storage', () => {
  const token = EliteTokenManager.generateToken(32);
  EliteTokenManager.hashToken(token);
}, 50000);

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING-SAFE COMPARISON BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nTiming-Safe Comparison');
console.log('──────────────────────────────────────────────────────────────────');

const str1 = 'a'.repeat(64);
const str2 = 'a'.repeat(64);
const str3 = 'b'.repeat(64);

await benchmark('equal strings (64 chars)', () => {
  timingSafeEqual(str1, str2);
}, 1000000);

await benchmark('different strings (64 chars)', () => {
  timingSafeEqual(str1, str3);
}, 1000000);

// ═══════════════════════════════════════════════════════════════════════════════
// THROUGHPUT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nThroughput Summary');
console.log('──────────────────────────────────────────────────────────────────');

const start = performance.now();
for (let i = 0; i < 1000000; i++) {
  EliteFastHash.hash(`data-${i}`);
}
const wyhashElapsed = performance.now() - start;
console.log(`1M Wyhash operations`.padEnd(45) + `${Math.round(1000000 / wyhashElapsed * 1000).toString().padStart(10)} ops/s`);

const start2 = performance.now();
for (let i = 0; i < 1000000; i++) {
  EliteTokenManager.generateToken(16);
}
const tokenElapsed = performance.now() - start2;
console.log(`1M token generations`.padEnd(45) + `${Math.round(1000000 / tokenElapsed * 1000).toString().padStart(10)} ops/s`);

console.log('\n✅ Security benchmarks complete!\n');
