#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Bun CLI flag order in package.json scripts — `--watch` / `--hot` must follow `bun`, not `bun run`.
 *
 *   bun run verify:flag-order
 *   bun tools/verify-script-flags.ts --strict   # no baseline (repo-wide cleanup)
 *
 * @see https://bun.com/docs/runtime/watch-mode
 * @see https://bun.com/docs/runtime#watch
 * @see docs/portal-foundation.md#dev-reload-watch-hot-browser-sse
 */
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const BASELINE_PATH = joinPath(import.meta.dir, 'verify-script-flags-baseline.json');

/** Anti-pattern: Bun ignores flags after `run` (passed to the script). */
const BAD = /\bbun run\s+--(watch|hot)\b/;

const IGNORE_DIR = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.tmp']);

type Violation = { file: string; script: string; cmd: string };

async function loadBaseline(): Promise<{
  keys: Set<string>;
  catalog: Map<string, { tier?: string; product?: string }>;
}> {
  const raw = JSON.parse(await Bun.file(BASELINE_PATH).text()) as {
    entries?: string[];
    catalog?: Array<{ key: string; tier?: string; product?: string }>;
  };
  const catalog = new Map((raw.catalog ?? []).map(c => [c.key, c]));
  return { keys: new Set(raw.entries ?? []), catalog };
}

async function findPackageJsonFiles(): Promise<string[]> {
  const out: string[] = [];
  const glob = new Bun.Glob('**/package.json');
  for await (const rel of glob.scan({ cwd: ROOT, onlyFiles: true })) {
    if (rel.split('/').some(seg => IGNORE_DIR.has(seg))) continue;
    out.push(rel);
  }
  return out.sort();
}

async function collectViolations(): Promise<Violation[]> {
  const violations: Violation[] = [];
  for (const rel of await findPackageJsonFiles()) {
    let pkg: { scripts?: Record<string, string> };
    try {
      pkg = JSON.parse(await Bun.file(joinPath(ROOT, rel)).text());
    } catch {
      continue;
    }
    for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
      if (typeof cmd !== 'string') continue;
      if (BAD.test(cmd)) violations.push({ file: rel, script: name, cmd });
    }
  }
  return violations;
}

function key(v: Violation): string {
  return `${v.file}:${v.script}`;
}

async function main() {
  const strict = Bun.argv.includes('--strict');
  const { keys: baseline, catalog } = await loadBaseline();
  const effectiveBaseline = strict ? new Set<string>() : baseline;
  const violations = await collectViolations();

  const unbaseline: Violation[] = [];
  for (const v of violations) {
    if (!effectiveBaseline.has(key(v))) unbaseline.push(v);
  }

  if (violations.length === 0) {
    console.log('✅ All package.json scripts have correct Bun flag order.');
    return;
  }

  if (unbaseline.length === 0 && !strict) {
    console.log(
      `✅ Bun flag order OK (${violations.length} grandfathered in verify-script-flags-baseline.json)`
    );
    return;
  }

  const show = strict ? violations : unbaseline;
  for (const v of show) {
    const meta = catalog.get(key(v));
    const tag = meta?.tier ? ` [${meta.tier}${meta.product ? `: ${meta.product}` : ''}]` : '';
    console.error(
      `❌ ${v.file}: script "${v.script}"${tag} uses "bun run --watch|--hot" — use "bun --watch ..." or "bun --hot ..."\n` +
        `   ${v.cmd}`
    );
  }
  const n = show.length;
  console.error(
    `\nFound ${n} script(s) with incorrect Bun flag order.` +
      (strict ? '' : ' Run with --strict to fail on baseline entries too.')
  );
  console.error('Fix: bun --watch path/to/script.ts  (@see docs/portal-foundation.md)');
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
