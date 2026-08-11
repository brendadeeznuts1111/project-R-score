// @see https://bun.sh/docs/test/mocks#basic-function-mocks — bun:test mock
/**
 * cli.test.ts — Factory CLI: subcommand parsing, help output, error handling.
 *
 * Tests the CLI dispatch logic by importing and calling `main()` via a
 * subprocess (spawning `bun lib/factory/cli.ts <args>`).
 */

import { describe, expect, test } from 'bun:test';
import { spawn } from 'bun';

const CLI_PATH = `${import.meta.dir}/../lib/factory/cli.ts`;

/** Run the CLI with args and return stdout + stderr + exit code. */
async function runCli(
  args: string[] = [],
  env?: Record<string, string | undefined>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
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
  });

  test('create with unknown flags passes them through', async () => {
    // Dest under tmp so bun create never dumps nested .git at repo root.
    const dest = `${Bun.env.TMPDIR || '/tmp'}/fw-factory-create-${Bun.randomUUIDv7()}`;
    const { stderr, exitCode } = await runCli([
      'create',
      'factory-library',
      dest,
      '--unknown-flag',
    ]);
    expect(stderr).not.toContain('Unknown flag');
    expect(typeof exitCode).toBe('number');
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
      '-m',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Color gradient: #e06c75 → #2ecc71');
    expect(stdout).toContain('Space: `hsl-shortest-path`');
    expect(stdout).toContain('| 1 | 0 | `#E06C75` |');
    expect(stdout).toContain('| 16 | 1 | `#2ECC71` |');
  });
});
