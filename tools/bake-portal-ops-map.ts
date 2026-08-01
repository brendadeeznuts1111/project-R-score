#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Bake a scannable operator guide from portal-weave.json (no invented cmds).
 *
 *   bun tools/bake-portal-ops-map.ts
 *   → docs/portal-ops-board-map.md
 *
 * @see lib/http/portal-weave.ts
 * @see public/registry/portal-weave.json
 */
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const WEAVE_PATH = joinPath(ROOT, 'public/registry/portal-weave.json');
const OUT_PATH = joinPath(ROOT, 'docs/portal-ops-board-map.md');

const GROUP_ORDER = ['registry', 'ops', 'harness', 'secrets', 'plane', 'wiki', 'other'] as const;
const GROUP_LABEL: Record<string, string> = {
  registry: 'Registry / R2',
  ops: 'Ops',
  harness: 'Harness',
  secrets: 'Secrets / vault',
  plane: 'Plane',
  wiki: 'Wiki',
  other: 'Other',
};

type WeaveScript = {
  id?: string; // brand-ok — weave script slot key
  label: string;
  cmd: string;
  doc?: string;
  group?: string;
};
type WeaveSurface = {
  id?: string; // brand-ok — weave surface slot key
  label: string;
  href: string;
  cli?: string;
  note?: string;
};
type WeaveWiki = { label: string; href: string; note?: string };
type Weave = {
  schemaVersion: number;
  kind: string;
  path: string;
  generated: string;
  summary: {
    scripts: number;
    surfaces: number;
    artifacts: number;
    components: number;
    wiki: number;
  };
  related?: Record<string, string>;
  scripts: WeaveScript[];
  surfaces: WeaveSurface[];
  wiki: WeaveWiki[];
};

function flagsOf(cmd: string): string {
  const flags = cmd.split(/\s+/).filter(p => p.startsWith('-'));
  return flags.length ? flags.join(' ') : '—';
}

