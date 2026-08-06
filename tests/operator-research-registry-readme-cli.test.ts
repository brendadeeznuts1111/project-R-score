import { describe, expect, test } from 'bun:test';
import { getRegistryPackage } from '../lib/operator-research/registry-desk.ts';
import { renderReadmeAnsi } from '../lib/factory/markdown.ts';

describe('registry-readme (snapshot + Bun.markdown.ansi)', () => {
  test('event-store@1.0.0 readme renders non-empty ANSI when present', async () => {
    const detail = await getRegistryPackage('event-store', '1.0.0');
    if (!detail?.readme) return; // older snapshot may omit
    expect(detail.selectedVersion).toBe('1.0.0');
    const ansi = renderReadmeAnsi(detail.readme, 80);
    expect(ansi.length).toBeGreaterThan(0);
    expect(typeof ansi).toBe('string');
  });

  test('missing package returns null', async () => {
    expect(await getRegistryPackage('definitely-not-a-real-pkg-xyz-readme')).toBeNull();
  });
});
