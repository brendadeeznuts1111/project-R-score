#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/pm/filter?search=type%3Atoml — native TOML import
// @see https://protonpass.github.io/pass-cli/ — pass-cli
/**
 * Vault map resolver — resolve env vars from Proton Pass using vault-map.toml.
 * Uses Bun's native TOML import (type: 'toml') for config loading.
 *
 *   bun run vault:resolve              # resolve all, print status
 *   bun run vault:resolve --check      # check vault availability only
 *   bun run vault:resolve --json       # JSON output (no secrets)
 */
import { spawn, color } from 'bun';
import type vaultMap from '../config/vault-map.toml';

type VaultEntry = {
  vault: string;
  item: string;
  field: string;
  label: string;
  color?: string;
  type: string;
  filename?: string;
};

type VaultMapType = {
  metadata: { version: number };
  env: Record<string, VaultEntry>;
};

// Native TOML import via Bun
const map = (await import('../config/vault-map.toml', { with: { type: 'toml' } })) as VaultMapType;
const entries = Object.entries(map.env);

async function checkPass(): Promise<'ok' | 'no-session' | 'not-found'> {
  const p = spawn(['pass-cli', 'vault', 'list'], { stdout: 'pipe', stderr: 'pipe' });
  const c = await p.exited;
  if (c === 0) return 'ok';
  const e = await new Response(p.stderr).text();
  return e.includes('session') ? 'no-session' : 'not-found';
}

async function main() {
  const json = process.argv.includes('--json');
  const check = process.argv.includes('--check');
  const ps = await checkPass();

  if (check) {
    console.log(`v${map.metadata.version}: ${entries.length} entries, pass-cli: ${ps}`);
    return;
  }
  if (json) {
    console.log(
      JSON.stringify(
        { version: map.metadata.version, count: entries.length, keys: entries.map(([k]) => k) },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n  🔐 Vault Map v${map.metadata.version} · ${entries.length} entries (TOML)\n`);
  for (const [key, entry] of entries) {
    const c = entry.color ?? '#666';
    const colored = color(c, 'ansi') + entry.label + color('reset', 'ansi');
    console.log(
      `  ${colored.padEnd(28)} ${key.padEnd(32)} ${entry.type.padEnd(8)} ${entry.vault}/${entry.item}`
    );
  }
  console.log(`\n  pass-cli: ${ps}\n`);
  process.exit(ps === 'not-found' ? 1 : 0);
}

if (import.meta.main) main();
