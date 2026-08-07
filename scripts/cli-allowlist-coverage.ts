#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
/**
 * CLI allowlist coverage — package.json entrypoints vs guard presence.
 *
 *   bun scripts/cli-allowlist-coverage.ts
 *   bun scripts/cli-allowlist-coverage.ts --json
 *   bun scripts/cli-allowlist-coverage.ts --write
 *
 * Goal: 100% of package.json tools/scripts entrypoints that parse `--*` long options
 * call `applyUnknownLongOptionGuard` (via registry or leaf form).
 */
import { jsonOut } from '../lib/console-depth.ts';
import {
  ALLOWED_LONG_REGISTRY,
  applyUnknownLongOptionGuardFor,
} from '../lib/docs/ref-id-tool-flags.ts';

const flags = import.meta.main
  ? applyUnknownLongOptionGuardFor('cli:allowlist:coverage', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const JSON_OUT = flags.includes('--json');
const WRITE = flags.includes('--write');

const SKIP_LEAVES = new Set([
  'help',
  'hlp',
  'version',
  'cached',
  'name-only',
  'exclude-standard',
  'others',
  'porcelain',
  'abbrev-ref',
  'oneline',
  'show-current',
  'show-toplevel',
  'diff-filter',
  'pass-with-no-tests',
]);

function extractLeaves(text: string): string[] {
  const leaves = new Set<string>();
  for (const re of [
    /["']--([a-zA-Z][a-zA-Z0-9-]*)["']/g,
    /includes\(\s*["']--([a-zA-Z][a-zA-Z0-9-]*)["']\s*\)/g,
    /has\(\s*["']--([a-zA-Z][a-zA-Z0-9-]*)["']\s*\)/g,
  ]) {
    for (const m of text.matchAll(re)) {
      const leaf = m[1]!.toLowerCase();
      if (!SKIP_LEAVES.has(leaf)) leaves.add(leaf);
    }
  }
  return [...leaves].sort();
}

async function main(): Promise<void> {
  const pkg = (await Bun.file('package.json').json()) as {
    scripts?: Record<string, string>;
  };
  const entries = new Map<string, Set<string>>();
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    for (const x of String(cmd).matchAll(
      /\b(?:bun(?:\s+run)?)\s+(?:run\s+)?((?:tools|scripts)\/[\w./-]+\.ts)/g
    )) {
      const p = x[1]!;
      if (!entries.has(p)) entries.set(p, new Set());
      entries.get(p)!.add(name);
    }
  }

  const withSurface: Array<{
    path: string;
    scripts: string[];
    guarded: boolean;
    leaves: string[];
  }> = [];

  for (const [p, names] of [...entries.entries()].sort()) {
    let text = '';
    try {
      text = await Bun.file(p).text();
    } catch {
      continue;
    }
    const leaves = extractLeaves(text);
    const guarded = text.includes('applyUnknownLongOptionGuard');
    if (leaves.length === 0 && !guarded) continue;
    withSurface.push({
      path: p,
      scripts: [...names].sort(),
      guarded,
      leaves,
    });
  }

  const guarded = withSurface.filter(r => r.guarded);
  const unguarded = withSurface.filter(r => !r.guarded && r.leaves.length > 0);
  const pct =
    withSurface.length === 0 ? 100 : Math.round((guarded.length / withSurface.length) * 1000) / 10;

  const out = {
    generatedAt: new Date().toISOString(),
    packageEntrypointsWithLongFlags: withSurface.length,
    guardedCount: guarded.length,
    unguardedCount: unguarded.length,
    coveragePercent: pct,
    registryKeys: Object.keys(ALLOWED_LONG_REGISTRY).length,
    goal: '100% of package.json tools/scripts entrypoints that parse --* long options',
    unguardedPaths: unguarded.map(r => ({
      path: r.path,
      scripts: r.scripts,
      leaves: r.leaves,
    })),
  };

  if (WRITE) {
    await Bun.$`mkdir -p artifacts/cli-allowlist-team`.quiet();
    await Bun.write(
      'artifacts/cli-allowlist-team/coverage.json',
      `${JSON.stringify(out, null, 2)}\n`
    );
    console.error(
      `wrote artifacts/cli-allowlist-team/coverage.json (${pct}% · ${guarded.length}/${withSurface.length})`
    );
  }

  if (JSON_OUT) {
    jsonOut(out); // console-ok — machine --json
    return;
  }

  console.log(`CLI allowlist coverage: ${pct}% (${guarded.length}/${withSurface.length})`);
  console.log(`ALLOWED_LONG_REGISTRY keys: ${Object.keys(ALLOWED_LONG_REGISTRY).length}`);
  console.log(`Unguarded with -- flags: ${unguarded.length}`);
  if (unguarded.length > 0) {
    console.log('\nNext 25 unguarded:');
    for (const r of unguarded.slice(0, 25)) {
      const leafPreview = r.leaves.slice(0, 8).join(' · ');
      const more = r.leaves.length > 8 ? '…' : '';
      console.log(`  ${r.path}  [${leafPreview}${more}]`);
    }
  }
}

await main();
