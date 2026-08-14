#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
/**
 * Rate direct dependency **removal candidates** (higher score = safer to remove).
 *
 * Scans workspace package.json deps, estimates source import usage, flags
 * Tier-A avoid packages, and protects toolchain / workspace protocols.
 *
 * Usage:
 *   bun scripts/rate-removal-candidates.ts
 *   bun run deps:rate-removal
 *   bun run deps:rate-removal -- --json
 *   bun run deps:rate-removal -- --min-score 50
 *   bun run deps:rate-removal -- --package zod
 *   bun run deps:rate-removal -- --limit 20
 *
 * Not a CI gate — advisory for operators before `bun run remove:safe`.
 *
 * @see docs/UNIFIED.md — remove:safe / Tier-A
 * @see tools/bun-prefer-matrix.ts — tierAAvoidPackages
 * @see scripts/inventory-wrappers.ts — transitive wrappers (different scope)
 * @see https://bun.com/docs/pm/cli/remove
 * @see https://bun.com/docs/cli/why
 */
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';
import { tierAAvoidPackages } from '../tools/bun-prefer-matrix.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

type Section = (typeof SECTIONS)[number];

/** Toolchain / platform pins — never high-score removals. */
export const PROTECTED_PACKAGES = new Set([
  'typescript',
  '@types/bun',
  'bun-types',
  '@types/node',
  'zod',
  'husky',
  'prettier',
  'eslint',
  'typescript-eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint-plugin-import',
  'eslint-plugin-security',
  '@socketsecurity/bun-security-scanner',
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
]);

export type DepProtocol = 'npm' | 'catalog' | 'workspace' | 'file' | 'link' | 'git' | 'other';

export type DirectDep = {
  name: string;
  version: string;
  section: Section;
  declaredIn: string; // package.json path relative to root
  declaredPkgName: string;
  protocol: DepProtocol;
};

export type RemovalSignals = {
  /** Import / require / from "name" hits in source scan */
  importHits: number;
  /** Name appears as Tier-A avoid package */
  tierA: boolean;
  /** Protected toolchain pin */
  protected: boolean;
  /** Protocol is workspace:/file:/link: */
  internalProtocol: boolean;
  /** Spec is catalog: */
  catalog: boolean;
  /** Only declared as optional or peer */
  weakSection: boolean;
  /** Declared only in root package.json */
  rootOnly: boolean;
  /** How many workspace package.json files declare it */
  declarationCount: number;
  /** Declared under sports-terminal-os (alias-heavy app) */
  stoOnly: boolean;
};

/** Confidence that the score reflects reality (scan limits). */
export type Confidence = 'high' | 'medium' | 'low';

export type RemovalCandidate = DirectDep & {
  score: number;
  grade: 'remove' | 'review' | 'keep' | 'protected';
  confidence: Confidence;
  signals: RemovalSignals;
  reasons: string[];
  removeHint: string;
  /** Optional `bun why` first parent (when --why) */
  whyParent?: string;
};

export function detectProtocol(spec: string): DepProtocol {
  if (spec.startsWith('workspace:')) return 'workspace';
  if (spec.startsWith('catalog:')) return 'catalog';
  if (spec.startsWith('file:')) return 'file';
  if (spec.startsWith('link:')) return 'link';
  if (spec.startsWith('git+') || spec.startsWith('github:') || spec.startsWith('git:'))
    return 'git';
  if (/^[\^~>=<*0-9]|latest|next|canary/.test(spec) || /^\d/.test(spec)) return 'npm';
  return 'other';
}

/**
 * Score 0–100: higher = better removal candidate.
 * Pure function for unit tests.
 */
