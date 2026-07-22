/**
 * AuditConcept — mathematical / domain concepts for the audit sibling SSOT.
 * Not BunToken. Linked from AuditFinding.related by id.
 */
import { parseNonEmptyString, parseOptionalStringArray, isRecord } from './parse-helpers.ts';

export type AuditConcept = {
  id: string; // brand-ok — opaque audit concept primary key
  kind: 'AuditConcept';
  title: string;
  description: string;
  /** ISO calendar date when documented in this repo. */
  publishedAt: string;
  /** Optional product/doc version pin for when the concept was added. */
  since?: string;
  /** External references (papers, URLs, repo paths) — not BunToken merge. */
  references?: string[];
  /** Related audit entry ids. */
  related?: string[];
  /** Opaque BunToken / doc token names for reverse navigation. */
  relatedDocs?: string[];
  meta?: {
    buildPin?: string;
    emitter?: string;
  };
};

/** Wire `unknown` → AuditConcept (boundary). */
export function parseAuditConcept(raw: unknown): AuditConcept {
  if (!isRecord(raw)) throw new Error('AuditConcept: expected object');
  if (raw.kind !== 'AuditConcept') {
    throw new Error(`AuditConcept.kind: expected "AuditConcept", got ${String(raw.kind)}`);
  }
  const id = parseNonEmptyString(raw.id, 'AuditConcept.id');
  const title = parseNonEmptyString(raw.title, 'AuditConcept.title');
  const description = parseNonEmptyString(raw.description, 'AuditConcept.description');
  const publishedAt = parseNonEmptyString(raw.publishedAt, 'AuditConcept.publishedAt');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    throw new Error('AuditConcept.publishedAt: expected YYYY-MM-DD');
  }
  const concept: AuditConcept = {
    id,
    kind: 'AuditConcept',
    title,
    description,
    publishedAt,
  };
  if (raw.since !== undefined) {
    concept.since = parseNonEmptyString(raw.since, 'AuditConcept.since');
  }
  concept.references = parseOptionalStringArray(raw.references, 'AuditConcept.references');
  concept.related = parseOptionalStringArray(raw.related, 'AuditConcept.related');
  concept.relatedDocs = parseOptionalStringArray(raw.relatedDocs, 'AuditConcept.relatedDocs');
  if (raw.meta !== undefined) {
    if (!isRecord(raw.meta)) throw new Error('AuditConcept.meta: expected object');
    const meta: NonNullable<AuditConcept['meta']> = {};
    if (raw.meta.buildPin !== undefined) {
      meta.buildPin = parseNonEmptyString(raw.meta.buildPin, 'AuditConcept.meta.buildPin');
    }
    if (raw.meta.emitter !== undefined) {
      meta.emitter = parseNonEmptyString(raw.meta.emitter, 'AuditConcept.meta.emitter');
    }
    concept.meta = meta;
  }
  return concept;
}
