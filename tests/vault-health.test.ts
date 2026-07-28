// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  computeVaultHealth,
  itemTitleFromRow,
  liveItemsFromListJson,
  type VaultLiveItem,
} from '../lib/security/vault-health.ts';

describe('vault-health', () => {
  test('liveItemsFromListJson parses items shape with states', () => {
    const raw = JSON.stringify({
      items: [
        { title: 'A', state: 'Active' },
        { title: 'B', state: 'Trashed' },
        { data: { metadata: { name: 'C' } }, state: 'Active' },
      ],
    });
    expect(liveItemsFromListJson(raw)).toEqual([
      { title: 'A', state: 'Active' },
      { title: 'B', state: 'Trashed' },
      { title: 'C', state: 'Active' },
    ]);
  });

  test('liveItemsFromListJson supports bare array + rejects bad JSON', () => {
    expect(liveItemsFromListJson('[{"title":"X","state":"Active"}]')).toHaveLength(1);
    expect(() => liveItemsFromListJson('not-json{')).toThrow(/parse/);
  });

  test('itemTitleFromRow prefers title, falls back name/metadata', () => {
    expect(itemTitleFromRow({ title: 'T' })).toBe('T');
    expect(itemTitleFromRow({ name: 'N' })).toBe('N');
    expect(itemTitleFromRow({ data: { metadata: { name: 'M' } } })).toBe('M');
    expect(itemTitleFromRow({})).toBeNull();
  });

  const live = new Map<string, VaultLiveItem[]>([
    [
      'factorywager',
      [
        { title: 'Good Token', state: 'Active' },
        { title: 'Telegram: bot', state: 'Trashed' },
      ],
    ],
    ['cloudflare', [{ title: 'DNS Token', state: 'Active' }]],
  ]);

  test('computeVaultHealth flags trashed and missing references', () => {
    const report = computeVaultHealth(
      [
        { envKey: 'GOOD', vault: 'factorywager', item: 'Good Token' },
        { envKey: 'TG', vault: 'factorywager', item: 'Telegram: bot' },
        { envKey: 'GH', vault: 'factorywager', item: 'GitHub PAT' },
        { envKey: 'DNS', vault: 'cloudflare', item: 'DNS Token' },
        { envKey: 'NOVAULT', vault: null, item: null },
      ],
      live,
      '2026-07-28T00:00:00Z'
    );
    const byKey = Object.fromEntries(report.referenced.map(r => [r.envKey, r.status]));
    expect(byKey).toEqual({ GOOD: 'ok', TG: 'trashed', GH: 'missing', DNS: 'ok' });
    expect(report.summary.referencedOk).toBe(2);
    expect(report.summary.referencedTrashed).toBe(1);
    expect(report.summary.referencedMissing).toBe(1);
    expect(report.summary.healthy).toBe(false);
    // refs without vault/item are skipped entirely
    expect(report.referenced).toHaveLength(4);
  });

  test('computeVaultHealth healthy when all refs resolve Active', () => {
    const report = computeVaultHealth(
      [{ envKey: 'DNS', vault: 'cloudflare', item: 'DNS Token' }],
      live
    );
    expect(report.summary.healthy).toBe(true);
    expect(report.summary.vaultCount).toBe(2);
    expect(report.summary.activeItems).toBe(2);
    expect(report.summary.trashedItems).toBe(1);
  });

  test('vault rollup tracks trashed titles sorted', () => {
    const report = computeVaultHealth([], live);
    const fw = report.vaults.find(v => v.name === 'factorywager')!;
    expect(fw.active).toBe(1);
    expect(fw.trashed).toBe(1);
    expect(fw.trashedTitles).toEqual(['Telegram: bot']);
  });
});
