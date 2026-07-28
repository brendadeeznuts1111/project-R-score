#!/usr/bin/env bun
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Generate decision-table Markdown from docs/packages/docs-index.json.
 *
 * Usage:
 *   bun run packages:docs-index              # write tables into README.md
 *   bun run packages:docs-index --write      # same
 *   bun run packages:docs-index --check      # fail if README out of sync (CI)
 *   bun run packages:docs-index --bump-verified
 *   bun run packages:docs-index --bump-verified=registry-md,pm-filter
 *
 * Grounded map: Bun.file · Bun.write · plain string templates (AGENTS.md capability map).
 */
import { resolvePath } from './lib/fs-bun';

const ROOT = resolvePath();
const INDEX_PATH = resolvePath(ROOT, 'docs/packages/docs-index.json');
const README_PATH = resolvePath(ROOT, 'docs/packages/README.md');
const MARKER_START = '<!-- packages-docs-index:start -->';
const MARKER_END = '<!-- packages-docs-index:end -->';

type DocRow = {
  id: string; // brand-ok — docs-index.json row key (not a domain *Id)
  doc: string;
  href: string;
  role: string;
  type: string;
  status: string;
  audience: string[];
  lastVerified: string;
  format: string;
  groundedCapabilities: string[];
  maintainer: string;
  triggers: string[];
  relatedCommands: string[];
};

type DocsIndex = {
  lastUpdated?: string;
  docs: DocRow[];
  legends?: {
    type?: Record<string, string>;
    status?: Record<string, string>;
  };
};

const WRITE = Bun.argv.includes('--write') || !Bun.argv.includes('--check');
const CHECK = Bun.argv.includes('--check');
const bumpArg = Bun.argv.find(a => a === '--bump-verified' || a.startsWith('--bump-verified='));

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function escCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function joinOrDash(xs: string[]): string {
  if (!xs || xs.length === 0) return '—';
  return xs.map(x => (x.startsWith('`') ? x : `\`${x}\``)).join(' · ');
}

function joinPlain(xs: string[]): string {
  if (!xs || xs.length === 0) return '—';
  return xs.join(' · ');
}

function docLink(row: DocRow): string {
  return `[${escCell(row.doc)}](${row.href})`;
}

function buildIdentityTable(docs: DocRow[]): string {
  const header =
    '| Doc | Role | Type | Status | Audience | Last verified | Format |\n' +
    '|-----|------|------|--------|----------|---------------|--------|';
  const rows = docs.map(d => {
    const audience = d.audience.join(' · ');
    return `| ${docLink(d)} | ${escCell(d.role)} | ${d.type} | ${d.status} | ${escCell(audience)} | ${d.lastVerified} | ${escCell(d.format)} |`;
  });
  return [header, ...rows].join('\n');
}

function buildOwnershipTable(docs: DocRow[]): string {
  const header =
    '| Doc | Grounded capabilities | Maintainer | Triggers | Related commands |\n' +
    '|-----|----------------------|------------|----------|------------------|';
  const rows = docs.map(d => {
    const caps = d.groundedCapabilities.map(c => (c.startsWith('`') ? c : `\`${c}\``)).join(' · ');
    const triggers = joinPlain(d.triggers);
    const cmds = d.relatedCommands.map(c => (c.startsWith('`') ? c : `\`${c}\``)).join(' · ');
    // Short display name for long doc titles in second table
    const short =
      d.id === 'monorepo-filter-section'
        ? `[§ bun --filter](${d.href})`
        : d.id === 'unified-catalogs'
          ? `[UNIFIED catalogs](${d.href})`
          : d.id === 'unified-scripts-filter'
            ? `[UNIFIED Scripts vs --filter](${d.href})`
            : docLink(d);
    return `| ${short} | ${caps} | ${escCell(d.maintainer)} | ${escCell(triggers)} | ${cmds} |`;
  });
  return [header, ...rows].join('\n');
}

