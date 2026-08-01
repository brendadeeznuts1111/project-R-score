#!/usr/bin/env bun
/**
 * Verify glossary board routes and hash patterns against live registry.
 *   bun run glossary:verify
 *   bun run glossary:verify --json
 */

import { joinPath } from '../lib/path-bun.ts';

type Status = 'LIVE' | 'STALE' | 'WARN';

const statusColorMap: Record<Status, string> = {
  LIVE: 'hsl(120, 80%, 45%)',
  STALE: 'hsl(0, 80%, 50%)',
  WARN: 'hsl(45, 100%, 50%)',
};

function coloredStatus(status: Status): string {
  const hsl = statusColorMap[status];
  const ansi = Bun.color(hsl, 'ansi');
  if (typeof ansi === 'string') return `${ansi}${status}\x1b[0m`;
  return status;
}

const glossaryPattern = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)',
  hash: 'glossary:([a-zA-Z0-9_.]+)',
});

const sectionPattern = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)',
  hash: 'section:([a-zA-Z0-9_.]+)',
});

async function main() {
  const root = joinPath(import.meta.dir, '..');
  const glossary = await Bun.file(joinPath(root, 'public/registry/domain-glossary.json')).json();

  const rows: Array<{ check: string; plane: string; status: string; detail: string }> = [];

  // Verify schema version
  rows.push({
    check: 'glossary schema version',
    plane: 'public',
    status: coloredStatus(glossary.schemaVersion === 3 ? 'LIVE' : 'STALE'),
    detail: `schemaVersion=${glossary.schemaVersion}`,
  });

  // Verify surface hashes are parseable
  let hashOk = 0;
  let hashFail = 0;
  for (const surface of glossary.surfaces ?? []) {
    for (const section of surface.sections ?? []) {
      const testUrl = `https://score.factory-wager.com${surface.path}/#${section.hash}`;
      const ok = glossaryPattern.test(testUrl) || sectionPattern.test(testUrl);
      if (ok) hashOk++;
      else hashFail++;
    }
  }

  rows.push({
    check: 'glossary hash patterns',
    plane: 'public',
    status: coloredStatus(hashFail === 0 ? 'LIVE' : 'WARN'),
    detail: `${hashOk} ok, ${hashFail} unparseable`,
  });

  // Render verdict
  let md = '| Check | Plane | Status | Detail |\n| :--- | :--- | :--- | :--- |\n';
  for (const row of rows) md += `| ${row.check} | ${row.plane} | ${row.status} | ${row.detail} |\n`;

  const output = Bun.markdown.ansi(`# Glossary Route Verification\n\n${md}`, {
    colors: true,
    columns: process.stdout.columns || 80,
  });
  console.log(output);

  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify({ hashOk, hashFail, surfaces: glossary.surfaces?.length ?? 0 }, null, 2));
  }

  if (hashFail > 0) process.exit(1);
}

await main();
