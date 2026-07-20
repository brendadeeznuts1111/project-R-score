// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// lib/security/crypto-native.ts — Bun-native hashing / password / random helpers

/** SHA-256 hex digest of string or bytes. */
export function sha256Hex(data: string | Uint8Array | ArrayBuffer): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  return hasher.digest('hex');
}

/** HMAC-SHA256 hex (pass key as second CryptoHasher arg). */
export function hmacSha256Hex(key: string | Uint8Array, data: string | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256', key);
  hasher.update(data);
  return hasher.digest('hex');
}

/** HMAC-SHA256 as base64url (JWT-style). */
export function hmacSha256Base64Url(key: string | Uint8Array, data: string | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256', key);
  hasher.update(data);
  return Buffer.from(hasher.digest()).toString('base64url');
}

/** Cryptographically secure random bytes (Web Crypto). */
export function randomBytes(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  crypto.getRandomValues(buf);
  return buf;
}

export function randomHex(bytes: number): string {
  return Buffer.from(randomBytes(bytes)).toString('hex');
}

/** Monotonic, sortable UUID (preferred over crypto.randomUUID). */
export function randomId(): string {
  return Bun.randomUUIDv7();
}

/** Argon2id password hash (Bun.password default). */
export async function hashPassword(
  password: string,
  options?: Parameters<typeof Bun.password.hash>[1]
): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
    ...options,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

/**
 * Constant-time equality for equal-length Uint8Array digests.
 * Returns false if lengths differ (does not short-circuit on content).
 */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle
    ? // Bun implements timingSafeEqual on crypto from node:crypto and web;
      // use DataView XOR loop without early exit for portability.
      (() => {
        let out = 0;
        for (let i = 0; i < a.byteLength; i++) out |= a[i]! ^ b[i]!;
        return out === 0;
      })()
    : a.every((v, i) => v === b[i]);
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqualBytes(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
