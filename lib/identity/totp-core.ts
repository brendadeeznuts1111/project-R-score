// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/api/web-crypto — crypto.subtle / crypto.getRandomValues
/**
 * Pure TOTP core (RFC 6238) / HOTP (RFC 4226) — Bun/web-native, zero deps,
 * zero identity.ts imports (no cycle: identity.ts imports THIS module for
 * the login gate; mfa.ts wraps it for policy + audit).
 *
 *   - base32 encode/decode (RFC 4648, A-Z2-7, no padding — 20-byte secrets
 *     land exactly on 32 chars).
 *   - generateTotp / verifyTotp: HMAC-SHA1 via crypto.subtle, RFC 4226
 *     dynamic truncation, 30s step / 6 digits by default, ±1-step window.
 *   - mintTotpSecret / mintRecoveryCodes: crypto.getRandomValues-backed
 *     enrollment material. Recovery codes are 10-char alnum, minted with
 *     rejection sampling (no modulo bias); only their SHA-256 hashes are
 *     ever stored (see mfa.ts).
 *
 * `timestamp` parameters are unix MILLISECONDS (Date.now() convention);
 * RFC 6238 test vectors are quoted in seconds — multiply by 1000.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 encode (uppercase, no padding). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** RFC 4648 base32 decode (accepts lowercase, ignores padding). Throws on bad input. */
export function base32Decode(encoded: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of encoded.replace(/=+$/, '').toUpperCase()) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** 160-bit TOTP shared secret (20 random bytes → 32 base32 chars, no padding). */
export function mintTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

const RECOVERY_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Mint `count` single-use recovery codes, 10 chars alnum each. Rejection
 * sampling (accept byte < 4*62=248) keeps the distribution uniform.
 */
export function mintRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  while (codes.length < count) {
    const buf = new Uint8Array(10);
    let filled = 0;
    let code = '';
    while (filled < 10) {
      crypto.getRandomValues(buf);
      for (const byte of buf) {
        if (byte >= 248) continue; // reject: 248..255 would bias toward the first 8 chars
        code += RECOVERY_ALPHABET[byte % 62];
        filled++;
        if (filled === 10) break;
      }
    }
    codes.push(code);
  }
  return codes;
}

/** SHA-256 hex — recovery codes are stored as hashes, never plaintext. */
export function sha256Hex(input: string): string {
  return new Bun.CryptoHasher('sha256').update(input).digest('hex');
}

/**
 * HOTP/TOTP code for `secret` (base32) at `timestamp` (unix ms, default now).
 * HMAC-SHA1 over the 8-byte big-endian counter, RFC 4226 dynamic truncation,
 * left-padded to `digits`.
 */
export async function generateTotp(
  secret: string,
  timestamp: number = Date.now(),
  stepSeconds: 30 = 30,
  digits: 6 = 6
): Promise<string> {
  const keyBytes = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / stepSeconds);

  const counterBytes = new Uint8Array(8);
  // Big-endian 64-bit counter; counters stay well below 2^53 so the 32-bit
  // split is exact.
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  counterBytes[0] = (high >>> 24) & 0xff;
  counterBytes[1] = (high >>> 16) & 0xff;
  counterBytes[2] = (high >>> 8) & 0xff;
  counterBytes[3] = high & 0xff;
  counterBytes[4] = (low >>> 24) & 0xff;
  counterBytes[5] = (low >>> 16) & 0xff;
  counterBytes[6] = (low >>> 8) & 0xff;
  counterBytes[7] = low & 0xff;

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));

  // RFC 4226 §5.3 dynamic truncation.
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    (hmac[offset + 1]! << 16) |
    (hmac[offset + 2]! << 8) |
    hmac[offset + 3]!;

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Constant-shape verification: accepts the current step ± `window` steps
 * (default ±1, 30s clock drift each way). Rejects malformed codes fast.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  timestamp: number = Date.now(),
  window: 1 = 1
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const stepSeconds = 30;
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  for (let drift = -window; drift <= window; drift++) {
    const expected = await generateTotp(secret, (counter + drift) * stepSeconds * 1000);
    if (expected === code) return true;
  }
  return false;
}
