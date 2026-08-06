#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bun-types-usage.ts — Phase 4: cross-reference deep bun-types inventory with
 * **codebase type/value usage**.
 *
 * Single-pass scan (not O(members × files)):
 *  - `Bun.Name` / `bun:jsc.Name` chains (with **prefix crediting**:
 *    `Bun.Foo.Bar` also credits tracked `Bun.Foo`)
 *  - type positions `: Bun.Name` / `as Bun.Name` / `typeof Bun.Name` /
 *    `satisfies Bun.Name`
 *  - `import { Name } from "bun"` / `from "bun:jsc"`
 *  - optional `--props`: `.leaf` for inventory property leaves
 *  - per-file hit map (capped via `--max-files-per-hit`) — see `hits[].fileHits`
 *  - module rollup (`summary.byModule`) + entirely-unused modules
 *    (`summary.unusedModules`)
 *
 * Usage:
 *   bun tools/bun-types-usage.ts
 *   bun tools/bun-types-usage.ts --unused
 *   bun tools/bun-types-usage.ts --kind=class,interface,type
 *   bun tools/bun-types-usage.ts --props
 *   bun tools/bun-types-usage.ts --strict --max-unused=2000
 *   bun tools/bun-types-usage.ts --json
 *   bun tools/bun-types-usage.ts --csv
 *   bun tools/bun-types-usage.ts --max-files-per-hit=20
 *
 * Scripts: bun:types-usage · bun:types-usage:unused
 */
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import type { InventoryMember, InventoryResult, MemberKind } from './bun-types-inventory.ts';
import {
  printArtifacts,
  printBanner,
  printDone,
  printHistogram,
  printMap,
  printPreviewTable,
  printSection,
  ttyDim,
} from './lib/bun-types-tty.ts';

const TOOLS_DIR = resolvePath(import.meta.dir);
const REPO_ROOT = resolvePath(TOOLS_DIR, '..');
const INVENTORY_JSON = joinPath(TOOLS_DIR, 'bun-types-inventory.json');
const OUT_DIR = joinPath(REPO_ROOT, '.cache', 'bun-types-usage');
const OUT_JSON = joinPath(OUT_DIR, 'report.json');
const OUT_MD = joinPath(OUT_DIR, 'report.md');

const DEFAULT_SCAN = ['lib', 'tools', 'scripts', 'tests', 'config'] as const;
const DEFAULT_KINDS: MemberKind[] = ['class', 'interface', 'type'];
const DEFAULT_MAX_FILES_PER_HIT = 15;

export type FileHit = {
  file: string;
  chain: number;
  typePos: number;
  imp: number;
  prop: number;
  total: number;
};

export type UsageHit = {
  setting: string;
  kind: MemberKind;
  module: string;
  depth: number;
  chainRefs: number;
  typePosRefs: number;
  importRefs: number;
  propRefs: number;
  total: number;
  /** Top-N files referencing this setting (capped by --max-files-per-hit). */
  fileHits: FileHit[];
};

export type ModuleRollup = {
  module: string;
  tracked: number;
  used: number;
  unused: number;
  totalRefs: number;
};

export type UsageReport = {
  schema: 'factorywager/bun-types-usage/v2';
  generated: string;
  inventory: { path: string; totalMembers: number; tracked: number };
  scan: { roots: string[]; files: number };
  summary: {
    tracked: number;
    used: number;
    unused: number;
    topUsed: Array<{ setting: string; total: number }>;
    byModule: ModuleRollup[];
    /** Modules where no tracked member has any reference. */
    unusedModules: string[];
  };
  hits: UsageHit[];
};

/** Split a chain `Bun.Foo.Bar` / `bun:mod.X.Y` into tracked prefixes. */
export function trackedPrefixes(chain: string, tracked: Set<string>): string[] {
  const out: string[] = [];
  // `bun:mod.X.Y` → split on '.' but keep `bun:mod` as the module root unit.
  const parts = chain.split('.');
  // Re-join: first segment may itself contain ':' (bun:sqlite). Rebuild candidates.
  // candidates: bun:sqlite.Database.Statement → [bun:sqlite.Database, bun:sqlite.Database.Statement]
  // Bun.Foo.Bar → [Bun.Foo, Bun.Foo.Bar]
  let acc = parts[0]!;
  for (let i = 1; i < parts.length; i++) {
    acc = `${acc}.${parts[i]}`;
    if (tracked.has(acc)) out.push(acc);
  }
  return out;
}

