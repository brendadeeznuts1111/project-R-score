#!/usr/bin/env bun
/**
 * Remove literal `./~` cache dirs created when Bun fails to expand `~` in
 * workspace bunfig cache paths. Safe no-op when absent.
 */
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const TILDE_CACHE = join(ROOT, '~');

if (Bun.spawnSync(['test', '-d', TILDE_CACHE]).exitCode !== 0) {
  process.exit(0);
}

Bun.spawnSync(['rm', '-rf', TILDE_CACHE]);
console.info('🧹 evicted root ./~ bun cache dir');
