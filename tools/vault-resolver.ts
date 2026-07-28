#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://protonpass.github.io/pass-cli/ — pass-cli
// @see https://protonpass.github.io/pass-cli/commands/contents/inject/ — inject
// @see https://protonpass.github.io/pass-cli/commands/contents/secret-references/ — pass:// URIs
/**
 * Vault map resolver — list env→vault inventory (no secret values), inject, SSH.
 *
 * Uses buildVaultMapBundle (env.template pass:// wins paths; vault-map.toml chrome).
 * Real pass-cli only: inject -i/-o/-f · ssh-agent load --vault-name · vault list.
 *
 *   bun run vault:resolve                  # list entries (status lines)
 *   bun run vault:resolve --check          # pass-cli availability + entry count
 *   bun run vault:resolve --json           # JSON inventory (no secrets)
 *   bun run vault:resolve --inject         # pass-cli inject env.template → .env
 *   bun run vault:resolve --ssh            # pass-cli ssh-agent load factorywager
 *   bun run vault:resolve --inject --ssh
 *
 * Offline inventory gate: portal-cli vault health (snapshot SSOT).
 * Live health bake: bun run vault:health:bake → /portal/vault/
 */
import { semver } from 'bun';
import { buildVaultMapBundle, colorize, type VaultMapEntry } from '../lib/security/vault-map.ts';
import { runPassCli } from './portal-secret.ts';

const BUN_MIN = '1.4.0';
if (!semver.satisfies(Bun.version, `>=${BUN_MIN}`)) {
  console.error(`  ❌ Bun ${Bun.version} < ${BUN_MIN} — upgrade required`);
  process.exit(1);
}

type PassStatus = 'ok' | 'no-session' | 'error' | 'not-found';

async function checkPass(): Promise<PassStatus> {
  const bin = Bun.which('pass-cli');
  if (!bin) return 'not-found';
  // capturePassCli inherits stderr (operator-facing); pipe both for status probe.
  try {
    const proc = Bun.spawn([bin, 'vault', 'list'], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'ignore',
    });
    const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    if ((code ?? 1) === 0) return 'ok';
    const err = stderr.toLowerCase();
    if (
      err.includes('session') ||
      err.includes('login') ||
      err.includes('authenticated') ||
      err.includes('database') ||
      err.includes('encryption') ||
      err.includes('not a database') ||
      err.includes('logout --force')
    ) {
      return 'no-session';
    }
    return 'error';
  } catch {
    return 'error';
  }
}

function inventoryRow(e: VaultMapEntry): {
  envKey: string;
  vault: string | null;
  item: string | null;
  field: string | null;
  passRef: string | null;
  label: string;
  type: string | null;
  inTemplate: boolean;
} {
  return {
    envKey: e.envKey,
    vault: e.vault,
    item: e.item,
    field: e.field,
    passRef: e.passRef,
    label: e.label,
    type: e.type,
    inTemplate: e.inTemplate,
  };
}

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const check = process.argv.includes('--check');
  const inject = process.argv.includes('--inject');
  const ssh = process.argv.includes('--ssh');

  const bundle = await buildVaultMapBundle({ env: {} });
  const entries = bundle.entries.filter(e => e.vault && e.item);
  const ps = await checkPass();

  if (ps === 'not-found') {
    console.error('  ❌ pass-cli not found — install from https://protonpass.github.io/pass-cli/');
    if (!check && !json) process.exit(1);
  }

  if (check) {
    console.log(
      `vault-map: ${entries.length} refs · pass-cli: ${ps} · Bun ${Bun.version} · source ${bundle.sourceMap}`
    );
    process.exit(ps === 'not-found' ? 1 : 0);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          kind: 'vault-resolve-inventory',
          sourceMap: bundle.sourceMap,
          template: bundle.template,
          passCli: ps,
          bun: Bun.version,
          count: entries.length,
          entries: entries.map(inventoryRow),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n  🔐 Vault map · ${entries.length} refs · pass-cli: ${ps} · Bun ${Bun.version}\n`);
  for (const e of entries) {
    const label = colorize(e.label.padEnd(26), e.color) || e.label.padEnd(26);
    const path = [e.vault, e.item].filter(Boolean).join('/');
    const type = (e.type ?? '—').padEnd(8);
    const tpl = e.inTemplate ? 'T' : '·';
    console.log(`  ${tpl} ${label} ${e.envKey.padEnd(30)} ${type} ${path}`);
  }
  console.log(`\n  T = in env.template · · = display-only (vault-map.toml)\n`);

  if (inject) {
    if (ps !== 'ok') {
      console.error(`  ❌ --inject requires pass-cli session (got: ${ps})`);
      console.error('     source scripts/agent-env.sh factorywager');
      process.exit(1);
    }
    console.log('  📝 pass-cli inject -i env.template -o .env -f …');
    const code = await runPassCli([
      'inject',
      '--in-file',
      'env.template',
      '--out-file',
      '.env',
      '--force',
    ]);
    if (code !== 0) {
      console.error('  ❌ Inject failed');
      process.exit(code);
    }
    console.log('  ✅ .env written from vault (no values printed)');
  }

  if (ssh) {
    if (ps !== 'ok') {
      console.error(`  ❌ --ssh requires pass-cli session (got: ${ps})`);
      console.error('     source scripts/agent-env.sh factorywager');
      process.exit(1);
    }
    console.log('  🔑 pass-cli ssh-agent load --vault-name factorywager …');
    const code = await runPassCli(['ssh-agent', 'load', '--vault-name', 'factorywager']);
    if (code !== 0) {
      console.error('  ❌ SSH agent load failed');
      process.exit(code);
    }
    console.log('  ✅ SSH keys loaded (if any in vault)');
  }

  process.exit(0);
}

if (import.meta.main) {
  await main();
}
