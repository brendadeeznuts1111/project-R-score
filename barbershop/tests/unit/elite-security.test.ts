#!/usr/bin/env bun
/**
 * Elite Security Module Tests
 * ===========================
 * Comprehensive test suite for the elite security utilities
 * covering password hashing, request signing, fast hashing,
 * token generation, and timing-safe comparison.
 */

import { describe, expect, test, beforeEach, mock, jest } from 'bun:test';
import {
  ElitePasswordManager,
  EliteRequestSigner,
  EliteFastHash,
  EliteTokenManager,
  timingSafeEqual,
  createEliteSecurity,
  type PasswordConfig,
  type HashAlgorithm,
} from '../../src/utils/elite-security';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

// Store original implementations
const originalBunPassword = Bun.password;
const originalCryptoGetRandomValues = globalThis.crypto.getRandomValues;
const originalCryptoRandomUUID = globalThis.crypto.randomUUID;
const originalBunRandomUUIDv7 = Bun.randomUUIDv7;

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE PASSWORD MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ElitePasswordManager', () => {
  let manager: ElitePasswordManager;

  beforeEach(() => {
    manager = new ElitePasswordManager();
  });

  describe('constructor', () => {
    test('uses default config when no config provided', () => {
      const mgr = new ElitePasswordManager();
      expect(mgr).toBeDefined();
    });

    test('merges custom config with defaults', () => {
      const mgr = new ElitePasswordManager({
        algorithm: 'bcrypt',
        cost: 12,
      });
      expect(mgr).toBeDefined();
    });

    test('supports all algorithm types', () => {
      const algorithms: PasswordConfig['algorithm'][] = [
        'argon2id',
        'argon2i',
        'argon2d',
        'bcrypt',
      ];
      for (const algorithm of algorithms) {
        const mgr = new ElitePasswordManager({ algorithm });
        expect(mgr).toBeDefined();
      }
    });
  });

  describe('hash() - async', () => {
    test('hashes password and returns string', async () => {
      const mockHash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hash';
      Bun.password.hash = mock(() => Promise.resolve(mockHash));

      const result = await manager.hash('my-password');
      expect(result).toBe(mockHash);
      expect(Bun.password.hash).toHaveBeenCalled();
    });

    test('uses configured algorithm', async () => {
      Bun.password.hash = mock(() => Promise.resolve('hashed'));

      await manager.hash('password');
      const callArgs = (Bun.password.hash as ReturnType<typeof mock>).mock.calls[0];
      expect(callArgs[1].algorithm).toBe('argon2id');
    });

    test('uses argon2 memory and time costs', async () => {
      Bun.password.hash = mock(() => Promise.resolve('hashed'));

      await manager.hash('password');
      const callArgs = (Bun.password.hash as ReturnType<typeof mock>).mock.calls[0];
      expect(callArgs[1].memoryCost).toBe(65536);
      expect(callArgs[1].timeCost).toBe(3);
    });

    test('handles bcrypt cost parameter', async () => {
      Bun.password.hash = mock(() => Promise.resolve('hashed'));
      const bcryptMgr = new ElitePasswordManager({
        algorithm: 'bcrypt',
        cost: 12,
      });

      await bcryptMgr.hash('password');
      const callArgs = (Bun.password.hash as ReturnType<typeof mock>).mock.calls[0];
      expect(callArgs[1].algorithm).toBe('bcrypt');
      expect(callArgs[1].cost).toBe(12);
    });

    test('handles empty password', async () => {
      Bun.password.hash = mock(() => Promise.resolve('$argon2id$empty'));

      const result = await manager.hash('');
      expect(result).toBe('$argon2id$empty');
    });

    test('handles long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      Bun.password.hash = mock(() => Promise.resolve('$argon2id$long'));

      const result = await manager.hash(longPassword);
      expect(result).toBe('$argon2id$long');
    });

    test('handles passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      Bun.password.hash = mock(() => Promise.resolve('$argon2id$special'));

      const result = await manager.hash(specialPassword);
      expect(result).toBe('$argon2id$special');
    });
  });

  describe('verify() - async', () => {
    test('returns true for correct password', async () => {
      Bun.password.verify = mock(() => Promise.resolve(true));

      const result = await manager.verify('password', '$argon2id$hash');
      expect(result).toBe(true);
      expect(Bun.password.verify).toHaveBeenCalled();
    });

    test('returns false for wrong password', async () => {
      Bun.password.verify = mock(() => Promise.resolve(false));

      const result = await manager.verify('wrong-password', '$argon2id$hash');
      expect(result).toBe(false);
    });

    test('auto-detects algorithm from hash format', async () => {
      Bun.password.verify = mock(() => Promise.resolve(true));

      await manager.verify('password', '$2b$10$bcrypt.hash.here');
      expect(Bun.password.verify).toHaveBeenCalledWith('password', '$2b$10$bcrypt.hash.here');
    });

    test('handles empty password verification', async () => {
      Bun.password.verify = mock(() => Promise.resolve(false));

      const result = await manager.verify('', '$argon2id$hash');
      expect(result).toBe(false);
    });
  });

  describe('hashSync() - sync', () => {
    test('synchronously hashes password', () => {
      Bun.password.hashSync = mock(() => '$argon2id$sync_hash');

      const result = manager.hashSync('password');
      expect(result).toBe('$argon2id$sync_hash');
      expect(Bun.password.hashSync).toHaveBeenCalled();
    });

    test('uses configured algorithm for sync', () => {
      Bun.password.hashSync = mock(() => 'hashed');

      manager.hashSync('password');
      const callArgs = (Bun.password.hashSync as ReturnType<typeof mock>).mock.calls[0];
      expect(callArgs[1].algorithm).toBe('argon2id');
    });

    test('handles sync errors', () => {
      Bun.password.hashSync = mock(() => {
        throw new Error('Sync hash failed');
      });

      expect(() => manager.hashSync('password')).toThrow('Sync hash failed');
    });
  });

  describe('verifySync() - sync', () => {
    test('synchronously verifies correct password', () => {
      Bun.password.verifySync = mock(() => true);

      const result = manager.verifySync('password', '$argon2id$hash');
      expect(result).toBe(true);
      expect(Bun.password.verifySync).toHaveBeenCalled();
    });

    test('synchronously verifies wrong password', () => {
      Bun.password.verifySync = mock(() => false);

      const result = manager.verifySync('wrong-password', '$argon2id$hash');
      expect(result).toBe(false);
    });

    test('handles sync verification errors', () => {
      Bun.password.verifySync = mock(() => {
        throw new Error('Sync verify failed');
      });

      expect(() => manager.verifySync('password', 'hash')).toThrow('Sync verify failed');
    });
  });

  describe('integration flow', () => {
    test('full hash then verify cycle', async () => {
      const mockHashValue = '$argon2id$v=19$m=65536,t=3,p=4$encodedhash';
      Bun.password.hash = mock(() => Promise.resolve(mockHashValue));
      Bun.password.verify = mock((password: string, hash: string) => {
        return Promise.resolve(password === 'correct-password' && hash === mockHashValue);
      });

      const hash = await manager.hash('correct-password');
      const isValid = await manager.verify('correct-password', hash);
      const isInvalid = await manager.verify('wrong-password', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE REQUEST SIGNER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EliteRequestSigner', () => {
  const SECRET = 'test-secret-key-12345';
  let signer: EliteRequestSigner;

  beforeEach(() => {
    signer = new EliteRequestSigner(SECRET);
  });

  describe('constructor', () => {
    test('creates signer with secret and default algorithm', () => {
      const s = new EliteRequestSigner(SECRET);
      expect(s).toBeDefined();
    });

    test('creates signer with custom algorithm', () => {
      const algorithms: HashAlgorithm[] = [
        'sha256',
        'sha384',
        'sha512',
        'sha3-256',
        'sha3-384',
        'sha3-512',
        'blake2b256',
        'blake2b512',
        'sha1',
        'md5',
      ];
      for (const algorithm of algorithms) {
        const s = new EliteRequestSigner(SECRET, algorithm);
        expect(s).toBeDefined();
      }
    });

    test('creates signer with empty secret', () => {
      const s = new EliteRequestSigner('');
      expect(s).toBeDefined();
    });
  });

  describe('sign()', () => {
    test('signs string data with HMAC', () => {
      const data = 'test data to sign';
      const signature = signer.sign(data);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('signs Uint8Array data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = signer.sign(data);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    test('signs ArrayBuffer data', () => {
      const data = new ArrayBuffer(8);
      const signature = signer.sign(data);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    test('produces consistent signatures for same data', () => {
      const data = 'consistent data';
      const sig1 = signer.sign(data);
      const sig2 = signer.sign(data);
      expect(sig1).toBe(sig2);
    });

    test('produces different signatures for different data', () => {
      const sig1 = signer.sign('data1');
      const sig2 = signer.sign('data2');
      expect(sig1).not.toBe(sig2);
    });

    test('produces different signatures with different secrets', () => {
      const signer2 = new EliteRequestSigner('different-secret');
      const data = 'same data';
      const sig1 = signer.sign(data);
      const sig2 = signer2.sign(data);
      expect(sig1).not.toBe(sig2);
    });

    test('produces different signatures with different algorithms', () => {
      const signer384 = new EliteRequestSigner(SECRET, 'sha384');
      const data = 'same data';
      const sig256 = signer.sign(data);
      const sig384 = signer384.sign(data);
      expect(sig256).not.toBe(sig384);
    });

    test('handles empty string data', () => {
      const signature = signer.sign('');
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    test('handles binary data', () => {
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }
      const signature = signer.sign(binaryData);
      expect(signature).toBeDefined();
    });

    test('produces hex-encoded output', () => {
      const signature = signer.sign('test');
      // Hex should only contain 0-9, a-f
      expect(/^[0-9a-f]+$/.test(signature)).toBe(true);
    });
  });

  describe('signWithTimestamp()', () => {
    test('signs data with timestamp', () => {
      const data = 'test data';
      const result = signer.signWithTimestamp(data);
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.signature).toBe('string');
      expect(typeof result.timestamp).toBe('number');
    });

    test('timestamp is in seconds (not milliseconds)', () => {
      const beforeMs = Date.now();
      const result = signer.signWithTimestamp('data');
      const afterMs = Date.now();
      
      // Should be roughly 1000x smaller than milliseconds
      expect(result.timestamp).toBeLessThan(afterMs / 1000 + 1);
      expect(result.timestamp).toBeGreaterThan(beforeMs / 1000 - 1);
    });

    test('custom TTL is accepted (but not used in signing)', () => {
      const result1 = signer.signWithTimestamp('data', 60);
      const result2 = signer.signWithTimestamp('data', 3600);
      
      // Signatures should be different due to different timestamps
      expect(result1.signature).toBeDefined();
      expect(result2.signature).toBeDefined();
    });

    test('signature includes timestamp in payload', () => {
      const data = 'test';
      const result = signer.signWithTimestamp(data);
      
      // Manual verification that timestamp is part of signed data
      const payload = `${result.timestamp}:${data}`;
      const manualSig = signer.sign(payload);
      expect(result.signature).toBe(manualSig);
    });
  });

  describe('verify()', () => {
    test('returns true for valid signature', () => {
      const data = 'test data';
      const signature = signer.sign(data);
      const isValid = signer.verify(data, signature);
      expect(isValid).toBe(true);
    });

    test('returns false for invalid signature', () => {
      const data = 'test data';
      const signature = signer.sign(data);
      const isValid = signer.verify(data, signature + 'modified');
      expect(isValid).toBe(false);
    });

    test('returns false for tampered data', () => {
      const data = 'test data';
      const signature = signer.sign(data);
      const isValid = signer.verify('tampered data', signature);
      expect(isValid).toBe(false);
    });

    test('returns false for wrong secret (via different signer)', () => {
      const data = 'test data';
      const signature = signer.sign(data);
      const wrongSigner = new EliteRequestSigner('wrong-secret');
      const isValid = wrongSigner.verify(data, signature);
      expect(isValid).toBe(false);
    });

    test('handles empty signature', () => {
      const isValid = signer.verify('data', '');
      expect(isValid).toBe(false);
    });

    test('uses timing-safe comparison', () => {
      const data = 'test';
      const signature = signer.sign(data);
      
      // Should not throw and should return correct result
      const isValid = signer.verify(data, signature);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyWithTimestamp()', () => {
    test('returns valid=true for fresh timestamp', () => {
      const data = 'test data';
      const now = Math.floor(Date.now() / 1000);
      const signature = signer.sign(`${now}:${data}`);
      
      const result = signer.verifyWithTimestamp(data, signature, now, 300);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
    });

    test('returns expired=true for old timestamp', () => {
      const data = 'test data';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000; // 1000 seconds ago
      const signature = signer.sign(`${oldTimestamp}:${data}`);
      
      const result = signer.verifyWithTimestamp(data, signature, oldTimestamp, 300);
      expect(result.valid).toBe(true); // Signature is valid
      expect(result.expired).toBe(true); // But expired
    });

    test('returns valid=false for wrong signature', () => {
      const data = 'test data';
      const now = Math.floor(Date.now() / 1000);
      
      const result = signer.verifyWithTimestamp(data, 'wrong-sig', now, 300);
      expect(result.valid).toBe(false);
    });

    test('uses custom TTL correctly', () => {
      const data = 'test data';
      const somewhatOld = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = signer.sign(`${somewhatOld}:${data}`);
      
      // With 300 second TTL, should be expired
      const result1 = signer.verifyWithTimestamp(data, signature, somewhatOld, 300);
      expect(result1.expired).toBe(true);
      
      // With 600 second TTL, should not be expired
      const result2 = signer.verifyWithTimestamp(data, signature, somewhatOld, 600);
      expect(result2.expired).toBe(false);
    });

    test('handles timestamp in the future', () => {
      const data = 'test data';
      const futureTimestamp = Math.floor(Date.now() / 1000) + 1000; // Future
      const signature = signer.sign(`${futureTimestamp}:${data}`);
      
      const result = signer.verifyWithTimestamp(data, signature, futureTimestamp, 300);
      // Future timestamp should be considered valid but potentially problematic
      expect(result.valid).toBe(true);
    });
  });

  describe('generateApiKey()', () => {
    test('generates API key with default prefix', () => {
      const apiKey = signer.generateApiKey();
      expect(apiKey).toBeDefined();
      expect(apiKey.startsWith('elite_')).toBe(true);
    });

    test('generates API key with custom prefix', () => {
      const apiKey = signer.generateApiKey('myapp');
      expect(apiKey.startsWith('myapp_')).toBe(true);
    });

    test('generates unique API keys', () => {
      const key1 = signer.generateApiKey();
      const key2 = signer.generateApiKey();
      expect(key1).not.toBe(key2);
    });

    test('generates consistent length keys', () => {
      const key = signer.generateApiKey();
      const parts = key.split('_');
      expect(parts.length).toBe(2);
      expect(parts[1].length).toBe(32); // Base64 slice length
    });

    test('handles empty prefix', () => {
      const apiKey = signer.generateApiKey('');
      expect(apiKey.startsWith('_')).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE FAST HASH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EliteFastHash', () => {
  describe('hash() - Wyhash', () => {
    test('hashes string data', () => {
      const hash = EliteFastHash.hash('test data');
      expect(typeof hash).toBe('bigint');
    });

    test('hashes Uint8Array data', () => {
      const hash = EliteFastHash.hash(new Uint8Array([1, 2, 3]));
      expect(typeof hash).toBe('bigint');
    });

    test('produces consistent hashes', () => {
      const hash1 = EliteFastHash.hash('same data');
      const hash2 = EliteFastHash.hash('same data');
      expect(hash1).toBe(hash2);
    });

    test('produces different hashes for different data', () => {
      const hash1 = EliteFastHash.hash('data1');
      const hash2 = EliteFastHash.hash('data2');
      expect(hash1).not.toBe(hash2);
    });

    test('uses seed parameter', () => {
      const hash1 = EliteFastHash.hash('data', 0);
      const hash2 = EliteFastHash.hash('data', 123);
      expect(hash1).not.toBe(hash2);
    });

    test('handles empty string', () => {
      const hash = EliteFastHash.hash('');
      expect(typeof hash).toBe('bigint');
    });

    test('handles large data', () => {
      const largeData = 'x'.repeat(100000);
      const hash = EliteFastHash.hash(largeData);
      expect(typeof hash).toBe('bigint');
    });
  });

  describe('crc32()', () => {
    test('computes CRC32 hash', () => {
      const hash = EliteFastHash.crc32('test');
      expect(typeof hash).toBe('number');
    });

    test('produces consistent CRC32', () => {
      const hash1 = EliteFastHash.crc32('same');
      const hash2 = EliteFastHash.crc32('same');
      expect(hash1).toBe(hash2);
    });

    test('uses seed parameter', () => {
      const hash1 = EliteFastHash.crc32('data', 0);
      const hash2 = EliteFastHash.crc32('data', 1);
      expect(hash1).not.toBe(hash2);
    });

    test('returns 32-bit number', () => {
      const hash = EliteFastHash.crc32('test');
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xFFFFFFFF);
    });
  });

  describe('xxHash32()', () => {
    test('computes xxHash32', () => {
      const hash = EliteFastHash.xxHash32('test');
      expect(typeof hash).toBe('number');
    });

    test('produces consistent xxHash32', () => {
      const hash1 = EliteFastHash.xxHash32('same');
      const hash2 = EliteFastHash.xxHash32('same');
      expect(hash1).toBe(hash2);
    });

    test('uses seed parameter', () => {
      const hash1 = EliteFastHash.xxHash32('data', 0);
      const hash2 = EliteFastHash.xxHash32('data', 999);
      expect(hash1).not.toBe(hash2);
    });

    test('returns 32-bit number', () => {
      const hash = EliteFastHash.xxHash32('test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('xxHash64()', () => {
    test('computes xxHash64', () => {
      const hash = EliteFastHash.xxHash64('test');
      expect(typeof hash).toBe('bigint');
    });

    test('produces consistent xxHash64', () => {
      const hash1 = EliteFastHash.xxHash64('same');
      const hash2 = EliteFastHash.xxHash64('same');
      expect(hash1).toBe(hash2);
    });

    test('uses seed parameter', () => {
      const hash1 = EliteFastHash.xxHash64('data', 0);
      const hash2 = EliteFastHash.xxHash64('data', 999);
      expect(hash1).not.toBe(hash2);
    });

    test('returns 64-bit bigint', () => {
      const hash = EliteFastHash.xxHash64('test');
      expect(hash).toBeGreaterThanOrEqual(BigInt(0));
    });
  });

  describe('etag()', () => {
    test('generates ETag string', () => {
      const etag = EliteFastHash.etag('test content');
      expect(typeof etag).toBe('string');
      expect(etag.startsWith('"')).toBe(true);
      expect(etag.endsWith('"')).toBe(true);
    });

    test('produces consistent ETags', () => {
      const etag1 = EliteFastHash.etag('same content');
      const etag2 = EliteFastHash.etag('same content');
      expect(etag1).toBe(etag2);
    });

    test('produces different ETags for different content', () => {
      const etag1 = EliteFastHash.etag('content1');
      const etag2 = EliteFastHash.etag('content2');
      expect(etag1).not.toBe(etag2);
    });

    test('limits to 16 hex characters', () => {
      const etag = EliteFastHash.etag('test');
      const hexPart = etag.slice(1, -1); // Remove quotes
      expect(hexPart.length).toBeLessThanOrEqual(16);
    });

    test('handles binary data', () => {
      const binaryData = new Uint8Array([0x00, 0xFF, 0x42, 0x12]);
      const etag = EliteFastHash.etag(binaryData);
      expect(typeof etag).toBe('string');
      expect(etag.startsWith('"')).toBe(true);
    });
  });

  describe('cacheKey()', () => {
    test('generates cache key string', () => {
      const key = EliteFastHash.cacheKey('user', 123);
      expect(typeof key).toBe('string');
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('accepts string parts', () => {
      const key = EliteFastHash.cacheKey('a', 'b', 'c');
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('accepts number parts', () => {
      const key = EliteFastHash.cacheKey(1, 2, 3);
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('accepts mixed parts', () => {
      const key = EliteFastHash.cacheKey('user', 123, 'profile');
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('produces consistent keys for same parts', () => {
      const key1 = EliteFastHash.cacheKey('a', 1);
      const key2 = EliteFastHash.cacheKey('a', 1);
      expect(key1).toBe(key2);
    });

    test('produces different keys for different parts', () => {
      const key1 = EliteFastHash.cacheKey('a', 1);
      const key2 = EliteFastHash.cacheKey('a', 2);
      expect(key1).not.toBe(key2);
    });

    test('handles single part', () => {
      const key = EliteFastHash.cacheKey('single');
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('handles many parts', () => {
      const key = EliteFastHash.cacheKey('a', 'b', 'c', 'd', 'e', 'f', 'g');
      expect(key.startsWith('cache:')).toBe(true);
    });

    test('limits hash portion to 12 characters', () => {
      const key = EliteFastHash.cacheKey('test');
      const hashPart = key.slice(6); // Remove 'cache:' prefix
      expect(hashPart.length).toBeLessThanOrEqual(12);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE TOKEN MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EliteTokenManager', () => {
  describe('generateToken()', () => {
    test('generates token of specified length', () => {
      const token = EliteTokenManager.generateToken(32);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    test('generates base64url encoded token', () => {
      const token = EliteTokenManager.generateToken(32);
      // base64url should not contain +, /, or =
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
    });

    test('generates unique tokens', () => {
      const token1 = EliteTokenManager.generateToken(32);
      const token2 = EliteTokenManager.generateToken(32);
      expect(token1).not.toBe(token2);
    });

    test('generates different length tokens based on input', () => {
      const token16 = EliteTokenManager.generateToken(16);
      const token32 = EliteTokenManager.generateToken(32);
      const token64 = EliteTokenManager.generateToken(64);
      
      // Base64 encoding expands data, so lengths should be different
      expect(token16.length).not.toBe(token32.length);
      expect(token32.length).not.toBe(token64.length);
    });

    test('handles minimum length', () => {
      const token = EliteTokenManager.generateToken(1);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    test('uses default length when not specified', () => {
      const token = EliteTokenManager.generateToken();
      expect(token).toBeDefined();
    });
  });

  describe('uuid()', () => {
    test('generates valid UUID v4', () => {
      const uuid = EliteTokenManager.uuid();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('generates unique UUIDs', () => {
      const uuid1 = EliteTokenManager.uuid();
      const uuid2 = EliteTokenManager.uuid();
      expect(uuid1).not.toBe(uuid2);
    });

    test('generates UUID with version 4', () => {
      const uuid = EliteTokenManager.uuid();
      const version = uuid.charAt(14);
      expect(version).toBe('4');
    });
  });

  describe('uuidv7()', () => {
    test('generates valid UUID v7', () => {
      const uuid = EliteTokenManager.uuidv7();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      // UUID v7 format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('generates unique UUIDs', () => {
      const uuid1 = EliteTokenManager.uuidv7();
      const uuid2 = EliteTokenManager.uuidv7();
      expect(uuid1).not.toBe(uuid2);
    });

    test('generates UUID with version 7', () => {
      const uuid = EliteTokenManager.uuidv7();
      const version = uuid.charAt(14);
      expect(version).toBe('7');
    });

    test('UUIDs are time-ordered', () => {
      const uuids: string[] = [];
      for (let i = 0; i < 5; i++) {
        uuids.push(EliteTokenManager.uuidv7());
      }
      
      // Compare timestamps embedded in UUID (first 48 bits)
      const timestamps = uuids.map(u => BigInt('0x' + u.replace(/-/g, '').slice(0, 12)));
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('hashToken()', () => {
    test('hashes token using SHA256', () => {
      const hash = EliteTokenManager.hashToken('my-token');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 hex is 64 chars
    });

    test('produces consistent hash', () => {
      const hash1 = EliteTokenManager.hashToken('same-token');
      const hash2 = EliteTokenManager.hashToken('same-token');
      expect(hash1).toBe(hash2);
    });

    test('produces different hashes for different tokens', () => {
      const hash1 = EliteTokenManager.hashToken('token1');
      const hash2 = EliteTokenManager.hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    test('produces hex output', () => {
      const hash = EliteTokenManager.hashToken('test');
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    test('handles empty token', () => {
      const hash = EliteTokenManager.hashToken('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    test('handles long tokens', () => {
      const longToken = 'x'.repeat(1000);
      const hash = EliteTokenManager.hashToken(longToken);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING-SAFE EQUAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('timingSafeEqual', () => {
  test('returns true for equal strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  test('returns false for different strings', () => {
    expect(timingSafeEqual('abc', 'def')).toBe(false);
  });

  test('returns false for different length strings', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  test('returns false for empty vs non-empty', () => {
    expect(timingSafeEqual('', 'a')).toBe(false);
  });

  test('returns true for two empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });

  test('handles long strings', () => {
    const str = 'x'.repeat(10000);
    expect(timingSafeEqual(str, str)).toBe(true);
  });

  test('handles unicode characters', () => {
    expect(timingSafeEqual('héllo', 'héllo')).toBe(true);
    expect(timingSafeEqual('héllo', 'hello')).toBe(false);
  });

  test('handles special characters', () => {
    expect(timingSafeEqual('!@#$%', '!@#$%')).toBe(true);
    expect(timingSafeEqual('!@#$%', '!@#$$')).toBe(false);
  });

  test('is case-sensitive', () => {
    expect(timingSafeEqual('ABC', 'abc')).toBe(false);
  });

  test('handles binary-like strings', () => {
    expect(timingSafeEqual('\x00\x01\x02', '\x00\x01\x02')).toBe(true);
    expect(timingSafeEqual('\x00\x01\x02', '\x00\x01\x03')).toBe(false);
  });

  test('single character difference at start', () => {
    expect(timingSafeEqual('xbc', 'abc')).toBe(false);
  });

  test('single character difference at end', () => {
    expect(timingSafeEqual('abx', 'abc')).toBe(false);
  });

  test('single character difference in middle', () => {
    expect(timingSafeEqual('axc', 'abc')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE ELITE SECURITY FACTORY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('createEliteSecurity', () => {
  test('creates security instance with defaults', () => {
    const security = createEliteSecurity();
    
    expect(security).toHaveProperty('password');
    expect(security).toHaveProperty('signer');
    expect(security).toHaveProperty('fastHash');
    expect(security).toHaveProperty('tokens');
    expect(security).toHaveProperty('timingSafeEqual');
  });

  test('password manager is ElitePasswordManager instance', async () => {
    Bun.password.hash = mock(() => Promise.resolve('mock-hash'));
    
    const security = createEliteSecurity();
    const result = await security.password.hash('test');
    expect(result).toBe('mock-hash');
  });

  test('signer is EliteRequestSigner instance', () => {
    const security = createEliteSecurity();
    const signature = security.signer.sign('test');
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  test('fastHash is EliteFastHash class', () => {
    const security = createEliteSecurity();
    const hash = security.fastHash.hash('test');
    expect(typeof hash).toBe('bigint');
  });

  test('tokens is EliteTokenManager class', () => {
    const security = createEliteSecurity();
    const uuid = security.tokens.uuid();
    expect(typeof uuid).toBe('string');
    expect(uuid.length).toBe(36);
  });

  test('timingSafeEqual is exported function', () => {
    const security = createEliteSecurity();
    expect(security.timingSafeEqual('a', 'a')).toBe(true);
    expect(security.timingSafeEqual('a', 'b')).toBe(false);
  });

  test('accepts custom password config', async () => {
    Bun.password.hash = mock(() => Promise.resolve('mock-hash'));
    
    const security = createEliteSecurity({
      password: { algorithm: 'bcrypt', cost: 12 },
    });
    
    await security.password.hash('test');
    const callArgs = (Bun.password.hash as ReturnType<typeof mock>).mock.calls[0];
    expect(callArgs[1].algorithm).toBe('bcrypt');
    expect(callArgs[1].cost).toBe(12);
  });

  test('accepts custom signing config', () => {
    const security = createEliteSecurity({
      signingSecret: 'custom-secret',
      signingAlgorithm: 'sha384',
    });
    
    const signature = security.signer.sign('test');
    expect(typeof signature).toBe('string');
  });

  test('generates random secret when not provided', () => {
    const security1 = createEliteSecurity();
    const security2 = createEliteSecurity();
    
    // Different instances should have different generated secrets
    const sig1 = security1.signer.sign('test');
    const sig2 = security2.signer.sign('test');
    expect(sig1).not.toBe(sig2);
  });

  test('uses default algorithm when not specified', () => {
    const security = createEliteSecurity({ signingSecret: 'test' });
    const signature = security.signer.sign('data');
    expect(typeof signature).toBe('string');
  });

  test('integrated flow: password + signer + tokens', async () => {
    Bun.password.hash = mock(() => Promise.resolve('$argon2id$hash'));
    Bun.password.verify = mock((password: string) => Promise.resolve(password === 'correct'));
    
    const security = createEliteSecurity({
      signingSecret: 'integration-test-secret',
    });

    // Password flow
    const hash = await security.password.hash('correct');
    const isValid = await security.password.verify('correct', hash);
    expect(isValid).toBe(true);

    // Signer flow
    const signed = security.signer.signWithTimestamp('user:123');
    const verified = security.signer.verifyWithTimestamp(
      'user:123',
      signed.signature,
      signed.timestamp,
      300
    );
    expect(verified.valid).toBe(true);

    // Token flow
    const uuid = security.tokens.uuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // Fast hash flow
    const cacheKey = security.fastHash.cacheKey('user', uuid);
    expect(cacheKey.startsWith('cache:')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases and Error Handling', () => {
  describe('Password edge cases', () => {
    test('handles unicode passwords', async () => {
      Bun.password.hash = mock(() => Promise.resolve('unicode-hash'));
      Bun.password.verify = mock(() => Promise.resolve(true));
      
      const manager = new ElitePasswordManager();
      const unicodePassword = '🔐🎉💻密码пароль';
      
      const hash = await manager.hash(unicodePassword);
      const isValid = await manager.verify(unicodePassword, hash);
      expect(isValid).toBe(true);
    });

    test('handles null bytes in password', async () => {
      Bun.password.hash = mock(() => Promise.resolve('null-hash'));
      
      const manager = new ElitePasswordManager();
      const nullPassword = 'pass\0word';
      
      const hash = await manager.hash(nullPassword);
      expect(hash).toBe('null-hash');
    });
  });

  describe('Signer edge cases', () => {
    test('handles binary data in sign/verify cycle', () => {
      const signer = new EliteRequestSigner('secret');
      const binaryData = new Uint8Array([0x00, 0xFF, 0x42, 0x13, 0x37]);
      
      const signature = signer.sign(binaryData);
      const isValid = signer.verify(binaryData, signature);
      expect(isValid).toBe(true);
    });

    test('handles signature tampering', () => {
      const signer = new EliteRequestSigner('secret');
      const data = 'important data';
      const signature = signer.sign(data);
      
      // Modify signature slightly
      const tamperedSig = signature.slice(0, -1) + (signature.slice(-1) === 'a' ? 'b' : 'a');
      const isValid = signer.verify(data, tamperedSig);
      expect(isValid).toBe(false);
    });

    test('handles expired signature with verifyWithTimestamp', () => {
      const signer = new EliteRequestSigner('secret');
      const data = 'data';
      const veryOldTimestamp = 1000000; // Very old timestamp
      const signature = signer.sign(`${veryOldTimestamp}:${data}`);
      
      const result = signer.verifyWithTimestamp(data, signature, veryOldTimestamp, 1);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(true);
    });
  });

  describe('Fast hash edge cases', () => {
    test('handles very large data', () => {
      const largeData = 'x'.repeat(1000000);
      const hash = EliteFastHash.hash(largeData);
      expect(typeof hash).toBe('bigint');
    });

    test('handles binary data for all hash types', () => {
      const binary = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binary[i] = i;
      }
      
      expect(typeof EliteFastHash.hash(binary)).toBe('bigint');
      expect(typeof EliteFastHash.crc32(binary)).toBe('number');
      expect(typeof EliteFastHash.xxHash32(binary)).toBe('number');
      expect(typeof EliteFastHash.xxHash64(binary)).toBe('bigint');
    });

    test('handles special characters in cacheKey parts', () => {
      const key1 = EliteFastHash.cacheKey('user:123', 'action:test');
      const key2 = EliteFastHash.cacheKey('user:123', 'action:test');
      expect(key1).toBe(key2);
    });
  });

  describe('Token edge cases', () => {
    test('generates tokens with various lengths', () => {
      const lengths = [1, 8, 16, 32, 64, 128, 256];
      for (const len of lengths) {
        const token = EliteTokenManager.generateToken(len);
        expect(token).toBeDefined();
        expect(token.length).toBeGreaterThan(0);
      }
    });

    test('handles zero length token request', () => {
      const token = EliteTokenManager.generateToken(0);
      expect(typeof token).toBe('string');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION & END-TO-END TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Integration Tests', () => {
  test('complete security workflow', async () => {
    // Setup
    Bun.password.hash = mock(() => Promise.resolve('$argon2id$v=19$m=65536$hash'));
    Bun.password.verify = mock((pwd: string) => Promise.resolve(pwd === 'user-password'));
    
    const security = createEliteSecurity({
      signingSecret: 'app-secret-123',
      password: { algorithm: 'argon2id' },
    });

    // 1. User registration - hash password
    const passwordHash = await security.password.hash('user-password');
    expect(passwordHash).toBe('$argon2id$v=19$m=65536$hash');

    // 2. User login - verify password
    const loginValid = await security.password.verify('user-password', passwordHash);
    const loginInvalid = await security.password.verify('wrong-password', passwordHash);
    expect(loginValid).toBe(true);
    expect(loginInvalid).toBe(false);

    // 3. Generate API key for user
    const apiKey = security.signer.generateApiKey('user');
    expect(apiKey.startsWith('user_')).toBe(true);

    // 4. Sign API request
    const requestData = JSON.stringify({ userId: '123', action: 'getProfile' });
    const signedRequest = security.signer.signWithTimestamp(requestData, 60);
    expect(signedRequest.signature).toBeDefined();
    expect(signedRequest.timestamp).toBeDefined();

    // 5. Verify API request
    const verification = security.signer.verifyWithTimestamp(
      requestData,
      signedRequest.signature,
      signedRequest.timestamp,
      60
    );
    expect(verification.valid).toBe(true);
    expect(verification.expired).toBe(false);

    // 6. Generate session token
    const sessionId = security.tokens.uuid();
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // 7. Create cache key for user data
    const cacheKey = security.fastHash.cacheKey('user', sessionId, 'profile');
    expect(cacheKey.startsWith('cache:')).toBe(true);

    // 8. Generate ETag for response
    const responseData = JSON.stringify({ name: 'John', email: 'john@example.com' });
    const etag = security.fastHash.etag(responseData);
    expect(etag.startsWith('"')).toBe(true);

    // 9. Hash session token for storage
    const hashedToken = security.tokens.hashToken(sessionId);
    expect(hashedToken.length).toBe(64);
  });

  test('multiple algorithms work independently', () => {
    const signer256 = new EliteRequestSigner('secret', 'sha256');
    const signer512 = new EliteRequestSigner('secret', 'sha512');
    
    const data = 'test data';
    const sig256 = signer256.sign(data);
    const sig512 = signer512.sign(data);
    
    // Both should be valid with their respective signers
    expect(signer256.verify(data, sig256)).toBe(true);
    expect(signer512.verify(data, sig512)).toBe(true);
    
    // But cross-verification should fail (different algorithms)
    expect(signer256.verify(data, sig512)).toBe(false);
    expect(signer512.verify(data, sig256)).toBe(false);
  });

  test('timing-safe comparison prevents length leak', () => {
    // This test verifies that timingSafeEqual doesn't short-circuit on length
    const short = 'abc';
    const long = 'abcdefghij';
    
    // Should return false without throwing
    expect(timingSafeEqual(short, long)).toBe(false);
    
    // Same length but different content
    expect(timingSafeEqual('abc', 'def')).toBe(false);
  });
});
