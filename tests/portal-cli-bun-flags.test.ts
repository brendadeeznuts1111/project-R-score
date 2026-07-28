// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime#general-execution-options
import { describe, expect, test } from 'bun:test';
import {
  bunSpawnArgv,
  parseBunExecutionFlags,
} from '../tools/lib/portal-cli-bun-flags.ts';

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
});
