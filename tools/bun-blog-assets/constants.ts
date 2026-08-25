import { resolvePath as resolve } from '../../lib/path-bun';

export const BUN_14_SOURCE_URL = 'https://bun.com/blog/bun-v1.4';
export const BUN_14_MARKDOWN_URL = `${BUN_14_SOURCE_URL}.md`;
export const BUN_14_BREAKING_CHANGES_URL = 'https://github.com/oven-sh/bun/issues/28792';
export const BUN_14_UPGRADE_GUIDE_URL = 'https://github.com/oven-sh/bun/pull/36463';
export const BUN_14_PUBLISHED_AT = '2026-08-20T00:53:44.000Z';
export const BUN_14_FEED_BASE_URL = 'https://score.factory-wager.com';
export const DEFAULT_FEEDS_DIR = 'public/feeds/v1';
export const DEFAULT_MANIFEST_PATH = 'public/registry/bun-1.4-assets.json';
export const DEFAULT_CAPABILITIES_PATH = 'public/registry/bun-1.4-capabilities.json';
export const DEFAULT_CHANNEL_RELEASE_PATH = 'public/registry/bun-1.4-channel-release.json';
export const DEFAULT_PROJECT_RSS_REGISTRY_PATH = 'public/registry/project-rss-channels.json';
export const BUN_14_CAPABILITY_CATEGORY_PREFIX = 'bun:capability:';
export const BUN_14_CHAPTER_CATEGORY_PREFIX = 'bun:chapter:';
export const DEFAULT_VENDOR_DIR = 'public/portal/bun-1.4/media';
export const EXPECTED_ASSET_COUNT = 26;
export const MANIFEST_SCHEMA_VERSION = 1;
export const CAPABILITY_SCHEMA_VERSION = 3;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 8 * 1024 * 1024;
export const MAX_MP4_FTYP_BYTES = 4096;
export const REPO_ROOT = resolve(import.meta.dir, '..', '..');

export const EXPECTED_IMAGE_PATHS = new Set([
  '/images/blog/bun-1.4/node-test-suite-progress.png',
  '/images/blog/bun-1.4/tweets/cpu-usage-cc.jpeg',
  '/images/blog/bun-1.4/tweets/idle-cpu.png',
  '/images/blog/bun-1.4/tweets/nextjs-ssr-fetch-leak.jpg',
  '/images/blog/bun-1.4/image-pipeline-src.svg',
  '/images/blog/bun-1.4/tweets/ffi-3x.jpg',
  '/images/blog/bun-1.4/tweets/test-timings.jpg',
  '/images/blog/bun-1.4/tweets/react-compiler.jpg',
  '/images/blog/bun-1.4/tweets/sourcemap-decoding.jpg',
  '/images/blog/bun-1.4/tweets/windows-timers.jpg',
  '/images/blog/bun-1.4/tweets/memory-pressure.jpg',
  '/images/blog/bun-1.4/tweets/stringwidth-cjk.jpg',
  '/images/blog/bun-1.4/cpu-prof-devtools.png',
  '/images/blog/bun-1.4/tweets/no-orphans.jpg',
  '/images/blog/bun-1.4/tweets/yaml-cyclic-anchors.jpg',
  '/images/blog/bun-1.4/tweets/node-sqlite.jpg',
  '/images/blog/bun-1.4/tweets/bun-audit-fix-poster.jpg',
  '/images/blog/bun-1.4/tweets/bun-dedupe-poster.jpg',
  '/images/blog/bun-1.4/tweets/bun-prune-poster.jpg',
  '/images/blog/bun-1.4/tweets/spawn-cgroup-poster.jpg',
  '/og/blog/bun-v1.4.png',
]);

export const EXPECTED_VIDEO_PATHS = new Set([
  '/images/blog/bun-1.4/tweets/bun-audit-fix.mp4',
  '/images/blog/bun-1.4/tweets/bun-dedupe.mp4',
  '/images/blog/bun-1.4/tweets/bun-prune.mp4',
  '/images/blog/bun-1.4/tweets/spawn-cgroup.mp4',
]);

export const EXPECTED_YOUTUBE_URL = 'https://www.youtube.com/embed/i38DgEuaJwM';
