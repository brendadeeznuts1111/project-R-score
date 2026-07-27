#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * env-inventory.ts — map harness Bun.env usage ↔ env.template / Proton Pass vault.
 *
 *   bun run env:inventory
 *   bun run env:inventory --json
 *   bun run env:inventory --vault-only
 *
 * Complements:
 *   bun run check:env-defaults   — optional config without fallback
 *   bun run proton:check         — vault inject proof
 */
import { Glob } from 'bun';
import { relative, resolve } from 'node:path';
import { parseEnvTemplate, scanTextForUsages, type EnvUsage } from './lib/env-defaults-scan.ts';

const ROOT = process.cwd();
const JSON_OUT = Bun.argv.includes('--json');
const VAULT_ONLY = Bun.argv.includes('--vault-only');

const ROOTS = ['lib', 'config', 'scripts', 'tools'];
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
const IGNORE_FILE_RE = [/\.test\./, /\.spec\./, /\.d\.ts$/, /env-defaults-scan\.ts$/];

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

const secretsInVault = usedSecrets.filter(v => vaultKeySet.has(v));
const secretsMissingVault = usedSecrets.filter(v => !vaultKeySet.has(v));
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
  vault: {
    templates: templates.map(t => ({
      path: t.path,
      keyCount: t.keys.length,
      vaultRefCount: t.vaultRefs.length,
      refs: t.vaultRefs,
    })),
    secretsUsedAndVaulted: secretsInVault,
    secretsUsedButNotInTemplate: secretsMissingVault,
    vaultKeysNotReferencedInHarness: vaultUnused,
    templateKeysNotReferencedInHarness: templateNotUsed,
  },
  topConfig: usedConfig
    .map(v => ({ var: v, count: byVar.get(v)!.count, samples: byVar.get(v)!.samples }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25),
  topSecrets: usedSecrets
    .map(v => ({ var: v, count: byVar.get(v)!.count, vaulted: vaultKeySet.has(v) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30),
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
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
console.log(`Secrets used + vaulted (${secretsInVault.length}):`);
for (const s of secretsInVault) console.log(`  ✓ ${s}`);
console.log(`Secrets used but NOT in any env.template (${secretsMissingVault.length}):`);
for (const s of secretsMissingVault.slice(0, 40)) {
  const samples = byVar.get(s)?.samples?.join(', ') ?? '';
  console.log(`  ✗ ${s}  ${samples}`);
}
if (secretsMissingVault.length > 40) {
  console.log(`  ... +${secretsMissingVault.length - 40} more`);
}
if (!VAULT_ONLY) {
  console.log('');
  console.log('Top config vars (not secret/ambient):');
  for (const c of report.topConfig.slice(0, 15)) {
    console.log(`  ${c.var} ×${c.count}  e.g. ${c.samples[0] ?? ''}`);
  }
}
console.log('');
console.log(
  'Related: bun run check:env-defaults · bun run proton:check · bun run proton:inject:factorywager:reasonix'
);

// Soft signal: secrets used in harness but not template-vaulted (exit 0 — inventory not a gate)
if (secretsMissingVault.length > 0) {
  console.log(
    `\nℹ️  ${secretsMissingVault.length} secret name(s) appear in code without env.template vault refs — review for Proton Pass coverage.`
  );
}
