/**
 * lib/audit — FactoryWager audit-finding SSOT (sibling to Bun docs catalog).
 */
export {
  type AuditEvidence,
  type AuditFinding,
  type AuditFindingStatus,
  type AuditHashAlgorithm,
  assertEvidencePathAllowed,
  hashFile,
  isAuditFindingStatus,
  isAuditHashAlgorithm,
  parseAuditFinding,
  verifyEvidenceHash,
} from './audit-finding.ts';
export { type AuditConcept, parseAuditConcept } from './audit-concept.ts';
export {
  AUDIT_REFS,
  auditConceptDocsPath,
  auditFindingDocsPath,
  resolveAuditAlias,
  toAuditEntryId,
} from './audit-refs.ts';
export {
  renderAuditConceptMarkdown,
  renderAuditConceptsIndex,
  renderAuditFindingMarkdown,
  renderAuditFindingsIndex,
} from './render-finding.ts';
