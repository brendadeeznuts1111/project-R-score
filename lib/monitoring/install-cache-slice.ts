// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Bun install cache monitoring slice for ops-snapshot / monitoring.json.
 *
 * Mirrors the non-destructive reporting logic in
 * `scripts/lib/bun-cache-metrics.ts` so the portal can show cache size
 * and threshold status without importing across the scripts/ boundary.
 */

export type InstallCacheMonitoringSlice = {
  available: boolean;
  sizeBytes: number | null;
  sizeHuman: string | null;
  thresholdBytes: number;
  thresholdHuman: string;
  wouldPrune: boolean;
  pruneReason: string;
  cacheDir: string | null;
  bunPmCachePath: string | null;
  bunPmCacheMismatch: string | null;
  collectedAt: string;
};

function resolveHome(): string | undefined {
  return Bun.env.HOME ?? Bun.env.USERPROFILE;
}

function resolveCacheDir(): string | undefined {
  const configured = Bun.env.BUN_INSTALL_CACHE_DIR;
  if (configured) {
    if (configured === '~' || configured.startsWith('~/')) {
      const home = resolveHome();
      return home ? configured.replace(/^~/, home) : undefined;
    }
    return configured;
  }
  const home = resolveHome();
  return home ? `${home}/.bun/install/cache` : undefined;
}

function resolveThresholdBytes(): number {
  const raw = Bun.env.BUN_CACHE_PRUNE_MAX_MB ?? '2048';
  const mb = Number.parseInt(raw, 10);
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : 2048 * 1024 * 1024;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function parseDuBytes(cacheDir: string): number | null {
  const du = Bun.spawnSync(['du', '-sk', cacheDir], { stdout: 'pipe', stderr: 'pipe' });
  if (du.exitCode !== 0 || !du.stdout) return null;
  const line = new TextDecoder().decode(du.stdout).trim().split('\n')[0] ?? '';
  const parts = line.split('\t');
  const kb = Number.parseInt(parts[0] ?? '', 10);
  if (!Number.isFinite(kb)) return null;
  return kb * 1024;
}

function readBunPmCachePath(): string | null {
  const pmCache = Bun.spawnSync(['bun', 'pm', 'cache'], { stdout: 'pipe', stderr: 'pipe' });
  if (pmCache.exitCode !== 0 || !pmCache.stdout) return null;
  return (
    new TextDecoder()
      .decode(pmCache.stdout)
      .trim()
      .split('\n')
      .filter(line => line && !line.startsWith('['))
      .pop()
      ?.trim() ?? null
  );
}

function tryRealpath(p: string): string | null {
  const proc = Bun.spawnSync(['realpath', p], { stdout: 'pipe', stderr: 'ignore' });
  if (proc.exitCode !== 0 || !proc.stdout) return null;
  const out = new TextDecoder().decode(proc.stdout).trim();
  return out || null;
}

function canonicalizePath(p: string): string {
  return tryRealpath(p) ?? p.replace(/\/+$/, '');
}

function resolveBunPmCacheMismatch(
  cacheDir: string | null,
  bunPmCachePath: string | null
): string | null {
  if (!cacheDir || !bunPmCachePath) return null;
  if (canonicalizePath(cacheDir) === canonicalizePath(bunPmCachePath)) return null;
  return `reported ${bunPmCachePath} does not match expected ${cacheDir}`;
}

export async function collectInstallCacheMonitoringSlice(): Promise<InstallCacheMonitoringSlice> {
  const collectedAt = new Date().toISOString();
  const cacheDir = resolveCacheDir() ?? null;
  const thresholdBytes = resolveThresholdBytes();
  const bunPmCachePath = readBunPmCachePath();

  if (!cacheDir) {
    return {
      available: false,
      sizeBytes: null,
      sizeHuman: null,
      thresholdBytes,
      thresholdHuman: formatBytes(thresholdBytes),
      wouldPrune: false,
      pruneReason: 'cache dir unknown',
      cacheDir: null,
      bunPmCachePath,
      bunPmCacheMismatch: null,
      collectedAt,
    };
  }

  const exists = Bun.spawnSync(['test', '-d', cacheDir]).exitCode === 0;
  if (!exists) {
    return {
      available: false,
      sizeBytes: null,
      sizeHuman: null,
      thresholdBytes,
      thresholdHuman: formatBytes(thresholdBytes),
      wouldPrune: false,
      pruneReason: 'cache dir does not exist',
      cacheDir,
      bunPmCachePath,
      bunPmCacheMismatch: resolveBunPmCacheMismatch(cacheDir, bunPmCachePath),
      collectedAt,
    };
  }

  const sizeBytes = parseDuBytes(cacheDir);
  const sizeHuman = sizeBytes != null ? formatBytes(sizeBytes) : null;
  const wouldPrune = sizeBytes != null && sizeBytes > thresholdBytes;
  const pruneReason =
    sizeBytes == null
      ? 'cache size unknown'
      : wouldPrune
        ? `over threshold (${formatBytes(thresholdBytes)}, current ${sizeHuman})`
        : `under threshold (${formatBytes(thresholdBytes)}, current ${sizeHuman})`;

  return {
    available: true,
    sizeBytes,
    sizeHuman,
    thresholdBytes,
    thresholdHuman: formatBytes(thresholdBytes),
    wouldPrune,
    pruneReason,
    cacheDir,
    bunPmCachePath,
    bunPmCacheMismatch: resolveBunPmCacheMismatch(cacheDir, bunPmCachePath),
    collectedAt,
  };
}
