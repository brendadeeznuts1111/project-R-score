#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bun-types-changelog.ts — Phase 5: human-readable changelog from inventory JSON.
 *
 * Diff two deep-inventory snapshots (setting → kind/form/deprecated/overloads):
 *
 *   ## Added / ## Removed / ## Changed
 *
 * Sources:
 *   --from PATH --to PATH     explicit JSON files
 *   --tip                     pin inventory vs live tip types (fetch or prefer-local)
 *   --git REF                 from=git show REF:tools/bun-types-inventory.json · to=working file
 *
 * Usage:
 *   bun tools/bun-types-changelog.ts --from a.json --to b.json
 *   bun tools/bun-types-changelog.ts --tip --prefer-local
 *   bun tools/bun-types-changelog.ts --git HEAD~1
 *   bun tools/bun-types-changelog.ts --tip --json
 *   bun tools/bun-types-changelog.ts --tip --write
 *
 * Scripts:
 *   bun run bun:types-changelog
 *   bun run bun:types-changelog:tip
 */
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  INVENTORY_DTS_FILES,
  parseDtsFile,
  type InventoryMember,
  type InventoryResult,
  type MemberKind,
  type ParseDtsOpts,
} from './bun-types-inventory.ts';
import { fetchUpstreamBunTypes } from './bun-types-tip-fetch.ts';

const TOOLS_DIR = resolvePath(import.meta.dir);
const REPO_ROOT = resolvePath(TOOLS_DIR, '..');
const DEFAULT_INVENTORY = joinPath(TOOLS_DIR, 'bun-types-inventory.json');
const OUT_DIR = joinPath(REPO_ROOT, '.cache', 'bun-types-changelog');
const OUT_MD = joinPath(OUT_DIR, 'CHANGELOG.md');
const OUT_JSON = joinPath(OUT_DIR, 'changelog.json');

export type MemberSnap = {
  setting: string;
  kind: MemberKind;
  module: string;
  depth: number;
  form: string;
  deprecated: boolean;
  overloads: number;
  notes: string;
};

export type MemberChange = {
  setting: string;
  from: MemberSnap;
  to: MemberSnap;
  fields: string[];
};

