#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Generate a human-readable surface → concept dependency map from the same
 * board configs and scan used by `validate:surface-coverage`.
 *
 *   bun run surface-coverage:map
 *   bun run surface-coverage:map -- --check   # fail if docs/SURFACE_COVERAGE.md is stale
 *   bun run surface-coverage:map -- --stdout  # print only
 */
import { API_INFRA_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  getSurfaceBoardConfigs,
  scanSurfaceCoverage,
} from '../scripts/validate-surface-coverage.ts';

const ROOT = `${import.meta.dir}/..`;
const OUT = `${ROOT}/docs/SURFACE_COVERAGE.md`;

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

export async function buildSurfaceCoverageMarkdown(): Promise<string> {
  const configs = getSurfaceBoardConfigs();
  const scan = await scanSurfaceCoverage();
  const generatedAt = new Date().toISOString();

  const lines: string[] = [
    '# Portal surface coverage map',
    '',
    'Human-readable view of **board surface inventories** and **HTML/JS usage**',
    'from the same SSOT as `bun run validate:surface-coverage`.',
    '',
    `| Generated | \`${generatedAt}\` |`,
    '| --- | --- |',
    '| Boards | partner-history · partners · limits · account |',
    '| Validator | [`scripts/validate-surface-coverage.ts`](../scripts/validate-surface-coverage.ts) |',
    '| Refresh | `bun run surface-coverage:map` |',
    '',
    '## Board summary',
    '',
    '| Board | Files scanned | Usages | Surface allowlist | Dead allowlist (unused chrome) |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const board of scan.boards) {
    lines.push(
      `| ${board.board} | ${board.files} | ${board.usages} | ${board.allowlist} | ${board.deadAllowlist.length} |`
    );
  }

  lines.push(
    '',
    '## Surface inventory (declared dependencies)',
    '',
    'Each board declares concept ids via surface maps in',
    '`lib/portal/semantic-vocabulary.ts`. These are **allowlisted** chrome',
    'ids; HTML may bind a subset (partner-history collapses many metrics onto',
    'shared `ui.filter.*` / `ops.limits.*` owners).',
    ''
  );

  for (const cfg of configs) {
    const entries = Object.entries(cfg.surface).sort((a, b) => a[1].localeCompare(b[1]));
    lines.push(`### \`${cfg.id}\``, '');
    lines.push('| Surface key | Concept id |', '| --- | --- |');
    for (const [key, id] of entries) {
      lines.push(`| \`${mdEscape(key)}\` | \`${mdEscape(id)}\` |`);
    }
    lines.push('');
  }

  lines.push(
    '## Infrastructure API inventory (`API_INFRA_CONCEPTS`)',
    '',
    'Shared HTTP / feed surfaces — not desk field chrome. Referenced via',
    '`seeAlso` from domain concepts; included in surface-coverage shared ids.',
    '',
    '| Alias | Concept id |',
    '| --- | --- |'
  );
  for (const [key, id] of Object.entries(API_INFRA_CONCEPTS).sort((a, b) =>
    a[1].localeCompare(b[1])
  )) {
    lines.push(`| \`${key}\` | \`${id}\` |`);
  }

  lines.push(
    '',
    '## Usage (top concepts per board)',
    '',
    'Counted from `data-glossary-concept` attributes and `#glossary:` hrefs',
    '(plus glossary-map template refs).',
    ''
  );

  for (const board of scan.boards) {
    lines.push(`### \`${board.board}\``, '');
    if (board.usageRows.length === 0) {
      lines.push('_No glossary bindings found in scanned files._', '');
      continue;
    }
    lines.push('| Concept | Count | Sample files |', '| --- | ---: | --- |');
    for (const row of board.usageRows.slice(0, 40)) {
      const files = row.files
        .slice(0, 3)
        .map(f => `\`${f}\``)
        .join(', ');
      const more = row.files.length > 3 ? ` (+${row.files.length - 3})` : '';
      lines.push(`| \`${mdEscape(row.concept)}\` | ${row.count} | ${files}${more} |`);
    }
    if (board.usageRows.length > 40) {
      lines.push('', `_…${board.usageRows.length - 40} more concepts_`);
    }
    lines.push('');
    if (board.deadAllowlist.length > 0) {
      lines.push(
        '**Allowlisted but unused in HTML** (inventory / collapse backlog):',
        '',
        board.deadAllowlist.map(id => `- \`${id}\``).join('\n'),
        ''
      );
    }
  }

  lines.push(
    '## Related gates',
    '',
    '```bash',
    'bun run validate:surface-coverage',
    'bun run validate:surface-coverage -- --report',
    'bun run concept:audit --strict',
    'bun run surface-coverage:map -- --check',
    '```',
    '',
    'See also: [`docs/CONCEPT_LIFECYCLE.md`](CONCEPT_LIFECYCLE.md) ·',
    '[`docs/DEVELOPMENT-WORKFLOW.md`](DEVELOPMENT-WORKFLOW.md).',
    ''
  );

  return lines.join('\n');
}

/** Stable body for --check (ignore Generated timestamp line). */
export function normalizeMapForCheck(md: string): string {
  return md
    .split('\n')
    .filter(line => !line.startsWith('| Generated |'))
    .join('\n');
}

async function main(): Promise<void> {
  const check = Bun.argv.includes('--check');
  const stdoutOnly = Bun.argv.includes('--stdout');
  const md = await buildSurfaceCoverageMarkdown();

  if (stdoutOnly) {
    process.stdout.write(md);
    return;
  }

  if (check) {
    const existing = (await Bun.file(OUT).exists()) ? await Bun.file(OUT).text() : '';
    if (normalizeMapForCheck(existing) !== normalizeMapForCheck(md)) {
      console.error(`❌ ${OUT} is stale — run: bun run surface-coverage:map`);
      process.exit(1);
    }
    console.log(`✅ ${OUT} is current`);
    return;
  }

  await Bun.write(OUT, md);
  console.log(`✅ wrote ${OUT}`);
}

if (import.meta.main) {
  await main();
}