export function scoreRemoval(
  signals: RemovalSignals,
  name: string
): {
  score: number;
  grade: RemovalCandidate['grade'];
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 40; // baseline "unknown usage"

  if (signals.protected || signals.internalProtocol) {
    return {
      score: 0,
      grade: 'protected',
      reasons: [
        signals.internalProtocol
          ? 'workspace/file/link protocol — not an npm removal target'
          : 'protected toolchain / platform pin',
      ],
    };
  }

  if (signals.tierA) {
    score += 35;
    reasons.push('Tier-A avoid package (prefer Bun native)');
  }

  if (signals.importHits === 0) {
    score += 40;
    reasons.push('no import hits in source scan');
  } else if (signals.importHits <= 2) {
    score += 15;
    reasons.push(`low import hits (${signals.importHits})`);
  } else if (signals.importHits <= 10) {
    score -= 10;
    reasons.push(`moderate import hits (${signals.importHits})`);
  } else {
    score -= 35;
    reasons.push(`heavy import hits (${signals.importHits})`);
  }

  if (signals.catalog) {
    score -= 15;
    reasons.push('catalog: pin — shared SSOT; remove only after catalog review');
  }

  if (signals.weakSection) {
    score += 10;
    reasons.push('optional/peer only');
  }

  if (signals.rootOnly && signals.importHits === 0) {
    score += 10;
    reasons.push('root-only declare + unused in scan');
  }

  if (signals.declarationCount > 3) {
    score -= 10;
    reasons.push(`declared in ${signals.declarationCount} package.json files`);
  }

  // STO / alias-heavy apps: zero hits is less trustworthy
  if (signals.stoOnly && signals.importHits === 0 && !signals.tierA) {
    score -= 20;
    reasons.push('STO-only declare — import scan may miss path aliases');
  }

  score = Math.max(0, Math.min(100, score));

  let grade: RemovalCandidate['grade'] = 'review';
  if (score >= 70) grade = 'remove';
  else if (score <= 35) grade = 'keep';

  if (reasons.length === 0) reasons.push('default score');
  return { score, grade, reasons };
}

/**
 * How much to trust the score given scan limits.
 * Pure — unit tested.
 */
export function confidenceFor(
  signals: RemovalSignals,
  grade: RemovalCandidate['grade']
): Confidence {
  if (grade === 'protected' || signals.internalProtocol || signals.protected) return 'high';
  if (signals.importHits >= 10) return 'high';
  if (signals.importHits === 0 && signals.rootOnly && !signals.stoOnly) return 'high';
  if (signals.importHits === 0 && signals.stoOnly) return 'low';
  if (signals.importHits === 0) return 'medium';
  if (signals.importHits <= 2) return 'medium';
  return 'high';
}

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

async function workspacePackageJsonPaths(repoRoot: string): Promise<string[]> {
  const out = new Set<string>([joinPath(repoRoot, 'package.json')]);
  const globs = [
    'packages/*/package.json',
    'lib/*/package.json',
    'projects/active/sports-terminal-os/package.json',
    '.agents/skills/ast-grep/package.json',
  ];
  for (const pattern of globs) {
    for await (const rel of new Bun.Glob(pattern).scan({ cwd: repoRoot })) {
      out.add(joinPath(repoRoot, rel));
    }
  }
  return [...out].sort();
}

export async function collectDirectDeps(repoRoot: string): Promise<DirectDep[]> {
  const paths = await workspacePackageJsonPaths(repoRoot);
  const deps: DirectDep[] = [];
  for (const abs of paths) {
    const pkg = (await Bun.file(abs).json()) as PackageJson;
    const rel = abs.startsWith(repoRoot) ? abs.slice(repoRoot.length + 1) : abs;
    const declaredPkgName = pkg.name ?? rel;
    for (const section of SECTIONS) {
      const map = pkg[section];
      if (!map) continue;
      for (const [name, version] of Object.entries(map)) {
        deps.push({
          name,
          version,
          section,
          declaredIn: rel,
          declaredPkgName,
          protocol: detectProtocol(version),
        });
      }
    }
  }
  return deps;
}

/** Collapse multi-declare rows into one name-level aggregate for scoring. */
export function aggregateByName(deps: DirectDep[]): Map<
  string,
  {
    name: string;
    versions: string[];
    sections: Section[];
    declaredIn: string[];
    protocols: DepProtocol[];
  }
