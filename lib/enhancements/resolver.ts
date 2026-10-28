// @see https://bun.com/docs/runtime/semver — Bun.semver
import type { EnhancementEnvironment, EnhancementRegistry, EnhancementSnapshot } from './types.ts';

function booleanOverride(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  throw new TypeError(
    `feature flag override must be true/false/1/0, received ${JSON.stringify(value)}`
  );
}

export function resolveEnhancementEnvironment(
  env: Readonly<Record<string, string | undefined>> = Bun.env
): EnhancementEnvironment {
  const value = (env.APP_ENV ?? env.NODE_ENV ?? 'development').toLowerCase();
  if (value === 'prod' || value === 'production') return 'production';
  if (value === 'stage' || value === 'staging') return 'staging';
  if (value === 'test') return 'test';
  return 'development';
}

export function resolveEnhancementRegistry(
  registry: EnhancementRegistry,
  options: {
    env?: Readonly<Record<string, string | undefined>>;
    environment?: EnhancementEnvironment;
    bunVersion?: string;
    bunRevision?: string | null;
    generatedAt?: string;
  } = {}
): EnhancementSnapshot {
  const env = options.env ?? Bun.env;
  const environment = options.environment ?? resolveEnhancementEnvironment(env);
  const bunVersion = options.bunVersion ?? Bun.version;
  const items = registry.items.map(item => {
    const versionRange = item.bunVersionRange ?? `>=${item.minimumBunVersion}`;
    const available = Bun.semver.satisfies(bunVersion, versionRange);
    if (item.kind !== 'guarded-feature') {
      const reason = !available
        ? `requires Bun ${versionRange}`
        : `${item.kind} is available; enabled state is not applicable`;
      return {
        ...item,
        available,
        enabled: null,
        defaultEnabled: null,
        overridden: false,
        reason,
      };
    }
    const defaultEnabled =
      item.status === 'stable' || (item.status === 'beta' && environment === 'staging');
    const override = item.featureFlag ? booleanOverride(env[item.featureFlag]) : undefined;
    const acceptsOverride = item.status === 'experimental' || item.status === 'beta';
    const overridden = acceptsOverride && override !== undefined;
    const enabled =
      available &&
      item.status !== 'proposed' &&
      item.status !== 'deprecated' &&
      item.status !== 'removed'
        ? overridden
          ? override!
          : defaultEnabled
        : false;
    const reason = !available
      ? `requires Bun ${versionRange}`
      : item.status === 'proposed'
        ? 'proposal is never runtime-enabled'
        : item.status === 'deprecated' || item.status === 'removed'
          ? `lifecycle status is ${item.status}`
          : overridden
            ? `explicit ${item.featureFlag} override`
            : `default for ${item.status} in ${environment}`;
    return { ...item, available, enabled, defaultEnabled, overridden, reason };
  });
  return {
    version: registry.version,
    environment,
    runtime: { name: 'bun', version: bunVersion, revision: options.bunRevision ?? Bun.revision },
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    items,
  };
}
