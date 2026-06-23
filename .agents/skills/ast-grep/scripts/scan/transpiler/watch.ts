import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { collectScanFiles } from "./bundle-scanner.ts";
import type { ScanProfile } from "./types.ts";

const WATCH_PROFILE: ScanProfile = {
  min_severity: "info",
  transform_output: false,
  use_scan_imports: true,
  max_file_kb: 2048,
};

export type WatchOptions = {
  repo: string;
  watchPath: string;
  intervalMs?: number;
  includeLockfiles?: boolean;
  onEvent: (reason: string) => void | Promise<void>;
  signal?: AbortSignal;
};

async function fileMtime(path: string): Promise<number> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return 0;
  }
}

export async function collectWatchPaths(options: {
  repo: string;
  watchPath: string;
  includeLockfiles?: boolean;
}): Promise<string[]> {
  const rel = options.watchPath;
  const files = await collectScanFiles(options.repo, rel, WATCH_PROFILE);
  const extra: string[] = [];
  if (options.includeLockfiles !== false) {
    for (const name of ["package.json", "bun.lock", "bun.lockb"]) {
      const full = resolve(options.repo, rel, name);
      if (await fileMtime(full)) extra.push(full);
      const rootFull = resolve(options.repo, name);
      if (await fileMtime(rootFull)) extra.push(rootFull);
    }
  }
  return [...new Set([...files, ...extra])];
}

export async function runWatchLoop(options: WatchOptions): Promise<void> {
  const interval = options.intervalMs ?? 750;
  let paths = await collectWatchPaths({
    repo: options.repo,
    watchPath: options.watchPath,
    includeLockfiles: options.includeLockfiles,
  });
  const mtimes = new Map<string, number>();
  for (const p of paths) mtimes.set(p, await fileMtime(p));

  await options.onEvent("initial");

  const tick = async () => {
    const nextPaths = await collectWatchPaths({
      repo: options.repo,
      watchPath: options.watchPath,
      includeLockfiles: options.includeLockfiles,
    });
    paths = nextPaths;
    const changed: string[] = [];
    for (const p of paths) {
      const m = await fileMtime(p);
      const prev = mtimes.get(p);
      if (prev === undefined) {
        mtimes.set(p, m);
        changed.push(p);
      } else if (m !== prev) {
        mtimes.set(p, m);
        changed.push(p);
      }
    }
    if (changed.length) {
      const rel = changed.map((p) =>
        p.startsWith(options.repo) ? p.slice(options.repo.length + 1) : p,
      );
      await options.onEvent(rel.slice(0, 3).join(", ") + (rel.length > 3 ? "…" : ""));
    }
  };

  if (options.signal?.aborted) return;
  const handle = setInterval(() => void tick(), interval);
  options.signal?.addEventListener("abort", () => clearInterval(handle), { once: true });

  await new Promise<void>((resolvePromise) => {
    if (options.signal?.aborted) {
      clearInterval(handle);
      resolvePromise();
      return;
    }
    options.signal?.addEventListener("abort", () => resolvePromise(), { once: true });
  });
}