#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/pm/cli/pm#cache — bun pm cache
/**
 * Health gate: `bun pm cache` path must match the effective Bun install cache
 * directory (BUN_INSTALL_CACHE_DIR or the default `~/.bun/install/cache`),
 * the reported directory must exist, and an approximate size must be reported.
 *
 *   bun run check:bun-pm-cache
 */
import { jsonOut } from '../lib/console-depth.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';
import { resolveBunInstallCacheDir } from './lib/bun-install-env.ts';
import { formatBytes } from './lib/format.ts';

const ROOT = `${import.meta.dir}/..`;
const strict = Bun.argv.includes('--strict');
const json = Bun.argv.includes('--json');
const quiet = Bun.argv.includes('--quiet');

type Check = { ok: boolean; label: string; detail?: string };

function resolveBunPmCachePath(bunPath: string): string | null {
  const proc = Bun.spawnSync([bunPath, 'pm', 'cache'], {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: ROOT,
  });
  if (proc.exitCode !== 0 || !proc.stdout) return null;
  const lines = new TextDecoder()
    .decode(proc.stdout)
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('['));
  return lines.pop() ?? null;
}

function resolveExpectedCacheDir(): string | null {
  return resolveBunInstallCacheDir(Bun.env) ?? null;
}

function dirExists(dir: string): boolean {
  return Bun.spawnSync(['test', '-d', dir], { stdout: 'ignore', stderr: 'ignore' }).exitCode === 0;
}

function approximateSizeBytes(dir: string): number | null {
  const proc = Bun.spawnSync(['du', '-sk', dir], { stdout: 'pipe', stderr: 'pipe' });
  if (proc.exitCode !== 0 || !proc.stdout) return null;
  const line = new TextDecoder().decode(proc.stdout).trim().split('\n')[0] ?? '';
  const parts = line.split('\t');
  const kb = Number.parseInt(parts[0] ?? '', 10);
  if (!Number.isFinite(kb)) return null;
  return kb * 1024;
}

function tryRealpath(p: string): string | null {
  const proc = Bun.spawnSync(['realpath', p], { stdout: 'pipe', stderr: 'ignore' });
  if (proc.exitCode !== 0 || !proc.stdout) return null;
  const out = new TextDecoder().decode(proc.stdout).trim();
  return out || null;
}

function canonicalizePath(p: string): string {
  return tryRealpath(p) ?? p.replace(/\/+$/g, '');
}

function pathsEqual(a: string, b: string): boolean {
  return canonicalizePath(a) === canonicalizePath(b);
}

async function main(): Promise<void> {
  const resolved = resolveVerificationBunBinary();
  const reported = resolveBunPmCachePath(resolved.path);
  const expected = resolveExpectedCacheDir();

  const checks: Check[] = [];

  if (!reported) {
    checks.push({ ok: false, label: 'bun pm cache', detail: 'could not read cache path' });
  } else {
    checks.push({ ok: true, label: 'bun pm cache', detail: reported });
  }

  if (!expected) {
    checks.push({
      ok: false,
      label: 'effective cache dir',
      detail: 'could not resolve BUN_INSTALL_CACHE_DIR or default ~/.bun/install/cache',
    });
  } else {
    checks.push({ ok: true, label: 'effective cache dir', detail: expected });
  }

  let mismatch: string | null = null;
  if (reported && expected) {
    if (pathsEqual(reported, expected)) {
      checks.push({
        ok: true,
        label: 'cache path match',
        detail: 'reported path matches effective cache dir',
      });
    } else {
      mismatch = `reported ${reported} does not match effective ${expected}`;
      checks.push({ ok: false, label: 'cache path match', detail: mismatch });
    }
  }

  if (reported) {
    if (!dirExists(reported)) {
      checks.push({ ok: false, label: 'cache dir exists', detail: `${reported} is missing` });
    } else {
      const bytes = approximateSizeBytes(reported);
      const size = bytes != null ? formatBytes(bytes) : null;
      checks.push({
        ok: true,
        label: 'cache dir exists',
        detail: size ? `${reported} (${size})` : reported,
      });
    }
  }

  let failed = 0;
  for (const check of checks) {
    if (!check.ok) failed++;
    if (quiet && check.ok) continue;
    const icon = check.ok ? '✅' : '❌';
    const suffix = check.detail ? ` — ${check.detail}` : '';
    console.info(`${icon} ${check.label}${suffix}`);
  }

  const ok = failed === 0;

  if (json) {
    const payload = {
      ok,
      strict,
      resolvedBun: {
        path: resolved.path,
        source: resolved.source,
        runtimeVersion: resolved.runtimeVersion,
        spawnedVersion: resolved.spawnedVersion,
        matchesRuntime: resolved.matchesRuntime,
      },
      reportedPath: reported,
      expectedPath: expected,
      mismatch,
      checks,
    };
    jsonOut(payload);
  }

  if (!ok) {
    if (!json && !quiet) {
      console.error('\n❌ bun pm cache health gate failed');
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
