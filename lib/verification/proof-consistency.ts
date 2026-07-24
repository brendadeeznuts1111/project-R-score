/**
 * Cross-proof consistency — embedded rows and bySubsystem rollups must agree.
 *
 * @see lib/verification/proof-taxonomy.ts — contract audit
 * @see lib/verification/release-preview.ts — release UI dedupe
 * @see lib/verification/channel-meta-refresh.ts — bake sidecar
 */
import type { VerificationResult, VerificationSubsystem } from './types.ts';
import type { AccountId } from '../types/branded.ts';
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

export type DocsCoverageLike = {
  reference?: { pageCount?: number; moduleCount?: number; indexGenerated?: string };
  summary?: { ok?: boolean };
};

export type ReferenceIndexLike = {
  count?: number;
  moduleCount?: number;
  generated?: string;
};

/** docs-coverage-proof reference counts must mirror committed reference-index.json. */
export function auditDocsCoverageReferenceParity(
  docsCoverage: DocsCoverageLike,
  referenceIndex: ReferenceIndexLike
): ProofConsistencyRow {
  const notes: string[] = [];
  if (docsCoverage.reference?.pageCount !== referenceIndex.count) {
    notes.push(
      `pageCount ${docsCoverage.reference?.pageCount ?? '—'} vs reference-index ${referenceIndex.count ?? '—'}`
    );
  }
  if (docsCoverage.reference?.moduleCount !== referenceIndex.moduleCount) {
    notes.push(
      `moduleCount ${docsCoverage.reference?.moduleCount ?? '—'} vs reference-index ${referenceIndex.moduleCount ?? '—'}`
    );
  }
  return { id: 'docs-coverage-reference-parity', ok: notes.length === 0, notes };
}

/** registry-client pass implies at least one install-env registry row passed. */
export function auditRegistryClientInstallEnvParity(
  registryClient: ProofWithResults,
  installEnv: ProofWithResults
): ProofConsistencyRow {
  const notes: string[] = [];
  const rcPass =
    registryClient.summary?.status === 'pass' ||
    (registryClient.summary?.passed != null &&
      registryClient.summary.passed === registryClient.summary.total);
  const registryRows = (installEnv.results ?? []).filter(r => {
    const n = String(r.name);
    return n === 'install.scopes' || n === 'registry-read-plane' || n.includes('registry');
  });
  const envRegistryOk = registryRows.some(r => r.passed);
  if (rcPass && registryRows.length > 0 && !envRegistryOk) {
    notes.push('registry-client pass but install-env registry rows all failed');
  }
  return { id: 'registry-client-install-env', ok: notes.length === 0, notes };
}

/** docs-coverage ok implies doc-index defaults doc coverage passed. */
export function auditDocsCoverageDocIndexParity(
  docsCoverage: { summary?: { ok?: boolean } },
  docIndex: { defaultsCoverage?: { passed?: boolean } }
): ProofConsistencyRow {
  const notes: string[] = [];
  if (docsCoverage.summary?.ok && docIndex.defaultsCoverage?.passed === false) {
    notes.push('docs-coverage ok but doc-index defaultsCoverage failed');
  }
  return { id: 'docs-coverage-doc-index', ok: notes.length === 0, notes };
}

/** cloudflare-token-scope proof pins must match CLOUDFLARE_TOKEN_PERMISSIONS SSOT. */
export function auditCloudflareTokenScopeSsot(
  proof: {
    pins?: { accountId?: AccountId | string; pagesProject?: string; zoneName?: string };
  },
  expected: { accountId: AccountId; pagesProject: string; zoneName: string }
): ProofConsistencyRow {
  const notes: string[] = [];
  const p = proof.pins;
  if (p?.accountId !== expected.accountId) {
    notes.push(`pins.accountId ${p?.accountId} ≠ ${expected.accountId}`);
  }
  if (p?.pagesProject !== expected.pagesProject) {
    notes.push(`pins.pagesProject ${p?.pagesProject} ≠ ${expected.pagesProject}`);
  }
  if (p?.zoneName !== expected.zoneName) {
    notes.push(`pins.zoneName ${p?.zoneName} ≠ ${expected.zoneName}`);
  }
  return { id: 'cloudflare-token-scope-ssot', ok: notes.length === 0, notes };
}

/** well-known MCP manifest rows must match proof mcpCatalog parity. */
export function auditWellKnownMcpCatalogParity(
  proof: { mcpCatalog?: { ok?: boolean; rows?: Array<{ name: string; ok: boolean }> } },
  wellKnown: { servers?: Array<{ name: string; url: string }> }
): ProofConsistencyRow {
  const notes: string[] = [];
  if (proof.mcpCatalog?.ok === false) {
    notes.push('cloudflare-token-scope mcpCatalog.ok is false');
  }
  const bad = proof.mcpCatalog?.rows?.filter(r => !r.ok) ?? [];
  if (bad.length) notes.push(`mcpCatalog rows failed: ${bad.map(r => r.name).join(', ')}`);
  const proofNames = new Set(proof.mcpCatalog?.rows?.map(r => r.name) ?? []);
  for (const s of wellKnown.servers ?? []) {
    if (!proofNames.has(s.name)) notes.push(`well-known server ${s.name} missing from proof rows`);
  }
  return { id: 'well-known-mcp-catalog-parity', ok: notes.length === 0, notes };
}

