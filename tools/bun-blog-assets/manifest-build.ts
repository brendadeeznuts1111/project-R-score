import { basenamePath as basename } from '../../lib/path-bun';
import {
  BUN_14_MARKDOWN_URL,
  BUN_14_PUBLISHED_AT,
  BUN_14_SOURCE_URL,
  EXPECTED_ASSET_COUNT,
  MANIFEST_SCHEMA_VERSION,
} from './constants.ts';
import { fail } from './errors.ts';
import { buildMediaRights } from './rights.ts';
import type {
  AssetDraft,
  AssetManifest,
  AssetRecord,
  Attribution,
  CliOptions,
  RightsApprovalEvidence,
  SourceDocuments,
} from './types.ts';
import type { FetchedAsset } from './inspection-types.ts';

function localUrlFor(asset: AssetDraft, mode: CliOptions['mode']): string | null {
  if (mode !== 'vendor' || asset.kind === 'embed') return null;
  return `/portal/bun-1.4/media/${basename(asset.path ?? asset.id)}`;
}

export function buildManifest(
  documents: SourceDocuments,
  assets: AssetDraft[],
  inspected: FetchedAsset[],
  authors: Attribution['authors'],
  mode: CliOptions['mode'],
  approval: RightsApprovalEvidence | null = null
): AssetManifest {
  const inspectedById = new Map(inspected.map(item => [item.asset.id, item]));
  const records = assets.map(asset => {
    const item = inspectedById.get(asset.id);
    if (!item) fail(`missing inspection result for ${asset.id}`);
    const localUrl = localUrlFor(asset, mode);
    return {
      ...asset,
      publicUrl: localUrl ?? asset.sourceUrl,
      localUrl,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      sha256: item.sha256,
      format: item.format,
      metadataSource: item.metadataSource,
      width: item.asset.width,
      height: item.asset.height,
      stewardship: {
        team: 'project-r-score-release-channel',
        reviewRole: 'release-channel-maintainer',
        responsibility: 'metadata-routing-and-rights-review',
      },
    } satisfies AssetRecord;
  });
  const rightsStatus = mode === 'vendor' ? 'approved' : 'pending';
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    release: 'Bun 1.4',
    version: '1.4.0',
    sourcePage: BUN_14_SOURCE_URL,
    sourceMarkdown: BUN_14_MARKDOWN_URL,
    publishedAt: BUN_14_PUBLISHED_AT,
    generatedAt: new Date().toISOString(),
    rightsStatus,
    rights: buildMediaRights(rightsStatus, approval),
    attribution: {
      publisher: { name: 'Bun', url: 'https://bun.com/' },
      authors,
      sourcePage: BUN_14_SOURCE_URL,
      rightsNote:
        mode === 'vendor'
          ? 'Vendor output carries scoped approval evidence; preserve Bun attribution.'
          : 'The source page does not declare a media license; binaries remain external until rights are approved.',
    },
    discovery: {
      html: documents.htmlSource,
      markdown: documents.markdownSource,
      expectedAssetCount: EXPECTED_ASSET_COUNT,
    },
    counts: {
      total: records.length,
      image: records.filter(asset => asset.kind === 'image').length,
      video: records.filter(asset => asset.kind === 'video').length,
      embed: records.filter(asset => asset.kind === 'embed').length,
    },
    assets: records,
  };
}
