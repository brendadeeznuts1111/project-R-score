// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn

export type PackageScopeFilter = 'all' | 'unscoped' | `@${string}`;

/** Role or grade filter for packages/* rows (surfaces stay global). */
export type PackageGraphView =
  | 'all'
  | 'dormant'
  | 'consumed'
  | 'root-tooling'
  | 'scripted'
  | 'healthy'
  | 'needs-improvement'
  | 'critical';

export type PackageGraphExport = 'table' | 'json' | 'csv';

export interface PackageGraphFlags {
  readonly scope: PackageScopeFilter;
  readonly view: PackageGraphView;
  readonly exportFormat: PackageGraphExport;
  readonly update: boolean;
  readonly help: boolean;
  /** When true, force ANSI color even if stdout is not a TTY. */
  readonly color: boolean | 'auto';
}

export interface PackageGraphWorkspace {
  readonly path: string;
  readonly name: string;
}

export interface PackageGraphRow {
  readonly name: string;
  readonly role?: string;
  readonly score?: number;
  readonly grade?: string;
  readonly scanned?: number;
  readonly orphans?: number;
  readonly bytes?: number;
}

const PACKAGE_GRAPH_VIEWS = new Set<PackageGraphView>([
  'all',
  'dormant',
  'consumed',
  'root-tooling',
  'scripted',
  'healthy',
  'needs-improvement',
  'critical',
]);

export interface ScopedPackageGraphRow<T extends PackageGraphRow> {
  readonly npmName: string;
  readonly package: T;
}

function resolvePackageGraphRows<T extends PackageGraphRow>(
  packages: readonly T[],
  workspaces: readonly PackageGraphWorkspace[]
): ScopedPackageGraphRow<T>[] {
  const workspaceNames = new Map(
    workspaces.map(workspace => [workspace.path.replace(/\/+$/, ''), workspace.name])
  );

  return packages.map(pkg => {
    const npmName = pkg.name.startsWith('@')
      ? pkg.name
      : (workspaceNames.get(`packages/${pkg.name}`) ?? pkg.name);
    return { npmName, package: pkg };
  });
}

export const PACKAGE_GRAPH_UPDATE_COMMAND = [
  'bun',
  'run',
  'audit:packages',
  '--',
  '--bake',
] as const;

export type PackageGraphCommandRunner = (
  command: readonly string[],
  cwd: string
) => Promise<number>;

function normalizePackageScope(value: string): PackageScopeFilter {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'unscoped') return normalized;

  const scope = normalized.startsWith('@') ? normalized : `@${normalized}`;
  if (!/^@[a-z0-9][a-z0-9._-]*$/.test(scope)) {
    throw new Error(
      `Invalid package scope "${value}". Use an npm scope (for example @factorywager), unscoped, or all.`
    );
  }
  return scope as `@${string}`;
}

function normalizePackageGraphView(value: string): PackageGraphView {
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  // aliases
  const alias =
    normalized === 'needs-improvement' || normalized === 'needs_improvement'
      ? 'needs-improvement'
      : normalized === 'root-tooling' || normalized === 'root_tooling' || normalized === 'tooling'
        ? 'root-tooling'
        : normalized;
  if (!PACKAGE_GRAPH_VIEWS.has(alias as PackageGraphView)) {
    throw new Error(
      `Invalid --view "${value}". Use: all, dormant, consumed, root-tooling, scripted, healthy, needs-improvement, critical.`
    );
  }
  return alias as PackageGraphView;
}

function normalizePackageGraphExport(value: string): PackageGraphExport {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'table' || normalized === 'json' || normalized === 'csv') return normalized;
  throw new Error(`Invalid --export "${value}". Use: table, json, or csv.`);
}

/**
 * Health tone aligned with portal nav-badges toneHealthBadge (≥80 ok, ≥50 warn, else bad).
 * @see public/portal/nav-badges.js toneHealthBadge
 */
