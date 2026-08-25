#!/usr/bin/env bun
// @see https://bun.com/docs/test/parallel#one-timings-file-per-shard — --shard
// @released --shard · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --shard · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --changed=REF / --watch
// @see https://bun.com/docs/test/parallel#isolate — --isolate
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @see https://bun.com/blog/bun-v1.4#bun-test-timings — --timings / --update-timings
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { applyHarnessUnknownLongOptionGuardFor } from '../lib/docs/flags/harness.ts';
/**
 * Day-loop wrapper for `bun test --changed` (+ parallel by default).
 *
 *   bun run test:changed                 # uncommitted · --parallel
 *   bun run test:changed -- HEAD~1
 *   bun run test:changed -- main
 *   bun run test:changed -- --main-head  # origin/main → main → HEAD~1
 *   bun run test:changed:main
 *   bun run test:changed:watch
 *   bun run test:changed -- --serial     # opt out of --parallel
 *   bun run test:changed -- --isolate    # fresh global per file, no worker pool
 *   bun run test:changed -- --shard=1/4  # shard the changed test set
 *   bun run test:changed -- --no-timings # disable the adaptive local timing cache
 *   bun run test:changed -- --dry-run    # preview selection without running tests
 *   BUN_TEST_SERIAL=1 bun run test:changed
 *
 * Short-circuit: if the change set has no code-like files, exit 0 without
 * booting the Bun test import graph (~1–2s saved on docs-only diffs).
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { affectedTestIgnorePatterns } from '../lib/harness/ci-test-groups.ts';
import { hasCodeLikeChange, listChangedFiles, resolveMainHead } from './lib/git-changed';
import { ensureDir } from './lib/fs-bun';

export const DEFAULT_TEST_TIMINGS_PATH = '.cache/bun-test-timings.json';

export type TestChangedShard = {
  index: number;
  count: number;
};

export type TestChangedArgs = {
  /** Unresolved ref from positional argv (undefined for dirty tree or --main-head). */
  ref: string | undefined;
  watch: boolean;
  dryRun: boolean;
  serial: boolean;
  isolate: boolean;
  timings: boolean;
  mainHead: boolean;
  /** Exclude CI-owned reserved suites; used only by hooks and merge harness. */
  excludeCiReserved: boolean;
  shard: TestChangedShard | undefined;
  /** Remaining flags to forward to `bun test` (e.g. --bail=1). */
  flags: string[];
  /** Positional args after the ref to forward to `bun test`. */
  restPositionals: string[];
};

export type TestChangedPreview = {
  ref: string | undefined;
  changedCount: number;
  codeLike: boolean;
  /** Undefined when codeLike is true. */
  skipReason: string | undefined;
  /** Command that would run, or '(none — would skip)'. */
  command: string;
};

export type TestChangedDeps = {
  resolveMainHead?: () => Promise<string>;
  listChangedFiles?: (opts: { since?: string; dirty?: boolean }) => Promise<string[]>;
  hasCodeLikeChange?: (files: string[]) => boolean;
};

/** Parse and validate `--shard=M/N` (1-based index, positive count). */
export function parseShard(value: string): TestChangedShard {
  const match = value.match(/^([1-9]\d*)\/([1-9]\d*)$/);
  if (!match) {
    throw new Error(`--shard must be M/N with positive integers (e.g. 1/4); got ${value}`);
  }
  const index = parseInt(match[1]!, 10);
  const count = parseInt(match[2]!, 10);
  if (index > count) {
    throw new Error(`--shard index ${index} exceeds count ${count}`);
  }
  return { index, count };
}

/** Parse `bun-test-changed` argv into a typed shape. */
export function parseTestChangedArgs(
  argv: string[],
  env: Record<string, string | undefined> = {}
): TestChangedArgs {
  const wantMainHead = argv.includes('--main-head');
  const wantSerial =
    argv.includes('--serial') || env.BUN_TEST_SERIAL === '1' || env.BUN_TEST_SERIAL === 'true';
  const wantIsolate = argv.includes('--isolate');
  const excludeCiReserved = argv.includes('--exclude-ci-reserved');
  const wantTimings = !argv.includes('--no-timings');
  const dryRun = argv.includes('--dry-run');
  const stripped = argv.filter(
    a =>
      a !== '--main-head' &&
      a !== '--serial' &&
      a !== '--dry-run' &&
      a !== '--no-timings' &&
      a !== '--exclude-ci-reserved'
  );

  // Parse --shard=M/N and remove from forwarded flags so we can validate it.
  let shard: TestChangedShard | undefined;
  const strippedWithoutShard = stripped.filter(a => {
    if (!a.startsWith('--shard')) return true;
    if (a === '--shard') return true; // space form: let bun test parse/validate
    const value = a.slice('--shard='.length);
    shard = parseShard(value);
    return false;
  });

  const flags = strippedWithoutShard.filter(a => a.startsWith('-'));
  const positionals = strippedWithoutShard.filter(a => !a.startsWith('-'));
  const restPositionals = wantMainHead ? positionals : positionals.slice(1);
  const ref = wantMainHead ? undefined : positionals[0];
  const watch = flags.includes('--watch');
  return {
    ref,
    watch,
    dryRun,
    serial: wantSerial,
    isolate: wantIsolate,
    timings: wantTimings,
    shard,
    mainHead: wantMainHead,
    excludeCiReserved,
    flags,
    restPositionals,
  };
}

