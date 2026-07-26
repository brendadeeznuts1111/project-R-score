/**
 * Compose harness + public-plane discovery reports for agent loops.
 */
import {
  publicReportPasses,
  runPublicDiscovery,
  type PublicDiscoveryReport,
} from './public-discovery.ts';
import {
  reportPasses,
  runReferenceDiscovery,
  type ReferenceDiscoveryReport,
  type ReferenceSeverity,
} from './reference-discovery.ts';

export type CombinedDiscoveryReport = {
  generatedAt: string;
  harness: ReferenceDiscoveryReport;
  publicPlane: PublicDiscoveryReport;
  summary: {
    totalFindings: number;
    harnessErrors: number;
    publicErrors: number;
    harnessWarnings: number;
    publicWarnings: number;
  };
};

export type CombinedDiscoveryOptions = {
  skipUnused?: boolean;
  harnessMinSeverity?: ReferenceSeverity;
  publicMinSeverity?: 'error' | 'warn' | 'info';
};

export async function runCombinedDiscovery(
  opts: CombinedDiscoveryOptions = {}
): Promise<CombinedDiscoveryReport> {
  const [harness, publicPlane] = await Promise.all([
    runReferenceDiscovery({ skipUnused: opts.skipUnused ?? true }),
    runPublicDiscovery(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    harness,
    publicPlane,
    summary: {
      totalFindings: harness.summary.total + publicPlane.summary.total,
      harnessErrors: harness.summary.errors,
      publicErrors: publicPlane.summary.errors,
      harnessWarnings: harness.summary.warnings,
      publicWarnings: publicPlane.summary.warnings,
    },
  };
}

export function combinedReportPasses(
  report: CombinedDiscoveryReport,
  opts: CombinedDiscoveryOptions = {}
): boolean {
  const harnessOk = reportPasses(report.harness, opts.harnessMinSeverity ?? 'error');
  const publicOk = publicReportPasses(report.publicPlane, opts.publicMinSeverity ?? 'error');
  return harnessOk && publicOk;
}
