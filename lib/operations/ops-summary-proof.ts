// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Ops summary **proof strip** — harness / control-plane registry slices.
 *
 * Domain sportsbook fields live in `ops-summary.ts` (`buildOpsDomainSummary`).
 * Full portal wire payload is domain ∪ proof via `buildOpsSummary` (flat keys for
 * Pages + `ops:snapshot` — no nested `proof` object on the wire).
 *
 * @see ./ops-summary.ts
 * @see docs/harness/ops-summary-endpoint.md
 */
import { buildBunUtilsProof } from '../bun-utils-proof.ts';
import { loadRoutingOpsSliceSync, type RoutingOpsSlice } from '../routing-proof.ts';
import {
  loadMonorepoHealthSummarySliceSync,
  type MonorepoHealthSummarySlice,
} from '../monitoring/monorepo-health-slice.ts';
import {
  loadBunBrandMapSummarySliceSync,
  toBunBrandMapOpsSlice,
  type BunBrandMapOpsSlice,
} from '../monitoring/bun-brand-map-slice.ts';

// ─── Proof strip field types ─────────────────────────────────────────────────

export type OpsSummaryBunUtils = {
  bunVersion: string;
  bunRevision: string;
  proofHash: string;
  passed: number;
  total: number;
  failed: number;
  timestamp: string;
};

export type OpsSummaryRegistryClient = {
  available: boolean;
  sdkVersion?: string;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  subsystem?: 'package-manager';
  proofHash?: string;
  timestamp?: string;
  path: '/registry/registry-client-proof.json';
};

export type OpsSummaryDocsCoverage = {
  available: boolean;
  ok?: boolean;
  subsystem?: 'other';
  missingCanonicalCount?: number;
  catalogTracked?: number;
  catalogTotal?: number;
  overlayTracked?: number;
  overlayTotal?: number;
  referenceModuleCount?: number;
  referencePageCount?: number;
  indexStale?: boolean;
  proofHash?: string;
  timestamp?: string;
  path: '/registry/docs-coverage-proof.json';
};

/** Cloudflare token scope + MCP catalog parity (Layer 2 + Layer 5). */
export type OpsSummaryCloudflareTokenScope = {
  available: boolean;
  ok?: boolean;
  status?: 'pass' | 'fail' | 'partial';
  tier?: string;
  staticOk?: boolean;
  liveOk?: boolean | null;
  liveAvailable?: boolean;
  mcpCatalogOk?: boolean;
  serverCount?: number;
  proofHash?: string;
  timestamp?: string;
  path: '/registry/cloudflare-token-scope-proof.json';
  wellKnownPath: '/.well-known/mcp.json';
};

/** Pages deploy preflight report (public/registry/cloudflare-pages-preflight.json). */
export type OpsSummaryCloudflarePages = {
  available: boolean;
  ok?: boolean;
  steps?: Array<{ id: string; ok: boolean; detail?: string }>; // brand-ok — step id keys
  timestamp?: string;
  pagesUrl?: string;
  path: '/registry/cloudflare-pages-preflight.json';
};

export type OpsSummaryProofTaxonomyAuditRow = {
  path: string;
  reportPath: string;
  ok: boolean;
  primarySubsystem: string;
  rows: number;
};

export type OpsSummaryProofTaxonomyConsistencyRow = {
  id: string; // brand-ok — opaque consistency check id
  ok: boolean;
};

export type OpsSummaryProofTaxonomy = {
  available: boolean;
  ok?: boolean;
  contracts?: number;
  contractsOk?: number;
  consistencyOk?: number;
  consistencyTotal?: number;
  /** Per-contract rows — embedded so portal renders without full audit JSON fetch. */
  audits?: OpsSummaryProofTaxonomyAuditRow[];
  consistency?: OpsSummaryProofTaxonomyConsistencyRow[];
  proofHash?: string;
  timestamp?: string;
  path: '/registry/proof-taxonomy-audit.json';
};

/** Channel meta bake rollup (suite=all → release-features + sources sidecar). */
export type OpsSummaryChannelMeta = {
  available: boolean;
  ok?: boolean;
  /** bake.proofHash ≠ release-features.proofHash */
  stale?: boolean;
  passed?: number;
  total?: number;
  status?: 'pass' | 'fail';
  proofHash?: string;
  updatedAt?: string;
  channel?: string;
  targetVersion?: string;
  runtimeVersion?: string;
  bySubsystem?: Partial<Record<string, { passed: number; total: number }>>;
  sources?: {
    release: string;
    nits: string;
    bundler: string;
    networking: string;
  };
  path: '/registry/release-features.json';
  bakePath: '/registry/channel-meta-bake.json';
};

