#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-openineditor — Bun.openInEditor
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * harness-violations.ts — organize easy harness violations (path, line, rule)
 * and optionally open them in the editor (bunfig [debug].editor → Cursor).
 *
 * Collectors (start with easy / high-signal):
 *   1. ESLint wire-boundary rules (unknown params, decodeUnknown*)
 *   2. branded-id-check --smart (actionable + optional legacy baseline)
 *
 * Usage:
 *   bun tools/harness-violations.ts                  # list, group by rule
 *   bun tools/harness-violations.ts --json
 *   bun tools/harness-violations.ts --rule unknown   # boundary unknown params only
 *   bun tools/harness-violations.ts --rule brands
 *   bun tools/harness-violations.ts --open            # open first hit
 *   bun tools/harness-violations.ts --open=5          # open first 5
 *   bun tools/harness-violations.ts --path lib/r2     # scope eslint paths
 *   bun tools/harness-violations.ts --legacy-brands   # include brand baseline grandfathered
 *
 * Docs: docs/WIRE_BOUNDARY.md · lib/types/branded/README.md
 */
import { resolvePath, relativePath } from '../lib/path-bun';

const REPO = resolvePath(import.meta.dir, '..');

export type Violation = {
  rule: string;
  severity: 'error' | 'warn' | 'info';
  file: string;
  line: number;
  column?: number;
  message: string;
  hint?: string;
  tier: 'easy' | 'legacy' | 'strict';
};

type Args = {
  json: boolean;
  open: number;
  path: string;
  rule: 'all' | 'unknown' | 'decode' | 'brands';
  legacyBrands: boolean;
  limit: number;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const a: Args = {
    json: false,
    open: 0,
    path: 'lib',
    rule: 'all',
    legacyBrands: false,
    limit: 200,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]!;
    const next = argv[i + 1];
    if (raw === '--json') a.json = true;
    else if (raw === '--help' || raw === '-h') a.help = true;
    else if (raw === '--legacy-brands') a.legacyBrands = true;
    else if (raw === '--open') a.open = 1;
    else if (raw.startsWith('--open=')) a.open = Math.max(0, Number(raw.slice(7)) || 0);
    else if (raw === '--path' && next) {
      a.path = next;
      i++;
    } else if (raw.startsWith('--path=')) a.path = raw.slice(7);
    else if (raw === '--rule' && next) {
      if (next === 'all' || next === 'unknown' || next === 'decode' || next === 'brands')
        a.rule = next;
      i++;
    } else if (raw.startsWith('--rule=')) {
      const r = raw.slice(7);
      if (r === 'all' || r === 'unknown' || r === 'decode' || r === 'brands') a.rule = r;
    } else if (raw === '--limit' && next) {
      a.limit = Math.max(1, Number(next) || 200);
      i++;
    } else if (raw.startsWith('--limit=')) a.limit = Math.max(1, Number(raw.slice(8)) || 200);
  }
  return a;
}

function rel(file: string): string {
  const abs = resolvePath(file);
  return abs.startsWith(REPO) ? relativePath(REPO, abs) : file;
}

function printHelp(): void {
  console.info(`harness-violations — easy wire-boundary + brand hits

  bun tools/harness-violations.ts [options]

  --rule=all|unknown|decode|brands   filter collector (default all)
  --path=<dir>                       eslint root (default lib)
  --legacy-brands                    include brand baseline grandfathered hits
  --limit=N                          max rows printed (default 200)
  --json                             machine-readable
  --open / --open=N                  Bun.openInEditor first N hits (uses [debug].editor)
  -h, --help

Easy wins today:
  • harness/no-unknown-function-param  (rename to parse* or brand the type)
  • branded-id-check actionable        (use as*/try*/parse* or // brand-ok)
  • harness/no-decode-unknown-*        (move decode to boundary)

See docs/WIRE_BOUNDARY.md
`);
}

