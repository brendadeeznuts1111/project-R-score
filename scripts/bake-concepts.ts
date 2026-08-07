#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concepts:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
/**
 * bake-concepts.ts — bake portal concept inventory state →
 * public/registry/concepts-state.json (board at /portal/concepts/).
 *
 *   bun run concepts:bake            # write state JSON
 *   bun run concepts:bake -- --check # fail when the committed state is stale
 *
 * State is derived from `runConceptAudit` (vocabulary + usage + surface coverage).
 * Values only — no secrets.
 */
import {
  parseConceptAuditOptions,
  runConceptAudit,
  type ConceptAuditReport,
} from './concept-audit.ts';

const ROOT = `${import.meta.dir}/..`;
const OUT_PATH = `${ROOT}/public/registry/concepts-state.json`;
const CHECK = argv.includes('--check');

export type ConceptsState = {
  kind: 'concepts-state';
  schemaVersion: 1;
  bakedAt: string;
  gate: 'pass' | 'fail';
  summary: ConceptAuditReport['summary'];
  domainSummary: ConceptAuditReport['domainSummary'];
  boards: ConceptAuditReport['boards'];
  concepts: Array<{
    id: string; // brand-ok — portal concept key
    label: string;
    domain: string; // brand-ok — business ConceptDomain
    namespace: string; // brand-ok — vocabulary namespace
    group: string;
    category: string;
    status: string;
    provenance: string; // brand-ok — correlationId or empty
    usage: number;
    kind: 'used' | 'unused' | 'surface-only';
  }>;
  unused: string[];
  surfaceOnly: string[];
  metadataIssues: ConceptAuditReport['metadataIssues'];
  failures: string[];
  links: {
    vocabulary: string;
    audit: string;
    inventory: string;
    glossary: string;
  };
};

export async function bakeConceptsState(): Promise<ConceptsState> {
  const report = await runConceptAudit(
    parseConceptAuditOptions([
      'bun',
      'scripts/concept-audit.ts',
      '--output',
      'json',
      '--quiet',
      '--show-deprecated',
    ])
  );

  return {
    kind: 'concepts-state',
    schemaVersion: 1,
    bakedAt: report.generatedAt,
    gate: report.ok ? 'pass' : 'fail',
    summary: report.summary,
    domainSummary: report.domainSummary,
    boards: report.boards,
    concepts: report.details.map(d => ({
      id: d.id,
      label: d.label,
      domain: d.domain,
      namespace: d.namespace,
      group: d.group,
      category: d.category,
      status: d.status,
      provenance: d.provenance,
      usage: d.usage,
      kind: d.kind,
    })),
    unused: report.unused,
    surfaceOnly: report.surfaceOnly,
    metadataIssues: report.metadataIssues,
    failures: report.failures,
    links: {
      vocabulary: 'lib/portal/semantic-vocabulary.ts',
      audit: 'scripts/concept-audit.ts',
      inventory: 'tools/concept-inventory.ts',
      glossary: 'public/registry/domain-glossary.json',
    },
  };
}

function comparableState(state: ConceptsState): Omit<ConceptsState, 'bakedAt'> {
  const { bakedAt: _bakedAt, ...comparable } = state;
  return comparable;
}

export function conceptsStateMatches(current: ConceptsState, candidate: ConceptsState): boolean {
  return Bun.deepEquals(comparableState(current), comparableState(candidate), true);
}

export async function persistConceptsState(
  state: ConceptsState,
  options: { check?: boolean; outPath?: string } = {}
): Promise<'current' | 'written'> {
  const outPath = options.outPath ?? OUT_PATH;
  if (options.check) {
    let current: ConceptsState;
    try {
      current = (await Bun.file(outPath).json()) as ConceptsState;
    } catch {
      throw new Error(`concepts state is missing or unreadable: ${outPath}`);
    }
    if (!conceptsStateMatches(current, state)) {
      throw new Error('concepts-state.json is stale; run bun run concepts:bake');
    }
    return 'current';
  }

  await Bun.write(outPath, `${JSON.stringify(state, null, 2)}\n`);
  return 'written';
}

async function main(): Promise<void> {
  const state = await bakeConceptsState();
  if (CHECK && state.gate !== 'pass') {
    console.error(`❌ concepts bake gate failed: ${state.failures.join(' · ') || 'report not ok'}`);
    Bun.exit(1);
  }
  try {
    const result = await persistConceptsState(state, { check: CHECK });
    console.info(
      `concepts-state.json ${result}: ${state.summary.totalPortal} concepts · domains=${state.domainSummary.length} · gate ${state.gate}`
    );
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    Bun.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
