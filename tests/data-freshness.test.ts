// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  ageMsFromIso,
  formatAge,
  formatFreshnessLabel,
  getFreshness,
  loadBakeManifest,
  normalizeRegistryPath,
  toneForAge,
  FRESHNESS_OK_MS,
  FRESHNESS_WARN_MS,
} from '../public/portal/data-freshness.js';

describe('portal data-freshness', () => {
  test('normalizeRegistryPath', () => {
    expect(normalizeRegistryPath('ops-summary.json')).toBe('/registry/ops-summary.json');
    expect(normalizeRegistryPath('/registry/ops-summary.json')).toBe('/registry/ops-summary.json');
    expect(normalizeRegistryPath('registry/tennis/partner-contracts.json')).toBe(
      '/registry/tennis/partner-contracts.json'
    );
  });

  test('tone thresholds', () => {
    expect(toneForAge(30 * 60 * 1000)).toBe('ok');
    expect(toneForAge(FRESHNESS_OK_MS + 1)).toBe('warn');
    expect(toneForAge(FRESHNESS_WARN_MS + 1)).toBe('bad');
    expect(toneForAge(null)).toBe('unknown');
  });

  test('formatAge / labels', () => {
    expect(formatAge(30_000)).toBe('just now');
    expect(formatAge(5 * 60_000)).toBe('5 min ago');
    expect(formatAge(2 * 60 * 60_000)).toBe('2h ago');
    const info = {
      bakedAt: '2026-08-05T12:00:00.000Z',
      ageMs: 14 * 60_000,
      isStale: false,
      tone: 'ok' as const,
      source: null,
      path: '/registry/ops-summary.json',
      label: '',
      title: '',
    };
    expect(formatFreshnessLabel(info)).toBe('Updated 14 min ago');
  });

  test('getFreshness uses oldest of multi keys + fallbacks', async () => {
    const now = Date.parse('2026-08-05T16:00:00.000Z');
    const manifest = {
      kind: 'registry-bake-manifest',
      entries: [
        {
          path: '/registry/tennis/partner-contracts.json',
          bakedAt: '2026-08-05T15:50:00.000Z',
          source: 'live',
        },
        {
          path: '/registry/tennis/board-metrics.json',
          bakedAt: '2026-08-05T12:00:00.000Z',
          source: 'event-store',
        },
      ],
    };
    const info = await getFreshness(
      ['/registry/tennis/partner-contracts.json', '/registry/tennis/board-metrics.json'],
      { now, manifest }
    );
    expect(info?.path).toBe('/registry/tennis/board-metrics.json');
    expect(info?.tone).toBe('bad'); // 4h old
    expect(info?.label).toContain('Updated');
  });

  test('getFreshness fails silent without manifest or timestamps', async () => {
    expect(await getFreshness('/registry/missing.json', { manifest: null })).toBeNull();
    expect(
      await getFreshness('/registry/ops-summary.json', {
        manifest: { kind: 'registry-bake-manifest', entries: [] },
      })
    ).toBeNull();
  });

  test('loadBakeManifest accepts fixture via fetchImpl', async () => {
    const body = {
      kind: 'registry-bake-manifest',
      entries: [{ path: '/registry/ops-summary.json', bakedAt: '2026-08-05T15:00:00.000Z' }],
    };
    const manifest = await loadBakeManifest({
      force: true,
      fetchImpl: async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    expect(manifest?.kind).toBe('registry-bake-manifest');
    expect(manifest?.entries).toHaveLength(1);
  });

  test('ageMsFromIso', () => {
    const now = Date.parse('2026-08-05T12:00:00.000Z');
    expect(ageMsFromIso('2026-08-05T11:00:00.000Z', now)).toBe(3600_000);
    expect(ageMsFromIso('not-a-date', now)).toBeNull();
  });
});