export function selectTrackedMembers(
  members: InventoryMember[],
  kinds: MemberKind[],
  opts: { topLevelOnly?: boolean } = {}
): InventoryMember[] {
  const set = new Set(kinds);
  return members.filter(m => {
    if (!set.has(m.kind)) return false;
    if (opts.topLevelOnly !== false && m.depth !== 0 && m.kind !== 'property') return false;
    return true;
  });
}

/** @internal — pure helpers for unit tests */
export function attributeFileText(
  text: string,
  tracked: Map<string, InventoryMember>,
  opts: { props: boolean; propLeaves: Map<string, string[]> }
): Map<string, { chain: number; typePos: number; imp: number; prop: number }> {
  const out = new Map<string, { chain: number; typePos: number; imp: number; prop: number }>();
  const trackedSet = new Set(tracked.keys());
  const bump = (setting: string, field: 'chain' | 'typePos' | 'imp' | 'prop', n = 1) => {
    if (!tracked.has(setting) && field !== 'prop') return;
    // prop uses propLeaves map of leaf → settings
    let row = out.get(setting);
    if (!row) {
      row = { chain: 0, typePos: 0, imp: 0, prop: 0 };
      out.set(setting, row);
    }
    row[field] += n;
  };

  // Chains: Bun.Foo.Bar or bun:jsc.Foo — credit every tracked prefix.
  const chainRe =
    /\bBun(?:\.[A-Za-z_][A-Za-z0-9_]*)+|\bbun:[A-Za-z0-9_-]+(?:\.[A-Za-z_][A-Za-z0-9_]*)+/g;
  let m: RegExpExecArray | null;
  while ((m = chainRe.exec(text)) !== null) {
    for (const s of trackedPrefixes(m[0]!, trackedSet)) bump(s, 'chain');
  }

  // Type positions with full Bun.X path: `: X`, `as X`, `typeof X`, `satisfies X`.
  const typePosRe =
    /(?::|\bas\b|\btypeof\b|\bsatisfies\b)\s*((?:Bun(?:\.[A-Za-z_][A-Za-z0-9_]*)+|bun:[A-Za-z0-9_-]+(?:\.[A-Za-z_][A-Za-z0-9_]*)+))/g;
  while ((m = typePosRe.exec(text)) !== null) {
    for (const s of trackedPrefixes(m[1]!, trackedSet)) bump(s, 'typePos');
  }

  // import { A, B as C } from "bun" | "bun:jsc"
  const importRe = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"](bun(?::[A-Za-z0-9_-]+)?)['"]/g;
  while ((m = importRe.exec(text)) !== null) {
    const mod = m[2]!;
    for (const spec of m[1]!.split(',')) {
      const id = spec
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]!
        .trim();
      if (!id) continue;
      const setting = mod === 'bun' ? `Bun.${id}` : `${mod}.${id}`;
      if (tracked.has(setting)) bump(setting, 'imp');
    }
  }

  if (opts.props && opts.propLeaves.size > 0) {
    const propRe = /\.([A-Za-z_][A-Za-z0-9_]*)\b/g;
    while ((m = propRe.exec(text)) !== null) {
      const leaf = m[1]!;
      const settings = opts.propLeaves.get(leaf);
      if (!settings) continue;
      for (const s of settings) bump(s, 'prop');
    }
  }

  return out;
}

