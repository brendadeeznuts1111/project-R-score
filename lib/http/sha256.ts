// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Runtime-agnostic SHA-256 hex.
 * Edge-safe: no `bun` imports — Bun.CryptoHasher on Bun, Web Crypto elsewhere.
 */

/** Async SHA-256 hex — works on Bun (sync fast path) and Workers (Web Crypto). */
export async function sha256HexAsync(payload: string): Promise<string> {
  if (typeof Bun !== 'undefined' && typeof Bun.CryptoHasher === 'function') {
    return new Bun.CryptoHasher('sha256').update(payload).digest('hex');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Sync SHA-256 hex — Bun runtime only. Edge callers must use sha256HexAsync. */
export function sha256Hex(payload: string): string {
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex');
}
