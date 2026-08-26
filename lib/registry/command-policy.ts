// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @updated --dry-run · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated --dry-run · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @verified --dry-run · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/pm/cli/install#dry-run
// @see https://bun.com/docs/bundler/fullstack#production-mode — --production
// @updated --production · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated --production · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated --production · changed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated --production · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated --production · changed v1.1.2 · 2024-04-06 · https://bun.com/blog/bun-v1.1.2
// @updated --production · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated --production · fixed v1.1.41 · 2024-12-20 · https://bun.com/blog/bun-v1.1.41
// @updated --production · fixed v1.3.1 · 2025-10-22 · https://bun.com/blog/bun-v1.3.1
// @updated --production · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @verified --production · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/bundler/fullstack#production-mode
import type { ControlProfile } from '../security/control-policy.ts';

export const REGISTRY_OPERATIONS = [
  'metadata-read',
  'artifact-read',
  'publish',
  'mirror-write',
] as const;

export type RegistryOperation = (typeof REGISTRY_OPERATIONS)[number];
export type RegistryResolutionIntent = RegistryOperation | 'install';
export type RegistrySource =
  'cli' | 'environment' | 'publishConfig' | 'bunfig' | 'npmrc' | 'default';

export interface RegistryConfiguration {
  readonly cli?: string | readonly string[];
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly bunfig?: string | readonly string[];
  readonly npmrc?: string | readonly string[];
  readonly publishConfig?: string | readonly string[];
  readonly default?: string | readonly string[];
}

export interface RegistryPlaneGrant {
  readonly operation: RegistryOperation;
  readonly origins: readonly string[];
  readonly access: 'read' | 'write';
  readonly reason: string;
}

export interface ResolvedRegistry {
  readonly operation: RegistryResolutionIntent;
  readonly url: string;
  readonly origin: string;
  readonly source: RegistrySource;
}

export interface RegistryCommandPlan {
  readonly executable: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly registry: ResolvedRegistry;
  readonly profile: ControlProfile;
}

const ENV_REGISTRY_KEYS = [
  'BUN_CONFIG_REGISTRY',
  'NPM_CONFIG_REGISTRY',
  'npm_config_registry',
] as const;
const DENIED_ENVIRONMENT =
  /^(?:BUN_OPTIONS|BUN_FEATURE_FLAG_.+|BUN_INSTALL_REGISTRY|(?:HTTP|HTTPS|ALL|NO)_PROXY|(?:http|https|all|no)_proxy|NPM_CONFIG_(?:PROXY|HTTPS_PROXY)|npm_config_(?:proxy|https_proxy))$/;
const WRITE_OPERATIONS = new Set<RegistryResolutionIntent>(['publish', 'mirror-write']);
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;

function oneValue(
  value: string | readonly string[] | undefined,
  source: RegistrySource
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value.length !== 1) throw new TypeError(`${source} registry must be defined exactly once`);
  return value[0];
}