export async function scanUsage(opts: {
  inventoryPath?: string;
  repoRoot?: string;
  scanRoots?: string[];
  kinds?: MemberKind[];
  props?: boolean;
  topLevelOnly?: boolean;
}): Promise<UsageReport> {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const invPath = opts.inventoryPath ?? INVENTORY_JSON;
  const inv = (await Bun.file(invPath).json()) as InventoryResult;
  const kinds = opts.kinds?.length ? opts.kinds : DEFAULT_KINDS;
  const props = opts.props === true;

  let trackedList = selectTrackedMembers(inv.members, kinds, {
    topLevelOnly: opts.topLevelOnly,
  });
  if (props) {
    const propsMembers = inv.members.filter(m => m.kind === 'property');
    trackedList = [...trackedList, ...propsMembers];
  }

  const tracked = new Map(trackedList.map(m => [m.setting, m]));
  const propLeaves = new Map<string, string[]>();
  if (props) {
    for (const m of trackedList) {
      if (m.kind !== 'property') continue;
      const arr = propLeaves.get(m.name) ?? [];
      arr.push(m.setting);
      propLeaves.set(m.name, arr);
    }
  }

  const totals = new Map<string, { chain: number; typePos: number; imp: number; prop: number }>();
  // per-setting → per-file counters (for hits[].fileHits)
  const fileMap = new Map<
    string,
    Map<string, { chain: number; typePos: number; imp: number; prop: number }>
  >();
  for (const s of tracked.keys()) {
    totals.set(s, { chain: 0, typePos: 0, imp: 0, prop: 0 });
    fileMap.set(s, new Map());
  }

  const scanRoots = opts.scanRoots ?? [...DEFAULT_SCAN];
  let files = 0;

  for (const root of scanRoots) {
    const base = joinPath(repoRoot, root);
    const glob = new Bun.Glob('**/*.{ts,tsx,js,mjs,cjs}');
    try {
      for await (const rel of glob.scan({ cwd: base, onlyFiles: true, followSymlinks: false })) {
        if (rel.includes('node_modules/') || rel.includes('/.git/')) continue;
        if (rel.includes('bun-types-inventory') || rel.includes('bun-types-usage')) continue;
        let text: string;
        try {
          text = await Bun.file(joinPath(base, rel)).text();
        } catch {
          continue;
        }
        files++;
        if (!props && !/bun/i.test(text)) continue;

        const fileHits = attributeFileText(text, tracked, { props, propLeaves });
        const relPath = `${root}/${rel}`;
        for (const [setting, c] of fileHits) {
          const row = totals.get(setting);
          if (!row) continue;
          row.chain += c.chain;
          row.typePos += c.typePos;
          row.imp += c.imp;
          row.prop += c.prop;
          const fm = fileMap.get(setting)!;
          let fr = fm.get(relPath);
          if (!fr) {
            fr = { chain: 0, typePos: 0, imp: 0, prop: 0 };
            fm.set(relPath, fr);
          }
          fr.chain += c.chain;
          fr.typePos += c.typePos;
          fr.imp += c.imp;
          fr.prop += c.prop;
        }
      }
    } catch {
      continue;
    }
  }

  const maxFilesPerHit = opts.maxFilesPerHit ?? DEFAULT_MAX_FILES_PER_HIT;
  const hits: UsageHit[] = [];
  for (const [setting, member] of tracked) {
    const t = totals.get(setting) ?? { chain: 0, typePos: 0, imp: 0, prop: 0 };
    const total = t.chain + t.typePos + t.imp + t.prop;
    const fm = fileMap.get(setting)!;
    const fileHits: FileHit[] = [...fm.entries()]
      .map(([file, f]) => ({
        file,
        chain: f.chain,
        typePos: f.typePos,
        imp: f.imp,
        prop: f.prop,
        total: f.chain + f.typePos + f.imp + f.prop,
      }))
      .sort((a, b) => b.total - a.total || a.file.localeCompare(b.file))
      .slice(0, maxFilesPerHit);
    hits.push({
      setting,
      kind: member.kind,
      module: member.module,
      depth: member.depth,
      chainRefs: t.chain,
      typePosRefs: t.typePos,
      importRefs: t.imp,
      propRefs: t.prop,
      total,
      fileHits,
    });
  }
  hits.sort((a, b) => b.total - a.total || a.setting.localeCompare(b.setting));

  const used = hits.filter(h => h.total > 0);
  const unused = hits.filter(h => h.total === 0);

  // Module rollup
  const moduleMap = new Map<string, ModuleRollup>();
  for (const h of hits) {
    let r = moduleMap.get(h.module);
    if (!r) {
      r = { module: h.module, tracked: 0, used: 0, unused: 0, totalRefs: 0 };
      moduleMap.set(h.module, r);
    }
    r.tracked++;
    if (h.total > 0) r.used++;
    else r.unused++;
    r.totalRefs += h.total;
  }
  const byModule = [...moduleMap.values()].sort(
    (a, b) => b.totalRefs - a.totalRefs || a.module.localeCompare(b.module)
  );
  const unusedModules = byModule.filter(r => r.used === 0).map(r => r.module);

  return {
    schema: 'factorywager/bun-types-usage/v2',
    generated: new Date().toISOString(),
    inventory: {
      path: invPath,
      totalMembers: inv.members.length,
      tracked: hits.length,
    },
    scan: { roots: scanRoots, files },
    summary: {
      tracked: hits.length,
      used: used.length,
      unused: unused.length,
      topUsed: used.slice(0, 25).map(h => ({ setting: h.setting, total: h.total })),
      byModule,
      unusedModules,
    },
    hits,
  };
}

