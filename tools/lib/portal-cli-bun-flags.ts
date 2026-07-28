// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/bunfig#run-silent-suppress-reporting-the-command-being-run — --silent
// @see https://bun.com/docs/runtime/index#general-execution-options — bun run general flags
// @see https://bun.com/docs/runtime/watch-mode — --watch · --hot · --no-clear-screen
// @see https://bun.com/docs/runtime/debugger — --inspect · --inspect-wait · --inspect-brk
// @see https://bun.com/docs/runtime/auto-install — --prefer-offline · --install=fallback
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
} from '../../lib/docs/bun-source-links.ts';

/**
 * Parse Bun general execution options from portal-cli argv and rebuild spawn argv.
 *
 * Only real `bun` flags (docs/runtime). Not inventing portal-cli subcommands.
 *
 *   bun tools/portal-cli.ts --smol vault health
 *   bun tools/portal-cli.ts --console-depth=4 probe lockfile
 *   bun tools/portal-cli.ts --bun pm ls
 *
 * Flags may appear before the portal-cli command (preferred) or mixed before
 * the first non-flag token that is a known portal-cli command.
 */

/** Boolean flags (no value). Canonical: https://bun.com/docs/runtime#general-execution-options */
export const BUN_BOOL_FLAGS = new Set([
  '--silent',
  '--if-present',
  '--help', // rarely for child; still recognized so we don't treat as portal cmd
  '-h',
  '--bun',
  '-b',
  '--smol',
  '--expose-gc',
  '--no-deprecation',
  '--throw-deprecation',
  '--zero-fill-buffers',
  '--no-addons',
  '--watch',
  '--hot',
  '--no-clear-screen',
  '--no-install',
  '-i',
  '--prefer-offline',
  '--prefer-latest',
  '--preserve-symlinks',
  '--preserve-symlinks-main',
]);

/** Flags that consume the next argv token (unless --flag=value). */
export const BUN_VALUE_FLAGS = new Set([
  '--eval',
  '-e',
  '--print',
  '-p',
  '--shell',
  '--title',
  '--unhandled-rejections',
  '--console-depth',
  '--inspect',
  '--inspect-wait',
  '--inspect-brk',
  '--preload',
  '-r',
  '--require',
  '--import',
  '--install',
  '--conditions',
  '--main-fields',
  '--extension-order',
  '--tsconfig-override',
  '--define',
  '-d',
  '--drop',
  '--loader',
  '-l',
  '--env-file',
  '--cwd',
  '--config',
  '-c',
  '--port',
]);

/** portal-cli top-level commands — stop harvesting Bun flags when we hit one. */
export const PORTAL_CLI_COMMANDS = new Set([
  'snapshot',
  'probe',
  'vault',
  'capabilities',
  'capability',
  'secret',
  'badge',
  'pm',
  'scanner',
  'doctor',
  'bunfig',
  'dashboard',
  'help',
]);

export type BunExecutionParse = {
  /** Flags to insert after `bun` when spawning children */
  bunFlags: string[];
  /** Remaining argv for portal-cli (command + args) */
  rest: string[];
};

/**
 * Split argv into Bun runtime flags vs portal-cli command rest.
 * Harvests leading flags until a portal-cli command or non-flag positional.
 */
export function parseBunExecutionFlags(argv: string[]): BunExecutionParse {
  const bunFlags: string[] = [];
  const rest: string[] = [];
  let i = 0;
  let harvesting = true;

  while (i < argv.length) {
    const a = argv[i]!;

    if (!harvesting) {
      rest.push(a);
      i++;
      continue;
    }

    // End harvest on portal-cli command
    if (PORTAL_CLI_COMMANDS.has(a)) {
      harvesting = false;
      rest.push(a);
      i++;
      continue;
    }

    // --flag=value
    if (a.startsWith('--') && a.includes('=')) {
      const name = a.slice(0, a.indexOf('='));
      if (BUN_VALUE_FLAGS.has(name) || BUN_BOOL_FLAGS.has(name)) {
        bunFlags.push(a);
        i++;
        continue;
      }
      // unknown --x=y → portal rest
      harvesting = false;
      rest.push(a);
      i++;
      continue;
    }

    if (BUN_BOOL_FLAGS.has(a)) {
      // Don't swallow portal help as bun flag if it's the only intent after command
      // (help as first token is portal help — handled by not being in harvest after cmd)
      if (a === '--help' || a === '-h') {
        // bare leading --help is portal usage
        harvesting = false;
        rest.push(a);
        i++;
        continue;
      }
      bunFlags.push(a);
      i++;
      continue;
    }

    if (BUN_VALUE_FLAGS.has(a)) {
      bunFlags.push(a);
      i++;
      if (i < argv.length && !argv[i]!.startsWith('-')) {
        bunFlags.push(argv[i]!);
        i++;
      }
      continue;
    }

    // Unknown flag or positional → stop harvest (portal-cli owns it)
    harvesting = false;
    rest.push(a);
    i++;
  }

  return { bunFlags, rest };
}

/**
 * Build `bun <bunFlags…> <args…>` argv for Bun.spawn.
 * @param bunFlags from parseBunExecutionFlags
 * @param args e.g. ['test', 'tests/vault-health.test.ts'] or ['pm', 'ls']
 */
export function bunSpawnArgv(bunFlags: string[], args: string[]): string[] {
  return ['bun', ...bunFlags, ...args];
}

/**
 * Spawn bun with optional execution flags; inherit stdio.
 */
export async function spawnBunWithFlags(
  bunFlags: string[],
  args: string[],
  opts?: { cwd?: string }
): Promise<number> {
  const proc = Bun.spawn(bunSpawnArgv(bunFlags, args), {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return (await proc.exited) ?? 1;
}

/** Curated Bun runtime help for portal-cli users; intentionally not every Bun flag. */
export const BUN_FLAGS_HELP = `Runtime options (via bun):
  Development:
    bun --watch tools/portal-cli.ts ...             restart on imported file changes
    bun --hot tools/portal-cli.ts ...               soft-reload modules; preserve global state
    bun --no-clear-screen --watch tools/portal-cli.ts ...
                                                    keep output visible during reloads
  Debugging:
    bun --inspect tools/portal-cli.ts ...           attach debugger on an available port
    bun --inspect-wait tools/portal-cli.ts ...      wait for debugger before executing
    bun --inspect-brk tools/portal-cli.ts ...       break on the first line and wait
  Environment & config:
    bun --cwd /path tools/portal-cli.ts ...         set working directory
    bun --config ./bunfig.toml tools/portal-cli.ts ...
                                                    use a custom bunfig.toml
    bun --define 'process.env.NODE_ENV:"production"' tools/portal-cli.ts ...
                                                    substitute a constant at parse time
    bun --conditions custom tools/portal-cli.ts ... pass custom export conditions
  Output control:
    bun --silent tools/portal-cli.ts ...            suppress Bun's script-command echo
  Performance:
    bun --smol tools/portal-cli.ts ...              lower memory; run GC more often
  Dependency resolution:
    bun --prefer-offline tools/portal-cli.ts ...    skip cache staleness checks
    bun --install=fallback tools/portal-cli.ts ...  install missing packages only

  Canonical Bun sources:
    API reference: ${BUN_API_REFERENCE_URL}
    Type declarations: ${BUN_TYPES_SOURCE_URL}
    Repository: ${BUN_REPOSITORY_URL}

  See all options: https://bun.com/docs/runtime/index#general-execution-options
`;
