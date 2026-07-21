/**
 * CryptoHasher sha256 / sha1 digests as used by spine security + docs.
 * SHA3 stays in tests/bun-crypto-webcrypto.test.ts.
 *
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 */
import { describe, expect, test } from 'bun:test';
import { CryptoHasher } from 'bun';

const PAYLOAD = 'security-hash-boundary';

describe('CryptoHasher digests', () => {
  test('sha256 hex digest is deterministic', () => {
    const a = new CryptoHasher('sha256').update(PAYLOAD).digest('hex');
    const b = new CryptoHasher('sha256').update(PAYLOAD).digest('hex');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(a)).toBe(true);
  });

  test('sha1 hex digest matches canonical-family pattern', () => {
    const hex = new CryptoHasher('sha1').update(PAYLOAD).digest('hex');
    expect(hex).toHaveLength(40);
    expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    expect(new CryptoHasher('sha1').update(PAYLOAD).digest('hex')).toBe(hex);
  });
});
