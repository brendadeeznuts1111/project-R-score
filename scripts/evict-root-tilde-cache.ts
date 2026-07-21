#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Remove literal `./~` cache dirs created when Bun fails to expand `~` in
 * workspace bunfig cache paths. Scans repo root and nested workspaces.
 */
import { findTildeCacheDirs } from './lib/bun-install-env.ts';

const ROOT = `${import.meta.dir}/..`;
const dirs = findTildeCacheDirs(ROOT);

if (dirs.length === 0) {
  process.exit(0);
}

for (const dir of dirs) {
  Bun.spawnSync(['rm', '-rf', dir]);
  console.info(`🧹 evicted ${dir.replace(ROOT + '/', './')}`);
}
