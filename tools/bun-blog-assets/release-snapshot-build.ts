// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
import { joinPath } from '../../lib/path-bun.ts';
import { parseProjectRSSChannelRegistry } from '../../lib/rss/project-channel-registry.ts';
import {
  DEFAULT_CAPABILITIES_PATH,
  DEFAULT_FEEDS_DIR,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_PROJECT_RSS_REGISTRY_PATH,
  REPO_ROOT,
} from './constants.ts';
import { fail } from './errors.ts';
import type { Bun14ReleaseSnapshot, ReleaseSnapshotInput } from './release-snapshot-contract.ts';
import {
  ALL_CHANNEL_ID,
  buildValidatedFeedState,
  CHANNEL_ID_BY_KIND,
  RELEASE_SNAPSHOT_FEEDS,
} from './release-snapshot-feeds.ts';
import type { AssetManifest, Bun14CapabilityRegistry, Bun14ReleaseChapterId } from './types.ts';

function sha256(value: string | Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

export async function buildBun14ReleaseSnapshot(): Promise<{
  snapshot: Bun14ReleaseSnapshot;
  input: ReleaseSnapshotInput;
}> {
  const paths = [
    DEFAULT_MANIFEST_PATH,
    DEFAULT_CAPABILITIES_PATH,
    DEFAULT_PROJECT_RSS_REGISTRY_PATH,
    ...RELEASE_SNAPSHOT_FEEDS.map(feed => joinPath(DEFAULT_FEEDS_DIR, feed.file)),
  ];
  const input: ReleaseSnapshotInput = {};
  for (const path of paths) {
    const absolute = joinPath(REPO_ROOT, path);
    if (!(await Bun.file(absolute).exists())) fail(`release snapshot missing ${path}`);
    input[path.replace(/^public\//, '')] = await Bun.file(absolute).bytes();
  }
  const decode = (path: string) => JSON.parse(new TextDecoder().decode(input[path]));
  const manifest = decode('registry/bun-1.4-assets.json') as AssetManifest;
  const capabilityRegistry = decode(
    'registry/bun-1.4-capabilities.json'
  ) as Bun14CapabilityRegistry;
  const projectRSSRegistry = parseProjectRSSChannelRegistry(
    decode('registry/project-rss-channels.json')
  );
  const rootProject = projectRSSRegistry.projects[0]!;
  const originRepository = projectRSSRegistry.repositories.find(
    entry => entry.repository.remote === 'origin'
  )!;
  const files = Object.entries(input)
    .map(([path, bytes]) => ({ path, bytes: bytes.byteLength, sha256: sha256(bytes) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const snapshotDigest = sha256(files.map(file => `${file.path}\0${file.sha256}`).join('\0'));
  const channels = buildValidatedFeedState(input, manifest);
  const chaptersByAsset = new Map<string, Set<Bun14ReleaseChapterId>>();
  for (const capability of capabilityRegistry.capabilities) {
    if (!capability.chapterId) continue;
    for (const assetId of capability.assetIds) {
      const chapterIds = chaptersByAsset.get(assetId) ?? new Set<Bun14ReleaseChapterId>();
      chapterIds.add(capability.chapterId);
      chaptersByAsset.set(assetId, chapterIds);
    }
  }
  const chapters = capabilityRegistry.chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    releaseUrl: chapter.releaseUrl,
    itemCount: [...chaptersByAsset.values()].filter(ids => ids.has(chapter.id)).length,
  }));
  return {
    input,
    snapshot: {
      schemaVersion: 3,
      release: 'Bun 1.4',
      version: '1.4.0',
      generatedAt: manifest.generatedAt,
      sourcePage: manifest.sourcePage,
      rightsStatus: manifest.rightsStatus,
      owner: manifest.attribution.publisher,
      lifecycle: 'active-feeds-with-content-addressed-archives',
      project: {
        id: rootProject.projectId,
        repository: originRepository.repository.ownerName,
        aliases: rootProject.channels.map(channel => ({
          id: channel.id,
          canonicalEndpoint: channel.canonicalEndpoint,
          projectEndpoint: channel.projectEndpoint,
        })),
      },
      snapshotDigest,
      files,
      channels,
      chapters,
      items: manifest.assets.map(asset => ({
        id: asset.id,
        state: 'active',
        owner: manifest.attribution.publisher.name,
        sourceUrl: asset.sourceUrl,
        contentAddress: asset.sha256 ?? sha256(asset.sourceUrl),
        addressKind: asset.sha256 ? 'sha256-bytes' : 'sha256-source-url',
        channels: [ALL_CHANNEL_ID, CHANNEL_ID_BY_KIND[asset.kind]],
        chapters: [...(chaptersByAsset.get(asset.id) ?? [])].sort(),
      })),
    },
  };
}
