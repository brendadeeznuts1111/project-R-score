#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * env-inventory.ts — map harness Bun.env usage ↔ env.template / Proton Pass vault.
 *
 *   bun run env:inventory
 *   bun run env:inventory --json
 *   bun run env:inventory --vault-only
 *   bun run env:inventory --ratchet          # fail if actionable vault gaps grow
 *   bun run env:inventory --write-baseline   # refresh gap baseline (intentional)
 *   bun run env:inventory --bake             # → public/registry/env-inventory.json
 *
 * Complements:
 *   bun run check:env-defaults   — optional config without fallback
 *   bun run proton:check         — vault inject proof
 *   bun run audit:packages:env   — packages graph + env inventory bake
 */
import { Glob } from 'bun';
import { relative, resolve } from 'node:path';
import { parseEnvTemplate, scanTextForUsages, type EnvUsage } from './lib/env-defaults-scan.ts';
import {
  SECRET_ALIASES,
  VAULT_REQUIRED_SECRETS,
  actionableVaultGaps,
  dispositionForSecret,
  type SecretDisposition,
} from './lib/env-secret-policy.ts';
import { buildEnvInventoryCompact } from './lib/env-inventory-compact.ts';
import { buildPackageVaultMap } from '../lib/harness/packages-vault-map.ts';

const ROOT = process.cwd();
const argv = Bun.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const VAULT_ONLY = argv.includes('--vault-only');
const RATCHET = argv.includes('--ratchet');
const WRITE_BASELINE = argv.includes('--write-baseline');
const BAKE = argv.includes('--bake');

const BASELINE_PATH = resolve(ROOT, 'scripts/env-secret-gap-baseline.json');
const BAKE_PATH = resolve(ROOT, 'public/registry/env-inventory.json');

const ROOTS = ['lib', 'config', 'scripts', 'tools', 'packages'];
const TEMPLATES = [
  'env.template',
  'projects/active/enterprise/bet-ticker-worker-v1.1/env.template',
  'projects/active/enterprise/cascade-mover-v3/env.template',
  'projects/active/analysis/scanner/env.template',
];

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
];

async function collectTs(): Promise<string[]> {
  const found: string[] = [];
  const glob = new Glob('**/*.ts');
  for (const root of ROOTS) {
    const base = resolve(ROOT, root);
    try {
      for await (const file of glob.scan({ cwd: base, absolute: true })) {
        if (IGNORE_DIR_PARTS.some(p => file.includes(p))) continue;
        if (IGNORE_FILE_RE.some(re => re.test(file))) continue;
        found.push(file);
      }
    } catch {
      // skip
    }
  }
  return found;
}

const usages: EnvUsage[] = [];
for (const file of await collectTs()) {
  try {
    const text = await Bun.file(file).text();
    usages.push(
      ...scanTextForUsages(file, text).map(u => ({
        ...u,
        file: relative(ROOT, u.file),
      }))
    );
  } catch {
    // skip
  }
}

const byVar = new Map<string, { kind: string; count: number; samples: string[] }>();
for (const u of usages) {
  const cur = byVar.get(u.envVar) ?? { kind: u.kind, count: 0, samples: [] };
  cur.count += 1;
  if (u.kind !== 'config' && cur.kind === 'config') cur.kind = u.kind;
  if (cur.samples.length < 3) cur.samples.push(`${u.file}:${u.line}`);
  byVar.set(u.envVar, cur);
}

type TemplateInfo = {
  path: string;
  keys: string[];
  vaultRefs: { key: string; ref: string }[];
};
const templates: TemplateInfo[] = [];
const vaultKeySet = new Set<string>();
const templateKeySet = new Set<string>();

for (const rel of TEMPLATES) {
  const path = resolve(ROOT, rel);
  if (!(await Bun.file(path).exists())) {
    templates.push({ path: rel, keys: [], vaultRefs: [] });
    continue;
  }
  const text = await Bun.file(path).text();
  const parsed = parseEnvTemplate(text);
  templates.push({ path: rel, keys: parsed.keys, vaultRefs: parsed.vaultRefs });
  for (const k of parsed.keys) templateKeySet.add(k);
  for (const v of parsed.vaultRefs) vaultKeySet.add(v.key);
}

const usedVars = [...byVar.keys()].sort();
const usedSecrets = usedVars.filter(v => byVar.get(v)?.kind === 'secret');
const usedConfig = usedVars.filter(v => byVar.get(v)?.kind === 'config');
const usedAmbient = usedVars.filter(v => byVar.get(v)?.kind === 'ambient');

const dispositions: Record<string, SecretDisposition> = {};
for (const s of usedSecrets) {
  dispositions[s] = dispositionForSecret(s, vaultKeySet);
}