export function toneHealthBadge(
  score: number | null | undefined
): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (score == null || !Number.isFinite(Number(score))) return 'neutral';
  const n = Number(score);
  if (n >= 80) return 'ok';
  if (n >= 50) return 'warn';
  return 'bad';
}

/** ANSI color wrap for TTY CLI tables (no deps). */
export function colorizeByHealth(
  text: string,
  score: number | null | undefined,
  enabled: boolean
): string {
  if (!enabled) return text;
  const tone = toneHealthBadge(score);
  // green / yellow / red / dim
  const code = tone === 'ok' ? '32' : tone === 'warn' ? '33' : tone === 'bad' ? '31' : '2';
  return `\u001b[${code}m${text}\u001b[0m`;
}

export function gradeFromPackageScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(Number(score))) return 'unknown';
  const n = Number(score);
  if (n >= 90) return 'healthy';
  if (n >= 60) return 'needs-improvement';
  return 'critical';
}

export function parsePackageGraphFlags(args: readonly string[]): PackageGraphFlags {
  let scope: PackageScopeFilter = 'all';
  let scopeSeen = false;
  let view: PackageGraphView = 'all';
  let viewSeen = false;
  let exportFormat: PackageGraphExport = 'table';
  let exportSeen = false;
  let update = false;
  let help = false;
  let color: boolean | 'auto' = 'auto';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--update') {
      update = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--color') {
      color = true;
      continue;
    }
    if (arg === '--no-color') {
      color = false;
      continue;
    }

    let scopeValue: string | undefined;
    let viewValue: string | undefined;
    let exportValue: string | undefined;

    if (arg === '--scope') {
      scopeValue = args[index + 1];
      if (!scopeValue || scopeValue.startsWith('-')) {
        throw new Error('--scope requires an npm scope, unscoped, or all.');
      }
      index += 1;
    } else if (arg.startsWith('--scope=')) {
      scopeValue = arg.slice('--scope='.length);
      if (!scopeValue) {
        throw new Error('--scope requires an npm scope, unscoped, or all.');
      }
    } else if (arg === '--view') {
      viewValue = args[index + 1];
      if (!viewValue || viewValue.startsWith('-')) {
        throw new Error(
          '--view requires: all, dormant, consumed, root-tooling, healthy, needs-improvement, critical.'
        );
      }
      index += 1;
    } else if (arg.startsWith('--view=')) {
      viewValue = arg.slice('--view='.length);
      if (!viewValue) {
        throw new Error(
          '--view requires: all, dormant, consumed, root-tooling, healthy, needs-improvement, critical.'
        );
      }
    } else if (arg === '--export') {
      exportValue = args[index + 1];
      if (!exportValue || exportValue.startsWith('-')) {
        throw new Error('--export requires: table, json, or csv.');
      }
      index += 1;
    } else if (arg.startsWith('--export=')) {
      exportValue = arg.slice('--export='.length);
      if (!exportValue) {
        throw new Error('--export requires: table, json, or csv.');
      }
    } else if (arg === '--json') {
      // shorthand
      exportValue = 'json';
    } else {
      throw new Error(`Unknown pm graph option: ${arg}`);
    }

    if (scopeValue !== undefined) {
      if (scopeSeen) throw new Error('--scope may only be specified once.');
      scope = normalizePackageScope(scopeValue);
      scopeSeen = true;
    }
    if (viewValue !== undefined) {
      if (viewSeen) throw new Error('--view may only be specified once.');
      view = normalizePackageGraphView(viewValue);
      viewSeen = true;
    }
    if (exportValue !== undefined) {
      if (exportSeen) throw new Error('--export may only be specified once.');
      exportFormat = normalizePackageGraphExport(exportValue);
      exportSeen = true;
    }
  }

  return { scope, view, exportFormat, update, help, color };
}

function packageScope(name: string): `@${string}` | undefined {
  if (!name.startsWith('@')) return undefined;
  const separator = name.indexOf('/');
  if (separator <= 1) return undefined;
  return name.slice(0, separator).toLowerCase() as `@${string}`;
}

