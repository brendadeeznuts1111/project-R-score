// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BAKE_MANIFEST_KIND,
  BAKE_MANIFEST_SCHEMA_VERSION,
  buildBakeManifest,
  resolveBakeRuntime,
} from '../lib/registry/bake-manifest.ts';

describe('bake-manifest runtime provenance', () => {
  test('resolveBakeRuntime prefers explicit version then BUN_VERSION then Bun.version', () => {
    const pinned = resolveBakeRuntime({
      runtimeVersion: '1.4.0-test-pin',
      bakedAt: '2026-08-05T12:00:00.000Z',
    });
    expect(pinned.runtime).toBe('bun');
    expect(pinned.runtimeVersion).toBe('1.4.0-test-pin');
    expect(pinned.bakedAt).toBe('2026-08-05T12:00:00.000Z');

    const live = resolveBakeRuntime({ bakedAt: '2026-08-05T12:00:00.000Z' });
    expect(live.runtime).toBe('bun');
    expect(live.runtimeVersion).toBeTruthy();
    // Under bun test, native version is always present
    expect(live.runtimeVersion).toBe(Bun.version);
    if (Bun.revision) {
      expect(live.runtimeRevision).toBe(String(Bun.revision).slice(0, 12));
    }
  });

  test('buildBakeManifest embeds runtime and schemaVersion 2', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bake-manifest-'));
    try {
      writeFileSync(
        join(dir, 'ops-summary.json'),
        JSON.stringify({ generatedAt: '2026-08-01T00:00:00.000Z', source: 'snapshot' }) + '\n'
      );
      const generatedAt = '2026-08-05T16:00:00.000Z';
      const manifest = await buildBakeManifest({
        registryDir: dir,
        generatedAt,
        paths: ['ops-summary.json'],
        runtime: {
          runtime: 'bun',
          runtimeVersion: '1.4.0-fixture',
          bakedAt: generatedAt,
          runtimeRevision: 'deadbeefcafe',
        },
      });
      expect(manifest.kind).toBe(BAKE_MANIFEST_KIND);
      expect(manifest.schemaVersion).toBe(BAKE_MANIFEST_SCHEMA_VERSION);
      expect(manifest.schemaVersion).toBe(2);
      expect(manifest.generatedAt).toBe(generatedAt);
      expect(manifest.runtime).toEqual({
        runtime: 'bun',
        runtimeVersion: '1.4.0-fixture',
        bakedAt: generatedAt,
        runtimeRevision: 'deadbeefcafe',
      });
      expect(manifest.entries.some(e => e.path === '/registry/ops-summary.json')).toBe(true);
      expect(manifest.entries.find(e => e.path === '/registry/ops-summary.json')?.source).toBe(
        'snapshot'
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('buildBakeManifest default runtime uses live Bun.version', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bake-manifest-live-'));
    try {
      // empty dir → zero priority files may exist; still returns valid shape
      mkdirSync(dir, { recursive: true });
      const manifest = await buildBakeManifest({
        registryDir: dir,
        generatedAt: '2026-08-05T17:00:00.000Z',
        paths: [],
      });
      expect(manifest.runtime.runtime).toBe('bun');
      expect(manifest.runtime.runtimeVersion).toBe(Bun.version);
      expect(manifest.runtime.bakedAt).toBe('2026-08-05T17:00:00.000Z');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
