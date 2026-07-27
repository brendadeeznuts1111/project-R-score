/**
 * GDPR-style data export (Phase 2) — everything the identity subsystem holds
 * about one node, serialized for download.
 *
 * Hard invariant: export NEVER includes credential or session secrets.
 * `password_hash` and `token_hash` are not selected anywhere — the accessors
 * in identity.ts (`aliasSummaryFor`, `sessionsFor`) use explicit column
 * lists, so future columns can't leak into the export by accident.
 *
 * Thin-wrapper module (same pattern as lockout.ts / anomaly.ts): no direct
 * DB access here, only typed IdentitySystem methods.
 */

import type { TreeNodeId } from '../types/branded.ts';
import type {
  AliasSummary,
  AuthAuditEntry,
  DeviceFingerprint,
  IdentitySystem,
  SessionExportRow,
} from './identity.ts';

export interface IdentityExport {
  alias: AliasSummary | null;
  sessions: SessionExportRow[];
  audit: AuthAuditEntry[];
  deviceFingerprints: DeviceFingerprint[];
}

/** Assemble the full export for a node. Audit is capped at 500 newest rows. */
export function exportData(identity: IdentitySystem, nodeId: TreeNodeId): IdentityExport {
  return {
    alias: identity.aliasSummaryFor(nodeId),
    sessions: identity.sessionsFor(nodeId),
    audit: identity.auditFor(nodeId, { limit: 500 }),
    deviceFingerprints: identity.fingerprintsFor(nodeId),
  };
}
