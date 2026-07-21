// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/nodejs-compat#nodecrypto — node:crypto
// @see https://bun.com/docs/runtime/web-crypto — SubtleCrypto
/**
 * Spine smoke: SHA3 + X25519 deriveBits (Bun WebCrypto / node:crypto).
 * Vectors from Bun release notes (Hello, world! → sha3-256).
 */
import { describe, expect, test } from 'bun:test';
import crypto from 'node:crypto';

const HELLO = 'Hello, world!';
const SHA3_256_HELLO =
  'f345a219da005ebe9c1a1eaad97bbf38a10c8473e41d0af7fb617caa0c6aa722';

describe('SHA3 (node:crypto + WebCrypto + Bun.CryptoHasher)', () => {
  test('createHash sha3-256 matches known digest', () => {
    const hex = crypto.createHash('sha3-256').update(HELLO).digest('hex');
    expect(hex).toBe(SHA3_256_HELLO);
  });

  test('getHashes includes sha3 family', () => {
    const hashes = crypto.getHashes();
    for (const alg of ['sha3-224', 'sha3-256', 'sha3-384', 'sha3-512'] as const) {
      expect(hashes).toContain(alg);
    }
  });

  test('subtle.digest SHA3-256 matches createHash', async () => {
    const buf = await crypto.subtle.digest('SHA3-256', new TextEncoder().encode(HELLO));
    expect(Buffer.from(buf).toString('hex')).toBe(SHA3_256_HELLO);
  });

  test('Bun.CryptoHasher sha3-256 matches createHash', () => {
    const hex = new Bun.CryptoHasher('sha3-256').update(HELLO).digest('hex');
    expect(hex).toBe(SHA3_256_HELLO);
  });

  test('createHmac sha3-256 is deterministic', () => {
    const a = crypto.createHmac('sha3-256', 'secret-key').update(HELLO).digest('hex');
    const b = crypto.createHmac('sha3-256', 'secret-key').update(HELLO).digest('hex');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });
});

describe('X25519 SubtleCrypto.deriveBits', () => {
  test('deriveBits returns 32-byte shared secret', async () => {
    const local = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    const remote = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'X25519', public: remote.publicKey },
      local.privateKey,
      256
    );
    expect(bits.byteLength).toBe(32);
  });

  test('null length returns full 32-byte output', async () => {
    const local = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    const remote = await crypto.subtle.generateKey('X25519', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'X25519', public: remote.publicKey },
      local.privateKey,
      // Bun accepts null for full output (spec length optional)
      null as unknown as number
    );
    expect(bits.byteLength).toBe(32);
  });
});
