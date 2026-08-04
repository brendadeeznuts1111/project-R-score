// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * @domain audit
 * @module lib/types/branded/audit.ts
 *
 * Secrets versioning, audit-log events, and FactoryWager audit SSOT entry ids.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 *
 * AuditId = audit LOG entry (existing). Do not reuse for findings/concepts.
 * AuditFindingId / AuditConceptId = SSOT entity PKs.
 * AuditEntryId = polymorphic ref (related[], AUDIT_REFS values, suggest).
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type VersionId = BrandedString<'VersionId'>;
export type AuditId = BrandedString<'AuditId'>;
export type AuditFindingId = BrandedString<'AuditFindingId'>;
export type AuditConceptId = BrandedString<'AuditConceptId'>;
export type AuditEntryId = BrandedString<'AuditEntryId'>;
/** Screenshot / image evidence row (typically UUID v7). */
export type EvidenceId = BrandedString<'EvidenceId'>;
/** DOD (proof-of-deposit) submission identity. */
export type DodId = BrandedString<'DodId'>;
/** Anomaly-detection rule identity. */
export type RuleId = BrandedString<'RuleId'>;

const version = defineBrandConstructors('VersionId');
const audit = defineBrandConstructors('AuditId');
const finding = defineBrandConstructors('AuditFindingId');
const concept = defineBrandConstructors('AuditConceptId');
const entry = defineBrandConstructors('AuditEntryId');
const evidence = defineBrandConstructors('EvidenceId');
const dod = defineBrandConstructors('DodId');
const rule = defineBrandConstructors('RuleId');

export const asVersionId = version.as;
export const tryVersionId = version.try;
export const parseVersionId = version.parse;

export const asAuditId = audit.as;
export const tryAuditId = audit.try;
export const parseAuditId = audit.parse;

export const asAuditFindingId = finding.as;
export const tryAuditFindingId = finding.try;
export const parseAuditFindingId = finding.parse;

export const asAuditConceptId = concept.as;
export const tryAuditConceptId = concept.try;
export const parseAuditConceptId = concept.parse;

export const asAuditEntryId = entry.as;
export const tryAuditEntryId = entry.try;
export const parseAuditEntryId = entry.parse;

export const asEvidenceId = evidence.as;
export const tryEvidenceId = evidence.try;
export const parseEvidenceId = evidence.parse;

export const asDodId = dod.as;
export const tryDodId = dod.try;
export const parseDodId = dod.parse;

export const asRuleId = rule.as;
export const tryRuleId = rule.try;
export const parseRuleId = rule.parse;

export const AUDIT_BRAND_SPECS = [
  {
    name: 'VersionId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Secret or config version identity',
  },
  {
    name: 'AuditId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Audit log entry identity',
  },
  {
    name: 'AuditFindingId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'FactoryWager audit-finding SSOT primary key',
  },
  {
    name: 'AuditConceptId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'FactoryWager audit-concept SSOT primary key',
  },
  {
    name: 'AuditEntryId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Polymorphic audit SSOT ref (finding or concept id)',
  },
  {
    name: 'EvidenceId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Screenshot / image evidence row (UUID v7 via Bun.randomUUIDv7)',
  },
  {
    name: 'DodId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'DOD (proof-of-deposit) submission identity',
  },
  {
    name: 'RuleId',
    domain: 'audit',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Anomaly-detection rule identity',
  },
] as const satisfies readonly BrandSpec[];