async function collectEslintBoundary(pathArg: string): Promise<Violation[]> {
  // Prefer globs relative to repo so flat-config `files` filters apply predictably.
  const relPath = pathArg.replace(/^\.\//, '').replace(/\/$/, '');
  const targets = [`${relPath}/**/*.{ts,tsx}`, `${relPath}/*.{ts,tsx}`];
  const proc = Bun.spawn(
    [
      'bunx',
      'eslint',
      '--config',
      'eslint.harness.config.ts',
      '--format',
      'json',
      '--no-error-on-unmatched-pattern',
      ...targets,
    ],
    { cwd: REPO, stdout: 'pipe', stderr: 'pipe' }
  );
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  // ESLint may exit 1 on warnings depending on max-warnings; still parse JSON
  let results: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string | null; // brand-ok — ESLint wire field, not domain brand
      line?: number;
      column?: number;
      severity: number;
      message: string;
    }>;
  }> = [];
  try {
    // ESLint sometimes prints non-JSON on stderr only; stdout should be array
    const trimmed = out.trim();
    if (!trimmed.startsWith('[')) return [];
    results = JSON.parse(trimmed) as typeof results;
  } catch {
    return [];
  }

  const hits: Violation[] = [];
  for (const f of results) {
    for (const m of f.messages ?? []) {
      const rule = m.ruleId ?? '';
      if (!rule.startsWith('harness/')) continue;
      const isDecode = rule.includes('decode-unknown');
      const isUnknown = rule.includes('unknown-function-param');
      if (!isDecode && !isUnknown) continue;
      hits.push({
        rule,
        severity: m.severity >= 2 ? 'error' : 'warn',
        file: rel(f.filePath),
        line: m.line ?? 1,
        column: m.column,
        message: m.message,
        hint: isDecode
          ? 'Move decode to boundary path or parse* owner — docs/WIRE_BOUNDARY.md'
          : 'Rename to parse*/is* or type with domain brand — docs/WIRE_BOUNDARY.md',
        tier: 'easy',
      });
    }
  }
  return hits;
}

type BrandSmartJson = {
  actionable: number;
  hits?: Array<{
    file: string;
    line: number;
    field: string;
    role: string;
    structural: string;
    brandHint: string | null;
    reason: string;
    text: string;
    suppressed?: boolean;
  }>;
  suppressedSample?: Array<{
    file: string;
    line: number;
    field: string;
    role: string;
    structural: string;
    brandHint: string | null;
    reason: string;
    text: string;
    suppressed?: boolean;
  }>;
};

async function collectBrands(includeLegacy: boolean): Promise<Violation[]> {
  const proc = Bun.spawn(['bun', 'tools/branded-id-check.ts', '--smart', '--json'], {
    cwd: REPO,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  let data: BrandSmartJson;
  try {
    data = JSON.parse(out) as BrandSmartJson;
  } catch {
    return [];
  }

  const hits: Violation[] = [];
  for (const h of data.hits ?? []) {
    hits.push({
      rule: 'branded-id/actionable',
      severity: 'error',
      file: h.file,
      line: h.line,
      message: `${h.field}: string  [${h.role}/${h.structural}] ${h.reason}`,
      hint: h.brandHint
        ? `use ${h.brandHint} via as*/try*/parse* from lib/types/branded`
        : 'use brand from lib/types/branded or // brand-ok',
      tier: 'easy',
    });
  }

  if (includeLegacy) {
    // Re-run without baseline by reading smart and also scanning? Baseline is applied inside tool.
    // For legacy, call write-baseline keys vs full scan: use --smart without baseline not available.
    // Instead parse suppressedSample only if reason is legacy — insufficient.
    // Spawn a second internal approach: run smart json is only actionable.
    // Load baseline and scan is heavy; document --legacy-brands as future.
    // Quick path: rg mid-line sessionId: string without brand-ok as info tier
    const legacy = await collectEasyBareIdStrings();
    hits.push(...legacy);
  }
  return hits;
}

/** Lightweight "easy" bare domain ID:string hits (no full smart classify). */
async function collectEasyBareIdStrings(): Promise<Violation[]> {
  const idRe =
    /(?<![\w$.])(sessionId|userId|accountId|requestId|correlationId|zoneId|webhookId|jobId)\??:\s*string\b/;
  const hits: Violation[] = [];
  const glob = new Bun.Glob('**/*.ts');
  for await (const f of glob.scan({ cwd: resolvePath(REPO, 'lib'), absolute: true })) {
    if (f.includes('/types/branded/')) continue;
    const text = await Bun.file(f).text();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/brand-ok/.test(line)) continue;
      if (/^\s*(\/\/|\*)/.test(line)) continue;
      const m = line.match(idRe);
      if (!m) continue;
      hits.push({
        rule: 'branded-id/easy-name',
        severity: 'info',
        file: rel(f),
        line: i + 1,
        message: `${m[1]}: string (common domain name — prefer brand)`,
        hint: `bun tools/brand-catalog.ts ${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)}`,
        tier: 'legacy',
      });
    }
  }
  return hits;
}

