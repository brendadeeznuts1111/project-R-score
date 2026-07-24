// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/networking/fetch — fetch networking
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — dns.prefetch
/**
 * Bridge native networking-proof.json → channel-aware VerificationResult rows.
 *
 * Orthogonal to release channel; primary subsystem is always `networking`.
 * suite=networking may prefer a saved artifact (offline) or run local-only probes.
 */
import { CryptoHasher } from 'bun';
import {
  NETWORKING_PROOF_PATH,
  parseNetworkingProofArtifact,
  type NetworkingProofArtifact,
} from '../http/networking-proof.ts';
import type { NetCheckRow } from '../http/networking-report.ts';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import { buildLocalNetworkingTargets, runNetworkingSuite } from '../../tools/verify-networking.ts';
import { buildSemanticTags } from './channels.ts';
import { generateJSONLD } from './jsonld.ts';
import { summarizeBySubsystem, withSubsystem } from './subsystem.ts';
import type { ChannelAwareVerificationReport, SemanticTags, VerificationResult } from './types.ts';
import { NETWORKING_CHANNEL_PROOF_REPORT_PATH } from './types.ts';

export const NETWORKING_CHANNEL_VERIFY_SOURCE = 'tools/verify-channel.ts';

type ArtifactTarget = {
  name?: string;
  category?: string;
  optimizations?: Record<string, { metric?: string; status?: string; detail?: string }>;
  summary?: { coldFetchMs?: number; warmFetchMs?: number };
};

const FETCH_CANONICAL = 'https://bun.com/docs/runtime/networking/fetch';

function networkingDocs(key: string) {
  return resolveCanonicalForProbe(key, {
    reportPath: NETWORKING_CHANNEL_PROOF_REPORT_PATH,
    sourcePath: NETWORKING_CHANNEL_VERIFY_SOURCE,
    fallback: FETCH_CANONICAL,
    subsystem: 'networking',
  });
}

/** Convert a saved networking proof artifact into VerificationResult rows. */
export function networkingArtifactToResults(
  artifact: NetworkingProofArtifact
): VerificationResult[] {
  const docs = networkingDocs('fetch protocol support');
  const results: VerificationResult[] = [];

  for (const raw of artifact.targets) {
    const t = raw as ArtifactTarget;
    const name = t.name ?? 'unknown';
    const opts = Object.entries(t.optimizations ?? {});
    const hard = opts.filter(([, o]) => o.status === 'PASS' || o.status === 'FAIL');
    const passedCount = hard.filter(([, o]) => o.status === 'PASS').length;
    const passed = hard.length > 0 && passedCount === hard.length;
    const cold = t.summary?.coldFetchMs;
    results.push(
      withSubsystem(
        {
          name: `networking:${name}`,
          expected: `${hard.length || '?'} hard checks pass`,
          actual:
            hard.length === 0
              ? 'no hard checks in artifact'
              : `${passedCount}/${hard.length}${cold != null ? ` · cold=${cold}ms` : ''}`,
          passed,
          ...docs,
          features: ['networking', String(t.category ?? 'ops')],
          subsystem: 'networking',
        },
        'networking'
      )
    );
  }

  // Aggregate row mirrors native proof global counts
  const g = artifact.global;
  results.push(
    withSubsystem(
      {
        name: 'networking:global-checks',
        expected: `${g.checksTotal} checks pass`,
        actual: `${g.checksPassed}/${g.checksTotal}`,
        passed: artifact.allOk,
        ...docs,
        features: ['networking', 'aggregate'],
        subsystem: 'networking',
      },
      'networking'
    )
  );

  return results;
}

/** Convert live NetCheckRow[] into one VerificationResult per target. */
export function networkingRowsToResults(
  rows: NetCheckRow[],
  targetNames: string[]
): VerificationResult[] {
  const docs = networkingDocs('dns-prefetching');
  const results: VerificationResult[] = [];
  for (const name of targetNames) {
    const targetRows = rows.filter(r => r.target === name);
    const hard = targetRows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
    const passedCount = hard.filter(r => r.status === 'PASS').length;
    const passed = hard.length > 0 && passedCount === hard.length;
    const category = targetRows[0]?.category ?? 'ops';
    results.push(
      withSubsystem(
        {
          name: `networking:${name}`,
          expected: `${hard.length} hard checks pass`,
          actual: `${passedCount}/${hard.length}`,
          passed,
          ...docs,
          features: ['networking', String(category)],
          subsystem: 'networking',
        },
        'networking'
      )
    );
  }
  return results;
}

export type NetworkingChannelOptions = {
  semanticTags?: SemanticTags;
  /** Prefer saved networking-proof.json when present (default true for suite=all). */
  preferArtifact?: boolean;
  /** Run local-only health/prediction probes when live. */
  localOnly?: boolean;
  base?: string;
};

/**
 * Channel-aware networking verification.
 * Prefer artifact → else local-only live suite (does not require remote hosts).
 */
export async function runNetworkingChannelVerification(
  options: NetworkingChannelOptions = {}
): Promise<{
  report: ChannelAwareVerificationReport;
  results: VerificationResult[];
  source: 'artifact' | 'live';
}> {
  const semanticTags = options.semanticTags ?? (await buildSemanticTags('runtime'));
  const preferArtifact = options.preferArtifact !== false;
  const base = options.base ?? Bun.env.HEALTH_URL ?? Bun.env.BASE_URL ?? 'http://127.0.0.1:3000';

  let results: VerificationResult[] = [];
  let source: 'artifact' | 'live' = 'live';

  if (preferArtifact) {
    const file = Bun.file(NETWORKING_PROOF_PATH);
    if (await file.exists()) {
      const parsed = parseNetworkingProofArtifact(await file.json());
      if (parsed && parsed.targets.length > 0) {
        results = networkingArtifactToResults(parsed);
        source = 'artifact';
      }
    }
  }

  if (results.length === 0) {
    const targets = buildLocalNetworkingTargets(base);
    const { rows } = await runNetworkingSuite({ targets, skipWrite: true });
    results = networkingRowsToResults(
      rows,
      targets.map(t => t.name)
    );
    source = 'live';
  }

  const bySubsystem = summarizeBySubsystem(results);
  const passed = results.filter(r => r.passed).length;
  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify(semanticTags));
  for (const r of results) {
    hasher.update(r.name + r.passed + (r.canonical ?? ''));
  }

  const report: ChannelAwareVerificationReport = {
    type: 'ChannelAwareVerificationReport',
    version: '1.0.0',
    timestamp: semanticTags.testedAt,
    bunVersion: Bun.version,
    bunRevision: (Bun.revision || '').slice(0, 12) || 'unknown',
    semanticTags: {
      ...semanticTags,
      subsystems: ['networking'],
    },
    results,
    summary: {
      passed,
      total: results.length,
      status: passed === results.length ? 'pass' : 'fail',
      channel: String(semanticTags.channel),
      version: semanticTags.targetVersion,
      bySubsystem,
    },
    proofHash: hasher.digest('hex'),
    jsonLd: generateJSONLD(results, { ...semanticTags, subsystems: ['networking'] }),
  };

  return { report, results, source };
}
