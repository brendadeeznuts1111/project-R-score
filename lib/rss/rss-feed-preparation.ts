import type { PackageInfo } from '../package/package-manager';
import type { FeedImageEnricher, FeedImageSource } from './feed-image.ts';
import type { RSSFeed, RSSFeedItem } from './rss-types.ts';

/** Deterministic package metadata projection; transport and persistence remain in RSSManager. */
export function buildPackageFeed(packageName: string, packageInfo: PackageInfo): RSSFeed {
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

/** Enrich only the configured number of image candidates with bounded concurrency. */
export async function enrichFeedImages(
  feed: RSSFeed,
  imageEnricher: FeedImageEnricher,
  maxImagesPerFeed: number,
  imageConcurrency: number
): Promise<void> {
  const candidates = feed.items
    .filter((item): item is RSSFeedItem & { imageUrl: string; imageSource: FeedImageSource } =>
      Boolean(item.imageUrl && item.imageSource)
    )
    .slice(0, maxImagesPerFeed);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(imageConcurrency, candidates.length) },
    async () => {
      while (cursor < candidates.length) {
        const item = candidates[cursor++];
        if (!item) continue;
        try {
          item.image = await imageEnricher.enrich({
            url: item.imageUrl,
            source: item.imageSource,
          });
        } catch (error) {
          console.warn(`Failed to enrich RSS image ${item.imageUrl}:`, error);
        }
      }
    }
  );
  await Promise.all(workers);
}

/** Fetch only caller-configured package feeds in deterministic order, isolating feed failures. */
export async function fetchPackageFeeds(
  configuredFeedUrls: readonly string[],
  fetchFeed: (feedUrl: string) => Promise<RSSFeed>
): Promise<RSSFeed[]> {
  const feeds: RSSFeed[] = [];

  // Package names do not identify a GitHub repository or a feed endpoint.
  // Only caller-supplied, provenance-bearing URLs are eligible for fetching.
  for (const feedUrl of [...new Set(configuredFeedUrls)].sort()) {
    try {
      const feed = await fetchFeed(feedUrl);
      feeds.push(feed);
    } catch {
      // Ignore failed feeds
    }
  }

  return feeds;
}
