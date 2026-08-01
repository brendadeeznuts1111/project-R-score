#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Verify glossary board routes and hash patterns against the baked glossary.
 *   bun run glossary:verify
 *   bun run glossary:verify --json
 *
 * Offline probe: reads the local bake public/registry/domain-glossary.json
 * and proves every section hash round-trips through the URLPattern dialect
 * used by public/portal/components/glossary-ux.js (#section:{hash}).
 *
 * @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
 * @see https://bun.com/reference/bun/argv — Bun.argv
 */

import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';

type Status = 'LIVE' | 'STALE' | 'WARN';

const statusColorMap: Record<Status, string> = {
  LIVE: 'lime',
  STALE: 'red',
  WARN: 'yellow',
};

function coloredStatus(status: Status): string {
  // Bun.color(..., 'ansi') can return '' on some builds — use ansi-16 + fallback
  // (precedent: tools/portal-probe.ts).
  const ansi = (Bun.color(statusColorMap[status], 'ansi-16') as string) || '';
  return ansi ? `${ansi}${status}\x1b[0m` : status;
}

// Hash-plane patterns — literal colon escaped (`\\:`); a bare `:` starts a named
// parameter and Bun's URLPattern parser throws "Name position … is less than
// name start …". Same dialect as public/portal/components/glossary-ux.js.
const glossaryPattern = new URLPattern({ hash: 'glossary\\::concept' });
const sectionPattern = new URLPattern({ hash: 'section\\::section' });

interface GlossarySection {
  hash?: string;
}

interface GlossarySurface {
  path?: string;
  concept?: string;
  sections?: GlossarySection[];
}

async function main() {
  const dryRun = Bun.argv.includes('--dry-run');
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

  // Verify every baked section hash round-trips through the #section:{hash}
  // deep-link dialect (bake stores the bare hash; the fragment adds the prefix).
  let hashOk = 0;
  let hashFail = 0;
  const failures: string[] = [];
  for (const surface of (glossary.surfaces ?? []) as GlossarySurface[]) {
    for (const section of surface.sections ?? []) {
      if (!section.hash) continue;
      const testUrl = `https://score.factory-wager.com${surface.path}#section:${section.hash}`;
      const match = sectionPattern.exec(testUrl);
      if (match && match.hash.groups.section === section.hash) hashOk++;
      else {
        hashFail++;
        failures.push(`${surface.path}#section:${section.hash}`);
      }
    }
  }

  // Spot-check the glossary concept plane against a known concept id.
  const conceptProbe = glossaryPattern.exec(
    'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net'
  );
  rows.push({
    check: 'glossary concept pattern',
    plane: 'public',
    status: coloredStatus(
      conceptProbe?.hash.groups.concept === 'ops.view.account_net' ? 'LIVE' : 'STALE'
    ),
    detail: '#glossary:ops.view.account_net',
  });

  rows.push({
    check: 'glossary section hash patterns',
    plane: 'public',
    status: coloredStatus(hashFail === 0 ? 'LIVE' : 'WARN'),
    detail:
      `${hashOk} ok, ${hashFail} unparseable` + (failures.length ? ` — first: ${failures[0]}` : ''),
  });

  // Render verdict
  let md = '| Check | Plane | Status | Detail |\n| :--- | :--- | :--- | :--- |\n';
  for (const row of rows) md += `| ${row.check} | ${row.plane} | ${row.status} | ${row.detail} |\n`;

  const title = dryRun
    ? '# Glossary Route Verification (dry-run — exit code forced 0)'
    : '# Glossary Route Verification';
  const output = Bun.markdown.ansi(`${title}\n\n${md}`);
  console.log(output);

  if (Bun.argv.includes('--json')) {
    jsonOut({ hashOk, hashFail, failures, surfaces: glossary.surfaces?.length ?? 0 });
  }

  if (hashFail > 0 && !dryRun) process.exit(1);
}

if (import.meta.main) {
  await main();
}
