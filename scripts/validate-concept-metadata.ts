#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Gate: new portal concepts must carry provenance + valid namespace/domain.
 *
 * Grandfathered ids (pre-gate inventory) may omit correlationId.
 * New ids not in scripts/concept-metadata-baseline.json must set
 * `correlationId` (and preferably `addedAt`) on PortalSemanticConceptDef.
 *
 *   bun run validate:concept-metadata
 *   bun run validate:concept-metadata -- --write-baseline
 *   bun run validate:concept-metadata -- --json
 *   bun run validate:concept-metadata -- --strict   # grandfathered must also carry addedAt
 *   bun run validate:concept-metadata -- --fix      # repair domain + addedAt mechanically
 *
 * Env: CONCEPT_METADATA_STRICT=1 ≡ --strict · CONCEPT_METADATA_FIX=1 ≡ --fix.
 * --fix never invents correlationId values — missing provenance is reported
 * as remaining (unfixable) after the repair pass.
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { isConceptDomain, type ConceptDomain } from '../lib/portal/concept-domains.ts';
import {
  inferPortalSemanticNamespace,
  isPortalSemanticNamespace,
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
} from '../lib/portal/semantic-vocabulary.ts';
import { planDomainBackfill, writeDomainBackfill } from './concept-domain-backfill.ts';

const BASELINE_PATH = `${import.meta.dir}/concept-metadata-baseline.json`;
const VOCAB_PATH = `${import.meta.dir}/../lib/portal/semantic-vocabulary.ts`;

type Baseline = {
  version: number;
  description?: string;
  grandfatheredIds: string[]; // brand-ok — glossary concept keys
};

export type ConceptMetadataIssue = {
  id: string; // brand-ok — glossary concept key
  reason:
    | 'missing-correlation-id'
    | 'empty-correlation-id'
    | 'missing-domain'
    | 'invalid-domain'
    | 'missing-namespace'
    | 'invalid-namespace'
    | 'namespace-id-mismatch';
};

export function conceptCorrelationId(concept: PortalSemanticConcept): string | undefined {
  return 'correlationId' in concept && typeof concept.correlationId === 'string'
    ? concept.correlationId.trim()
    : undefined;
}

export function conceptDomain(concept: PortalSemanticConcept): string | undefined {
  return 'domain' in concept && typeof concept.domain === 'string'
    ? concept.domain.trim()
    : undefined;
}

export function conceptNamespace(concept: PortalSemanticConcept): string | undefined {
  return 'namespace' in concept && typeof concept.namespace === 'string'
    ? concept.namespace.trim()
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
    const ns = conceptNamespace(concept);
    if (ns === undefined || ns.length === 0) {
      issues.push({ id: concept.id, reason: 'missing-namespace' });
    } else if (!isPortalSemanticNamespace(ns)) {
      issues.push({ id: concept.id, reason: 'invalid-namespace' });
    } else {
      const inferred = inferPortalSemanticNamespace(concept.id);
      if (inferred && inferred !== ns) {
        issues.push({ id: concept.id, reason: 'namespace-id-mismatch' });
      }
    }

    const domain = conceptDomain(concept);
    if (domain === undefined || domain.length === 0) {
      issues.push({ id: concept.id, reason: 'missing-domain' });
    } else if (!isConceptDomain(domain)) {
      issues.push({ id: concept.id, reason: 'invalid-domain' });
    }

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
    if (corr === undefined || corr.length === 0) {
      without.push(concept.id);
    } else {
      skippedWithProvenance += 1;
    }
  }
  if (without.length === 0 && !force) {
    throw new Error(
      'No concepts lack correlationId — refusing to write empty/neuter baseline (pass --force to overwrite)'
    );
  }
  if (skippedWithProvenance > 0 && without.length > 0) {
    // only grandfather the missing ones
  }
  const baseline: Baseline = {
    version: 1,
    description:
      'Ids allowed to omit correlationId. Prefer stamping SSOT over expanding this list.',
    grandfatheredIds: without.sort(),
  };
  await Bun.write(path, `${JSON.stringify(baseline, null, 2)}\n`);
  return { wrote: without.length, skippedWithProvenance };
}

