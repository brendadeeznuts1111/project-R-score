// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Compact Bun.env inventory for packages-graph-map + env:inventory bake.
 * Never includes secret values — keys, counts, dispositions, samples only.
 *
 * schemaVersion 2: reverse owners · root vs product runtime · defaults issues
 */
import { Glob } from 'bun';
import {
  parseEnvTemplate,
  scanTextForIssues,
  scanTextForUsages,
  type EnvIssue,
} from './env-defaults-scan.ts';
import {
  SECRET_ALIASES,
  VAULT_REQUIRED_SECRETS,
  actionableVaultGaps,
  dispositionForSecret,
  type SecretDisposition,
} from './env-secret-policy.ts';
import {
  buildPackageVaultMap,
  type PackageVaultDisposition,
  type PackageVaultMap,
} from '../../lib/harness/packages-vault-map.ts';

export const ENV_INVENTORY_SCAN_ROOTS = ['lib', 'config', 'scripts', 'tools', 'packages'] as const;

export type EnvScanPlane = (typeof ENV_INVENTORY_SCAN_ROOTS)[number];

export const ENV_INVENTORY_TEMPLATES = [
  'env.template',
  'projects/active/enterprise/bet-ticker-worker-v1.1/env.template',
  'projects/active/enterprise/cascade-mover-v3/env.template',
  'projects/active/analysis/scanner/env.template',
] as const;

const IGNORE_DIR_PARTS = [
  '/node_modules/',
  '/.git/',
  '/__snapshots__/',
  '/public/',
  '/dist/',
  '/examples/',
];
const IGNORE_FILE_RE = [
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /env-defaults-scan\.ts$/,
  /env-secret-policy\.ts$/,
  /env-inventory\.ts$/,
  /env-inventory-compact\.ts$/,
  /packages-vault-map\.ts$/,
];

export type EnvKeyOwner = {
  envKey: string;
  kind: string;
  disposition: PackageVaultDisposition;
  count: number;
  planes: EnvScanPlane[];
  packages: string[];
  inRootTemplate: boolean;
  inAnyTemplate: boolean;
  passRef: string | null;
  runtimePresent: boolean;
  samples: string[]; // brand-ok — file:line
};

export type EnvInventoryCompact = {
  schemaVersion: 2;
  kind: 'env-inventory';
  generatedAt: string;
  scannedRoots: string[];
  usageCount: number;
  uniqueVars: number;
  byKind: { ambient: number; secret: number; config: number };
  vault: {
    templateKeyCount: number;
    vaultRefCount: number;
    actionableVaultGaps: string[];
    secretsUsedAndVaulted: string[];
    secretsUsedButNotInTemplate: string[];
  };
  topConfig: Array<{ var: string; count: number; samples: string[] }>;
  /** Reverse index: env key → consuming planes / packages (heaviest first). */
  owners: EnvKeyOwner[];
  /** Optional-config reads without fallback (packages + harness). */
  defaultsIssues: {
    total: number;
    packages: number;
    harness: number;
    top: Array<{ envVar: string; file: string; line: number }>;
  };
  /** Workspace packages plane (same as packages-metafile-audit --vault). */
  packagesPlane: PackageVaultMap;
  /** Presence flags — root monorepo template vs product templates. */
  runtime: {
    root: {
      templateKeysPresent: number;
      templateKeysMissing: number;
      missingKeys: string[];
    };
    products: {
      templateKeysPresent: number;
      templateKeysMissing: number;
      missingKeys: string[];
    };
    /** @deprecated prefer root/products — union of all templates */
    templateKeysPresent: number;
    templateKeysMissing: number;
    missingKeys: string[];
  };
  summary: {
    ownerCount: number;
    packageTouchedKeys: number;
    multiPlaneKeys: number;
    rootRuntimeMissing: number;
    defaultsIssueCount: number;
  };
};

function planeOf(file: string): EnvScanPlane | null {
  const top = file.split('/')[0];
  if (
    top === 'lib' ||
    top === 'config' ||
    top === 'scripts' ||
    top === 'tools' ||
    top === 'packages'
  ) {
    return top;
  }
  return null;
}