/** Preflight aggregate ok must match every step ok. */
export function auditCloudflarePreflightAggregate(preflight: {
  ok?: boolean;
  steps?: Array<{ ok?: boolean }>;
}): ProofConsistencyRow {
  const notes: string[] = [];
  const steps = preflight.steps ?? [];
  const allStepsOk = steps.length > 0 && steps.every(s => s.ok);
  if (preflight.ok !== allStepsOk) {
    notes.push(`preflight.ok=${preflight.ok} but allStepsOk=${allStepsOk}`);
  }
  return { id: 'cloudflare-preflight-aggregate', ok: notes.length === 0, notes };
}

/** Preflight token-static step must agree with token scope proof staticOk. */
export function auditCloudflarePreflightTokenScope(
  preflight: { steps?: Array<{ id?: string; ok?: boolean }> }, // brand-ok — preflight step key in wire DTO
  tokenScope: { summary?: { staticOk?: boolean } }
): ProofConsistencyRow {
  const notes: string[] = [];
  const staticStep = preflight.steps?.find(s => s.id === 'cloudflare-token-static');
  const staticOk = tokenScope.summary?.staticOk;
  if (staticStep && staticOk != null && staticStep.ok !== staticOk) {
    notes.push(`token-static step ${staticStep.ok} ≠ scope.summary.staticOk ${staticOk}`);
  }
  if (staticStep?.ok === false) notes.push('cloudflare-token-static preflight step failed');
  if (staticOk === false) notes.push('cloudflare-token-scope summary.staticOk is false');
  return { id: 'cloudflare-preflight-token-scope', ok: notes.length === 0, notes };
}

/** Audit row count must match PROOF_TAXONOMY_CONTRACTS registry length. */
export function auditTaxonomyContractRegistry(
  auditCount: number,
  expectedCount: number
): ProofConsistencyRow {
  const ok = auditCount === expectedCount;
  return {
    id: 'taxonomy-contract-registry',
    ok,
    notes: ok ? [] : [`audit rows ${auditCount} ≠ contract registry ${expectedCount}`],
  };
}

export type ProofConsistencyInput = {
  release?: ProofWithResults;
  installPlatform?: ProofWithResults;
  installEnv?: ProofWithResults;
  runtimeNits?: ProofWithResults;
  bundlerLoaders?: ProofWithResults;
  networkingChannel?: ProofWithResults;
  registryClient?: ProofWithResults;
  docsCoverage?: DocsCoverageLike;
  referenceIndex?: ReferenceIndexLike;
  docIndex?: { defaultsCoverage?: { passed?: boolean } };
  cloudflareTokenScope?: {
    pins?: { accountId?: AccountId | string; pagesProject?: string; zoneName?: string };
    mcpCatalog?: { ok?: boolean; rows?: Array<{ name: string; ok: boolean }> };
  };
  wellKnownMcp?: { servers?: Array<{ name: string; url: string }> };
  cloudflarePagesPreflight?: {
    ok?: boolean;
    steps?: Array<{ id?: string; ok?: boolean }>; // brand-ok — preflight step key in wire DTO
  };
  cloudflareTokenExpected?: { accountId: AccountId; pagesProject: string; zoneName: string };
  taxonomyAuditCount?: number;
  taxonomyExpectedCount?: number;
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
  if (input.registryClient) {
    rows.push(auditBySubsystemTotals(input.registryClient, 'registry-client'));
  }

  if (input.registryClient && input.installEnv) {
    rows.push(auditRegistryClientInstallEnvParity(input.registryClient, input.installEnv));
  }

  if (input.docsCoverage && input.referenceIndex) {
    rows.push(auditDocsCoverageReferenceParity(input.docsCoverage, input.referenceIndex));
  }

  if (input.docsCoverage && input.docIndex) {
    rows.push(auditDocsCoverageDocIndexParity(input.docsCoverage, input.docIndex));
  }

  if (input.cloudflareTokenScope && input.cloudflareTokenExpected) {
    rows.push(
      auditCloudflareTokenScopeSsot(input.cloudflareTokenScope, input.cloudflareTokenExpected)
    );
  }

  if (input.cloudflareTokenScope && input.wellKnownMcp) {
    rows.push(auditWellKnownMcpCatalogParity(input.cloudflareTokenScope, input.wellKnownMcp));
  }

  if (input.cloudflarePagesPreflight) {
    rows.push(auditCloudflarePreflightAggregate(input.cloudflarePagesPreflight));
  }

  if (input.cloudflarePagesPreflight && input.cloudflareTokenScope) {
    rows.push(
      auditCloudflarePreflightTokenScope(input.cloudflarePagesPreflight, input.cloudflareTokenScope)
    );
  }

  if (input.taxonomyAuditCount != null && input.taxonomyExpectedCount != null) {
    rows.push(auditTaxonomyContractRegistry(input.taxonomyAuditCount, input.taxonomyExpectedCount));
  }

  return rows;
}
