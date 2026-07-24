/**
 * Cross-proof consistency — embedded rows and bySubsystem rollups must agree.
 *
 * @see lib/verification/proof-taxonomy.ts — contract audit
 * @see lib/verification/release-preview.ts — release UI dedupe
 * @see lib/verification/channel-meta-refresh.ts — bake sidecar
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
  summary?: {
    passed?: number;
    total?: number;
    status?: 'pass' | 'fail';
    bySubsystem?: Record<string, { passed: number; total: number }>;
  };
  proofHash?: string;
};

/** Mirror of ChannelMetaBakeRecord — kept local to avoid heavy import cycles. */
export type ChannelMetaBakeLike = {
  type?: string;
  proofHash?: string;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  bySubsystem?: Partial<Record<VerificationSubsystem, { passed: number; total: number }>>;
};

const CHANNEL_META_ROW_PREFIXES = ['runtime-nits:', 'bundler:', 'networking:'] as const;

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

/** Bake sidecar must mirror release-features meta rollup (proofHash + counts). */
export function auditChannelMetaBake(
  release: ProofWithResults & { proofHash?: string },
  bake: ChannelMetaBakeLike | null | undefined
): ProofConsistencyRow {
  const notes: string[] = [];
  if (!bake || bake.type !== 'ChannelMetaBake') {
    return {
      id: 'channel-meta-bake',
      ok: false,
      notes: ['missing ChannelMetaBake — run bun run verify:channel:meta'],
    };
  }
  if (bake.proofHash && release.proofHash && bake.proofHash !== release.proofHash) {
    notes.push(
      `bake.proofHash ${String(bake.proofHash).slice(0, 12)}… ≠ release ${String(release.proofHash).slice(0, 12)}… (stale bake)`
    );
  }
  if (
    bake.passed != null &&
    release.summary?.passed != null &&
    bake.passed !== release.summary.passed
  ) {
    notes.push(`bake.passed ${bake.passed} ≠ release ${release.summary.passed}`);
  }
  if (
    bake.total != null &&
    release.summary?.total != null &&
    bake.total !== release.summary.total
  ) {
    notes.push(`bake.total ${bake.total} ≠ release ${release.summary.total}`);
  }
  if (bake.status && release.summary?.status && bake.status !== release.summary.status) {
    notes.push(`bake.status ${bake.status} ≠ release ${release.summary.status}`);
  }
  const bakeSub = bake.bySubsystem ?? {};
  const relSub = release.summary?.bySubsystem ?? {};
  for (const key of new Set([...Object.keys(bakeSub), ...Object.keys(relSub)])) {
    const b = bakeSub[key as VerificationSubsystem];
    const r = relSub[key];
    if (!b || !r || b.passed !== r.passed || b.total !== r.total) {
      notes.push(
        `bySubsystem.${key}: bake ${b?.passed ?? '—'}/${b?.total ?? '—'} vs release ${r?.passed ?? '—'}/${r?.total ?? '—'}`
      );
    }
  }
  return { id: 'channel-meta-bake', ok: notes.length === 0, notes };
}

/**
 * Meta-prefixed rows in release-features must mirror pillar proofs
 * (runtime-nits: / bundler: / networking:).
 */
export function auditChannelMetaPillarEmbed(
  release: ProofWithResults,
  pillar: ProofWithResults,
  prefix: (typeof CHANNEL_META_ROW_PREFIXES)[number],
  id: string // brand-ok — opaque consistency check id
): ProofConsistencyRow {
  const notes: string[] = [];
  const pillarByName = byName(pillar.results);
  const embedded = (release.results ?? []).filter(r => String(r.name).startsWith(prefix));

  if (embedded.length === 0 && pillarByName.size === 0) {
    return { id, ok: true, notes: ['no embed rows (skipped)'] };
  }

  for (const row of embedded) {
    const bare = row.name.startsWith(prefix) ? row.name.slice(prefix.length) : row.name;
    // Pillar proofs store bare names (nits) or already-prefixed (bundler/networking)
    const canonical = pillarByName.get(row.name) ?? pillarByName.get(bare);
    if (!canonical) {
      notes.push(`release embed missing in pillar: ${row.name}`);
      continue;
    }
    if (row.passed !== canonical.passed) {
      notes.push(`${row.name}: pass ${row.passed} vs pillar ${canonical.passed}`);
    }
  }

  for (const [name, row] of pillarByName) {
    const expected = name.startsWith(prefix) ? name : `${prefix}${name}`;
    const inRelease = embedded.some(r => r.name === expected || r.name === name);
    if (!inRelease) {
      notes.push(`pillar row absent from release meta: ${expected}`);
    }
    void row;
  }

  return { id, ok: notes.length === 0, notes };
}

export type ProofConsistencyInput = {
  release?: ProofWithResults;
  installPlatform?: ProofWithResults;
  installEnv?: ProofWithResults;
  runtimeNits?: ProofWithResults;
  bundlerLoaders?: ProofWithResults;
  networkingChannel?: ProofWithResults;
  channelMetaBake?: ChannelMetaBakeLike | null;
};

/** Run cross-artifact consistency checks when proofs are present on disk. */
export function auditProofConsistency(input: ProofConsistencyInput): ProofConsistencyRow[] {
  const rows: ProofConsistencyRow[] = [];

  if (input.release && input.installPlatform) {
    rows.push(auditInstallPlatformEmbed(input.release, input.installPlatform));
  }

  if (input.release && input.channelMetaBake !== undefined) {
    rows.push(auditChannelMetaBake(input.release, input.channelMetaBake));
  }

  // Pillar embeds only when meta bake is in play (suite=all / verify:channel:meta).
  const metaMode =
    input.channelMetaBake != null && input.channelMetaBake.type === 'ChannelMetaBake';
  if (metaMode && input.release && input.runtimeNits) {
    rows.push(
      auditChannelMetaPillarEmbed(
        input.release,
        input.runtimeNits,
        'runtime-nits:',
        'channel-meta-nits-embed'
      )
    );
  }
  if (metaMode && input.release && input.bundlerLoaders) {
    rows.push(
      auditChannelMetaPillarEmbed(
        input.release,
        input.bundlerLoaders,
        'bundler:',
        'channel-meta-bundler-embed'
      )
    );
  }
  if (metaMode && input.release && input.networkingChannel) {
    rows.push(
      auditChannelMetaPillarEmbed(
        input.release,
        input.networkingChannel,
        'networking:',
        'channel-meta-networking-embed'
      )
    );
  }

  if (input.release) rows.push(auditBySubsystemTotals(input.release, 'release-features'));
  if (input.installPlatform) {
    rows.push(auditBySubsystemTotals(input.installPlatform, 'install-platform'));
  }
  if (input.installEnv) rows.push(auditBySubsystemTotals(input.installEnv, 'install-env'));
  if (input.runtimeNits) rows.push(auditBySubsystemTotals(input.runtimeNits, 'runtime-nits'));
  if (input.bundlerLoaders) {
    rows.push(auditBySubsystemTotals(input.bundlerLoaders, 'bundler-loaders'));
  }
  if (input.networkingChannel) {
    rows.push(auditBySubsystemTotals(input.networkingChannel, 'networking-channel'));
  }

  return rows;
}
