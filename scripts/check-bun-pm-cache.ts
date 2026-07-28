#!/usr/bin/env bun
/**
 * Verify that `bun pm cache` agrees with the effective machine cache policy.
 *
 * This gate is read-only. Cache pruning remains owned by bun-cache-lifecycle.
 */
import { collectBunCacheMetrics, type BunCacheMetrics } from './lib/bun-cache-metrics';
import { normalizePath } from './lib/fs-bun';

type Check = { ok: boolean; blocking: boolean; label: string; detail: string };

function canonical(path: string): string {
  return normalizePath(path).replace(/\/+$/, '');
}

export function evaluateBunPmCache(metrics: BunCacheMetrics, strict = false): Check[] {
  const checks: Check[] = [
    {
      ok: metrics.cacheDir != null,
      blocking: true,
      label: 'effective cache path',
      detail: metrics.cacheDir ?? 'unresolved',
    },
    {
      ok: metrics.bunPmCachePath != null,
      blocking: true,
      label: 'bun pm cache path',
      detail: metrics.bunPmCachePath ?? 'unresolved',
    },
    {
      ok: metrics.cacheDirExists,
      blocking: true,
      label: 'cache directory',
      detail: metrics.cacheDirExists ? 'exists' : 'missing',
    },
    {
      ok: metrics.sizeBytes != null,
      blocking: true,
      label: 'cache size',
      detail: metrics.sizeHuman ?? 'unavailable',
    },
  ];

  if (metrics.cacheDir && metrics.bunPmCachePath) {
    checks.push({
      ok: canonical(metrics.cacheDir) === canonical(metrics.bunPmCachePath),
      blocking: strict,
      label: 'cache path agreement',
      detail: `${metrics.bunPmCachePath} ↔ ${metrics.cacheDir}`,
    });
  }
  return checks;
}

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const quiet = process.argv.includes('--quiet');
  const strict = process.argv.includes('--strict');
  const metrics = await collectBunCacheMetrics();
  const checks = evaluateBunPmCache(metrics, strict);
  const ok = checks.every(check => check.ok || !check.blocking);

  if (json) {
    console.info(JSON.stringify({ ok, checks, metrics }, null, 2)); // console-ok -- explicit --json machine output
  } else {
    for (const check of checks) {
      if (quiet && check.ok) continue;
      const icon = check.ok ? '✅' : check.blocking ? '❌' : '⚠️';
      console.info(`${icon} ${check.label} — ${check.detail}`);
    }
  }
  if (!ok) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
