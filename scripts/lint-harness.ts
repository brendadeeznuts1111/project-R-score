#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @released --changed · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --changed · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --changed · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Canonical harness ESLint runner.
 *
 * Examples:
 *   bun scripts/lint-harness.ts --changed --quiet --max-warnings=0
 *   bun scripts/lint-harness.ts --full --cache-location=.cache/eslint
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  buildHarnessEslintArgs,
  type HarnessEslintOptions,
} from '../config/eslint/harness/command.ts';
import { HARNESS_ROOTS } from '../config/eslint/harness/rollout.ts';
import { hasCodeLikeChange, listChangedFiles, resolveMainHead } from './lib/git-changed';
import { isHarnessLintPath } from '../config/eslint/harness/rollout.ts';

const repoRoot = `${import.meta.dir}/..`;

function readOption(args: string[], index: number, name: string): [string, number] {
  const arg = args[index]!;
  const inlinePrefix = `--${name}=`;
  if (arg.startsWith(inlinePrefix)) return [arg.slice(inlinePrefix.length), index];
  const value = args[index + 1];
  if (arg === `--${name}` && value) return [value, index + 1];
  throw new Error(`Expected a value for --${name}`);
}

export type HarnessLintOptions = HarnessEslintOptions & {
  changed?: boolean;
  full?: boolean;
};

export function parseHarnessLintArgs(args: string[]): HarnessLintOptions {
  const options: HarnessLintOptions = {};
  let scope: (typeof HARNESS_ROOTS)[number] | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '--fix') {
      options.fix = true;
      continue;
    }
    if (arg === '--changed') {
      options.changed = true;
      continue;
    }
    if (arg === '--full') {
      options.full = true;
      continue;
    }
    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }
    if (arg === '--scope' || arg.startsWith('--scope=')) {
      const [value, nextIndex] = readOption(args, index, 'scope');
      index = nextIndex;
      if (!HARNESS_ROOTS.includes(value as (typeof HARNESS_ROOTS)[number])) {
        throw new Error(`Unknown harness scope: ${value}`);
      }
      scope = value as (typeof HARNESS_ROOTS)[number];
      continue;
    }
    if (arg === '--cache-location' || arg.startsWith('--cache-location=')) {
      const [value, nextIndex] = readOption(args, index, 'cache-location');
      index = nextIndex;
      options.cacheLocation = value;
      continue;
    }
    if (arg === '--max-warnings' || arg.startsWith('--max-warnings=')) {
      const [value, nextIndex] = readOption(args, index, 'max-warnings');
      index = nextIndex;
      const maxWarnings = Number(value);
      if (!Number.isInteger(maxWarnings) || maxWarnings < 0) {
        throw new Error(`Invalid --max-warnings value: ${value}`);
      }
      options.maxWarnings = maxWarnings;
      continue;
    }
    throw new Error(`Unknown lint-harness option: ${arg}`);
  }

  if (scope) {
    options.files = [`${scope}/**/*.{ts,tsx}`];
  }
  if (options.changed && options.full) {
    throw new Error('--changed and --full are mutually exclusive');
  }
  if (options.changed && scope) {
    throw new Error('--changed cannot be combined with --scope');
  }
  return options;
}

export async function resolveHarnessLintOptions(
  options: HarnessLintOptions
): Promise<HarnessEslintOptions | null> {
  const { changed, full: _full, ...eslintOptions } = options;
  const forceFull = Bun.env.HARNESS_FULL_LINT === '1' || Bun.env.HARNESS_FULL_LINT === 'true';
  if (!changed || forceFull) return eslintOptions;

  const since = await resolveMainHead();
  const changedFiles = await listChangedFiles({ since, dirty: true });
  const targets = changedFiles.filter(isHarnessLintPath);
  if (targets.length === 0) {
    const reason = hasCodeLikeChange(changedFiles)
      ? '0 harness lint paths'
      : 'no harness TypeScript';
    console.info(`✓ eslint — skip (${reason} since ${since})`);
    return null;
  }
  console.info(`eslint ${targets.length} file(s) since ${since}`);
  return { ...eslintOptions, files: targets };
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('lint', Bun.argv.slice(2));
  const options = await resolveHarnessLintOptions(parseHarnessLintArgs(argv));
  if (!options) return;
  const proc = Bun.spawn(bunSpawnArgs(buildHarnessEslintArgs(options)), {
    cwd: repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env },
  });
  process.exit((await proc.exited) ?? 1);
}

if (import.meta.main) {
  await main();
}
