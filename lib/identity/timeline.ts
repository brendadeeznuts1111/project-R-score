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
 * impersonatorId passthrough: `auditFor` maps the audit row's
 * `impersonator_id` column to a branded `TreeNodeId`; the timeline exposes
 * that value without relying on mutable details JSON.
 */

import type { IdentityId, TreeNodeId } from '../types/branded.ts';
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
  'login_suspicious',
  'logout',
  // admin
  'account_locked',
  'account_unlocked',
  'impersonation_start',
  'impersonation_end',
  'alias_created',
  // security
  'password_change_failed',
  'password_changed',
  'device_trusted',
  'device_untrusted',
  'ip_allowlist_updated',
  'jit_provision',
  'session_revoked',
  'sessions_revoked',
] as const;

export type TimelineAction = (typeof TIMELINE_ACTIONS)[number];

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, AUDIT_FETCH_CAP));
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
  if (entry.impersonatorId !== null) event.impersonatorId = entry.impersonatorId;
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
  events = [...events].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  );

  return events.slice(0, limit);
}
