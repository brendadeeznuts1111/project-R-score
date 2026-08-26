// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// lib/rss/rss-manager.ts — RSS feed integration with caching and storage

import type { PackageInfo } from '../package/package-manager';
import { withCircuitBreaker } from '../core/circuit-breaker';
import { CacheManager } from '../core/cache-manager';
import { AtomicFileOperations } from '../core/atomic-file-operations';
import { FeedImageEnricher, type FeedImageSource } from './feed-image.ts';
import { loadArchivedFeedSnapshot, type FeedSnapshotArchive } from './feed-snapshot-archive.ts';
import { fetchFeedXml } from './fetch-feed-xml.ts';
import { generateRSS, parseRSSFeed, type RSSFeed, type RSSFeedItem } from './rss-xml.ts';
import { parseRSSFeedUntrusted, requireRSSXmlBoundaryValue } from './rss-xml-untrusted.ts';

export { generateRSS, parseRSSFeed } from './rss-xml.ts';
export type { RSSFeed, RSSFeedItem } from './rss-xml.ts';

export interface FeedSubscription {
  url: string;
  name: string;
  category: string;
  lastFetched: Date;
  updateFrequency: number; // minutes
}

export type RSSManagerOptions = {
  fetcher?: typeof fetch;
  imageEnricher?: FeedImageEnricher;
  enrichImages?: boolean;
  maxImagesPerFeed?: number;
  imageConcurrency?: number;
  maxFeedBytes?: number;
  feedTimeoutMs?: number;
  feedParseDeadlineMs?: number;
  allowedFeedOrigins?: string[];
  snapshotArchive?: FeedSnapshotArchive;
};

export interface RSSPublishStorage {
  getOrCreateBucket(packageName: string): Promise<string>;
  put(
    bucket: string,
    key: string,
    data: Uint8Array,
    crc32Hex?: string,
    contentType?: string
  ): Promise<void>;
  publicObjectUrl(bucket: string, key: string): string;
}

export class RSSManager {
  private feeds: Map<string, RSSFeed>;
  private subscriptions: FeedSubscription[];
  private cache: CacheManager;
  private readonly publishStorage?: RSSPublishStorage;
  private readonly fetcher: typeof fetch;
  private readonly imageEnricher: FeedImageEnricher;
  private readonly enrichImages: boolean;
  private readonly maxImagesPerFeed: number;
  private readonly imageConcurrency: number;
  private readonly maxFeedBytes: number;
  private readonly feedTimeoutMs: number;
  private readonly feedParseDeadlineMs: number;
  private readonly allowedFeedOrigins?: ReadonlySet<string>;
  private readonly snapshotArchive?: FeedSnapshotArchive;

  constructor(publishStorage?: RSSPublishStorage, options: RSSManagerOptions = {}) {
    this.feeds = new Map();
    this.subscriptions = [];
    this.cache = new CacheManager({ defaultTTL: 300000, maxSize: 100 });
    this.publishStorage = publishStorage;
    this.fetcher = options.fetcher ?? fetch;
    this.imageEnricher = options.imageEnricher ?? new FeedImageEnricher({ fetcher: this.fetcher });
    this.enrichImages = options.enrichImages ?? true;
    this.maxImagesPerFeed = Math.max(0, options.maxImagesPerFeed ?? 12);
    this.imageConcurrency = Math.max(1, options.imageConcurrency ?? 3);
    this.maxFeedBytes = options.maxFeedBytes ?? 8 * 1024 * 1024;
    this.feedTimeoutMs = options.feedTimeoutMs ?? 15_000;
    this.feedParseDeadlineMs = options.feedParseDeadlineMs ?? 1_000;
    this.allowedFeedOrigins = options.allowedFeedOrigins
      ? new Set(options.allowedFeedOrigins.map(origin => new URL(origin).origin))
      : undefined;
    this.snapshotArchive = options.snapshotArchive;
    this.loadSubscriptions();
  }

  async subscribe(feedUrl: string, name: string, category: string = 'general'): Promise<void> {
    const subscription: FeedSubscription = {
      url: feedUrl,
      name,
      category,
      lastFetched: new Date(),
      updateFrequency: 60, // 1 hour default
    };

    this.subscriptions.push(subscription);
    await this.saveSubscriptions();

    // Fetch immediately
    await this.fetchFeed(feedUrl);
  }

  async fetchFeed(feedUrl: string): Promise<RSSFeed> {
    // Check cache first
    const cached = await this.cache.get<RSSFeed>(feedUrl);
    if (cached) {
      return cached;
    }

    try {
      const xml = await withCircuitBreaker('rss-feeds', () =>
        fetchFeedXml(this.fetcher, feedUrl, {
          maxBytes: this.maxFeedBytes,
          timeoutMs: this.feedTimeoutMs,
          allowedOrigins: this.allowedFeedOrigins,
        })
      );
      const feed = requireRSSXmlBoundaryValue(
        await parseRSSFeedUntrusted(xml, {
          deadlineMs: this.feedParseDeadlineMs,
          quotas: { maxInputBytes: this.maxFeedBytes },
        })
      );
      if (this.enrichImages) await this.enrichFeedImages(feed, feedUrl);

      // Cache with CacheManager (TTL handled by manager)
      await this.cache.set(feedUrl, feed, { tags: ['rss'] });

      return feed;
    } catch (error) {
      if (this.snapshotArchive) {
        const archived = await loadArchivedFeedSnapshot({
          archive: this.snapshotArchive,
          sourceUrl: feedUrl,
        });
        if (archived) {
          return requireRSSXmlBoundaryValue(
            await parseRSSFeedUntrusted(archived.feedXml, {
              deadlineMs: this.feedParseDeadlineMs,
              quotas: { maxInputBytes: this.maxFeedBytes },
            })
          );
        }
      }

      console.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
      throw error;
    }
  }

