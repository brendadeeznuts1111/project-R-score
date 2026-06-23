#!/usr/bin/env bun
/**
 * Remove literal `./~` cache dirs created when Bun fails to expand `~` in
 * workspace bunfig cache paths. Scans repo root and nested workspaces.
 */
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const PRUNE = [join(ROOT, 'node_modules'), join(ROOT, '.git'), join(ROOT, 'herdr-worktrees')];

const findArgs = [
  ROOT,
  ...PRUNE.flatMap(p => ['-path', p, '-prune', '-o']),
  '-name',
  '~',
  '-type',
  'd',
  '-print',
];

const found = Bun.spawnSync(['find', ...findArgs], { stdout: 'pipe' });
if (found.exitCode !== 0) {
  process.exit(found.exitCode ?? 1);
}

const dirs = new TextDecoder()
  .decode(found.stdout)
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean);

if (dirs.length === 0) {
  process.exit(0);
}

for (const dir of dirs) {
  Bun.spawnSync(['rm', '-rf', dir]);
  console.info(`🧹 evicted ${dir.replace(ROOT + '/', './')}`);
}
