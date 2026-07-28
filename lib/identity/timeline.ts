/**
 * Activity-timeline query layer over `IdentitySystem.auditFor` (Phase 3 add-on).
 *
 * Pure read model: NO new DB access — every row comes through the existing
 * public audit API, so the wire/storage invariants of identity.ts stay the
 * single authority. Filters are applied client-side after the fetch.
 *
 * Scaling note: `auditFor` caps at 500 rows, so filters here can only narrow
 * what that window contains. When histories grow, push `actions` / date
 * range / success filters down into SQL in identity.ts instead of widening
 * the client-side fetch.
 *
 * impersonatorId passthrough: `auditFor` currently maps audit rows WITHOUT
 * the impersonator_id column. The timeline therefore reads it from (1) an
 * `impersonatorId` field on the entry, should AuthAuditEntry gain one, then
 * (2) `details.impersonatorId` — the channel visible through the public API
 * today (impersonate.ts stamps the column; callers that want it in the
 * timeline also mirror it into details).
 */

import { asTreeNodeId, type IdentityId, type TreeNodeId } from '../types/branded.ts';
import type { AuthAuditEntry, IdentitySystem } from './identity.ts';

export interface TimelineEvent {
  id: IdentityId;
  nodeId: TreeNodeId | null;
  action: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  success: boolean;
  createdAt: string;
  impersonatorId?: TreeNodeId;
}

export type TimelineFilter = {
  /** Keep only these actions (subset match). */
  actions?: string[];
  /** ISO 8601 lower bound on createdAt (inclusive). */
  since?: string;
  /** ISO 8601 upper bound on createdAt (inclusive). */
  until?: string;
  /** Keep only successful events. Mutually exclusive with failedOnly; successOnly wins when both are set. */
  successOnly?: boolean;
  /** Keep only failed events. */
  failedOnly?: boolean;
  /** Max events returned (clamped 1..500 — the auditFor cap). Default 50. */
  limit?: number;
};

/** auditFor's hard cap — see identity.ts. */
const AUDIT_FETCH_CAP = 500;

const DEFAULT_LIMIT = 50;

/**
 * Known audit action vocabulary, grouped for filter UIs. Plain readonly
 * array — callers group/filter as they see fit.
 *   auth:     login_success … logout
 *   admin:    account_locked … alias_created
 *   security: password_changed … sessions_revoked
 */
export const TIMELINE_ACTIONS = [
  // auth
  'login_success',
  'login_failed',
  'login_locked',
  'login_blocked_anomaly',
  'login_blocked_geo',
  'login_blocked_ip',
  'logout',
  // admin
  'account_locked',
  'account_unlocked',
  'impersonation_start',
  'impersonation_end',
  'alias_created',
  // security
  'password_changed',
  'device_trusted',
  'device_untrusted',
  'ip_allowlist_updated',
  'jit_provision',
  'sessions_revoked',
] as const;

export type TimelineAction = (typeof TIMELINE_ACTIONS)[number];

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, AUDIT_FETCH_CAP));
}

function extractImpersonatorId(entry: AuthAuditEntry): TreeNodeId | undefined {
  // Future-proof: if AuthAuditEntry gains the field, prefer it.
  const onEntry = (entry as AuthAuditEntry & { impersonatorId?: string | null }).impersonatorId; // brand-ok — optional wire field before asTreeNodeId
  if (typeof onEntry === 'string' && onEntry.length > 0) return asTreeNodeId(onEntry);
  const inDetails = entry.details?.impersonatorId;
  if (typeof inDetails === 'string' && inDetails.length > 0) return asTreeNodeId(inDetails);
  return undefined;
}

function toTimelineEvent(entry: AuthAuditEntry): TimelineEvent {
  const event: TimelineEvent = {
    id: entry.id,
    nodeId: entry.nodeId,
    action: entry.action,
    details: entry.details,
    ip: entry.ip,
    success: entry.success,
    createdAt: entry.createdAt,
  };
  const impersonatorId = extractImpersonatorId(entry);
  if (impersonatorId !== undefined) event.impersonatorId = impersonatorId;
  return event;
}

/**
 * Build a node's activity timeline, newest-first.
 *
 * Fetches the widest useful window via `auditFor` (its 500-row cap), then
 * filters and slices client-side. ISO timestamps compare lexicographically,
 * which is correct for the `created_at` format identity.ts writes.
 */
export function getTimeline(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  filter: TimelineFilter = {}
): TimelineEvent[] {
  const limit = clampLimit(filter.limit);
  const entries = identity.auditFor(nodeId, { limit: AUDIT_FETCH_CAP });

  let events = entries.map(toTimelineEvent);

  if (filter.actions && filter.actions.length > 0) {
    const wanted = new Set(filter.actions);
    events = events.filter(e => wanted.has(e.action));
  }
  if (filter.since) {
    const since = filter.since;
    events = events.filter(e => e.createdAt >= since);
  }
  if (filter.until) {
    const until = filter.until;
    events = events.filter(e => e.createdAt <= until);
  }
  if (filter.successOnly) {
    events = events.filter(e => e.success);
  } else if (filter.failedOnly) {
    events = events.filter(e => !e.success);
  }

  // auditFor already returns newest-first (created_at DESC, id DESC); the
  // stable re-sort makes the contract explicit without disturbing ties.
  events = [...events].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  return events.slice(0, limit);
}