> {
  const map = new Map<
    string,
    {
      name: string;
      versions: string[];
      sections: Section[];
      declaredIn: string[];
      protocols: DepProtocol[];
    }
  >();
  for (const d of deps) {
    let row = map.get(d.name);
    if (!row) {
      row = {
        name: d.name,
        versions: [],
        sections: [],
        declaredIn: [],
        protocols: [],
      };
      map.set(d.name, row);
    }
    if (!row.versions.includes(d.version)) row.versions.push(d.version);
    if (!row.sections.includes(d.section)) row.sections.push(d.section);
    if (!row.declaredIn.includes(d.declaredIn)) row.declaredIn.push(d.declaredIn);
    if (!row.protocols.includes(d.protocol)) row.protocols.push(d.protocol);
  }
  return map;
}

/**
 * Count source references to a package name (imports / requires / CSS / scripts).
 * Scans common code roots; skips node_modules and lockfiles.
 * package.json dependency keys are not usage; scripts that invoke the CLI are.
 */
export async function countImportHits(repoRoot: string, packageName: string): Promise<number> {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // from 'pkg' | require('pkg') | import('pkg') | @import "pkg/..." (CSS / postcss)
  const re = new RegExp(
    `(?:from\\s+['"]${escaped}(?:/[^'"]*)?['"]|require\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]\\s*\\)|import\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]\\s*\\)|@import\\s+(?:url\\(\\s*)?['"]${escaped}(?:/[^'"]*)?['"])`,
    'g'
  );
  // Config / CSS bare: "pkg" or "pkg/subpath" (fontsource, shadcn/tailwind.css)
  const bareOrSub = new RegExp(`['"]${escaped}(?:/[^'"]*)?['"]`, 'g');
  // CLI token in package.json scripts: bunx shadcn, shadcn@latest, npx shadcn
  const scriptCli = new RegExp(`(?:^|[\\s"'=\`@/])${escaped}(?:@latest|@\\d|\\s|"|'|$)`, 'g');

  const roots = [
    'lib',
    'scripts',
    'tools',
    'tests',
    'packages',
    'server',
    'config',
    'projects/active/sports-terminal-os',
  ];
  let hits = 0;
  const fileGlob = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs,css,json}');

  for (const root of roots) {
    const absRoot = joinPath(repoRoot, root);
    try {
      for await (const rel of fileGlob.scan({ cwd: absRoot, onlyFiles: true })) {
        if (rel.includes('node_modules/') || rel.endsWith('package-lock.json')) continue;
        const isPkgJson = rel === 'package.json' || rel.endsWith('/package.json');
        try {
          const text = await Bun.file(joinPath(absRoot, rel)).text();
          if (isPkgJson) {
            // Scripts / config keys that invoke the package as a CLI (not dep keys alone)
            try {
              const pj = JSON.parse(text) as {
                scripts?: Record<string, string>;
                bin?: string | Record<string, string>;
              };
              for (const body of Object.values(pj.scripts ?? {})) {
                const m = body.match(scriptCli);
                if (m) hits += m.length;
              }
            } catch {
              /* invalid json */
            }
            continue;
          }
          const m = text.match(re);
          if (m) hits += m.length;
          // Config-style package path strings (vite config plugins, CSS imports already via @import)
          if (
            /\.(config|rc)\.|vite|tailwind|postcss|components\.json/i.test(rel) ||
            rel.endsWith('.css')
          ) {
            const b = text.match(bareOrSub);
            if (b) hits += b.length;
          }
        } catch {
          /* skip unreadable */
        }
      }
    } catch {
      /* root missing */
    }
  }
  return hits;
}

