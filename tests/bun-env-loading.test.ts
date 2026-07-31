// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files
// @see https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/shell — Bun.$
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const TMP = joinPath(ROOT, 'tmp', `bun-env-loading-test-${process.pid}`);
const PROBE = 'BUN_ENV_LOADING_PROBE';
const EXPANDED = 'BUN_ENV_EXPANDED_PROBE';

async function runProbe(
  args: string[],
  nodeEnv: 'development' | 'test' = 'development'
): Promise<Record<string, string | undefined>> {
  const env = { ...Bun.env, NODE_ENV: nodeEnv };
  delete env[PROBE];
  delete env[EXPANDED];
  const proc = Bun.spawn(['bun', '--cwd', TMP, ...args, 'probe.ts'], {
    env,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`env-loading probe failed (${exitCode}): ${stderr.trim()}`);
  }
  return JSON.parse(stdout) as Record<string, string | undefined>;
}

beforeAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet();
  await Bun.$`mkdir -p ${TMP}`.quiet();
  await Promise.all([
    Bun.write(joinPath(TMP, '.env'), `${PROBE}=base\n`),
    Bun.write(joinPath(TMP, '.env.development'), `${PROBE}=development\n`),
    Bun.write(joinPath(TMP, '.env.test'), `${PROBE}=test\n`),
    Bun.write(joinPath(TMP, '.env.local'), `${PROBE}=local\n`),
    Bun.write(
      joinPath(TMP, '.env.explicit'),
      `${PROBE}=explicit\nBUN_ENV_EXPANSION_BASE=world\n${EXPANDED}=hello-$BUN_ENV_EXPANSION_BASE\n`
    ),
    Bun.write(
      joinPath(TMP, 'probe.ts'),
      `console.log(JSON.stringify({ ${PROBE}: Bun.env.${PROBE}, ${EXPANDED}: Bun.env.${EXPANDED} }));\n`
    ),
  ]);
});

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet().nothrow();
});

describe('Bun native environment loading', () => {
  test('.env.local wins over .env.development and .env', async () => {
    expect(await runProbe([])).toEqual({
      [PROBE]: 'local',
    });
  });

  test('test mode isolates .env.test from .env.local overrides', async () => {
    expect(await runProbe([], 'test')).toEqual({
      [PROBE]: 'test',
    });
  });

  test('--no-env-file disables automatic loading', async () => {
    expect(await runProbe(['--no-env-file'])).toEqual({});
  });

  test('explicit --env-file still loads with defaults disabled and expands variables', async () => {
    expect(await runProbe(['--no-env-file', '--env-file=.env.explicit'])).toEqual({
      [PROBE]: 'explicit',
      [EXPANDED]: 'hello-world',
    });
  });
});
