// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/guides/util/which-path-to-executable-bin — Bun.which
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/guides/util/detect-bun — process.versions.bun
import { describe, expect, test } from 'bun:test';
import {
  bunRuntimeProvenance,
  clearBunExecutableCache,
  entrypointPath,
  isModuleEntrypoint,
  isRunningUnderBun,
  resolveBunExecutable,
} from '../lib/bun-executable.ts';

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
});
