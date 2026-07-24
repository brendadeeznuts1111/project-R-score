/**
 * Channel-aware verification types — SSOT for proof JSON and dashboard markup.
 *
 * @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
 * @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
 */

/** Release channel under test (metadata-only; tests run on current runtime). */
export type ReleaseChannel = 'canary' | 'latest' | 'stable' | 'runtime' | 'pinned' | string;

/**
 * Bun product pillar under test — orthogonal to release channel.
 * Aligns with docs catalog DocSection (runtime / pm / bundler / test).
 */
export type VerificationSubsystem =
  | 'runtime'
  | 'package-manager'
  | 'networking'
  | 'bundler'
  | 'test'
  | 'other';

/** Living docs vs versioned blog ship notes (cadence / reliability). */
export type CanonicalSourceKind = 'docs' | 'blog' | 'reference' | 'other';

export type SemanticTags = {
  /** Which release channel was requested */
  channel: ReleaseChannel;
  /** Resolved target version for the channel intent */
  targetVersion: string;
  /** What GitHub latest (bun upgrade feed) resolved to at test time (audit) */
  latestAtTestTime?: string;
  /** Git commit of the verification suite */
  testSuiteCommit?: string;
  /** CI run ID or local timestamp id */
  provenanceId: string; // brand-ok — opaque CI provenance key
  /** OS platform (darwin, linux, win32) */
  platform?: string;
  /** CPU architecture (arm64, x64, etc.) */
  arch?: string;
  /** ISO timestamp when tests executed */
  testedAt: string;
  /** Bun.revision at test time */
  bunRevision?: string;
  /** Actual Bun.version of the runtime that ran tests */
  runtimeVersion: string;
  /** github-updater | github-oven | github-canary | runtime | pinned */
  channelResolveSource?: string;
  /** GITHUB_TOKEN | GITHUB_ACCESS_TOKEN | GH_TOKEN | gh-cli | none — never the secret */
  githubAuthSource?: string;
  /** Full canary commit SHA from GitHub canary release (when channel=canary) */
  canaryCommit?: string;
  /** Short canary id (12 hex) mirrored in targetVersion as canary+… */
  canaryCommitShort?: string;
  /** GitHub release HTML URL for the resolved channel */
  channelReleaseUrl?: string;
  /** GitHub release published_at ISO */
  channelPublishedAt?: string;
  /** Whether Bun.revision matches canary/target commit (prefix) */
  targetMatchesRuntime?: boolean;
  /**
   * Suites present in this proof (meta-verification).
   * Example: ['runtime','bundler'] when suite=all merges release + loaders.
   */
  subsystems?: VerificationSubsystem[];
};

/** Index of saved channel snapshots under public/registry/ */
export type VerificationSnapshotIndex = {
  type: 'VerificationSnapshotIndex';
  version: '1.0.0';
  updatedAt: string;
  canonical: string;
  snapshots: Array<{
    id: string; // brand-ok — snapshot id channel@version[+suite]
    channel: string;
    targetVersion: string;
    /** verify-channel suite that produced this snapshot (release | bundler | all) */
    suite?: string;
    runtimeVersion?: string;
    path: string;
    proofHash?: string;
    testedAt?: string;
    status?: string;
  }>;
};

export type VerificationLinks = {
  docs: string;
  source: string;
  report: string;
  diff?: string;
};

export type VerificationResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  /** Bun product pillar: runtime | package-manager | networking | bundler | test | other */
  subsystem?: VerificationSubsystem;
  /** Version that introduced the feature (`1.3.14`) or `all` for living docs. */
  introducedIn?: string;
  /** docs (living) | blog (versioned ship note) | reference | other */
  canonicalSource?: CanonicalSourceKind;
  /** Permanent canonical URL (blog anchor or runtime docs). */
  canonical?: string;
  /** CANONICAL_REFS / token map key used for docs lookup. */
  canonicalKey?: string;
  /** Token kind from canonical map (SDK, API, Global, …). */
  canonicalKind?: string;
  /** Token stability (stable, experimental, …). */
  canonicalStability?: string;
  /** Human-readable token description when available. */
  canonicalDescription?: string;
  /** Machine-readable feature flags tested */
  features?: string[];
  _links?: VerificationLinks;
  /** @deprecated Legacy per-row channel — prefer report semanticTags */
  channel?: string;
  /** @deprecated Legacy per-row version — prefer report semanticTags */
  targetVersion?: string;
  /** @deprecated Legacy per-row latest — prefer report semanticTags */
  latestAtTestTime?: string;
  /** Platform context: cpu arch, os, native flag. */
  platform?: { cpu: string; os: string; native: boolean };
};

/** @deprecated Use VerificationResult */
export type ReleaseVerifyResult = VerificationResult;

export type ChannelAwareVerificationReport = {
  type: 'ChannelAwareVerificationReport';
  version: '1.0.0';
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  blogPost?: string;
  semanticTags: SemanticTags;
  releaseNotes?: unknown[];
  results: VerificationResult[];
  summary: {
    passed: number;
    total: number;
    status: 'pass' | 'fail';
    channel?: string;
    version?: string;
    bySubsystem?: Partial<Record<VerificationSubsystem, { passed: number; total: number }>>;
  };
  proofHash: string;
  jsonLd?: object;
};

export const RELEASE_PROOF_REPORT_PATH = '/registry/release-features.json';
export const BUNDLER_PROOF_REPORT_PATH = '/registry/bundler-loaders-proof.json';
/** Channel-shaped networking proof (VerificationResult rows); native artifact stays networking-proof.json */
export const NETWORKING_CHANNEL_PROOF_REPORT_PATH = '/registry/networking-channel-proof.json';
export const VERIFICATION_SNAPSHOT_INDEX_PATH = 'public/registry/verification-index.json';
export const VERIFICATION_SNAPSHOT_INDEX_URL = '/registry/verification-index.json';
