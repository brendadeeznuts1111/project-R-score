/**
 * Audit-safe impersonation (Phase 3) — superadmin → partner.
 *
 * Thin-wrapper module over `IdentitySystem` (same pattern as lockout.ts):
 * all DB access goes through narrow typed methods on the system; this file
 * holds the impersonation policy only. Imports IdentitySystem type-only
 * (no runtime cycle).
 *
 * Semantics:
 *   - Only a superadmin can impersonate; a superadmin can NEVER be a target.
 *   - The impersonated session belongs to the TARGET (node_id = target) with
 *     `impersonator_id = <admin>` and a short 1h TTL (vs the 8h login TTL).
 *   - `impersonation_start` / `impersonation_end` are audited on the TARGET
 *     with details.adminNodeId + sessionId, and the audit row's
 *     `impersonator_id` column is stamped — the trail survives even if
 *     details_json is later redacted.
 *   - No ambient context: callers pass impersonatorId explicitly into
 *     logAuthEvent when auditing inside an impersonated flow.
 */

import type { SessionId, TokenId, TreeNodeId } from '../types/branded.ts';
import { IdentityError, type IdentitySystem } from './identity.ts';

export const IMPERSONATION_TTL_SECONDS = 60 * 60; // 1h

export interface ImpersonationResult {
  token: TokenId;
  sessionId: SessionId;
  expiresAt: number; // unix seconds
}

/**
 * Mint an impersonated session for `targetNodeId` on behalf of
 * `adminNodeId` (must be superadmin). Throws IdentityError when the caller
 * is not a superadmin, the target has no identity, or the target is itself
 * a superadmin. Audits `impersonation_start` on the target.
 */
export async function impersonate(
  identity: IdentitySystem,
  adminNodeId: TreeNodeId,
  targetNodeId: TreeNodeId
): Promise<ImpersonationResult> {
  if (identity.getRole(adminNodeId) !== 'superadmin') {
    throw new IdentityError('Superadmin role required to impersonate');
  }
  const targetRole = identity.getRole(targetNodeId);
  if (targetRole === null) throw new IdentityError('Target node not found');
  if (targetRole === 'superadmin') {
    throw new IdentityError('Cannot impersonate a superadmin');
  }

  const session = identity.createSession(targetNodeId, {
    impersonatorId: adminNodeId,
    ttlSeconds: IMPERSONATION_TTL_SECONDS,
  });

  identity.logAuthEvent({
    nodeId: targetNodeId,
    action: 'impersonation_start',
    details: { adminNodeId, sessionId: session.sessionId },
    impersonatorId: adminNodeId,
  });

  return session;
}

/**
 * End an impersonated session: revokes the token's session and audits
 * `impersonation_end` with the session's impersonator_id stamped. Throws
 * IdentityError when the token does not resolve to a live session.
 */
export function endImpersonation(identity: IdentitySystem, token: TokenId): void {
  const session = identity.resolveSession(token);
  if (!session) throw new IdentityError('Invalid or expired session');

  identity.logout(token);

  identity.logAuthEvent({
    nodeId: session.nodeId,
    action: 'impersonation_end',
    details: { sessionId: session.sessionId },
    impersonatorId: session.impersonatorId,
  });
}
