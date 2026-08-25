import type { FeedId, ProjectId, ReleaseAssetId } from '../../lib/types/branded.ts';
import type { AssetManifest, Bun14ReleaseChapterId } from './types.ts';

export type ReleaseSnapshotInput = Record<string, Uint8Array>;

export type Bun14ReleaseSnapshot = {
  schemaVersion: 3;
  release: 'Bun 1.4';
  version: '1.4.0';
  generatedAt: string;
  sourcePage: string;
  rightsStatus: AssetManifest['rightsStatus'];
  owner: AssetManifest['attribution']['publisher'];
  lifecycle: 'active-feeds-with-content-addressed-archives';
  project: {
    id: ProjectId;
    repository: string;
    aliases: Array<{ id: FeedId; canonicalEndpoint: string; projectEndpoint: string }>;
  };
  snapshotDigest: string;
  files: Array<{ path: string; bytes: number; sha256: string }>;
  channels: Array<{ id: FeedId; file: string; itemCount: number }>;
  chapters: Array<{
    id: Bun14ReleaseChapterId;
    title: string;
    releaseUrl: string;
    itemCount: number;
  }>;
  items: Array<{
    id: ReleaseAssetId;
    state: 'active';
    owner: string;
    sourceUrl: string;
    contentAddress: string;
    addressKind: 'sha256-bytes' | 'sha256-source-url';
    channels: FeedId[];
    chapters: Bun14ReleaseChapterId[];
  }>;
};
