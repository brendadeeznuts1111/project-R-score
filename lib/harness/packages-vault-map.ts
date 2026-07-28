// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Packages ↔ Proton Pass / env.template coupling.
 * Used by packages-metafile-audit --vault / --env (schema v12+).
 *
 * Never prints secret values — only key names, dispositions, and vault item titles.
 */
import {
  dispositionForSecret,
  type SecretDisposition,
} from '../../scripts/lib/env-secret-policy.ts';
import { parseEnvTemplate, scanTextForUsages } from '../../scripts/lib/env-defaults-scan.ts';
import {
  getVaultGapReport,
  listVaultGapItems,
  type VaultGapReport,
} from '../../scripts/lib/vault-gap-status.ts';
import { buildVaultMapBundle, type VaultMapEntry } from '../security/vault-map.ts';

export type PackageVaultDisposition = SecretDisposition | 'config' | 'ambient';

/** Display chrome from config/vault-map.json (optional; never secret values). */
export type PackageVaultDisplay = {
  label: string;
  color: string | null;
  icon: string | null;
  glyph: string | null;
  type: string | null;
};

export type PackageVaultEnvHit = {
  package: string;
  envKey: string;
  kind: string;
  disposition: PackageVaultDisposition;
  /** Key appears in root env.template (vaulted or plain). */
  inTemplate: boolean;
  /** Bun.env[key] is non-empty in this process (boolean only). */
  runtimePresent: boolean;
  /** pass:// ref from env.template when present. */
  passRef: string | null;
  /** Optional UI metadata when key is in vault-map. */
  display?: PackageVaultDisplay;
  samples: string[]; // brand-ok — "file:line" samples
};

export type PackageVaultAction =
  | 'wire-env-template'
  | 'vault-gap-open'
  | 'mintable-unresolved'
  | 'ok';

export type PackageVaultMap = {
  generatedAt: string;
  templateKeys: string[];
  vaultRefs: Array<{
    key: string;
    ref: string;
    label?: string;
    color?: string | null;
    icon?: string | null;
    type?: string | null;
  }>;
  /** Bun.env hits inside packages/{name}/src. */
  envHits: PackageVaultEnvHit[];
  /** Per-package rollup. */
  byPackage: Array<{
    package: string;
    envKeys: string[];
    secretKeys: string[];
    vaultedKeys: string[];
    missingTemplateKeys: string[];
  }>;
  actions: Array<{
    package: string;
    envKey: string;
    action: PackageVaultAction;
    reason: string;
  }>;
  /** Optional live vault-gap status (no secret values). */
  gap?: {
    passCliAvailable: boolean;
    passItemCount: number | null;
    humanOpen: string[];
    mintableWouldMint: string[];
    catalogFlags: Array<{ envKey: string; flag: string; title: string }>;
  };
  /** Merged config/vault-map.json + env.template (display only). */
  displayMap?: Array<
    Pick<
      VaultMapEntry,
      | 'envKey'
      | 'vault'
      | 'item'
      | 'field'
      | 'passRef'
      | 'label'
      | 'color'
      | 'icon'
      | 'glyph'
      | 'type'
      | 'inTemplate'
      | 'runtimePresent'
    >
  >;
  summary: {
    packagesWithEnv: number;
    envKeyCount: number;
    vaultedHits: number;
    missingTemplate: number;
    openVaultActions: number;
    inTemplateHits: number;
    runtimePresentHits: number;
    displayMapped?: number;
  };
};

function displayFromEntry(e: VaultMapEntry | undefined): PackageVaultDisplay | undefined {
  if (!e) return undefined;
  return {
    label: e.label,
    color: e.color,
    icon: e.icon,
    glyph: e.glyph,
    type: e.type,
  };
}

const SECRET_KINDS = new Set(['secret', 'token', 'password', 'key']);

function isSecretShaped(kind: string, envKey: string): boolean {
  if (SECRET_KINDS.has(kind)) return true;
  return /(SECRET|TOKEN|PASSWORD|API_KEY|_KEY)$/.test(envKey);
}

type TemplateState = {
  templateKeys: string[];
  vaultRefs: Array<{ key: string; ref: string }>;
  vaulted: Set<string>;
  passByKey: Map<string, string>;
  templateSet: Set<string>;
};

