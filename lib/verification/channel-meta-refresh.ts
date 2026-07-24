// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Prefer-artifact merge for channel meta-proof (suite=all).
 *
 * Rebuilds `release-features.json` from saved pillar proofs without re-running
 * the heavy release suite — used by ops:snapshot and verify-all bake paths.
 *
 * @see tools/verify-channel.ts — live suite=all
 * @see lib/verification/channel-suite.ts — save path SSOT
 */
import { upsertVerificationSnapshotIndex, verificationSnapshotFilename } from './channels.ts';
import { rehashChannelProof } from './channel-proof.ts';
import {
  channelSuiteCanonicalSavePath,
  channelSuiteReportUrl,
  channelSuiteUpdatesCanonicalIndex,
} from './channel-suite.ts';
import { generateJSONLD } from './jsonld.ts';
import { runBundlerLoaderVerification } from './bundler-loader-probes.ts';
import { runBunRuntimeNitsVerification } from './bun-runtime-nits-probes.ts';
import { runNetworkingChannelVerification } from './networking-channel.ts';
import { withSubsystem } from './subsystem.ts';
import type {
  ChannelAwareVerificationReport,
  SemanticTags,
  VerificationResult,
  VerificationSubsystem,
} from './types.ts';
import { resolvePath } from '../path-bun.ts';

/** Sidecar bake record for ops-summary / static.json (sources + rollup). */
export const CHANNEL_META_BAKE_PATH = 'public/registry/channel-meta-bake.json';
export const CHANNEL_META_BAKE_URL = '/registry/channel-meta-bake.json';

/** Rows injected by suite=all / meta-refresh (never part of bare release). */
export const CHANNEL_META_ROW_PREFIXES = ['runtime-nits:', 'bundler:', 'networking:'] as const;

export type ChannelMetaSourceKind = 'artifact' | 'live' | 'base';

export type ChannelMetaRefreshResult = {
  report: ChannelAwareVerificationReport;
  sources: {
    release: ChannelMetaSourceKind;
    nits: ChannelMetaSourceKind;
    bundler: ChannelMetaSourceKind;
    networking: ChannelMetaSourceKind;
  };
};

export type ChannelMetaBakeRecord = {
  type: 'ChannelMetaBake';
  version: '1.0.0';
  updatedAt: string;
  proofHash: string;
  passed: number;
  total: number;
  status: 'pass' | 'fail';
  channel?: string;
  targetVersion?: string;
  runtimeVersion?: string;
  bySubsystem?: Partial<Record<VerificationSubsystem, { passed: number; total: number }>>;
  sources: ChannelMetaRefreshResult['sources'];
  path: '/registry/release-features.json';
};

export function isChannelMetaMergedRow(row: VerificationResult): boolean {
  return CHANNEL_META_ROW_PREFIXES.some(p => row.name.startsWith(p));
}

/** True when release-features carries suite=all meta pillar embeds. */
export function releaseHasChannelMetaEmbeds(results: VerificationResult[] | undefined): boolean {
  return (results ?? []).some(r => isChannelMetaMergedRow(r));
}

/** Drop previously merged meta rows so refresh is idempotent. */
export function stripChannelMetaRows(results: VerificationResult[]): VerificationResult[] {
  return results.filter(r => !isChannelMetaMergedRow(r));
}

/**
 * Mark bake sidecar invalid after a release-only write to release-features.json.
 * Prevents Pages/ops from advertising a green meta bake that no longer matches.
 */
export async function invalidateChannelMetaBake(reason: string): Promise<void> {
  const file = Bun.file(CHANNEL_META_BAKE_PATH);
  if (!(await file.exists())) return;
  const tombstone = {
    type: 'ChannelMetaBakeInvalid' as const,
    version: '1.0.0' as const,
    invalidatedAt: new Date().toISOString(),
    reason,
  };
  await Bun.write(CHANNEL_META_BAKE_PATH, `${JSON.stringify(tombstone, null, 2)}\n`);
}

export function nitsRowsToChannelMeta(results: VerificationResult[]): VerificationResult[] {
  return results.map(r => {
    const bare = r.name.startsWith('runtime-nits:') ? r.name.slice('runtime-nits:'.length) : r.name;
    const category =
      'category' in r && typeof (r as { category?: unknown }).category === 'string'
        ? (r as { category: string }).category
        : undefined;
    return withSubsystem(
      {
        ...r,
        name: `runtime-nits:${bare}`,
        features: [
          ...new Set(
            [...(r.features ?? []), 'runtime-nits', ...(category ? [category] : [])].filter(Boolean)
          ),
        ],
      },
      'runtime'
    );
  });
}

