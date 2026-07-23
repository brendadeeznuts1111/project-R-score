/**
 * Three-source Bun API verification harness tests.
 * @see ../tools/bun-api-verify.ts
 * @see ../lib/bun-api-proof.ts
 */
import { describe, expect, test } from 'bun:test';
import { proofHash, proofPreview, typesContains } from '../lib/bun-api-proof.ts';
import { OPS_ONELINERS, runOpsOneliner } from '../tools/bun-ops-oneliners.ts';
import { verifyBunApis } from '../tools/bun-api-verify.ts';

describe('proofHash', () => {
  test('stable for same input', () => {
    const a = proofHash({ signature: 'demo:file-meta', runtimeOutput: 'ok', bunVersion: '1.4.0' });
    const b = proofHash({ signature: 'demo:file-meta', runtimeOutput: 'ok', bunVersion: '1.4.0' });
    expect(a).toBe(b);
    expect(proofPreview(a)).toHaveLength(8);
  });

  test('changes when runtime output changes', () => {
    const a = proofHash({ signature: 'x', runtimeOutput: 'a', bunVersion: '1.4.0' });
    const b = proofHash({ signature: 'x', runtimeOutput: 'b', bunVersion: '1.4.0' });
    expect(a).not.toBe(b);
  });
});

describe('ops oneliners', () => {
  test('inventory has 10 demos', () => {
    expect(OPS_ONELINERS.length).toBe(10);
  });

  test('run generate-play + fund-agent-rail offline', async () => {
    const play = await runOpsOneliner('generate-play');
    expect(play.result).toMatch(/play=/);
    const fund = await runOpsOneliner('fund-agent-rail');
    expect(fund.result).toMatch(/funded=\$/);
  });

  test('webview demo requires --live', async () => {
    await expect(runOpsOneliner('place-bet-webview')).rejects.toThrow(/live/);
  });
});

describe('verifyBunApis (offline)', () => {
  test('passes offline api + ops demos', async () => {
    const manifest = await verifyBunApis({ live: false, write: false });
    expect(manifest.summary.demos).toBeGreaterThan(0);
    expect(manifest.summary.demosPassed).toBe(manifest.summary.demos);
    expect(manifest.summary.opsDemos).toBe(9);
    expect(manifest.summary.apiDemos).toBeGreaterThan(0);
  }, 120_000);

  test('typesContains matches bun-types symbols', async () => {
    const dts = await Bun.file(
      Bun.resolveSync('bun-types/bun.d.ts', process.cwd())
    ).text();
    expect(typesContains(dts, 'Bun.CryptoHasher')).toBe(true);
    expect(typesContains(dts, 'Bun.file')).toBe(true);
  });
});
