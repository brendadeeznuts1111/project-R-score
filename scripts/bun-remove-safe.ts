#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Safe `bun remove` for root frozenLockfile policy.
 *
 * 1. Set root bunfig.toml frozenLockfile = false
 * 2. Run `bun remove …`
 * 3. Always restore frozenLockfile = true
 * 4. install:verify
 *
 * Usage:
 *   bun scripts/bun-remove-safe.ts left-pad
 *   bun run remove:safe -- left-pad
 *
 * @see docs/UNIFIED.md — Adding dependencies
 * @see docs/harness/tenants/monorepo-workspaces.md#bun-pm-surface-operator-cookbook
 * @see https://bun.com/docs/pm/cli/remove
 */
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn

import { joinPath } from '../lib/path-bun.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');
const BUNFIG = joinPath(REPO_ROOT, 'bunfig.toml');
const FROZEN_RE = /^frozenLockfile\s*=\s*(true|false)\s*$/m;

async function setFrozenLockfile(value: boolean): Promise<void> {
  const text = await Bun.file(BUNFIG).text();
  if (!FROZEN_RE.test(text)) {
    throw new Error(`frozenLockfile key not found in ${BUNFIG}`);
  }
  const next = text.replace(FROZEN_RE, `frozenLockfile = ${value}`);
  await Bun.write(BUNFIG, next);
}

async function run(cmd: string[], label: string): Promise<number> {
  console.info(`[remove:safe] ${label}: ${cmd.join(' ')}`);
  const proc = Bun.spawn(cmd, {
    cwd: REPO_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return await proc.exited;
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('remove:safe', Bun.argv.slice(2));
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.info(`Usage: bun scripts/bun-remove-safe.ts <package…>
Examples:
  bun scripts/bun-remove-safe.ts left-pad
  bun run remove:safe -- left-pad`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (!(await Bun.file(BUNFIG).exists())) {
    console.error(`[remove:safe] missing ${BUNFIG}`);
    process.exit(1);
  }

  let removeExit = 1;
  try {
    await setFrozenLockfile(false);
    removeExit = await run(['bun', 'remove', ...args], 'bun remove');
  } finally {
    try {
      await setFrozenLockfile(true);
      console.info('[remove:safe] restored frozenLockfile = true');
    } catch (e) {
      console.error('[remove:safe] FAILED to restore frozenLockfile = true — edit bunfig.toml now');
      console.error(e);
      process.exit(1);
    }
  }

  if (removeExit !== 0) {
    console.error(`[remove:safe] bun remove failed (exit ${removeExit}); lockfile re-frozen`);
    process.exit(removeExit);
  }

  const verifyExit = await run(['bun', 'run', 'install:verify'], 'install:verify');
  if (verifyExit !== 0) {
    console.error('[remove:safe] install:verify failed — review output');
    process.exit(verifyExit);
  }

  console.info('[remove:safe] ok — package removed and verified');
}

if (import.meta.main) {
  await main();
}
