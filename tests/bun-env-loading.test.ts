// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files
// @see https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading
// @see https://bun.com/docs/runtime/bunfig#env — env=false / [env].file=false
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/shell — Bun.$
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const TMP = joinPath(ROOT, 'tmp', `bun-env-loading-test-${process.pid}`);
const AUTO_DIR = joinPath(TMP, 'auto');
const BOOLEAN_DISABLED_DIR = joinPath(TMP, 'boolean-disabled');
const TABLE_DISABLED_DIR = joinPath(TMP, 'table-disabled');
const PROBE = 'BUN_ENV_LOADING_PROBE';
const EXPANDED = 'BUN_ENV_EXPANDED_PROBE';

async function runProbe(
  args: string[],
  nodeEnv: 'development' | 'test' = 'development',
  cwd = AUTO_DIR
): Promise<Record<string, string | undefined>> {
  const env = { ...Bun.env, NODE_ENV: nodeEnv };
  delete env[PROBE];
  delete env[EXPANDED];
  const proc = Bun.spawn(['bun', '--cwd', cwd, ...args, 'probe.ts'], {
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

async function writeFixture(dir: string, bunfig?: string): Promise<void> {
  await Bun.$`mkdir -p ${dir}`.quiet();
  await Promise.all([
    Bun.write(joinPath(dir, '.env'), `${PROBE}=base\n`),
    Bun.write(joinPath(dir, '.env.development'), `${PROBE}=development\n`),
    Bun.write(joinPath(dir, '.env.test'), `${PROBE}=test\n`),
    Bun.write(joinPath(dir, '.env.local'), `${PROBE}=local\n`),
    Bun.write(
      joinPath(dir, '.env.explicit'),
      `${PROBE}=explicit\nBUN_ENV_EXPANSION_BASE=world\n${EXPANDED}=hello-$BUN_ENV_EXPANSION_BASE\n`
    ),
    Bun.write(
      joinPath(dir, 'probe.ts'),
      `console.log(JSON.stringify({ ${PROBE}: Bun.env.${PROBE}, ${EXPANDED}: Bun.env.${EXPANDED} }));\n`
    ),
    bunfig === undefined ? Promise.resolve(0) : Bun.write(joinPath(dir, 'bunfig.toml'), bunfig),
  ]);
}

beforeAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet();
  await Promise.all([
    writeFixture(AUTO_DIR),
    writeFixture(BOOLEAN_DISABLED_DIR, 'env = false\n'),
    writeFixture(TABLE_DISABLED_DIR, '[env]\nfile = false\n'),
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

  test('bunfig env=false disables automatic loading', async () => {
    expect(await runProbe([], 'development', BOOLEAN_DISABLED_DIR)).toEqual({});
  });

  test('bunfig [env].file=false disables automatic loading', async () => {
    expect(await runProbe([], 'development', TABLE_DISABLED_DIR)).toEqual({});
  });

  test('explicit --env-file still loads through disabled bunfig and expands variables', async () => {
    expect(
      await runProbe(['--env-file=.env.explicit'], 'development', BOOLEAN_DISABLED_DIR)
    ).toEqual({
      [PROBE]: 'explicit',
      [EXPANDED]: 'hello-world',
    });
  });
});