async function loadChannelReport(path: string): Promise<ChannelAwareVerificationReport | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const json = (await file.json()) as ChannelAwareVerificationReport;
  if (!json?.results || !json?.summary || json.type !== 'ChannelAwareVerificationReport') {
    return null;
  }
  return json;
}

async function loadNitsRows(path: string): Promise<VerificationResult[] | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const json = (await file.json()) as {
    type?: string;
    results?: VerificationResult[];
  };
  if (!Array.isArray(json.results) || json.results.length === 0) return null;
  return nitsRowsToChannelMeta(json.results);
}

export type RefreshChannelMetaOptions = {
  /** Repo root (default: parent of this module). */
  root?: string;
  /** Prefer disk proofs; fall back to live probes per missing pillar. */
  preferArtifacts?: boolean;
  /** Overlay semantic tags (channel resolve) onto the merged report. */
  semanticTags?: SemanticTags;
  releasePath?: string;
  nitsPath?: string;
  bundlerPath?: string;
  networkingPath?: string;
};

/**
 * Merge release base + nits + bundler + networking into a suite=all meta-proof.
 * When preferArtifacts, uses public/registry pillar JSON when present.
 */
export async function refreshChannelMetaProof(
  opts: RefreshChannelMetaOptions = {}
): Promise<ChannelMetaRefreshResult> {
  const root = opts.root ?? resolvePath(import.meta.dir, '../..');
  const prefer = opts.preferArtifacts !== false;
  const releasePath = opts.releasePath ?? `${root}/public/registry/release-features.json`;
  const nitsPath = opts.nitsPath ?? `${root}/public/registry/bun-runtime-nits-proof.json`;
  const bundlerPath = opts.bundlerPath ?? `${root}/public/registry/bundler-loaders-proof.json`;
  const networkingPath =
    opts.networkingPath ?? `${root}/public/registry/networking-channel-proof.json`;

  const sources: ChannelMetaRefreshResult['sources'] = {
    release: 'base',
    nits: 'live',
    bundler: 'live',
    networking: 'live',
  };

  const releaseDisk = await loadChannelReport(releasePath);
  if (!releaseDisk) {
    throw new Error(
      `channel-meta-refresh: missing release base at ${releasePath} — run verify:channel:save or verify-bun-release --save first`
    );
  }
  sources.release = 'artifact';

  const baseResults = stripChannelMetaRows(releaseDisk.results);
  if (baseResults.length === 0) {
    throw new Error('channel-meta-refresh: release base has no non-meta rows');
  }

  let nitsRows: VerificationResult[] | null = null;
  if (prefer) nitsRows = await loadNitsRows(nitsPath);
  if (nitsRows) {
    sources.nits = 'artifact';
  } else {
    const live = await runBunRuntimeNitsVerification();
    nitsRows = nitsRowsToChannelMeta(live.results);
    sources.nits = 'live';
  }

  let bundlerRows: VerificationResult[] | null = null;
  if (prefer) {
    const bundlerDisk = await loadChannelReport(bundlerPath);
    if (bundlerDisk) {
      bundlerRows = bundlerDisk.results.map(r => withSubsystem(r, 'bundler'));
      sources.bundler = 'artifact';
    }
  }
  if (!bundlerRows) {
    const live = await runBundlerLoaderVerification();
    bundlerRows = live.results.map(r => withSubsystem(r, 'bundler'));
    sources.bundler = 'live';
  }

  let netRows: VerificationResult[] | null = null;
  if (prefer) {
    const netDisk = await loadChannelReport(networkingPath);
    if (netDisk) {
      netRows = netDisk.results.map(r => withSubsystem(r, 'networking'));
      sources.networking = 'artifact';
    }
  }
  if (!netRows) {
    const { results } = await runNetworkingChannelVerification({
      semanticTags: opts.semanticTags ?? releaseDisk.semanticTags,
      preferArtifact: true,
      localOnly: true,
    });
    netRows = results;
    sources.networking = 'live';
  }

  const semanticTags = opts.semanticTags
    ? { ...opts.semanticTags }
    : { ...releaseDisk.semanticTags };

  let report = rehashChannelProof({
    ...releaseDisk,
    timestamp: new Date().toISOString(),
    semanticTags,
    results: [...baseResults, ...nitsRows, ...bundlerRows, ...netRows],
  });
  report.jsonLd = generateJSONLD(report.results, report.semanticTags);

  const reportUrl = channelSuiteReportUrl('all');
  for (const r of report.results) {
    r._links = {
      docs: r._links?.docs ?? r.canonical ?? '',
      source: r._links?.source ?? '',
      report: r._links?.report ?? reportUrl,
      ...(r._links?.diff ? { diff: r._links.diff } : {}),
    };
  }
  report = rehashChannelProof(report);

  return { report, sources };
}