export type ChangelogResult = {
  schema: 'factorywager/bun-types-changelog/v1';
  generated: string;
  fromLabel: string;
  toLabel: string;
  summary: {
    fromCount: number;
    toCount: number;
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  added: MemberSnap[];
  removed: MemberSnap[];
  changed: MemberChange[];
};

function toSnap(m: InventoryMember | MemberSnap): MemberSnap {
  return {
    setting: m.setting,
    kind: m.kind,
    module: m.module,
    depth: m.depth,
    form: m.form,
    deprecated: m.deprecated,
    overloads: m.overloads,
    notes: m.notes,
  };
}

function keyOf(m: { setting: string; kind: string }): string {
  return `${m.setting}|${m.kind}`;
}

/** Compare two member lists → changelog. */
export function diffInventories(
  fromMembers: Array<InventoryMember | MemberSnap>,
  toMembers: Array<InventoryMember | MemberSnap>,
  labels: { from: string; to: string }
): ChangelogResult {
  const fromMap = new Map<string, MemberSnap>();
  const toMap = new Map<string, MemberSnap>();
  for (const m of fromMembers) fromMap.set(keyOf(m), toSnap(m));
  for (const m of toMembers) toMap.set(keyOf(m), toSnap(m));

  const added: MemberSnap[] = [];
  const removed: MemberSnap[] = [];
  const changed: MemberChange[] = [];
  let unchanged = 0;

  for (const [k, to] of toMap) {
    const from = fromMap.get(k);
    if (!from) {
      added.push(to);
      continue;
    }
    const fields: string[] = [];
    if (from.form !== to.form) fields.push('form');
    if (from.deprecated !== to.deprecated) fields.push('deprecated');
    if (from.overloads !== to.overloads) fields.push('overloads');
    if (from.module !== to.module) fields.push('module');
    if (from.depth !== to.depth) fields.push('depth');
    if (from.notes !== to.notes) fields.push('notes');
    if (fields.length) changed.push({ setting: to.setting, from, to, fields });
    else unchanged++;
  }
  for (const [k, from] of fromMap) {
    if (!toMap.has(k)) removed.push(from);
  }

  added.sort((a, b) => a.setting.localeCompare(b.setting));
  removed.sort((a, b) => a.setting.localeCompare(b.setting));
  changed.sort((a, b) => a.setting.localeCompare(b.setting));

  return {
    schema: 'factorywager/bun-types-changelog/v1',
    generated: new Date().toISOString(),
    fromLabel: labels.from,
    toLabel: labels.to,
    summary: {
      fromCount: fromMap.size,
      toCount: toMap.size,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged,
    },
    added,
    removed,
    changed,
  };
}

export function renderChangelogMd(cl: ChangelogResult): string {
  const lines: string[] = [
    '# bun-types inventory changelog',
    '',
    `| | |`,
    `| --- | --- |`,
    `| Generated | ${cl.generated} |`,
    `| From | ${cl.fromLabel} (${cl.summary.fromCount}) |`,
    `| To | ${cl.toLabel} (${cl.summary.toCount}) |`,
    `| Added | **${cl.summary.added}** |`,
    `| Removed | **${cl.summary.removed}** |`,
    `| Changed | **${cl.summary.changed}** |`,
    `| Unchanged | ${cl.summary.unchanged} |`,
    '',
  ];

  lines.push(`## Added (${cl.summary.added})`);
  lines.push('');
  if (!cl.added.length) lines.push('_None._', '');
  else {
    for (const m of cl.added.slice(0, 200)) {
      lines.push(`- \`${m.setting}\` (${m.kind}${m.deprecated ? ', deprecated' : ''})`);
    }
    if (cl.added.length > 200) lines.push(`- … +${cl.added.length - 200} more`);
    lines.push('');
  }

  lines.push(`## Removed (${cl.summary.removed})`);
  lines.push('');
  if (!cl.removed.length) lines.push('_None._', '');
  else {
    for (const m of cl.removed.slice(0, 200)) {
      lines.push(`- \`${m.setting}\` (${m.kind})`);
    }
    if (cl.removed.length > 200) lines.push(`- … +${cl.removed.length - 200} more`);
    lines.push('');
  }

  lines.push(`## Changed (${cl.summary.changed})`);
  lines.push('');
  if (!cl.changed.length) lines.push('_None._', '');
  else {
    for (const c of cl.changed.slice(0, 150)) {
      lines.push(`- \`${c.setting}\` — ${c.fields.join(', ')}`);
      if (c.fields.includes('form')) {
        lines.push(`  - form: \`${c.from.form.slice(0, 80)}\` → \`${c.to.form.slice(0, 80)}\``);
      }
      if (c.fields.includes('deprecated')) {
        lines.push(`  - deprecated: ${c.from.deprecated} → ${c.to.deprecated}`);
      }
    }
    if (cl.changed.length > 150) lines.push(`- … +${cl.changed.length - 150} more`);
    lines.push('');
  }

  lines.push('```bash');
  lines.push('bun run bun:types-changelog --from a.json --to b.json');
  lines.push('bun run bun:types-changelog:tip');
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function loadInventoryFile(path: string): Promise<InventoryResult> {
  if (!(await Bun.file(path).exists())) {
    throw new Error(`inventory not found: ${path}`);
  }
  return (await Bun.file(path).json()) as InventoryResult;
}

async function inventoryFromTypesRoot(
  typesRoot: string,
  label: string
): Promise<{ members: MemberSnap[]; label: string }> {
  const parseOpts: ParseDtsOpts = {
    shallow: false,
    interfaces: true,
    properties: true,
    typeAliases: true,
  };
  const raw: MemberSnap[] = [];
  const seen = new Set<string>();
  for (const f of INVENTORY_DTS_FILES) {
    const p = joinPath(typesRoot, f);
    if (!(await Bun.file(p).exists())) continue;
    const text = await Bun.file(p).text();
    for (const m of parseDtsFile(text, f, {
      ...parseOpts,
      deprecatedFile: f === 'deprecated.d.ts',
    })) {
      const k = keyOf(m);
      if (seen.has(k)) continue;
      seen.add(k);
      raw.push(toSnap(m));
    }
  }
  return { members: raw, label };
}

async function loadFromGit(ref: string, path: string): Promise<InventoryResult> {
  const proc = Bun.spawn(['git', 'show', `${ref}:${path}`], {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`git show ${ref}:${path} failed: ${err.trim()}`);
  return JSON.parse(text) as InventoryResult;
}

async function resolveTipRoot(
  preferLocal: boolean,
  noFetch: boolean
): Promise<{
  root: string;
  revision: string | null;
}> {
  const env = Bun.env.BUN_TYPES_TIP?.trim();
  if (env && (await Bun.file(joinPath(env, 'bun.d.ts')).exists())) {
    return { root: env, revision: null };
  }
  const home = Bun.env.HOME ?? '';
  const local = home ? joinPath(home, 'bun', 'packages', 'bun-types') : '';
  if ((preferLocal || noFetch) && local && (await Bun.file(joinPath(local, 'bun.d.ts')).exists())) {
    let revision: string | null = null;
    try {
      const p = Bun.spawn(['git', '-C', joinPath(home, 'bun'), 'rev-parse', '--short', 'HEAD'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      revision = (await new Response(p.stdout).text()).trim() || null;
      await p.exited;
    } catch {
      /* ignore */
    }
    return { root: local, revision };
  }
  if (noFetch) {
    throw new Error('No tip types; unset --no-fetch or set BUN_TYPES_TIP / clone ~/bun');
  }
  const fetched = await fetchUpstreamBunTypes();
  return { root: fetched.root, revision: fetched.revision };
}

function parseCli(argv: string[]) {
  let fromPath: string | null = null;
  let toPath: string | null = null;
  let gitRef: string | null = null;
  for (const a of argv) {
    if (a.startsWith('--from=')) fromPath = a.slice('--from='.length);
    if (a.startsWith('--to=')) toPath = a.slice('--to='.length);
    if (a.startsWith('--git=')) gitRef = a.slice('--git='.length);
    if (a === '--git' && !gitRef) gitRef = 'HEAD~1';
  }
  // positional: --git HEAD without =
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--git' && argv[i + 1] && !argv[i + 1]!.startsWith('-')) {
      gitRef = argv[i + 1]!;
    }
  }
  return {
    fromPath,
    toPath,
    gitRef,
    tip: argv.includes('--tip'),
    preferLocal: argv.includes('--prefer-local'),
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    write: !argv.includes('--no-write'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function main(): Promise<void> {
  const args = parseCli(applyUnknownLongOptionGuardFor('bun:types-changelog', Bun.argv.slice(2)));
  if (args.help) {
    console.log(`bun-types-changelog — diff two inventory snapshots (Phase 5)

  --from=PATH --to=PATH   Compare two inventory JSON files
  --tip                   Pin inventory vs tip types (deep parse)
  --prefer-local          With --tip: use ~/bun if present
  --no-fetch              With --tip: never network-clone
  --git [REF]             from=git REF:tools/bun-types-inventory.json · to=working
  --json
  --no-write
  -h, --help
`);
    return;
  }

  let fromMembers: MemberSnap[] = [];
  let toMembers: MemberSnap[] = [];
  let fromLabel = '';
  let toLabel = '';

  if (args.fromPath && args.toPath) {
    const from = await loadInventoryFile(resolvePath(args.fromPath));
    const to = await loadInventoryFile(resolvePath(args.toPath));
    fromMembers = from.members.map(toSnap);
    toMembers = to.members.map(toSnap);
    fromLabel = args.fromPath;
    toLabel = args.toPath;
  } else if (args.gitRef) {
    const from = await loadFromGit(args.gitRef, 'tools/bun-types-inventory.json');
    const to = await loadInventoryFile(DEFAULT_INVENTORY);
    fromMembers = from.members.map(toSnap);
    toMembers = to.members.map(toSnap);
    fromLabel = `git:${args.gitRef}:tools/bun-types-inventory.json`;
    toLabel = DEFAULT_INVENTORY;
  } else if (args.tip) {
    const pin = await loadInventoryFile(DEFAULT_INVENTORY);
    fromMembers = pin.members.map(toSnap);
    fromLabel = `pin@${pin.types.version}`;
    const tip = await resolveTipRoot(args.preferLocal, args.noFetch);
    const inv = await inventoryFromTypesRoot(tip.root, `tip@${tip.revision ?? 'unknown'}`);
    toMembers = inv.members;
    toLabel = inv.label;
  } else {
    console.error('Specify --from/--to, --tip, or --git REF');
    process.exit(2);
  }

  const cl = diffInventories(fromMembers, toMembers, { from: fromLabel, to: toLabel });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(cl, null, 2)}\n`);
  } else {
    console.log(`changelog · ${cl.fromLabel} → ${cl.toLabel}`);
    console.log(
      `+${cl.summary.added} −${cl.summary.removed} ~${cl.summary.changed} (=${cl.summary.unchanged})`
    );
    if (cl.added.length) {
      console.log('\nAdded (sample):');
      for (const m of cl.added.slice(0, 20)) console.log(`  + ${m.setting} (${m.kind})`);
      if (cl.added.length > 20) console.log(`  … +${cl.added.length - 20}`);
    }
    if (cl.removed.length) {
      console.log('\nRemoved (sample):');
      for (const m of cl.removed.slice(0, 20)) console.log(`  - ${m.setting} (${m.kind})`);
      if (cl.removed.length > 20) console.log(`  … +${cl.removed.length - 20}`);
    }
    if (cl.changed.length) {
      console.log('\nChanged (sample):');
      for (const c of cl.changed.slice(0, 15)) {
        console.log(`  ~ ${c.setting} [${c.fields.join(', ')}]`);
      }
      if (cl.changed.length > 15) console.log(`  … +${cl.changed.length - 15}`);
    }
  }

  if (args.write) {
    await Bun.spawn(['mkdir', '-p', OUT_DIR]).exited;
    await Bun.write(OUT_JSON, `${JSON.stringify(cl, null, 2)}\n`);
    await Bun.write(OUT_MD, renderChangelogMd(cl));
    if (!args.json) {
      console.log(`\nwrote ${OUT_MD}`);
      console.log(`wrote ${OUT_JSON}`);
    }
  }
}

if (import.meta.main) {
  await main();
}
