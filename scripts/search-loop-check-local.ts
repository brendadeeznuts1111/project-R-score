#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type SnapshotMeta = {
  id?: string;
  createdAt?: string;
  queryPack?: string;
};

type Options = {
  mode: 'fast' | 'full';
  maxSnapshotAgeMinutes: number;
  forceSnapshot: boolean;
};

export function parseArgs(argv: string[]): Options {
  let maxSnapshotAgeMinutes = Number.parseInt(Bun.env.SEARCH_LOOP_LOCAL_MAX_SNAPSHOT_AGE_MIN || '20', 10);
  if (!Number.isFinite(maxSnapshotAgeMinutes) || maxSnapshotAgeMinutes < 0) {
    maxSnapshotAgeMinutes = 20;
  }
  let mode: 'fast' | 'full' = 'fast';
  let forceSnapshot = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') {
      const value = String(argv[i + 1] || '').trim().toLowerCase();
      if (value === 'fast' || value === 'full') {
        mode = value;
      }
      i += 1;
      continue;
    }
    if (arg === '--max-snapshot-age-minutes') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n >= 0) {
        maxSnapshotAgeMinutes = n;
      }
      i += 1;
      continue;
    }
    if (arg === '--force-snapshot') {
      forceSnapshot = true;
      continue;
    }
  }

  return { mode, maxSnapshotAgeMinutes, forceSnapshot };
}

async function readLatestSnapshot(path: string): Promise<SnapshotMeta | null> {
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as SnapshotMeta;
  } catch {
    return null;
  }
}

export function shouldReuseSnapshot(
  snapshot: SnapshotMeta | null,
  nowMs: number,
  maxAgeMinutes: number,
  requiredQueryPack = 'core_delivery_wide'
): { reuse: boolean; reason: string } {
  if (!snapshot) return { reuse: false, reason: 'latest snapshot missing' };
  if ((snapshot.queryPack || '') !== requiredQueryPack) {
    return { reuse: false, reason: `queryPack mismatch (${snapshot.queryPack || 'none'})` };
  }
  const createdAtMs = Date.parse(snapshot.createdAt || '');
  if (!Number.isFinite(createdAtMs)) {
    return { reuse: false, reason: 'latest snapshot createdAt invalid' };
  }
  const ageMinutes = (nowMs - createdAtMs) / 60000;
  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) {
    return { reuse: false, reason: 'latest snapshot age invalid' };
  }
  if (ageMinutes > maxAgeMinutes) {
    return { reuse: false, reason: `latest snapshot is stale (${ageMinutes.toFixed(2)}m)` };
  }
  return { reuse: true, reason: `latest snapshot is fresh (${ageMinutes.toFixed(2)}m)` };
}

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`command failed (${code}): ${cmd.join(' ')}`);
  }
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const forceSnapshot = options.forceSnapshot || options.mode === 'full';

  await run(['bun', 'run', 'search:bench:test']);
  await run(['bun', 'run', 'search:coverage:loc:wide']);

  const latestPath = resolve('reports/search-benchmark/latest.json');
  const snapshot = await readLatestSnapshot(latestPath);
  const freshness = shouldReuseSnapshot(snapshot, Date.now(), options.maxSnapshotAgeMinutes);

  if (forceSnapshot || !freshness.reuse) {
    if (options.mode === 'full') {
      console.log('[search:loop:check:local] forcing snapshot refresh (mode=full)');
    } else if (options.forceSnapshot) {
      console.log('[search:loop:check:local] forcing snapshot refresh (--force-snapshot)');
    } else {
      console.log(`[search:loop:check:local] refreshing snapshot: ${freshness.reason}`);
    }
    await run(['bun', 'run', 'search:bench:snapshot:core:wide:local']);
  } else {
    console.log(`[search:loop:check:local] reusing snapshot: ${freshness.reason}`);
  }

  await run(['bun', 'run', 'search:loop:status']);
  await run(['bun', 'run', 'search:loop:runbook']);
}

if (import.meta.main) {
  await main();
}
