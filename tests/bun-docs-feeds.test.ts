import { describe, expect, test } from 'bun:test';
import {
  DOCS_FEEDS_ABS,
  LEGACY_REFERENCE_INDEX_ABS,
  LEGACY_RELEASE_INDEX_ABS,
} from '../lib/docs/docs-artifact-paths.ts';
import {
  loadFeeds,
  migrateLegacyFeeds,
  type DocsFeedsFile,
} from '../tools/bun-docs-feeds.ts';

describe('bun-docs-feeds', () => {
  test('loadFeeds returns rss and reference sections', async () => {
    const feeds = await loadFeeds();
    expect(feeds.rss).toBeDefined();
    expect(feeds.reference).toBeDefined();
    expect(Array.isArray(feeds.rss.entries)).toBe(true);
    expect(Array.isArray(feeds.reference.pages)).toBe(true);
  });

  test('migrateLegacyFeeds writes merged file when legacy indexes exist', async () => {
    const hasLegacy =
      (await Bun.file(LEGACY_RELEASE_INDEX_ABS).exists()) ||
      (await Bun.file(LEGACY_REFERENCE_INDEX_ABS).exists());
    if (!hasLegacy) return;

    const before = (await Bun.file(DOCS_FEEDS_ABS).exists())
      ? ((await Bun.file(DOCS_FEEDS_ABS).json()) as DocsFeedsFile)
      : null;
    const file = await migrateLegacyFeeds();
    expect(file.rss.count).toBeGreaterThanOrEqual(0);
    expect(file.reference.count).toBeGreaterThanOrEqual(0);
    expect(await Bun.file(DOCS_FEEDS_ABS).exists()).toBe(true);

    if (before) {
      await Bun.write(DOCS_FEEDS_ABS, `${JSON.stringify(before, null, 2)}\n`);
    }
  });
});
