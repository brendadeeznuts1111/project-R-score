#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Monotonic ratchet for the warning-only Bun capability usage baseline.
 *
 * The first committed baseline is a bootstrap. Once present on the comparison
 * ref, keys may only be removed; new observed usage must be declared instead.
 *
 *   bun scripts/check-bun-brand-baseline.ts --staged
 *   bun scripts/check-bun-brand-baseline.ts --base <pr-base-sha>
 */

const BASELINE_PATH = 'lib/docs/bun-brand-usage-baseline.json';
const ROOT = new URL('..', import.meta.url).pathname;

type Baseline = {
  schemaVersion: 1 | 2;
  kind: 'bun-brand-usage-baseline';
  keys: string[];
};

export function addedBunBrandBaselineKeys(
  previous: readonly string[],
  current: readonly string[]
): string[] {
  const before = new Set(previous);
  return [...new Set(current)].filter(key => !before.has(key)).sort();
}

async function gitShow(spec: string): Promise<string | null> {
  const proc = Bun.spawn(['git', 'show', spec], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  return code === 0 ? out : null;
}

export function parseBunBrandBaseline(
  raw: string,
  source: string,
  allowLegacySchema = false
): Baseline {
  const value = JSON.parse(raw) as Partial<Baseline>;
  const schemaVersionIsValid =
    value.schemaVersion === 2 || (allowLegacySchema && value.schemaVersion === 1);
  if (
    !schemaVersionIsValid ||
    value.kind !== 'bun-brand-usage-baseline' ||
    !Array.isArray(value.keys) ||
    !value.keys.every(key => typeof key === 'string')
  ) {
    throw new Error(`invalid Bun brand baseline: ${source}`);
  }
  return value as Baseline;
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('bun:brand-map:baseline:ratchet', Bun.argv.slice(2));
  const staged = args.includes('--staged');
  const baseIndex = args.indexOf('--base');
  const base = baseIndex >= 0 ? args[baseIndex + 1] : 'HEAD';
  if (!base || base.startsWith('--')) {
    throw new Error('--base requires a git revision');
  }

  const currentRaw = staged
    ? await gitShow(`:${BASELINE_PATH}`)
    : await Bun.file(`${ROOT}/${BASELINE_PATH}`)
        .text()
        .catch(() => null);
  if (currentRaw == null) {
    console.info(`✅ Bun brand baseline absent (${BASELINE_PATH})`);
    return;
  }

  const previousRaw = await gitShow(`${base}:${BASELINE_PATH}`);
  if (previousRaw == null) {
    parseBunBrandBaseline(currentRaw, staged ? `index:${BASELINE_PATH}` : BASELINE_PATH);
    console.info('✅ Bun brand baseline bootstrap (no baseline on comparison ref)');
    return;
  }

  const previous = parseBunBrandBaseline(previousRaw, `${base}:${BASELINE_PATH}`, true);
  const current = parseBunBrandBaseline(
    currentRaw,
    staged ? `index:${BASELINE_PATH}` : BASELINE_PATH
  );
  const added = addedBunBrandBaselineKeys(previous.keys, current.keys);
  if (added.length > 0) {
    console.error(
      `❌ Bun brand warning baseline grew by ${added.length} key(s)\n` +
        added
          .slice(0, 20)
          .map(key => `   + ${key}`)
          .join('\n') +
        (added.length > 20 ? `\n   … ${added.length - 20} more` : '') +
        '\n   Declare the capability relationship; baseline keys may only be removed.'
    );
    process.exit(1);
  }

  console.info(
    `✅ Bun brand baseline monotonic (v${previous.schemaVersion} ${previous.keys.length} → v${current.schemaVersion} ${current.keys.length}; no additions)`
  );
}

if (import.meta.main) await main();
