/**
 * Bun-Enhanced Utilities
 *
 * Leverages Bun's native APIs for maximum performance:
 * - Bun.hash() - Fast hashing (xxHash, wyhash, metrohash)
 * - Bun.password - Argon2/bcrypt password hashing
 * - Bun.deflate/gzip/zstd - Compression
 * - Bun.nanoseconds() - High-res timing
 * - Bun.write() - Fast file I/O
 * - Bun.CryptoHasher - Streaming hashes
 * - Bun.peek() - Promise introspection
 * - Bun.sleep() - Async delays
 * - Bun.semver - Version parsing
 * - Bun.escapeHTML() - HTML sanitization
 */

import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-PERFORMANCE HASHING
// ═══════════════════════════════════════════════════════════════════════════════

export type HashAlgorithm = 'wyhash' | 'xxhash3' | 'xxhash64' | 'metrohash64' | 'metrohash128';

/**
 * Fast non-cryptographic hash using Bun.hash()
 * 10-100x faster than crypto.createHash for non-security purposes
 */
export function fastHash(
  data: string | ArrayBufferView,
  algorithm: HashAlgorithm = 'wyhash',
  seed?: number
): bigint | number {
  const input = typeof data === 'string' ? Buffer.from(data) : data;

  // @ts-ignore - Bun.hash is available in Bun runtime
  if (seed !== undefined) {
    return Bun.hash(input, seed, algorithm);
  }
  return Bun.hash(input, algorithm);
}

/**
 * Streaming hash using Bun.CryptoHasher
 * Memory-efficient for large files
 */
