/**
 * Channel-aware verification types — SSOT for proof JSON and dashboard markup.
 *
 * @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
 * @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
 */

/** Release channel under test (metadata-only; tests run on current runtime). */
export type ReleaseChannel = 'canary' | 'latest' | 'stable' | 'runtime' | 'pinned' | string;

export type SemanticTags = {
  /** Which release channel was requested */
  channel: ReleaseChannel;
  /** Resolved target version for the channel intent */
  targetVersion: string;
  /** What bun.sh/latest resolved to at test time (audit) */
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
  };
  proofHash: string;
  jsonLd?: object;
};

export const RELEASE_PROOF_REPORT_PATH = '/registry/release-features.json';
