// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';
import {
  CHANNEL_META_BAKE_PATH,
  channelMetaToOpsSlice,
  isChannelMetaMergedRow,
  nitsRowsToChannelMeta,
  refreshChannelMetaProof,
  saveChannelMetaProof,
  stripChannelMetaRows,
} from '../lib/verification/channel-meta-refresh.ts';
import { loadChannelMetaSlice } from '../lib/operations/ops-summary.ts';
import type { VerificationResult } from '../lib/verification/types.ts';

describe('lib/verification/channel-meta-refresh', () => {
  test('stripChannelMetaRows is idempotent on meta prefixes', () => {
    const rows: VerificationResult[] = [
      { name: 'tls.getCACertificates', expected: 'ok', actual: 'ok', passed: true },
      {
        name: 'runtime-nits:inspect.sorted',
        expected: 'ok',
        actual: 'ok',
        passed: true,
      },
      { name: 'bundler:loader.css.explicit', expected: 'ok', actual: 'ok', passed: true },
      { name: 'networking:Health', expected: 'ok', actual: 'ok', passed: true },
    ];
    const stripped = stripChannelMetaRows(rows);
    expect(stripped).toHaveLength(1);
    expect(stripped[0]!.name).toBe('tls.getCACertificates');
    expect(stripChannelMetaRows(stripped)).toEqual(stripped);
    expect(isChannelMetaMergedRow(rows[1]!)).toBe(true);
    expect(isChannelMetaMergedRow(rows[0]!)).toBe(false);
  });

  test('nitsRowsToChannelMeta prefixes names once', () => {
    const once = nitsRowsToChannelMeta([
      {
        name: 'inspect.sorted',
        expected: 'ok',
        actual: 'ok',
        passed: true,
        category: 'inspect',
      } as VerificationResult & { category: string },
    ]);
    expect(once[0]!.name).toBe('runtime-nits:inspect.sorted');
    expect(once[0]!.features).toContain('runtime-nits');
    expect(once[0]!.features).toContain('inspect');
    const twice = nitsRowsToChannelMeta(once);
    expect(twice[0]!.name).toBe('runtime-nits:inspect.sorted');
  });

  test('refreshChannelMetaProof prefers public/registry artifacts', async () => {
    const root = resolvePath(import.meta.dir, '..');
    const { report, sources } = await refreshChannelMetaProof({
      root,
      preferArtifacts: true,
    });
    expect(sources.release).toBe('artifact');
    expect(sources.nits).toBe('artifact');
    expect(sources.bundler).toBe('artifact');
    expect(sources.networking).toBe('artifact');
    expect(report.type).toBe('ChannelAwareVerificationReport');
    expect(report.summary.total).toBeGreaterThan(40);
    expect(report.results.some(r => r.name.startsWith('runtime-nits:'))).toBe(true);
    expect(report.results.some(r => r.name.startsWith('bundler:'))).toBe(true);
    expect(report.results.some(r => r.name.startsWith('networking:'))).toBe(true);
    expect(report.summary.bySubsystem?.bundler?.total).toBeGreaterThan(0);
    expect(report.summary.bySubsystem?.networking?.total).toBeGreaterThan(0);
    // Idempotent strip: meta rows are not duplicated when base was already suite=all
    const nitsCount = report.results.filter(r => r.name.startsWith('runtime-nits:')).length;
    expect(nitsCount).toBeLessThanOrEqual(32);
    expect(report.summary.status).toBe('pass');
  });

  test('saveChannelMetaProof writes bake sidecar and ops slice loads it', async () => {
    const root = resolvePath(import.meta.dir, '..');
    const { report, sources } = await refreshChannelMetaProof({
      root,
      preferArtifacts: true,
    });
    const { bakePath } = await saveChannelMetaProof(report, sources);
    expect(bakePath).toBe(CHANNEL_META_BAKE_PATH);
    const bakeFile = Bun.file(CHANNEL_META_BAKE_PATH);
    expect(await bakeFile.exists()).toBe(true);
    const bake = await bakeFile.json();
    expect(bake.type).toBe('ChannelMetaBake');
    expect(bake.sources.bundler).toBe('artifact');
    const slice = channelMetaToOpsSlice(bake, report);
    expect(slice.available).toBe(true);
    expect(slice.sources?.networking).toBe('artifact');
    const loaded = loadChannelMetaSlice();
    expect(loaded.available).toBe(true);
    expect(loaded.total).toBe(report.summary.total);
    expect(loaded.sources?.release).toBe('artifact');
  });
});
