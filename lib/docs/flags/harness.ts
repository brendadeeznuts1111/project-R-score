// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
/** Lean CLI flag leaf for the hot CI and affected-test path. */
type EnvMap = { [key: string]: string | undefined };

const STRIP_UNKNOWN = 'BUN_STRIP_UNKNOWN';
const LOG_UNKNOWN = 'BUN_LOG_UNKNOWN';

const ALLOWED = {
  'ci:core': ['main-head', 'quiet', 'smart', 'strict', 'fast', 'verbose', 'fail-json', 'full-lint'],
  'ci:harness': [
    'main-head',
    'quiet',
    'smart',
    'strict',
    'fast',
    'verbose',
    'fail-json',
    'full-lint',
  ],
  'test:changed': [
    'changed',
    'dry-run',
    'exclude-ci-reserved',
    'isolate',
    'main-head',
    'no-timings',
    'parallel',
    'serial',
    'shard',
    'timings',
    'update-timings',
    'watch',
  ],
} as const;

export type HarnessFlagCommand = keyof typeof ALLOWED;

export function applyHarnessUnknownLongOptionGuardFor(
  command: HarnessFlagCommand,
  argv: readonly string[],
  env: EnvMap = Bun.env
): string[] {
  const allowed = new Set(ALLOWED[command]);
  const unknown = argv
    .filter(arg => arg.startsWith('--') && arg !== '--')
    .map(arg => arg.slice(2).split('=')[0] ?? '')
    .filter(flag => flag && flag !== 'help' && flag !== 'hlp' && !allowed.has(flag as never));
  if (unknown.length === 0) return [...argv];
  const pretty = unknown.map(flag => `--${flag}`).join(', ');
  if (env[STRIP_UNKNOWN] === 'true') {
    if (env[LOG_UNKNOWN] !== 'false') {
      console.warn(
        `⚠️  Unknown long option(s) in ${command}: ${pretty} (${STRIP_UNKNOWN}=true — stripping)`
      );
    }
    const blocked = new Set(unknown);
    return argv.filter(
      arg => !arg.startsWith('--') || !blocked.has(arg.slice(2).split('=')[0] ?? '')
    );
  }
  console.error(`❌ Unknown long option(s) in ${command}: ${pretty}`);
  console.error(`Allowed: ${[...allowed].map(flag => `--${flag}`).join(', ')}`);
  process.exit(2);
}
