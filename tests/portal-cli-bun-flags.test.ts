// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime#general-execution-options
import { describe, expect, test } from 'bun:test';
import {
  BUN_BOOL_FLAGS,
  BUN_FLAGS_HELP,
  BUN_VALUE_FLAGS,
  RUNTIME_FLAGS,
  assessRuntimeFlagsCatalog,
  buildBunFlagsHelp,
  buildFlagSets,
  bunSpawnArgv,
  findBunHelpMisses,
  formatFlagDisplay,
  formatRuntimeFlagsTable,
  parseBunExecutionFlags,
  parseBunHelpTokens,
} from '../tools/lib/portal-cli-bun-flags.ts';
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
} from '../lib/docs/bun-source-links.ts';

describe('parseBunExecutionFlags', () => {
  test('harvests leading --smol before vault health', () => {
    const p = parseBunExecutionFlags(['--smol', 'vault', 'health']);
    expect(p.bunFlags).toEqual(['--smol']);
    expect(p.rest).toEqual(['vault', 'health']);
  });

  test('harvests --console-depth=4 and --bun', () => {
    const p = parseBunExecutionFlags([
      '--console-depth=4',
      '--bun',
      'probe',
      'lockfile',
    ]);
    expect(p.bunFlags).toEqual(['--console-depth=4', '--bun']);
    expect(p.rest).toEqual(['probe', 'lockfile']);
  });

  test('harvests --preload with value', () => {
    const p = parseBunExecutionFlags([
      '--preload',
      './config.ts',
      'pm',
      'ls',
    ]);
    expect(p.bunFlags).toEqual(['--preload', './config.ts']);
    expect(p.rest).toEqual(['pm', 'ls']);
  });

  test('harvests the curated environment and dependency flags', () => {
    const p = parseBunExecutionFlags([
      '--no-clear-screen',
      '--cwd',
      '/tmp/project',
      '--config=./bunfig.toml',
      '--define',
      'process.env.NODE_ENV:"production"',
      '--conditions',
      'custom',
      '--prefer-offline',
      '--install=fallback',
      'probe',
      'lockfile',
    ]);
    expect(p.bunFlags).toEqual([
      '--no-clear-screen',
      '--cwd',
      '/tmp/project',
      '--config=./bunfig.toml',
      '--define',
      'process.env.NODE_ENV:"production"',
      '--conditions',
      'custom',
      '--prefer-offline',
      '--install=fallback',
    ]);
    expect(p.rest).toEqual(['probe', 'lockfile']);
  });

  test('stops at portal command; later flags stay on rest', () => {
    const p = parseBunExecutionFlags(['vault', 'health', '--update']);
    expect(p.bunFlags).toEqual([]);
    expect(p.rest).toEqual(['vault', 'health', '--update']);
  });

  test('stops at flags command (portal owns it)', () => {
    const p = parseBunExecutionFlags(['flags', '--all']);
    expect(p.bunFlags).toEqual([]);
    expect(p.rest).toEqual(['flags', '--all']);
  });

  test('unknown leading flag becomes portal rest', () => {
    const p = parseBunExecutionFlags(['--not-a-bun-flag', 'dashboard']);
    expect(p.bunFlags).toEqual([]);
    expect(p.rest[0]).toBe('--not-a-bun-flag');
  });

  test('bunSpawnArgv prefixes bun + flags', () => {
    expect(bunSpawnArgv(['--smol'], ['test', 'x.test.ts'])).toEqual([
      'bun',
      '--smol',
      'test',
      'x.test.ts',
    ]);
    expect(bunSpawnArgv([], ['pm', 'ls'])).toEqual(['bun', 'pm', 'ls']);
  });

  test('catalog SSOT drives parse sets and curated help', async () => {
    const catalog = (await Bun.file('config/runtime-flags.json').json()) as Array<{
      flag: string;
      description: string;
      curated?: boolean;
      takesValue?: boolean;
      shortcode?: string;
      helpExample?: string;
    }>;
    expect(catalog.length).toBe(RUNTIME_FLAGS.length);
    expect(catalog.length).toBeGreaterThanOrEqual(14);

    const curated = catalog.filter(r => r.curated);
    expect(curated.map(row => formatFlagDisplay(row as (typeof RUNTIME_FLAGS)[0]))).toEqual([
      '--watch',
      '--hot',
      '--no-clear-screen',
      '--inspect',
      '--inspect-wait',
      '--inspect-brk',
      '--cwd',
      '--config',
      '--define',
      '--conditions',
      '--silent',
      '--smol',
      '--prefer-offline',
      '--install=fallback',
    ]);
    expect(catalog.find(row => row.flag === '--silent')?.description).toContain(
      'script-command echo'
    );

    const sets = buildFlagSets(RUNTIME_FLAGS);
    expect(sets.boolFlags.has('--smol')).toBe(true);
    expect(sets.valueFlags.has('--cwd')).toBe(true);
    expect(sets.valueFlags.has('-c')).toBe(true); // --config shortcode
    expect(sets.boolFlags.has('-i')).toBe(true); // standalone ≡ --install=fallback
    expect(sets.boolFlags.has('--no-install')).toBe(true);
    // -i is NOT shortcode of --no-install
    const noInstall = RUNTIME_FLAGS.find(r => r.flag === '--no-install');
    expect(noInstall?.shortcode).toBeUndefined();
    const bareI = RUNTIME_FLAGS.find(r => r.flag === '-i');
    expect(bareI?.equivalentTo).toBe('--install=fallback');
    expect(BUN_BOOL_FLAGS.has('--watch')).toBe(true);
    expect(BUN_BOOL_FLAGS.has('-i')).toBe(true);
    expect(BUN_VALUE_FLAGS.has('--env-file')).toBe(true);

    const health = assessRuntimeFlagsCatalog(RUNTIME_FLAGS);
    expect(health.ok).toBe(true);
    expect(health.curated).toBe(14);
    expect(health.schemaIssues).toEqual([]);
    expect(health.shortcodeConflicts).toEqual([]);
    expect(health.deprecatedFlags).toEqual([]);
    expect(health.helpCoverageMisses).toEqual([]);
    expect(health.bunHelpMisses).toEqual([]);

    expect(BUN_FLAGS_HELP).not.toContain('--verbose');
    expect(BUN_FLAGS_HELP).toContain(`API reference: ${BUN_API_REFERENCE_URL}`);
    expect(BUN_FLAGS_HELP).toContain(`Type declarations: ${BUN_TYPES_SOURCE_URL}`);
    expect(BUN_FLAGS_HELP).toContain(`Repository: ${BUN_REPOSITORY_URL}`);
    for (const row of curated) {
      expect(BUN_FLAGS_HELP).toContain(row.flag);
    }

    // Generated help matches buildBunFlagsHelp
    expect(buildBunFlagsHelp(RUNTIME_FLAGS)).toBe(BUN_FLAGS_HELP);

    const table = formatRuntimeFlagsTable({ catalog: RUNTIME_FLAGS });
    expect(table).toContain('--watch');
    expect(table).toContain('portal flags');
    expect(table).not.toContain('--console-depth'); // non-curated hidden by default
    expect(formatRuntimeFlagsTable({ all: true, catalog: RUNTIME_FLAGS })).toContain(
      '--console-depth'
    );

    const proc = Bun.spawn(['bun', '--help'], { stdout: 'pipe', stderr: 'pipe' });
    const runtimeHelp = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    for (const row of curated) {
      expect(runtimeHelp).toContain(row.flag.split('=')[0]!);
    }
    expect(runtimeHelp).not.toMatch(/^\s+--verbose\b/m);
  });

  test('assessRuntimeFlagsCatalog detects shortcode conflicts and schema gaps', () => {
    const bad = assessRuntimeFlagsCatalog([
      {
        flag: '--config',
        shortcode: '-c',
        category: 'Environment & Config',
        version: 'Bun ≥1.0',
        description: 'a',
        url: 'https://bun.com/docs/runtime',
        takesValue: true,
        curated: true,
      },
      {
        flag: '--cwd',
        shortcode: '-c',
        category: 'Environment & Config',
        version: 'Bun ≥1.0',
        description: 'b',
        url: 'https://bun.com/docs/runtime',
        takesValue: true,
        curated: true,
      },
      {
        flag: '--broken',
        category: '',
        version: 'Bun ≥1.0',
        description: '',
        url: 'not-https',
        curated: false,
      },
    ]);
    expect(bad.ok).toBe(false);
    expect(bad.shortcodeConflicts.some(s => s.includes('-c'))).toBe(true);
    expect(bad.schemaIssues.length).toBeGreaterThan(0);
  });

  test('rejects --no-install claiming shortcode -i', () => {
    const bad = assessRuntimeFlagsCatalog([
      {
        flag: '--no-install',
        shortcode: '-i',
        category: 'Dependency Resolution',
        version: 'Bun ≥1.0',
        description: 'wrong',
        url: 'https://bun.com/docs/runtime/auto-install',
        takesValue: false,
      },
    ]);
    expect(bad.schemaIssues.some(s => s.includes('--no-install') && s.includes('-i'))).toBe(
      true
    );
  });

  test('shortcodes unique per context — same shortcode allowed across contexts', () => {
    const ok = assessRuntimeFlagsCatalog([
      {
        flag: '-i',
        category: 'Dependency Resolution',
        version: 'Bun ≥1.0',
        description: 'runtime auto-install',
        url: 'https://bun.com/docs/runtime/auto-install',
        takesValue: false,
        context: 'runtime',
        equivalentTo: '--install=fallback',
      },
      {
        flag: '--interactive',
        shortcode: '-i',
        category: 'Update',
        version: 'Bun ≥1.0',
        description: 'update interactive',
        url: 'https://bun.com/docs/pm/cli/update',
        takesValue: false,
        context: 'update',
      },
    ]);
    expect(ok.shortcodeConflicts).toEqual([]);
    expect(ok.schemaIssues).toEqual([]);
    // harvest only runtime
    const sets = buildFlagSets(ok.total ? [
      {
        flag: '-i',
        category: 'Dependency Resolution',
        version: 'Bun ≥1.0',
        description: 'runtime auto-install',
        url: 'https://bun.com/docs/runtime/auto-install',
        takesValue: false,
        context: 'runtime' as const,
      },
      {
        flag: '--interactive',
        shortcode: '-i',
        category: 'Update',
        version: 'Bun ≥1.0',
        description: 'update interactive',
        url: 'https://bun.com/docs/pm/cli/update',
        takesValue: false,
        context: 'update' as const,
      },
    ] : []);
    expect(sets.boolFlags.has('-i')).toBe(true);
    expect(sets.boolFlags.has('--interactive')).toBe(false);
  });

  test('parseBunHelpTokens + parity catches missing tokens', async () => {
    const proc = Bun.spawn(['bun', '--help'], { stdout: 'pipe', stderr: 'pipe' });
    const help = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    const { longs, shorts } = parseBunHelpTokens(help);
    expect(longs.has('--watch')).toBe(true);
    expect(shorts.has('-i')).toBe(true);
    expect(longs.has('--no-install')).toBe(true);

    const misses = findBunHelpMisses(RUNTIME_FLAGS, help);
    expect(misses).toEqual([]);

    const health = assessRuntimeFlagsCatalog(RUNTIME_FLAGS, { bunHelpText: help });
    expect(health.bunHelpMisses).toEqual([]);
    expect(health.ok).toBe(true);

    const fakeMiss = findBunHelpMisses(
      [
        {
          flag: '--not-a-real-bun-flag-xyz',
          category: 'X',
          version: 'Bun ≥1.0',
          description: 'x',
          url: 'https://bun.com/docs/runtime',
          context: 'runtime',
        },
      ],
      help
    );
    expect(fakeMiss).toContain('--not-a-real-bun-flag-xyz');
  });

  test('harvests standalone -i as bun runtime flag', () => {
    const p = parseBunExecutionFlags(['-i', 'pm', 'ls']);
    expect(p.bunFlags).toEqual(['-i']);
    expect(p.rest).toEqual(['pm', 'ls']);
  });
});
