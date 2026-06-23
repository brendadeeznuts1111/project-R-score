#!/usr/bin/env bun
/**
 * Run bun install with documented PM env defaults:
 * - https://bun.sh/docs/pm/global-cache (BUN_INSTALL_CACHE_DIR)
 * - https://bun.sh/docs/pm/global-store (BUN_INSTALL_GLOBAL_STORE + isolated linker)
 *
 * Absolute cache path avoids literal `./~/` dirs when nested bunfigs use unexpanded `~`.
 */
const home = Bun.env.HOME ?? Bun.env.USERPROFILE;
const env = { ...Bun.env } as Record<string, string | undefined>;

if (home && !env.BUN_INSTALL_CACHE_DIR) {
  env.BUN_INSTALL_CACHE_DIR = `${home}/.bun/install/cache`;
}

// bunfig.toml sets globalStore=true; env is belt-and-suspenders for CI/subprocesses
if (env.BUN_INSTALL_GLOBAL_STORE == null) {
  env.BUN_INSTALL_GLOBAL_STORE = '1';
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: bun scripts/with-bun-cache-env.ts <bun-args...>');
  process.exit(1);
}

const proc = Bun.spawn(['bun', ...args], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: env as Record<string, string>,
});
process.exit(await proc.exited);