function normalizeRegistryUrl(
  value: string,
  source: RegistrySource
): { url: string; origin: string } {
  if (!value.trim()) throw new TypeError(`${source} registry must be nonempty`);
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new TypeError(`${source} registry must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new TypeError(`${source} registry must not contain credentials`);
  }
  if (parsed.hash || parsed.search) {
    throw new TypeError(`${source} registry must not contain query or fragment state`);
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return { url: parsed.toString().replace(/\/$/, ''), origin: parsed.origin };
}

function environmentRegistry(
  environment: RegistryConfiguration['environment']
): string | undefined {
  const unsupported = Object.entries(environment ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .filter(key => !ENV_REGISTRY_KEYS.includes(key as (typeof ENV_REGISTRY_KEYS)[number]));
  if (unsupported.length > 0) {
    throw new TypeError(`environment registry configuration rejects ${unsupported.join(', ')}`);
  }
  const present = ENV_REGISTRY_KEYS.flatMap(key => {
    const value = environment?.[key];
    return value === undefined ? [] : [[key, value] as const];
  });
  if (present.length > 1) {
    throw new TypeError(
      `environment registry is ambiguous (${present.map(([key]) => key).join(', ')})`
    );
  }
  return present[0]?.[1];
}

function sourceOrder(operation: RegistryResolutionIntent): readonly RegistrySource[] {
  if (operation === 'publish') return ['cli', 'environment', 'publishConfig', 'bunfig', 'npmrc'];
  return ['cli', 'environment', 'bunfig', 'npmrc', 'default'];
}

export function resolveRegistryConfiguration(
  operation: RegistryResolutionIntent,
  config: RegistryConfiguration
): ResolvedRegistry {
  const candidates: Partial<Record<RegistrySource, string>> = {
    cli: oneValue(config.cli, 'cli'),
    environment: environmentRegistry(config.environment),
    publishConfig: oneValue(config.publishConfig, 'publishConfig'),
    bunfig: oneValue(config.bunfig, 'bunfig'),
    npmrc: oneValue(config.npmrc, 'npmrc'),
    default: oneValue(config.default, 'default'),
  };
  const selected = sourceOrder(operation).find(source => candidates[source] !== undefined);
  if (!selected) {
    const message = WRITE_OPERATIONS.has(operation)
      ? `${operation} requires an explicit registry; implicit publish fallback is denied`
      : `${operation} requires a registry configuration`;
    throw new TypeError(message);
  }
  if (operation === 'mirror-write' && selected === 'default') {
    throw new TypeError('mirror-write must not use a default registry');
  }
  const normalized = normalizeRegistryUrl(candidates[selected]!, selected);
  return { operation, source: selected, ...normalized };
}

export function requireRegistryPlaneGrant(
  registry: ResolvedRegistry,
  grants: readonly RegistryPlaneGrant[]
): void {
  const needsWrite = WRITE_OPERATIONS.has(registry.operation);
  const requiredOperations: readonly RegistryOperation[] =
    registry.operation === 'install'
      ? ['metadata-read', 'artifact-read']
      : [registry.operation as RegistryOperation];
  for (const operation of requiredOperations) {
    const allowed = grants.some(grant => {
      if (grant.operation !== operation || !grant.reason.trim()) return false;
      if (needsWrite && grant.access !== 'write') return false;
      return grant.origins.some(candidate => {
        try {
          const parsed = normalizeRegistryUrl(candidate, 'default');
          return parsed.url === candidate.replace(/\/+$/, '') && parsed.origin === registry.origin;
        } catch {
          return false;
        }
      });
    });
    if (!allowed) {
      throw new TypeError(
        `${registry.operation} requires an exact ${operation} ${needsWrite ? 'write' : 'read'} plane grant for ${registry.origin}`
      );
    }
  }
}

function commandEnvironment(environment: Readonly<Record<string, string | undefined>> | undefined) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(environment ?? {})) {
    if (value === undefined || value === '') continue;
    if (
      DENIED_ENVIRONMENT.test(key) ||
      ENV_REGISTRY_KEYS.includes(key as (typeof ENV_REGISTRY_KEYS)[number])
    ) {
      throw new TypeError(`Registry command environment denies ${key}`);
    }
    if (
      ![
        'PATH',
        'TMPDIR',
        'TMP',
        'TEMP',
        'CI',
        'LANG',
        'LC_ALL',
        'SSL_CERT_FILE',
        'SSL_CERT_DIR',
      ].includes(key)
    ) {
      throw new TypeError(`Registry command environment does not allow ${key}`);
    }
    result[key] = value;
  }
  return result;
}

interface PlanBase {
  readonly executable: string;
  readonly cwd: string;
  readonly profile: ControlProfile;
  readonly registry: RegistryConfiguration;
  readonly grants: readonly RegistryPlaneGrant[];
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

function planBase(input: PlanBase, operation: RegistryResolutionIntent) {
  if (!input.executable.startsWith('/'))
    throw new TypeError('Registry command executable must be absolute');
  if (!input.cwd.startsWith('/')) throw new TypeError('Registry command cwd must be absolute');
  if (operation === 'publish' && input.profile !== 'release') {
    throw new TypeError('bun publish planning is release-profile only');
  }
  const registry = resolveRegistryConfiguration(operation, input.registry);
  requireRegistryPlaneGrant(registry, input.grants);
  return { registry, env: commandEnvironment(input.environment) };
}

export interface BunInfoPlanInput extends PlanBase {
  readonly packageName: string;
  readonly field?: string;
  readonly json?: boolean;
  readonly noCache?: boolean;
}

export function planBunInfo(input: BunInfoPlanInput): RegistryCommandPlan {
  const { registry, env } = planBase(input, 'metadata-read');
  if (!PACKAGE_NAME_RE.test(input.packageName))
    throw new TypeError('bun info package name is invalid');
  if (input.field !== undefined && !/^[a-zA-Z0-9_.-]+$/.test(input.field)) {
    throw new TypeError('bun info field is invalid');
  }
  return {
    executable: input.executable,
    argv: [
      'info',
      input.packageName,
      ...(input.field ? [input.field] : []),
      `--registry=${registry.url}`,
      ...(input.json ? ['--json'] : []),
      ...(input.noCache ? ['--no-cache'] : []),
    ],
    cwd: input.cwd,
    env,
    registry,
    profile: input.profile,
  };
}

export interface BunInstallPlanInput extends PlanBase {
  readonly packages?: readonly string[];
  readonly dryRun?: boolean;
  readonly frozenLockfile?: boolean;
  readonly ignoreScripts?: boolean;
  readonly productionDependenciesOnly?: boolean;
}

export function planBunInstall(input: BunInstallPlanInput): RegistryCommandPlan {
  const { registry, env } = planBase(input, 'install');
  for (const packageName of input.packages ?? []) {
    if (!PACKAGE_NAME_RE.test(packageName))
      throw new TypeError('bun install package name is invalid');
  }
  return {
    executable: input.executable,
    argv: [
      'install',
      ...(input.packages ?? []),
      `--registry=${registry.url}`,
      ...(input.dryRun ? ['--dry-run'] : []),
      ...(input.frozenLockfile ? ['--frozen-lockfile'] : []),
      ...(input.ignoreScripts ? ['--ignore-scripts'] : []),
      ...(input.productionDependenciesOnly ? ['--production'] : []),
    ],
    cwd: input.cwd,
    env,
    registry,
    profile: input.profile,
  };
}

export interface BunPublishPlanInput extends PlanBase {
  readonly tarball?: string;
  readonly dryRun?: boolean;
  readonly tag?: string;
}

export function planBunPublish(input: BunPublishPlanInput): RegistryCommandPlan {
  const { registry, env } = planBase(input, 'publish');
  if (
    input.tarball !== undefined &&
    (!input.tarball.startsWith('/') || !input.tarball.endsWith('.tgz'))
  ) {
    throw new TypeError('bun publish tarball must be an absolute .tgz path');
  }
  if (input.tag !== undefined && !/^[a-z0-9][a-z0-9._-]*$/.test(input.tag)) {
    throw new TypeError('bun publish tag is invalid');
  }
  return {
    executable: input.executable,
    argv: [
      'publish',
      ...(input.tarball ? [input.tarball] : []),
      `--registry=${registry.url}`,
      ...(input.tag ? ['--tag', input.tag] : []),
      ...(input.dryRun ? ['--dry-run'] : []),
    ],
    cwd: input.cwd,
    env,
    registry,
    profile: input.profile,
  };
}