export type RateOptions = {
  nameFilter?: string;
  minScore?: number;
  /** root = only deps declared in root package.json */
  scope?: 'all' | 'root';
  /** e.g. ['remove','review'] — empty = all grades */
  actions?: Array<RemovalCandidate['grade']>;
  /** Drop LOCKED rows from output */
  hideLocked?: boolean;
  /** Attach bun why first parent for REMOVE rows (slower) */
  withWhy?: boolean;
};

export async function rateCandidates(
  repoRoot: string,
  opts?: RateOptions
): Promise<RemovalCandidate[]> {
  const banned = new Set(tierAAvoidPackages());
  let direct = await collectDirectDeps(repoRoot);
  if (opts?.scope === 'root') {
    direct = direct.filter(d => d.declaredIn === 'package.json');
  }
  const byName = aggregateByName(direct);
  const names = [...byName.keys()]
    .filter(n => !opts?.nameFilter || n === opts.nameFilter || n.includes(opts.nameFilter!))
    .sort();

  const out: RemovalCandidate[] = [];

  for (const name of names) {
    const agg = byName.get(name)!;
    const protocol =
      agg.protocols.find(p => p === 'workspace' || p === 'file' || p === 'link') ??
      agg.protocols[0] ??
      'npm';
    const section =
      agg.sections.find(s => s === 'dependencies') ??
      agg.sections.find(s => s === 'devDependencies') ??
      agg.sections[0]!;

    const importHits =
      protocol === 'workspace' || protocol === 'file' || protocol === 'link'
        ? 0
        : await countImportHits(repoRoot, name);

    const stoOnly =
      agg.declaredIn.length > 0 && agg.declaredIn.every(p => p.includes('sports-terminal-os'));

    const signals: RemovalSignals = {
      importHits,
      tierA: banned.has(name),
      protected: PROTECTED_PACKAGES.has(name),
      internalProtocol: protocol === 'workspace' || protocol === 'file' || protocol === 'link',
      catalog: protocol === 'catalog' || agg.versions.some(v => v.startsWith('catalog:')),
      weakSection: agg.sections.every(
        s => s === 'optionalDependencies' || s === 'peerDependencies'
      ),
      rootOnly: agg.declaredIn.length === 1 && agg.declaredIn[0] === 'package.json',
      declarationCount: agg.declaredIn.length,
      stoOnly,
    };

    const { score, grade, reasons } = scoreRemoval(signals, name);
    const confidence = confidenceFor(signals, grade);

    const version = agg.versions.join(' | ');
    const removeHint =
      grade === 'protected' || signals.internalProtocol
        ? '(do not remove via remove:safe — internal/protected)'
        : `bun run remove:safe -- ${name}`;

    out.push({
      name,
      version,
      section,
      declaredIn: agg.declaredIn.join(', '),
      declaredPkgName:
        agg.declaredIn.length === 1 ? agg.declaredIn[0]! : `${agg.declaredIn.length} pkgs`,
      protocol,
      score,
      grade,
      confidence,
      signals,
      reasons,
      removeHint,
    });
  }

  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  let filtered = out;
  if (opts?.minScore !== undefined && opts.minScore > 0) {
    filtered = filtered.filter(r => r.score >= opts.minScore!);
  }
  if (opts?.hideLocked) {
    filtered = filtered.filter(r => r.grade !== 'protected');
  }
  if (opts?.actions && opts.actions.length > 0) {
    const allow = new Set(opts.actions);
    filtered = filtered.filter(r => allow.has(r.grade));
  }

  if (opts?.withWhy) {
    const targets = filtered.filter(r => r.grade === 'remove').slice(0, 20);
    await Promise.all(
      targets.map(async r => {
        r.whyParent = await summarizeBunWhy(repoRoot, r.name);
      })
    );
  }

  return filtered;
}

