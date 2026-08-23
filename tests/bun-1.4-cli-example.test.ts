import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const cli = join(import.meta.dir, '../examples/bun-1.4-cli/cli.ts');

describe('examples/bun-1.4-cli', () => {
  test('--ping exits 0 and prints pong', () => {
    const proc = Bun.spawnSync([process.execPath, cli, '--ping'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toContain('pong');
  });

  test('--json --ping emits machine JSON', () => {
    const proc = Bun.spawnSync([process.execPath, cli, '--json', '--ping'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    const body = proc.stdout.toString();
    const parsed = JSON.parse(body) as { ok: boolean; echo: string };
    expect(parsed.ok).toBe(true);
    expect(parsed.echo).toBe('pong');
  });

  test('unknown flag exits non-zero with gate id', () => {
    const proc = Bun.spawnSync([process.execPath, cli, '--typo'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).not.toBe(0);
    const out = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
    expect(out).toContain('bun-1.4-cli-example');
  });
});
