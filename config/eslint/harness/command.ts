// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
/**
 * Canonical ESLint argv for the FactoryWager harness.
 *
 * Keep package scripts, changed-file lint, pre-commit, and reports on the same
 * config, scope, ignores, and cache behavior.
 */
import { HARNESS_IGNORES, HARNESS_PATHS } from './rollout.ts';

export const HARNESS_ESLINT_CONFIG = 'eslint.harness.config.ts';

export type HarnessEslintOptions = {
  cacheLocation?: string;
  configPath?: string;
  files?: readonly string[];
  fix?: boolean;
  format?: string;
  ignores?: readonly string[];
  maxWarnings?: number;
  quiet?: boolean;
};

export function buildHarnessEslintArgs(options: HarnessEslintOptions = {}): string[] {
  const args = ['eslint', '--config', options.configPath ?? HARNESS_ESLINT_CONFIG];

  if (options.cacheLocation) {
    args.push('--cache', '--cache-location', options.cacheLocation, '--cache-strategy', 'content');
  }
  if (options.fix) args.push('--fix');
  if (options.quiet) args.push('--quiet');
  if (options.maxWarnings !== undefined) {
    args.push('--max-warnings', String(options.maxWarnings));
  }
  if (options.format) args.push('--format', options.format);

  for (const ignore of options.ignores ?? HARNESS_IGNORES) {
    args.push('--ignore-pattern', ignore);
  }

  args.push(...(options.files ?? HARNESS_PATHS));
  return args;
}
