// @see https://bun.com/docs/runtime/sqlite — bun:sqlite (access via IdentitySystem accessors)
/**
 * TOTP MFA (RFC 6238) — thin-wrapper module over `IdentitySystem` (same
 * pattern as self-service.ts / anomaly.ts): all DB access goes through
 * narrow typed methods on the system; this file holds enrollment policy +
 * audit only. The pure crypto core lives in totp-core.ts (no identity
 * imports — identity.ts imports it for the login gate, so this module is
 * the ONLY identity.ts → mfa direction that could cycle; it doesn't).
 *
 * Enrollment flow (self-service, caller's own node):
 *   1. enrollTotp  → mints a 160-bit secret + 8 single-use recovery codes.
 *      Secret and codes are returned ONCE (plaintext) — store them out of
 *      band. The row starts enabled=0; recovery code SHA-256 hashes replace
 *      any prior pending set.
 *   2. confirmTotp → verifies a live code against the pending secret, then
 *      flips enabled=1 + verified_at. Until confirmed, login is UNAFFECTED.
 *   3. disableTotp → requires a valid TOTP code OR an unused recovery code,
 *      so an attacker holding only the password cannot strip MFA.
 *
 * AT-REST TRADEOFF (deliberate, documented): the TOTP shared secret is
 * stored PLAINTEXT in auth_totp.secret. Unlike passwords it cannot be
 * salted-hashed — the server must compute the same HMAC the authenticator
 * does. Encryption-at-rest with the key on the same host is theatre, so
 * this follows the pragmatic norm (same posture as most TOTP
 * implementations); the mitigation is DB file permissions + backups
 * hygiene, exactly like the session token-hashes table.
 *
 * Audits: totp_enrolled / totp_confirm_failed (0) / totp_enabled /
 * totp_disable_failed (0) / totp_disabled / totp_recovery_used (login-side
 * recovery audits happen in identity.ts).
 */

import type { TreeNodeId } from '../types/branded.ts';
import { IdentityError, type IdentitySystem } from './identity.ts';
import { mintRecoveryCodes, mintTotpSecret, sha256Hex, verifyTotp } from './totp-core.ts';

// Single import surface (same move as self-service re-exporting trustDevice).
export { generateTotp, verifyTotp } from './totp-core.ts';

const ISSUER = 'FactoryWager';
const RECOVERY_CODE_COUNT = 8;

/** One-time enrollment payload — secret + recovery codes are plaintext, shown once. */
export interface TotpEnrollment {
  secret: string; // base32, 32 chars
  uri: string; // otpauth:// provisioning URI (QR-code payload)
  recoveryCodes: string[]; // 8 single-use codes; only hashes are stored
}

/** `otpauth://totp/<issuer>:<slug>?secret=...&issuer=...` — authenticator provisioning URI. */
function provisioningUri(slug: string, secret: string): string {
  // Issuer prefix stays literal; only the account slug is encoded.
  return `otpauth://totp/${ISSUER}:${encodeURIComponent(slug)}?secret=${secret}&issuer=${ISSUER}`;
}

/**
 * Start (or restart) enrollment for the node's OWN account: mint a fresh
 * pending secret + recovery-code set. Re-enrolling while PENDING replaces
 * the pending material (the old secret is dead); enrolling while ENABLED is
 * a conflict — HTTP maps the message to 409.
 */
export async function enrollTotp(
  identity: IdentitySystem,
  nodeId: TreeNodeId
): Promise<TotpEnrollment> {
  const existing = identity.totpRecordFor(nodeId);
  if (existing?.enabled) throw new IdentityError('TOTP is already enabled');

  const secret = mintTotpSecret();
  const recoveryCodes = mintRecoveryCodes(RECOVERY_CODE_COUNT);
  identity.upsertPendingTotp(nodeId, secret, recoveryCodes.map(sha256Hex));
  identity.logAuthEvent({ nodeId, action: 'totp_enrolled' });

  const slug = identity.aliasSummaryFor(nodeId)?.slug ?? 'account';
  return { secret, uri: provisioningUri(slug, secret), recoveryCodes };
}

/**
 * Confirm a pending enrollment with a live authenticator code. On success:
 * enabled=1 + verified_at, audit `totp_enabled`. On failure: audit
 * `totp_confirm_failed` (success 0), throw IdentityError.
 */
export async function confirmTotp(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  code: string
): Promise<void> {
  const record = identity.totpRecordFor(nodeId);
  if (!record) throw new IdentityError('No TOTP enrollment pending');
  if (record.enabled) throw new IdentityError('TOTP is already enabled');

  const ok = await verifyTotp(record.secret, code);
  if (!ok) {
    identity.logAuthEvent({ nodeId, action: 'totp_confirm_failed', success: false });
    throw new IdentityError('Invalid TOTP code');
  }

  identity.enableTotp(nodeId);
  identity.logAuthEvent({ nodeId, action: 'totp_enabled' });
}

/**
 * Disable TOTP. Requires a valid TOTP code OR an unused recovery code —
 * password-only attackers cannot strip MFA, and a user who lost the
 * authenticator can still get out with a recovery code. Deletes the
 * enrollment + all recovery codes (re-enroll starts clean).
 */
export async function disableTotp(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  codeOrRecovery: string
): Promise<void> {
  const record = identity.totpRecordFor(nodeId);
  if (!record) throw new IdentityError('TOTP is not enrolled');

  const totpOk = await verifyTotp(record.secret, codeOrRecovery);
  const recoveryOk = totpOk ? false : identity.consumeTotpRecovery(nodeId, codeOrRecovery);
  if (!totpOk && !recoveryOk) {
    identity.logAuthEvent({ nodeId, action: 'totp_disable_failed', success: false });
    throw new IdentityError('Invalid TOTP or recovery code');
  }
  if (recoveryOk) identity.logAuthEvent({ nodeId, action: 'totp_recovery_used' });

  identity.deleteTotp(nodeId);
  identity.logAuthEvent({ nodeId, action: 'totp_disabled' });
}

/** Whether the node has an ENABLED TOTP enrollment (login gate / status UIs). */
export function totpEnabled(identity: IdentitySystem, nodeId: TreeNodeId): boolean {
  return identity.totpRecordFor(nodeId)?.enabled ?? false;
}
