#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Report-only inventory of Tier-A wrapper packages in the install tree.
 *
 * Scans `bun pm ls --all` text (JSON mode is unreliable on Bun 1.4 canary),
 * then attributes each hit with `bun why`. Always exits 0 — not a CI gate.
 * Direct-dep enforcement stays in scripts/check-bun-deps-tier-a.ts.
 *
 * Usage:
 *   bun scripts/inventory-wrappers.ts
 *   bun run inventory:wrappers
 *   bun scripts/inventory-wrappers.ts --json
 *
 * @see tools/bun-prefer-matrix.ts — TIER_A_AVOID_PACKAGES
 * @see docs/UNIFIED.md — Tier-A package.json gate
 * @see https://bun.com/docs/pm/cli/pm#ls — bun pm ls / bun list --all
 * @see https://bun.com/docs/cli/why — bun why
 */
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv

import { jsonOut, logTable } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';
import { tierAAvoidPackages } from '../tools/bun-prefer-matrix.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');

type WrapperHit = {
  package: string;
  versions: string[];
  pulledBy: string;
};

function wantsJson(argv: readonly string[]): boolean {
  return argv.includes('--json');
}

async function capture(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd: REPO_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  // Tree tools sometimes write banners to stderr; merge for parsing.
  const text = `${stdout}\n${stderr}`;
  if (code !== 0 && !stdout.trim()) {
    return text;
  }
  return text;
}

/** Match `name@version` tokens for Tier-A names (incl. scoped @scope/name). */
export function findTierAInTree(tree: string, banned: readonly string[]): Map<string, Set<string>> {
  const hits = new Map<string, Set<string>>();
  // Longer names first so `@iarna/toml` wins over bare `toml` substrings.
  const ordered = [...banned].sort((a, b) => b.length - a.length);
  for (const name of ordered) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Unscoped names must not match the suffix of a scoped pkg (`@iarna/toml`).
    const re = name.startsWith('@')
      ? new RegExp(`${escaped}@([^\\s│├└─┌┐]+)`, 'g')
      : new RegExp(`(?<![/@\\w-])${escaped}@([^\\s│├└─┌┐]+)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(tree)) !== null) {
      const ver = m[1]!.replace(/[,;]+$/, '');
      let set = hits.get(name);
      if (!set) {
        set = new Set();
        hits.set(name, set);
      }
      set.add(ver);
    }
  }
  return hits;
}

/** First non-self parent line from `bun why` (best-effort). */
export function summarizeWhy(whyText: string, pkg: string): string {
  const lines = whyText
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.length > 0 && !l.startsWith('[') && !l.includes('.env'));
  // Skip the root `pkg@version` line; take the next dependency hint.
  const boxPrefix = /^[\s│├└─┌┐┘┴┬┤┼]+/u;
  for (const line of lines) {
    const cleaned = line.replace(boxPrefix, '').trim();
    if (!cleaned) continue;
    if (cleaned === pkg || cleaned.startsWith(`${pkg}@`)) continue;
    // `eslint@9.39.4 (requires ^4.0.0)`
    const bare = cleaned.split(/\s+\(/)[0]!.trim();
    if (bare && bare !== pkg && !bare.startsWith(`${pkg}@`)) return bare;
  }
  return '(see bun why)';
}

export async function collectWrapperInventory(
  banned: readonly string[] = tierAAvoidPackages()
): Promise<WrapperHit[]> {
  const tree = await capture(['bun', 'pm', 'ls', '--all']);
  const found = findTierAInTree(tree, banned);
  const rows: WrapperHit[] = [];
  for (const name of [...found.keys()].sort()) {
    const versions = [...(found.get(name) ?? [])].sort();
    const why = await capture(['bun', 'why', name]);
    rows.push({
      package: name,
      versions,
      pulledBy: summarizeWhy(why, name),
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('inventory:wrappers', Bun.argv.slice(2));
  const rows = await collectWrapperInventory();

  if (wantsJson(argv)) {
    jsonOut({
      kind: 'tier-a-wrapper-inventory',
      reportOnly: true,
      count: rows.length,
      packages: rows.map(r => ({
        name: r.package,
        versions: r.versions,
        pulledBy: r.pulledBy,
      })),
    });
    process.exit(0);
  }

  console.info('Transitive wrapper inventory (Tier-A names in install tree)');
  console.info(
    'Report-only — not a CI failure. Direct deps: bun scripts/check-bun-deps-tier-a.ts\n'
  );

  if (rows.length === 0) {
    console.info('No Tier-A wrapper package names found in `bun pm ls --all`.');
    process.exit(0);
  }

  logTable(
    rows.map(r => ({
      Package: r.package,
      Versions: r.versions.join(', '),
      'Pulled by': r.pulledBy,
    }))
  );

  console.info('\nThese are often expected transitive deps from tooling (e.g. eslint → chalk).');
  console.info('Attribute a hit: bun why <package>');
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
