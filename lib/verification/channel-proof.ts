/**
 * Shared channel-aware proof hashing / summary recompute.
 *
 * @see tools/verify-channel.ts
 * @see lib/verification/channel-meta-refresh.ts
 */
import { CryptoHasher } from 'bun';
import { summarizeBySubsystem, withSubsystem } from './subsystem.ts';
import type { ChannelAwareVerificationReport, VerificationSubsystem } from './types.ts';

/** Re-tag rows, recompute bySubsystem + proofHash (stable for dashboard/diff). */
export function rehashChannelProof(
  report: ChannelAwareVerificationReport
): ChannelAwareVerificationReport {
  const results = report.results.map(r => withSubsystem(r));
  const subsystems = [
    ...new Set(results.map(r => r.subsystem).filter((s): s is VerificationSubsystem => Boolean(s))),
  ];
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
