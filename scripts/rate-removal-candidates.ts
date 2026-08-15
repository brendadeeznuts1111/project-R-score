#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
/**
 * Grade direct dependency removal evidence (higher score = stronger candidacy).
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
// @see https://bun.com/reference/bun/JSONC — Bun.JSONC
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler · Bun.Loader
// @updated Bun.Transpiler · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { discoverWorkspaceMembers } from '../lib/harness/monorepo-surfaces.ts';
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

/** Executable quality/type owners whose removal would disable a repository gate. */
export const LOCKED_TOOLING_PACKAGES = new Set([
  'typescript',
  '@types/bun',
  'bun-types',
  '@types/node',
  'husky',
  'prettier',
  'eslint',
  'typescript-eslint',
  '@socketsecurity/bun-security-scanner',
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
  /** Executable references found in one repository scan. */
  usage: UsageEvidence;
  /** Name appears as Tier-A avoid package */
  tierA: boolean;
  /** Protected toolchain pin */
  protected: boolean;
  /** Protocol is workspace:/file:/link: */
  internalProtocol: boolean;
  /** Spec is catalog: */
  catalog: boolean;
  /** Declared only as optionalDependencies. */
  optionalOnly: boolean;
  /** Declared in peerDependencies: a compatibility contract, not weak usage. */
  peerOnly: boolean;
  /** Ambient declaration package consumed by the compiler without source imports. */
  typeContract: boolean;
  /** Declared only in root package.json */
  rootOnly: boolean;
  /** How many workspace package.json files declare it */
  declarationCount: number;
  /** Declared under sports-terminal-os (alias-heavy app) */
  stoOnly: boolean;
};

/** Confidence that the score reflects reality (scan limits). */
export type Confidence = 'high' | 'medium' | 'low';

export type RemovalGrade = 'candidate' | 'review' | 'retain' | 'locked';

export type UsageEvidence = {
  sourceImports: number;
  configReferences: number;
  scriptInvocations: number;
  binaryInvocations: number;
  total: number;
};

export type RemovalReasonCode =
  | 'tier-a-native'
  | 'no-usage'
  | 'low-usage'
  | 'moderate-usage'
  | 'heavy-usage'
  | 'catalog-contract'
  | 'optional-only'
  | 'peer-contract'
  | 'type-contract'
  | 'root-unused'
  | 'multi-declared'
  | 'sto-scan-risk'
  | 'protected-policy'
  | 'internal-protocol';

export type RemovalReason = {
  code: RemovalReasonCode;
  weight: number;
  message: string;
};

export type DependencyAggregate = {
  name: string;
  versions: string[];
  sections: Section[];
  declarations: DirectDep[];
  protocols: DepProtocol[];
};

export type RemovalCandidate = DependencyAggregate & {
  score: number;
  grade: RemovalGrade;
  confidence: Confidence;
  signals: RemovalSignals;
  reasons: RemovalReason[];
  verifyCommand: string;
  removeCommand?: string;
  /** Optional `bun why` first parent (when --why). */
  whyParent?: string;
};

export const REMOVAL_SCORE = {
  baseline: 35,
  candidateMin: 75,
  retainMax: 30,
} as const;

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
 * Score 0–100: higher = stronger removal-candidacy evidence.
 * Pure function for unit tests.
 */
export function scoreRemoval(signals: RemovalSignals): {
  score: number;
  grade: RemovalGrade;
  reasons: RemovalReason[];
} {
  const reasons: RemovalReason[] = [];
  let score = REMOVAL_SCORE.baseline;

  const add = (code: RemovalReasonCode, weight: number, message: string): void => {
    score += weight;
    reasons.push({ code, weight, message });
  };

  if (signals.protected || signals.internalProtocol) {
    return {
      score: 0,
      grade: 'locked',
      reasons: signals.internalProtocol
        ? [
            {
              code: 'internal-protocol',
              weight: -REMOVAL_SCORE.baseline,
              message: 'workspace/file/link protocol — not an npm removal target',
            },
          ]
        : [
            {
              code: 'protected-policy',
              weight: -REMOVAL_SCORE.baseline,
              message: 'protected toolchain / platform pin',
            },
          ],
    };
  }

  if (signals.tierA) {
    add('tier-a-native', 20, 'Tier-A avoid package (prefer Bun native)');
  }

  if (signals.usage.total === 0) {
    add('no-usage', 40, 'no executable usage found');
  } else if (signals.usage.total <= 2) {
    add('low-usage', -10, `executable usage found (${signals.usage.total})`);
  } else if (signals.usage.total <= 10) {
    add('moderate-usage', -10, `moderate executable usage (${signals.usage.total})`);
  } else {
    add('heavy-usage', -30, `heavy executable usage (${signals.usage.total})`);
  }

  if (signals.catalog) {
    add('catalog-contract', -10, 'catalog: pin — shared SSOT; review catalog ownership');
  }

  if (signals.optionalOnly) {
    add('optional-only', 5, 'optional dependency only');
  }

  if (signals.peerOnly) {
    add('peer-contract', -20, 'peer dependency compatibility contract');
  }

  if (signals.typeContract) {
    add('type-contract', -35, 'ambient @types package — compiler contract, not executable usage');
  }

  if (signals.rootOnly && signals.usage.total === 0) {
    add('root-unused', 10, 'root-only declaration + no executable usage');
  }

  if (signals.declarationCount > 3) {
    add('multi-declared', -10, `declared in ${signals.declarationCount} package.json files`);
  }

  if (signals.stoOnly && signals.usage.total === 0 && !signals.tierA && !signals.typeContract) {
    add('sto-scan-risk', -25, 'STO-only declaration — alias scan may miss usage');
  }

  score = Math.max(0, Math.min(100, score));

  const confidence = confidenceFor(signals, 'review');
  const candidateBlocked =
    confidence === 'low' || signals.catalog || signals.peerOnly || signals.typeContract;
  let grade: RemovalGrade = 'review';
  if (score >= REMOVAL_SCORE.candidateMin && !candidateBlocked) grade = 'candidate';
  else if (score <= REMOVAL_SCORE.retainMax) grade = 'retain';
  return { score, grade, reasons };
}

/**
 * How much to trust the score given scan limits.
 * Pure — unit tested.
 */
export function confidenceFor(signals: RemovalSignals, grade: RemovalGrade): Confidence {
  if (grade === 'locked' || signals.internalProtocol || signals.protected || signals.typeContract) {
    return 'high';
  }
  if (signals.usage.total >= 10) return 'high';
  if (signals.usage.total === 0 && signals.rootOnly && !signals.stoOnly) return 'high';
  if (signals.usage.total === 0 && signals.stoOnly) return 'low';
  if (signals.usage.total <= 2) return 'medium';
  return 'high';
}

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export async function workspacePackageJsonPaths(repoRoot: string): Promise<string[]> {
  const out = new Set<string>([joinPath(repoRoot, 'package.json')]);
  for (const workspace of await discoverWorkspaceMembers(repoRoot)) {
    out.add(joinPath(repoRoot, workspace.path, 'package.json'));
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
export function aggregateByName(deps: DirectDep[]): Map<string, DependencyAggregate> {
  const map = new Map<string, DependencyAggregate>();
  for (const d of deps) {
    let row = map.get(d.name);
    if (!row) {
      row = {
        name: d.name,
        versions: [],
        sections: [],
        declarations: [],
        protocols: [],
      };
      map.set(d.name, row);
    }
    if (!row.versions.includes(d.version)) row.versions.push(d.version);
    if (!row.sections.includes(d.section)) row.sections.push(d.section);
    row.declarations.push(d);
    if (!row.protocols.includes(d.protocol)) row.protocols.push(d.protocol);
  }
  return map;
}

const SOURCE_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']);
const SCAN_SKIP_PREFIXES = [
  '.bun-create/',
  '.cache/',
  '.git/',
  'artifacts/',
  'docs/',
  'node_modules/',
  'public/',
  'scratch/',
];

function dependencyNameForSpecifier(specifier: string, names: Set<string>): string | null {
  for (const name of names) {
    if (specifier === name || specifier.startsWith(`${name}/`)) return name;
  }
  return null;
}

function emptyUsage(): UsageEvidence {
  return {
    sourceImports: 0,
    configReferences: 0,
    scriptInvocations: 0,
    binaryInvocations: 0,
    total: 0,
  };
}

function incrementUsage(
  usage: Map<string, UsageEvidence>,
  name: string,
  field: 'sourceImports' | 'configReferences' | 'scriptInvocations' | 'binaryInvocations',
  amount = 1
): void {
  const row = usage.get(name) ?? emptyUsage();
  row[field] += amount;
  row.total += amount;
  usage.set(name, row);
}

type BunLockPackageMetadata = {
  bin?: Record<string, string>;
};

/** Read exact package-to-binary ownership from Bun's text lockfile. */
export async function binaryAliasesFromLockfile(
  repoRoot: string,
  packageNames: Iterable<string>
): Promise<Map<string, string[]>> {
  const wanted = new Set(packageNames);
  const aliases = new Map([...wanted].map(name => [name, [] as string[]]));
  const lockPath = joinPath(repoRoot, 'bun.lock');
  try {
    if (!(await Bun.file(lockPath).exists())) throw new Error('file does not exist');
    const lock = Bun.JSONC.parse(await Bun.file(lockPath).text()) as {
      packages?: Record<string, unknown>;
    };
    if (!lock || typeof lock !== 'object' || !lock.packages) {
      throw new Error('packages map is absent');
    }
    for (const [name, entry] of Object.entries(lock.packages ?? {})) {
      if (!wanted.has(name) || !Array.isArray(entry)) continue;
      const metadata = entry[2];
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) continue;
      const bin = (metadata as BunLockPackageMetadata).bin;
      if (!bin || typeof bin !== 'object' || Array.isArray(bin)) continue;
      aliases.set(name, Object.keys(bin).sort());
    }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`cannot grade binary usage without readable ${lockPath}: ${detail}`);
  }
  return aliases;
}

function countBinaryInvocations(text: string, alias: string, shellLike: boolean): number {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const explicitBin = new RegExp(
    `(?:^|[/\\\\])(?:node_modules[/\\\\])?\\.bin[/\\\\]${escaped}(?=$|[\\s"'\\x60])`,
    'gm'
  );
  const quotedCommand = new RegExp(`["'\\x60]${escaped}["'\\x60](?=\\s*[,\\]])`, 'g');
  const shellCommand = shellLike ? new RegExp(`(?:^|[;&|\\n]\\s*)${escaped}(?=$|\\s)`, 'gm') : null;
  return (
    (text.match(explicitBin)?.length ?? 0) +
    (text.match(quotedCommand)?.length ?? 0) +
    (shellCommand ? (text.match(shellCommand)?.length ?? 0) : 0)
  );
}

function isScannablePath(rel: string): boolean {
  if (SCAN_SKIP_PREFIXES.some(prefix => rel.startsWith(prefix))) return false;
  if (rel.includes('/node_modules/')) return false;
  if (rel.startsWith('projects/') && !rel.startsWith('projects/active/sports-terminal-os/')) {
    return false;
  }
  return true;
}

/** Build executable usage evidence in one filesystem pass for every direct dependency. */
export async function collectUsageEvidence(
  repoRoot: string,
  packageNames: Iterable<string>
): Promise<Map<string, UsageEvidence>> {
  const names = new Set(packageNames);
  const usage = new Map([...names].map(name => [name, emptyUsage()]));
  const binaryAliases = await binaryAliasesFromLockfile(repoRoot, names);
  const transpilers = new Map<string, Bun.Transpiler>();
  const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs,css,json,py,sh,bash,zsh}');

  for await (const rel of glob.scan({
    cwd: repoRoot,
    onlyFiles: true,
    dot: true,
    followSymlinks: false,
  })) {
    if (!isScannablePath(rel)) continue;
    const extension = rel.slice(rel.lastIndexOf('.') + 1);
    const text = await Bun.file(joinPath(repoRoot, rel)).text();

    if (SOURCE_EXTENSIONS.has(extension) || ['py', 'sh', 'bash', 'zsh'].includes(extension)) {
      const shellLike = ['py', 'sh', 'bash', 'zsh'].includes(extension);
      for (const [name, aliases] of binaryAliases) {
        for (const alias of aliases) {
          incrementUsage(
            usage,
            name,
            'binaryInvocations',
            countBinaryInvocations(text, alias, shellLike)
          );
        }
      }
    }

    if (SOURCE_EXTENSIONS.has(extension)) {
      const loader = extension === 'mjs' || extension === 'cjs' ? 'js' : extension;
      const transpiler =
        transpilers.get(loader) ?? new Bun.Transpiler({ loader: loader as Bun.Loader });
      transpilers.set(loader, transpiler);
      try {
        const seen = new Map<string, number>();
        for (const imported of transpiler.scan(text).imports) {
          const name = dependencyNameForSpecifier(imported.path, names);
          if (name) seen.set(name, (seen.get(name) ?? 0) + 1);
        }
        for (const [name, hits] of seen) incrementUsage(usage, name, 'sourceImports', hits);
      } catch {
        // A source file that cannot be parsed provides no safe removal evidence.
      }
      continue;
    }

    if (rel.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(text) as { scripts?: Record<string, string> };
        for (const body of Object.values(pkg.scripts ?? {})) {
          for (const name of names) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const cli = new RegExp(`(?:^|[\\s"'=])${escaped}(?:@[^\\s"']+)?(?=$|[\\s"'])`, 'g');
            incrementUsage(usage, name, 'scriptInvocations', body.match(cli)?.length ?? 0);
          }
          for (const [name, aliases] of binaryAliases) {
            for (const alias of aliases) {
              incrementUsage(
                usage,
                name,
                'binaryInvocations',
                countBinaryInvocations(body, alias, true)
              );
            }
          }
        }
      } catch {
        // Invalid package JSON is owned by workspace validation.
      }
      continue;
    }

    if (extension === 'css' || /(?:components|import-map|tsconfig).*\.json$/i.test(rel)) {
      for (const name of names) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reference = new RegExp(`['"]${escaped}(?:/[^'"]*)?['"]`, 'g');
        incrementUsage(usage, name, 'configReferences', text.match(reference)?.length ?? 0);
      }
    }
  }

  return usage;
}

