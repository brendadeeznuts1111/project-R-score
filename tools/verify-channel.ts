#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Channel-aware verification runner (metadata-only — tests run on current Bun binary).
 *
 * Usage:
 *   bun tools/verify-channel.ts --channel=runtime --suite=release --save
 *   bun tools/verify-channel.ts --channel=canary --suite=release
 *   bun tools/verify-channel.ts --channel=runtime --suite=bundler
 *   bun tools/verify-channel.ts --channel=runtime --suite=networking
 *   bun tools/verify-channel.ts --channel=runtime --suite=all --save
 *   bun tools/verify-channel.ts --channel=1.3.14 --suite=release --save
 *   bun tools/verify-channel.ts --diff=a.json --diff-against=b.json
 *   bun tools/verify-channel.ts --diff=a.json --diff-against=b.json --json
 *   bun tools/verify-channel.ts --diff=a.json --diff-against=b.json --no-drifts
 *
 * @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
 */
import { parseArgs } from 'util';
import {
  buildSemanticTags,
  describeChannelAuth,
  probeChannelAuth,
  resolveChannel,
  upsertVerificationSnapshotIndex,
  verificationSnapshotFilename,
} from '../lib/verification/channels.ts';
import { rehashChannelProof } from '../lib/verification/channel-proof.ts';
import {
  channelSuiteCanonicalSavePath,
  channelSuiteReportUrl,
  channelSuiteUpdatesCanonicalIndex,
  isChannelVerifySuite,
  type ChannelVerifySuite,
} from '../lib/verification/channel-suite.ts';
import { runBundlerLoaderVerification } from '../lib/verification/bundler-loader-probes.ts';
import { runBunRuntimeNitsVerification } from '../lib/verification/bun-runtime-nits-probes.ts';
import { generateJSONLD } from '../lib/verification/jsonld.ts';
import { runNetworkingChannelVerification } from '../lib/verification/networking-channel.ts';
import { diffChannelProofs, formatProofDiffSummary } from '../lib/verification/proof-diff.ts';
import { withSubsystem } from '../lib/verification/subsystem.ts';
import type {
  ChannelAwareVerificationReport,
  VerificationResult,
} from '../lib/verification/types.ts';
import { runBundlerVerification } from './verify-bundler.ts';
import { runReleaseVerification } from './verify-bun-release.ts';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    channel: { type: 'string', short: 'c', default: 'runtime' },
    suite: { type: 'string', short: 's', default: 'release' },
    save: { type: 'boolean', default: false },
    'auth-status': { type: 'boolean', default: false },
    'resolve-only': { type: 'boolean', default: false },
    'prefer-auth': { type: 'boolean', default: false },
    diff: { type: 'string' },
    'diff-against': { type: 'string' },
    json: { type: 'boolean', default: false },
    'no-drifts': { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

const rehashProof = rehashChannelProof;

async function runSuite(
  suite: ChannelVerifySuite,
  semanticTags: Awaited<ReturnType<typeof buildSemanticTags>>
): Promise<ChannelAwareVerificationReport> {
  switch (suite) {
    case 'release':
      return rehashProof(await runReleaseVerification({ semanticTags }));
    case 'bundler':
      return runBundlerVerification({ semanticTags });
    case 'networking': {
      const { report } = await runNetworkingChannelVerification({
        semanticTags,
        preferArtifact: true,
        localOnly: true,
      });
      return rehashProof(report);
    }
    case 'all': {
      const release = await runReleaseVerification({ semanticTags });
      const nits = await runBunRuntimeNitsVerification();
      const bundler = await runBundlerLoaderVerification();
      const { results: netRows } = await runNetworkingChannelVerification({
        semanticTags,
        preferArtifact: true,
        localOnly: true,
      });
      const nitsRows: VerificationResult[] = nits.results.map(r =>
        withSubsystem(
          {
            ...r,
            name: `runtime-nits:${r.name}`,
            features: [...(r.features ?? []), 'runtime-nits', r.category],
          },
          'runtime'
        )
      );
      const bundlerRows: VerificationResult[] = bundler.results.map(r =>
        withSubsystem(r, 'bundler')
      );
      return rehashProof({
        ...release,
        results: [...release.results, ...nitsRows, ...bundlerRows, ...netRows],
      });
    }
  }
}

async function loadProof(path: string): Promise<ChannelAwareVerificationReport> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Proof not found: ${path}`);
  const json = (await file.json()) as ChannelAwareVerificationReport;
  if (!json?.results || !json?.summary) {
    throw new Error(`Not a ChannelAwareVerificationReport: ${path}`);
  }
  return json;
}

async function runDiff(
  beforePath: string,
  afterPath: string,
  opts: { json?: boolean; drifts?: boolean }
): Promise<void> {
  const before = await loadProof(beforePath);
  const after = await loadProof(afterPath);
  const diff = diffChannelProofs(before, after, {
    before: beforePath,
    after: afterPath,
  });
  for (const line of formatProofDiffSummary(diff, { showDrifts: opts.drifts !== false })) {
    console.log(line);
  }
  if (opts.json) {
    console.log('\n---JSON---');
    console.log(JSON.stringify(diff, null, 2));
  }
  if (diff.summary.passFlipped > 0) process.exit(1);
}

async function main(): Promise<void> {
  const channel = values.channel ?? 'runtime';
  const suiteRaw = values.suite ?? 'release';
  if (!isChannelVerifySuite(suiteRaw)) {
    throw new Error(`Unknown suite: ${suiteRaw} (expected release | bundler | networking | all)`);
  }
  const suite: ChannelVerifySuite = suiteRaw;
  const shouldSave = values.save ?? false;
  const authStatusOnly = values['auth-status'] ?? false;
  const resolveOnly = values['resolve-only'] ?? false;
  const preferAuth = values['prefer-auth'] ?? false;
  const diffPath = values.diff;
  const diffAgainst = values['diff-against'];

  if (diffPath || diffAgainst) {
    if (!diffPath || !diffAgainst) {
      throw new Error('Both --diff=<before> and --diff-against=<after> are required');
    }
    await runDiff(diffPath, diffAgainst, {
      json: values.json ?? false,
      drifts: !(values['no-drifts'] ?? false),
    });
    return;
  }

  const presence = describeChannelAuth();
  console.log(`GitHub auth: ${presence.source} · api=${presence.apiDomain} · ${presence.message}`);

  if (authStatusOnly) {
    const probed = await probeChannelAuth();
    console.log(JSON.stringify({ type: 'ChannelAuthStatus', ...probed }, null, 2));
    // Exit 0 if anonymous-ok OR token valid; 1 only when a configured token is invalid
    if (probed.configured && probed.valid === false) process.exit(1);
    process.exit(0);
  }

  if (resolveOnly) {
    const resolution = await resolveChannel(channel, { preferAuth });
    console.log(JSON.stringify({ type: 'ChannelResolution', ...resolution }, null, 2));
    return;
  }

  console.log(`Verifying against channel: ${channel} (suite=${suite})`);

  const semanticTags = await buildSemanticTags(channel, { preferAuth });
  console.log(
    `Resolved: channel=${semanticTags.channel} target=${semanticTags.targetVersion} runtime=${semanticTags.runtimeVersion}`
  );
  if (semanticTags.channelResolveSource) {
    console.log(
      `Resolve source: ${semanticTags.channelResolveSource} · auth=${semanticTags.githubAuthSource ?? 'none'}`
    );
  }
  if (semanticTags.canaryCommitShort) {
    console.log(
      `Canary commit: ${semanticTags.canaryCommitShort}${semanticTags.targetMatchesRuntime === true ? ' · matches runtime' : semanticTags.targetMatchesRuntime === false ? ' · ≠ runtime' : ''}`
    );
  } else if (semanticTags.targetMatchesRuntime != null) {
    console.log(`Target matches runtime: ${semanticTags.targetMatchesRuntime ? 'yes' : 'no'}`);
  }
  if (semanticTags.channelReleaseUrl) {
    console.log(`Release: ${semanticTags.channelReleaseUrl}`);
  }
  if (semanticTags.latestAtTestTime) {
    console.log(`Latest at test time: ${semanticTags.latestAtTestTime}`);
  }

  const report = await runSuite(suite, semanticTags);
  report.jsonLd = generateJSONLD(report.results, report.semanticTags);

  const savePath = channelSuiteCanonicalSavePath(suite);
  const reportUrl = channelSuiteReportUrl(suite);

  // Attach proof self-links for dashboard / diff (preserve suite-specific report URLs)
  for (const r of report.results) {
    r._links = {
      docs: r._links?.docs ?? r.canonical ?? '',
      source: r._links?.source ?? '',
      report: r._links?.report ?? reportUrl,
      ...(r._links?.diff ? { diff: r._links.diff } : {}),
    };
  }

  console.log(
    `\n${report.summary.passed}/${report.summary.total} passed (${report.summary.status})`
  );
  console.log(`Proof hash: ${report.proofHash.slice(0, 16)}…`);
  if (report.summary.bySubsystem) {
    const parts = Object.entries(report.summary.bySubsystem)
      .filter(([, v]) => v && v.total > 0)
      .map(([k, v]) => `${k} ${v!.passed}/${v!.total}`);
    if (parts.length) console.log(`By subsystem: ${parts.join(' · ')}`);
  }

  if (shouldSave) {
    await Bun.write(savePath, JSON.stringify(report, null, 2));
    console.log(`Saved: ${savePath}`);

    const snapshotPath = verificationSnapshotFilename(report.semanticTags, suite);
    if (snapshotPath !== savePath) {
      await Bun.write(snapshotPath, JSON.stringify(report, null, 2));
      console.log(`Saved: ${snapshotPath}`);
    }

    const index = await upsertVerificationSnapshotIndex({
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
    console.log(
      `Index: public/registry/verification-index.json (${index.snapshots.length} snapshots)`
    );
  }

  console.log('\n---JSON---');
  console.log(JSON.stringify(report));

  if (report.summary.status !== 'pass') process.exit(1);
}

if (import.meta.main) {
  main().catch(e => {
    console.error('Fatal:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
