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

function sectionForMarkdownUrl(markdown: string, path: string): string {
  const offset = markdown.indexOf(path);
  return offset >= 0 ? sectionAt(markdown, offset) : 'Bun 1.4';
}

export function parseHtmlMedia(html: string, markdown: string, map: Map<string, AssetDraft>): void {
  const imagePattern = /<img\b([^>]*)>/gi;
  for (const match of html.matchAll(imagePattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    if (!attrs.src) continue;
    const candidate = new URL(attrs.src, BUN_14_SOURCE_URL);
    if (candidate.protocol !== 'https:' || candidate.hostname !== 'bun.com') continue;
    const url = canonicalSourceUrl(attrs.src);
    const path = sourcePath(url);
    if (!path.startsWith('/images/blog/bun-1.4/')) continue;
    const dimensions = sourceDimensions(attrs);
    addDraft(map, {
      id: assetId('image', url),
      kind: 'image',
      sourceUrl: url,
      path,
      alt: attrs.alt ?? '',
      section: sectionForMarkdownUrl(markdown, path),
      width: dimensions.width,
      height: dimensions.height,
      lazyLoad: attrs.loading === 'lazy',
    });
  }

  const metaPattern = /<meta\b([^>]*)>/gi;
  for (const match of html.matchAll(metaPattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    if (attrs.property?.toLowerCase() !== 'og:image' || !attrs.content) continue;
    const url = canonicalSourceUrl(attrs.content);
    addDraft(map, {
      id: assetId('image', url),
      kind: 'image',
      sourceUrl: url,
      path: sourcePath(url),
      alt: 'Bun 1.4 release artwork',
      section: 'Release artwork',
      width: null,
      height: null,
      lazyLoad: false,
    });
  }

  const videoPattern = /<video\b([^>]*)>/gi;
  for (const match of html.matchAll(videoPattern)) {
    const attrs = parseAttributes(match[1] ?? '');
    if (!attrs.poster) continue;
    const posterUrl = canonicalSourceUrl(attrs.poster);
    const label =
      attrs['aria-label'] ??
      `${basename(sourcePath(posterUrl)).replace(/-poster\.jpg$/i, '')} poster`;
    addDraft(map, {
      id: assetId('image', posterUrl),
      kind: 'image',
      sourceUrl: posterUrl,
      path: sourcePath(posterUrl),
      alt: `${label} poster`,
      caption: label,
      section: sectionForMarkdownUrl(markdown, sourcePath(posterUrl)),
      // Video element dimensions are not a reliable poster-image contract.
      width: null,
      height: null,
      lazyLoad: true,
    });
  }

  const iframePattern = /<iframe\b([^>]*)>/gi;
  for (const match of html.matchAll(iframePattern)) {
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