/** Best-effort first parent from `bun why` (same idea as inventory-wrappers). */
export async function summarizeBunWhy(repoRoot: string, pkg: string): Promise<string> {
  const proc = Bun.spawn(['bun', 'why', pkg], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const text = `${stdout}\n${stderr}`;
  const boxPrefix = /^[\s│├└─┌┐┘┴┬┤┼]+/u;
  for (const line of text.split('\n')) {
    const cleaned = line.replace(boxPrefix, '').trim();
    if (!cleaned || cleaned.startsWith('[')) continue;
    if (cleaned === pkg || cleaned.startsWith(`${pkg}@`)) continue;
    const bare = cleaned.split(/\s+\(/)[0]!.trim();
    if (bare && bare !== pkg) return bare.slice(0, 60);
  }
  return '(see bun why)';
}

function argValue(argv: readonly string[], flag: string): string | undefined {
  const i = argv.indexOf(`--${flag}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  const eq = argv.find(a => a.startsWith(`--${flag}=`));
  return eq ? eq.slice(flag.length + 3) : undefined;
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('deps:rate-removal', Bun.argv.slice(2));
  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const asJson = argv.includes('--json');
  const asMd = argv.includes('--md');
  const minScore = Number(argValue(argv, 'min-score') ?? '0');
  const limit = Number(argValue(argv, 'limit') ?? '0');
  const nameFilter = argValue(argv, 'package');
  const scopeRaw = argValue(argv, 'scope') ?? 'all';
  const scope = scopeRaw === 'root' ? 'root' : 'all';
  const hideLocked = argv.includes('--hide-locked') || argv.includes('--no-locked');
  const withWhy = argv.includes('--why');
  const onlyRemove = argv.includes('--only-remove');
  const actionRaw = argValue(argv, 'action');
  let actions: RateOptions['actions'];
  if (onlyRemove) actions = ['remove'];
  else if (actionRaw) {
    actions = actionRaw.split(',').map(s => {
      const t = s.trim().toLowerCase();
      if (t === 'remove' || t === 'review' || t === 'keep' || t === 'protected' || t === 'locked') {
        return t === 'locked' ? 'protected' : (t as RemovalCandidate['grade']);
      }
      throw new Error(`Unknown --action ${s} (use remove,review,keep,locked)`);
    });
  }

  const rows = await rateCandidates(REPO_ROOT, {
    nameFilter,
    minScore: Number.isFinite(minScore) ? minScore : 0,
    scope,
    hideLocked,
    actions,
    withWhy,
  });

  let shown = rows;
  if (limit > 0) shown = rows.slice(0, limit);

  if (asJson) {
    jsonOut({
      kind: 'deps-removal-candidates',
      reportOnly: true,
      count: shown.length,
      total: rows.length,
      filters: { minScore, scope, hideLocked, actions: actions ?? null, withWhy },
      legend: TABLE_LEGEND,
      candidates: shown.map(r => ({
        name: r.name,
        version: r.version,
        section: r.section,
        sectionLabel: sectionLabel(r.section),
        protocol: r.protocol,
        protocolLabel: protocolLabel(r.protocol),
        declaredIn: r.declaredIn,
        score: r.score,
        grade: r.grade,
        action: actionLabel(r.grade),
        confidence: r.confidence,
        importHits: r.signals.importHits,
        tierA: r.signals.tierA,
        stoOnly: r.signals.stoOnly,
        reasons: r.reasons,
        removeHint: r.removeHint,
        whyParent: r.whyParent ?? null,
      })),
    });
    process.exit(0);
  }

  if (asMd) {
    printMarkdown(shown, rows.length, { minScore, limit, scope, hideLocked });
    process.exit(0);
  }

  printTableLegend();
  console.info(
    `Showing ${shown.length} of ${rows.length} direct deps` +
      (limit > 0 ? ` · limit ${limit}` : '') +
      (minScore > 0 ? ` · min-score ${minScore}` : '') +
      (scope === 'root' ? ' · scope=root' : '') +
      (hideLocked ? ' · hide-locked' : '') +
      (withWhy ? ' · why' : '') +
      '\n'
  );

  const table = shown.map(r => {
    const row: Record<string, string | number> = {
      'Score 0–100': r.score,
      Action: actionLabel(r.grade),
      Conf: r.confidence,
      Package: r.name,
      Version: shortenPath(r.version, 16),
      'Import hits': r.signals.importHits,
      Spec: protocolLabel(r.protocol),
      'Declared as': sectionLabel(r.section),
      'Declared in': shortenPath(r.declaredIn, 28),
      Signal: r.reasons.slice(0, 2).join(' · '),
    };
    if (withWhy && r.whyParent) row['bun why'] = r.whyParent;
    if (r.signals.tierA) row.Package = `${r.name} [Tier-A]`;
    return row;
  });

  logTable(table);

  const counts = {
    remove: rows.filter(r => r.grade === 'remove').length,
    review: rows.filter(r => r.grade === 'review').length,
    keep: rows.filter(r => r.grade === 'keep').length,
    protected: rows.filter(r => r.grade === 'protected').length,
  };
  console.info(
    `\nCounts (this filter set): REMOVE=${counts.remove} · REVIEW=${counts.review} · KEEP=${counts.keep} · LOCKED=${counts.protected}`
  );

  const removeable = shown.filter(r => r.grade === 'remove');
  if (removeable.length) {
    console.info('\nSuggested next step for REMOVE rows (still verify first):');
    for (const r of removeable.slice(0, 15)) {
      console.info(`  ${r.removeHint}`);
      console.info(
        `    # score=${r.score} conf=${r.confidence}` +
          (r.whyParent ? ` why←${r.whyParent}` : '') +
          ` · ${r.reasons.join('; ')}`
      );
    }
  }

  console.info(
    '\nBefore removing: bun why <pkg>  →  bun run remove:safe -- <pkg>  →  bun run install:verify'
  );
  console.info(
    'Tips: --only-remove · --hide-locked · --scope root · --why · --md · --min-score 70'
  );
  process.exit(0);
}

