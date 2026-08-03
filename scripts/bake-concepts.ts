#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bake-concepts.ts — bake portal concept inventory state →
 * public/registry/concepts-state.json (board at /portal/concepts/).
 *
 *   bun run concepts:bake            # write state JSON
 *   bun run concepts:bake -- --check # fail when audit report is not ok
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
const CHECK = Bun.argv.includes('--check');

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

async function main(): Promise<void> {
  const state = await bakeConceptsState();
  await Bun.write(OUT_PATH, `${JSON.stringify(state, null, 2)}\n`);
  console.info(
    `concepts-state.json baked: ${state.summary.totalPortal} concepts · domains=${state.domainSummary.length} · gate ${state.gate}`
  );
  if (CHECK && state.gate !== 'pass') {
    console.error(`❌ concepts bake gate failed: ${state.failures.join(' · ') || 'report not ok'}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