/** Monorepo health score rollup from /registry/monorepo-health.json. */
export type OpsSummaryMonorepoHealth = MonorepoHealthSummarySlice;

/** Bun capability × brand declaration, adoption, and proof rollup. */
export type OpsSummaryBunBrandMap = BunBrandMapOpsSlice;

/**
 * Control-plane / harness proof fields on the ops summary wire payload.
 * Composed flat with domain fields — never nest under a `proof` key (portal contract).
 */
export type OpsSummaryProofStrip = {
  /** Self-verifying Bun.stringWidth / deepEquals / inspect fingerprint. */
  bunUtils: OpsSummaryBunUtils;
  /**
   * Registry client SDK proof from public/registry/registry-client-proof.json
   * (refreshed by `bun run verify:registry-client:save`).
   */
  registryClient: OpsSummaryRegistryClient;
  /**
   * Docs coverage proof from public/registry/docs-coverage-proof.json
   * (RSS + reference + canonical alignment; `bun run verify:docs-coverage:save`).
   */
  docsCoverage: OpsSummaryDocsCoverage;
  /**
   * Cloudflare token scope proof from public/registry/cloudflare-token-scope-proof.json
   * (`bun run verify:cloudflare-token:save`).
   */
  cloudflareTokenScope: OpsSummaryCloudflareTokenScope;
  /**
   * Pages preflight from public/registry/cloudflare-pages-preflight.json
   * (`bun run cloudflare:preflight --save` / `ops:snapshot`).
   */
  cloudflarePages: OpsSummaryCloudflarePages;
  /**
   * Proof taxonomy audit from public/registry/proof-taxonomy-audit.json
   * (`bun run verify:proof-taxonomy:save` / `verify-all` / `ops:snapshot`).
   */
  proofTaxonomy: OpsSummaryProofTaxonomy;
  /**
   * Channel meta bake from public/registry/channel-meta-bake.json
   * (`bun run verify:channel:meta` / `ops:snapshot` / suite=all).
   */
  channelMeta: OpsSummaryChannelMeta;
  /**
   * Last routing proof from public/registry/@factorywager/routing-test/latest.json
   * (refreshed by `bun run routing:proof:write` or `ops:snapshot --routing`).
   */
  routing: RoutingOpsSlice;
  /**
   * Monorepo health score from public/registry/monorepo-health.json
   * (`check:monorepo-health` / `ops:snapshot` / `monorepo:health:bake`).
   */
  monorepoHealth: OpsSummaryMonorepoHealth;
  /**
   * Derived Bun capability × brand map. Legacy undeclared usage is warning-only;
   * new/hard findings and stale proof degrade the slice.
   */
  bunBrandMap: OpsSummaryBunBrandMap;
};

// ─── Loaders ─────────────────────────────────────────────────────────────────

/** Run Bun utils proof and project fields for the portal panel. */
export function queryBunUtilsProof(): OpsSummaryBunUtils {
  const proof = buildBunUtilsProof();
  return {
    bunVersion: proof.bunVersion,
    bunRevision: proof.bunRevision,
    proofHash: proof.proofHash ?? '',
    passed: proof.summary.passed,
    total: proof.summary.total,
    failed: proof.summary.failed,
    timestamp: proof.timestamp,
  };
}

const REGISTRY_CLIENT_PROOF_PATH = 'public/registry/registry-client-proof.json';

/** Disk snapshot of registry client verification (resolve · download · publish). */
export function loadRegistryClientProofSlice(
  path: string = REGISTRY_CLIENT_PROOF_PATH
): OpsSummaryRegistryClient {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      sdkVersion?: string;
      subsystem?: 'package-manager';
      summary?: { passed?: number; total?: number; status?: 'pass' | 'fail' };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      sdkVersion: data.sdkVersion,
      passed: data.summary?.passed,
      total: data.summary?.total,
      status: data.summary?.status,
      subsystem: data.subsystem ?? 'package-manager',
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/registry-client-proof.json',
    };
  } catch {
    return { available: false, path: '/registry/registry-client-proof.json' };
  }
}

const DOCS_COVERAGE_PROOF_PATH = 'public/registry/docs-coverage-proof.json';
const CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH = 'public/registry/cloudflare-token-scope-proof.json';
const CLOUDFLARE_PAGES_PREFLIGHT_PATH = 'public/registry/cloudflare-pages-preflight.json';
const PROOF_TAXONOMY_AUDIT_PATH = 'public/registry/proof-taxonomy-audit.json';
const CHANNEL_META_BAKE_PATH = 'public/registry/channel-meta-bake.json';
const RELEASE_FEATURES_PATH = 'public/registry/release-features.json';

