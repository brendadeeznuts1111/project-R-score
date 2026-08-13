// @see https://bun.com/docs/runtime/environment-variables#configuring-bun — BUN_OPTIONS
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BUN_OPTIONS_CONTRACT } from '../lib/bun-runtime-env.ts';
import docsCatalog from '../tools/bun-docs-catalog.json';

type ChildResult = { exitCode: number; stdout: string; stderr: string };

async function runBun(
  args: string[],
  bunOptions?: string,
  cwd?: string
): Promise<ChildResult> {
  const env: Record<string, string | undefined> = { ...Bun.env };
  delete env.BUN_OPTIONS;
  if (bunOptions !== undefined) env.BUN_OPTIONS = bunOptions;

  const proc = Bun.spawn({
    cmd: [process.execPath, ...args],
    cwd,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

describe('BUN_OPTIONS runtime argument contract', () => {
  test('publishes explicit, secret-safe semantics', () => {
    expect(BUN_OPTIONS_CONTRACT).toEqual({
      name: 'BUN_OPTIONS',
      scope: 'every-bun-execution',
      injection: 'prepended-runtime-arguments',
      tokenization: 'quoted-groups-retain-quotes',
      scriptArgv: 'unchanged',
      execArgv: 'injected-options-first',
      repeatFlagPrecedence: 'later-cli-value-wins',
      configPrecedence: 'bunfig-then-bun-options-then-cli-for-console-depth',
      standaloneExecutables: 'supported',
      secretHandling: 'never-emit-value',
      recommendedUse: 'short-lived-command-or-job-scope',
    });
  });

  test('prepends runtime options to process.execArgv without shifting process.argv', async () => {
    const probe = await runBun(
      [
        '-e',
        'console.log(JSON.stringify({argv:process.argv,execArgv:process.execArgv}))',
        'user-argument',
      ],
      '--console-depth=1 --smol'
    );

    expect(probe.exitCode).toBe(0);
    const value = JSON.parse(probe.stdout) as { argv: string[]; execArgv: string[] };
    expect(value.argv.slice(1)).toEqual(['user-argument']);
    expect(value.execArgv.slice(0, 2)).toEqual(['--console-depth=1', '--smol']);
  });

  test('groups quoted whitespace but retains the quote characters', async () => {
    const quoted = await runBun(
      ['-e', 'console.log(JSON.stringify({title:process.title,execArgv:process.execArgv}))'],
      '--title="hello world"'
    );
    expect(quoted.exitCode).toBe(0);
    const value = JSON.parse(quoted.stdout) as { title: string; execArgv: string[] };
    expect(value.title).toBe('"hello world"');
    expect(value.execArgv[0]).toBe('--title="hello world"');

    const unquoted = await runBun(['-e', 'console.log("unreachable")'], '--title=hello world');
    expect(unquoted.exitCode).not.toBe(0);
    expect(unquoted.stderr).toContain('Script not found "world"');
  });

  test('later explicit CLI value wins for a repeated console-depth flag', async () => {
    const probe = await runBun(
      ['--console-depth=4', '-e', 'console.log({a:{b:{c:{d:1}}}})'],
      '--console-depth=1'
    );
    expect(probe.exitCode).toBe(0);
    expect(probe.stdout).toContain('d: 1');
    expect(probe.stdout).not.toContain('[Object ...]');
  });

  test('console depth follows bunfig, then BUN_OPTIONS, then explicit CLI', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'bun-options-config-'));
    try {
      await Bun.write(join(cwd, 'bunfig.toml'), '[console]\ndepth = 1\n');
      const expression = 'console.log({a:{b:{c:{d:1}}}})';

      const fromBunOptions = await runBun(['-e', expression], '--console-depth=3', cwd);
      expect(fromBunOptions.exitCode).toBe(0);
      expect(fromBunOptions.stdout).toContain('d: 1');

      const fromCli = await runBun(
        ['--console-depth=1', '-e', expression],
        '--console-depth=3',
        cwd
      );
      expect(fromCli.exitCode).toBe(0);
      expect(fromCli.stdout).toContain('[Object ...]');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('compiled standalone executables read BUN_OPTIONS at runtime', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'bun-options-compiled-'));
    const source = join(cwd, 'probe.ts');
    const outfile = join(cwd, 'probe');
    try {
      await Bun.write(
        source,
        'console.log(JSON.stringify({argv:process.argv,execArgv:process.execArgv}));\n'
      );
      const build = await Bun.build({
        entrypoints: [source],
        compile: { outfile },
      });
      expect(build.success).toBe(true);

      const env: Record<string, string | undefined> = {
        ...Bun.env,
        BUN_OPTIONS: '--console-depth=4',
      };
      const proc = Bun.spawn({ cmd: [outfile, 'user-argument'], env, stdout: 'pipe' });
      const [stdout, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        proc.exited,
      ]);
      expect(exitCode).toBe(0);
      const value = JSON.parse(stdout) as { argv: string[]; execArgv: string[] };
      expect(value.argv.at(-1)).toBe('user-argument');
      expect(value.execArgv).toContain('--console-depth=4');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('catalog lookup resolves BUN_OPTIONS to the executable runtime contract', () => {
    const entry = docsCatalog.entries.find(item => item.name === 'BUN_OPTIONS');
    expect(entry).toMatchObject({
      type: 'env-var',
      docsUrl: 'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
    });
  });
});
