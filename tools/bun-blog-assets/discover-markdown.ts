import { basenamePath as basename } from '../../lib/path-bun';
import { BUN_14_SOURCE_URL } from './constants.ts';
import {
  addDraft,
  assetId,
  canonicalSourceUrl,
  numberAttribute,
  parseAttributes,
  sectionAt,
  sourceDimensions,
  sourcePath,
} from './html.ts';
import type { AssetDraft } from './types.ts';

export function parseMarkdownMedia(markdown: string, map: Map<string, AssetDraft>): void {
  const imagePattern = /\{%\s*image\s+([^%]+?)\s*\/\s*%\}/gi;
  for (const match of markdown.matchAll(imagePattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    const rawSrc = attrs.src;
    if (!rawSrc) continue;
    const url = canonicalSourceUrl(rawSrc);
    const path = sourcePath(url);
    if (!path.startsWith('/images/blog/bun-1.4/')) continue;
    const dimensions = sourceDimensions(attrs);
    addDraft(map, {
      id: assetId('image', url),
      kind: 'image',
      sourceUrl: url,
      path,
      alt: attrs.alt ?? '',
      caption: attrs.caption,
      section: sectionAt(markdown, match.index ?? 0),
      width: dimensions.width,
      height: dimensions.height,
      lazyLoad: true,
    });
  }

  const videoPattern = /\{%\s*lazyVideo\s+([^%]+?)\s*\/\s*%\}/gi;
  for (const match of markdown.matchAll(videoPattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    if (!attrs.src || !attrs.poster) continue;
    const videoUrl = canonicalSourceUrl(attrs.src);
    const posterUrl = canonicalSourceUrl(attrs.poster);
    const videoDimensions = sourceDimensions(attrs);
    const label = attrs.label ?? attrs.alt ?? basename(sourcePath(videoUrl)).replace(/\.mp4$/i, '');
    const section = sectionAt(markdown, match.index ?? 0);
    const poster = {
      id: assetId('image', posterUrl),
      kind: 'image' as const,
      sourceUrl: posterUrl,
      path: sourcePath(posterUrl),
      alt: `${label} poster`,
      caption: label,
      section,
      // The lazyVideo viewport does not necessarily match the poster geometry.
      width: null,
      height: null,
      lazyLoad: true,
    };
    addDraft(map, poster);
    addDraft(map, {
      id: assetId('video', videoUrl),
      kind: 'video',
      sourceUrl: videoUrl,
      path: sourcePath(videoUrl),
      alt: label,
      caption: label,
      section,
      width: videoDimensions.width,
      height: videoDimensions.height,
      posterId: poster.id,
      lazyLoad: true,
    });
  }

  const iframePattern = /<iframe\b([^>]*)>/gi;
  for (const match of markdown.matchAll(iframePattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    if (!attrs.src || !attrs.src.includes('youtube.com/embed/')) continue;
    const embedUrl = new URL(attrs.src, BUN_14_SOURCE_URL).href;
    addDraft(map, {
      id: assetId('embed', embedUrl),
      kind: 'embed',
      sourceUrl: embedUrl,
      alt: attrs.title ?? 'Bun 1.4 overview video',
      section: 'Overview',
      width: numberAttribute(attrs, 'width'),
      height: numberAttribute(attrs, 'height'),
      lazyLoad: true,
      watchUrl: `https://www.youtube.com/watch?v=${new URL(embedUrl).pathname.split('/').at(-1)}`,
    });
  }
}
