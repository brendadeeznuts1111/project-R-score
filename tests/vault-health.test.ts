// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/snapshots — toMatchSnapshot / --update-snapshots
/**
 * Vault health gate (offline-safe).
 *
 * - Engine unit tests: pure computeVaultHealth / parsers (fixtures only).
 * - Report-shape snapshots: stable JSON contract for the bake/board payload.
 * - Inventory snapshot: machine SSOT for env→vault/item paths the vault
 *   *should* contain (from env.template + config/vault-map.toml). Move or
 *   delete a mapped secret → this file fails until you intentionally update:
 *     bun run portal-cli vault health --update
 *     # or: bun test tests/vault-health.test.ts --update-snapshots
 *
 * Live Proton Pass state is NOT checked here (needs session). That is the
 * bake gate: `bun run vault:health:bake` → public/portal/vault/ board.
 */
import { describe, expect, test } from 'bun:test';
import { buildVaultMapBundle } from '../lib/security/vault-map.ts';
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

  test('list-failure fail-closed: omit vault from map and skip its refs (no invented missing)', () => {
    // Bake CLI drops failed vaults from liveByVault and scores only listed vaults.
    // Empty map entry would invent referencedMissing for every key in that vault.
    const listedOnly = new Map([['cloudflare', live.get('cloudflare')!]]);
    const allRefs = [
      { envKey: 'GOOD', vault: 'factorywager', item: 'Good Token' },
      { envKey: 'DNS', vault: 'cloudflare', item: 'DNS Token' },
    ];
    const failed = new Set(['factorywager']);
    const scored = allRefs.filter(r => r.vault && !failed.has(r.vault));
    const report = computeVaultHealth(scored, listedOnly, '2026-08-05T00:00:00Z');
    expect(report.referenced.map(r => r.envKey)).toEqual(['DNS']);
    expect(report.summary.referencedMissing).toBe(0);
    expect(report.summary.healthy).toBe(true);
    // Bake still forces unhealthy when listFailures.length > 0 (CLI layer).
  });

  test('vault rollup tracks trashed titles sorted', () => {
    const report = computeVaultHealth([], live);
    const fw = report.vaults.find(v => v.name === 'factorywager')!;
    expect(fw.active).toBe(1);
    expect(fw.trashed).toBe(1);
    expect(fw.trashedTitles).toEqual(['Telegram: bot']);
  });

  test('report shape is a stable contract (snapshot)', () => {
    const report = computeVaultHealth(
      [
        { envKey: 'GOOD', vault: 'factorywager', item: 'Good Token' },
        { envKey: 'TG', vault: 'factorywager', item: 'Telegram: bot' },
        { envKey: 'GH', vault: 'factorywager', item: 'GitHub PAT' },
        { envKey: 'DNS', vault: 'cloudflare', item: 'DNS Token' },
      ],
      live,
      '2026-07-28T00:00:00Z'
    );
    expect(report).toMatchSnapshot();
  });

  test('healthy report shape (snapshot)', () => {
    const report = computeVaultHealth(
      [{ envKey: 'DNS', vault: 'cloudflare', item: 'DNS Token' }],
      live,
      '2026-07-28T00:00:00Z'
    );
    expect(report).toMatchSnapshot();
  });

  /**
   * Inventory SSOT — what the vault map claims must exist (no live pass-cli).
   * Strips runtimePresent / generatedAt so the snap is env-independent in CI.
   */
  test('vault-map referenced inventory is stable (snapshot)', async () => {
    const bundle = await buildVaultMapBundle({ env: {} });
    const inventory = bundle.entries
      .filter(e => e.vault && e.item)
      .map(e => ({
        envKey: e.envKey,
        vault: e.vault,
        item: e.item,
        field: e.field,
        inTemplate: e.inTemplate,
        passRef: e.passRef,
      }))
      .sort((a, b) => a.envKey.localeCompare(b.envKey));
    expect(inventory).toMatchSnapshot();
  });
});
