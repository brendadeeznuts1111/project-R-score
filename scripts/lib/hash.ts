// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bun-native digest helpers. Prefer over node:crypto createHash.
 */

/** SHA-256 hex digest. */
export function sha256Hex(data: Bun.BlobOrStringOrBuffer): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  return hasher.digest('hex');
}

/** SHA-1 hex digest. */
export function sha1Hex(data: Bun.BlobOrStringOrBuffer): string {
  const hasher = new Bun.CryptoHasher('sha1');
  hasher.update(data);
  return hasher.digest('hex');
}
