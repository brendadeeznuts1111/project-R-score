/**
 * AUDIT_REFS — FactoryWager audit aliases (sibling to CANONICAL_REFS).
 * Values are entry ids (finding or concept) — not bun.com URLs.
 */

/** Alias / topic → audit entry id (AuditFinding or AuditConcept). */
export const AUDIT_REFS: Record<string, string> = {
  // findings
  'sample-fiber-demo-2026-07-21': 'sample-fiber-demo-2026-07-21',
  'sample fiber': 'sample-fiber-demo-2026-07-21',
  'sample-fiber-demo': 'sample-fiber-demo-2026-07-21',
  fiber: 'sample-fiber-demo-2026-07-21',
  'nagata fiber': 'sample-fiber-demo-2026-07-21',
  // concepts
  'nagata-map': 'nagata-map',
  'nagata map': 'nagata-map',
  Nagata: 'nagata-map',
  'Nagata map': 'nagata-map',
  'jacobian-nullspace': 'jacobian-nullspace',
  'jacobian nullspace': 'jacobian-nullspace',
  'Jacobian nullspace': 'jacobian-nullspace',
  // FactoryWager harness (not Bun upstream CI)
  'harness-day-loop': 'harness-day-loop',
  'harness day-loop': 'harness-day-loop',
  'day-loop': 'harness-day-loop',
  'day loop': 'harness-day-loop',
};

/** Repo-relative markdown page for a finding id. */
export function auditFindingDocsPath(id: string): string {
  // brand-ok — opaque audit entry id
  return `docs/audit/findings/${id}.md`;
}

/** Repo-relative markdown page for a concept id. */
export function auditConceptDocsPath(id: string): string {
  // brand-ok — opaque audit entry id
  return `docs/audit/concepts/${id}.md`;
}

/** @deprecated use auditFindingDocsPath — kept for call-site clarity during migrate */
export function auditDocsPath(id: string): string {
  // brand-ok — opaque audit entry id
  return auditFindingDocsPath(id);
}

/** Resolve query via AUDIT_REFS (exact, then case-insensitive). */
export function resolveAuditAlias(query: string): string | undefined {
  const q = query.trim();
  if (!q) return undefined;
  if (AUDIT_REFS[q]) return AUDIT_REFS[q];
  const lower = q.toLowerCase();
  for (const [alias, id] of Object.entries(AUDIT_REFS)) {
    if (alias.toLowerCase() === lower) return id;
  }
  return undefined;
}