function buildGeneratedBlock(index: DocsIndex): string {
  const last = index.lastUpdated ?? todayISO();
  return [
    '## Documentation index (decision table)',
    '',
    '**Purpose:** route readers to the right doc, show trustworthiness, and link each row to the [Grounded capability map](../../AGENTS.md#grounded-capability-map).  ',
    '**Machine SSOT:** [`docs-index.json`](./docs-index.json) (edit JSON → `bun run packages:docs-index`).  ',
    `**Last catalog pass:** \`${last}\`.`,
    '',
    '### Identity & trust',
    '',
    buildIdentityTable(index.docs),
    '',
    '### Ownership, capabilities & actions',
    '',
    buildOwnershipTable(index.docs),
    '',
    '**Type legend:** `canonical` = bun.com · `policy` = FactoryWager install SSOT · `internal` = harness runbook · `generated` = machine-written artifact.',
    '',
    '**Status legend:** `active` = maintained and trustworthy · `stale` = re-verify before relying · `planned` = incomplete · `archived` = historical only.',
    '',
    '**How to use this table**',
    '',
    '| Question | Column |',
    '|----------|--------|',
    '| Can I trust it today? | **Status** + **Last verified** |',
    '| Is this for me? | **Audience** |',
    '| Which APIs does it depend on? | **Grounded capabilities** → [capability map](../../AGENTS.md#grounded-capability-map) |',
    '| Who owns fixes? | **Maintainer** |',
    '| When must I refresh it? | **Triggers** |',
    '| What do I type in the terminal? | **Related commands** |',
    '',
    '```bash',
    'bun run packages:docs-index          # regenerate tables from docs-index.json',
    'bun run packages:docs-index:check    # CI: fail if README out of sync',
    'bun run packages:docs-index --bump-verified   # set lastVerified=today for all rows',
    '```',
  ].join('\n');
}

function applyBumpVerified(index: DocsIndex, bump: string | true): DocsIndex {
  const date = todayISO();
  index.lastUpdated = date;
  if (bump === true) {
    for (const d of index.docs) d.lastVerified = date;
    return index;
  }
  const ids = new Set(
    String(bump)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
  for (const d of index.docs) {
    if (ids.has(d.id) || ids.has(d.doc)) d.lastVerified = date;
  }
  return index;
}

async function main(): Promise<void> {
  const raw = await Bun.file(INDEX_PATH).text();
  let index = JSON.parse(raw) as DocsIndex;
  if (!Array.isArray(index.docs) || index.docs.length === 0) {
    console.error('docs-index.json has no docs[]');
    process.exit(1);
  }

  if (bumpArg) {
    const val =
      bumpArg === '--bump-verified' ? true : bumpArg.slice('--bump-verified='.length) || true;
    index = applyBumpVerified(index, val);
    await Bun.write(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
    console.info(`Updated lastVerified in ${INDEX_PATH}`);
  }

  const generated = buildGeneratedBlock(index);
  const readme = await Bun.file(README_PATH).text();

  let next: string;
  if (readme.includes(MARKER_START) && readme.includes(MARKER_END)) {
    const before = readme.slice(0, readme.indexOf(MARKER_START));
    const after = readme.slice(readme.indexOf(MARKER_END) + MARKER_END.length);
    next = `${before}${MARKER_START}\n${generated}\n${MARKER_END}${after}`;
  } else {
    // First run: insert after intro (before first --- following intro, or after line 4)
    const insertAt = readme.indexOf('\n## Workspace packages');
    if (insertAt === -1) {
      console.error('README missing ## Workspace packages anchor and markers');
      process.exit(1);
    }
    next =
      readme.slice(0, insertAt) +
      `\n${MARKER_START}\n${generated}\n${MARKER_END}\n` +
      readme.slice(insertAt);
    // Drop hand-written decision table if still present above markers
    const handStart = next.indexOf('## Documentation index (decision table)');
    if (handStart !== -1 && handStart < next.indexOf(MARKER_START)) {
      const markerPos = next.indexOf(MARKER_START);
      // remove from handStart to marker (keep intro before handStart)
      const introEnd = next.lastIndexOf('\n', handStart);
      next = next.slice(0, introEnd + 1) + next.slice(markerPos);
    }
  }

  if (CHECK) {
    const current = await Bun.file(README_PATH).text();
    if (current !== next) {
      console.error(
        'docs/packages/README.md is out of sync with docs-index.json.\n' +
          'Run: bun run packages:docs-index\n' +
          'Then commit the result.'
      );
      process.exit(1);
    }
    console.info('✅ packages-docs-index: README in sync with docs-index.json');
    process.exit(0);
  }

  if (WRITE || bumpArg) {
    await Bun.write(README_PATH, next);
    console.info(`Wrote decision tables → ${README_PATH}`);
  }
}

if (import.meta.main) {
  await main();
}