async function collectTsFiles(root: string, roots: readonly string[]): Promise<string[]> {
  const found: string[] = [];
  const glob = new Glob('**/*.{ts,tsx}');
  for (const r of roots) {
    try {
      for await (const file of glob.scan({
        cwd: `${root}/${r}`,
        absolute: false,
        onlyFiles: true,
      })) {
        const rel = `${r}/${file}`.replace(/\\/g, '/');
        if (IGNORE_DIR_PARTS.some(p => `/${rel}/`.includes(p))) continue;
        if (IGNORE_FILE_RE.some(re => re.test(rel))) continue;
        found.push(rel);
      }
    } catch {
      /* skip missing root */
    }
  }
  return found;
}

function runtimeSlice(keys: Set<string>): {
  templateKeysPresent: number;
  templateKeysMissing: number;
  missingKeys: string[];
} {
  const missing = [...keys].filter(k => !Bun.env[k]?.trim()).sort();
  return {
    templateKeysPresent: keys.size - missing.length,
    templateKeysMissing: missing.length,
    missingKeys: missing.slice(0, 40),
  };
}

/** Build compact inventory including packages plane + reverse owners. */
export async function buildEnvInventoryCompact(
  root: string,
  opts?: { packageNames?: string[]; includeGapReport?: boolean; maxOwners?: number }
): Promise<EnvInventoryCompact> {
  const maxOwners = opts?.maxOwners ?? 60;
  const usages: Array<{ envVar: string; kind: string; file: string; line: number }> = [];
  const defaultsIssues: EnvIssue[] = [];

  for (const file of await collectTsFiles(root, ENV_INVENTORY_SCAN_ROOTS)) {
    let text: string;
    try {
      text = await Bun.file(`${root}/${file}`).text();
    } catch {
      continue;
    }
    for (const u of scanTextForUsages(file, text)) {
      usages.push({ envVar: u.envVar, kind: u.kind, file, line: u.line });
    }
    for (const issue of scanTextForIssues(file, text)) {
      defaultsIssues.push(issue);
    }
  }

  const byVar = new Map<
    string,
    {
      kind: string;
      count: number;
      samples: string[];
      planes: Set<EnvScanPlane>;
      packages: Set<string>;
    }
  >();
  for (const u of usages) {
    if (u.kind === 'meta' || u.kind === 'write') continue;
    const cur = byVar.get(u.envVar) ?? {
      kind: u.kind,
      count: 0,
      samples: [],
      planes: new Set(),
      packages: new Set(),
    };
    cur.count += 1;
    if (u.kind !== 'config' && cur.kind === 'config') cur.kind = u.kind;
    if (cur.samples.length < 4) cur.samples.push(`${u.file}:${u.line}`);
    const plane = planeOf(u.file);
    if (plane) cur.planes.add(plane);
    const pm = u.file.match(/^packages\/([^/]+)\//);
    if (pm?.[1]) cur.packages.add(pm[1]);
    byVar.set(u.envVar, cur);
  }

  const vaultKeySet = new Set<string>();
  const passByKey = new Map<string, string>();
  let templateKeyCount = 0;
  let vaultRefCount = 0;
  const allTemplateKeys = new Set<string>();
  const rootTemplateKeys = new Set<string>();
  const productTemplateKeys = new Set<string>();

  for (const rel of ENV_INVENTORY_TEMPLATES) {
    try {
      const text = await Bun.file(`${root}/${rel}`).text();
      const parsed = parseEnvTemplate(text);
      templateKeyCount += parsed.keys.length;
      vaultRefCount += parsed.vaultRefs.length;
      const target = rel === 'env.template' ? rootTemplateKeys : productTemplateKeys;
      for (const k of parsed.keys) {
        allTemplateKeys.add(k);
        target.add(k);
      }
      for (const v of parsed.vaultRefs) {
        vaultKeySet.add(v.key);
        if (rel === 'env.template') passByKey.set(v.key, v.ref);
      }
    } catch {
      /* missing */
    }
  }

  const usedVars = [...byVar.keys()].sort();
  const usedSecrets = usedVars.filter(v => byVar.get(v)?.kind === 'secret');
  const usedConfig = usedVars.filter(v => byVar.get(v)?.kind === 'config');
  const usedAmbient = usedVars.filter(v => byVar.get(v)?.kind === 'ambient');
  const dispositions: Record<string, SecretDisposition> = {};
  for (const s of usedSecrets) {
    dispositions[s] = dispositionForSecret(s, vaultKeySet);
  }

  const packageNames =
    opts?.packageNames ??
    (
      await Array.fromAsync(
        new Glob('packages/*/package.json').scan({ cwd: root, absolute: false, onlyFiles: true })
      )
    )
      .map(p => p.split('/')[1]!)
      .filter(Boolean)
      .sort();

  const packagesPlane = await buildPackageVaultMap(root, packageNames, {
    includeGapReport: opts?.includeGapReport,
  });

  const owners: EnvKeyOwner[] = usedVars
    .map(envKey => {
      const row = byVar.get(envKey)!;
      const disposition: PackageVaultDisposition =
        row.kind === 'secret'
          ? dispositionForSecret(envKey, vaultKeySet)
          : row.kind === 'ambient'
            ? 'ambient'
            : 'config';
      return {
        envKey,
        kind: row.kind,
        disposition,
        count: row.count,
        planes: [...row.planes].sort() as EnvScanPlane[],
        packages: [...row.packages].sort(),
        inRootTemplate: rootTemplateKeys.has(envKey),
        inAnyTemplate: allTemplateKeys.has(envKey),
        passRef: passByKey.get(envKey) ?? null,
        runtimePresent: !!Bun.env[envKey]?.trim(),
        samples: row.samples,
      };
    })
    .sort((a, b) => {
      // Prefer package-touched + secrets + multi-plane
      const score = (o: EnvKeyOwner) =>
        (o.packages.length ? 1000 : 0) +
        (o.kind === 'secret' ? 500 : 0) +
        o.planes.length * 50 +
        o.count;
      return score(b) - score(a) || a.envKey.localeCompare(b.envKey);
    })
    .slice(0, maxOwners);

  const rootRuntime = runtimeSlice(rootTemplateKeys);
  const productRuntime = runtimeSlice(productTemplateKeys);
  const allRuntime = runtimeSlice(allTemplateKeys);

  const pkgIssues = defaultsIssues.filter(i => i.file.startsWith('packages/'));
  const harnessIssues = defaultsIssues.filter(i => !i.file.startsWith('packages/'));

  return {
    schemaVersion: 2,
    kind: 'env-inventory',
    generatedAt: new Date().toISOString(),
    scannedRoots: [...ENV_INVENTORY_SCAN_ROOTS],
    usageCount: usages.length,
    uniqueVars: usedVars.length,
    byKind: {
      ambient: usedAmbient.length,
      secret: usedSecrets.length,
      config: usedConfig.length,
    },
    vault: {
      templateKeyCount,
      vaultRefCount,
      actionableVaultGaps: actionableVaultGaps(usedSecrets, vaultKeySet),
      secretsUsedAndVaulted: usedSecrets.filter(s => dispositions[s] === 'vaulted'),
      secretsUsedButNotInTemplate: usedSecrets.filter(s => !vaultKeySet.has(s)),
    },
    topConfig: usedConfig
      .map(v => ({
        var: v,
        count: byVar.get(v)!.count,
        samples: byVar.get(v)!.samples,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
    owners,
    defaultsIssues: {
      total: defaultsIssues.length,
      packages: pkgIssues.length,
      harness: harnessIssues.length,
      top: defaultsIssues.slice(0, 20).map(i => ({
        envVar: i.envVar,
        file: i.file,
        line: i.line,
      })),
    },
    packagesPlane,
    runtime: {
      root: rootRuntime,
      products: productRuntime,
      templateKeysPresent: allRuntime.templateKeysPresent,
      templateKeysMissing: allRuntime.templateKeysMissing,
      missingKeys: allRuntime.missingKeys,
    },
    summary: {
      ownerCount: owners.length,
      packageTouchedKeys: owners.filter(o => o.packages.length > 0).length,
      multiPlaneKeys: owners.filter(o => o.planes.length > 1).length,
      rootRuntimeMissing: rootRuntime.templateKeysMissing,
      defaultsIssueCount: defaultsIssues.length,
    },
  };
}

/** Re-export policy constants for CLI help lines. */
export { SECRET_ALIASES, VAULT_REQUIRED_SECRETS };
