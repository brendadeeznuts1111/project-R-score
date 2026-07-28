// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password (argon2id)
/**
 * Self-service security (Phase 4) — partners manage THEIR OWN security only.
 *
 * Thin-wrapper module over `IdentitySystem` (same pattern as lockout.ts /
 * anomaly.ts): all DB access goes through narrow typed methods on the
 * system; this file holds policy + audit only. Every function is scoped to
 * the caller's OWN nodeId (resolved from the Bearer session in http.ts) —
 * there is deliberately no target-node parameter anywhere. Admin operations
 * (unlock, export of other nodes, impersonate) live elsewhere.
 *
 * Device trust: `trustDevice` already exists in anomaly.ts and is re-exported
 * here for a single import surface — not duplicated.
 */

import type { TokenId, TreeNodeId } from '../types/branded.ts';
import {
  IdentityError,
  InvalidCredentialsError,
  WeakPasswordError,
  type ActiveSessionInfo,
  type IdentitySystem,
  type IpAllowlistEntry,
} from './identity.ts';
import { validatePasswordStrength } from './password-strength.ts';

export { trustDevice } from './anomaly.ts';
export type { ActiveSessionInfo, IpAllowlistEntry };

/** Self-service device view — fingerprint hash truncated to 12 chars. */
export interface DeviceSummary {
  fingerprintHash: string; // first 12 hex chars — enough to identify, not to replay
  firstSeen: number; // unix seconds
  lastSeen: number; // unix seconds
  countryCode: string | null;
  trusted: boolean;
}

// ── Change password ──────────────────────────────────────────────────────

/**
 * Verify the current password, rotate to the new one, and revoke every OTHER
 * session ("log out everywhere else" on credential change). The caller's
 * currentToken is preserved. Returns the number of sessions revoked.
 *
 * Audits: `password_change_failed` (success 0) on a wrong current password,
 * `password_changed` on rotation, `sessions_revoked` with details.count.
 */
export async function changePassword(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  currentPassword: string,
  newPassword: string,
  currentToken: TokenId
): Promise<number> {
  const ok = await identity.verifyNodePassword(nodeId, currentPassword);
  if (!ok) {
    identity.logAuthEvent({ nodeId, action: 'password_change_failed', success: false });
    throw new InvalidCredentialsError();
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.ok) throw new WeakPasswordError(strength.feedback);

  const passwordHash = await Bun.password.hash(newPassword, { algorithm: 'argon2id' });
  identity.rotatePasswordHash(nodeId, passwordHash);
  identity.logAuthEvent({ nodeId, action: 'password_changed' });

  const revoked = identity.revokeOtherSessions(nodeId, currentToken);
  identity.logAuthEvent({
    nodeId,
    action: 'sessions_revoked',
    details: { count: revoked, reason: 'password_changed' },
  });
  return revoked;
}

// ── Session management ───────────────────────────────────────────────────

/** The node's active sessions (created_at/expires_at/ip/UA + impersonated flag). */
export function listSessions(identity: IdentitySystem, nodeId: TreeNodeId): ActiveSessionInfo[] {
  return identity.activeSessionsFor(nodeId);
}

/**
 * "Log out this device" — revoke one own session by raw token. Scoped to the
 * node, so another node's token is never affected. Audits `session_revoked`
 * (success reflects whether a live session was actually revoked).
 */
export function revokeOwnSession(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  token: TokenId
): void {
  const revoked = identity.revokeOwnSessionByToken(nodeId, token);
  identity.logAuthEvent({ nodeId, action: 'session_revoked', success: revoked });
}

/** "Log out everywhere else" — revoke all own sessions except the current token. */
export function revokeOtherSessions(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  currentToken: TokenId
): number {
  const revoked = identity.revokeOtherSessions(nodeId, currentToken);
  identity.logAuthEvent({
    nodeId,
    action: 'sessions_revoked',
    details: { count: revoked, reason: 'user_request' },
  });
  return revoked;
}

// ── Device trust ─────────────────────────────────────────────────────────

/** The node's device fingerprints with the hash truncated to 12 chars. */
export function listDevices(identity: IdentitySystem, nodeId: TreeNodeId): DeviceSummary[] {
  return identity.fingerprintsFor(nodeId).map(fp => ({
    fingerprintHash: fp.fingerprintHash.slice(0, 12),
    firstSeen: fp.firstSeen,
    lastSeen: fp.lastSeen,
    countryCode: fp.countryCode,
    trusted: fp.trusted,
  }));
}

/**
 * Mark a device as untrusted. Accepts the full fingerprint hash OR a unique
 * prefix of ≥12 chars (the truncated form listDevices returns), so the HTTP
 * surface never needs the full hash. Audits `device_untrusted`.
 */
export function untrustDevice(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  fingerprintHash: string
): void {
  const matches = identity
    .fingerprintsFor(nodeId)
    .filter(
      fp => fp.fingerprintHash === fingerprintHash || fp.fingerprintHash.startsWith(fingerprintHash)
    );
  if (fingerprintHash.length < 12 || matches.length !== 1) {
    throw new IdentityError('Unknown or ambiguous device fingerprint');
  }
  identity.untrustFingerprint(nodeId, matches[0]!.fingerprintHash);
  identity.logAuthEvent({
    nodeId,
    action: 'device_untrusted',
    details: { fingerprintHash: matches[0]!.fingerprintHash.slice(0, 12) },
  });
}

// ── IP allowlist ─────────────────────────────────────────────────────────

const IPV4_SEGMENT = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_RE = new RegExp(`^${IPV4_SEGMENT}(\\.${IPV4_SEGMENT}){3}$`);
const IPV4_24_RE = new RegExp(`^${IPV4_SEGMENT}(\\.${IPV4_SEGMENT}){3}/24$`);

/**
 * Entry validation (deliberately simple, documented): a plain IPv4 address
 * (`203.0.113.7`) or an IPv4 /24 network (`203.0.113.0/24`). Other prefix
 * lengths and IPv6 are rejected — /24 is the same granularity the anomaly
 * fingerprints use, and enforcement (IdentitySystem.isIpAllowed) matches
 * exact IPv4 or the /24 prefix only.
 */
export function isValidAllowlistEntry(cidr: string): boolean {
  return IPV4_RE.test(cidr) || IPV4_24_RE.test(cidr);
}

/**
 * Replace the node's entire IP allowlist (replace-all semantics; an empty
 * array clears it → login unrestricted). Audits `ip_allowlist_updated` with
 * details.count. Throws IdentityError on any invalid entry — nothing is
 * written in that case.
 */
export function setIpAllowlist(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  cidrs: string[]
): void {
  for (const cidr of cidrs) {
    if (!isValidAllowlistEntry(cidr)) {
      throw new IdentityError(`Invalid allowlist entry: ${cidr} (IPv4 or IPv4/24 only)`);
    }
  }
  identity.replaceIpAllowlist(
    nodeId,
    cidrs.map(cidr => ({ cidr }))
  );
  identity.logAuthEvent({
    nodeId,
    action: 'ip_allowlist_updated',
    details: { count: cidrs.length },
  });
}

/** The node's current IP allowlist entries. */
export function getIpAllowlist(identity: IdentitySystem, nodeId: TreeNodeId): IpAllowlistEntry[] {
  return identity.ipAllowlistFor(nodeId);
}
