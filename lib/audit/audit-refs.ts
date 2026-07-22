// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3
/**
 * AUDIT_REFS — FactoryWager audit aliases (sibling to CANONICAL_REFS).
 * Values are entry ids (finding or concept) — not bun.com URLs.
 */
import {
  asAuditEntryId,
  type AuditConceptId,
  type AuditEntryId,
  type AuditFindingId,
  unbrand,
} from '../types/branded.ts';

/** Alias / topic → audit entry id (AuditFinding or AuditConcept). */
export const AUDIT_REFS: Record<string, AuditEntryId> = {
  // findings
  'sample-fiber-demo-2026-07-21': asAuditEntryId('sample-fiber-demo-2026-07-21'),
  'sample fiber': asAuditEntryId('sample-fiber-demo-2026-07-21'),
  'sample-fiber-demo': asAuditEntryId('sample-fiber-demo-2026-07-21'),
  fiber: asAuditEntryId('sample-fiber-demo-2026-07-21'),
  'nagata fiber': asAuditEntryId('sample-fiber-demo-2026-07-21'),
  // concepts
  'nagata-map': asAuditEntryId('nagata-map'),
  'nagata map': asAuditEntryId('nagata-map'),
  Nagata: asAuditEntryId('nagata-map'),
  'Nagata map': asAuditEntryId('nagata-map'),
  'jacobian-nullspace': asAuditEntryId('jacobian-nullspace'),
  'jacobian nullspace': asAuditEntryId('jacobian-nullspace'),
  'Jacobian nullspace': asAuditEntryId('jacobian-nullspace'),
  // FactoryWager harness (not Bun upstream CI)
  'harness-day-loop': asAuditEntryId('harness-day-loop'),
  'harness day-loop': asAuditEntryId('harness-day-loop'),
  'day-loop': asAuditEntryId('harness-day-loop'),
  'day loop': asAuditEntryId('harness-day-loop'),
  // evidence integrity (Phase 2)
  'sha3-integrity': asAuditEntryId('sha3-integrity'),
  'sha3 integrity': asAuditEntryId('sha3-integrity'),
  'SHA3 integrity': asAuditEntryId('sha3-integrity'),
  sha3: asAuditEntryId('sha3-integrity'),
};

/** Re-brand a finding/concept PK as a polymorphic entry ref. */
export function toAuditEntryId(id: AuditFindingId | AuditConceptId | AuditEntryId): AuditEntryId {
  return asAuditEntryId(unbrand(id as AuditEntryId));
}

/** Repo-relative markdown page for a finding id. */
export function auditFindingDocsPath(id: AuditFindingId | AuditEntryId): string {
  return `docs/audit/findings/${unbrand(id as AuditEntryId)}.md`;
}

/** Repo-relative markdown page for a concept id. */
export function auditConceptDocsPath(id: AuditConceptId | AuditEntryId): string {
  return `docs/audit/concepts/${unbrand(id as AuditEntryId)}.md`;
}

/** @deprecated use auditFindingDocsPath — kept for call-site clarity during migrate */
export function auditDocsPath(id: AuditFindingId | AuditEntryId): string {
  return auditFindingDocsPath(id);
}

/** Resolve query via AUDIT_REFS (exact, then case-insensitive). */
export function resolveAuditAlias(query: string): AuditEntryId | undefined {
  const q = query.trim();
  if (!q) return undefined;
  if (AUDIT_REFS[q]) return AUDIT_REFS[q];
  const lower = q.toLowerCase();
  for (const [alias, id] of Object.entries(AUDIT_REFS)) {
    if (alias.toLowerCase() === lower) return id;
  }
  return undefined;
}
