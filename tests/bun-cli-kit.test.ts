import { describe, expect, test } from 'bun:test';
import {
  setExitCode,
  spawnText,
  wantsHelp,
  wantsJson,
} from '../lib/harness/bun-cli.ts';

describe('bun-cli kit', () => {
  test('wantsHelp / wantsJson', () => {
    expect(wantsHelp(['--help'])).toBe(true);
    expect(wantsHelp(['-h'])).toBe(true);
    expect(wantsHelp(['--json'])).toBe(false);
    expect(wantsJson(['--json'])).toBe(true);
  });

  test('spawnText returns stdout from bun --version', () => {
    const r = spawnText([process.execPath, '--version']);
    expect(r.code).toBe(0);
    expect(r.stdout.length).toBeGreaterThan(0);
  });

  test('spawnText allowFail does not throw', () => {
    const r = spawnText(['git', 'rev-parse', 'no-such-ref-zzzz'], { allowFail: true });
    expect(r.code).not.toBe(0);
  });

  test('spawnText trim:false keeps leading whitespace (trimEnd only)', () => {
    const r = spawnText([process.execPath, '-e', 'process.stdout.write("  hi\\n")'], {
      trim: false,
    });
    expect(r.stdout.startsWith('  ')).toBe(true);
    expect(r.stdout.endsWith('\n')).toBe(false);
  });

  test('setExitCode assigns process.exitCode', () => {
    const prev = process.exitCode;
    setExitCode(0);
    expect(process.exitCode).toBe(0);
    process.exitCode = prev;
  });
});
