// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { join } from 'path';
import {
  applyBunInstallEnv,
  globalStoreLinksDir,
  resolveBunInstallCacheDir,
} from './bun-install-env.ts';

export type BunCacheMetrics = {
  collectedAt: string;
  cacheDir: string | null;
  cacheDirExists: boolean;
  sizeBytes: number | null;
  sizeHuman: string | null;
  globalStoreLinksDir: string | null;
  linksEntries: number;
  globalStoreEnv: string | null;
  bunPmCachePath: string | null;
  bunxCacheClearedEstimate: number | null;
};

function parseDuBytes(cacheDir: string): { bytes: number; human: string } | null {
  const du = Bun.spawnSync(['du', '-sk', cacheDir], { stdout: 'pipe', stderr: 'pipe' });
  if (du.exitCode !== 0 || !du.stdout) return null;
  const line = new TextDecoder().decode(du.stdout).trim().split('\n')[0] ?? '';
  const parts = line.split('\t');
  const kb = Number.parseInt(parts[0] ?? '', 10);
  if (!Number.isFinite(kb)) return null;
  const bytes = kb * 1024;
  return { bytes, human: formatBytes(bytes) };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}G`;
}

function countLinksEntries(linksDir: string): number {
  if (Bun.spawnSync(['test', '-d', linksDir]).exitCode !== 0) return 0;
  const found = Bun.spawnSync(
    ['find', linksDir, '-mindepth', '1', '-maxdepth', '1', '-type', 'd'],
    { stdout: 'pipe' }
  );
  if (found.exitCode !== 0 || !found.stdout) return 0;
  return new TextDecoder().decode(found.stdout).trim().split('\n').filter(Boolean).length;
}

/** Collect Bun install cache + global store metrics (no destructive operations). */
export async function collectBunCacheMetrics(): Promise<BunCacheMetrics> {
  const env = applyBunInstallEnv();
  const cacheDir = resolveBunInstallCacheDir(env) ?? null;
  const cacheDirExists = cacheDir != null && Bun.spawnSync(['test', '-d', cacheDir]).exitCode === 0;

  let sizeBytes: number | null = null;
  let sizeHuman: string | null = null;
  if (cacheDir && cacheDirExists) {
    const du = parseDuBytes(cacheDir);
    if (du) {
      sizeBytes = du.bytes;
      sizeHuman = formatBytes(du.bytes);
    }
  }

  const linksDir = cacheDir ? globalStoreLinksDir(cacheDir) : null;
  const linksEntries = linksDir && cacheDirExists ? countLinksEntries(linksDir) : 0;

  let bunPmCachePath: string | null = null;
  const pmCache = Bun.spawnSync(['bun', 'pm', 'cache'], { stdout: 'pipe', stderr: 'pipe' });
  if (pmCache.exitCode === 0 && pmCache.stdout) {
    bunPmCachePath =
      new TextDecoder()
        .decode(pmCache.stdout)
        .trim()
        .split('\n')
        .filter(line => line && !line.startsWith('['))
        .pop()
        ?.trim() ?? null;
  }

  return {
    collectedAt: new Date().toISOString(),
    cacheDir,
    cacheDirExists,
    sizeBytes,
    sizeHuman,
    globalStoreLinksDir: linksDir,
    linksEntries,
    globalStoreEnv: env.BUN_INSTALL_GLOBAL_STORE ?? null,
    bunPmCachePath,
    bunxCacheClearedEstimate: null,
  };
}

export type BunCacheLifecyclePlan = {
  mode: 'dry-run' | 'prune' | 'metrics-only';
  metrics: BunCacheMetrics;
  wouldPrune: boolean;
  pruneExecuted: boolean;
  pruneReason: string;
  maxBytes: number;
  note: string;
};

export function resolvePruneMaxBytes(): number {
  const raw = Bun.env.BUN_CACHE_PRUNE_MAX_MB ?? '2048';
  const mb = Number.parseInt(raw, 10);
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : 2048 * 1024 * 1024;
}

export function shouldPruneCache(
  metrics: BunCacheMetrics,
  maxBytes: number
): {
  wouldPrune: boolean;
  reason: string;
} {
  if (!metrics.cacheDirExists || metrics.sizeBytes == null) {
    return { wouldPrune: false, reason: 'cache dir missing or size unknown' };
  }
  if (metrics.sizeBytes <= maxBytes) {
    return {
      wouldPrune: false,
      reason: `under threshold (${Math.round(maxBytes / (1024 * 1024))}MB, current ${metrics.sizeHuman ?? metrics.sizeBytes})`,
    };
  }
  return {
    wouldPrune: true,
    reason: `over threshold (${Math.round(maxBytes / (1024 * 1024))}MB, current ${metrics.sizeHuman ?? metrics.sizeBytes})`,
  };
}

export function pruneAllowed(): boolean {
  if (Bun.env.BUN_CACHE_PRUNE === '1' || Bun.env.BUN_CACHE_PRUNE === 'true') return true;
  if (Bun.env.CI_SELF_HOSTED === '1' || Bun.env.CI_SELF_HOSTED === 'true') return true;
  const runner = Bun.env.RUNNER_OS ?? '';
  const name = Bun.env.RUNNER_NAME ?? '';
  if (name.toLowerCase().includes('self-hosted')) return true;
  return false;
}

/** Run `bun pm cache rm` (Bun 1.4 has no safe --dry-run; use mode=dry-run for metrics only). */
export async function runCachePrune(): Promise<{ ok: boolean; output: string }> {
  const proc = Bun.spawnSync(['bun', 'pm', 'cache', 'rm'], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: applyBunInstallEnv() as Record<string, string>,
  });
  const output = [proc.stdout, proc.stderr]
    .filter(Boolean)
    .map(chunk => new TextDecoder().decode(chunk as Uint8Array))
    .join('\n')
    .trim();
  return { ok: proc.exitCode === 0, output };
}

export async function runBunCacheLifecycle(options: {
  dryRun: boolean;
  prune: boolean;
}): Promise<BunCacheLifecyclePlan> {
  const metrics = await collectBunCacheMetrics();
  const maxBytes = resolvePruneMaxBytes();
  const { wouldPrune, reason } = shouldPruneCache(metrics, maxBytes);

  const note =
    'Bun 1.4 `bun pm cache rm --dry-run` still clears cache — use this script --dry-run for non-destructive reporting.';

  if (options.dryRun || !options.prune) {
    return {
      mode: options.dryRun ? 'dry-run' : 'metrics-only',
      metrics,
      wouldPrune,
      pruneExecuted: false,
      pruneReason: reason,
      maxBytes,
      note,
    };
  }

  if (!pruneAllowed()) {
    return {
      mode: 'dry-run',
      metrics,
      wouldPrune,
      pruneExecuted: false,
      pruneReason: `${reason}; prune blocked (set BUN_CACHE_PRUNE=1 or CI_SELF_HOSTED=1 on self-hosted runners)`,
      maxBytes,
      note,
    };
  }

  if (!wouldPrune) {
    return {
      mode: 'metrics-only',
      metrics,
      wouldPrune: false,
      pruneExecuted: false,
      pruneReason: reason,
      maxBytes,
      note,
    };
  }

  const result = await runCachePrune();
  return {
    mode: 'prune',
    metrics,
    wouldPrune: true,
    pruneExecuted: result.ok,
    pruneReason: result.ok ? `pruned: ${reason}` : `prune failed: ${result.output || 'unknown'}`,
    maxBytes,
    note,
  };
}