export type RateOptions = {
  nameFilter?: string;
  minScore?: number;
  /** root = only deps declared in root package.json */
  scope?: 'all' | 'root';
  /** e.g. ['candidate','review'] — empty = all grades. */
  grades?: RemovalGrade[];
  /** Drop LOCKED rows from output */
  hideLocked?: boolean;
  /** Attach bun why first parent for CANDIDATE rows (slower). */
  withWhy?: boolean;
};

export type RemovalReport = {
  totalEvaluated: number;
  matched: number;
  counts: Record<RemovalGrade, number>;
  candidates: RemovalCandidate[];
};

function countGrades(rows: RemovalCandidate[]): Record<RemovalGrade, number> {
  return {
    candidate: rows.filter(row => row.grade === 'candidate').length,
    review: rows.filter(row => row.grade === 'review').length,
    retain: rows.filter(row => row.grade === 'retain').length,
    locked: rows.filter(row => row.grade === 'locked').length,
  };
}

export async function rateCandidates(repoRoot: string, opts?: RateOptions): Promise<RemovalReport> {
  const banned = new Set(tierAAvoidPackages());
  let direct = await collectDirectDeps(repoRoot);
  if (opts?.scope === 'root') {
    direct = direct.filter(d => d.declaredIn === 'package.json');
  }
  const byName = aggregateByName(direct);
  const nameFilter = opts?.nameFilter;
  const names = [...byName.keys()]
    .filter(name => !nameFilter || name === nameFilter || name.includes(nameFilter))
    .sort();
  const usageByName = await collectUsageEvidence(repoRoot, names);

  const out: RemovalCandidate[] = [];

  for (const name of names) {
    const agg = byName.get(name)!;
    const protocol =
      agg.protocols.find(p => p === 'workspace' || p === 'file' || p === 'link') ??
      agg.protocols[0] ??
      'npm';
    const usage = usageByName.get(name) ?? emptyUsage();
    const declaredIn = [...new Set(agg.declarations.map(d => d.declaredIn))];

    const stoOnly =
      declaredIn.length > 0 && declaredIn.every(p => p.includes('sports-terminal-os'));

    const signals: RemovalSignals = {
      usage,
      tierA: banned.has(name),
      protected: LOCKED_TOOLING_PACKAGES.has(name),
      internalProtocol: protocol === 'workspace' || protocol === 'file' || protocol === 'link',
      catalog: protocol === 'catalog' || agg.versions.some(v => v.startsWith('catalog:')),
      optionalOnly: agg.sections.every(s => s === 'optionalDependencies'),
      peerOnly: agg.sections.every(s => s === 'peerDependencies'),
      typeContract: name.startsWith('@types/'),
      rootOnly: declaredIn.length === 1 && declaredIn[0] === 'package.json',
      declarationCount: declaredIn.length,
      stoOnly,
    };

    const { score, grade, reasons } = scoreRemoval(signals);
    const confidence = confidenceFor(signals, grade);

    out.push({
      ...agg,
      score,
      grade,
      confidence,
      signals,
      reasons,
      verifyCommand: `bun why ${name}`,
      removeCommand: grade === 'candidate' ? `bun run remove:safe -- ${name}` : undefined,
    });
  }

  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  let filtered = out;
  if (opts?.minScore !== undefined && opts.minScore > 0) {
    filtered = filtered.filter(r => r.score >= opts.minScore!);
  }
  if (opts?.hideLocked) {
    filtered = filtered.filter(r => r.grade !== 'locked');
  }
  if (opts?.grades && opts.grades.length > 0) {
    const allow = new Set(opts.grades);
    filtered = filtered.filter(r => allow.has(r.grade));
  }

  if (opts?.withWhy) {
    const targets = filtered.filter(r => r.grade === 'candidate').slice(0, 20);
    await Promise.all(
      targets.map(async r => {
        r.whyParent = await summarizeBunWhy(repoRoot, r.name);
      })
    );
  }

  return {
    totalEvaluated: out.length,
    matched: filtered.length,
    counts: countGrades(out),
    candidates: filtered,
  };
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

function nonNegativeNumber(argv: readonly string[], flag: string): number {
  const raw = argValue(argv, flag);
  if (raw === undefined) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`--${flag} must be a non-negative number, got ${JSON.stringify(raw)}`);
  }
  return value;
}