async function loadTemplateState(root: string): Promise<TemplateState> {
  let templateKeys: string[] = [];
  let vaultRefs: Array<{ key: string; ref: string }> = [];
  try {
    const text = await Bun.file(`${root}/env.template`).text();
    const parsed = parseEnvTemplate(text);
    templateKeys = parsed.keys;
    vaultRefs = parsed.vaultRefs;
  } catch {
    /* missing template */
  }
  return {
    templateKeys,
    vaultRefs,
    vaulted: new Set(vaultRefs.map(r => r.key)),
    passByKey: new Map(vaultRefs.map(r => [r.key, r.ref])),
    templateSet: new Set(templateKeys),
  };
}

function dispositionForUsage(
  kind: string,
  envKey: string,
  vaulted: Set<string>
): PackageVaultDisposition {
  if (kind === 'secret' || isSecretShaped(kind, envKey)) {
    return dispositionForSecret(envKey, vaulted);
  }
  return kind === 'ambient' ? 'ambient' : 'config';
}

async function scanPackageEnvHits(
  root: string,
  packageNames: string[],
  state: TemplateState,
  displayByKey: Map<string, VaultMapEntry>
): Promise<PackageVaultEnvHit[]> {
  const hits: PackageVaultEnvHit[] = [];
  for (const p of packageNames) {
    const g = new Bun.Glob(`packages/${p}/src/**/*.{ts,tsx}`);
    for await (const f of g.scan({ cwd: root, absolute: false, onlyFiles: true })) {
      let text: string;
      try {
        text = await Bun.file(`${root}/${f}`).text();
      } catch {
        continue;
      }
      for (const u of scanTextForUsages(f, text)) {
        if (u.kind === 'meta' || u.kind === 'write') continue;
        const envKey = u.envVar;
        const existing = hits.find(h => h.package === p && h.envKey === envKey);
        if (existing) {
          if (existing.samples.length < 4) existing.samples.push(`${f}:${u.line}`);
          continue;
        }
        const display = displayFromEntry(displayByKey.get(envKey));
        hits.push({
          package: p,
          envKey,
          kind: u.kind,
          disposition: dispositionForUsage(u.kind, envKey, state.vaulted),
          inTemplate: state.templateSet.has(envKey),
          runtimePresent: !!Bun.env[envKey]?.trim(),
          passRef: state.passByKey.get(envKey) ?? null,
          ...(display ? { display } : {}),
          samples: [`${f}:${u.line}`],
        });
      }
    }
  }
  hits.sort((a, b) => a.package.localeCompare(b.package) || a.envKey.localeCompare(b.envKey));
  return hits;
}

function rollupByPackage(
  packageNames: string[],
  hits: PackageVaultEnvHit[],
  templateSet: Set<string>
): PackageVaultMap['byPackage'] {
  return packageNames
    .map(packageName => {
      const pkgHits = hits.filter(h => h.package === packageName);
      const envKeys = [...new Set(pkgHits.map(h => h.envKey))].sort();
      const secretKeys = pkgHits
        .filter(h => isSecretShaped(h.kind, h.envKey))
        .map(h => h.envKey)
        .sort();
      const vaultedKeys = pkgHits.filter(h => h.disposition === 'vaulted').map(h => h.envKey);
      const missingTemplateKeys = envKeys.filter(k => {
        const hit = pkgHits.find(h => h.envKey === k);
        if (!hit || hit.disposition === 'ambient' || hit.kind === 'ambient') return false;
        return !templateSet.has(k);
      });
      return {
        package: packageName,
        envKeys,
        secretKeys,
        vaultedKeys,
        missingTemplateKeys,
      };
    })
    .filter(r => r.envKeys.length > 0);
}

