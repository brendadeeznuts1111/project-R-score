// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Verification proof taxonomy contract — which artifacts carry subsystem metadata.
 *
 * @see lib/verification/types.ts — VerificationSubsystem
 * @see lib/verification/subsystem.ts — inference + summarizeBySubsystem
 */
import type { VerificationSubsystem, VerificationResult } from './types.ts';
import { auditProofConsistency, type ProofConsistencyRow } from './proof-consistency.ts';

export type ProofTaxonomyContract = {
  /** Path under repo root */
  path: string;
  /** Dashboard / monitoring URL */
  reportPath: string;
  /** Primary subsystem for this suite (report-level default) */
  primarySubsystem: VerificationSubsystem;
  /** JSON array key holding probe rows (omit for report-only proofs) */
  resultsKey?: 'results' | 'testCases' | 'tests';
  /** Every row must include subsystem when resultsKey is set */
  requireRowSubsystem?: boolean;
  /** Report JSON must include subsystem at top level */
  requireReportSubsystem?: boolean;
  /** Report should include semanticTags (channel audit) */
  expectSemanticTags?: boolean;
  /** Report summary must include bySubsystem aggregates */
  requireBySubsystem?: boolean;
  /** verify script that produces this artifact */
  verifyScript: string;
  /** Canonical source kind for docs alignment */
  canonicalSource: 'blog' | 'docs' | 'mixed';
};

/** SSOT: proof file → subsystem + shape expectations for ops dashboard + tests. */
export const PROOF_TAXONOMY_CONTRACTS: readonly ProofTaxonomyContract[] = [
  {
    path: 'public/registry/release-features.json',
    reportPath: '/registry/release-features.json',
    primarySubsystem: 'runtime',
    resultsKey: 'results',
    requireRowSubsystem: true,
    requireBySubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-bun-release.ts',
    canonicalSource: 'mixed',
  },
  {
    path: 'public/registry/install-platform.json',
    reportPath: '/registry/install-platform.json',
    primarySubsystem: 'package-manager',
    resultsKey: 'results',
    requireRowSubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-install-platform.ts',
    canonicalSource: 'docs',
  },
  {
    path: 'public/registry/install-env-proof.json',
    reportPath: '/registry/install-env-proof.json',
    primarySubsystem: 'package-manager',
    resultsKey: 'results',
    requireRowSubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-install-env.ts',
    canonicalSource: 'docs',
  },
  {
    path: 'public/registry/networking-proof.json',
    reportPath: '/registry/networking-proof.json',
    primarySubsystem: 'networking',
    requireReportSubsystem: true,
    verifyScript: 'tools/verify-networking.ts',
    canonicalSource: 'docs',
  },
  {
    path: 'public/registry/bun-runtime-nits-proof.json',
    reportPath: '/registry/bun-runtime-nits-proof.json',
    primarySubsystem: 'runtime',
    resultsKey: 'results',
    requireRowSubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-bun-runtime-nits.ts',
    canonicalSource: 'docs',
  },
  {
    path: 'public/registry/bundler-loaders-proof.json',
    reportPath: '/registry/bundler-loaders-proof.json',
    primarySubsystem: 'bundler',
    resultsKey: 'results',
    requireRowSubsystem: true,
    requireBySubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-bundler.ts',
    canonicalSource: 'docs',
  },
  {
    path: 'public/registry/networking-channel-proof.json',
    reportPath: '/registry/networking-channel-proof.json',
    primarySubsystem: 'networking',
    resultsKey: 'results',
    requireRowSubsystem: true,
    requireBySubsystem: true,
    expectSemanticTags: true,
    verifyScript: 'tools/verify-channel.ts --suite=networking',
    canonicalSource: 'docs',
  },
] as const;

export type ProofTaxonomyAuditRow = {
  path: string;
  ok: boolean;
  rows: number;
  missingSubsystem: number;
  /** Rows missing introducedIn when requireRowSubsystem (taxonomy completeness). */
  missingIntroducedIn: number;
  notes: string[];
  primarySubsystem: VerificationSubsystem;
  reportPath: string;
  verifyScript: string;
};

export const PROOF_TAXONOMY_AUDIT_REPORT_PATH = '/registry/proof-taxonomy-audit.json';

export type ProofTaxonomyAuditReport = {
  type: 'ProofTaxonomyAuditReport';
  version: '1.0.0';
  timestamp: string;
  ok: boolean;
  reportPath: typeof PROOF_TAXONOMY_AUDIT_REPORT_PATH;
  proofHash?: string;
  audits: ProofTaxonomyAuditRow[];
  consistency: ProofConsistencyRow[];
};