function parseGrades(raw: string | undefined, onlyCandidates: boolean): RemovalGrade[] | undefined {
  if (onlyCandidates) return ['candidate'];
  if (!raw) return undefined;
  return raw.split(',').map(value => {
    const grade = value.trim().toLowerCase();
    if (grade === 'candidate' || grade === 'review' || grade === 'retain' || grade === 'locked') {
      return grade;
    }
    throw new Error(`Unknown --grade ${value} (use candidate,review,retain,locked)`);
  });
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('deps:rate-removal', Bun.argv.slice(2));
  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const asJson = argv.includes('--json');
  const asMd = argv.includes('--md');
  const minScore = nonNegativeNumber(argv, 'min-score');
  const limit = nonNegativeNumber(argv, 'limit');
  const nameFilter = argValue(argv, 'package');
  const scopeRaw = argValue(argv, 'scope') ?? 'all';
  if (scopeRaw !== 'all' && scopeRaw !== 'root') {
    throw new Error(`Unknown --scope ${scopeRaw} (use all or root)`);
  }
  const scope: NonNullable<RateOptions['scope']> = scopeRaw;
  const hideLocked = argv.includes('--hide-locked');
  const withWhy = argv.includes('--why');
  const grades = parseGrades(argValue(argv, 'grade'), argv.includes('--only-candidates'));

  const report = await rateCandidates(REPO_ROOT, {
    nameFilter,
    minScore,
    scope,
    hideLocked,
    grades,
    withWhy,
  });
  const rows = report.candidates;

  let shown = rows;
  if (limit > 0) shown = rows.slice(0, limit);

  if (asJson) {
    jsonOut({
      kind: 'deps-removal-candidates',
      reportOnly: true,
      count: shown.length,
      matched: report.matched,
      total: report.totalEvaluated,
      counts: report.counts,
      filters: { minScore, scope, hideLocked, grades: grades ?? null, withWhy },
      legend: TABLE_LEGEND,
      candidates: shown.map(r => ({
        name: r.name,
        versions: r.versions,
        sections: r.sections,
        sectionLabels: r.sections.map(sectionLabel),
        protocols: r.protocols,
        protocolLabels: r.protocols.map(protocolLabel),
        declarations: r.declarations,
        score: r.score,
        grade: r.grade,
        gradeLabel: gradeLabel(r.grade),
        confidence: r.confidence,
        usage: r.signals.usage,
        tierA: r.signals.tierA,
        stoOnly: r.signals.stoOnly,
        reasons: r.reasons,
        verifyCommand: r.verifyCommand,
        removeCommand: r.removeCommand ?? null,
        whyParent: r.whyParent ?? null,
      })),
    });
    process.exit(0);
  }

  if (asMd) {
    printMarkdown(shown, report, { minScore, limit, scope, hideLocked });
    process.exit(0);
  }

  printTableLegend();
  console.info(
    `Showing ${shown.length} of ${report.matched} matched · ${report.totalEvaluated} evaluated` +
      (limit > 0 ? ` · limit ${limit}` : '') +
      (minScore > 0 ? ` · min-score ${minScore}` : '') +
      (scope === 'root' ? ' · scope=root' : '') +
      (hideLocked ? ' · hide-locked' : '') +
      (withWhy ? ' · why' : '') +
      '\n'
  );

  const table = shown.map(r => {
    const declaredIn = [...new Set(r.declarations.map(d => d.declaredIn))].join(', ');
    const row: Record<string, string | number> = {
      'Score 0–100': r.score,
      Grade: gradeLabel(r.grade),
      Conf: r.confidence,
      Package: r.name,
      Version: shortenPath(r.versions.join(' | '), 16),
      Usage: r.signals.usage.total,
      Spec: r.protocols.map(protocolLabel).join(' | '),
      'Declared as': r.sections.map(sectionLabel).join(' | '),
      'Declared in': shortenPath(declaredIn, 28),
      Signal: r.reasons
        .slice(0, 2)
        .map(reason => reason.message)
        .join(' · '),
    };
    if (withWhy && r.whyParent) row['bun why'] = r.whyParent;
    if (r.signals.tierA) row.Package = `${r.name} [Tier-A]`;
    return row;
  });

  logTable(table);

  const counts = countGrades(rows);
  console.info(
    `\nCounts (this filter set): CANDIDATE=${counts.candidate} · REVIEW=${counts.review} · RETAIN=${counts.retain} · LOCKED=${counts.locked}`
  );

  const candidates = shown.filter(r => r.grade === 'candidate');
  if (candidates.length) {
    console.info('\nVerification path for CANDIDATE rows:');
    for (const r of candidates.slice(0, 15)) {
      console.info(`  ${r.verifyCommand}`);
      console.info(
        `    # score=${r.score} conf=${r.confidence}` +
          (r.whyParent ? ` why←${r.whyParent}` : '') +
          ` · ${r.reasons.map(reason => reason.message).join('; ')}`
      );
      if (r.removeCommand) console.info(`  ${r.removeCommand}`);
    }
  }

  console.info(
    '\nBefore removing: bun why <pkg>  →  bun run remove:safe -- <pkg>  →  bun run install:verify'
  );
  console.info(
    'Tips: --only-candidates · --hide-locked · --scope root · --why · --md · --min-score 75'
  );
  process.exit(0);
}

