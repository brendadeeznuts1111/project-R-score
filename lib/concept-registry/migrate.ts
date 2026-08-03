// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io — Bun.file
// lib/concept-registry/migrate.ts — seed the registry from the two real SSOTs.
//
// Phase-1 migration sources (the proposal's `concept-provenance.json` does
// not exist anywhere — provenance lives in the bake + vocabulary correlationId
// fields, neither of which carries values on main yet):
//
//   1. public/registry/domain-glossary.json  — baked glossary (428 concepts:
//      label, description, kind, category, status, color, unit, mapsTo,
//      seeAlso, synonyms, values, url, deprecatedBy, source)
//   2. lib/portal/semantic-vocabulary.ts     — live portal SSOT
//      (PORTAL_SEMANTIC_CONCEPTS: label, description, semanticType, uiRole,
//      unit, format, seeAlso) — gap-fills bake rows without clobbering
//
// The usage pass greps `public/portal/**/*.html` for `data-glossary-concept`
// attributes (the same mechanism concept-usage counting uses) so
// GET /api/concepts/:id/usage returns real data immediately.

import { PORTAL_SEMANTIC_CONCEPTS } from '../portal/semantic-vocabulary.ts';
import { getConcept, patchConcept, scanPortalConceptUsage, upsertConcept } from './repo.ts';
import { BakeFileSchema } from './types.ts';

import type { Database } from 'bun:sqlite';

export type ConceptRegistryMigrationSummary = {
  baked: number;
  inserted: number;
  updated: number;
  vocabularyPresent: number;
  usageRows: number;
  provenanceRows: number;
  total: number;
};

function groupPrefixOf(id: string): string {
  // brand-ok — glossary concept key
  const parts = id.split('.');
  return parts.length >= 2 ? parts.slice(0, 2).join('.') : (parts[0] ?? null);
}

/** Idempotent: re-running merges changes and bumps versions only on diffs. */
export async function migrateConceptRegistry(
  db: Database,
  opts: { bakePath?: string; portalDir?: string; scanUsage?: boolean } = {}
): Promise<ConceptRegistryMigrationSummary> {
  const bakePath = opts.bakePath ?? 'public/registry/domain-glossary.json';
  const portalDir = opts.portalDir ?? 'public/portal';
  const summary: ConceptRegistryMigrationSummary = {
    baked: 0,
    inserted: 0,
    updated: 0,
    vocabularyPresent: 0,
    usageRows: 0,
    provenanceRows: 0,
    total: 0,
  };

  // 1. Bake pass (boundary parse via zod).
  const bakeText = await Bun.file(bakePath).text();
  const bake = BakeFileSchema.safeParse(JSON.parse(bakeText) as unknown);
  if (!bake.success) {
    throw new Error(`invalid glossary bake at ${bakePath}: ${bake.error.issues[0]?.message}`);
  }
  for (const concept of bake.data.concepts) {
    const preExisting = getConcept(db, concept.id);
    const changed = upsertConcept(db, {
      id: concept.id,
      label: concept.label ?? concept.id,
      description: concept.description ?? null,
      kind: concept.kind ?? null,
      category: concept.category ?? null,
      groupPrefix: groupPrefixOf(concept.id),
      status: concept.status === 'deprecated' ? 'deprecated' : 'active',
      color: concept.color ?? null,
      unit: concept.unit ?? null,
      mapsTo: concept.mapsTo ?? null,
      seeAlso: concept.seeAlso ?? [],
      synonyms: concept.synonyms ?? [],
      values: concept.values ?? [],
      url: concept.url ?? null,
      deprecatedBy: concept.deprecatedBy ?? null,
      source: bakePath,
    });
    summary.baked++;
    if (changed) {
      if (preExisting) summary.updated++;
      else summary.inserted++;
    }
  }

  // 2. Vocabulary pass — gap-fill; insert portal concepts missing from the bake.
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const existing = getConcept(db, concept.id);
    if (existing) {
      summary.vocabularyPresent++;
      patchConcept(db, concept.id, {
        label: concept.label,
        description: concept.description,
        kind: concept.semanticType,
        unit: concept.unit ?? null,
        format: concept.format ?? null,
        seeAlso: concept.seeAlso,
        synonyms: concept.synonyms,
        values: concept.values ?? [],
      });
    } else {
      const inserted = upsertConcept(db, {
        id: concept.id,
        label: concept.label,
        description: concept.description,
        kind: concept.semanticType,
        category: concept.id.split('.')[0] ?? null,
        groupPrefix: groupPrefixOf(concept.id),
        seeAlso: concept.seeAlso,
        synonyms: concept.synonyms,
        values: concept.values ?? [],
        unit: concept.unit ?? null,
        format: concept.format ?? null,
        source: 'lib/portal/semantic-vocabulary.ts',
      });
      if (inserted) summary.inserted++;
    }
  }

  // 3. Usage pass (one-shot scan; watcher is a later phase).
  if (opts.scanUsage ?? true) {
    summary.usageRows = await scanPortalConceptUsage(db, portalDir);
  }

  // 4. Provenance — bake + vocabulary carry no correlationId on main yet; the
  //    table is ready for PR-228 correlationIds / future review-sourced rows.
  const { total } = db.query('SELECT COUNT(*) AS total FROM concepts').get() as { total: number };
  summary.total = total;
  return summary;
}