function printHelp(): void {
  console.info(`Usage: bun run deps:rate-removal -- [options]

Rate direct workspace dependencies for removal (higher score = safer).

Options:
  --json              Machine-readable output (+ legend)
  --md                Markdown table
  --limit N           Show top N rows
  --min-score N       Only rows with score ≥ N
  --package NAME      Filter to one package (substring ok)
  --scope root|all    Root package.json only, or all workspaces (default all)
  --action LIST       Comma grades: remove,review,keep,locked
  --only-remove       Shorthand for --action remove
  --hide-locked       Hide LOCKED (workspace/toolchain) rows
  --why               Run bun why on top REMOVE rows (slower)
  --help              This help

Examples:
  bun run deps:rate-removal -- --only-remove --hide-locked
  bun run deps:rate-removal -- --scope root --min-score 70 --why
  bun run deps:rate-removal -- --package yaml --json
`);
}

function printMarkdown(
  shown: RemovalCandidate[],
  total: number,
  filters: { minScore: number; limit: number; scope: string; hideLocked: boolean }
): void {
  console.info('# Dependency removal candidates\n');
  console.info(
    `Showing **${shown.length}** of **${total}**` +
      (filters.limit ? ` (limit ${filters.limit})` : '') +
      (filters.minScore ? ` · min-score ${filters.minScore}` : '') +
      (filters.scope === 'root' ? ' · scope=root' : '') +
      (filters.hideLocked ? ' · hide-locked' : '') +
      '\n'
  );
  console.info('| Score | Action | Conf | Package | Hits | Spec | As | In | Signal |');
  console.info('| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |');
  for (const r of shown) {
    const pkg = r.signals.tierA ? `${r.name} (Tier-A)` : r.name;
    const signal = r.reasons.slice(0, 2).join('; ').replace(/\|/g, '/');
    console.info(
      `| ${r.score} | ${actionLabel(r.grade)} | ${r.confidence} | \`${pkg}\` | ${r.signals.importHits} | ${protocolLabel(r.protocol)} | ${sectionLabel(r.section)} | ${shortenPath(r.declaredIn, 24)} | ${signal} |`
    );
  }
  console.info(
    '\n> Higher score = safer to remove. Confirm with `bun why` before `remove:safe`.\n'
  );
}

