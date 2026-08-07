// @see https://bun.com/docs/runtime/binary-data — Uint8Array.toBase64 / fromBase64 / toHex / fromHex
/**
 * Bun-native bytes codec — base64, base64url, and hex.
 *
 * Prefer these over `btoa`/`atob`, `Buffer.from(…).toString('hex'|'base64')`,
 * and hand-rolled binary-string loops. Shapes are plain `Uint8Array` (Bun-native).
 */
const utf8 = new TextEncoder();
const utf8d = new TextDecoder();

// ── base64url ─────────────────────────────────────────────────────────────

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytes.toBase64({ alphabet: 'base64url', omitPadding: true });
}

export function base64UrlToBytes(value: string): Uint8Array {
  return Uint8Array.fromBase64(value, { alphabet: 'base64url' });
}

export function utf8ToBase64Url(text: string): string {
  return bytesToBase64Url(utf8.encode(text));
}

export function base64UrlToUtf8(value: string): string {
  return utf8d.decode(base64UrlToBytes(value));
}

// ── base64 (standard, with padding) ───────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array): string {
  return bytes.toBase64();
}

export function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.fromBase64(value);
}

export function utf8ToBase64(text: string): string {
  return bytesToBase64(utf8.encode(text));
}

export function base64ToUtf8(value: string): string {
  return utf8d.decode(base64ToBytes(value));
}

// ── hex ───────────────────────────────────────────────────────────────────

export function bytesToHex(bytes: Uint8Array): string {
  return bytes.toHex();
}

export function hexToBytes(value: string): Uint8Array {
  return Uint8Array.fromHex(value);
}

/** UTF-8 text → hex string (random-material helpers). */
export function utf8ToHex(text: string): string {
  return bytesToHex(utf8.encode(text));
}

/** Fill `byteLen` random bytes and return hex (2× length). */
export function randomHex(byteLen: number): string {
  const bytes = new Uint8Array(Math.max(0, byteLen));
  if (bytes.byteLength > 0) crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/** Concatenate chunks into one contiguous Uint8Array (no Node Buffer.concat). */
export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** UTF-8 byte length of a string (Bun-native; no Buffer.byteLength). */
export function utf8ByteLength(text: string): number {
  return utf8.encode(text).byteLength;
}
