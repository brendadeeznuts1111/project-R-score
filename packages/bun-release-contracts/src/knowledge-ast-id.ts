// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash.crc32
import {
  asReleaseAssetId,
  asReleaseKnowledgeNodeId,
  type ReleaseAssetId,
  type ReleaseKnowledgeNodeId,
} from '../../../lib/types/branded.ts';
import type { ReleaseKnowledgeNode } from './knowledge-types.ts';

export function releaseAstAssetId(
  version: string,
  kind: 'image' | 'video' | 'embed',
  raw: string
): ReleaseAssetId | null {
  let url: URL;
  try {
    url = new URL(raw, `https://bun.com/blog/bun-v${version.replace(/\.0$/, '')}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (kind === 'embed' && url.hostname === 'www.youtube.com' && url.pathname.includes('/embed/')) {
    return asReleaseAssetId(`bun-${version.replace(/\.0$/, '')}-youtube-overview`);
  }
  if (url.hostname !== 'bun.com') return null;
  const filename = url.pathname.split('/').at(-1) ?? '';
  const name = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return name ? asReleaseAssetId(`bun-${version.replace(/\.0$/, '')}-${name}`) : null;
}

export function releaseAstNodeId(
  version: string,
  type: ReleaseKnowledgeNode['type'],
  identity: string
): ReleaseKnowledgeNodeId {
  const hash = Bun.hash.crc32(`${type}\u0000${identity}`).toString(16).padStart(8, '0');
  return asReleaseKnowledgeNodeId(`bun-${version}-${type.toLowerCase()}-${hash}`);
}