/** Human-readable action for table (maps internal grade). */
export function actionLabel(grade: RemovalCandidate['grade']): string {
  switch (grade) {
    case 'remove':
      return 'REMOVE';
    case 'review':
      return 'REVIEW';
    case 'keep':
      return 'KEEP';
    case 'protected':
      return 'LOCKED';
  }
}

export function sectionLabel(section: Section): string {
  switch (section) {
    case 'dependencies':
      return 'prod';
    case 'devDependencies':
      return 'dev';
    case 'optionalDependencies':
      return 'optional';
    case 'peerDependencies':
      return 'peer';
  }
}

export function protocolLabel(protocol: DepProtocol): string {
  switch (protocol) {
    case 'npm':
      return 'npm registry';
    case 'catalog':
      return 'catalog:';
    case 'workspace':
      return 'workspace:*';
    case 'file':
      return 'file:';
    case 'link':
      return 'link:';
    case 'git':
      return 'git';
    case 'other':
      return 'other';
  }
}

function shortenPath(path: string, max: number): string {
  if (path.length <= max) return path;
  return `${path.slice(0, max - 1)}…`;
}

/** Printed above the table so columns are unambiguous. */
export const TABLE_LEGEND = {
  score: '0–100; higher = safer to remove (heuristic, not proof of unused)',
  action: {
    REMOVE: 'score ≥70 — strong unused / Tier-A signal; still run bun why',
    REVIEW: 'score 36–69 — mixed signals; inspect before remove',
    KEEP: 'score ≤35 — import hits suggest active use',
    LOCKED: 'workspace/file/link or protected toolchain — do not remove:safe',
  },
  confidence: {
    high: 'scan + declare pattern reliable (e.g. root unused or heavy imports)',
    medium: 'some scan uncertainty',
    low: 'STO-only / alias-heavy — zero hits may be false',
  },
  importHits: 'count of from/require/import() matches in lib/scripts/tools/tests/packages/STO',
  spec: 'how package.json records the dep (npm / catalog: / workspace:*)',
  declaredAs: 'prod | dev | optional | peer',
  declaredIn: 'which package.json file(s) list the dep',
  signal: 'top scoring reasons',
} as const;

function printTableLegend(): void {
  console.info('Direct dependency removal rater (advisory — not a CI gate)\n');
  console.info('Columns:');
  console.info(`  Score 0–100   ${TABLE_LEGEND.score}`);
  console.info(`  Action        REMOVE | REVIEW | KEEP | LOCKED`);
  console.info(`                  REMOVE  ${TABLE_LEGEND.action.REMOVE}`);
  console.info(`                  REVIEW  ${TABLE_LEGEND.action.REVIEW}`);
  console.info(`                  KEEP    ${TABLE_LEGEND.action.KEEP}`);
  console.info(`                  LOCKED  ${TABLE_LEGEND.action.LOCKED}`);
  console.info(`  Conf          high | medium | low — trust in the score`);
  console.info(`                  high    ${TABLE_LEGEND.confidence.high}`);
  console.info(`                  medium  ${TABLE_LEGEND.confidence.medium}`);
  console.info(`                  low     ${TABLE_LEGEND.confidence.low}`);
  console.info(`  Package       npm package name ([Tier-A] = prefer Bun native)`);
  console.info(`  Version       declared range / pin (truncated)`);
  console.info(`  Import hits   ${TABLE_LEGEND.importHits}`);
  console.info(`  Spec          ${TABLE_LEGEND.spec}`);
  console.info(`  Declared as   ${TABLE_LEGEND.declaredAs}`);
  console.info(`  Declared in   ${TABLE_LEGEND.declaredIn}`);
  console.info(`  Signal        ${TABLE_LEGEND.signal}`);
  console.info('');
}

if (import.meta.main) {
  await main();
}
