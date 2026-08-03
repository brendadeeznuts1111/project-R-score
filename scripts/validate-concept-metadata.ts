#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Gate: new portal concepts must carry a provenance correlationId.
 *
 * Grandfathered ids (pre-gate inventory) may omit correlationId.
 * New ids not in scripts/concept-metadata-baseline.json must set
 * `correlationId` (and preferably `addedAt`) on PortalSemanticConceptDef.
 *
 *   bun run validate:concept-metadata
 *   bun run validate:concept-metadata -- --write-baseline
 *   bun run validate:concept-metadata -- --json
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
} from '../lib/portal/semantic-vocabulary.ts';

const BASELINE_PATH = `${import.meta.dir}/concept-metadata-baseline.json`;

type Baseline = {
  version: number;
  description?: string;
  grandfatheredIds: string[]; // brand-ok — glossary concept keys
};

export type ConceptMetadataIssue = {
  id: string; // brand-ok — glossary concept key
  reason: 'missing-correlation-id' | 'empty-correlation-id';
};

function conceptCorrelationId(concept: PortalSemanticConcept): string | undefined {
  return 'correlationId' in concept && typeof concept.correlationId === 'string'
    ? concept.correlationId.trim()
    : undefined;
}

export async function loadBaseline(path = BASELINE_PATH): Promise<Baseline> {
  return (await Bun.file(path).json()) as Baseline;
}

export function validateConceptMetadata(
  concepts: readonly PortalSemanticConcept[],
  baseline: Baseline
): ConceptMetadataIssue[] {
  const grandfathered = new Set(baseline.grandfatheredIds);
  const issues: ConceptMetadataIssue[] = [];
  for (const concept of concepts) {
    if (grandfathered.has(concept.id)) continue;
    const corr = conceptCorrelationId(concept);
    if (corr === undefined) {
      issues.push({ id: concept.id, reason: 'missing-correlation-id' });
    } else if (corr.length === 0) {
      issues.push({ id: concept.id, reason: 'empty-correlation-id' });
    }
  }
  return issues;
}

export async function writeBaselineFromConcepts(
  concepts: readonly PortalSemanticConcept[],
  path = BASELINE_PATH
): Promise<number> {
  const ids = [...new Set(concepts.map(c => c.id))].sort();
  const payload: Baseline = {
    version: 1,
    description:
      'Portal concept ids grandfathered without correlationId. New ids must set correlationId.',
    grandfatheredIds: ids,
  };
  await Bun.write(path, `${JSON.stringify(payload, null, 2)}\n`);
  return ids.length;
}

async function main(): Promise<void> {
  const wantJson = Bun.argv.includes('--json');
  const writeBaseline = Bun.argv.includes('--write-baseline');

  if (writeBaseline) {
    const n = await writeBaselineFromConcepts(PORTAL_SEMANTIC_CONCEPTS);
    if (wantJson) {
      jsonOut({ ok: true, wrote: n, path: BASELINE_PATH });
    } else {
      console.log(colorize(`Wrote baseline (${n} ids) → ${BASELINE_PATH}`, '#3fb950'));
    }
    return;
  }

  const baseline = await loadBaseline();
  const issues = validateConceptMetadata(PORTAL_SEMANTIC_CONCEPTS, baseline);
  const withProvenance = PORTAL_SEMANTIC_CONCEPTS.filter(
    c => (conceptCorrelationId(c) ?? '').length > 0
  ).length;

  if (wantJson) {
    jsonOut({
      ok: issues.length === 0,
      total: PORTAL_SEMANTIC_CONCEPTS.length,
      withProvenance,
      grandfathered: baseline.grandfatheredIds.length,
      issues,
    });
  } else {
    logTable(
      [
        {
          total: PORTAL_SEMANTIC_CONCEPTS.length,
          withProvenance,
          grandfathered: baseline.grandfatheredIds.length,
          issues: issues.length,
        },
      ],
      ['total', 'withProvenance', 'grandfathered', 'issues']
    );
    if (issues.length === 0) {
      console.log(colorize('✅ Concept metadata: PASS', '#3fb950'));
    } else {
      console.error(
        colorize(
          `❌ Concept metadata: FAIL (${issues.length} new concepts missing correlationId)`,
          '#f85149'
        )
      );
      for (const issue of issues) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
      console.error(
        colorize(
          'Add correlationId (e.g. PR#228) + addedAt on the concept, or --write-baseline (owners).',
          '#8b949e'
        )
      );
    }
  }

  if (issues.length > 0) process.exit(1);
}

if (import.meta.main) {
  await main();
}
