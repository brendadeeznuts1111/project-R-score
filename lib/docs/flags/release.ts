// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
/**
 * Narrow flag policy for release-channel entrypoints.
 *
 * This leaf deliberately owns only commands that participate in the Bun release
 * contract. It mirrors the established unknown-option behavior without loading
 * the monorepo-wide flag registry on hot release/runtime paths.
 */
export const BUN_RELEASE_CONTRACTS_ALLOWED_LONG = [
  'all',
  'since',
  'limit',
  'concurrency',
  'check',
  'output-dir',
  'force',
  'json',
  'help',
] as const;

export const BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG = [
  'version',
  'output',
  'catalog',
  'feeds',
  'limit',
  'check',
  'json',
  'source',
  'report',
  'strict',
  'max-warnings',
  'help',
] as const;

export const BUN_RUNTIME_PIN_ALLOWED_LONG = ['json'] as const;

export const RELEASE_ALLOWED_LONG = {
  'bun:release-contracts': BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  'bun:release-knowledge': BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG,
  'bun:runtime-pin': BUN_RUNTIME_PIN_ALLOWED_LONG,
} as const;

export type ReleaseCliName = keyof typeof RELEASE_ALLOWED_LONG;
type EnvMap = Record<string, string | undefined>;

const BUN_STRIP_UNKNOWN = 'BUN_STRIP_UNKNOWN';
const BUN_LOG_UNKNOWN = 'BUN_LOG_UNKNOWN';

function unknownLongOptionLeaves(
  argv: readonly string[],
  allowedLeaves: readonly string[]
): string[] {
  const allowed = new Set(allowedLeaves.map(leaf => leaf.toLowerCase()));
  const unknown: string[] = [];
  for (const arg of argv) {
    if (!arg.startsWith('--') || arg === '--') continue;
    const leaf = arg.slice(2).split('=')[0] ?? '';
    if (!leaf || leaf === 'help' || leaf === 'hlp') continue;
    if (!allowed.has(leaf.toLowerCase())) unknown.push(leaf);
  }
  return unknown;
}

export function checkReleaseUnknownLongOptions(
  argv: readonly string[],
  allowedLeaves: readonly string[],
  env: EnvMap = Bun.env
): { argv: string[]; unknown: string[]; stripUnknown: boolean; logUnknown: boolean } {
  const unknown = unknownLongOptionLeaves(argv, allowedLeaves);
  const stripUnknown = env[BUN_STRIP_UNKNOWN] === 'true';
  const logUnknown = env[BUN_LOG_UNKNOWN] !== 'false';
  if (!stripUnknown || unknown.length === 0) {
    return { argv: [...argv], unknown, stripUnknown, logUnknown };
  }
  const dropped = new Set(unknown.map(leaf => leaf.toLowerCase()));
  return {
    argv: argv.filter(arg => {
      if (!arg.startsWith('--') || arg === '--') return true;
      const leaf = (arg.slice(2).split('=')[0] ?? '').toLowerCase();
      return !leaf || leaf === 'help' || leaf === 'hlp' || !dropped.has(leaf);
    }),
    unknown,
    stripUnknown,
    logUnknown,
  };
}

/** Preserve the repository unknown-long-option policy for release CLIs. */
export function applyReleaseUnknownLongOptionGuardFor(
  cliName: ReleaseCliName,
  argv: readonly string[],
  opts: { env?: EnvMap; onFail?: 'exit' | 'throw' } = {}
): string[] {
  const allowed = RELEASE_ALLOWED_LONG[cliName];
  const result = checkReleaseUnknownLongOptions(argv, allowed, opts.env);
  if (result.unknown.length === 0) return result.argv;

  const pretty = result.unknown.map(leaf => `--${leaf}`).join(', ');
  if (result.stripUnknown) {
    if (result.logUnknown) {
      console.warn(
        `⚠️  Unknown long option(s) in ${cliName}: ${pretty} (${BUN_STRIP_UNKNOWN}=true — stripping)`
      );
    }
    return result.argv;
  }

  console.error(`❌ Unknown long option(s) in ${cliName}: ${pretty}`);
  console.error(`Allowed: ${allowed.map(leaf => `--${leaf}`).join(', ')}`);
  if (opts.onFail === 'throw') throw new Error(`unknown flag(s): ${pretty}`);
  process.exit(2);
  return result.argv;
}
