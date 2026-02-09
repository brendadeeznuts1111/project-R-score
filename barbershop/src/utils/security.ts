#!/usr/bin/env bun
/**
 * Security Module
 * Production-grade security using Bun-native crypto APIs
 * 
 * Features:
 * - Bun.password for Argon2id/bcrypt password hashing
 * - Bun.CryptoHasher for HMAC/request signing
 * - Bun.hash for fast non-cryptographic hashing
 * - Secure token generation with timing-safe comparison
 */

import { nanoseconds } from 'bun';

// Password Security (Bun.password)

export interface PasswordConfig {
  algorithm: 'argon2id' | 'argon2i' | 'argon2d' | 'bcrypt';
  memoryCost?: number;
  timeCost?: number;
  cost?: number;
}

const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 3,
};

export class PasswordManager {
  private config: PasswordConfig;
  
  constructor(config: Partial<PasswordConfig> = {}) {
    this.config = { ...DEFAULT_PASSWORD_CONFIG, ...config };
  }
  
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
  
  async verify(password: string, hash: string): Promise<boolean> {
    const startNs = nanoseconds();
    const isMatch = await Bun.password.verify(password, hash);
    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    console.log(`[PASSWORD] Verified in ${elapsedMs.toFixed(2)}ms`);
    return isMatch;
  }
  
  hashSync(password: string): string {
    return Bun.password.hashSync(password, {
      algorithm: this.config.algorithm,
      memoryCost: this.config.memoryCost,
      timeCost: this.config.timeCost,
      cost: this.config.cost,
    });
  }
  
  verifySync(password: string, hash: string): boolean {
    return Bun.password.verifySync(password, hash);
  }
}

// Request Signing (Bun.CryptoHasher)

export type HashAlgorithm = 
  | 'sha256' | 'sha384' | 'sha512' 
  | 'sha3-256' | 'sha3-384' | 'sha3-512'
  | 'blake2b256' | 'blake2b512'
  | 'sha1' | 'md5';

export class RequestSigner {
  private secret: string;
  private algorithm: HashAlgorithm;
  
  constructor(secret: string, algorithm: HashAlgorithm = 'sha256') {
    this.secret = secret;
    this.algorithm = algorithm;
  }
  
  sign(data: string | Uint8Array | ArrayBuffer): string {
    const hasher = new Bun.CryptoHasher(this.algorithm, this.secret);
    hasher.update(data);
    return hasher.digest('hex');
  }
  
  signWithTimestamp(data: string, ttlSeconds = 300): { signature: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}:${data}`;
    return {
      signature: this.sign(payload),
      timestamp,
    };
  }
  
  verify(data: string | Uint8Array, signature: string): boolean {
    const expected = this.sign(data);
    return timingSafeEqual(signature, expected);
  }
  
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
  
  generateApiKey(prefix = 'barber'): string {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(random);
    hash.update(this.secret);
    return `${prefix}_${hash.digest('base64').slice(0, 32)}`;
  }
}

// Fast Hashing (Bun.hash)

export class FastHash {
  static hash(data: string | Uint8Array | ArrayBuffer, seed = 0): bigint {
    return Bun.hash(data, seed);
  }
  
  static crc32(data: string | Uint8Array, seed = 0): number {
    return Bun.hash.crc32(data, seed);
  }
  
  static xxHash32(data: string | Uint8Array, seed = 0): number {
    return Bun.hash.xxHash32(data, seed);
  }
  
  static xxHash64(data: string | Uint8Array, seed = 0): bigint {
    return Bun.hash.xxHash64(data, seed);
  }
  
  static etag(data: string | Uint8Array): string {
    const hash = Bun.hash(data);
    return `"${hash.toString(16).slice(0, 16)}"`;
  }
  
  static cacheKey(...parts: (string | number)[]): string {
    const combined = parts.join(':');
    const hash = Bun.hash(combined);
    return `cache:${hash.toString(36).slice(0, 12)}`;
  }
}

// Secure Tokens

export class TokenManager {
  static generateToken(length = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Buffer.from(bytes).toString('base64url');
  }
  
  static uuid(): string {
    return crypto.randomUUID();
  }
  
  static uuidv7(): string {
    return Bun.randomUUIDv7();
  }
  
  static hashToken(token: string): string {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
  }
}

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

// Config

export interface SecurityConfig {
  password: PasswordConfig;
  signingSecret: string;
  signingAlgorithm: HashAlgorithm;
}

export function createSecurity(config: Partial<SecurityConfig> = {}) {
  const passwordManager = new PasswordManager(config.password);
  const requestSigner = new RequestSigner(
    config.signingSecret || TokenManager.generateToken(32),
    config.signingAlgorithm || 'sha256'
  );
  
  return {
    password: passwordManager,
    signer: requestSigner,
    fastHash: FastHash,
    tokens: TokenManager,
    timingSafeEqual,
  };
}

// Backward compatibility aliases
export const ElitePasswordManager = PasswordManager;
export const EliteRequestSigner = RequestSigner;
export const EliteFastHash = FastHash;
export const EliteTokenManager = TokenManager;
export const createEliteSecurity = createSecurity;

// Demo
if (import.meta.main) {
  const c = {
    bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
    gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  };

  console.log(`\n🔐 Security Module\n`);
  
  const security = createSecurity();
  
  // Password hashing demo
  console.log(c.bold('1. Password Hashing (Argon2id)'));
  const password = 'super-secure-pa$$word';
  const hash = await security.password.hash(password);
  console.log(`   Input:    ${password}`);
  console.log(`   Hash:     ${hash.slice(0, 50)}...`);
  
  const isValid = await security.password.verify(password, hash);
  console.log(`   Valid:    ${isValid ? '✓ YES' : '✗ NO'}`);
  
  // Request signing demo
  console.log(c.bold('\n2. Request Signing (HMAC-SHA256)'));
  const data = JSON.stringify({ barberId: 'jb', timestamp: Date.now() });
  const signed = security.signer.signWithTimestamp(data);
  console.log(`   Signature: ${signed.signature.slice(0, 40)}...`);
  
  const verified = security.signer.verifyWithTimestamp(data, signed.signature, signed.timestamp, 300);
  console.log(`   Valid:     ${verified.valid ? '✓ YES' : '✗ NO'}`);
  
  // Fast hashing demo
  console.log(c.bold('\n3. Fast Hashing'));
  const testData = 'barbershop:v4';
  console.log(`   ETag:      ${FastHash.etag(testData)}`);
  console.log(`   Cache Key: ${FastHash.cacheKey('barbers', 'active', 123)}`);
  
  // Token generation
  console.log(c.bold('\n4. Token Generation'));
  console.log(`   UUID v4:   ${TokenManager.uuid()}`);
  console.log(`   UUID v7:   ${TokenManager.uuidv7()}`);
  console.log(`   API Key:   ${security.signer.generateApiKey('barber')}`);
  
  console.log(c.bold('\n✅ Security Module Ready!\n'));
}

export default createSecurity;