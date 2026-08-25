import type { AssetManifest, AssetRecord } from './types.ts';

export type RefreshPlan = {
  status: 'unchanged' | 'changed';
  existingAssetCount: number;
  proposedAssetCount: number;
  addedAssetIds: string[];
  removedAssetIds: string[];
  changedAssetIds: string[];
  metadataChanged: boolean;
};

function assetFingerprint(asset: AssetRecord): string {
  return JSON.stringify({
    id: asset.id,
    kind: asset.kind,
    sourceUrl: asset.sourceUrl,
    publicUrl: asset.publicUrl,
    localUrl: asset.localUrl,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
    format: asset.format,
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
    caption: asset.caption,
    section: asset.section,
    posterId: asset.posterId,
    lazyLoad: asset.lazyLoad,
    watchUrl: asset.watchUrl,
    metadataSource: asset.metadataSource,
  });
}

function manifestMetadataFingerprint(manifest: AssetManifest): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    release: manifest.release,
    version: manifest.version,
    sourcePage: manifest.sourcePage,
    sourceMarkdown: manifest.sourceMarkdown,
    publishedAt: manifest.publishedAt,
    rightsStatus: manifest.rightsStatus,
    rights: manifest.rights,
    attribution: manifest.attribution,
    discovery: manifest.discovery,
    counts: manifest.counts,
  });
}

/** Compare a fresh upstream projection without treating generation time as drift. */
export function buildRefreshPlan(existing: AssetManifest, proposed: AssetManifest): RefreshPlan {
  const existingById = new Map(existing.assets.map(asset => [asset.id, asset]));
  const proposedById = new Map(proposed.assets.map(asset => [asset.id, asset]));
  const addedAssetIds = [...proposedById.keys()].filter(id => !existingById.has(id)).sort();
  const removedAssetIds = [...existingById.keys()].filter(id => !proposedById.has(id)).sort();
  const changedAssetIds = [...proposedById.keys()]
    .filter(id => {
      const current = existingById.get(id);
      const next = proposedById.get(id);
      return (
        current !== undefined &&
        next !== undefined &&
        assetFingerprint(current) !== assetFingerprint(next)
      );
    })
    .sort();
  const metadataChanged =
    manifestMetadataFingerprint(existing) !== manifestMetadataFingerprint(proposed);
  return {
    status:
      addedAssetIds.length || removedAssetIds.length || changedAssetIds.length || metadataChanged
        ? 'changed'
        : 'unchanged',
    existingAssetCount: existing.assets.length,
    proposedAssetCount: proposed.assets.length,
    addedAssetIds,
    removedAssetIds,
    changedAssetIds,
    metadataChanged,
  };
}

export function formatRefreshPlan(plan: RefreshPlan): string {
  const list = (ids: string[]) => (ids.length ? ids.join(', ') : 'none');
  return [
    'Bun 1.4 refresh plan',
    '====================',
    `  * Status: ${plan.status}`,
    `  * Assets: ${plan.existingAssetCount} → ${plan.proposedAssetCount}`,
    `  * Added: ${list(plan.addedAssetIds)}`,
    `  * Removed: ${list(plan.removedAssetIds)}`,
    `  * Changed: ${list(plan.changedAssetIds)}`,
    `  * Manifest metadata: ${plan.metadataChanged ? 'changed' : 'unchanged'}`,
    '  * Writes: none',
  ].join('\n');
}
