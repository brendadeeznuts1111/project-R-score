// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Compact Bun.env inventory for packages-graph-map + env:inventory bake.
 * Never includes secret values — keys, counts, dispositions, samples only.
 *
 * schemaVersion 3: reverse owners · root/product runtime · template-default cover
 * schemaVersion 4: toml plane — config TOML files, flattened keys, TS importers
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

export type TomlPlaneFile = {
  path: string;
  keyCount: number;
  /** First leaf dotted-paths (cap 20) — full count in keyCount. */
  sampleKeys: string[];
  /** TS/TSX files referencing this TOML path (cap 6) — file:line. */
  importers: string[]; // brand-ok — file:line samples
};

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

export type EnvRuntimeSlice = {
  templateKeysPresent: number;
  /** Bun.env unset (includes keys covered by template defaults). */
  templateKeysMissing: number;
  missingKeys: string[];
  /** Unset and no usable template default — needs inject / local set. */
  missingNeedsInject: string[];
  /** Unset but env.template ships a usable literal default. */
  coveredByTemplateDefault: string[];
};

export type EnvInventoryCompact = {
  schemaVersion: 4;
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
    /** Display chrome count from config/vault-map.toml (additive). */
    displayMapped?: number;
    withColor?: number;
    withIcon?: number;
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
    root: EnvRuntimeSlice;
    products: EnvRuntimeSlice;
    /** @deprecated prefer root/products — union of all templates */
    templateKeysPresent: number;
    templateKeysMissing: number;
    missingKeys: string[];
    missingNeedsInject: string[];
    coveredByTemplateDefault: string[];
  };
  /** TOML constants plane — config TOML files, flattened leaf keys, TS importers. */
  toml: {
    totalFiles: number;
    totalKeys: number;
    files: TomlPlaneFile[];
    /** TOML files with no TS/TSX reference — candidates for wiring or pruning. */
    orphanFiles: string[];
    /** Files Bun.TOML.parse rejected. */
    parseErrors: string[];
  };
  summary: {
    ownerCount: number;
    packageTouchedKeys: number;
    multiPlaneKeys: number;
    /** @deprecated prefer rootRuntimeNeedsInject — raw Bun.env gaps */
    rootRuntimeMissing: number;
    rootRuntimeNeedsInject: number;
    rootCoveredByDefault: number;
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

function runtimeSlice(keys: Set<string>, defaults: Record<string, string>): EnvRuntimeSlice {
  const missing = [...keys].filter(k => !Bun.env[k]?.trim()).sort();
  const coveredByTemplateDefault = missing.filter(k => !!defaults[k]?.trim());
  const missingNeedsInject = missing.filter(k => !defaults[k]?.trim());
  return {
    templateKeysPresent: keys.size - missing.length,
    templateKeysMissing: missing.length,
    missingKeys: missing.slice(0, 40),
    missingNeedsInject: missingNeedsInject.slice(0, 40),
    coveredByTemplateDefault: coveredByTemplateDefault.slice(0, 40),
  };
}

// ── TOML constants plane ──────────────────────────────────────────────
// Config TOML is a second constants plane next to Bun.env: values load via
// `import … with { type: 'toml' }` / Bun.file + Bun.TOML.parse and never
// touch process.env. bunfig.toml basenames are excluded from orphans —
// Bun itself is the consumer, no TS import expected.

const TOML_GLOBS = ['*.toml', 'config/**/*.toml', 'lib/**/*.toml', 'tools/**/*.toml'] as const;

const TOML_REF_RE = /["'`]([^"'`]*\.toml)["'`]/g;

function scanTextForTomlRefs(text: string): Array<{ ref: string; line: number }> {
  const out: Array<{ ref: string; line: number }> = [];
  for (const m of text.matchAll(TOML_REF_RE)) {
    if (!m[1] || m.index == null) continue;
    out.push({ ref: m[1], line: text.slice(0, m.index).split('\n').length });
  }
  return out;
}

function normalizePosix(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function tomlRefMatches(ref: string, importerFile: string, tomlPath: string): boolean {
  // Template-literal refs (`${ROOT}/config/x.toml`) — compare the static tail.
  const tail = ref.includes('}') ? ref.slice(ref.lastIndexOf('}') + 1) : ref;
  const bare = tail.startsWith('/') ? tail.slice(1) : tail;
  if (bare && (tomlPath === bare || tomlPath.endsWith('/' + bare))) return true;
  if (ref.startsWith('.')) {
    const dir = importerFile.split('/').slice(0, -1).join('/');
    return normalizePosix(`${dir}/${ref}`) === tomlPath;
  }
  return tomlPath === ref || tomlPath.endsWith('/' + ref);
}

/** Parsed TOML value tree (Bun.TOML.parse output shape, typed inward). */
type TomlValue = string | number | boolean | TomlValue[] | { [key: string]: TomlValue };

function flattenTomlKeys(value: TomlValue, prefix: string, out: string[]): void {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      flattenTomlKeys(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return;
  }
  if (prefix) out.push(prefix);
}

/** Quoted-literal matcher for TOML stems (id-based loaders) — 'default-prospect' etc.
 *  Restricted to id-like stems (contain - _ .) so generic words like 'surfaces'
 *  don't false-positive on unrelated quoted literals. */
function buildTomlStemRe(tomlPaths: string[]): RegExp | null {
  const stems = [
    ...new Set(
      tomlPaths
        .map(p => p.split('/').pop()!)
        .filter(b => !b.endsWith('bunfig.toml'))
        .map(b => b.replace(/\.toml$/, ''))
        .filter(s => s.length >= 4 && /[-_.]/.test(s))
    ),
  ];
  if (!stems.length) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`["'\`](${stems.map(esc).join('|')})["'\`]`, 'g');
}

/** Build compact inventory including packages plane + reverse owners. */
export async function buildEnvInventoryCompact(
  root: string,
  opts?: { packageNames?: string[]; includeGapReport?: boolean; maxOwners?: number }
): Promise<EnvInventoryCompact> {
  const maxOwners = opts?.maxOwners ?? 60;
  const usages: Array<{ envVar: string; kind: string; file: string; line: number }> = [];
  const defaultsIssues: EnvIssue[] = [];
  const tomlRefs: Array<{ ref: string; file: string; line: number }> = [];
  const tomlStemRefs: Array<{ stem: string; file: string; line: number }> = [];

  // Discover TOML files first — id-based loaders (loadPartnerTemplateSync('x'))
  // reference the stem as a string literal, not a `.toml` path.
  const tomlPaths: string[] = [];
  for (const pattern of TOML_GLOBS) {
    for await (const f of new Glob(pattern).scan({ cwd: root, absolute: false, onlyFiles: true })) {
      const rel = f.replace(/\\/g, '/');
      if (IGNORE_DIR_PARTS.some(p => `/${rel}/`.includes(p))) continue;
      if (!tomlPaths.includes(rel)) tomlPaths.push(rel);
    }
  }
  tomlPaths.sort();
  const tomlStemRe = buildTomlStemRe(tomlPaths);

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
    for (const t of scanTextForTomlRefs(text)) {
      tomlRefs.push({ ref: t.ref, file, line: t.line });
    }
    if (tomlStemRe) {
      for (const m of text.matchAll(tomlStemRe)) {
        if (m[1] == null || m.index == null) continue;
        tomlStemRefs.push({
          stem: m[1],
          file,
          line: text.slice(0, m.index).split('\n').length,
        });
      }
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
  const rootDefaults: Record<string, string> = {};
  const productDefaults: Record<string, string> = {};
  const allDefaults: Record<string, string> = {};

  for (const rel of ENV_INVENTORY_TEMPLATES) {
    try {
      const text = await Bun.file(`${root}/${rel}`).text();
      const parsed = parseEnvTemplate(text);
      templateKeyCount += parsed.keys.length;
      vaultRefCount += parsed.vaultRefs.length;
      const target = rel === 'env.template' ? rootTemplateKeys : productTemplateKeys;
      const defaultsTarget = rel === 'env.template' ? rootDefaults : productDefaults;
      for (const k of parsed.keys) {
        allTemplateKeys.add(k);
        target.add(k);
      }
      for (const [k, v] of Object.entries(parsed.defaults)) {
        defaultsTarget[k] = v;
        if (!(k in allDefaults)) allDefaults[k] = v;
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

  const rootRuntime = runtimeSlice(rootTemplateKeys, rootDefaults);
  const productRuntime = runtimeSlice(productTemplateKeys, productDefaults);
  const allRuntime = runtimeSlice(allTemplateKeys, allDefaults);

  // TOML constants plane — files, flattened leaf keys, reverse importer map
  const tomlParseErrors: string[] = [];
  const tomlFiles: TomlPlaneFile[] = [];
  for (const rel of tomlPaths) {
    let keys: string[] = [];
    try {
      const parsed = Bun.TOML.parse(await Bun.file(`${root}/${rel}`).text()) as TomlValue;
      flattenTomlKeys(parsed, '', keys);
    } catch {
      tomlParseErrors.push(rel);
    }
    const stem = rel
      .split('/')
      .pop()!
      .replace(/\.toml$/, '');
    const importers = [
      ...tomlRefs.filter(r => tomlRefMatches(r.ref, r.file, rel)).map(r => `${r.file}:${r.line}`),
      ...tomlStemRefs.filter(r => r.stem === stem).map(r => `${r.file}:${r.line}`),
    ];
    tomlFiles.push({
      path: rel,
      keyCount: keys.length,
      sampleKeys: keys.slice(0, 20),
      importers: [...new Set(importers)].slice(0, 6),
    });
  }
  const tomlOrphans = tomlFiles
    .filter(f => f.importers.length === 0 && !f.path.endsWith('bunfig.toml'))
    .map(f => f.path);

  const pkgIssues = defaultsIssues.filter(i => i.file.startsWith('packages/'));
  const harnessIssues = defaultsIssues.filter(i => !i.file.startsWith('packages/'));

  return {
    schemaVersion: 4,
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
      displayMapped: packagesPlane.summary.displayMapped ?? packagesPlane.displayMap?.length ?? 0,
      withColor: packagesPlane.displayMap?.filter(e => e.color).length ?? 0,
      withIcon: packagesPlane.displayMap?.filter(e => e.icon).length ?? 0,
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
      missingNeedsInject: allRuntime.missingNeedsInject,
      coveredByTemplateDefault: allRuntime.coveredByTemplateDefault,
    },
    toml: {
      totalFiles: tomlFiles.length,
      totalKeys: tomlFiles.reduce((a, f) => a + f.keyCount, 0),
      files: tomlFiles,
      orphanFiles: tomlOrphans,
      parseErrors: tomlParseErrors,
    },
    summary: {
      ownerCount: owners.length,
      packageTouchedKeys: owners.filter(o => o.packages.length > 0).length,
      multiPlaneKeys: owners.filter(o => o.planes.length > 1).length,
      rootRuntimeMissing: rootRuntime.templateKeysMissing,
      rootRuntimeNeedsInject: rootRuntime.missingNeedsInject.length,
      rootCoveredByDefault: rootRuntime.coveredByTemplateDefault.length,
      defaultsIssueCount: defaultsIssues.length,
    },
  };
}

/** Re-export policy constants for CLI help lines. */
export { SECRET_ALIASES, VAULT_REQUIRED_SECRETS };