/**
 * Resolve audit-plane directory names through the workspace inventory before
 * applying npm-scope semantics.
 */
export function selectPackageGraphRows<T extends PackageGraphRow>(
  packages: readonly T[],
  workspaces: readonly PackageGraphWorkspace[],
  scope: PackageScopeFilter,
  view: PackageGraphView = 'all'
): ScopedPackageGraphRow<T>[] {
  return resolvePackageGraphRows(packages, workspaces).filter(row => {
    if (scope !== 'all') {
      const npmScope = packageScope(row.npmName);
      const scopeOk = scope === 'unscoped' ? npmScope === undefined : npmScope === scope;
      if (!scopeOk) return false;
    }
    return packageGraphViewMatches(row.package, view);
  });
}

/** Filter by role (dormant|consumed|…) or grade (healthy|critical|…). */
export function packageGraphViewMatches(pkg: PackageGraphRow, view: PackageGraphView): boolean {
  if (view === 'all') return true;
  const role = String(pkg.role ?? '').toLowerCase();
  const grade = String(pkg.grade ?? gradeFromPackageScore(pkg.score)).toLowerCase();
  if (view === 'dormant' || view === 'consumed' || view === 'root-tooling' || view === 'scripted') {
    return role === view;
  }
  return grade === view;
}

export function formatPackageGraphCsv(
  rows: readonly ScopedPackageGraphRow<PackageGraphRow>[]
): string {
  const header = 'package,role,score,grade,files,orphans,bytes';
  const lines = rows.map(r => {
    const p = r.package;
    return [
      r.npmName,
      p.role ?? '',
      p.score ?? '',
      p.grade ?? gradeFromPackageScore(p.score),
      p.scanned ?? '',
      p.orphans ?? '',
      p.bytes ?? '',
    ]
      .map(cell => {
        const s = String(cell);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',');
  });
  return [header, ...lines].join('\n') + '\n';
}

export function formatPackageGraphJson(
  rows: readonly ScopedPackageGraphRow<PackageGraphRow>[],
  meta: Record<string, unknown>
): string {
  return (
    JSON.stringify(
      {
        ...meta,
        packages: rows.map(r => ({
          package: r.npmName,
          role: r.package.role ?? null,
          score: r.package.score ?? null,
          grade: r.package.grade ?? gradeFromPackageScore(r.package.score),
          scanned: r.package.scanned ?? null,
          orphans: r.package.orphans ?? null,
          bytes: r.package.bytes ?? null,
        })),
      },
      null,
      2
    ) + '\n'
  );
}

/** Role breakdown for summary cards / CLI. */
export function packageRoleBreakdown(packages: readonly PackageGraphRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of packages) {
    const role = p.role || 'unknown';
    out[role] = (out[role] ?? 0) + 1;
  }
  return out;
}

export function packageGradeBreakdown(
  packages: readonly PackageGraphRow[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of packages) {
    const grade = p.grade || gradeFromPackageScore(p.score);
    out[grade] = (out[grade] ?? 0) + 1;
  }
  return out;
}

export function availablePackageGraphScopes(
  packages: readonly PackageGraphRow[],
  workspaces: readonly PackageGraphWorkspace[]
): PackageScopeFilter[] {
  const scopes = new Set<PackageScopeFilter>();
  for (const row of resolvePackageGraphRows(packages, workspaces)) {
    scopes.add(packageScope(row.npmName) ?? 'unscoped');
  }
  return [...scopes].sort((left, right) => left.localeCompare(right));
}

async function defaultPackageGraphCommandRunner(
  command: readonly string[],
  cwd: string
): Promise<number> {
  const proc = Bun.spawn([...command], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return (await proc.exited) ?? 1;
}

/** Run the canonical offline package-graph bake before the caller re-reads it. */
export async function updatePackageGraphBake(
  cwd: string,
  run: PackageGraphCommandRunner = defaultPackageGraphCommandRunner
): Promise<number> {
  return run(PACKAGE_GRAPH_UPDATE_COMMAND, cwd);
}
