// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
import { asFeedId, type FeedId } from '../../lib/types/branded.ts';
import { fail } from './errors.ts';
import type { ReleaseSnapshotInput } from './release-snapshot-contract.ts';
import type { AssetManifest, MediaKind } from './types.ts';

export const ALL_CHANNEL_ID = asFeedId('bun-1.4:all');

export const RELEASE_SNAPSHOT_FEEDS = [
  { file: 'all.xml', id: ALL_CHANNEL_ID },
  { file: 'images.xml', id: asFeedId('bun-1.4:image') },
  { file: 'videos.xml', id: asFeedId('bun-1.4:video') },
  { file: 'embeds.xml', id: asFeedId('bun-1.4:embed') },
] as const;

export const CHANNEL_ID_BY_KIND = {
  image: asFeedId('bun-1.4:image'),
  video: asFeedId('bun-1.4:video'),
  embed: asFeedId('bun-1.4:embed'),
} as const satisfies Record<MediaKind, FeedId>;

type CompactFeedItem = {
  guid?: { '#text'?: string } | string;
  'media:credit'?: { '@role'?: string; '#text'?: string };
};

function rssItems(xml: Uint8Array, file: string): CompactFeedItem[] {
  const parsed = Bun.XML.parse(xml) as {
    rss?: { channel?: { item?: CompactFeedItem | CompactFeedItem[] } };
  };
  const item = parsed.rss?.channel?.item;
  if (item === undefined) fail(`release snapshot feed has no items: ${file}`);
  return Array.isArray(item) ? item : [item];
}

export function buildValidatedFeedState(input: ReleaseSnapshotInput, manifest: AssetManifest) {
  const itemsByChannel = new Map<FeedId, CompactFeedItem[]>();
  const channels = RELEASE_SNAPSHOT_FEEDS.map(feed => {
    const path = `feeds/v1/${feed.file}`;
    const items = rssItems(input[path]!, feed.file);
    itemsByChannel.set(feed.id, items);
    if (
      items.some(item => item['media:credit']?.['#text'] !== manifest.attribution.publisher.name)
    ) {
      fail(`release snapshot feed ownership mismatch: ${feed.file}`);
    }
    return { id: feed.id, file: path, itemCount: items.length };
  });
  if (
    channels.find(channel => channel.id === ALL_CHANNEL_ID)?.itemCount !== manifest.assets.length
  ) {
    fail('release snapshot all.xml does not match manifest asset count');
  }

  const guid = (item: CompactFeedItem) =>
    typeof item.guid === 'string' ? item.guid : item.guid?.['#text'];
  const actualGuids = (itemsByChannel.get(ALL_CHANNEL_ID) ?? []).map(guid).sort();
  const expectedGuids = manifest.assets.map(asset => `bun-1.4:asset:${asset.id}`).sort();
  if (actualGuids.join('\0') !== expectedGuids.join('\0')) {
    fail('release snapshot feed GUIDs do not match manifest IDs');
  }

  const channelGuids = new Map(
    [...itemsByChannel].map(([channelId, items]) => [channelId, new Set(items.map(guid))])
  );
  for (const asset of manifest.assets) {
    const kindChannel = CHANNEL_ID_BY_KIND[asset.kind];
    if (!channelGuids.get(kindChannel)?.has(`bun-1.4:asset:${asset.id}`)) {
      fail(`release snapshot ${kindChannel} is missing ${asset.id}`);
    }
  }
  return channels;
}
