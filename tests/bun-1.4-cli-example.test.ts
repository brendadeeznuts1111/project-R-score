import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const cli = join(import.meta.dir, '../examples/bun-1.4-cli/cli.ts');
const buildMeta = join(import.meta.dir, '../examples/bun-1.4-cli/build-meta.ts');
const dist = join(import.meta.dir, '../examples/bun-1.4-cli/dist');

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

  test('build-meta writes esbuild meta.json and --metafile-md report', async () => {
    const proc = Bun.spawnSync([process.execPath, buildMeta, '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    const payload = JSON.parse(proc.stdout.toString()) as {
      ok: boolean;
      inputs: number;
      importsAligned: number;
      importsMisaligned: number;
      metaJson: string;
      metaMd: string;
    };
    expect(payload.ok).toBe(true);
    expect(payload.inputs).toBeGreaterThan(0);
    // Bun 1.4 #34534 — import.path indexes metafile.inputs
    expect(payload.importsAligned).toBeGreaterThan(0);
    expect(payload.importsMisaligned).toBe(0);
    expect(Bun.file(join(dist, 'meta.json')).size).toBeGreaterThan(0);
    expect(Bun.file(join(dist, 'meta.md')).size).toBeGreaterThan(0);
    const text = await Bun.file(join(dist, 'meta.md')).text();
    expect(text).toContain('Bundle Analysis Report');
    expect(text).toContain('Quick Summary');

    const meta = (await Bun.file(join(dist, 'meta.json')).json()) as {
      inputs: Record<
        string,
        { imports?: Array<{ path: string; original?: string; external?: boolean }> }
      >;
    };
    const entry = meta.inputs['examples/bun-1.4-cli/cli.ts'];
    expect(entry).toBeDefined();
    const first = entry!.imports?.find(i => !i.external);
    expect(first?.path).toBeTruthy();
    expect(first!.path in meta.inputs).toBe(true);
    expect(first?.original).toMatch(/^\.\.?/);
  });
});
