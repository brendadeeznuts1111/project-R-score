/**
 * Handshake partner ref — normalize seat call-sign or CODE to partner CODE (SSOT).
 * @see docs/harness/tenants/partner-package-group-handshake.md
 */

/** Partner code: 3–6 uppercase letters (NOMENCLATURE). */
export const HANDSHAKE_PARTNER_CODE_RE = /^[A-Z]{3,6}$/;

/** Seat call-sign prefix → partner code (depth 0–2). */
export const PARTNER_CODE_FROM_CALL_SIGN_RE = /^([A-Z]{3,6})-\d{3}(?:-SUB\d{2}){0,2}$/;

/** Seat call-sign (depth 0–2). */
export const HANDSHAKE_CALL_SIGN_RE = /^[A-Z]{3,6}-\d{3}(?:-SUB\d{2}){0,2}$/;

/** @deprecated use HANDSHAKE_CALL_SIGN_RE */
export const CALL_SIGN_PATTERN = HANDSHAKE_CALL_SIGN_RE;

/** @deprecated use PARTNER_CODE_FROM_CALL_SIGN_RE */
export const PARTNER_CODE_FROM_CALL_SIGN = PARTNER_CODE_FROM_CALL_SIGN_RE;

/** Normalize CLI/JSONL ref to partner CODE. Accepts `BIL` or `BIL-001`. */
export function coerceHandshakePartnerCode(ref: string): string {
  const trimmed = ref.trim().toUpperCase();
  const seat = trimmed.match(PARTNER_CODE_FROM_CALL_SIGN_RE);
  if (seat) return seat[1]!;
  if (HANDSHAKE_PARTNER_CODE_RE.test(trimmed)) return trimmed;
  throw new Error(
    `Invalid handshake partner ref "${ref}" — use partner CODE (e.g. BIL) or seat (e.g. BIL-001)`
  );
}

export function tryHandshakePartnerCode(ref: string): string | null {
  try {
    return coerceHandshakePartnerCode(ref);
  } catch {
    return null;
  }
}
