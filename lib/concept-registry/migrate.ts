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

import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConceptDef,
} from '../portal/semantic-vocabulary.ts';
import { getConcept, scanPortalConceptUsage, upsertConcept } from './repo.ts';
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
  const semanticById = new Map<string, PortalSemanticConceptDef>(
    PORTAL_SEMANTIC_CONCEPTS.map(concept => [concept.id, concept])
  ); // brand-ok — glossary concept key indexes the semantic fallback
  const bakedIds = new Set<string>(); // brand-ok — glossary concept keys parsed from the bake

  // 1. Bake pass (boundary parse via zod). The bake owns governance metadata
  // (category, color, status, URL); the portal vocabulary owns its live
  // presentation semantics. Merge both before upsert so reruns converge.
  const bakeText = await Bun.file(bakePath).text();
  const bake = BakeFileSchema.safeParse(JSON.parse(bakeText) as unknown);
  if (!bake.success) {
    throw new Error(`invalid glossary bake at ${bakePath}: ${bake.error.issues[0]?.message}`);
  }
  for (const concept of bake.data.concepts) {
    bakedIds.add(concept.id);
    const semanticConcept = semanticById.get(concept.id);
    const preExisting = getConcept(db, concept.id);
    const changed = upsertConcept(db, {
      id: concept.id,
      label: semanticConcept?.label ?? concept.label ?? concept.id,
      description: semanticConcept?.description ?? concept.description ?? null,
      kind: semanticConcept?.semanticType ?? concept.kind ?? null,
      category: concept.category ?? null,
      groupPrefix: groupPrefixOf(concept.id),
      status: concept.status === 'deprecated' ? 'deprecated' : 'active',
      color: concept.color ?? null,
      unit: semanticConcept?.unit ?? concept.unit ?? null,
      format: semanticConcept?.format ?? concept.format ?? null,
      mapsTo: concept.mapsTo ?? null,
      seeAlso: semanticConcept?.seeAlso ?? concept.seeAlso ?? [],
      synonyms: semanticConcept?.synonyms ?? concept.synonyms ?? [],
      values: semanticConcept?.values ?? concept.values ?? [],
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

  // 2. Vocabulary pass — baked rows were already enriched above; insert only
  // portal concepts that are entirely absent from the bake.
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const semanticConcept: PortalSemanticConceptDef = concept;
    if (bakedIds.has(semanticConcept.id)) {
      summary.vocabularyPresent++;
    } else {
      const preExisting = getConcept(db, semanticConcept.id);
      const changed = upsertConcept(db, {
        id: semanticConcept.id,
        label: semanticConcept.label,
        description: semanticConcept.description,
        kind: semanticConcept.semanticType,
        category: semanticConcept.id.split('.')[0] ?? null,
        groupPrefix: groupPrefixOf(semanticConcept.id),
        seeAlso: semanticConcept.seeAlso,
        synonyms: semanticConcept.synonyms,
        values: semanticConcept.values ?? [],
        unit: semanticConcept.unit ?? null,
        format: semanticConcept.format ?? null,
        status: semanticConcept.status ?? 'active',
        deprecatedBy: semanticConcept.replacedBy ?? null,
        source: 'lib/portal/semantic-vocabulary.ts',
      });
      if (changed) {
        if (preExisting) summary.updated++;
        else summary.inserted++;
      }
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