export async function runConceptMetadataValidation(opts?: {
  concepts?: readonly PortalSemanticConcept[];
  baselinePath?: string;
}): Promise<{
  ok: boolean;
  issues: ConceptMetadataIssue[];
  withProvenance: number;
  total: number;
}> {
  const concepts = opts?.concepts ?? PORTAL_SEMANTIC_CONCEPTS;
  const baseline = await loadBaseline(opts?.baselinePath);
  const issues = validateConceptMetadata(concepts, baseline);
  const withProvenance = concepts.filter(c => {
    const corr = conceptCorrelationId(c);
    return corr !== undefined && corr.length > 0;
  }).length;
  return {
    ok: issues.length === 0,
    issues,
    withProvenance,
    total: concepts.length,
  };
}

/** addedAt accessor tolerant of concepts defined before the field existed. */
export function conceptAddedAt(concept: PortalSemanticConcept): string | undefined {
  return 'addedAt' in concept && typeof concept.addedAt === 'string'
    ? concept.addedAt.trim()
    : undefined;
}

export type GrandfatheredAddedAtIssue = {
  id: string; // brand-ok — glossary concept key
  reason: 'grandfathered-missing-added-at';
};

/**
 * --strict: grandfathered concepts are allowed to omit correlationId, but they
 * must still carry `addedAt` so the vocabulary has full temporal provenance.
 */
export function validateGrandfatheredAddedAt(
  concepts: readonly PortalSemanticConcept[],
  baseline: Baseline
): GrandfatheredAddedAtIssue[] {
  const grandfathered = new Set(baseline.grandfatheredIds);
  const issues: GrandfatheredAddedAtIssue[] = [];
  for (const concept of concepts) {
    if (!grandfathered.has(concept.id)) continue;
    const addedAt = conceptAddedAt(concept);
    if (addedAt === undefined || addedAt.length === 0) {
      issues.push({ id: concept.id, reason: 'grandfathered-missing-added-at' });
    }
  }
  return issues;
}

export type ConceptMetadataFixPlan = {
  /** Concepts whose domain is missing/invalid/mismatched and inferable. */
  domainFixes: Array<{ id: string; domain: ConceptDomain }>; // brand-ok — glossary concept keys
  /** Concepts with correlationId but no addedAt — stamped with `today`. */
  addedAtFixes: Array<{ id: string; addedAt: string }>; // brand-ok — glossary concept keys
  /** Issues the fixer cannot repair mechanically (never invents correlationId). */
  unfixable: ConceptMetadataIssue[];
};

/**
 * Pure plan for --fix: what can be repaired mechanically vs what still fails.
 * Domain rows come from the backfill planner (missing/invalid/mismatched);
 * `tbd` inferences are unfixable. correlationId is never invented.
 */
export function planConceptMetadataFixes(
  concepts: readonly PortalSemanticConcept[],
  opts?: { today?: string; baseline?: Baseline }
): ConceptMetadataFixPlan {
  const today = opts?.today ?? new Date().toISOString().slice(0, 10);
  const grandfathered = new Set(opts?.baseline?.grandfatheredIds ?? []);
  const { plan } = planDomainBackfill(concepts as typeof PORTAL_SEMANTIC_CONCEPTS);

  const domainFixes: ConceptMetadataFixPlan['domainFixes'] = [];
  const unfixable: ConceptMetadataIssue[] = [];
  for (const row of plan) {
    if (!row.changed) continue;
    if (row.domain === 'tbd') {
      unfixable.push({ id: row.id, reason: row.hadDomain ? 'invalid-domain' : 'missing-domain' });
    } else {
      domainFixes.push({ id: row.id, domain: row.domain });
    }
  }

  const addedAtFixes: ConceptMetadataFixPlan['addedAtFixes'] = [];
  for (const concept of concepts) {
    const corr = conceptCorrelationId(concept);
    const hasCorr = corr !== undefined && corr.length > 0;
    const addedAt = conceptAddedAt(concept);
    if (hasCorr && (addedAt === undefined || addedAt.length === 0)) {
      addedAtFixes.push({ id: concept.id, addedAt: today });
    }
    if (!hasCorr && !grandfathered.has(concept.id)) {
      unfixable.push({
        id: concept.id,
        reason: corr === undefined ? 'missing-correlation-id' : 'empty-correlation-id',
      });
    }
  }

  return { domainFixes, addedAtFixes, unfixable };
}