function printHelp(): void {
  console.info(`Usage: bun run deps:rate-removal -- [options]

Grade direct workspace dependencies by removal evidence (advisory).

Options:
  --json              Machine-readable output (+ legend)
  --md                Markdown table
  --limit N           Show top N rows
  --min-score N       Only rows with score ≥ N
  --package NAME      Filter to one package (substring ok)
  --scope root|all    Root package.json only, or all workspaces (default all)
  --grade LIST        Comma grades: candidate,review,retain,locked
  --only-candidates   Shorthand for --grade candidate
  --hide-locked       Hide LOCKED (workspace/toolchain) rows
  --why               Run bun why on top CANDIDATE rows (slower)
  --help              This help

Examples:
  bun run deps:rate-removal -- --only-candidates --hide-locked
  bun run deps:rate-removal -- --scope root --min-score 75 --why
  bun run deps:rate-removal -- --package yaml --json
`);
}

function printMarkdown(
  shown: RemovalCandidate[],
  report: RemovalReport,
  filters: { minScore: number; limit: number; scope: string; hideLocked: boolean }
): void {
  console.info('# Dependency removal candidates\n');
  console.info(
    `Showing **${shown.length}** of **${report.matched}** matched; **${report.totalEvaluated}** evaluated` +
      (filters.limit ? ` (limit ${filters.limit})` : '') +
      (filters.minScore ? ` · min-score ${filters.minScore}` : '') +
      (filters.scope === 'root' ? ' · scope=root' : '') +
      (filters.hideLocked ? ' · hide-locked' : '') +
      '\n'
  );
  console.info('| Score | Grade | Conf | Package | Usage | Spec | As | In | Signal |');
  console.info('| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |');
  for (const r of shown) {
    const pkg = r.signals.tierA ? `${r.name} (Tier-A)` : r.name;
    const signal = r.reasons
      .slice(0, 2)
      .map(reason => reason.message)
      .join('; ')
      .replace(/\|/g, '/');
    const declaredIn = [...new Set(r.declarations.map(d => d.declaredIn))].join(', ');
    console.info(
      `| ${r.score} | ${gradeLabel(r.grade)} | ${r.confidence} | \`${pkg}\` | ${r.signals.usage.total} | ${r.protocols.map(protocolLabel).join(' / ')} | ${r.sections.map(sectionLabel).join(' / ')} | ${shortenPath(declaredIn, 24)} | ${signal} |`
    );
  }
  console.info(
    '\n> A higher score means stronger candidacy evidence, not permission to remove. Confirm with `bun why`.\n'
  );
}