/** Build the `bun test ...` argv from parsed args and the resolved ref. */
export function buildBunTestCommand(
  args: TestChangedArgs,
  resolvedRef: string | undefined
): string[] {
  const bunArgs = ['test', '--pass-with-no-tests'];
  bunArgs.push(resolvedRef ? `--changed=${resolvedRef}` : '--changed');

  if (args.excludeCiReserved) {
    for (const pattern of affectedTestIgnorePatterns()) {
      bunArgs.push('--path-ignore-patterns', pattern);
    }
  }

  const hasTimings = args.flags.some(flag => flag === '--timings' || flag.startsWith('--timings='));
  const updatesTimings = args.flags.includes('--update-timings');
  if (args.timings && !hasTimings) {
    bunArgs.push(`--timings=${DEFAULT_TEST_TIMINGS_PATH}`);
  }
  if (args.timings && !args.watch && !updatesTimings) {
    bunArgs.push('--update-timings');
  }

  // Parallel implies --isolate (fresh global per file). Opt out with --serial or --isolate.
  const hasParallel = args.flags.some(f => f === '--parallel' || f.startsWith('--parallel='));
  if (!args.serial && !args.isolate && !hasParallel) {
    bunArgs.push('--parallel');
  }

  if (args.shard) {
    bunArgs.push(`--shard=${args.shard.index}/${args.shard.count}`);
  }

  bunArgs.push(...args.flags, ...args.restPositionals);
  return bunArgs;
}

/** Build a dry-run preview without spawning Bun test. */
export function buildTestChangedPreview(
  args: TestChangedArgs,
  resolvedRef: string | undefined,
  changedFiles: string[],
  hasCodeLikeChangeImpl: (files: string[]) => boolean = hasCodeLikeChange
): TestChangedPreview {
  const codeLike = hasCodeLikeChangeImpl(changedFiles);
  const skipReason =
    changedFiles.length === 0 ? 'empty change set' : 'no code-like files in change set';
  const command = codeLike
    ? `bun ${buildBunTestCommand(args, resolvedRef).join(' ')}`
    : '(none — would skip)';
  return {
    ref: resolvedRef,
    changedCount: changedFiles.length,
    codeLike,
    skipReason: codeLike ? undefined : skipReason,
    command,
  };
}

/** Run the changed-test selector. Returns the exit code to use. */
export async function runTestChanged(
  opts: {
    argv?: string[];
    env?: Record<string, string | undefined>;
  } & TestChangedDeps = {}
): Promise<number> {
  const args = parseTestChangedArgs(
    opts.argv ?? applyHarnessUnknownLongOptionGuardFor('test:changed', Bun.argv.slice(2)),
    opts.env ?? Bun.env
  );
  const resolveHead = opts.resolveMainHead ?? resolveMainHead;
  const listChanged = opts.listChangedFiles ?? listChangedFiles;
  const codeLike = opts.hasCodeLikeChange ?? hasCodeLikeChange;
  const ref = args.mainHead ? await resolveHead() : args.ref;
  const bunArgs = buildBunTestCommand(args, ref);

  if (args.dryRun) {
    if (args.watch) {
      console.info('[dry-run] test:changed preview');
      console.info(`  ref: ${ref ?? '(dirty tree)'}`);
      console.info('  mode: watch');
      console.info(`  command: bun ${bunArgs.join(' ')}`);
      return 0;
    }

    const changed = await listChanged({ since: ref, dirty: true });
    const preview = buildTestChangedPreview(args, ref, changed, codeLike);

    console.info('[dry-run] test:changed preview');
    console.info(`  ref: ${preview.ref ?? '(dirty tree)'}`);
    console.info(`  changed files: ${preview.changedCount}`);
    console.info(`  code-like: ${preview.codeLike}`);
    if (preview.skipReason) {
      console.info(`  skip reason: ${preview.skipReason}${ref ? `; since ${ref}` : ''}`);
    }
    console.info(`  command: ${preview.command}`);
    return 0;
  }

  if (!args.watch) {
    const changed = await listChanged({ since: ref, dirty: true });
    if (changed.length === 0 || !codeLike(changed)) {
      const why = changed.length === 0 ? 'empty change set' : 'no code-like files in change set';
      console.info(`✓ test:changed — skip (${why}${ref ? `; since ${ref}` : ''})`);
      return 0;
    }
  }

  if (args.timings) {
    await ensureDir(`${import.meta.dir}/../.cache`);
  }

  const proc = Bun.spawn(bunSpawnArgs(bunArgs), {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: { ...Bun.env },
  });
  return (await proc.exited) ?? 1;
}

if (import.meta.main) {
  process.exit(await runTestChanged());
}
