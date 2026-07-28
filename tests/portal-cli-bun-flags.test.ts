// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime#general-execution-options
import { describe, expect, test } from 'bun:test';
import {
  BUN_FLAGS_HELP,
  bunSpawnArgv,
  parseBunExecutionFlags,
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

  test('curated catalog and help expose only the grounded portal flags', async () => {
    const catalog = (await Bun.file('config/runtime-flags.json').json()) as Array<{
      flag: string;
      description: string;
    }>;
    expect(catalog.map(row => row.flag)).toEqual([
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
    expect(BUN_FLAGS_HELP).not.toContain('--verbose');
    expect(BUN_FLAGS_HELP).toContain(`API reference: ${BUN_API_REFERENCE_URL}`);
    expect(BUN_FLAGS_HELP).toContain(`Type declarations: ${BUN_TYPES_SOURCE_URL}`);
    expect(BUN_FLAGS_HELP).toContain(`Repository: ${BUN_REPOSITORY_URL}`);
    for (const row of catalog) {
      expect(BUN_FLAGS_HELP).toContain(row.flag);
    }

    const proc = Bun.spawn(['bun', '--help'], { stdout: 'pipe', stderr: 'pipe' });
    const runtimeHelp = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    for (const row of catalog) {
      expect(runtimeHelp).toContain(row.flag.split('=')[0]!);
    }
    expect(runtimeHelp).not.toMatch(/^\s+--verbose\b/m);
  });
});