/** Disk snapshot of channel meta bake (prefer sidecar; fall back to release-features). */
export function loadChannelMetaSlice(
  bakePath: string = CHANNEL_META_BAKE_PATH,
  releasePath: string = RELEASE_FEATURES_PATH
): OpsSummaryChannelMeta {
  const empty: OpsSummaryChannelMeta = {
    available: false,
    path: '/registry/release-features.json',
    bakePath: '/registry/channel-meta-bake.json',
  };
  try {
    const mapped = Bun.mmap(bakePath);
    const bake = JSON.parse(new TextDecoder().decode(mapped)) as {
      type?: string;
      status?: 'pass' | 'fail';
      passed?: number;
      total?: number;
      proofHash?: string;
      updatedAt?: string;
      channel?: string;
      targetVersion?: string;
      runtimeVersion?: string;
      bySubsystem?: OpsSummaryChannelMeta['bySubsystem'];
      sources?: OpsSummaryChannelMeta['sources'];
    };
    if (bake.type === 'ChannelMetaBake') {
      let stale = false;
      try {
        const relMapped = Bun.mmap(releasePath);
        const rel = JSON.parse(new TextDecoder().decode(relMapped)) as {
          proofHash?: string;
          results?: Array<{ name?: string }>;
        };
        if (bake.proofHash && rel.proofHash && bake.proofHash !== rel.proofHash) {
          stale = true;
        }
        // Release-only overwrite left bake claiming suite=all embeds.
        const hasEmbeds = (rel.results ?? []).some(r =>
          /^(runtime-nits:|bundler:|networking:)/.test(String(r.name ?? ''))
        );
        if (!hasEmbeds && (bake.total ?? 0) > 0) {
          stale = true;
        }
      } catch {
        /* release missing — bake alone is still available */
      }
      return {
        available: true,
        ok: bake.status === 'pass' && !stale,
        stale,
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
        bakePath: '/registry/channel-meta-bake.json',
      };
    }
  } catch {
    /* fall through to release-features */
  }
  try {
    const mapped = Bun.mmap(releasePath);
    const rel = JSON.parse(new TextDecoder().decode(mapped)) as {
      type?: string;
      summary?: {
        passed?: number;
        total?: number;
        status?: 'pass' | 'fail';
        bySubsystem?: OpsSummaryChannelMeta['bySubsystem'];
      };
      proofHash?: string;
      timestamp?: string;
      semanticTags?: {
        channel?: string;
        targetVersion?: string;
        runtimeVersion?: string;
      };
    };
    if (rel.type !== 'ChannelAwareVerificationReport' || !rel.summary) return empty;
    return {
      available: true,
      ok: rel.summary.status === 'pass',
      passed: rel.summary.passed,
      total: rel.summary.total,
      status: rel.summary.status,
      proofHash: rel.proofHash,
      updatedAt: rel.timestamp,
      channel: rel.semanticTags?.channel,
      targetVersion: rel.semanticTags?.targetVersion,
      runtimeVersion: rel.semanticTags?.runtimeVersion,
      bySubsystem: rel.summary.bySubsystem,
      path: '/registry/release-features.json',
      bakePath: '/registry/channel-meta-bake.json',
    };
  } catch {
    return empty;
  }
}

/** Disk snapshot of proof taxonomy audit (contracts + cross-proof consistency). */
export function loadProofTaxonomySlice(
  path: string = PROOF_TAXONOMY_AUDIT_PATH
): OpsSummaryProofTaxonomy {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      ok?: boolean;
      proofHash?: string;
      timestamp?: string;
      audits?: Array<{
        path?: string;
        reportPath?: string;
        ok?: boolean;
        primarySubsystem?: string;
        rows?: number;
      }>;
      consistency?: Array<{ id?: string; ok?: boolean }>; // brand-ok — consistency row id
    };
    const audits = data.audits ?? [];
    const consistency = data.consistency ?? [];
    return {
      available: true,
      ok: data.ok,
      contracts: audits.length,
      contractsOk: audits.filter(a => a.ok).length,
      consistencyOk: consistency.filter(c => c.ok).length,
      consistencyTotal: consistency.length,
      audits: audits.map(a => ({
        path: a.path ?? '',
        reportPath: a.reportPath ?? '',
        ok: a.ok === true,
        primarySubsystem: a.primarySubsystem ?? 'other',
        rows: a.rows ?? 0,
      })),
      consistency: consistency.map(c => ({
        id: c.id ?? 'unknown',
        ok: c.ok === true,
      })),
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/proof-taxonomy-audit.json',
    };
  } catch {
    return { available: false, path: '/registry/proof-taxonomy-audit.json' };
  }
}

