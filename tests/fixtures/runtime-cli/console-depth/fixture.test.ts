/**
 * @see https://bun.com/docs/runtime#bun-run-console-depth — `--console-depth` caps console.log depth
 *
 * Note: the flag controls console.log inspection. Bun.inspect() ignores it unless
 * an explicit `{ depth }` option is passed — so this fixture asserts console.log.
 */
import { describe, expect, test } from 'bun:test';
import { runBun } from '../_spawn';

const CWD = import.meta.dir;
const DEPTH_EXPR = 'console.log({a:{b:{c:{d:{e:"deep"}}}}})';

describe('console-depth', () => {
  test('--console-depth on -e controls console.log inspection', async () => {
    const shallow = await runBun(['--console-depth=1', '-e', DEPTH_EXPR], CWD);
    const deep = await runBun(['--console-depth=5', '-e', DEPTH_EXPR], CWD);
    expect(shallow.exitCode).toBe(0);
    expect(deep.exitCode).toBe(0);
    expect(shallow.stdout).toContain('[Object');
    expect(deep.stdout).toContain('deep');
    expect(shallow.stdout).not.toContain('deep');
  });
});
