/**
 * @see https://bun.com/docs/runtime#bun-run-smol — --smol lowers heap growth / GC more often
 * @see https://bun.com/docs/cli/run — bun [bun flags] run <script> [script flags]
 */
import { describe, expect, test } from 'bun:test';
import { runBun } from '../_spawn';

const CWD = import.meta.dir;

describe('smol', () => {
  test('--smol is accepted before run and leaves process.execArgv', async () => {
    const { stdout, exitCode } = await runBun(
      ['--smol', '-e', 'console.log(JSON.stringify(process.execArgv))'],
      CWD
    );
    expect(exitCode).toBe(0);
    const argv = JSON.parse(stdout.trim()) as string[];
    expect(argv.some(a => a === '--smol' || a.startsWith('--smol'))).toBe(true);
  });

  test('--smol run - still executes stdin code', async () => {
    const { stdout, exitCode } = await runBun(['--smol', 'run', '-'], CWD, {
      stdin: "console.log('smol-ok')",
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('smol-ok');
  });
});
