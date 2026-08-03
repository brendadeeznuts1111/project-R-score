#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
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

/**
 * Write grandfather baseline for concepts that still lack correlationId.
 * Refuses to grandfather ids that already have provenance (prevents gate neuter)
 * unless `force` is set.
 */
export async function writeBaselineFromConcepts(
  concepts: readonly PortalSemanticConcept[],
  path = BASELINE_PATH,
  opts?: { force?: boolean }
): Promise<{ wrote: number; skippedWithProvenance: number }> {
  const force = opts?.force ?? false;
  const without: string[] = [];
  let skippedWithProvenance = 0;
  for (const concept of concepts) {
    const corr = conceptCorrelationId(concept);
    if (corr && corr.length > 0) {
      skippedWithProvenance++;
      if (force) without.push(concept.id);
      continue;
    }
    without.push(concept.id);
  }
  const ids = [...new Set(without)].sort();
  if (ids.length === 0 && !force) {
    throw new Error(
      'No concepts lack correlationId — baseline would be empty. ' +
        'Refusing to grandfather ids that already have provenance (pass --force to override).'
    );
  }
  const payload: Baseline = {
    version: 1,
    description:
      'Portal concept ids grandfathered without correlationId. New ids must set correlationId.',
    grandfatheredIds: force ? [...new Set(concepts.map(c => c.id))].sort() : ids,
  };
  await Bun.write(path, `${JSON.stringify(payload, null, 2)}\n`);
  return { wrote: payload.grandfatheredIds.length, skippedWithProvenance };
}

export async function runConceptMetadataValidation(): Promise<{
  ok: boolean;
  total: number;
  withProvenance: number;
  grandfathered: number;
  issues: ConceptMetadataIssue[];
}> {
  const baseline = await loadBaseline();
  const issues = validateConceptMetadata(PORTAL_SEMANTIC_CONCEPTS, baseline);
  const withProvenance = PORTAL_SEMANTIC_CONCEPTS.filter(
    c => (conceptCorrelationId(c) ?? '').length > 0
  ).length;
  return {
    ok: issues.length === 0,
    total: PORTAL_SEMANTIC_CONCEPTS.length,
    withProvenance,
    grandfathered: baseline.grandfatheredIds.length,
    issues,
  };
}

async function main(): Promise<void> {
  const wantJson = Bun.argv.includes('--json');
  const writeBaseline = Bun.argv.includes('--write-baseline');
  const force = Bun.argv.includes('--force');

  if (writeBaseline) {
    try {
      const result = await writeBaselineFromConcepts(PORTAL_SEMANTIC_CONCEPTS, BASELINE_PATH, {
        force,
      });
      if (wantJson) {
        jsonOut({ ok: true, ...result, path: BASELINE_PATH });
      } else {
        console.log(
          colorize(
            `Wrote baseline (${result.wrote} ids, skipped ${result.skippedWithProvenance} with provenance) → ${BASELINE_PATH}`,
            '#3fb950'
          )
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (wantJson) jsonOut({ ok: false, error: message });
      else console.error(colorize(`❌ ${message}`, '#f85149'));
      process.exit(1);
    }
    return;
  }

  const report = await runConceptMetadataValidation();

  if (wantJson) {
    jsonOut(report);
  } else {
    logTable(
      [
        {
          total: report.total,
          withProvenance: report.withProvenance,
          grandfathered: report.grandfathered,
          issues: report.issues.length,
        },
      ],
      ['total', 'withProvenance', 'grandfathered', 'issues']
    );
    if (report.ok) {
      console.log(colorize('✅ Concept metadata: PASS', '#3fb950'));
    } else {
      console.error(
        colorize(
          `❌ Concept metadata: FAIL (${report.issues.length} new concepts missing correlationId)`,
          '#f85149'
        )
      );
      for (const issue of report.issues) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
      console.error(
        colorize(
          'Add correlationId (e.g. PR#228) + addedAt on the concept. ' +
            '--write-baseline only grandfathers ids that still lack provenance.',
          '#8b949e'
        )
      );
    }
  }

  if (!report.ok) process.exit(1);
}

if (import.meta.main) {
  await main();
}
