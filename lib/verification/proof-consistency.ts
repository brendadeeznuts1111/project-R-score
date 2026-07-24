/**
 * Cross-proof consistency — embedded rows and bySubsystem rollups must agree.
 *
 * @see lib/verification/proof-taxonomy.ts — contract audit
 * @see lib/verification/release-preview.ts — release UI dedupe
 */
import type { VerificationResult, VerificationSubsystem } from './types.ts';
import { summarizeBySubsystem } from './subsystem.ts';

export type ProofConsistencyRow = {
  id: string; // brand-ok — opaque consistency check id
  ok: boolean;
  notes: string[];
};

type ProofWithResults = {
  results?: VerificationResult[];
  summary?: { bySubsystem?: Record<string, { passed: number; total: number }> };
};

const INSTALL_PLATFORM_PREFIX = 'install platform:';

function byName(results: VerificationResult[] | undefined): Map<string, VerificationResult> {
  const m = new Map<string, VerificationResult>();
  for (const r of results ?? []) m.set(r.name, r);
  return m;
}

/** Release embed rows must mirror install-platform.json (pass + subsystem). */
export function auditInstallPlatformEmbed(
  release: ProofWithResults,
  installPlatform: ProofWithResults
): ProofConsistencyRow {
  const notes: string[] = [];
  const platform = byName(installPlatform.results);
  const embedded = (release.results ?? []).filter(r =>
    String(r.name).startsWith(INSTALL_PLATFORM_PREFIX)
  );

  if (embedded.length === 0 && platform.size === 0) {
    return { id: 'install-platform-embed', ok: true, notes: ['no embed rows (skipped)'] };
  }

  for (const row of embedded) {
    const canonical = platform.get(row.name);
    if (!canonical) {
      notes.push(`release embed missing in install-platform.json: ${row.name}`);
      continue;
    }
    if (row.passed !== canonical.passed) {
      notes.push(`${row.name}: pass ${row.passed} vs platform ${canonical.passed}`);
    }
    if (row.subsystem !== canonical.subsystem) {
      notes.push(
        `${row.name}: subsystem ${String(row.subsystem)} vs platform ${String(canonical.subsystem)}`
      );
    }
  }

  for (const [name] of platform) {
    const inRelease = embedded.some(r => r.name === name);
    if (!inRelease) {
      notes.push(`install-platform row absent from release embed: ${name}`);
    }
  }

  return { id: 'install-platform-embed', ok: notes.length === 0, notes };
}

/** summary.bySubsystem must match row-level subsystem counts. */
export function auditBySubsystemTotals(
  proof: ProofWithResults,
  label: string
): ProofConsistencyRow {
  const notes: string[] = [];
  const results = proof.results ?? [];
  const reported = proof.summary?.bySubsystem;
  if (!reported || results.length === 0) {
    return { id: `by-subsystem:${label}`, ok: true, notes: ['no bySubsystem or empty results'] };
  }

  const computed = summarizeBySubsystem(results);
  const keys = new Set([...Object.keys(reported), ...Object.keys(computed)]) as Set<
    VerificationSubsystem | string
  >;

  for (const key of keys) {
    const r = reported[key];
    const c = computed[key as VerificationSubsystem];
    if (!r && c) {
      notes.push(`${label}: missing summary.bySubsystem.${key} (computed ${c.total})`);
      continue;
    }
    if (r && !c) {
      notes.push(`${label}: stale summary.bySubsystem.${key} (reported ${r.total}, computed 0)`);
      continue;
    }
    if (r && c && (r.passed !== c.passed || r.total !== c.total)) {
      notes.push(
        `${label}: bySubsystem.${key} ${r.passed}/${r.total} vs computed ${c.passed}/${c.total}`
      );
    }
  }

  return { id: `by-subsystem:${label}`, ok: notes.length === 0, notes };
}

export type ProofConsistencyInput = {
  release?: ProofWithResults;
  installPlatform?: ProofWithResults;
  installEnv?: ProofWithResults;
  runtimeNits?: ProofWithResults;
};

/** Run cross-artifact consistency checks when proofs are present on disk. */
export function auditProofConsistency(input: ProofConsistencyInput): ProofConsistencyRow[] {
  const rows: ProofConsistencyRow[] = [];

  if (input.release && input.installPlatform) {
    rows.push(auditInstallPlatformEmbed(input.release, input.installPlatform));
  }

  if (input.release) rows.push(auditBySubsystemTotals(input.release, 'release-features'));
  if (input.installPlatform) {
    rows.push(auditBySubsystemTotals(input.installPlatform, 'install-platform'));
  }
  if (input.installEnv) rows.push(auditBySubsystemTotals(input.installEnv, 'install-env'));
  if (input.runtimeNits) rows.push(auditBySubsystemTotals(input.runtimeNits, 'runtime-nits'));

  return rows;
}