/**
 * Insert `addedAt: '<date>'` after the correlationId line for each fix row.
 * Same block-scanning approach as the domain backfill; returns rows written.
 */
export async function insertAddedAtDates(
  fixes: readonly { id: string; addedAt: string }[], // brand-ok — opaque glossary concept key
  opts?: { vocabPath?: string; dryRun?: boolean }
): Promise<number> {
  const vocabPath = opts?.vocabPath ?? VOCAB_PATH;
  let src = await Bun.file(vocabPath).text();
  let written = 0;

  const idRe = /\n  \{\n    id: '([^']+)',/g;
  const inserts: Array<{ at: number; text: string }> = [];

  for (const match of src.matchAll(idRe)) {
    const id = match[1]!;
    const fix = fixes.find(f => f.id === id);
    if (!fix) continue;
    const from = match.index! + match[0].length;
    const closeComma = src.indexOf('\n  },', from);
    const closeBare = src.indexOf('\n  }', from);
    let close = -1;
    if (closeComma !== -1 && (closeBare === -1 || closeComma <= closeBare)) close = closeComma;
    else close = closeBare;
    if (close === -1) continue;
    const block = src.slice(match.index!, close);
    if (/\n    addedAt:\s*'/.test(block)) continue;
    const corrMatch = block.match(/\n    correlationId: '[^']*',/);
    if (corrMatch && corrMatch.index !== undefined) {
      inserts.push({
        at: match.index! + corrMatch.index + corrMatch[0].length,
        text: `\n    addedAt: '${fix.addedAt}',`,
      });
    }
  }

  inserts.sort((a, b) => b.at - a.at);
  for (const ins of inserts) {
    src = `${src.slice(0, ins.at)}${ins.text}${src.slice(ins.at)}`;
    written++;
  }

  if (!opts?.dryRun && written > 0) await Bun.write(vocabPath, src);
  return written;
}

export type ConceptMetadataFixSummary = {
  fixedDomains: number;
  fixedAddedAt: number;
  plannedDomainFixes: number;
  plannedAddedAtFixes: number;
  remaining: ConceptMetadataIssue[];
};

/**
 * --fix: repair domain (via the backfill write path) and addedAt, then report
 * what remains failing. Never invents correlationId values.
 */
export async function runConceptMetadataFix(opts?: {
  concepts?: readonly PortalSemanticConcept[];
  baseline?: Baseline;
  vocabPath?: string;
  today?: string;
  dryRun?: boolean;
}): Promise<ConceptMetadataFixSummary> {
  const concepts = opts?.concepts ?? PORTAL_SEMANTIC_CONCEPTS;
  const baseline = opts?.baseline ?? (await loadBaseline());
  const plan = planConceptMetadataFixes(concepts, { today: opts?.today, baseline });

  let fixedDomains = 0;
  if (plan.domainFixes.length > 0) {
    const { plan: domainPlan } = planDomainBackfill(concepts as typeof PORTAL_SEMANTIC_CONCEPTS);
    const rows = domainPlan.filter(p => p.changed && p.domain !== 'tbd');
    fixedDomains = await writeDomainBackfill(rows, {
      vocabPath: opts?.vocabPath,
      dryRun: opts?.dryRun,
    });
  }

  let fixedAddedAt = 0;
  if (plan.addedAtFixes.length > 0) {
    fixedAddedAt = await insertAddedAtDates(plan.addedAtFixes, {
      vocabPath: opts?.vocabPath,
      dryRun: opts?.dryRun,
    });
  }

  return {
    fixedDomains,
    fixedAddedAt,
    plannedDomainFixes: plan.domainFixes.length,
    plannedAddedAtFixes: plan.addedAtFixes.length,
    remaining: plan.unfixable,
  };
}

