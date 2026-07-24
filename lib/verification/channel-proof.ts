/**
 * Shared channel-aware proof hashing / summary recompute.
 *
 * @see tools/verify-channel.ts
 * @see lib/verification/channel-meta-refresh.ts
 */
import { CryptoHasher } from 'bun';
import { inferIntroducedInFromUrl, inferKindFromUrl } from '../../tools/canonical-helpers.ts';
import { subsystemsFromResults, summarizeBySubsystem, withSubsystem } from './subsystem.ts';
import type { ChannelAwareVerificationReport, VerificationResult } from './types.ts';

/**
 * Fill sparse taxonomy fields on a proof row without overwriting explicit values.
 * Used after meta-merge so disk pillars that predate completeness still pass audit.
 */
export function ensureRowTaxonomy(r: VerificationResult): VerificationResult {
  const canonical = r.canonical ?? r._links?.docs ?? '';
  return {
    ...r,
    canonicalKind: r.canonicalKind ?? inferKindFromUrl(canonical) ?? 'Concept',
    canonicalStability: r.canonicalStability ?? 'stable',
    introducedIn: r.introducedIn ?? inferIntroducedInFromUrl(canonical) ?? 'all',
  };
}

/** Re-tag rows, recompute bySubsystem + proofHash (stable for dashboard/diff). */
export function rehashChannelProof(
  report: ChannelAwareVerificationReport
): ChannelAwareVerificationReport {
  const results = report.results.map(r => ensureRowTaxonomy(withSubsystem(r)));
  const subsystems = subsystemsFromResults(results);
  const semanticTags = { ...report.semanticTags, subsystems };
  const hasher = new CryptoHasher('sha256');
  hasher.update(JSON.stringify(semanticTags));
  for (const r of results) {
    hasher.update(r.name + r.passed + (r.canonical ?? '') + JSON.stringify(r._links ?? {}));
  }
  const proofHash = hasher.digest('hex');
  const passed = results.filter(r => r.passed).length;
  return {
    ...report,
    results,
    semanticTags,
    proofHash,
    summary: {
      ...report.summary,
      passed,
      total: results.length,
      status: passed === results.length ? 'pass' : 'fail',
      bySubsystem: summarizeBySubsystem(results),
    },
  };
}