/** Persist meta-proof + snapshot index + bake sidecar (suite=all paths). */
export async function saveChannelMetaProof(
  report: ChannelAwareVerificationReport,
  sources?: ChannelMetaRefreshResult['sources']
): Promise<{ savePath: string; snapshotPath: string; bakePath: string }> {
  const suite = 'all' as const;
  const savePath = channelSuiteCanonicalSavePath(suite);
  await Bun.write(savePath, `${JSON.stringify(report, null, 2)}\n`);

  const snapshotPath = verificationSnapshotFilename(report.semanticTags, suite);
  if (snapshotPath !== savePath) {
    await Bun.write(snapshotPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  await upsertVerificationSnapshotIndex({
    channel: String(report.semanticTags.channel),
    targetVersion: report.semanticTags.targetVersion,
    suite,
    runtimeVersion: report.semanticTags.runtimeVersion,
    path: snapshotPath,
    proofHash: report.proofHash,
    testedAt: report.semanticTags.testedAt,
    status: report.summary.status,
    updateCanonical: channelSuiteUpdatesCanonicalIndex(suite),
  });

  const bake: ChannelMetaBakeRecord = {
    type: 'ChannelMetaBake',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    proofHash: report.proofHash,
    passed: report.summary.passed,
    total: report.summary.total,
    status: report.summary.status,
    channel: String(report.semanticTags.channel),
    targetVersion: report.semanticTags.targetVersion,
    runtimeVersion: report.semanticTags.runtimeVersion,
    bySubsystem: report.summary.bySubsystem,
    sources: sources ?? {
      release: 'base',
      nits: 'live',
      bundler: 'live',
      networking: 'live',
    },
    path: '/registry/release-features.json',
  };
  await Bun.write(CHANNEL_META_BAKE_PATH, `${JSON.stringify(bake, null, 2)}\n`);

  return { savePath, snapshotPath, bakePath: CHANNEL_META_BAKE_PATH };
}

/** Compact ops / static.json slice from bake sidecar (falls back to release-features). */
export function channelMetaToOpsSlice(
  bake: ChannelMetaBakeRecord | null,
  report?: ChannelAwareVerificationReport | null
): {
  available: boolean;
  ok?: boolean;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  proofHash?: string;
  updatedAt?: string;
  channel?: string;
  targetVersion?: string;
  runtimeVersion?: string;
  bySubsystem?: Partial<Record<VerificationSubsystem, { passed: number; total: number }>>;
  sources?: ChannelMetaRefreshResult['sources'];
  path: '/registry/release-features.json';
  bakePath: typeof CHANNEL_META_BAKE_URL;
} {
  if (bake) {
    return {
      available: true,
      ok: bake.status === 'pass',
      passed: bake.passed,
      total: bake.total,
      status: bake.status,
      proofHash: bake.proofHash,
      updatedAt: bake.updatedAt,
      channel: bake.channel,
      targetVersion: bake.targetVersion,
      runtimeVersion: bake.runtimeVersion,
      bySubsystem: bake.bySubsystem,
      sources: bake.sources,
      path: '/registry/release-features.json',
      bakePath: CHANNEL_META_BAKE_URL,
    };
  }
  if (report?.summary) {
    return {
      available: true,
      ok: report.summary.status === 'pass',
      passed: report.summary.passed,
      total: report.summary.total,
      status: report.summary.status,
      proofHash: report.proofHash,
      updatedAt: report.timestamp,
      channel: String(report.semanticTags?.channel ?? ''),
      targetVersion: report.semanticTags?.targetVersion,
      runtimeVersion: report.semanticTags?.runtimeVersion,
      bySubsystem: report.summary.bySubsystem,
      path: '/registry/release-features.json',
      bakePath: CHANNEL_META_BAKE_URL,
    };
  }
  return {
    available: false,
    path: '/registry/release-features.json',
    bakePath: CHANNEL_META_BAKE_URL,
  };
}
