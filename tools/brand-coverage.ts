#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Read-only brand coverage report.
 *
 * Reports consumer references, constructor calls, wire parses, and guard usage
 * for every catalog value. The scanner deliberately excludes the forge,
 * generated manifest, and tests so definitions do not count as adoption.
 *
 * Usage:
 *   bun tools/brand-coverage.ts
 *   bun tools/brand-coverage.ts --attention
 *   bun tools/brand-coverage.ts --json
 *   bun tools/brand-coverage.ts --strict
 */

import { BRAND_CATALOG, type CatalogBrandName } from '../lib/types/branded/index.ts';

export type BrandCoverageFile = {
  path: string;
  text: string;
};

export type BrandCoverageStatus = 'covered' | 'referenced-unconstructed' | 'unused';

export type BrandCoverageRow = {
  name: CatalogBrandName;
  domain: string;
  files: string[];
  references: number;
  asCalls: number;
  tryCalls: number;
  parseCalls: number;
  guardCalls: number;
  constructionCalls: number;
  status: BrandCoverageStatus;
};

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analyzeBrandCoverage(files: readonly BrandCoverageFile[]): BrandCoverageRow[] {
  return BRAND_CATALOG.map(spec => {
    const name = escaped(spec.name);
    const referencePattern = new RegExp(`\\b${name}\\b`, 'g');
    const asPattern = new RegExp(`\\bas${name}\\s*\\(`, 'g');
    const tryPattern = new RegExp(`\\btry${name}\\s*\\(`, 'g');
    const parsePattern = new RegExp(`\\bparse${name}\\s*\\(`, 'g');
    const namedGuardPattern = new RegExp(`\\bis${name}\\s*\\(`, 'g');
    const genericGuardPattern = new RegExp(`\\bisBrandedValue\\s*\\(\\s*['"]${name}['"]\\s*,`, 'g');

    let references = 0;
    let asCalls = 0;
    let tryCalls = 0;
    let parseCalls = 0;
    let guardCalls = 0;
    const touchedFiles: string[] = [];

    for (const file of files) {
      const fileReferences = countMatches(file.text, referencePattern);
      const fileAsCalls = countMatches(file.text, asPattern);
      const fileTryCalls = countMatches(file.text, tryPattern);
      const fileParseCalls = countMatches(file.text, parsePattern);
      const fileGuardCalls =
        countMatches(file.text, namedGuardPattern) + countMatches(file.text, genericGuardPattern);

      references += fileReferences;
      asCalls += fileAsCalls;
      tryCalls += fileTryCalls;
      parseCalls += fileParseCalls;
      guardCalls += fileGuardCalls;
      if (fileReferences + fileAsCalls + fileTryCalls + fileParseCalls + fileGuardCalls > 0) {
        touchedFiles.push(file.path);
      }
    }

    const constructionCalls = asCalls + tryCalls + parseCalls;
    const status: BrandCoverageStatus =
      references === 0 && constructionCalls === 0 && guardCalls === 0
        ? 'unused'
        : references > 0 && constructionCalls === 0 && guardCalls === 0
          ? 'referenced-unconstructed'
          : 'covered';

    return {
      name: spec.name,
      domain: spec.domain,
      files: touchedFiles,
      references,
      asCalls,
      tryCalls,
      parseCalls,
      guardCalls,
      constructionCalls,
      status,
    };
  });
}

const EXCLUDED = [
  /^lib\/types\/branded(?:\.ts|\/)/,
  /^lib\/types\/brand-manifest\.json$/,
  /^tools\/brand-(?:catalog|coverage|manifest)\.ts$/,
  /^tests\//,
  /(?:^|\/)node_modules\//,
];
const CONSUMER_ROOTS = ['lib', 'scripts', 'tools', 'config', 'functions', 'packages'] as const;

async function loadConsumerFiles(root: string): Promise<BrandCoverageFile[]> {
  const glob = new Bun.Glob('**/*.{ts,tsx}');
  const files: BrandCoverageFile[] = [];
  for (const consumerRoot of CONSUMER_ROOTS) {
    for await (const nestedPath of glob.scan({
      cwd: `${root}/${consumerRoot}`,
      onlyFiles: true,
    })) {
      const path = `${consumerRoot}/${nestedPath}`;
      if (EXCLUDED.some(pattern => pattern.test(path))) continue;
      files.push({ path, text: await Bun.file(`${root}/${path}`).text() });
    }
  }
  return files;
}

function printRows(rows: readonly BrandCoverageRow[], attentionOnly: boolean): void {
  const visible = attentionOnly ? rows.filter(row => row.status !== 'covered') : rows;
  console.info(
    `\nBrand coverage — ${rows.length} values · ` +
      `${rows.filter(row => row.status === 'covered').length} covered · ` +
      `${rows.filter(row => row.status === 'referenced-unconstructed').length} referenced-unconstructed · ` +
      `${rows.filter(row => row.status === 'unused').length} unused\n`
  );
  for (const row of visible) {
    console.info(
      `${row.name.padEnd(24)} ${row.status.padEnd(26)} ` +
        `refs=${String(row.references).padStart(3)} ` +
        `as=${String(row.asCalls).padStart(3)} ` +
        `try=${String(row.tryCalls).padStart(3)} ` +
        `parse=${String(row.parseCalls).padStart(3)} ` +
        `guard=${String(row.guardCalls).padStart(3)}`
    );
  }
  console.info('');
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
  const rows = analyzeBrandCoverage(await loadConsumerFiles(root));
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ version: 1, rows }, null, 2)}\n`);
  } else {
    printRows(rows, args.includes('--attention'));
  }
  if (args.includes('--strict') && rows.some(row => row.status === 'referenced-unconstructed')) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
