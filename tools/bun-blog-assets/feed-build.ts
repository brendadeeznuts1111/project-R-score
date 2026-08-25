import { buildRSSFanout, type RSSChannelContract } from '../../lib/rss/rss-fanout.ts';
import type { RSSChannelImage, RSSMediaContent } from '../../lib/rss/rss-xml.ts';
import { asFeedId } from '../../lib/types/branded.ts';
import { capabilitiesByAsset } from './capabilities.ts';
import {
  BUN_14_CAPABILITY_CATEGORY_PREFIX,
  BUN_14_CHAPTER_CATEGORY_PREFIX,
  BUN_14_FEED_BASE_URL,
} from './constants.ts';
import { fail } from './errors.ts';
import type { AssetManifest, AssetRecord, Bun14CapabilityRegistry } from './types.ts';

const CHANNEL_KINDS = ['all', 'image', 'video', 'embed'] as const;
export type Bun14FeedKind = (typeof CHANNEL_KINDS)[number];

function feedUrl(kind: Bun14FeedKind, baseUrl: string): URL {
  return new URL(`/feeds/v1/${kind === 'all' ? 'all' : `${kind}s`}.xml`, baseUrl);
}

function absolutePublicUrl(asset: AssetRecord, baseUrl: string): string {
  return new URL(asset.publicUrl, baseUrl).href;
}

function channelImage(manifest: AssetManifest, title: string, baseUrl: string): RSSChannelImage {
  const artwork = manifest.assets.find(asset => asset.id === 'bun-1.4-og-image');
  if (!artwork) fail('Bun 1.4 feed requires the release artwork asset');
  return {
    url: absolutePublicUrl(artwork, baseUrl),
    title,
    link: manifest.sourcePage,
    width: 144,
    height: 76,
    description: 'Bun 1.4 release artwork, hosted by Bun.',
  };
}

function channels(manifest: AssetManifest, baseUrl: string): RSSChannelContract[] {
  const site = new URL('/portal/bun-1.4/', baseUrl);
  return CHANNEL_KINDS.map(kind => {
    const label = kind === 'all' ? 'All media' : `${kind[0]!.toUpperCase()}${kind.slice(1)}s`;
    const title = `Bun 1.4 · ${label}`;
    return {
      key: asFeedId(`bun-1.4:${kind}`),
      schemaVersion: 1,
      endpoint: feedUrl(kind, baseUrl),
      title,
      site,
      description:
        `${title}. Official Bun-hosted sources with attribution; ` +
        `republication rights are ${manifest.rightsStatus}.`,
      ttl: 60,
      image: channelImage(manifest, title, baseUrl),
    };
  });
}

function assetMedia(
  asset: AssetRecord,
  assetsById: ReadonlyMap<string, AssetRecord>,
  baseUrl: string
): RSSMediaContent {
  const common = {
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    credits: [{ value: 'Bun', role: 'publisher' }],
  };
  if (asset.kind === 'embed') {
    return { ...common, playerUrl: asset.watchUrl ?? asset.sourceUrl };
  }
  if (asset.byteSize === null || asset.mimeType === null) {
    fail(`Bun 1.4 feed asset ${asset.id} requires byte size and MIME type`);
  }
  const poster = asset.posterId ? assetsById.get(asset.posterId) : undefined;
  return {
    ...common,
    url: absolutePublicUrl(asset, baseUrl),
    fileSize: asset.byteSize,
    type: asset.mimeType,
    medium: asset.kind,
    expression: 'full',
    thumbnail: poster
      ? {
          url: absolutePublicUrl(poster, baseUrl),
          width: poster.width ?? undefined,
          height: poster.height ?? undefined,
        }
      : undefined,
  };
}

export function buildBun14AssetFeeds(
  manifest: AssetManifest,
  capabilityRegistry: Bun14CapabilityRegistry,
  baseUrl = BUN_14_FEED_BASE_URL
) {
  const assetsById = new Map(manifest.assets.map(asset => [asset.id, asset]));
  const capabilities = capabilitiesByAsset(capabilityRegistry);
  const allKey = asFeedId('bun-1.4:all');
  const items = manifest.assets.map(asset => {
    const media = assetMedia(asset, assetsById, baseUrl);
    const relatedCapabilities = capabilities.get(asset.id) ?? [];
    const chapterCategories = [
      ...new Set(
        relatedCapabilities
          .map(capability => capability.chapterId)
          .filter((chapterId): chapterId is NonNullable<typeof chapterId> => Boolean(chapterId))
      ),
    ].map(chapterId => `${BUN_14_CHAPTER_CATEGORY_PREFIX}${chapterId}`);
    return {
      guid: asFeedId(`bun-1.4:asset:${asset.id}`),
      channelKeys: [allKey, asFeedId(`bun-1.4:${asset.kind}`)],
      revisionDate: manifest.publishedAt,
      title: asset.caption ?? asset.alt,
      link: manifest.sourcePage,
      description:
        `${asset.alt} Source: Bun. Rights status: ${manifest.rightsStatus}. ` +
        `Related section: ${asset.section}.`,
      pubDate: manifest.publishedAt,
      category: [
        'Bun 1.4',
        asset.kind,
        asset.section,
        ...relatedCapabilities.map(
          capability => `${BUN_14_CAPABILITY_CATEGORY_PREFIX}${capability.id}`
        ),
        ...chapterCategories,
      ],
      enclosure:
        asset.kind === 'embed'
          ? undefined
          : { url: media.url!, length: media.fileSize!, type: media.type! },
      media,
    };
  });
  return buildRSSFanout(channels(manifest, baseUrl), items);
}
