// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn

export type PackageScopeFilter = 'all' | 'unscoped' | `@${string}`;

export interface PackageGraphFlags {
  readonly scope: PackageScopeFilter;
  readonly update: boolean;
  readonly help: boolean;
}

export interface PackageGraphWorkspace {
  readonly path: string;
  readonly name: string;
}

export interface PackageGraphRow {
  readonly name: string;
}

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

export function parsePackageGraphFlags(args: readonly string[]): PackageGraphFlags {
  let scope: PackageScopeFilter = 'all';
  let scopeSeen = false;
  let update = false;
  let help = false;

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

    let scopeValue: string | undefined;
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
    } else {
      throw new Error(`Unknown pm graph option: ${arg}`);
    }

    if (scopeSeen) throw new Error('--scope may only be specified once.');
    scope = normalizePackageScope(scopeValue);
    scopeSeen = true;
  }

  return { scope, update, help };
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
  scope: PackageScopeFilter
): ScopedPackageGraphRow<T>[] {
  return resolvePackageGraphRows(packages, workspaces).filter(row => {
    if (scope === 'all') return true;
    const npmScope = packageScope(row.npmName);
    return scope === 'unscoped' ? npmScope === undefined : npmScope === scope;
  });
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
