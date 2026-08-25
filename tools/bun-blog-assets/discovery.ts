import {
  EXPECTED_ASSET_COUNT,
  EXPECTED_IMAGE_PATHS,
  EXPECTED_VIDEO_PATHS,
  EXPECTED_YOUTUBE_URL,
} from './constants.ts';
import { parseHtmlMedia } from './discover-html.ts';
import { parseMarkdownMedia } from './discover-markdown.ts';
import { fail, parseRecord } from './errors.ts';
import type { AssetDraft, Attribution, SourceDocuments } from './types.ts';

function validateDiscoveredInventory(map: Map<string, AssetDraft>): AssetDraft[] {
  const assets = [...map.values()];
  const imagePaths = new Set(
    assets
      .filter(asset => asset.kind === 'image')
      .map(asset => asset.path)
      .filter(Boolean)
  );
  const videoPaths = new Set(
    assets
      .filter(asset => asset.kind === 'video')
      .map(asset => asset.path)
      .filter(Boolean)
  );
  const embeds = assets.filter(asset => asset.kind === 'embed');

  const missingImages = [...EXPECTED_IMAGE_PATHS].filter(path => !imagePaths.has(path));
  const extraImages = [...imagePaths].filter(path => !EXPECTED_IMAGE_PATHS.has(path));
  const missingVideos = [...EXPECTED_VIDEO_PATHS].filter(path => !videoPaths.has(path));
  const extraVideos = [...videoPaths].filter(path => !EXPECTED_VIDEO_PATHS.has(path));
  if (missingImages.length || extraImages.length || missingVideos.length || extraVideos.length) {
    fail(
      `official media inventory drifted; missing images=[${missingImages.join(', ')}], ` +
        `extra images=[${extraImages.join(', ')}], missing videos=[${missingVideos.join(', ')}], ` +
        `extra videos=[${extraVideos.join(', ')}]`
    );
  }
  if (embeds.length !== 1 || embeds[0]?.sourceUrl !== EXPECTED_YOUTUBE_URL) {
    fail(`expected one YouTube embed at ${EXPECTED_YOUTUBE_URL}`);
  }
  if (assets.length !== EXPECTED_ASSET_COUNT) {
    fail(`expected ${EXPECTED_ASSET_COUNT} assets, discovered ${assets.length}`);
  }

  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.id)) fail(`duplicate asset id ${asset.id}`);
    ids.add(asset.id);
    if (!asset.alt.trim()) fail(`asset ${asset.id} is missing alt text`);
    if (asset.kind === 'video' && !asset.posterId) fail(`video ${asset.id} is missing posterId`);
  }

  const rank = (asset: AssetDraft): number => {
    if (asset.kind === 'embed') return 2;
    if (asset.kind === 'video') return 1;
    return 0;
  };
  return assets.sort((left, right) => rank(left) - rank(right) || left.id.localeCompare(right.id));
}

function parseAuthors(html: string): Attribution['authors'] {
  const script = html.match(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  )?.[1];
  if (!script) return [];
  try {
    const parsed = JSON.parse(script) as { '@graph'?: unknown[] };
    const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [];
    const posting = graph.map(parseRecord).find(record => record?.['@type'] === 'BlogPosting');
    const authors = posting && Array.isArray(posting.author) ? posting.author : [];
    return authors
      .map(parseRecord)
      .filter((author): author is Record<string, unknown> => Boolean(author))
      .map(author => ({
        name: typeof author.name === 'string' ? author.name : 'Unknown Bun contributor',
        ...(typeof author.url === 'string' ? { url: author.url } : {}),
      }));
  } catch {
    return [];
  }
}

export function discoverAssets(documents: SourceDocuments): {
  assets: AssetDraft[];
  authors: Attribution['authors'];
} {
  const map = new Map<string, AssetDraft>();
  parseMarkdownMedia(documents.markdown, map);
  parseHtmlMedia(documents.html, documents.markdown, map);
  return { assets: validateDiscoveredInventory(map), authors: parseAuthors(documents.html) };
}