export function renderUsageMd(report: UsageReport): string {
  const lines: string[] = [
    '# bun-types usage (Phase 4)',
    '',
    'Inventory type-likes × codebase references (single-pass scan).',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Generated | ${report.generated} |`,
    `| Schema | \`${report.schema}\` |`,
    `| Inventory | ${report.inventory.totalMembers} members · tracked **${report.inventory.tracked}** |`,
    `| Scan | ${report.scan.roots.map(r => `\`${r}/\``).join(', ')} · ${report.scan.files} files |`,
    `| Used | **${report.summary.used}** |`,
    `| Unused | **${report.summary.unused}** |`,
    '',
    '## Module rollup',
    '',
    '| Module | tracked | used | unused | total refs |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  for (const r of report.summary.byModule) {
    lines.push(`| \`${r.module}\` | ${r.tracked} | ${r.used} | ${r.unused} | ${r.totalRefs} |`);
  }
  lines.push('');
  if (report.summary.unusedModules.length > 0) {
    lines.push(
      `> **Entirely unused modules:** ${report.summary.unusedModules.map(m => `\`${m}\``).join(', ')}`
    );
    lines.push('');
  }
  lines.push('## Top used');
  lines.push('');
  lines.push('| Setting | kind | Total | chain | type-pos | import | prop | top file |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const h of report.hits.filter(x => x.total > 0).slice(0, 50)) {
    const topFile = h.fileHits[0];
    lines.push(
      `| \`${h.setting}\` | ${h.kind} | ${h.total} | ${h.chainRefs} | ${h.typePosRefs} | ${h.importRefs} | ${h.propRefs} | ${topFile ? `\`${topFile.file}\` (${topFile.total})` : '—'} |`
    );
  }
  lines.push('');
  lines.push(`## Unused sample (first 80 of ${report.summary.unused})`);
  lines.push('');
  for (const h of report.hits.filter(x => x.total === 0).slice(0, 80)) {
    lines.push(`- \`${h.setting}\` (${h.kind})`);
  }
  if (report.summary.unused > 80) lines.push(`- … +${report.summary.unused - 80} more`);
  lines.push('');
  lines.push('```bash');
  lines.push('bun run bun:types-usage');
  lines.push('bun run bun:types-usage:unused');
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/** CSV export — one row per hit (sorted by total desc). */
export function renderUsageCsv(report: UsageReport): string {
  const header = [
    'setting',
    'kind',
    'module',
    'depth',
    'chainRefs',
    'typePosRefs',
    'importRefs',
    'propRefs',
    'total',
    'fileHitsCount',
    'topFile',
  ];
  const esc = (s: string | number) => {
    const v = String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const rows = report.hits.map(h => {
    const top = h.fileHits[0];
    return [
      h.setting,
      h.kind,
      h.module,
      h.depth,
      h.chainRefs,
      h.typePosRefs,
      h.importRefs,
      h.propRefs,
      h.total,
      h.fileHits.length,
      top ? top.file : '',
    ]
      .map(esc)
      .join(',');
  });
  return `${[header.join(','), ...rows].join('\n')}\n`;
}

function parseCli(argv: string[]) {
  let kinds: MemberKind[] | null = null;
  let maxUnused = 10_000;
  for (const a of argv) {
    if (a.startsWith('--kind=')) {
      kinds = a
        .slice('--kind='.length)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean) as MemberKind[];
    }
    if (a.startsWith('--max-unused=')) {
      const n = Number(a.slice('--max-unused='.length));
      if (Number.isFinite(n) && n >= 0) maxUnused = Math.floor(n);
    }
  }
  return {
    json: argv.includes('--json'),
    unusedOnly: argv.includes('--unused'),
    props: argv.includes('--props'),
    write: !argv.includes('--no-write'),
    strict: argv.includes('--strict'),
    maxUnused,
    kinds,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function main(): Promise<void> {
  const args = parseCli(Bun.argv.slice(2));
  if (args.help) {
    console.log(`bun-types-usage — inventory × codebase usage (Phase 4)

  --unused          Only zero-use rows
  --kind=a,b        Default: class,interface,type
  --props           Include property rows + .leaf hits
  --strict          Fail if unused > --max-unused
  --max-unused=N
  --json
  --no-write
  -h, --help
`);
    return;
  }

  if (!(await Bun.file(INVENTORY_JSON).exists())) {
    console.error(`Missing ${INVENTORY_JSON} — run bun run bun:types-inventory:write first`);
    process.exit(1);
  }

  printBanner('bun-types-usage', 'inventory type-likes × codebase map');
  console.info(ttyDim('  scanning…'));
  const t0 = Bun.nanoseconds();
  const report = await scanUsage({
    kinds: args.kinds ?? undefined,
    props: args.props,
  });
  const ms = (Bun.nanoseconds() - t0) / 1e6;

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printSection('Coverage map');
    printMap([
      {
        key: 'tracked',
        value: String(report.summary.tracked),
        note: 'depth-0 class/interface/type (default)',
      },
      { key: 'used', value: String(report.summary.used) },
      { key: 'unused', value: String(report.summary.unused) },
      {
        key: 'scan',
        value: `${report.scan.files} files`,
        note: `${report.scan.roots.join(', ')} · ${ms.toFixed(0)}ms`,
      },
      {
        key: 'inventory',
        value: String(report.inventory.totalMembers),
        note: report.inventory.path.replace(REPO_ROOT + '/', ''),
      },
    ]);

    if (report.summary.byModule?.length) {
      printHistogram(
        'Module coverage',
        report.summary.byModule.map(m => [m.module, m.used] as [string, number])
      );
    }

    printSection(args.unusedOnly ? 'Unused (sample)' : 'Top used');
    const rows = (
      args.unusedOnly
        ? report.hits.filter(h => h.total === 0).slice(0, 20)
        : report.hits.filter(h => h.total > 0).slice(0, 16)
    ).map(h => ({
      setting: h.setting,
      kind: h.kind,
      total: String(h.total),
      chain: String(h.chainRefs),
      typePos: String(h.typePosRefs),
      imp: String(h.importRefs),
    }));
    printPreviewTable(
      rows,
      ['setting', 'kind', 'total', 'chain', 'typePos', 'imp'],
      args.unusedOnly
        ? Math.max(0, report.summary.unused - 20)
        : Math.max(0, report.summary.used - 16)
    );
  }

  if (args.write) {
    await Bun.spawn(['mkdir', '-p', OUT_DIR]).exited;
    await Bun.write(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await Bun.write(OUT_MD, renderUsageMd(report));
    if (!args.json) printArtifacts([OUT_JSON, OUT_MD]);
  }

  if (!args.json) {
    printDone(true, `usage map · ${report.summary.used} used / ${report.summary.tracked} tracked`);
  }

  if (args.strict && report.summary.unused > args.maxUnused) {
    console.error(`strict: unused ${report.summary.unused} > max-unused ${args.maxUnused}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
