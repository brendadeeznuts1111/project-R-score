/**
 * @domain audit
 * @module lib/types/branded/audit.ts
 *
 * Secrets versioning and audit event brands.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type VersionId = BrandedString<'VersionId'>;
export type AuditId = BrandedString<'AuditId'>;

const version = defineBrandConstructors('VersionId');
const audit = defineBrandConstructors('AuditId');

export const asVersionId = version.as;
export const tryVersionId = version.try;
export const parseVersionId = version.parse;

export const asAuditId = audit.as;
export const tryAuditId = audit.try;
export const parseAuditId = audit.parse;

export const AUDIT_BRAND_SPECS: readonly BrandSpec[] = [
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
] as const;
