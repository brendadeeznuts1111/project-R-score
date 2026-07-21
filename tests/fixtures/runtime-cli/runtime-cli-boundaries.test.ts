/**
 * Critical Bun `bun run` CLI boundaries this repo depends on.
 * Upstream menu: https://bun.com/docs/runtime — promote a flag here only when code uses it.
 *
 * @see https://bun.com/docs/runtime#watch — flag-placement/
 * @see https://bun.com/docs/runtime#resolution-order — resolution-order/
 * @see https://bun.com/docs/runtime#bun — shebang-bun/
 * @see https://bun.com/docs/runtime#bun-run-console-depth — console-depth/ (inline -e)
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { joinPath } from '../../../lib/path-bun';

const ROOT = joinPath(import.meta.dir);

/** Nested object used to distinguish console depth truncation. */
const DEPTH_EXPR = 'console.log({a:{b:{c:{d:{e:"deep"}}}}})';

async function runAsync(
  args: string[],
  cwd: string,
  opts?: { killAfterMs?: number }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (opts?.killAfterMs != null) {
    timer = setTimeout(() => proc.kill(), opts.killAfterMs);
  }

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
  ]);
  if (timer) clearTimeout(timer);
  return { exitCode: exitCode ?? 1, stdout, stderr };
}

describe('runtime-cli-boundaries', () => {
  const flagDir = joinPath(ROOT, 'flag-placement');
  const resDir = joinPath(ROOT, 'resolution-order');
  const shebangDir = joinPath(ROOT, 'shebang-bun');
  const binLink = joinPath(shebangDir, 'node_modules/.bin/fake-cli');

  beforeAll(async () => {
    await Bun.$`chmod +x ${joinPath(shebangDir, 'cli.js')}`.quiet();
    await Bun.$`mkdir -p ${joinPath(shebangDir, 'node_modules/.bin')}`.quiet();
    await Bun.$`ln -sfn ../../cli.js ${binLink}`.quiet();
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${joinPath(shebangDir, 'node_modules')}`.quiet();
  });

  test('--watch after bun run is passed through to the script', async () => {
    const { stdout, exitCode } = await runAsync(['run', 'dev', '--watch'], flagDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('WATCH=yes');
  });

  test('--watch before run is consumed by Bun (not in script argv)', async () => {
    const { stdout } = await runAsync(['--watch', 'run', 'dev'], flagDir, {
      killAfterMs: 400,
    });
    expect(stdout).toContain('WATCH=no');
  });

  test('bun run prefers package.json script over same-named file', async () => {
    const { stdout, exitCode } = await runAsync(['run', 'build'], resDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('SCRIPT_HIT');
    expect(stdout).not.toContain('FILE_HIT');
  });

  test('same-named file still runs when path is explicit', async () => {
    const { stdout, exitCode } = await runAsync(['run', './build.ts'], resDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('FILE_HIT');
  });

  test('node shebang CLI runs under Node without --bun', async () => {
    const { stdout, exitCode } = await runAsync(['run', 'fake'], shebangDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('RUNTIME=node');
  });

  test('--bun forces Bun runtime for node-shebang CLI', async () => {
    const { stdout, exitCode } = await runAsync(['run', '--bun', 'fake'], shebangDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('RUNTIME=bun');
  });

  test('--console-depth on -e controls console.log inspection', async () => {
    // Flag affects console.log depth (Bun.inspect needs an explicit depth option).
    // Placement-after-run is covered by flag-placement/; trailing flags on `-e` are still Bun flags.
    const shallow = await runAsync(['--console-depth=1', '-e', DEPTH_EXPR], ROOT);
    const deep = await runAsync(['--console-depth=5', '-e', DEPTH_EXPR], ROOT);
    expect(shallow.exitCode).toBe(0);
    expect(deep.exitCode).toBe(0);
    expect(shallow.stdout).toContain('[Object');
    expect(deep.stdout).toContain('deep');
    expect(shallow.stdout).not.toContain('deep');
  });
});