export function createStreamingHasher(
  algorithm: 'blake2b256' | 'md5' | 'sha1' | 'sha256' | 'sha512' = 'sha256'
) {
  // @ts-ignore
  const hasher = new Bun.CryptoHasher(algorithm);

  return {
    update: (data: string | ArrayBufferView) => {
      hasher.update(data);
      return hasher;
    },
    digest: (encoding?: 'hex' | 'base64' | 'buffer') => {
      return hasher.digest(encoding || 'hex');
    },
    reset: () => hasher.reset(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING (Argon2 / Bcrypt)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PasswordOptions {
  algorithm?: 'argon2id' | 'argon2d' | 'argon2i' | 'bcrypt';
  memoryCost?: number; // Argon2 memory in KB
  timeCost?: number; // Argon2 iterations
  saltSize?: number;
}

/**
 * Hash password using Bun.password (Argon2/bcrypt)
 * Uses Argon2id by default (most secure)
 */
export async function hashPassword(
  password: string,
  options: PasswordOptions = {}
): Promise<string> {
  const { algorithm = 'argon2id', memoryCost = 65536, timeCost = 3 } = options;

  // @ts-ignore - Bun.password is available in Bun runtime
  return Bun.password.hash(password, {
    algorithm,
    memoryCost,
    timeCost,
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // @ts-ignore
  return Bun.password.verify(password, hash);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPRESSION (Deflate / Gzip / Zstd)
// ═══════════════════════════════════════════════════════════════════════════════

export type CompressionAlgorithm = 'deflate' | 'gzip' | 'zstd';

/**
 * Compress data using Bun's native compression
 * Falls back to Node zlib if Bun API not available
 */
export function compressData(
  data: string | ArrayBufferView,
  algorithm: CompressionAlgorithm = 'gzip',
  level?: number
): Uint8Array {
  const input = typeof data === 'string' ? Buffer.from(data) : data;

  // Check if Bun compression APIs are available
  // @ts-ignore
  if (Bun.gzip) {
    switch (algorithm) {
      case 'zstd':
        // @ts-ignore
        if (Bun.zstd) return Bun.zstd.compress(input, level);
        throw new Error('Bun.zstd not available in this version');
      case 'gzip':
        // @ts-ignore
        return Bun.gzip(input, level);
      case 'deflate':
        // @ts-ignore
        if (Bun.deflate) return Bun.deflate(input, level);
        throw new Error('Bun.deflate not available in this version');
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  // Fallback to Node zlib
  const zlib = require('zlib');
  const buffer = Buffer.from(input);

  switch (algorithm) {
    case 'gzip':
      return zlib.gzipSync(buffer, { level });
    case 'deflate':
      return zlib.deflateSync(buffer, { level });
    default:
      throw new Error(`Algorithm ${algorithm} not available`);
  }
}

/**
 * Decompress data
 */
export function decompressData(data: ArrayBufferView, algorithm: CompressionAlgorithm): Uint8Array {
  // @ts-ignore
  if (Bun.gzip) {
    switch (algorithm) {
      case 'zstd':
        // @ts-ignore
        if (Bun.zstd) return Bun.zstd.decompress(data);
        throw new Error('Bun.zstd not available');
      case 'gzip':
        // @ts-ignore
        return Bun.gunzip(data);
      case 'deflate':
        // @ts-ignore
        if (Bun.inflate) return Bun.inflate(data);
        throw new Error('Bun.inflate not available');
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  // Fallback to Node zlib
  const zlib = require('zlib');
  const buffer = Buffer.from(data);

  switch (algorithm) {
    case 'gzip':
      return zlib.gunzipSync(buffer);
    case 'deflate':
      return zlib.inflateSync(buffer);
    default:
      throw new Error(`Algorithm ${algorithm} not available`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-RESOLUTION TIMING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current time in nanoseconds
 * Much higher resolution than Date.now()
 */
export function nanoseconds(): bigint {
  // @ts-ignore
  return Bun.nanoseconds();
}

/**
 * Measure function execution time
 */
export async function measure<T>(
  fn: () => T | Promise<T>,
  label: string
): Promise<{ result: T; durationMs: number }> {
  const start = nanoseconds();
  const result = await fn();
  const duration = Number(nanoseconds() - start) / 1_000_000;

  logger.debug(`${label}: ${duration.toFixed(3)}ms`);

  return { result, duration };
}

/**
 * Create a performance timer
 */
export function createTimer(label: string) {
  const start = nanoseconds();

  return {
    elapsed: () => Number(nanoseconds() - start) / 1_000_000,
    log: () => {
      const ms = Number(nanoseconds() - start) / 1_000_000;
      logger.debug(`${label}: ${ms.toFixed(3)}ms`);
      return ms;
    },
    reset: () => start,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAST FILE I/O
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write file using Bun.write() - much faster than fs.writeFile
 */
export async function fastWrite(
  path: string,
  data: string | ArrayBufferView | Blob
): Promise<number> {
  // @ts-ignore - Bun.write returns bytes written
  return Bun.write(path, data);
}

/**
 * Read file as text using Bun.file()
 */
export async function fastReadText(path: string): Promise<string> {
  // @ts-ignore
  const file = Bun.file(path);
  return file.text();
}

/**
 * Read file as JSON with type safety
 */
export async function fastReadJSON<T>(path: string): Promise<T> {
  // @ts-ignore
  const file = Bun.file(path);
  return file.json() as Promise<T>;
}

/**
 * Stream file efficiently
 */
export async function streamFile(
  path: string,
  onChunk: (chunk: Uint8Array) => void | Promise<void>
): Promise<void> {
  // @ts-ignore
  const file = Bun.file(path);
  const stream = file.stream();
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await onChunk(value);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASYNC UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Async sleep using Bun.sleep()
 * More efficient than setTimeout
 */
export async function sleep(ms: number): Promise<void> {
  // @ts-ignore
  return Bun.sleep(ms);
}

/**
 * Check if a promise is resolved without awaiting
 */
export function peekPromise<T>(promise: Promise<T>): T | Promise<T> {
  // @ts-ignore
  return Bun.peek(promise);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMVER PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse and compare semantic versions
 */
export function parseSemver(version: string) {
  // @ts-ignore
  return Bun.semver.parse(version);
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  // @ts-ignore
  return Bun.semver.order(v1, v2);
}

/**
 * Check if version satisfies range
 */
export function satisfiesVersion(version: string, range: string): boolean {
  // @ts-ignore
  return Bun.semver.satisfies(version, range);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML entities
 */
export function escapeHTML(text: string): string {
  // @ts-ignore
  return Bun.escapeHTML(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find executable in PATH
 */
export function which(command: string): string | null {
  // @ts-ignore
  return Bun.which(command);
}

/**
 * Open file in default editor
 */
export function openInEditor(path: string): void {
  // @ts-ignore
  Bun.openInEditor(path);
}

/**
 * Get Bun version info
 */
export function getBunVersion(): { version: string; revision: string } {
  return {
    // @ts-ignore
    version: Bun.version,
    // @ts-ignore
    revision: Bun.revision,
  };
}

/**
 * Check if running as main module
 */
export function isMainModule(importMeta: ImportMeta): boolean {
  // @ts-ignore
  return importMeta.path === Bun.main;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMONSTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function demoBunEnhanced(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🚀 BUN-ENHANCED UTILITIES DEMO                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Hashing demo
  console.log('1️⃣  Fast Hashing (wyhash):');
  const data = 'Hello, FactoryWager!';
  const hash = fastHash(data, 'wyhash');
  console.log(`   Input: "${data}"`);
  console.log(`   Hash: ${hash}`);

  // Password hashing demo
  console.log('\n2️⃣  Password Hashing (Argon2):');
  const password = 'super-secret-password';
  const passwordHash = await hashPassword(password);
  console.log(`   Password: "${password}"`);
  console.log(`   Hash: ${passwordHash.slice(0, 50)}...`);
  const isValid = await verifyPassword(password, passwordHash);
  console.log(`   Valid: ${isValid ? '✅' : '❌'}`);

  // Compression demo
  console.log('\n3️⃣  Compression (gzip):');
  const original = 'x'.repeat(10000);
  const compressed = compressData(original, 'gzip', 6);
  const ratio = (((original.length - compressed.length) / original.length) * 100).toFixed(1);
  console.log(`   Original: ${original.length} bytes`);
  console.log(`   Compressed: ${compressed.length} bytes`);
  console.log(`   Ratio: ${ratio}% smaller`);

  // Timing demo
  console.log('\n4️⃣  High-Resolution Timing:');
  const timer = createTimer('Operation');
  await sleep(100);
  const elapsed = timer.log();
  console.log(`   Slept for ~100ms, measured: ${elapsed.toFixed(2)}ms`);

  // Semver demo
  console.log('\n5️⃣  Semver Parsing:');
  const v1 = '1.2.3';
  const v2 = '1.3.0';
  const comparison = compareVersions(v1, v2);
  console.log(`   ${v1} vs ${v2}: ${comparison < 0 ? '<' : comparison > 0 ? '>' : '='}`);
  console.log(`   ${v1} satisfies ^1.0.0: ${satisfiesVersion(v1, '^1.0.0') ? '✅' : '❌'}`);

  // HTML escaping demo
  console.log('\n6️⃣  HTML Escaping:');
  const html = '<script>alert("xss")</script>';
  const escaped = escapeHTML(html);
  console.log(`   Input: ${html}`);
  console.log(`   Escaped: ${escaped}`);

  // Bun version
  console.log('\n7️⃣  Bun Version:');
  const version = getBunVersion();
  console.log(`   Version: ${version.version}`);
  console.log(`   Revision: ${version.revision.slice(0, 8)}...`);

  console.log('\n✅ Demo complete!\n');
}

if (isMainModule(import.meta)) {
  demoBunEnhanced();
}
