// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/guides/util/which-path-to-executable-bin — Bun.which
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/guides/util/detect-bun — process.versions.bun
import { describe, expect, test } from 'bun:test';
import {
  bunRuntimeProvenance,
  bunSpawnArgs,
  clearBunExecutableCache,
  entrypointPath,
  isModuleEntrypoint,
  isRunningUnderBun,
  resolveBunExecutable,
} from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';

describe('lib/bun-executable (Utilities guides)', () => {
  test('resolveBunExecutable never returns bare bun', () => {
    clearBunExecutableCache();
    const bin = resolveBunExecutable();
    expect(bin.length).toBeGreaterThan(0);
    expect(bin).not.toBe('bun');
    expect(bin === Bun.which('bun') || bin === process.execPath).toBe(true);
  });

  test('resolveBunExecutable PATH miss → execPath', () => {
    clearBunExecutableCache();
    expect(resolveBunExecutable({ PATH: '' })).toBe(process.execPath);
  });

  test('isModuleEntrypoint requires caller import.meta', () => {
    // bun:test may set this file as entry; helper must mirror meta.main exactly.
    expect(isModuleEntrypoint(import.meta)).toBe(import.meta.main);
    // Lib module is never the process entry when imported.
    expect(isModuleEntrypoint({ main: false, path: '/x', dir: '/', file: 'x' } as ImportMeta)).toBe(
      false
    );
    expect(isModuleEntrypoint({ main: true, path: '/x', dir: '/', file: 'x' } as ImportMeta)).toBe(
      true
    );
  });

  test('entrypointPath matches Bun.main', () => {
    expect(entrypointPath()).toBe(Bun.main);
  });

  test('isRunningUnderBun via process.versions.bun', () => {
    expect(isRunningUnderBun()).toBe(true);
    expect(typeof process.versions.bun).toBe('string');
  });

  test('bunRuntimeProvenance fingerprints version + which + main', () => {
    clearBunExecutableCache();
    const p = bunRuntimeProvenance();
    expect(p.bunVersion).toBe(Bun.version);
    expect(p.bunRevision).toBe(Bun.revision.slice(0, 8));
    expect(p.bunExecutable).toBe(resolveBunExecutable());
    expect(p.bunMain).toBe(Bun.main);
  });

  test('bunSpawnArgs prefixes absolute bun never bare name', () => {
    clearBunExecutableCache();
    const argv = bunSpawnArgs(['run', 'portal:chrome:bake']);
    expect(argv[0]).toBe(resolveBunExecutable());
    expect(argv[0]).not.toBe('bun');
    expect(argv.slice(1)).toEqual(['run', 'portal:chrome:bake']);
  });

  test('bunSpawnArgs nested spawn resolves --version', async () => {
    clearBunExecutableCache();
    const proc = Bun.spawn(bunSpawnArgs(['--version']), {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const out = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    expect(out).toBe(Bun.version);
  });
});

describe('entrypoint guard ratchet', () => {
  test('check-entrypoint-guards passes baseline', async () => {
    const proc = Bun.spawn(bunSpawnArgs(['scripts/check-entrypoint-guards.ts']), {
      cwd: joinPath(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('entrypoint guards OK');
  });
});
