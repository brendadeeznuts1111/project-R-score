// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Non-destructive Bun install-cache observation used by the install-hygiene bake.
 *
 * This mirrors the reporting side of `scripts/lib/bun-cache-metrics.ts` without
 * importing across the lib/ → scripts/ boundary.
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

function readDirectorySize(cacheDir: string): number | null {
  const result = Bun.spawnSync(['du', '-sk', cacheDir], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0 || !result.stdout) return null;
  const firstLine = new TextDecoder().decode(result.stdout).trim().split('\n')[0] ?? '';
  const kilobytes = Number.parseInt(firstLine.split('\t')[0] ?? '', 10);
  return Number.isFinite(kilobytes) ? kilobytes * 1024 : null;
}

function readBunPmCachePath(): string | null {
  const result = Bun.spawnSync(['bun', 'pm', 'cache'], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0 || !result.stdout) return null;
  return (
    new TextDecoder()
      .decode(result.stdout)
      .trim()
      .split('\n')
      .filter(line => line && !line.startsWith('['))
      .pop()
      ?.trim() ?? null
  );
}

function canonicalizePath(path: string): string {
  const result = Bun.spawnSync(['realpath', path], { stdout: 'pipe', stderr: 'ignore' });
  if (result.exitCode === 0 && result.stdout) {
    const resolved = new TextDecoder().decode(result.stdout).trim();
    if (resolved) return resolved;
  }
  return path.replace(/\/+$/, '');
}

function cachePathMismatch(cacheDir: string | null, bunPmCachePath: string | null): string | null {
  if (!cacheDir || !bunPmCachePath) return null;
  if (canonicalizePath(cacheDir) === canonicalizePath(bunPmCachePath)) return null;
  return `reported ${bunPmCachePath} does not match expected ${cacheDir}`;
}

export async function collectInstallCacheMonitoringSlice(): Promise<InstallCacheMonitoringSlice> {
  const collectedAt = new Date().toISOString();
  const cacheDir = resolveCacheDir() ?? null;
  const thresholdBytes = resolveThresholdBytes();
  const thresholdHuman = formatBytes(thresholdBytes);
  const bunPmCachePath = readBunPmCachePath();

  if (!cacheDir) {
    return {
      available: false,
      sizeBytes: null,
      sizeHuman: null,
      thresholdBytes,
      thresholdHuman,
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
      thresholdHuman,
      wouldPrune: false,
      pruneReason: 'cache dir does not exist',
      cacheDir,
      bunPmCachePath,
      bunPmCacheMismatch: cachePathMismatch(cacheDir, bunPmCachePath),
      collectedAt,
    };
  }

  const sizeBytes = readDirectorySize(cacheDir);
  const sizeHuman = sizeBytes == null ? null : formatBytes(sizeBytes);
  const wouldPrune = sizeBytes != null && sizeBytes > thresholdBytes;
  const pruneReason =
    sizeBytes == null
      ? 'cache size unknown'
      : wouldPrune
        ? `over threshold (${thresholdHuman}, current ${sizeHuman})`
        : `under threshold (${thresholdHuman}, current ${sizeHuman})`;

  return {
    available: true,
    sizeBytes,
    sizeHuman,
    thresholdBytes,
    thresholdHuman,
    wouldPrune,
    pruneReason,
    cacheDir,
    bunPmCachePath,
    bunPmCacheMismatch: cachePathMismatch(cacheDir, bunPmCachePath),
    collectedAt,
  };
}
