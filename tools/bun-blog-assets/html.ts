import { basenamePath as basename, extnamePath as extname } from '../../lib/path-bun';
import { asReleaseAssetId, type ReleaseAssetId } from '../../lib/types/branded.ts';
import { BUN_14_SOURCE_URL } from './constants.ts';
import { fail } from './errors.ts';
import type { AssetDraft, MediaKind, SourceAttributes } from './types.ts';

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function parseAttributes(input: string): SourceAttributes {
  const attrs: SourceAttributes = {};
  const attributePattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of input.matchAll(attributePattern)) {
    const key = match[1];
    if (!key) continue;
    attrs[key.toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

export function numberAttribute(attrs: SourceAttributes, key: string): number | null {
  const value = attrs[key];
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

function canonicalUrl(raw: string, base = BUN_14_SOURCE_URL): URL {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'https:' || url.hostname !== 'bun.com') {
      fail(`refusing non-official asset URL: ${url.href}`);
    }
    return url;
  } catch (error) {
    fail(`invalid Bun asset URL ${JSON.stringify(raw)}: ${String(error)}`);
  }
}

export function canonicalSourceUrl(raw: string): string {
  return canonicalUrl(raw).href;
}

export function sourcePath(raw: string): string {
  return canonicalUrl(raw).pathname;
}

export function assetId(kind: MediaKind, url: string): ReleaseAssetId {
  if (kind === 'embed') return asReleaseAssetId('bun-1.4-youtube-overview');
  const path = sourcePath(url);
  if (path === '/og/blog/bun-v1.4.png') return asReleaseAssetId('bun-1.4-og-image');
  const extension = extname(path);
  const filename = basename(path);
  const name = filename
    .slice(0, extension ? -extension.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return asReleaseAssetId(`bun-1.4-${name}`);
}

export function sectionAt(markdown: string, offset: number): string {
  const prefix = markdown.slice(0, offset);
  const headings = [...prefix.matchAll(/^#{2,4}\s+(.+?)\s*$/gm)];
  const heading = headings.at(-1)?.[1]?.trim();
  if (!heading) return 'Overview';
  return (
    heading
      .replace(/\s+\{%[^}]*%\}/g, '')
      .replace(/\s+#*$/, '')
      .replace(/[`*_]/g, '')
      .trim() || 'Overview'
  );
}

export function sourceDimensions(attrs: SourceAttributes): {
  width: number | null;
  height: number | null;
} {
  return { width: numberAttribute(attrs, 'width'), height: numberAttribute(attrs, 'height') };
}

export function addDraft(map: Map<string, AssetDraft>, draft: AssetDraft): void {
  const existing = map.get(draft.sourceUrl);
  if (!existing) {
    map.set(draft.sourceUrl, draft);
    return;
  }
  map.set(draft.sourceUrl, {
    ...existing,
    alt: existing.alt || draft.alt,
    caption: existing.caption || draft.caption,
    section: existing.section !== 'Overview' ? existing.section : draft.section,
    width: existing.width ?? draft.width,
    height: existing.height ?? draft.height,
    posterId: existing.posterId ?? draft.posterId,
    lazyLoad: existing.lazyLoad || draft.lazyLoad,
  });
}