function buildPackageVaultActions(
  byPackage: PackageVaultMap['byPackage'],
  hits: PackageVaultEnvHit[],
  vaulted: Set<string>
): PackageVaultMap['actions'] {
  const catalog = new Map(listVaultGapItems().map(i => [i.envKey, i]));
  const actions: PackageVaultMap['actions'] = [];
  for (const row of byPackage) {
    for (const key of row.missingTemplateKeys) {
      actions.push({
        package: row.package,
        envKey: key,
        action: 'wire-env-template',
        reason: `${key} used in packages/${row.package} but missing from env.template`,
      });
    }
    for (const key of row.envKeys) {
      const hit = hits.find(h => h.package === row.package && h.envKey === key);
      if (!hit) continue;
      if (hit.disposition === 'vault-required') {
        actions.push({
          package: row.package,
          envKey: key,
          action: 'vault-gap-open',
          reason: `${key} is human vault-required (Pass paste)`,
        });
      } else if (hit.disposition === 'runtime-mintable' && !vaulted.has(key)) {
        actions.push({
          package: row.package,
          envKey: key,
          action: 'mintable-unresolved',
          reason: `${key} mintable — prefer Pass item ${catalog.get(key)?.title ?? key}`,
        });
      }
    }
  }
  return actions;
}

async function attachLiveVaultGap(
  actions: PackageVaultMap['actions']
): Promise<PackageVaultMap['gap']> {
  const catalog = new Map(listVaultGapItems().map(i => [i.envKey, i]));
  const report: VaultGapReport = await getVaultGapReport();
  for (const open of report.human.open) {
    actions.push({
      package: '(repo)',
      envKey: open,
      action: 'vault-gap-open',
      reason: `human vault gap open — ${catalog.get(open)?.title ?? open}`,
    });
  }
  for (const m of report.mintable.wouldMint) {
    actions.push({
      package: '(repo)',
      envKey: m,
      action: 'mintable-unresolved',
      reason: `mintable unresolved — ${catalog.get(m)?.title ?? m}`,
    });
  }
  return {
    passCliAvailable: report.passCli.available,
    passItemCount: report.passCli.itemCount,
    humanOpen: report.human.open,
    mintableWouldMint: report.mintable.wouldMint,
    catalogFlags: report.items.map(i => ({
      envKey: i.envKey,
      flag: i.flag,
      title: i.title,
    })),
  };
}

/** Scan packages/{name}/src for Bun.env usage and classify vs env.template / Pass. */
export async function buildPackageVaultMap(
  root: string,
  packageNames: string[],
  opts?: { includeGapReport?: boolean }
): Promise<PackageVaultMap> {
  const state = await loadTemplateState(root);
  const bundle = await buildVaultMapBundle({ root });
  const displayByKey = new Map(bundle.entries.map(e => [e.envKey, e]));
  const hits = await scanPackageEnvHits(root, packageNames, state, displayByKey);
  const byPackage = rollupByPackage(packageNames, hits, state.templateSet);
  const actions = buildPackageVaultActions(byPackage, hits, state.vaulted);
  const gap = opts?.includeGapReport ? await attachLiveVaultGap(actions) : undefined;

  const vaultRefs = state.vaultRefs.map(r => {
    const d = displayByKey.get(r.key);
    return {
      key: r.key,
      ref: r.ref,
      ...(d
        ? {
            label: d.label,
            color: d.color,
            icon: d.icon,
            type: d.type,
          }
        : {}),
    };
  });

  const displayMap = bundle.entries.map(e => ({
    envKey: e.envKey,
    vault: e.vault,
    item: e.item,
    field: e.field,
    passRef: e.passRef,
    label: e.label,
    color: e.color,
    icon: e.icon,
    glyph: e.glyph,
    type: e.type,
    inTemplate: e.inTemplate,
    runtimePresent: e.runtimePresent,
  }));

  return {
    generatedAt: new Date().toISOString(),
    templateKeys: state.templateKeys,
    vaultRefs,
    envHits: hits,
    byPackage,
    actions: actions.sort(
      (a, b) =>
        a.package.localeCompare(b.package) ||
        a.envKey.localeCompare(b.envKey) ||
        a.action.localeCompare(b.action)
    ),
    ...(gap ? { gap } : {}),
    displayMap,
    summary: {
      packagesWithEnv: byPackage.length,
      envKeyCount: new Set(hits.map(h => h.envKey)).size,
      vaultedHits: hits.filter(h => h.disposition === 'vaulted').length,
      missingTemplate: actions.filter(a => a.action === 'wire-env-template').length,
      openVaultActions: actions.filter(a => a.action !== 'ok').length,
      inTemplateHits: hits.filter(h => h.inTemplate).length,
      runtimePresentHits: hits.filter(h => h.runtimePresent).length,
      displayMapped: displayMap.length,
    },
  };
}