/** Audit a saved proof JSON object against its contract. */
export function auditProofTaxonomy(
  contract: ProofTaxonomyContract,
  raw: Record<string, unknown>
): ProofTaxonomyAuditRow {
  const notes: string[] = [];
  let missingSubsystem = 0;
  let missingIntroducedIn = 0;
  let rows = 0;

  if (contract.requireReportSubsystem && raw.subsystem !== contract.primarySubsystem) {
    notes.push(
      `report.subsystem expected ${contract.primarySubsystem}, got ${String(raw.subsystem)}`
    );
  }

  if (contract.expectSemanticTags && !raw.semanticTags) {
    notes.push('missing semanticTags');
  } else if (contract.expectSemanticTags && raw.semanticTags) {
    const tags = raw.semanticTags as { subsystems?: unknown };
    if (!Array.isArray(tags.subsystems) || tags.subsystems.length === 0) {
      notes.push('semanticTags.subsystems missing or empty');
    } else if (!tags.subsystems.includes(contract.primarySubsystem)) {
      notes.push(
        `semanticTags.subsystems lacks primary ${contract.primarySubsystem} (got ${tags.subsystems.join(',')})`
      );
    }
  }

  if (contract.requireBySubsystem) {
    const summary = raw.summary as { bySubsystem?: unknown } | undefined;
    if (!summary?.bySubsystem || typeof summary.bySubsystem !== 'object') {
      notes.push('missing summary.bySubsystem');
    } else {
      const bucket = (summary.bySubsystem as Record<string, unknown>)[contract.primarySubsystem];
      if (!bucket || typeof bucket !== 'object') {
        notes.push(`summary.bySubsystem missing ${contract.primarySubsystem}`);
      }
    }
  }

  if (contract.resultsKey) {
    const list = raw[contract.resultsKey];
    if (!Array.isArray(list)) {
      notes.push(`missing ${contract.resultsKey}[]`);
    } else {
      rows = list.length;
      if (contract.requireRowSubsystem) {
        for (const row of list) {
          const r = row as Record<string, unknown>;
          if (!r.subsystem) missingSubsystem++;
          if (r.introducedIn == null || r.introducedIn === '') missingIntroducedIn++;
        }
      }
    }
  }

  if (missingSubsystem > 0) {
    notes.push(`${missingSubsystem}/${rows} rows missing subsystem`);
  }
  if (missingIntroducedIn > 0) {
    notes.push(`${missingIntroducedIn}/${rows} rows missing introducedIn`);
  }

  return {
    path: contract.path,
    ok: notes.length === 0,
    rows,
    missingSubsystem,
    missingIntroducedIn,
    notes,
    primarySubsystem: contract.primarySubsystem,
    reportPath: contract.reportPath,
    verifyScript: contract.verifyScript,
  };
}

/** Audit all proof contracts on disk (optional root for tests). */
export async function runProofTaxonomyAudit(rootDir: string): Promise<ProofTaxonomyAuditReport> {
  const { joinPath } = await import('../path-bun.ts');
  const audits: ProofTaxonomyAuditRow[] = [];
  const loaded: Record<string, Record<string, unknown>> = {};

  for (const contract of PROOF_TAXONOMY_CONTRACTS) {
    const abs = joinPath(rootDir, contract.path);
    const file = Bun.file(abs);
    if (!(await file.exists())) {
      audits.push({
        path: contract.path,
        ok: false,
        rows: 0,
        missingSubsystem: 0,
        missingIntroducedIn: 0,
        notes: [`missing file — run ${contract.verifyScript} --save`],
        primarySubsystem: contract.primarySubsystem,
        reportPath: contract.reportPath,
        verifyScript: contract.verifyScript,
      });
      continue;
    }
    const raw = (await file.json()) as Record<string, unknown>;
    loaded[contract.path] = raw;
    audits.push(auditProofTaxonomy(contract, raw));
  }

  const bakePath = joinPath(rootDir, 'public/registry/channel-meta-bake.json');
  const bakeFile = Bun.file(bakePath);
  let channelMetaBake: Record<string, unknown> | null = null;
  if (await bakeFile.exists()) {
    try {
      channelMetaBake = (await bakeFile.json()) as Record<string, unknown>;
    } catch {
      channelMetaBake = { type: 'invalid' };
    }
  }

  const consistency = auditProofConsistency({
    release: loaded['public/registry/release-features.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
      proofHash?: string;
    },
    installPlatform: loaded['public/registry/install-platform.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    },
    installEnv: loaded['public/registry/install-env-proof.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    },
    runtimeNits: loaded['public/registry/bun-runtime-nits-proof.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    },
    bundlerLoaders: loaded['public/registry/bundler-loaders-proof.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    },
    networkingChannel: loaded['public/registry/networking-channel-proof.json'] as {
      results?: VerificationResult[];
      summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
    },
    // Always evaluate bake consistency when release exists (missing → fail row)
    channelMetaBake: loaded['public/registry/release-features.json'] ? channelMetaBake : undefined,
  });

  const contractsOk = audits.every(a => a.ok);
  const consistencyOk = consistency.every(c => c.ok);
  const body = {
    type: 'ProofTaxonomyAuditReport' as const,
    version: '1.0.0' as const,
    timestamp: new Date().toISOString(),
    ok: contractsOk && consistencyOk,
    reportPath: PROOF_TAXONOMY_AUDIT_REPORT_PATH,
    audits,
    consistency,
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');

  return { ...body, proofHash };
}

/** Write audit report JSON for portal / ops snapshot. */
export async function saveProofTaxonomyAudit(
  rootDir: string,
  outPath = `${rootDir}/public/registry/proof-taxonomy-audit.json`
): Promise<ProofTaxonomyAuditReport> {
  const report = await runProofTaxonomyAudit(rootDir);
  await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
