// @see https://bun.com/docs/runtime/utils — Uint8Array.toBase64 / fromBase64
/**
 * Bun-native base64 / base64url helpers. Prefer over `btoa`/`atob` and over
 * inventing binary-string loops at call sites.
 */
const utf8 = new TextEncoder();
const utf8d = new TextDecoder();

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

/** Standard base64 (with padding) for short opaque digests / wire tokens. */
export function utf8ToBase64(text: string): string {
  return utf8.encode(text).toBase64();
}
