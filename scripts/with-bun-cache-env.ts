#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Run bun ci / bun install with documented PM env defaults (prefer `ci` in GHA):
 * - https://bun.sh/docs/pm/global-cache (BUN_INSTALL_CACHE_DIR)
 * - https://bun.sh/docs/pm/global-store (BUN_INSTALL_GLOBAL_STORE + isolated linker)
 *
 * Absolute cache path avoids literal `./~/` dirs when nested bunfigs use unexpanded `~`.
 */
import { applyBunInstallEnv } from './lib/bun-install-env.ts';

const verbose = process.argv.includes('--verbose') || Bun.env.BUN_INSTALL_ENV_VERBOSE === '1';
const args = process.argv.slice(2).filter(a => a !== '--verbose');
const env = applyBunInstallEnv();

if (args.length === 0) {
  console.error('usage: bun scripts/with-bun-cache-env.ts [--verbose] <bun-args...>');
  process.exit(1);
}

if (verbose) {
  console.info(
    `bun install env: BUN_INSTALL_CACHE_DIR=${env.BUN_INSTALL_CACHE_DIR} BUN_INSTALL_GLOBAL_STORE=${env.BUN_INSTALL_GLOBAL_STORE}`
  );
}

const proc = Bun.spawn(['bun', ...args], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: env as Record<string, string>,
});
process.exit(await proc.exited);