const secretsVaultedOrAliased = usedSecrets.filter(s => {
  const d = dispositions[s];
  return d === 'vaulted' || d === 'alias';
});
const secretsService = usedSecrets.filter(s => dispositions[s] === 'bun-secrets-service');
const secretsDemo = usedSecrets.filter(s => dispositions[s] === 'demo');
const rawMissingTemplate = usedSecrets.filter(s => !vaultKeySet.has(s));
const actionableGaps = actionableVaultGaps(usedSecrets, vaultKeySet);

const vaultUnused = [...vaultKeySet].filter(v => !byVar.has(v)).sort();
const templateNotUsed = [...templateKeySet].filter(v => !byVar.has(v)).sort();

const report = {
  scannedRoots: ROOTS,
  usageCount: usages.length,
  uniqueVars: usedVars.length,
  byKind: {
    ambient: usedAmbient.length,
    secret: usedSecrets.length,
    config: usedConfig.length,
  },
  policy: {
    vaultRequired: [...VAULT_REQUIRED_SECRETS],
    aliases: SECRET_ALIASES,
  },
  vault: {
    templates: templates.map(t => ({
      path: t.path,
      keyCount: t.keys.length,
      vaultRefCount: t.vaultRefs.length,
      refs: t.vaultRefs,
    })),
    secretsUsedAndVaulted: usedSecrets.filter(s => dispositions[s] === 'vaulted'),
    secretsUsedAsAlias: usedSecrets.filter(s => dispositions[s] === 'alias'),
    secretsBunServiceLabels: secretsService,
    secretsDemoOnly: secretsDemo,
    secretsUsedButNotInTemplate: rawMissingTemplate,
    actionableVaultGaps: actionableGaps,
    vaultKeysNotReferencedInHarness: vaultUnused,
    templateKeysNotReferencedInHarness: templateNotUsed,
    dispositions,
  },
  topConfig: usedConfig
    .map(v => ({ var: v, count: byVar.get(v)!.count, samples: byVar.get(v)!.samples }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25),
  topSecrets: usedSecrets
    .map(v => ({
      var: v,
      count: byVar.get(v)!.count,
      disposition: dispositions[v],
      vaulted: vaultKeySet.has(v),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30),
  packagesPlane: null as Awaited<ReturnType<typeof buildPackageVaultMap>> | null,
};

// Packages plane (structured) — same scanner as audit:packages --vault
{
  const pkgNames = [
    ...new Set(
      usages
        .map(u => {
          const m = u.file.match(/^packages\/([^/]+)\//);
          return m?.[1];
        })
        .filter((x): x is string => !!x)
    ),
  ].sort();
  // Always scan all workspace package folders so dormant packages appear when they gain Bun.env
  const g = new Glob('packages/*/package.json');
  const allPkgs: string[] = [];
  for await (const f of g.scan({ cwd: ROOT, absolute: false, onlyFiles: true })) {
    const name = f.split('/')[1];
    if (name) allPkgs.push(name);
  }
  report.packagesPlane = await buildPackageVaultMap(
    ROOT,
    [...new Set([...allPkgs, ...pkgNames])].sort()
  );
}

// --- baseline / ratchet ---
type Baseline = {
  version: 1;
  updated: string;
  note: string;
  actionableVaultGaps: string[];
};

async function loadBaseline(): Promise<Baseline | null> {
  if (!(await Bun.file(BASELINE_PATH).exists())) return null;
  return (await Bun.file(BASELINE_PATH).json()) as Baseline;
}

if (WRITE_BASELINE) {
  const baseline: Baseline = {
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    note: 'Actionable Proton Pass / env.template gaps. Shrink only; --write-baseline to accept new debt intentionally.',
    actionableVaultGaps: actionableGaps,
  };
  await Bun.write(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(
    `✅ wrote ${actionableGaps.length} actionable vault gap(s) → ${relative(ROOT, BASELINE_PATH)}`
  );
  for (const g of actionableGaps) console.log(`   · ${g}`);
  process.exit(0);
}

let ratchetFailed = false;
let baseline: Baseline | null = null;
if (RATCHET) {
  baseline = await loadBaseline();
  if (!baseline) {
    console.error(`❌ no baseline at ${relative(ROOT, BASELINE_PATH)}`);
    console.error('   Create with: bun run env:inventory --write-baseline');
    process.exit(1);
  }
  const allowed = new Set(baseline.actionableVaultGaps);
  const newGaps = actionableGaps.filter(g => !allowed.has(g));
  const closed = baseline.actionableVaultGaps.filter(g => !actionableGaps.includes(g));
  if (newGaps.length > 0) {
    ratchetFailed = true;
    console.error(`❌ env vault-gap ratchet: ${newGaps.length} NEW actionable gap(s)`);
    for (const g of newGaps) console.error(`   + ${g}`);
    console.error('   Add pass:// to env.template after vaulting, or intentionally:');
    console.error('   bun run env:inventory --write-baseline');
  } else if (closed.length) {
    // Defer success line to short-output block; note closures for re-baseline
    for (const g of closed) {
      console.log(`   − ${g} (closed vs baseline — run --write-baseline to lock)`);
    }
  }
}

if (BAKE) {
  const compact = await buildEnvInventoryCompact(ROOT, { includeGapReport: false });
  await Bun.write(BAKE_PATH, JSON.stringify(compact, null, 2) + '\n');
  console.log(`→ ${relative(ROOT, BAKE_PATH)}`);
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        ...report,
        ratchet: baseline
          ? {
              baselinePath: relative(ROOT, BASELINE_PATH),
              baselineGaps: baseline.actionableVaultGaps,
              currentGaps: actionableGaps,
              failed: ratchetFailed,
            }
          : null,
      },
      null,
      2
    )
  );
  if (ratchetFailed) process.exit(1);
  process.exit(0);
}

// Ratchet-only: short output for pre-commit (full inventory without --ratchet)
if (RATCHET && !VAULT_ONLY) {
  if (!ratchetFailed) {
    console.log(
      `✅ env vault-gap ratchet OK — ${actionableGaps.length} gap(s) within baseline ` +
        `(${relative(ROOT, BASELINE_PATH)})`
    );
    if (actionableGaps.length) {
      console.log(`   gaps: ${actionableGaps.join(', ')}`);
    }
  }
  if (ratchetFailed) process.exit(1);
  process.exit(0);
}

console.log('== Env inventory (harness Bun.env ↔ env.template / vault) ==');
console.log(`Usages: ${report.usageCount}  unique vars: ${report.uniqueVars}`);
console.log(
  `  ambient=${report.byKind.ambient}  secret=${report.byKind.secret}  config=${report.byKind.config}`
);
console.log('');
console.log('Vault templates:');
for (const t of report.vault.templates) {
  console.log(`  ${t.path}: ${t.keyCount} keys, ${t.vaultRefCount} pass:// refs`);
  for (const r of t.refs) {
    console.log(`    ${r.key} ← ${r.ref}`);
  }
}
console.log('');
console.log(`Vaulted in template (${report.vault.secretsUsedAndVaulted.length}):`);
for (const s of report.vault.secretsUsedAndVaulted) console.log(`  ✓ ${s}`);
console.log(`Aliases of vaulted keys (${report.vault.secretsUsedAsAlias.length}):`);
for (const s of report.vault.secretsUsedAsAlias) {
  console.log(`  → ${s} ≡ ${SECRET_ALIASES[s] ?? s}`);
}
if (secretsService.length) {
  console.log(`Bun.secrets service labels (not vault passwords) (${secretsService.length}):`);
  for (const s of secretsService) console.log(`  · ${s}`);
}
console.log('');
console.log(`Actionable vault gaps (${actionableGaps.length}) — need Proton Pass + env.template:`);
for (const g of actionableGaps) {
  const samples = byVar.get(g)?.samples?.join(', ') ?? '';
  console.log(`  ✗ ${g}  ${samples}`);
}
if (!VAULT_ONLY) {
  console.log('');
  console.log('Top config vars (not secret/ambient):');
  for (const c of report.topConfig.slice(0, 12)) {
    console.log(`  ${c.var} ×${c.count}  e.g. ${c.samples[0] ?? ''}`);
  }
}
if (report.packagesPlane) {
  console.log('');
  console.log(
    `Packages plane: ${report.packagesPlane.summary.packagesWithEnv} pkg(s) · ${report.packagesPlane.summary.envKeyCount} keys · missingTemplate=${report.packagesPlane.summary.missingTemplate}`
  );
  for (const row of report.packagesPlane.byPackage) {
    console.log(
      `  · ${row.package}  [${row.envKeys.join(', ')}]` +
        (row.missingTemplateKeys.length ? `  missing=${row.missingTemplateKeys.join(',')}` : '')
    );
  }
}
console.log('');
console.log(
  'Related: bun run check:env-defaults · bun run proton:check · bun run env:inventory --ratchet · bun run audit:packages:env'
);

if (actionableGaps.length > 0 && !RATCHET) {
  console.log(
    `\nℹ️  ${actionableGaps.length} actionable vault gap(s). Ratchet: bun run env:inventory --ratchet`
  );
}

if (ratchetFailed) process.exit(1);
