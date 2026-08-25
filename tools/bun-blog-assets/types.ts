import type { EvidenceId, ReleaseAssetId, ReleaseCapabilityId } from '../../lib/types/branded.ts';

export type MediaKind = 'image' | 'video' | 'embed';
export type RightsStatus = 'pending' | 'approved';

export type RightsApprovalEvidence = {
  schemaVersion: 1;
  scope: 'bun-1.4-release-blog-media';
  status: 'approved';
  approvalId: EvidenceId;
  approvedBy: string;
  approvedAt: string;
  evidenceUrl: string;
  sourcePage: string;
};

export type MediaRights = {
  scope: 'bun-1.4-release-blog-media';
  status: RightsStatus;
  delivery: 'external-only' | 'vendor-approved';
  evidence: Omit<
    RightsApprovalEvidence,
    'schemaVersion' | 'scope' | 'status' | 'sourcePage'
  > | null;
  boundaries: {
    softwareLicense: {
      classification: 'out-of-scope';
      sourceUrl: string;
    };
    pressKit: {
      classification: 'separate-brand-assets';
      sourceUrl: string;
    };
    releaseBlogMedia: {
      classification: RightsStatus;
      sourceUrl: string;
      assetCount: 25;
    };
    youtubeEmbed: {
      classification: 'external-only';
      sourceUrl: string;
      assetCount: 1;
    };
  };
};

export type CapabilityDomain =
  | 'runtime'
  | 'server'
  | 'network'
  | 'package-manager'
  | 'test-runner'
  | 'bundler'
  | 'observability'
  | 'platform';

export type CapabilityChangeKind =
  'new' | 'release-window' | 'changed' | 'fixed' | 'compatibility' | 'performance';

export type CapabilityAdoption =
  'integrated' | 'contract' | 'candidate' | 'local-only' | 'upstream-claim';

export type Bun14ReleaseChapterId =
  'what-s-new' | 'bun-install' | 'bun-test' | 'bun-build' | 'faster';

export type Bun14ReleaseChapter = {
  id: Bun14ReleaseChapterId;
  title: string;
  releaseUrl: string;
  order: number;
};

export type Bun14Capability = {
  id: ReleaseCapabilityId;
  domain: CapabilityDomain;
  symbol: string;
  changeKind: CapabilityChangeKind;
  adoption: CapabilityAdoption;
  summary: string;
  boundary: string;
  chapterId?: Bun14ReleaseChapterId;
  releaseUrl: string;
  docsUrl?: string;
  assetIds: string[];
  contractFiles: string[];
};

export type Bun14CapabilityRegistry = {
  schemaVersion: number;
  release: 'Bun 1.4';
  version: '1.4.0';
  sourcePage: string;
  publishedAt: string;
  generatedAt: string;
  relationModel: 'capability-references-assets';
  migration: {
    breakingChangesUrl: string;
    upgradeGuideUrl: string;
    reconciledTag: 'bun-v1.4.0';
    underConsiderationShipped: false;
  };
  chapters: Bun14ReleaseChapter[];
  capabilities: Bun14Capability[];
};

export type AssetDraft = {
  id: ReleaseAssetId;
  kind: MediaKind;
  sourceUrl: string;
  path?: string;
  alt: string;
  caption?: string;
  section: string;
  width: number | null;
  height: number | null;
  posterId?: ReleaseAssetId;
  lazyLoad: boolean;
  watchUrl?: string;
};

export type AssetRecord = AssetDraft & {
  publicUrl: string;
  localUrl: string | null;
  mimeType: string | null;
  byteSize: number | null;
  sha256: string | null;
  format: string | null;
  metadataSource: 'source-attributes' | 'remote-bytes' | 'not-fetched';
};

export type Attribution = {
  publisher: { name: string; url: string };
  authors: Array<{ name: string; url?: string }>;
  sourcePage: string;
  rightsNote: string;
};

export type AssetManifest = {
  schemaVersion: number;
  release: string;
  version: string;
  sourcePage: string;
  sourceMarkdown: string;
  publishedAt: string;
  generatedAt: string;
  rightsStatus: RightsStatus;
  rights: MediaRights;
  attribution: Attribution;
  discovery: {
    html: string;
    markdown: string;
    expectedAssetCount: number;
  };
  counts: { total: number; image: number; video: number; embed: number };
  assets: AssetRecord[];
};

export type SourceAttributes = Record<string, string>;

export type SourceDocuments = {
  html: string;
  markdown: string;
  htmlSource: string;
  markdownSource: string;
};

export type FetchedAsset = {
  asset: AssetDraft;
  bytes: Uint8Array | null;
  mimeType: string | null;
  byteSize: number | null;
  sha256: string | null;
  format: string | null;
  metadataSource: AssetRecord['metadataSource'];
  rangeProbe: RangeProbe | null;
};

export type RangeProbe = {
  request: 'bytes=0-0';
  result: 'supported' | 'ignored';
  totalBytes: number;
};

export type CliOptions = {
  check: boolean;
  vendor: boolean;
  confirmRights: boolean;
  mode: 'external' | 'vendor';
  htmlPath?: string;
  markdownPath?: string;
  manifestPath: string;
  vendorDir: string;
  rightsEvidencePath?: string;
  timeoutMs: number;
};
