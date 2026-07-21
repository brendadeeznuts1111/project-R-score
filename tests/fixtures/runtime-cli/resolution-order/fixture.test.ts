/**
 * @see https://bun.com/docs/runtime#resolution-order — package.json script vs same-named file
 */
import { describe, expect, test } from 'bun:test';
import { runBun } from '../_spawn';

const CWD = import.meta.dir;

describe('resolution-order', () => {
  test('bun run prefers package.json script over same-named file', async () => {
    const { stdout, exitCode } = await runBun(['run', 'build'], CWD);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('SCRIPT_HIT');
    expect(stdout).not.toContain('FILE_HIT');
  });

  test('same-named file still runs when path is explicit', async () => {
    const { stdout, exitCode } = await runBun(['run', './build.ts'], CWD);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('FILE_HIT');
  });
});