/** Disk snapshot of docs coverage verification (RSS · reference · canonical). */
export function loadDocsCoverageProofSlice(
  path: string = DOCS_COVERAGE_PROOF_PATH
): OpsSummaryDocsCoverage {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      subsystem?: 'other';
      summary?: { ok?: boolean; missingCanonicalCount?: number; indexStale?: boolean };
      canonical?: {
        catalogTracked?: number;
        catalogTotal?: number;
        overlayTracked?: number;
        overlayTotal?: number;
      };
      reference?: { moduleCount?: number; pageCount?: number };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      ok: data.summary?.ok,
      subsystem: data.subsystem ?? 'other',
      missingCanonicalCount: data.summary?.missingCanonicalCount,
      catalogTracked: data.canonical?.catalogTracked,
      catalogTotal: data.canonical?.catalogTotal,
      overlayTracked: data.canonical?.overlayTracked,
      overlayTotal: data.canonical?.overlayTotal,
      referenceModuleCount: data.reference?.moduleCount,
      referencePageCount: data.reference?.pageCount,
      indexStale: data.summary?.indexStale,
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/docs-coverage-proof.json',
    };
  } catch {
    return { available: false, path: '/registry/docs-coverage-proof.json' };
  }
}

/** Disk snapshot of Cloudflare token scope + MCP catalog parity proof. */
export function loadCloudflareTokenScopeSlice(
  path: string = CLOUDFLARE_TOKEN_SCOPE_PROOF_PATH
): OpsSummaryCloudflareTokenScope {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      summary?: {
        ok?: boolean;
        status?: 'pass' | 'fail' | 'partial';
        tier?: string;
        staticOk?: boolean;
        liveOk?: boolean | null;
      };
      mcpCatalog?: { ok?: boolean; serverCount?: number };
      liveProbe?: { available?: boolean };
      proofHash?: string;
      timestamp?: string;
    };
    return {
      available: true,
      ok: data.summary?.ok,
      status: data.summary?.status,
      tier: data.summary?.tier,
      staticOk: data.summary?.staticOk,
      liveOk: data.summary?.liveOk,
      liveAvailable: data.liveProbe?.available,
      mcpCatalogOk: data.mcpCatalog?.ok,
      serverCount: data.mcpCatalog?.serverCount,
      proofHash: data.proofHash,
      timestamp: data.timestamp,
      path: '/registry/cloudflare-token-scope-proof.json',
      wellKnownPath: '/.well-known/mcp.json',
    };
  } catch {
    return {
      available: false,
      path: '/registry/cloudflare-token-scope-proof.json',
      wellKnownPath: '/.well-known/mcp.json',
    };
  }
}

/** Disk snapshot of Cloudflare Pages preflight (deploy gate). */
export function loadCloudflarePagesPreflightSlice(
  path: string = CLOUDFLARE_PAGES_PREFLIGHT_PATH
): OpsSummaryCloudflarePages {
  try {
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as {
      ok?: boolean;
      steps?: Array<{ id?: string; ok?: boolean; detail?: string }>; // brand-ok — preflight step key
      timestamp?: string;
      pagesUrl?: string;
    };
    return {
      available: true,
      ok: data.ok,
      steps: data.steps?.map(s => ({
        id: s.id ?? 'unknown', // brand-ok — preflight step key
        ok: Boolean(s.ok),
        detail: s.detail,
      })),
      timestamp: data.timestamp,
      pagesUrl: data.pagesUrl,
      path: '/registry/cloudflare-pages-preflight.json',
    };
  } catch {
    return {
      available: false,
      path: '/registry/cloudflare-pages-preflight.json',
    };
  }
}

/** Compose all harness proof slices (no DB; disk + runtime fingerprint only). */
export function buildOpsSummaryProofStrip(): OpsSummaryProofStrip {
  return {
    bunUtils: queryBunUtilsProof(),
    registryClient: loadRegistryClientProofSlice(),
    docsCoverage: loadDocsCoverageProofSlice(),
    cloudflareTokenScope: loadCloudflareTokenScopeSlice(),
    cloudflarePages: loadCloudflarePagesPreflightSlice(),
    proofTaxonomy: loadProofTaxonomySlice(),
    channelMeta: loadChannelMetaSlice(),
    routing: loadRoutingOpsSliceSync(),
    monorepoHealth: loadMonorepoHealthSummarySliceSync(),
    bunBrandMap: toBunBrandMapOpsSlice(loadBunBrandMapSummarySliceSync()),
  };
}
