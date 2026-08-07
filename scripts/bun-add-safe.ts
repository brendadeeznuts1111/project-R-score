#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Safe `bun add` for root frozenLockfile policy.
 *
 * 1. Set root bunfig.toml frozenLockfile = false
 * 2. Run `bun add …` (defaults to `--exact` unless already set, open range, or --global)
 * 3. Always restore frozenLockfile = true
 * 4. install:verify + Tier-A package.json gate
 *
 * Root bunfig already has `exact = true`; CLI `--exact` is belt-and-suspenders.
 *
 * Usage:
 *   bun scripts/bun-add-safe.ts zod              # → bun add zod --exact
 *   bun scripts/bun-add-safe.ts --dev prettier
 *   bun scripts/bun-add-safe.ts zod@^3.0.0       # keeps range; no forced --exact
 *   bun scripts/bun-add-safe.ts -g cowsay        # global; no --exact
 *   bun run add:safe -- zod
 *
 * @see docs/UNIFIED.md — Adding dependencies
 * @see https://bun.com/docs/pm/cli/add
 */
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn

import { joinPath } from '../lib/path-bun.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');
const BUNFIG = joinPath(REPO_ROOT, 'bunfig.toml');
const FROZEN_RE = /^frozenLockfile\s*=\s*(true|false)\s*$/m;

/** True when a positional package arg asks for an open semver range (not a pin). */
export function wantsOpenRange(arg: string): boolean {
  if (arg.startsWith('-')) return false;
  // scoped: @scope/name@version — version after last @
  const at = arg.lastIndexOf('@');
  if (at <= 0) return false;
  const spec = arg.slice(at + 1);
  if (!spec) return false;
  // Keep caller ranges; @latest/@3.20.0 still get --exact so package.json pins digits.
  return (
    /^[\^~*]/.test(spec) || /^[<>]=?/.test(spec) || spec.includes(' - ') || spec.endsWith('.x')
  );
}

/**
 * Default `--exact` (aligns with bunfig `exact = true`) unless the caller already
 * passed `-E`/`--exact`, `-g`/`--global`, or an intentional open range.
 */
export function withExactDefault(args: readonly string[]): string[] {
  if (args.includes('--exact') || args.includes('-E')) return [...args];
  if (args.includes('-g') || args.includes('--global')) return [...args];
  if (args.some(wantsOpenRange)) return [...args];
  return [...args, '--exact'];
}

async function setFrozenLockfile(value: boolean): Promise<void> {
  const text = await Bun.file(BUNFIG).text();
  if (!FROZEN_RE.test(text)) {
    throw new Error(`frozenLockfile key not found in ${BUNFIG}`);
  }
  const next = text.replace(FROZEN_RE, `frozenLockfile = ${value}`);
  await Bun.write(BUNFIG, next);
}

async function run(cmd: string[], label: string): Promise<number> {
  console.info(`[add:safe] ${label}: ${cmd.join(' ')}`);
  const proc = Bun.spawn(cmd, {
    cwd: REPO_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return await proc.exited;
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('add:safe', Bun.argv.slice(2));
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.info(`Usage: bun scripts/bun-add-safe.ts <bun-add-args…>
Defaults to --exact (bunfig install.exact=true). Skips inject for -g/--global, -E/--exact, or open ranges.
Examples:
  bun scripts/bun-add-safe.ts zod
  bun scripts/bun-add-safe.ts --dev prettier
  bun scripts/bun-add-safe.ts zod@^3.0.0
  bun scripts/bun-add-safe.ts -g cowsay
  bun run add:safe -- zod`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (!(await Bun.file(BUNFIG).exists())) {
    console.error(`[add:safe] missing ${BUNFIG}`);
    process.exit(1);
  }

  const addArgs = withExactDefault(args);

  let addExit = 1;
  try {
    await setFrozenLockfile(false);
    addExit = await run(['bun', 'add', ...addArgs], 'bun add');
  } finally {
    try {
      await setFrozenLockfile(true);
      console.info('[add:safe] restored frozenLockfile = true');
    } catch (e) {
      console.error('[add:safe] FAILED to restore frozenLockfile = true — edit bunfig.toml now');
      console.error(e);
      process.exit(1);
    }
  }

  if (addExit !== 0) {
    console.error(`[add:safe] bun add failed (exit ${addExit}); lockfile re-frozen`);
    process.exit(addExit);
  }

  const verifyExit = await run(['bun', 'run', 'install:verify'], 'install:verify');
  const tierExit = await run(['bun', 'scripts/check-bun-deps-tier-a.ts'], 'check-bun-deps-tier-a');

  if (verifyExit !== 0 || tierExit !== 0) {
    console.error(
      '[add:safe] verification failed — review output; Tier-A bans package.json deps (not node_modules)'
    );
    process.exit(1);
  }

  console.info('[add:safe] ok — dependency added and verified');
}

if (import.meta.main) {
  await main();
}
