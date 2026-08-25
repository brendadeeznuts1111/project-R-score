// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/reference/bun/Image/Format — Bun.Image.Format
// @released Bun.Image.Format · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.webp
// @see https://bun.com/docs/runtime/utils#bun-inflatesync — Bun.inflateSync

import { extractImageEvidenceMeta } from '../image-metadata.ts';
import {
  fetchImageResponse,
  readBoundedImageBytes,
  validateRemoteImageUrl,
} from './fetch-image-bytes.ts';
import { averageImageColor } from './image-color.ts';

export const FEED_IMAGE_SOURCES = ['media:content', 'enclosure', 'media:thumbnail'] as const;

export type FeedImageSource = (typeof FEED_IMAGE_SOURCES)[number];

export type FeedImageThumbnail = {
  dataUrl: string;
  mimeType: 'image/webp';
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
};

export type FeedImageMetadata = {
  sourceUrl: string;
  source: FeedImageSource;
  mimeType: string;
  width: number;
  height: number;
  format: Bun.Image.Format;
  byteSize: number;
  sha256: string;
  dominantColor: string;
  thumbnail: FeedImageThumbnail;
};

export type FeedImageCandidate = {
  url: string;
  source: FeedImageSource;
};

export type FeedImageEnricherOptions = {
  fetcher?: typeof fetch;
  maxBytes?: number;
  maxPixels?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  allowedOrigins?: string[];
};

type CachedImage = {
  metadata: FeedImageMetadata;
  etag?: string;
  lastModified?: string;
};

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_PIXELS = 4096 * 4096;
const DEFAULT_THUMBNAIL_WIDTH = 240;
const DEFAULT_THUMBNAIL_HEIGHT = 160;

function mimeForImageFormat(format: Bun.Image.Format): string {
  const normalized = String(format).toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
  if (normalized === 'tif' || normalized === 'tiff') return 'image/tiff';
  return `image/${normalized}`;
}

export class FeedImageEnricher {
  private readonly fetcher: typeof fetch;
  private readonly maxBytes: number;
  private readonly maxPixels: number;
  private readonly thumbnailWidth: number;
  private readonly thumbnailHeight: number;
  private readonly maxRedirects: number;
  private readonly timeoutMs: number;
  private readonly allowedOrigins?: ReadonlySet<string>;
  private readonly cache = new Map<string, CachedImage>();

  constructor(options: FeedImageEnricherOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
    this.thumbnailWidth = options.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
    this.thumbnailHeight = options.thumbnailHeight ?? DEFAULT_THUMBNAIL_HEIGHT;
    this.maxRedirects = options.maxRedirects ?? 5;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.allowedOrigins = options.allowedOrigins
      ? new Set(options.allowedOrigins.map(origin => new URL(origin).origin))
      : undefined;
  }

  async enrich(candidate: FeedImageCandidate): Promise<FeedImageMetadata> {
    const initialUrl = validateRemoteImageUrl(candidate.url, this.allowedOrigins);
    const url = initialUrl.href;
    const cached = this.cache.get(url);
    const headers = new Headers({
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
      'Accept-Encoding': 'identity',
      'User-Agent': 'FactoryWager-RSS-Image/1.0',
    });
    if (cached?.etag) headers.set('If-None-Match', cached.etag);
    if (cached?.lastModified) headers.set('If-Modified-Since', cached.lastModified);

    if (cached && !cached.etag && !cached.lastModified) return cached.metadata;

    const { response, finalUrl } = await fetchImageResponse(initialUrl, headers, {
      fetcher: this.fetcher,
      maxBytes: this.maxBytes,
      maxRedirects: this.maxRedirects,
      timeoutMs: this.timeoutMs,
      allowedOrigins: this.allowedOrigins,
    });
    if (response.status === 304 && cached) return cached.metadata;
    if (!response.ok) throw new Error(`Feed image request failed: HTTP ${response.status}`);

    const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Feed enclosure is not an image: ${mimeType || 'missing content-type'}`);
    }

    const bytes = await readBoundedImageBytes(response, this.maxBytes);

    const original = await extractImageEvidenceMeta(bytes, {
      image: { maxPixels: this.maxPixels },
    });
    const detectedMimeType = mimeForImageFormat(original.format);
    if (mimeType !== detectedMimeType) {
      throw new Error(
        `Feed image MIME mismatch: declared ${mimeType}, detected ${detectedMimeType}`
      );
    }
    const thumbnailBytes = await new Bun.Image(bytes, { maxPixels: this.maxPixels })
      .resize(this.thumbnailWidth, this.thumbnailHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .bytes();
    const thumbnail = await extractImageEvidenceMeta(thumbnailBytes);
    const metadata: FeedImageMetadata = {
      sourceUrl: finalUrl.href,
      source: candidate.source,
      mimeType,
      width: original.width,
      height: original.height,
      format: original.format,
      byteSize: original.size,
      sha256: original.digest,
      dominantColor: await averageImageColor(bytes, this.maxPixels),
      thumbnail: {
        dataUrl: `data:image/webp;base64,${Buffer.from(thumbnailBytes).toString('base64')}`,
        mimeType: 'image/webp',
        width: thumbnail.width,
        height: thumbnail.height,
        byteSize: thumbnail.size,
        sha256: thumbnail.digest,
      },
    };

    this.cache.set(url, {
      metadata,
      etag: response.headers.get('etag') ?? undefined,
      lastModified: response.headers.get('last-modified') ?? undefined,
    });
    return metadata;
  }
}
