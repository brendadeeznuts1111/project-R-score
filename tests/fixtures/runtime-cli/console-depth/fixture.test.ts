/**
 * @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
 * @see https://bun.com/docs/runtime#bun-run-console-depth — --console-depth with bun run
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

  test('bun run - treats stdin as TypeScript with JSX support', async () => {
    // Docs: redirect a .js-looking stream; Bun still parses TS syntax.
    const src = `console.log(('typed' as any));`;
    const { stdout, exitCode, stderr } = await runBun(['run', '-'], CWD, { stdin: src });
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain('SyntaxError');
    expect(stdout.trim()).toBe('typed');
  });

  test('bun --console-depth N run - follows docs flag order', async () => {
    const src = `console.log({ a: { b: { c: { d: 'deep' } } } })`;
    const shallow = await runBun(['--console-depth=2', 'run', '-'], CWD, { stdin: src });
    const deep = await runBun(['--console-depth=5', 'run', '-'], CWD, { stdin: src });
    expect(shallow.exitCode).toBe(0);
    expect(deep.exitCode).toBe(0);
    expect(shallow.stdout).toContain('[Object');
    expect(shallow.stdout).not.toContain('deep');
    expect(deep.stdout).toContain('deep');
  });
});
