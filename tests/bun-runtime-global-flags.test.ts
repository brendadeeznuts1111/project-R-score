// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime#global-configuration-context — --config / -c
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const FIXTURE = joinPath(ROOT, 'tmp', `bun-runtime-global-flags-${process.pid}`);
const KEY = 'BUN_GLOBAL_FLAG_CONTRACT';

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

function runBun(args: string[]): RunResult {
  const env = { ...Bun.env };
  delete env[KEY];

  const result = Bun.spawnSync(
    [process.execPath, '--cwd', FIXTURE, ...args, '-p', `process.env.${KEY}`],
    {
      env,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );

  return {
    exitCode: result.exitCode,
    stderr: result.stderr.toString(),
    stdout: result.stdout.toString().trim(),
  };
}

beforeAll(async () => {
  await Bun.$`rm -rf ${FIXTURE}`.quiet();
  await Bun.$`mkdir -p ${FIXTURE}`.quiet();
  await Promise.all([
    Bun.write(joinPath(FIXTURE, '.env'), `${KEY}=automatic\n`),
    Bun.write(joinPath(FIXTURE, '.env.prod'), `${KEY}=production\n`),
    Bun.write(joinPath(FIXTURE, 'bunfig.toml'), 'env = false\n'),
    Bun.write(joinPath(FIXTURE, 'bunfig.custom.toml'), '[console]\ndepth = 1\n'),
  ]);
});

afterAll(async () => {
  await Bun.$`rm -rf ${FIXTURE}`.quiet().nothrow();
});

describe('Bun global environment and config flags', () => {
  test('--env-file loads an explicit file even when the default bunfig disables automatic loading', () => {
    const result = runBun(['--env-file=.env.prod']);

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toBe('production');
  });

  test('--config selects an alternate bunfig relative to --cwd', () => {
    expect(runBun([]).stdout).toBe('undefined');

    const result = runBun(['--config=bunfig.custom.toml']);
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toBe('automatic');
  });

  test('-c=<path> does not select the alternate bunfig on Bun 1.4.0', () => {
    const result = runBun(['-c=bunfig.custom.toml']);

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toBe('undefined');
  });

  test('-c <path> treats the TOML file as an entrypoint on Bun 1.4.0', () => {
    const result = runBun(['-c', 'bunfig.custom.toml']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('cannot run toml files directly');
  });

  test('an explicit env file wins after selecting an alternate bunfig', () => {
    const result = runBun(['--config=bunfig.custom.toml', '--env-file=.env.prod']);

    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toBe('production');
  });
});