function docHref(doc?: string): string {
  if (!doc) return '—';
  if (/^https?:\/\//i.test(doc)) return doc;
  return doc.startsWith('/') ? doc : `/${doc}`;
}

function planeOf(href: string): string {
  if (href.startsWith('/registry/') || href.startsWith('/monitoring'))
    return 'Public artifact / edge';
  if (href === '/') return 'Public lander';
  return 'Portal board';
}

const weave = (await Bun.file(WEAVE_PATH).json()) as Weave;

const buckets = new Map<string, WeaveScript[]>();
for (const s of weave.scripts) {
  const g = s.group && (GROUP_ORDER as readonly string[]).includes(s.group) ? s.group : 'other';
  if (!buckets.has(g)) buckets.set(g, []);
  buckets.get(g)!.push(s);
}
const ordered = GROUP_ORDER.filter(g => buckets.has(g));

const lines: string[] = [];
lines.push('# Ops board map (canonical)');
lines.push('');
lines.push('Living operator guide for **Portal weave v2** on `/portal/ops/`.');
lines.push('');
lines.push(
  'Generated from the machine SSOT — **do not invent commands** here; rebake after weave changes.'
);
lines.push('');
lines.push('| | |');
lines.push('|--|--|');
lines.push(
  '| **Machine SSOT** | [`/registry/portal-weave.json`](../public/registry/portal-weave.json) |'
);
lines.push('| **Code SSOT** | [`lib/http/portal-weave.ts`](../lib/http/portal-weave.ts) |');
lines.push(
  '| **Board** | [`/portal/ops/`](../public/portal/ops/) → Portal weave → Operator scripts |'
);
lines.push(`| **Schema** | v${weave.schemaVersion} · kind \`${weave.kind}\` |`);
lines.push(`| **Baked (weave)** | \`${weave.generated}\` (UTC) |`);
lines.push(
  `| **Counts** | **${weave.summary.scripts}** commands · **${ordered.length}** groups · ${weave.summary.surfaces} surfaces · ${weave.summary.artifacts} artifacts |`
);
lines.push('');
lines.push('```bash');
lines.push('# refresh weave then this guide');
lines.push('bun run ops:snapshot');
lines.push('bun tools/bake-portal-ops-map.ts');
lines.push('```');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 1. Meta (the grey line)');
lines.push('');
lines.push('The ops board meta line is a **summary**, not a shell command:');
lines.push('');
lines.push(
  `> **${weave.summary.scripts} commands** · **${ordered.length} groups** (${ordered.map(g => GROUP_LABEL[g] || g).join(' · ')}) · **schema v${weave.schemaVersion}**  `
);
lines.push(
  `> Source: [\`/registry/portal-weave.json\`](/registry/portal-weave.json) · Baked: \`${weave.generated}\` · Guide: [\`docs/portal-ops-board-map.md\`](portal-ops-board-map.md)`
);
lines.push('');
lines.push('### Related chips');
lines.push('');
lines.push('| Key | href |');
lines.push('|-----|------|');
for (const [k, v] of Object.entries(weave.related || {})) {
  lines.push(`| \`${k}\` | [\`${v}\`](${v}) |`);
}
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 2. Operator scripts');
lines.push('');
lines.push('Each row is one grounded monorepo command.');
lines.push('');
lines.push('| Column | Meaning |');
lines.push('|--------|---------|');
lines.push('| **Short id** | Stable weave `id` (tooltips / audits) |');
lines.push('| **Label** | Name on the board |');
lines.push('| **Command** | Exact string the **copy** button uses |');
lines.push('| **Flags** | Tokens starting with `-` (else —) |');
lines.push('| **Docs** | Relative repo doc when set |');
lines.push('');

let letter = 0;
for (const g of ordered) {
  const rows = buckets.get(g)!;
  const title = GROUP_LABEL[g] || g;
  lines.push(`### Group ${String.fromCharCode(65 + letter)}: ${title} (${rows.length})`);
  letter += 1;
  lines.push('');
  lines.push('| Short id | Label | Command | Flags | Docs |');
  lines.push('|----------|-------|---------|-------|------|');
  for (const s of rows) {
    const id = s.id || '—';
    const doc = s.doc ? docHref(s.doc) : '—';
    const docCell = doc === '—' ? '—' : `[\`${doc}\`](..${doc})`;
    lines.push(`| \`${id}\` | ${s.label} | \`${s.cmd}\` | ${flagsOf(s.cmd)} | ${docCell} |`);
  }
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('## 3. Surfaces (nav boards — not scripts)');
lines.push('');
lines.push('| Short id | Surface URL | CLI short code | Plane |');
lines.push('|----------|-------------|----------------|-------|');
for (const s of weave.surfaces) {
  const cli = s.cli ? `\`${s.cli}\`` : '— (no CLI shortcut)';
  const id = s.id || '—';
  lines.push(`| \`${id}\` | [\`${s.href}\`](${s.href}) | ${cli} | ${planeOf(s.href)} |`);
}
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 4. Wiki chips (GitHub Pages)');
lines.push('');
lines.push('| Label | href | Purpose |');
lines.push('|-------|------|---------|');
for (const w of weave.wiki) {
  lines.push(`| ${w.label === 'AGENTS' ? '**AGENTS**' : w.label} | ${w.href} | ${w.note || '—'} |`);
}
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 5. Deploy the board');
lines.push('');
lines.push('```bash');
lines.push('bunx --bun wrangler pages deploy ./public --project-name=project-r-score');
lines.push('```');
lines.push('');
lines.push('Then hard-refresh `/portal/ops/` on the new deployment URL.');
lines.push('');

await Bun.write(OUT_PATH, `${lines.join('\n')}\n`);
console.log(`wrote ${OUT_PATH}`);
console.log(
  `  ${weave.summary.scripts} scripts · ${ordered.length} groups · baked ${weave.generated}`
);
