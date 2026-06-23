#!/usr/bin/env bun
/**
 * Run bun with BUN_INSTALL_CACHE_DIR set per https://bun.sh/docs/pm/global-cache
 * Prevents literal `./~/` dirs when nested bunfigs use unexpanded `~` paths.
 */
const home = Bun.env.HOME ?? Bun.env.USERPROFILE;
const env = { ...Bun.env } as Record<string, string | undefined>;
if (home && !env.BUN_INSTALL_CACHE_DIR) {
  env.BUN_INSTALL_CACHE_DIR = `${home}/.bun/install/cache`;
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