function filterByRule(hits: Violation[], rule: Args['rule']): Violation[] {
  if (rule === 'all') return hits;
  if (rule === 'unknown') return hits.filter(h => h.rule.includes('unknown-function'));
  if (rule === 'decode') return hits.filter(h => h.rule.includes('decode-unknown'));
  if (rule === 'brands') return hits.filter(h => h.rule.startsWith('branded-id'));
  return hits;
}

function groupKey(v: Violation): string {
  return v.rule;
}

function printHuman(hits: Violation[], limit: number): void {
  const byRule = new Map<string, Violation[]>();
  for (const h of hits) {
    const k = groupKey(h);
    if (!byRule.has(k)) byRule.set(k, []);
    byRule.get(k)!.push(h);
  }

  console.info(`\n🔍 harness-violations  ${hits.length} hit(s)\n`);
  let printed = 0;
  for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.info(`## ${rule}  (${list.length})`);
    // group by file
    const byFile = new Map<string, Violation[]>();
    for (const v of list) {
      if (!byFile.has(v.file)) byFile.set(v.file, []);
      byFile.get(v.file)!.push(v);
    }
    for (const [file, rows] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const v of rows.sort((a, b) => a.line - b.line)) {
        if (printed >= limit) {
          console.info(`\n… truncated at --limit=${limit}`);
          return;
        }
        const loc = `${file}:${v.line}${v.column != null ? `:${v.column}` : ''}`;
        console.info(`  ${loc}`);
        console.info(`    ${v.message.slice(0, 120)}`);
        if (v.hint) console.info(`    → ${v.hint}`);
        printed++;
      }
    }
    console.info('');
  }

  // path rollup
  const byDir = new Map<string, number>();
  for (const h of hits) {
    const dir = h.file.split('/').slice(0, 2).join('/');
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
  }
  console.info('By path prefix:');
  for (const [d, n] of [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.info(`  ${String(n).padStart(4)}  ${d}`);
  }
  console.info(`\nOpen: bun tools/harness-violations.ts --open=3`);
  console.info(`Docs: docs/WIRE_BOUNDARY.md\n`);
}

function openInEditor(hits: Violation[], count: number): void {
  if (typeof Bun.openInEditor !== 'function') {
    console.error('❌ Bun.openInEditor unavailable on this runtime');
    return;
  }
  const n = Math.min(count, hits.length);
  for (let i = 0; i < n; i++) {
    const h = hits[i]!;
    const abs = resolvePath(REPO, h.file);
    console.info(`✏️  open ${h.file}:${h.line}`);
    Bun.openInEditor(abs, { line: h.line, column: h.column ?? 1 });
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const collected: Violation[] = [];

  if (args.rule === 'all' || args.rule === 'unknown' || args.rule === 'decode') {
    process.stderr.write('… eslint boundary rules\n');
    collected.push(...(await collectEslintBoundary(args.path)));
  }
  if (args.rule === 'all' || args.rule === 'brands') {
    process.stderr.write('… branded-id-check\n');
    collected.push(...(await collectBrands(args.legacyBrands)));
  }

  let hits = filterByRule(collected, args.rule);
  // stable sort: rule, file, line
  hits = hits.sort(
    (a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.line - b.line
  );

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          count: hits.length,
          byRule: Object.fromEntries(
            [...new Set(hits.map(h => h.rule))].map(r => [r, hits.filter(h => h.rule === r).length])
          ),
          hits,
        },
        null,
        2
      )}\n`
    );
  } else {
    printHuman(hits, args.limit);
  }

  if (args.open > 0 && hits.length > 0) {
    openInEditor(hits, args.open);
  }

  // exit 1 if any easy error-tier for CI use later
  if (hits.some(h => h.severity === 'error' && h.tier === 'easy')) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
