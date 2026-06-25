/**
 * Phone normalization and hashing for fraud cross-lookup.
 * Store only hashes; never persist raw phone numbers in reference_lookups.
 */

/** Normalize to E.164-like digits (no leading +). Strips non-digits; assumes US if 10 digits. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return '1' + digits; // US default
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  return digits;
}

/** Validate normalized form (e.g. 10–15 digits). */
export function validatePhoneNormalized(normalized: string): boolean {
  return /^\d{10,15}$/.test(normalized);
}

/** SHA-256 hash of normalized phone (hex). Use this for storage and cross-lookup. */
export async function hashPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  if (!validatePhoneNormalized(normalized)) {
    throw new Error('Invalid phone after normalization');
  }
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash any value (e.g. email, device id) for reference_lookups. */
export async function hashReferenceValue(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value.trim().toLowerCase())
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
