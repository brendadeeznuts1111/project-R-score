import type { Bun14Capability, Bun14ReleaseChapter, Bun14ReleaseChapterId } from './types.ts';
import { fail } from './errors.ts';

const BLOG = 'https://bun.com/blog/bun-v1.4';

export const BUN_14_RELEASE_CHAPTERS: Bun14ReleaseChapter[] = [
  { id: 'what-s-new', title: "What's new", releaseUrl: `${BLOG}#what-s-new`, order: 1 },
  { id: 'bun-install', title: 'bun install', releaseUrl: `${BLOG}#bun-install`, order: 2 },
  { id: 'bun-test', title: 'bun test', releaseUrl: `${BLOG}#bun-test`, order: 3 },
  { id: 'bun-build', title: 'bun build', releaseUrl: `${BLOG}#bun-build`, order: 4 },
  { id: 'faster', title: 'Faster', releaseUrl: `${BLOG}#faster`, order: 5 },
];

export function parseReleaseChapters(value: unknown, label: string): Bun14ReleaseChapter[] {
  if (!Array.isArray(value) || !value.length) fail(`${label}: chapters must be a non-empty array`);
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  for (const chapter of value as Bun14ReleaseChapter[]) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter.id) || seenIds.has(chapter.id)) {
      fail(`${label}: invalid or duplicate chapter id ${chapter.id}`);
    }
    if (!chapter.title || !Number.isSafeInteger(chapter.order) || chapter.order < 1) {
      fail(`${label}: chapter ${chapter.id} requires a title and positive order`);
    }
    if (seenOrders.has(chapter.order)) fail(`${label}: duplicate chapter order ${chapter.order}`);
    if (chapter.releaseUrl !== `${BLOG}#${chapter.id}`) {
      fail(`${label}: chapter ${chapter.id} must use its official Bun 1.4 anchor`);
    }
    seenIds.add(chapter.id);
    seenOrders.add(chapter.order);
  }
  return value as Bun14ReleaseChapter[];
}

const CHAPTER_CAPABILITIES: Record<Bun14ReleaseChapterId, readonly string[]> = {
  'what-s-new': [
    'bun-xml-native',
    'bun-image-metadata',
    'bun-markdown-native',
    'bun-webview-local-qa',
    'bun-terminal-local-tools',
    'bun-string-width',
    'ffi-performance-claim',
    'cpu-profile-markdown',
    'heap-profile-markdown',
    'native-async-stack-traces',
    'bun-no-env-file',
    'bun-serve-http3-experimental',
    'fetch-http2-http3-experimental',
    'bun-serve-production-sourcemaps',
    'fetch-proxy-headers',
    'fetch-tls-session-resumption',
    'fetch-connection-reuse',
    'bun-json5-native',
    'bun-jsonl-native',
    'bun-jsonc-native',
    'bun-toml-native',
    'bun-archive-native',
    'bun-ansi-layout-native',
    'urlpattern-native',
    'compression-streams-native',
    'response-text-stream',
    'post-quantum-webcrypto',
    'bun-repl-native',
    'bun-markdown-cli',
  ],
  'bun-install': ['bun-audit-fix', 'bun-dedupe', 'bun-prune'],
  'bun-test': ['bun-test-parallel', 'bun-test-timings'],
  'bun-build': ['bundle-metafile-markdown', 'react-compiler-built-in'],
  faster: ['source-map-decoding-claim'],
};

const CHAPTER_BY_CAPABILITY = new Map<string, Bun14ReleaseChapterId>();
for (const [chapterId, capabilityIds] of Object.entries(CHAPTER_CAPABILITIES)) {
  for (const capabilityId of capabilityIds) {
    if (CHAPTER_BY_CAPABILITY.has(capabilityId)) {
      throw new Error(`Bun 1.4 capability belongs to multiple chapters: ${capabilityId}`);
    }
    CHAPTER_BY_CAPABILITY.set(capabilityId, chapterId as Bun14ReleaseChapterId);
  }
}

export function attachReleaseChapters(capabilities: readonly Bun14Capability[]): Bun14Capability[] {
  const knownIds = new Set(capabilities.map(capability => capability.id));
  for (const capabilityId of CHAPTER_BY_CAPABILITY.keys()) {
    if (!knownIds.has(capabilityId)) {
      throw new Error(`Bun 1.4 release chapter references unknown capability: ${capabilityId}`);
    }
  }
  return capabilities.map(capability => ({
    ...capability,
    chapterId: CHAPTER_BY_CAPABILITY.get(capability.id),
  }));
}
