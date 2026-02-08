#!/usr/bin/env bun
/**
 * BarberShop ELITE Security Module
 * =================================
 * Production-grade security using Bun-native crypto APIs
 * 
 * Elite Features:
 * - Bun.password for Argon2id/bcrypt password hashing
 * - Bun.CryptoHasher for HMAC/request signing
 * - Bun.hash for fast non-cryptographic hashing
 * - Secure token generation with timing-safe comparison
 */

import { nanoseconds } from 'bun';

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD SECURITY (Bun.password)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PasswordConfig {
  algorithm: 'argon2id' | 'argon2i' | 'argon2d' | 'bcrypt';
  memoryCost?: number; // For argon2 (KiB)
  timeCost?: number;   // For argon2 (iterations)
  cost?: number;       // For bcrypt (4-31)
}

const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536,  // 64MB
  timeCost: 3,        // 3 iterations
};

export class ElitePasswordManager {
  private config: PasswordConfig;
  
  constructor(config: Partial<PasswordConfig> = {}) {
    this.config = { ...DEFAULT_PASSWORD_CONFIG, ...config };
  }
  
  /**
   * Hash password using Bun.password (Argon2id by default)
   * Returns PHC-encoded hash string
   */
  async hash(password: string): Promise<string> {
    const startNs = nanoseconds();
    
    const hash = await Bun.password.hash(password, {
      algorithm: this.config.algorithm,
      memoryCost: this.config.memoryCost,
      timeCost: this.config.timeCost,
      cost: this.config.cost,
    });
    
    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    console.log(`[PASSWORD] Hashed in ${elapsedMs.toFixed(2)}ms (${this.config.algorithm})`);
    
    return hash;
  }
  
  /**
   * Verify password against hash
   * Auto-detects algorithm from hash format (PHC or MCF)
   */
  async verify(password: string, hash: string): Promise<boolean> {
    const startNs = nanoseconds();
    
    const isMatch = await Bun.password.verify(password, hash);
    
    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    console.log(`[PASSWORD] Verified in ${elapsedMs.toFixed(2)}ms`);
    
    return isMatch;
  }
  
  /**
   * Synchronous hash (use sparingly - blocks thread)
   */
  hashSync(password: string): string {
    return Bun.password.hashSync(password, {
      algorithm: this.config.algorithm,
      memoryCost: this.config.memoryCost,
      timeCost: this.config.timeCost,
      cost: this.config.cost,
    });
  }
  
