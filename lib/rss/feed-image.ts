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
  CONTENT_REF_VERSION,
  createContentSourceLocator,
  decideContentRights,
  parseContentRef,
  type ContentAuthorities,
  type ContentRef,
  type ContentRights,
  type ContentStore,
  type PackageDependencyRecord,
} from '../content-store/index.ts';
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
  contentRef?: ContentRef;
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
  originalContentRef?: ContentRef;
  thumbnail: FeedImageThumbnail;
};

export type FeedImageCandidate = {
  url: string;
  source: FeedImageSource;
  /** Feed document that asserted this image locator. */
  feedUrl?: string;
  /** Required for an offline read when metadata is loaded from a separate durable index. */
  cachedMetadata?: FeedImageMetadata;
};

export type FeedImageContentPolicy = {
  readonly rights: ContentRights;
  readonly authorities: ContentAuthorities;
  readonly packageDependencies?: readonly PackageDependencyRecord[];
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
  contentStore?: ContentStore;
  contentPolicy?: FeedImageContentPolicy;
  mode?: 'online' | 'offline';
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
  private readonly contentStore?: ContentStore;
  private readonly contentPolicy?: FeedImageContentPolicy;
  private readonly mode: 'online' | 'offline';
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
    if ((options.contentStore === undefined) !== (options.contentPolicy === undefined)) {
      throw new Error('Feed image ContentStore and contentPolicy must be configured together');
    }
    this.contentStore = options.contentStore;
    this.contentPolicy = options.contentPolicy;
    this.mode = options.mode ?? 'online';
    if (this.mode === 'offline' && !this.contentStore) {
      throw new Error('Offline feed image enrichment requires a ContentStore');
    }
  }

  async enrich(candidate: FeedImageCandidate): Promise<FeedImageMetadata> {
    const initialUrl = validateRemoteImageUrl(candidate.url, this.allowedOrigins);
    const url = initialUrl.href;
    const cached = this.cache.get(url);
    if (this.mode === 'offline') {
      const metadata = cached?.metadata ?? candidate.cachedMetadata;
      if (!metadata) throw new Error(`Offline feed image cache miss: ${url}`);
      await this.verifyStoredMetadata(metadata);
      return metadata;
    }
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
    const contentRefs = await this.persistContent(
      candidate,
      finalUrl,
      mimeType,
      bytes,
      thumbnailBytes
    );
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
      ...(contentRefs ? { originalContentRef: contentRefs.original } : {}),
      thumbnail: {
        dataUrl: `data:image/webp;base64,${Buffer.from(thumbnailBytes).toString('base64')}`,
        mimeType: 'image/webp',
        width: thumbnail.width,
        height: thumbnail.height,
        byteSize: thumbnail.size,
        sha256: thumbnail.digest,
        ...(contentRefs ? { contentRef: contentRefs.thumbnail } : {}),
      },
    };

    this.cache.set(url, {
      metadata,
      etag: response.headers.get('etag') ?? undefined,
      lastModified: response.headers.get('last-modified') ?? undefined,
    });
    return metadata;
  }

  private async persistContent(
    candidate: FeedImageCandidate,
    finalUrl: URL,
    mimeType: string,
    originalBytes: Uint8Array,
    thumbnailBytes: Uint8Array
  ): Promise<{ original: ContentRef; thumbnail: ContentRef } | undefined> {
    if (!this.contentStore || !this.contentPolicy) return undefined;
    const storeDecision = decideContentRights(this.contentPolicy.rights, 'store-bytes');
    if (!storeDecision.allowed) {
      throw new Error(`Feed image storage denied: ${storeDecision.reason}`);
    }
    const deriveDecision = decideContentRights(this.contentPolicy.rights, 'derive-bytes');
    if (!deriveDecision.allowed) {
      throw new Error(`Feed image derivation denied: ${deriveDecision.reason}`);
    }

    const originalStored = await this.contentStore.put(originalBytes);
    const thumbnailStored = await this.contentStore.put(thumbnailBytes);
    if (thumbnailStored.digest === originalStored.digest) {
      throw new Error('Feed image thumbnail must have a distinct content digest');
    }
    const sourceLocators = [candidate.feedUrl, finalUrl.href]
      .filter((locator): locator is string => locator !== undefined)
      .filter((locator, index, all) => all.indexOf(locator) === index)
      .map(createContentSourceLocator);
    const common = {
      version: CONTENT_REF_VERSION,
      sources: sourceLocators,
      packageDependencies: this.contentPolicy.packageDependencies ?? [],
      rights: this.contentPolicy.rights,
      authorities: this.contentPolicy.authorities,
    } as const;
    const original: ContentRef = {
      ...common,
      digest: originalStored.digest,
      key: originalStored.key,
      byteLength: originalStored.byteLength,
      mediaType: mimeType,
      contentRelations: [],
    };
    const thumbnail: ContentRef = {
      ...common,
      digest: thumbnailStored.digest,
      key: thumbnailStored.key,
      byteLength: thumbnailStored.byteLength,
      mediaType: 'image/webp',
      contentRelations: [
        {
          from: thumbnailStored.digest,
          to: originalStored.digest,
          kind: 'derived-from',
        },
      ],
    };
    return { original, thumbnail };
  }

  private async verifyStoredMetadata(metadata: FeedImageMetadata): Promise<void> {
    if (!this.contentStore || !metadata.originalContentRef || !metadata.thumbnail.contentRef) {
      throw new Error('Offline feed image metadata requires original and thumbnail ContentRefs');
    }
    for (const ref of [metadata.originalContentRef, metadata.thumbnail.contentRef]) {
      const parsed = parseContentRef(ref);
      const bytes = await this.contentStore.get(parsed.digest);
      if (!bytes || bytes.byteLength !== parsed.byteLength) {
        throw new Error(`Offline feed image content unavailable: ${parsed.digest}`);
      }
    }
  }
}
