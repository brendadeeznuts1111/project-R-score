// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Thicken tenant registry snapshots from the root index (metadata only —
 * no fake tarball checksums). Portal `?tenant=` grids stop looking empty.
 *
 * @see tools/ops-seed-tenants.ts
 * @see public/tenants/manifest.json
 */
import { joinPath } from '../path-bun.ts';
import {
  TENNIS_AGENT_AUTH_ENV_KEY,
  TENNIS_AGENT_AUTH_PATH,
  TENNIS_AGENT_AUTH_REGISTRY_URL,
} from '../tennis/agent-auth.ts';

export type SeedTenantRegistriesOpts = {
  rootDir?: string;
  force?: boolean;
  /** Rewrite even when tenant already has ≥ minPackages (default 4). */
  minPackages?: number;
  /** Restrict writes to named tenants; defaults to every registered tenant. */
  tenantIds?: readonly TenantRegistryKey[];
};

export type TenantRegistryKey = 'factory' | 'science' | 'tennis';

const TENNIS_AGENT_AUTH_META = {
  status: 'configured',
  artifact: TENNIS_AGENT_AUTH_PATH,
  envKey: TENNIS_AGENT_AUTH_ENV_KEY,
  consumer: 'tennis-hq-cloud-agent',
  registryUrl: TENNIS_AGENT_AUTH_REGISTRY_URL,
  docs: 'docs/harness/tenants/tennis-hq-registry.md',
} as const;

function tenantMetadata(tenantId: TenantRegistryKey): Record<string, unknown> {
  return tenantId === 'tennis' ? { agentAuth: TENNIS_AGENT_AUTH_META } : {};
}

type TenantRegistryMeta = {
  rootLastUpdated?: string | null;
  agentAuth?: Partial<typeof TENNIS_AGENT_AUTH_META>;
};

function hasCurrentTenantMetadata(tenantId: TenantRegistryKey, meta?: TenantRegistryMeta): boolean {
  if (tenantId !== 'tennis') return true;
  const value = meta?.agentAuth;
  if (!value) return false;
  return (
    value.status === TENNIS_AGENT_AUTH_META.status &&
    value.artifact === TENNIS_AGENT_AUTH_META.artifact &&
    value.envKey === TENNIS_AGENT_AUTH_META.envKey &&
    value.registryUrl === TENNIS_AGENT_AUTH_META.registryUrl
  );
}

export type SeedTenantRegistriesResult = {
  seeded: boolean;
  reason?: string;
  tenants?: Record<string, number>;
};

/** Curated name lists — must exist in root `registry.json` when present. */
export const TENANT_PACKAGE_SLICES: Record<TenantRegistryKey, string[]> = {
  factory: [
    'event-store',
    'factory-cli',
    '@factorywager/registry-client',
    '@factory/health-check',
    'kimi-toolchain',
    '@factorywager/bun-test',
  ],
  science: ['quantum-domain-ops', 'event-store', 'odds-engine', 'test-plugin', 'sdk-test-pkg'],
  tennis: ['cascade-mover', 'sports-terminal-os', 'bet-ticker', 'odds-engine', 'event-store'],
};

type RegistryIndex = {
  schemaVersion?: number;
  lastUpdated?: string;
  meta?: TenantRegistryMeta;
  packages?: Record<string, unknown>;
  [key: string]: unknown;
};

function pickPackages(root: RegistryIndex, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const pkgs = root.packages ?? {};
  for (const name of names) {
    if (pkgs[name]) out[name] = pkgs[name];
  }
  // Fill from remaining root packages if curated names missing.
  if (Object.keys(out).length < Math.min(4, names.length)) {
    for (const [name, info] of Object.entries(pkgs)) {
      if (out[name]) continue;
      out[name] = info;
      if (Object.keys(out).length >= 6) break;
    }
  }
  return out;
}

/** Write `/registry/{tenant}/registry.json` slices from root index. */
export async function seedTenantRegistries(
  opts: SeedTenantRegistriesOpts = {}
): Promise<SeedTenantRegistriesResult> {
  const rootDir = opts.rootDir ?? joinPath(import.meta.dir, '../..');
  const minPackages = opts.minPackages ?? 4;
  const rootPath = joinPath(rootDir, 'public/registry/registry.json');
  const rootFile = Bun.file(rootPath);
  if (!(await rootFile.exists())) {
    return { seeded: false, reason: `missing ${rootPath}` };
  }

  const root = (await rootFile.json()) as RegistryIndex;
  const tenants: Record<string, number> = {};
  let wrote = 0;
  const selected = opts.tenantIds ? new Set(opts.tenantIds) : null;

  for (const [tenantId, names] of Object.entries(TENANT_PACKAGE_SLICES) as [
    TenantRegistryKey,
    string[],
  ][]) {
    if (selected && !selected.has(tenantId)) continue;
    const outPath = joinPath(rootDir, `public/registry/${tenantId}/registry.json`);
    const packages = pickPackages(root, names);
    const expectedNames = Object.keys(packages).sort();
    const existing = Bun.file(outPath);
    if ((await existing.exists()) && !opts.force) {
      try {
        const cur = (await existing.json()) as RegistryIndex;
        const currentNames = Object.keys(cur.packages ?? {}).sort();
        const currentRootUpdated = cur.meta?.rootLastUpdated;
        const sameRootSnapshot =
          currentRootUpdated === (root.lastUpdated ?? null) &&
          currentNames.length === expectedNames.length &&
          currentNames.every((name, index) => name === expectedNames[index]) &&
          hasCurrentTenantMetadata(tenantId, cur.meta);
        if (currentNames.length >= minPackages && sameRootSnapshot) {
          tenants[tenantId] = currentNames.length;
          continue;
        }
      } catch {
        /* rewrite */
      }
    }

    const payload = {
      schemaVersion: 1,
      tenantId,
      lastUpdated: new Date().toISOString(),
      meta: {
        source: 'tenant-registry-seed',
        rootLastUpdated: root.lastUpdated ?? null,
        packageCount: Object.keys(packages).length,
        ...tenantMetadata(tenantId),
      },
      packages,
    };
    await Bun.write(outPath, `${JSON.stringify(payload, null, 2)}\n`);
    tenants[tenantId] = Object.keys(packages).length;
    wrote++;
  }

  if (wrote === 0) {
    return {
      seeded: false,
      reason: `tenant registries already ≥${minPackages} packages (use --force)`,
      tenants,
    };
  }
  return { seeded: true, tenants };
}