  /**
   * Synchronous verify (use sparingly - blocks thread)
   */
  verifySync(password: string, hash: string): boolean {
    return Bun.password.verifySync(password, hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST SIGNING (Bun.CryptoHasher)
// ═══════════════════════════════════════════════════════════════════════════════

export type HashAlgorithm = 
  | 'sha256' | 'sha384' | 'sha512' 
  | 'sha3-256' | 'sha3-384' | 'sha3-512'
  | 'blake2b256' | 'blake2b512'
  | 'sha1' | 'md5';

export class EliteRequestSigner {
  private secret: string;
  private algorithm: HashAlgorithm;
  
  constructor(secret: string, algorithm: HashAlgorithm = 'sha256') {
    this.secret = secret;
    this.algorithm = algorithm;
  }
  
  /**
   * Sign data with HMAC
   */
  sign(data: string | Uint8Array | ArrayBuffer): string {
    const hasher = new Bun.CryptoHasher(this.algorithm, this.secret);
    hasher.update(data);
    return hasher.digest('hex');
  }
  
  /**
   * Sign with timestamp for replay protection
   */
  signWithTimestamp(data: string, ttlSeconds = 300): { signature: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}:${data}`;
    return {
      signature: this.sign(payload),
      timestamp,
    };
  }
  
  /**
   * Verify signed data
   */
  verify(data: string | Uint8Array, signature: string): boolean {
    const expected = this.sign(data);
    return timingSafeEqual(signature, expected);
  }
  
  /**
   * Verify with timestamp and TTL
   */
  verifyWithTimestamp(
    data: string, 
    signature: string, 
    timestamp: number, 
    ttlSeconds = 300
  ): { valid: boolean; expired: boolean } {
    const now = Math.floor(Date.now() / 1000);
    const expired = now - timestamp > ttlSeconds;
    
    const payload = `${timestamp}:${data}`;
    const valid = this.verify(payload, signature);
    
    return { valid, expired };
  }
  
  /**
   * Generate API key
   */
  generateApiKey(prefix = 'elite'): string {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(random);
    hash.update(this.secret);
    return `${prefix}_${hash.digest('base64').slice(0, 32)}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAST HASHING (Bun.hash)
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteFastHash {
  /**
   * Fast non-cryptographic hash (Wyhash)
   * Use for: Cache keys, bloom filters, hash maps
   * NOT for: Passwords, cryptographic signatures
   */
  static hash(data: string | Uint8Array | ArrayBuffer, seed = 0): bigint {
    return Bun.hash(data, seed);
  }
  
  /**
   * 32-bit CRC32 hash
   */
  static crc32(data: string | Uint8Array, seed = 0): number {
    return Bun.hash.crc32(data, seed);
  }
  
  /**
   * 32-bit xxHash (fastest)
   */
  static xxHash32(data: string | Uint8Array, seed = 0): number {
    return Bun.hash.xxHash32(data, seed);
  }
  
  /**
   * 64-bit xxHash
   */
  static xxHash64(data: string | Uint8Array, seed = 0): bigint {
    return Bun.hash.xxHash64(data, seed);
  }
  
  /**
   * Generate ETag for HTTP caching
   */
  static etag(data: string | Uint8Array): string {
    const hash = Bun.hash(data);
    return `"${hash.toString(16).slice(0, 16)}"`;
  }
  
  /**
   * Generate cache key
   */
  static cacheKey(...parts: (string | number)[]): string {
    const combined = parts.join(':');
    const hash = Bun.hash(combined);
    return `cache:${hash.toString(36).slice(0, 12)}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteTokenManager {
  /**
   * Generate cryptographically secure random token
   */
  static generateToken(length = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Buffer.from(bytes).toString('base64url');
  }
  
  /**
   * Generate UUID v4
   */
  static uuid(): string {
    return crypto.randomUUID();
  }
  
  /**
   * Generate UUID v7 (time-ordered)
   */
  static uuidv7(): string {
    return Bun.randomUUIDv7();
  }
  
  /**
   * Hash token for storage (one-way)
   */
  static hashToken(token: string): string {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING-SAFE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecurityConfig {
  password: PasswordConfig;
  signingSecret: string;
  signingAlgorithm: HashAlgorithm;
}

export function createEliteSecurity(config: Partial<SecurityConfig> = {}) {
  const passwordManager = new ElitePasswordManager(config.password);
  const requestSigner = new EliteRequestSigner(
    config.signingSecret || EliteTokenManager.generateToken(32),
    config.signingAlgorithm || 'sha256'
  );
  
  return {
    password: passwordManager,
    signer: requestSigner,
    fastHash: EliteFastHash,
    tokens: EliteTokenManager,
    timingSafeEqual,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

// Color helper
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🔐 ELITE SECURITY MODULE                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Bun.password • Bun.CryptoHasher • Bun.hash                      ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  const security = createEliteSecurity();
  
  // Password hashing demo
  console.log(c.bold('1. Password Hashing (Argon2id)'));
  const password = 'super-secure-pa$$word';
  const hash = await security.password.hash(password);
  console.log(`   Input:    ${password}`);
  console.log(`   Hash:     ${hash.slice(0, 50)}...`);
  
  const isValid = await security.password.verify(password, hash);
  const isInvalid = await security.password.verify('wrong-password', hash);
  console.log(`   Valid:    ${isValid ? '✓ YES' : '✗ NO'}`);
  console.log(`   Invalid:  ${isInvalid ? '✓ YES' : '✗ NO'}`);
  
  // Request signing demo
  console.log(c.bold('\n2. Request Signing (HMAC-SHA256)'));
  const data = JSON.stringify({ barberId: 'jb', timestamp: Date.now() });
  const signed = security.signer.signWithTimestamp(data);
  console.log(`   Data:      ${data.slice(0, 50)}...`);
  console.log(`   Signature: ${signed.signature.slice(0, 40)}...`);
  console.log(`   Timestamp: ${signed.timestamp}`);
  
  const verified = security.signer.verifyWithTimestamp(
    data,
    signed.signature,
    signed.timestamp,
    300
  );
  console.log(`   Valid:     ${verified.valid ? '✓ YES' : '✗ NO'}`);
  console.log(`   Expired:   ${verified.expired ? '✓ YES' : '✗ NO'}`);
  
  // Fast hashing demo
  console.log(c.bold('\n3. Fast Non-Cryptographic Hashing'));
  const testData = 'barbershop:elite:v4';
  
  const wyhash = EliteFastHash.hash(testData);
  const crc32 = EliteFastHash.crc32(testData);
  const xx32 = EliteFastHash.xxHash32(testData);
  const etag = EliteFastHash.etag(testData);
  const cacheKey = EliteFastHash.cacheKey('barbers', 'active', 123);
  
  console.log(`   Input:     ${testData}`);
  console.log(`   Wyhash:    ${wyhash}`);
  console.log(`   CRC32:     ${crc32}`);
  console.log(`   xxHash32:  ${xx32}`);
  console.log(`   ETag:      ${etag}`);
  console.log(`   Cache Key: ${cacheKey}`);
  
  // Token generation
  console.log(c.bold('\n4. Secure Token Generation'));
  const token = EliteTokenManager.generateToken(32);
  const uuid = EliteTokenManager.uuid();
  const uuid7 = EliteTokenManager.uuidv7();
  const apiKey = security.signer.generateApiKey('elite');
  
  console.log(`   Random:    ${token.slice(0, 40)}...`);
  console.log(`   UUID v4:   ${uuid}`);
  console.log(`   UUID v7:   ${uuid7}`);
  console.log(`   API Key:   ${apiKey}`);
  
  console.log(c.bold('\n✅ Elite Security Module Ready!'));
  console.log(c.gray('   Use for: Passwords, API signing, ETags, Cache keys'));
}

export default createEliteSecurity;
