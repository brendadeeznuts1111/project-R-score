// @see https://bun.sh/docs/test/mocks#basic-function-mocks — bun:test mock
/**
 * cli.test.ts — Factory CLI: subcommand parsing, help output, error handling.
 *
 * Tests the CLI dispatch logic by importing and calling `main()` via a
 * subprocess (spawning `bun lib/factory/cli.ts <args>`).
 */

import { describe, expect, test } from 'bun:test';
import { spawn } from 'bun';
import { requireScaffoldMarkerIdentity } from '../lib/factory/scaffold-marker.ts';
import { makeTempDir, removeTempDir } from '../lib/tmp-probe.ts';

const CLI_PATH = `${import.meta.dir}/../lib/factory/cli.ts`;

/** Run the CLI with args and return stdout + stderr + exit code. */
async function runCli(
  args: string[] = [],
  env?: Record<string, string | undefined>,
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
    env: env
      ? ({ ...Bun.env, ...env } as Record<string, string>)
      : undefined,
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe('CLI — help and version', () => {
  test('--version prints version', async () => {
    const { stdout, exitCode } = await runCli(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^factory v\d+\.\d+\.\d+$/);
  });

  test('no args prints help', async () => {
    const { stdout, exitCode } = await runCli([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('factory v');
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('publish');
    expect(stdout).toContain('list');
    expect(stdout).toContain('search');
    expect(stdout).toContain('install');
    expect(stdout).toContain('readme');
    expect(stdout).toContain('env');
  });

  test('help command shows general help', async () => {
    const { stdout, exitCode } = await runCli(['help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage:');
  });

  test('help <subcommand> shows subcommand help', async () => {
    const { stdout, exitCode } = await runCli(['help', 'publish']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('factory publish');
    expect(stdout).toContain('--name');
    expect(stdout).toContain('--version');
  });

  test('help <subcommand> for install', async () => {
    const { stdout, exitCode } = await runCli(['help', 'install']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('factory install');
    expect(stdout).toContain('@factorywager');
  });

  test('unknown command exits with error', async () => {
    const { stderr, exitCode } = await runCli(['does-not-exist']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Unknown command');
  });

  test('publish without path errors', async () => {
    const { stderr, exitCode } = await runCli(['publish']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Missing <path>');
  });

  test('install without name errors', async () => {
    const { stderr, exitCode } = await runCli(['install']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Missing <name>');
  });

  test('search without query errors', async () => {
    const { stderr, exitCode } = await runCli(['search']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Missing <query>');
  });

  test('readme without name errors', async () => {
    const { stderr, exitCode } = await runCli(['readme']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Missing <name>');
  });
});

describe('CLI — create subcommand', () => {
  test('--publish marker identity has no missing-value fallback', () => {
    expect(requireScaffoldMarkerIdentity({ name: '  example  ', version: ' 1.2.3 ' }, '/tmp/example')).toEqual({
      name: 'example',
      version: '1.2.3',
    });
    expect(() => requireScaffoldMarkerIdentity(null, '/tmp/example')).toThrow('no registry marker was created');
    expect(() => requireScaffoldMarkerIdentity({ name: 'example' }, '/tmp/example')).toThrow('non-empty package.json name and version');
  });

  test('create without template prints help', async () => {
    const { stdout, exitCode } = await runCli(['create']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('factory create');
  });

  test('create with --help shows subcommand help', async () => {
    const { stdout, exitCode } = await runCli(['create', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--publish');
    expect(stdout).toContain('--force');
    expect(stdout).toContain('--open');
    expect(stdout).toContain('--replace-local');
    expect(stdout).toContain('npm');
    expect(stdout).toContain('github');
  });

  test('templates documents local, npm, GitHub, and registry lanes', async () => {
    const { stdout, exitCode } = await runCli(['templates']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('local');
    expect(stdout).toContain('npm');
    expect(stdout).toContain('github');
    expect(stdout).toContain('Factory R2 registry');
  });

  test('create --publish requires an explicit destination', async () => {
    const { stderr, exitCode } = await runCli(['create', 'factory-library', '--publish']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('--publish requires an explicit <destination>');
  });

  test('create --publish validates registry requirements before scaffolding', async () => {
    const destination = `${Bun.env.TMPDIR || '/tmp'}/fw-factory-publish-preflight-${Bun.randomUUIDv7()}`;
    const { stderr, exitCode } = await runCli(
      ['create', 'factory-library', destination, '--publish', '--no-install', '--no-git'],
      {
        R2_ACCESS_KEY_ID: '',
        R2_SECRET_ACCESS_KEY: '',
        R2_ACCOUNT_ID: '',
        CLOUDFLARE_ACCOUNT_ID: '',
      }
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain('--publish requirements failed before scaffold');
    expect(stderr).toContain('R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set');
    expect(await Bun.file(`${destination}/package.json`).exists()).toBe(false);
  });

  test('create requires an explicit destination for destructive repository-local templates', async () => {
    const { stderr, exitCode } = await runCli(['create', 'factory-library', '--no-install', '--no-git']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Local template "factory-library" requires an explicit <destination>');
    expect(stderr).toContain('may replace an existing local destination');
  });

  test('create recognizes an explicit BUN_CREATE_DIR template before applying local safety rules', async () => {
    const templateRoot = await makeTempDir('factory-configured-template');
    try {
      await Bun.write(`${templateRoot}/configured/package.json`, '{"name":"configured"}\n');
      const { stderr, exitCode } = await runCli(['create', 'configured', '--no-install', '--no-git'], {
        BUN_CREATE_DIR: templateRoot,
      });
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Local template "configured" requires an explicit <destination>');
    } finally {
      await removeTempDir(templateRoot);
    }
  });

  test('create rejects an incomplete harness-backed template before creating its destination', async () => {
    const templateRoot = await makeTempDir('factory-incomplete-harness-template');
    const destination = `${templateRoot}/generated-project`;
    try {
      await Promise.all([
        Bun.write(`${templateRoot}/incomplete/package.json`, '{"name":"incomplete"}\n'),
        Bun.write(`${templateRoot}/incomplete/harness.toml`, 'schemaVersion = 1\n'),
      ]);
      const { stderr, exitCode } = await runCli(
        ['create', 'incomplete', destination, '--no-install', '--no-git'],
        { BUN_CREATE_DIR: templateRoot },
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain(
        'Local template harness is incomplete before scaffold: missing scripts/requirements.ts',
      );
      expect(await Bun.file(destination).exists()).toBe(false);
    } finally {
      await removeTempDir(templateRoot);
    }
  });

  test('create retains but rejects a scaffold that fails after Bun materialization', async () => {
    const templateRoot = await makeTempDir('factory-invalid-materialization-template');
    const template = `${templateRoot}/materialization-sensitive`;
    const destination = `${templateRoot}/generated-project`;
    try {
      await Promise.all([
        Bun.write(
          `${template}/package.json`,
          JSON.stringify({
            name: '{{name}}',
            version: '0.1.0',
            'bun-create': { postinstall: [] },
          })
        ),
        Bun.write(`${template}/harness.toml`, 'schemaVersion = 1\n'),
        Bun.write(
          `${template}/scripts/requirements.ts`,
          `const manifest = await Bun.file('package.json').json();\nif (manifest['bun-create'] === undefined) {\n  console.error('materialized manifest rejected');\n  process.exit(1);\n}\n`
        ),
        Bun.write(`${template}/scripts/generate-files-md.ts`, `console.log('generated');\n`),
        Bun.write(`${template}/scripts/validate-files-md.ts`, `console.log('validated');\n`),
      ]);
      const { stderr, exitCode } = await runCli(
        ['create', 'materialization-sensitive', destination, '--no-install', '--no-git'],
        { BUN_CREATE_DIR: templateRoot }
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain(
        'Generated scaffold harness failed after Bun materialization; destination retained'
      );
      expect(stderr).toContain('materialized manifest rejected');
      expect(await Bun.file(`${destination}/package.json`).exists()).toBe(true);
    } finally {
      await removeTempDir(templateRoot);
    }
  });

  test('create recognizes a working-project local template before applying local safety rules', async () => {
    const projectRoot = await makeTempDir('factory-working-project-template');
    try {
      await Bun.write(`${projectRoot}/.bun-create/project-local/package.json`, '{"name":"project-local"}\n');
      const { stderr, exitCode } = await runCli(
        ['create', 'project-local', '--no-install', '--no-git'],
        undefined,
        projectRoot,
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Local template "project-local" requires an explicit <destination>');
    } finally {
      await removeTempDir(projectRoot);
    }
  });

  test('create rejects extra positionals and current-directory local destinations', async () => {
    const extra = await runCli(['create', 'factory-library', 'one', 'two', '--no-install', '--no-git']);
    expect(extra.exitCode).toBe(1);
    expect(extra.stderr).toContain('at most one <destination>');

    const current = await runCli(['create', 'factory-library', '.', '--no-install', '--no-git']);
    expect(current.exitCode).toBe(1);
    expect(current.stderr).toContain('current working directory');
  });

  test('create refuses replacement until --replace-local makes it explicit', async () => {
    const dest = `${Bun.env.TMPDIR || '/tmp'}/fw-factory-replace-${Bun.randomUUIDv7()}`;
    await Bun.write(`${dest}/stale.txt`, 'preserve unless replacement is explicit');
    const refused = await runCli(['create', 'factory-library', dest, '--no-install', '--no-git']);
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain('--replace-local');
    expect(await Bun.file(`${dest}/stale.txt`).exists()).toBe(true);

    const replaced = await runCli([
      'create',
      'factory-library',
      dest,
      '--replace-local',
      '--no-install',
      '--no-git',
    ]);
    expect(replaced.exitCode).toBe(0);
    expect(await Bun.file(`${dest}/stale.txt`).exists()).toBe(false);
    await Bun.$`rm -rf ${dest}`.nothrow().quiet();
  });

  test('create rejects --replace-local outside the repository-local route', async () => {
    const { stderr, exitCode } = await runCli(['create', 'remix', 'my-app', '--replace-local']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('--replace-local is only valid for a known repository-local template');
  });

  test('create preserves safe Bun flags and their destination semantics', async () => {
    // Dest under tmp so bun create never writes a nested .git at repo root.
    const dest = `${Bun.env.TMPDIR || '/tmp'}/fw-factory-create-${Bun.randomUUIDv7()}`;
    const { exitCode } = await runCli([
      'create',
      'factory-library',
      '--no-install',
      '--no-git',
      dest,
    ]);
    expect(exitCode).toBe(0);
    expect(await Bun.file(`${dest}/package.json`).exists()).toBe(true);
    expect(await Bun.file(`${dest}/.git`).exists()).toBe(false);
    expect(await Bun.file(`${dest}/node_modules`).exists()).toBe(false);
    await Bun.$`rm -rf ${dest}`.nothrow().quiet();
  });
});

describe('CLI — env command (no credentials)', () => {
  test('env check fails without R2 credentials', async () => {
    const { exitCode, stdout } = await runCli(['env'], {
      R2_ACCESS_KEY_ID: '',
      R2_SECRET_ACCESS_KEY: '',
    });
    expect(exitCode).toBe(1);
    expect(stdout).toContain('FAIL');
  });
});

describe('CLI — snapshot help', () => {
  test('help snapshot documents default path', async () => {
    const { stdout, exitCode } = await runCli(['help', 'snapshot']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('public/registry/registry.json');
  });
});

describe('CLI — colors', () => {
  test('documents diagnosis, palette, and Bun macro usage', async () => {
    const { stdout, exitCode } = await runCli(['help', 'colors']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--diagnose');
    expect(stdout).toContain('--palette <color>');
    expect(stdout).toContain('--theme <theme>');
    expect(stdout).toContain('type: "macro"');
  });

  test('diagnoses all formats and parser capabilities', async () => {
    const { stdout, exitCode } = await runCli([
      'colors',
      'rgba(224 108 117 / 0.5)',
      '--diagnose',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('formats: 16');
    expect(stdout).toContain('parser capabilities');
    expect(stdout).toContain('#e06c7580');
    expect(stdout).toContain('display-p3 preservation');
  });

  test('generates a structured linear-light palette', async () => {
    const { stdout, exitCode } = await runCli([
      'colors',
      '--palette',
      '#e06c75',
      '--perceptual',
      '--json',
    ]);
    expect(exitCode).toBe(0);
    const value = JSON.parse(stdout) as { space: string; palette: unknown[] };
    expect(value.space).toBe('linear-light-rgb');
    expect(value.palette).toHaveLength(15);
  });

  test('rejects symbolic palette inputs clearly', async () => {
    const { stderr, exitCode } = await runCli(['colors', '--palette', 'currentcolor']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('context-dependent CSS');
  });

  test('supports the issue:context short palette and custom tones contract', async () => {
    const { stdout, exitCode } = await runCli([
      'colors',
      '-p',
      '#e06c75',
      '--tones',
      '0,0.1,0.3,0.6,1',
      '--json',
    ]);
    expect(exitCode).toBe(0);
    const value = JSON.parse(stdout) as { palette: Array<{ amount: number }> };
    expect(value.palette.map(row => row.amount)).toEqual([0, 0.1, 0.3, 0.6, 1]);
  });

  test('emits a formatted HSL gradient as Markdown', async () => {
    const { stdout, exitCode } = await runCli([
      'colors',
      '-p',
      '#e06c75',
      '--gradient',
      '#2ecc71',
      '--steps',
      '16',
      '--hsl',
      '--format',
      'HEX',
      '--theme',
      'dark',
      '-m',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Color gradient: #e06c75 → #2ecc71');
    expect(stdout).toContain('Space: `hsl-shortest-path`');
    expect(stdout).toContain('Theme: `dark`');
    expect(stdout).toContain('| 1 | 0 | `#E06C75` |');
    expect(stdout).toContain('| 16 | 1 | `#2ECC71` |');
  });

  test('rejects unknown themes', async () => {
    const { stderr, exitCode } = await runCli([
      'colors',
      '--palette',
      '#e06c75',
      '--theme',
      'neon',
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('--theme must be one of: auto, dark, light');
  });
});