  async fetchAll(): Promise<Map<string, RSSFeed>> {
    const results = new Map();

    for (const subscription of this.subscriptions) {
      try {
        const feed = await this.fetchFeed(subscription.url);
        results.set(subscription.name, feed);
        subscription.lastFetched = new Date();
      } catch (error) {
        console.error(`Failed to fetch ${subscription.name}:`, error);
      }
    }

    await this.saveSubscriptions();
    return results;
  }

  async getPackageFeeds(
    _packageName: string,
    configuredFeedUrls: readonly string[] = []
  ): Promise<RSSFeed[]> {
    const feeds: RSSFeed[] = [];

    // Package names do not identify a GitHub repository or a feed endpoint.
    // Only caller-supplied, provenance-bearing URLs are eligible for fetching.
    for (const feedUrl of [...new Set(configuredFeedUrls)].sort()) {
      try {
        const feed = await this.fetchFeed(feedUrl);
        feeds.push(feed);
      } catch {
        // Ignore failed feeds
      }
    }

    return feeds;
  }

  async generatePackageFeed(packageName: string, packageInfo: PackageInfo): Promise<RSSFeed> {
    const feed: RSSFeed = {
      title: `${packageName} - Bun Documentation`,
      link: `https://bun.com/docs/packages/${encodeURIComponent(packageName)}`,
      description: `Documentation updates for ${packageName}`,
      items: [],
      // No source revision timestamp exists in PackageInfo. Omitting dates is
      // deterministic and standards-valid; request time is not content time.
      lastBuildDate: '',
      ttl: 1440, // 24 hours
    };

    // Add Bun API documentation as feed items
    if (packageInfo.bunDocs) {
      for (const doc of [...packageInfo.bunDocs].sort((a, b) =>
        `${a.category}\0${a.api}\0${a.url}`.localeCompare(`${b.category}\0${b.api}\0${b.url}`)
      )) {
        feed.items.push({
          title: `${doc.api} - ${packageName}`,
          link: doc.url,
          description: `Documentation for ${doc.api} API used in ${packageName}`,
          pubDate: '',
          category: [doc.category],
          guid: `bun:${packageName}:${doc.api}`,
        });
      }
    }

    // Add dependency updates
    for (const [dep, version] of Object.entries(packageInfo.dependencies || {}).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      feed.items.push({
        title: `Dependency: ${dep}@${version}`,
        link: `https://www.npmjs.com/package/${dep}`,
        description: `Package depends on ${dep} version ${version}`,
        pubDate: '',
        category: ['dependencies'],
        guid: `dep:${packageName}:${dep}:${version}`,
      });
    }

    return feed;
  }

  async publishPackageFeed(packageName: string, feed: RSSFeed): Promise<string> {
    if (!this.publishStorage) {
      throw new Error('R2 storage required for publishing feeds');
    }

    const xml = generateRSS(feed);
    const bucket = await this.publishStorage.getOrCreateBucket(packageName);
    const key = `feeds/${packageName}.rss`;
    await this.publishStorage.put(
      bucket,
      key,
      new TextEncoder().encode(xml),
      undefined,
      'application/rss+xml; charset=utf-8'
    );

    return this.publishStorage.publicObjectUrl(bucket, key);
  }

  private async enrichFeedImages(feed: RSSFeed, feedUrl: string): Promise<void> {
    const candidates = feed.items
      .filter((item): item is RSSFeedItem & { imageUrl: string; imageSource: FeedImageSource } =>
        Boolean(item.imageUrl && item.imageSource)
      )
      .slice(0, this.maxImagesPerFeed);
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(this.imageConcurrency, candidates.length) },
      async () => {
        while (cursor < candidates.length) {
          const item = candidates[cursor++];
          if (!item) continue;
          try {
            item.image = await this.imageEnricher.enrich({
              url: item.imageUrl,
              source: item.imageSource,
              feedUrl,
            });
          } catch (error) {
            console.warn(`Failed to enrich RSS image ${item.imageUrl}:`, error);
          }
        }
      }
    );
    await Promise.all(workers);
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      const homeDir = Bun.env.HOME || '/tmp';
      const filePath = `${homeDir}/.config/bun-docs/subscriptions.json`;
      if (await Bun.file(filePath).exists()) {
        const content = await AtomicFileOperations.readSafe(filePath);
        this.subscriptions = JSON.parse(content) as FeedSubscription[];
      }
    } catch (error) {
      console.warn('Failed to load subscriptions:', error);
    }
  }

  private async saveSubscriptions(): Promise<void> {
    try {
      const homeDir = Bun.env.HOME || '/tmp';
      await AtomicFileOperations.writeAtomic(
        `${homeDir}/.config/bun-docs/subscriptions.json`,
        JSON.stringify(this.subscriptions, null, 2)
      );
    } catch (error) {
      console.warn('Failed to save subscriptions:', error);
    }
  }
}