/** Human-readable grade for terminal and Markdown output. */
export function gradeLabel(grade: RemovalGrade): string {
  switch (grade) {
    case 'candidate':
      return 'CANDIDATE';
    case 'review':
      return 'REVIEW';
    case 'retain':
      return 'RETAIN';
    case 'locked':
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
  score: '0–100; higher = stronger candidacy evidence (never removal proof)',
  grades: {
    CANDIDATE: 'score ≥75, non-low confidence, no peer/catalog blocker — verify with bun why',
    REVIEW: 'score 31–74 or low confidence — evidence needs inspection',
    RETAIN: 'score ≤30 — executable usage or contracts favor retention',
    LOCKED: 'workspace/file/link or protected toolchain — do not remove:safe',
  },
  confidence: {
    high: 'scan + declare pattern reliable (e.g. root unused or heavy imports)',
    medium: 'some scan uncertainty',
    low: 'STO-only / alias-heavy — zero hits may be false',
  },
  usage:
    'Bun.Transpiler imports + lockfile-owned binary calls + package scripts + CSS/config references from one scan',
  spec: 'how package.json records the dep (npm / catalog: / workspace:*)',
  declaredAs: 'prod | dev | optional | peer',
  declaredIn: 'which package.json file(s) list the dep',
  signal: 'top scoring reasons',
} as const;

function printTableLegend(): void {
  console.info('Direct dependency removal rater (advisory — not a CI gate)\n');
  console.info('Columns:');
  console.info(`  Score 0–100   ${TABLE_LEGEND.score}`);
  console.info(`  Grade         CANDIDATE | REVIEW | RETAIN | LOCKED`);
  console.info(`                  CANDIDATE  ${TABLE_LEGEND.grades.CANDIDATE}`);
  console.info(`                  REVIEW  ${TABLE_LEGEND.grades.REVIEW}`);
  console.info(`                  RETAIN  ${TABLE_LEGEND.grades.RETAIN}`);
  console.info(`                  LOCKED  ${TABLE_LEGEND.grades.LOCKED}`);
  console.info(`  Conf          high | medium | low — trust in the score`);
  console.info(`                  high    ${TABLE_LEGEND.confidence.high}`);
  console.info(`                  medium  ${TABLE_LEGEND.confidence.medium}`);
  console.info(`                  low     ${TABLE_LEGEND.confidence.low}`);
  console.info(`  Package       npm package name ([Tier-A] = prefer Bun native)`);
  console.info(`  Version       declared range / pin (truncated)`);
  console.info(`  Usage         ${TABLE_LEGEND.usage}`);
  console.info(`  Spec          ${TABLE_LEGEND.spec}`);
  console.info(`  Declared as   ${TABLE_LEGEND.declaredAs}`);
  console.info(`  Declared in   ${TABLE_LEGEND.declaredIn}`);
  console.info(`  Signal        ${TABLE_LEGEND.signal}`);
  console.info('');
}

if (import.meta.main) {
  await main();
}
