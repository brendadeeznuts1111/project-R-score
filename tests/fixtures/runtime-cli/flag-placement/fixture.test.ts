/**
 * @see https://bun.com/docs/runtime#watch — `--watch` placement before vs after `run`
 */
import { describe, expect, test } from 'bun:test';
import { runBun } from '../_spawn';

const CWD = import.meta.dir;

describe('flag-placement', () => {
  test('--watch after bun run is passed through to the script', async () => {
    const { stdout, exitCode } = await runBun(['run', 'dev', '--watch'], CWD);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('WATCH=yes');
  });

  test('--watch before run is consumed by Bun (not in script argv)', async () => {
    const { stdout } = await runBun(['--watch', 'run', 'dev'], CWD, { killAfterMs: 400 });
    expect(stdout).toContain('WATCH=no');
  });
});

