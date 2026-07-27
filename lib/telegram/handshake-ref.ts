/**
 * Handshake CLI ref rules — one ref shape per command (no dual acceptance).
 *
 * | Command family              | Ref type     | Example  |
 * |-----------------------------|--------------|----------|
 * | onboard-partner-package     | call-sign    | BIL-001  |
 * | package-group-* / link-*    | partner CODE | BIL      |
 *
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

/** Derive partner CODE from seat call-sign (internal — not a package-group CLI arg). */
export function partnerCodeFromCallSign(callSign: string | null): string | null {
  if (!callSign?.trim()) return null;
  const m = callSign.trim().toUpperCase().match(PARTNER_CODE_FROM_CALL_SIGN_RE);
  return m ? m[1]! : null;
}

/** Package-group / wire / link commands — partner CODE only (reject seat call-sign). */
export function assertPartnerCodeArg(ref: string): string {
  const trimmed = ref.trim().toUpperCase();
  if (HANDSHAKE_CALL_SIGN_RE.test(trimmed)) {
    const code = partnerCodeFromCallSign(trimmed) ?? trimmed.split('-')[0]!;
    throw new Error(
      `Package-group commands use partner CODE only (${code}), not seat ${trimmed}. ` +
        `Onboard with: bun tools/onboard-partner-package.ts ${trimmed} --create-package-group`
    );
  }
  if (!HANDSHAKE_PARTNER_CODE_RE.test(trimmed)) {
    throw new Error(`Invalid partner CODE "${ref}" — use 3–6 letters (e.g. BIL)`);
  }
  return trimmed;
}

/** Onboard / seat commands — call-sign only. */
export function assertCallSignArg(ref: string): string {
  const trimmed = ref.trim().toUpperCase();
  if (HANDSHAKE_PARTNER_CODE_RE.test(trimmed) && !trimmed.includes('-')) {
    throw new Error(
      `Onboard commands use seat call-sign (${trimmed}-001), not bare partner CODE (${trimmed})`
    );
  }
  if (!HANDSHAKE_CALL_SIGN_RE.test(trimmed)) {
    throw new Error(`Invalid call-sign "${ref}" — use CODE-001 (e.g. BIL-001)`);
  }
  return trimmed;
}

/** Registry / wire parse — partner CODE only; null when not a CODE. */
export function tryPartnerCodeArg(ref: string): string | null {
  const trimmed = ref.trim().toUpperCase();
  return HANDSHAKE_PARTNER_CODE_RE.test(trimmed) ? trimmed : null;
}
