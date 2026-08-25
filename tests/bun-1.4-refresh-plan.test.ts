import { expect, test } from 'bun:test';
import { DEFAULT_MANIFEST_PATH } from '../tools/bun-blog-assets/constants.ts';
import { buildRefreshPlan, formatRefreshPlan } from '../tools/bun-blog-assets/refresh-plan.ts';
import { readManifest } from '../tools/bun-blog-assets/storage.ts';

test('Bun 1.4 refresh plan ignores generation time but reports asset drift', async () => {
  const manifest = await readManifest(DEFAULT_MANIFEST_PATH);
  const onlyGeneratedAtChanged = { ...manifest, generatedAt: '2030-01-01T00:00:00.000Z' };
  expect(buildRefreshPlan(manifest, onlyGeneratedAtChanged).status).toBe('unchanged');

  const changed = {
    ...manifest,
    assets: manifest.assets.map((asset, index) =>
      index === 0 ? { ...asset, alt: `${asset.alt} revised` } : asset
    ),
  };
  const plan = buildRefreshPlan(manifest, changed);
  expect(plan.status).toBe('changed');
  expect(plan.changedAssetIds).toEqual([manifest.assets[0]!.id]);
  expect(formatRefreshPlan(plan)).toContain('Writes: none');
});