async function main(): Promise<void> {
  const writeBaseline = Bun.argv.includes('--write-baseline');
  const force = Bun.argv.includes('--force');
  const asJson = Bun.argv.includes('--json');
  const strict = Bun.argv.includes('--strict') || Bun.env.CONCEPT_METADATA_STRICT === '1';
  const fix = Bun.argv.includes('--fix') || Bun.env.CONCEPT_METADATA_FIX === '1';

  if (writeBaseline) {
    const result = await writeBaselineFromConcepts(PORTAL_SEMANTIC_CONCEPTS, BASELINE_PATH, {
      force,
    });
    console.log(
      `wrote concept-metadata-baseline.json · grandfathered=${result.wrote} · skippedWithProvenance=${result.skippedWithProvenance}`
    );
    return;
  }

  if (fix) {
    const summary = await runConceptMetadataFix();
    if (asJson) {
      jsonOut(summary);
    } else {
      logTable(
        [
          {
            fixedDomains: summary.fixedDomains,
            fixedAddedAt: summary.fixedAddedAt,
            remaining: summary.remaining.length,
          },
        ],
        ['fixedDomains', 'fixedAddedAt', 'remaining']
      );
      if (summary.remaining.length > 0) {
        console.error(colorize('concept metadata issues remaining after fix:', '#f85149'));
        for (const issue of summary.remaining.slice(0, 40)) {
          console.error(`  ✗ ${issue.id} (${issue.reason})`);
        }
        if (summary.remaining.length > 40) {
          console.error(`  … ${summary.remaining.length - 40} more`);
        }
      }
      console.log('');
      console.log(
        summary.remaining.length === 0
          ? colorize('✅ Concept metadata fix: PASS (all repaired)', '#3fb950')
          : colorize(
              '❌ Concept metadata fix: issues remain (provenance cannot be invented)',
              '#f85149'
            )
      );
    }
    if (summary.remaining.length > 0) process.exit(1);
    return;
  }

  const report = await runConceptMetadataValidation();
  const strictIssues = strict
    ? validateGrandfatheredAddedAt(PORTAL_SEMANTIC_CONCEPTS, await loadBaseline())
    : [];
  const ok = report.ok && strictIssues.length === 0;
  if (asJson) {
    jsonOut(strict ? { ...report, ok, strictIssues } : report);
  } else {
    logTable(
      [
        {
          total: report.total,
          withProvenance: report.withProvenance,
          grandfathered: (await loadBaseline()).grandfatheredIds.length,
          issues: report.issues.length,
          ...(strict ? { strictIssues: strictIssues.length } : {}),
        },
      ],
      strict
        ? ['total', 'withProvenance', 'grandfathered', 'issues', 'strictIssues']
        : ['total', 'withProvenance', 'grandfathered', 'issues']
    );
    if (report.issues.length > 0) {
      console.error(colorize('concept metadata issues:', '#f85149'));
      for (const issue of report.issues.slice(0, 40)) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
      if (report.issues.length > 40) {
        console.error(`  … ${report.issues.length - 40} more`);
      }
    }
    if (strictIssues.length > 0) {
      console.error(colorize('strict: grandfathered concepts missing addedAt:', '#f85149'));
      for (const issue of strictIssues.slice(0, 40)) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
      if (strictIssues.length > 40) {
        console.error(`  … ${strictIssues.length - 40} more`);
      }
    }
    console.log('');
    console.log(
      ok
        ? colorize('✅ Concept metadata: PASS', '#3fb950')
        : colorize('❌ Concept metadata: FAIL', '#f85149')
    );
  }
  if (!ok) process.exit(1);
}

if (import.meta.main) {
  await main();
}
