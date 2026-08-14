#!/usr/bin/env bun
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
};

export type RemovalCandidate = DirectDep & {
  score: number;
  grade: 'remove' | 'review' | 'keep' | 'protected';
  signals: RemovalSignals;
  reasons: string[];
  removeHint: string;
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

  score = Math.max(0, Math.min(100, score));

  let grade: RemovalCandidate['grade'] = 'review';
  if (score >= 70) grade = 'remove';
  else if (score <= 35) grade = 'keep';

  if (reasons.length === 0) reasons.push('default score');
  return { score, grade, reasons };
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
 * Count source references to a package name (imports / requires / bare strings).
 * Scans common code roots; skips node_modules and lockfiles.
 */
export async function countImportHits(repoRoot: string, packageName: string): Promise<number> {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // from 'pkg' | from "pkg" | from 'pkg/...' | require('pkg')
  const re = new RegExp(
    `(?:from\\s+['"]${escaped}(?:/[^'"]*)?['"]|require\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]\\s*\\)|import\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]\\s*\\))`,
    'g'
  );

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
  // Include css (fontsource) and config files that name packages
  const fileGlob = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs,css,json}');

  for (const root of roots) {
    const absRoot = joinPath(repoRoot, root);
    try {
      for await (const rel of fileGlob.scan({ cwd: absRoot, onlyFiles: true })) {
        if (rel.includes('node_modules/') || rel.endsWith('package-lock.json')) continue;
        if (rel.endsWith('package.json')) continue; // declare is not usage
        try {
          const text = await Bun.file(joinPath(absRoot, rel)).text();
          const m = text.match(re);
          if (m) hits += m.length;
          // Config-style bare string: "vite" | 'tailwindcss' as sole dependency string
          if (hits === 0 || !m) {
            const bare = new RegExp(`['"]${escaped}['"]`, 'g');
            const b = text.match(bare);
            // Only count bare strings in config-like files (avoid package.json already skipped)
            if (b && (/\.(config|rc)\.|vite|tailwind|postcss/i.test(rel) || rel.endsWith('.css'))) {
              hits += b.length;
            }
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

export async function rateCandidates(
  repoRoot: string,
  opts?: { nameFilter?: string; minScore?: number }
): Promise<RemovalCandidate[]> {
  const banned = new Set(tierAAvoidPackages());
  const direct = await collectDirectDeps(repoRoot);
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
    };

    const { score, grade, reasons } = scoreRemoval(signals, name);

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
      signals,
      reasons,
      removeHint,
    });
  }

  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (opts?.minScore !== undefined && opts.minScore > 0) {
    return out.filter(r => r.score >= opts.minScore!);
  }
  return out;
}

function argValue(argv: readonly string[], flag: string): string | undefined {
  const i = argv.indexOf(`--${flag}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  const eq = argv.find(a => a.startsWith(`--${flag}=`));
  return eq ? eq.slice(flag.length + 3) : undefined;
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('deps:rate-removal', Bun.argv.slice(2));
  const asJson = argv.includes('--json');
  const minScore = Number(argValue(argv, 'min-score') ?? '0');
  const limit = Number(argValue(argv, 'limit') ?? '0');
  const nameFilter = argValue(argv, 'package');

  const rows = await rateCandidates(REPO_ROOT, {
    nameFilter,
    minScore: Number.isFinite(minScore) ? minScore : 0,
  });

  let shown = rows;
  if (limit > 0) shown = rows.slice(0, limit);

  if (asJson) {
    jsonOut({
      kind: 'deps-removal-candidates',
      reportOnly: true,
      count: shown.length,
      total: rows.length,
      candidates: shown.map(r => ({
        name: r.name,
        version: r.version,
        section: r.section,
        protocol: r.protocol,
        declaredIn: r.declaredIn,
        score: r.score,
        grade: r.grade,
        importHits: r.signals.importHits,
        tierA: r.signals.tierA,
        reasons: r.reasons,
        removeHint: r.removeHint,
      })),
    });
    process.exit(0);
  }

  console.info('Direct-dep removal candidates (higher score = safer to remove)');
  console.info('Advisory only — not a CI gate. Confirm with bun why + tests before remove:safe.\n');

  const table = shown.map(r => ({
    Score: r.score,
    Grade: r.grade,
    Package: r.name,
    Hits: r.signals.importHits,
    Protocol: r.protocol,
    Section: r.section.replace('Dependencies', ''),
    Where: r.declaredIn.length > 40 ? `${r.declaredIn.slice(0, 37)}…` : r.declaredIn,
    Why: r.reasons[0] ?? '',
  }));

  logTable(table);

  const removeable = shown.filter(r => r.grade === 'remove');
  if (removeable.length) {
    console.info('\n## Top remove:safe hints');
    for (const r of removeable.slice(0, 15)) {
      console.info(`  ${r.removeHint}`);
      console.info(`    # ${r.reasons.join('; ')}`);
    }
  }

  console.info('\nNext: bun why <pkg> · bun run remove:safe -- <pkg> · bun run install:verify');
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
