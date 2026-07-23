#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * Emit tools/bun-api-index.json — agent pointer over docs SSOT (not a second scrape).
 * Includes derived `coverage` from tools/bun-docs-coverage.ts (formula, not a scrape).
 * @see https://bun.com/docs/llms.txt
 */
import { CANONICAL_REFS } from './bun-doc-refs.ts';
import { computeBunDocsCoverage } from './bun-docs-coverage.ts';
import { installEnvSnapshot } from './bun-install-env.ts';
import { preferObjectFromMatrix } from './bun-prefer-matrix.ts';

const OUT = new URL('./bun-api-index.json', import.meta.url).pathname;

const apis = Object.entries(CANONICAL_REFS)
  .filter(([k]) => k.startsWith('Bun.') || k.startsWith('bun:'))
  .map(([name, docs]) => ({ name, docs }))
  .sort((a, b) => a.name.localeCompare(b.name));

const prefer = preferObjectFromMatrix();
const coverage = await computeBunDocsCoverage({
  apiIndexApis: apis.map(a => a.name),
  preferTopics: Object.keys(prefer),
});
const install = installEnvSnapshot();

const index = {
  schema: 'factorywager/bun-api-index/v1',
  generated: new Date().toISOString(),
  bunVersion: Bun.version,
  ssot: {
    llms: 'https://bun.com/docs/llms.txt',
    docsIndex: 'tools/bun-docs-index.json',
    catalog: 'tools/bun-docs-catalog.json',
    canonicalRefs: 'tools/bun-doc-refs.ts',
    preferMatrix: 'tools/bun-prefer-matrix.ts',
    coverageFormula: 'tools/bun-docs-coverage.ts',
    markdownModes: 'tools/bun-markdown-modes.ts',
    installEnv: 'tools/bun-install-env.ts',
    oneliners: 'tools/bun-api-oneliners.ts',
    lookup: 'bun tools/bun-doc-refs.ts suggest "<api>"',
    coverage: 'bun tools/bun-doc-refs.ts coverage [--json]',
    markdown: 'bun tools/bun-doc-refs.ts markdown [--json]',
    installEnvCmd: 'bun tools/bun-doc-refs.ts install-env [--json] | get <id>',
    onelinersCmd: 'bun tools/bun-doc-refs.ts oneliners [--json] [--id=…] · --run <id> [--live]',
    refresh: 'bun run docs:refresh',
  },
  typesAllowlist: ['bun'],
  coverage,
  install: {
    host: install.host,
    policy: install.policy,
    factory: install.factory,
    noteIds: install.noteIds,
    vars: install.vars.map(v => v.name),
    loci: {
      env: install.loci.env,
      cache: install.loci.cache,
      strategies: install.loci.strategies,
      minimumReleaseAge: install.loci.minimumReleaseAge,
    },
  },
  prefer,
  escapeHatch:
    'When bun-types lags a Bun runtime API (e.g. Bun.write append), a minimal typed Node escape is OK with a comment; prefer Bun when types catch up.',
  apis,
  count: apis.length,
};

await Bun.write(OUT, `${JSON.stringify(index, null, 2)}\n`);
console.info(
  `wrote ${OUT} (${apis.length} Bun.*/bun: APIs · prefer ${Object.keys(prefer).length} · coverage ${coverage.composite.pct}% · install notes ${install.noteIds.length})`
);
