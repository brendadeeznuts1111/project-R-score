/**
 * Account lockout policy (Phase 1a) — thresholds and thin wrappers over the
 * public `IdentitySystem.lockAccount` / `IdentitySystem.unlockAccount`
 * methods. Constants live here (not in identity.ts) so the escalation policy
 * has one home; identity.ts imports them (type-only import back, no cycle).
 *
 * Behavior:
 *   - login() escalates to a lock at LOCKOUT_THRESHOLD consecutive failed
 *     attempts (lock_reason 'too_many_failed_attempts').
 *   - Locks auto-expire: the existing `locked_until > now` check in login()
 *     stops rejecting once the duration passes, and the next successful
 *     login resets failed_attempts.
 *   - unlockAccount requires an admin|superadmin caller and clears
 *     locked_until / lock_reason / failed_attempts.
 */

import type { TreeNodeId } from '../types/branded.ts';
import type { IdentitySystem } from './identity.ts';

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_SECONDS = 3600;

/** Manually lock an alias (e.g. security ops). Audits `account_locked`. */
export function lockAccount(
  identity: IdentitySystem,
  slug: string,
  reason: string,
  durationSeconds: number = LOCKOUT_DURATION_SECONDS
): void {
  identity.lockAccount(slug, reason, durationSeconds);
}

/** Admin-only unlock. Audits `account_unlocked` with details.adminNodeId. */
export function unlockAccount(
  identity: IdentitySystem,
  adminNodeId: TreeNodeId,
  slug: string
): void {
  identity.unlockAccount(adminNodeId, slug);
}
