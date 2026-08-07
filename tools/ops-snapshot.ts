#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/pm/bunx — bunx (args after bin name; --bun before package)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — FormData CT
/**
 * Production-grade ops / registry snapshot for Cloudflare Pages + local portal.
 *
 *   bun run ops:snapshot
 *   bunx --bun ops-snapshot
 *   bunx --bun ops-snapshot --no-routing --no-report
 *   bunx --bun ops-snapshot --force-routing
 *   bunx --bun ops-snapshot --no-channel-meta
 *   bunx --bun ops-snapshot --no-seed          # skip auto demo seed when DB empty
 *   bun run ops:seed && bun run ops:snapshot    # refresh Pages ops panels
 *
 * Writes (SSOT paths):
 *   public/registry/ops-summary.json
 *   public/registry/proof-taxonomy-audit.json
 *   public/registry/monitoring.json
 *   public/registry/telegram-handshake.json
 *   public/registry/static.json          — composite fast snapshot
 *   public/registry/compliance-board.json (+ enhancements/shadow) unless --no-compliance
 *   public/registry/@factorywager/bun-utils-test/latest.json
 *   public/registry/@factorywager/routing-test/latest.json  (when routing runs)
 *   public/registry/prediction/*         (unless --no-report)
 *   public/registry/release-features.json — channel meta merge (unless --no-channel-meta)
 *
 * Local portal uses live SQLite; Pages serves these static artifacts.
 *
 * @see lib/operations/ops-summary.ts
 * @see lib/routing-proof.ts
 * @see functions/api/operations/summary.ts
 */
import { jsonOut } from '../lib/console-depth.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { resolvePath } from '../lib/path-bun.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { isOperationsDbEmpty, seedOperationsDemo } from '../lib/operations/ops-seed.ts';
import { isPredictionDataEmpty, seedPredictionDemo } from '../lib/operations/prediction-seed.ts';
import { isDodQueueEmpty, seedDodDemo } from '../lib/operations/dod-seed.ts';
import { seedTenantRegistries } from '../lib/operations/tenant-registry-seed.ts';
import {
  exportCatalogSnapshot,
  isPartnerProfileBindingsEmpty,
  seedPartnerProfilesDemo,
} from '../lib/operations/partner-profile-seed.ts';
import { isTocOpsSnapshotMissing, seedTocOpsDemo } from '../lib/operations/toc-ops-seed.ts';
import { buildBunUtilsProof } from '../lib/bun-utils-proof.ts';
import {
  getRoutingProof,
  resolveRoutingProbeBaseUrl,
  routingToOpsSlice,
} from '../lib/routing-proof.ts';
import { collectMonitoring } from '../lib/monitoring/index.ts';
import { writePredictionReport } from '../lib/prediction/index.ts';
import { runNetworkingVerification } from './verify-networking.ts';
import { buildPortalEnvStatus } from '../lib/http/portal-env-status.ts';
import { writeLlmsStatic } from './llms-static.ts';
import { saveProofTaxonomyAudit } from '../lib/verification/proof-taxonomy.ts';
import {
  runCloudflarePagesPreflight,
  saveCloudflarePagesPreflight,
} from '../lib/verification/cloudflare-pages-preflight.ts';
import {
  refreshChannelMetaProof,
  saveChannelMetaProof,
} from '../lib/verification/channel-meta-refresh.ts';
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { bakeInstallHygieneReport } from '../scripts/bake-install-hygiene-report.ts';
import {
  OPS_SNAPSHOT_ALLOWED_LONG,
  OPS_SNAPSHOT_DOC,
  OPS_SNAPSHOT_LEAVES,
  OPS_SNAPSHOT_SECTION,
  formatFlagDocRefLine,
  opsSnapshotFlagDocRef,
  opsSnapshotToolFlags,
  unknownLongOptionLeaves,
} from '../lib/docs/ref-id-tool-flags.ts';

/** Re-export REF:ID SSOT for registry / tests (`flagDocRef` matches bun-types-status). */
export {
  OPS_SNAPSHOT_ALLOWED_LONG,
  OPS_SNAPSHOT_DOC,
  OPS_SNAPSHOT_LEAVES,
  OPS_SNAPSHOT_SECTION,
  opsSnapshotFlagDocRef as flagDocRef,
  opsSnapshotToolFlags,
};

const argv = Bun.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`ops:snapshot — registry bake for Pages + local portal

Usage:
  bun run ops:snapshot [options]

Common options:
  --out <path>          ops-summary.json path
  --no-report           skip prediction report bake
  --no-routing          skip routing proof
  --no-static           skip static registry composite
  --force-routing       force routing proof
  --publish             publish proof artifacts
  --no-channel-meta     skip channel meta merge
  --no-compliance       skip compliance board bake
  --no-monorepo-health  skip monorepo health bake
  --webview             include WebView probes

Seed block (when DB empty / demo) — REF:ID (${OPS_SNAPSHOT_DOC} §${OPS_SNAPSHOT_SECTION}):
  (default)       empty-gate seed only  (${opsSnapshotFlagDocRef('default').refId})
  --seed          always enter seeders  (${opsSnapshotFlagDocRef('seed').refId})
  --seed-force    force re-seed         (${opsSnapshotFlagDocRef('seed-force').refId})
  --seed-tenants  force tenant registries (${opsSnapshotFlagDocRef('seed-tenants').refId})
  --no-seed       skip demo seed block  (${opsSnapshotFlagDocRef('no-seed').refId})
  ${formatFlagDocRefLine(OPS_SNAPSHOT_SECTION, OPS_SNAPSHOT_LEAVES)}
  Prove: bun run docs:refid:check · import { flagDocRef } from tools/ops-snapshot.ts

See: ${OPS_SNAPSHOT_DOC}
`);
  process.exit(0);
}

{
  const unknown = unknownLongOptionLeaves(argv, OPS_SNAPSHOT_ALLOWED_LONG);
  if (unknown.length) {
    console.error(
      `unknown flag(s): ${unknown.map(u => `--${u}`).join(', ')} (see REF:ID §${OPS_SNAPSHOT_SECTION} · --help)`
    );
    process.exit(2);
  }
}

const outIdx = argv.indexOf('--out');
const outPath =
  (outIdx >= 0 ? argv[outIdx + 1] : undefined) ??
  Bun.env.OPS_SNAPSHOT_PATH ??
  'public/registry/ops-summary.json';
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const withReport = !argv.includes('--no-report');
const withWebView = argv.includes('--webview');
const withRouting = !argv.includes('--no-routing');
const withStatic = !argv.includes('--no-static');
const forceRouting = argv.includes('--force-routing');
const publishProofs = argv.includes('--publish') || Bun.env.OPS_SNAPSHOT_PUBLISH === '1';
/** Prefer-artifact suite=all merge for Pages (disable with --no-channel-meta). */
const withChannelMeta =
  !argv.includes('--no-channel-meta') && Bun.env.OPS_SNAPSHOT_CHANNEL_META !== '0';
/** MA/NJ compliance board bake (disable with --no-compliance or OPS_SNAPSHOT_COMPLIANCE=0). */
const withCompliance = !argv.includes('--no-compliance') && Bun.env.OPS_SNAPSHOT_COMPLIANCE !== '0';
/** Monorepo health registry bake (disable with --no-monorepo-health or OPS_SNAPSHOT_MONOREPO_HEALTH=0). */
const withMonorepoHealth =
  !argv.includes('--no-monorepo-health') && Bun.env.OPS_SNAPSHOT_MONOREPO_HEALTH !== '0';

const monitoringPath = Bun.env.MONITORING_SNAPSHOT_PATH ?? 'public/registry/monitoring.json';
const staticRegistryPath = Bun.env.REGISTRY_STATIC_PATH ?? 'public/registry/static.json';

async function ensureParent(filePath: string): Promise<void> {
  const parent = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : '.';
  if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
}

/** Optional multipart publish of a JSON proof artifact to a live registry gateway. */
async function maybePublishJsonArtifact(
  name: string,
  version: string,
  body: object,
  meta: Record<string, unknown>
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const base = (Bun.env.REGISTRY_URL || Bun.env.FACTORY_REGISTRY_URL || '').replace(/\/$/, '');
  const token = (
    Bun.env.REGISTRY_SECRET ||
    Bun.env.FACTORY_WAGER_TOKEN ||
    Bun.env.API_KEY ||
    ''
  ).trim();
  if (!base || !token) {
    return { ok: false, error: 'REGISTRY_URL + REGISTRY_SECRET required for --publish' };
  }
  try {
    const { jsonFile } = await import('../lib/http/content-type.ts');
    const form = new FormData();
    // File.type → part headers; FormData body → Bun sets multipart boundary (do not set Content-Type)
    form.set('file', jsonFile(body, `${name.split('/').pop() || 'artifact'}.json`));
    form.set('version', version);
    form.set('tags', 'latest,proof');
    form.set('metadata', JSON.stringify({ type: 'library', ...meta }));
    const res = await fetch(`${base}/api/registry/${encodeURIComponent(name)}/versions`, {
      method: 'POST',
      // Authorization only — Content-Type must stay unset for FormData
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return { ok: res.ok || res.status === 201, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type ComplianceSnapshotBake = {
  ok: boolean;
  enhancements: { passed: number; total: number };
  shadowMismatches: number;
  hmac: boolean;
};

export type ComplianceSnapshotBaker = (options: { log: false }) => Promise<ComplianceSnapshotBake>;

/**
 * Keep compliance ownership independently testable without running the entire
 * snapshot pipeline or writing its other public artifacts.
 */
export async function runComplianceSnapshotBake(options: {
  enabled: boolean;
  bake?: ComplianceSnapshotBaker;
}): Promise<ComplianceSnapshotBake | null> {
  if (!options.enabled) return null;
  const bake =
    options.bake ??
    (async (bakeOptions: { log: false }) => {
      const { bakeCompliancePortal } = await import('./bake-compliance-portal.ts');
      return bakeCompliancePortal(bakeOptions);
    });
  const baked = await bake({ log: false });
  console.log(
    `[ops-snapshot] compliance → ${baked.enhancements.passed}/${baked.enhancements.total}` +
      ` · shadow mismatches=${baked.shadowMismatches}` +
      (baked.hmac ? ' · hmac' : ' · integrity-only') +
      (baked.ok ? '' : ' · DEGRADED')
  );
  return baked;
}

export async function buildRegistrySnapshot(options?: {
  withRouting?: boolean;
  withReport?: boolean;
  withWebView?: boolean;
  withStatic?: boolean;
  forceRouting?: boolean;
  publish?: boolean;
  withChannelMeta?: boolean;
  /** Bake compliance-board.json + portal embed before ops-summary (default true). */
  withCompliance?: boolean;
  /** Bake public/registry/monorepo-health.json before ops-summary (default true). */
  withMonorepoHealth?: boolean;
  outPath?: string;
  dbPath?: string;
}): Promise<Record<string, unknown>> {
  const cfg = {
    withRouting: options?.withRouting ?? withRouting,
    withReport: options?.withReport ?? withReport,
    withWebView: options?.withWebView ?? withWebView,
    withStatic: options?.withStatic ?? withStatic,
    forceRouting: options?.forceRouting ?? forceRouting,
    publish: options?.publish ?? publishProofs,
    withChannelMeta: options?.withChannelMeta ?? withChannelMeta,
    withCompliance: options?.withCompliance ?? withCompliance,
    withMonorepoHealth: options?.withMonorepoHealth ?? withMonorepoHealth,
    outPath: options?.outPath ?? outPath,
    dbPath: options?.dbPath ?? dbPath,
  };

  if (cfg.dbPath !== ':memory:') await ensureParent(cfg.dbPath);
  await ensureParent(cfg.outPath);
  await ensureParent(monitoringPath);
  if (cfg.withStatic) await ensureParent(staticRegistryPath);

  await loadReasonixEnv();
  const db = openOperationsDb({ path: cfg.dbPath });
  try {
    // 1. Routing proof (retry + cache + artifact)
    let routingSlice: ReturnType<typeof routingToOpsSlice> | null = null;
    if (cfg.withRouting) {
      const got = await getRoutingProof({
        baseUrl: resolveRoutingProbeBaseUrl(),
        forceRefresh: cfg.forceRouting,
        writeArtifact: true,
      });
      if (got) {
        routingSlice = routingToOpsSlice(got.proof, {
          cached: got.cached,
          stale: got.stale,
        });
      } else {
        console.error('routing proof unavailable (no live, cache, or artifact)');
      }
    }

    // 1b. Channel-meta bake first, then taxonomy (so bake↔release consistency is fresh)
    const root = resolvePath(import.meta.dir, '..');
    let channelMetaSummary: {
      ok: boolean;
      passed?: number;
      total?: number;
      proofHash?: string;
      sources?: Record<string, string>;
      error?: string;
    } | null = null;
    if (cfg.withChannelMeta) {
      try {
        const { report, sources } = await refreshChannelMetaProof({
          root,
          preferArtifacts: true,
        });
        await saveChannelMetaProof(report, sources);
        channelMetaSummary = {
          ok: report.summary.status === 'pass',
          passed: report.summary.passed,
          total: report.summary.total,
          proofHash: report.proofHash,
          sources,
        };
        if (!channelMetaSummary.ok) {
          console.warn(
            `[ops-snapshot] channel-meta degraded: ${report.summary.passed}/${report.summary.total}`
          );
        }
      } catch (e) {
        channelMetaSummary = {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
        console.warn('[ops-snapshot] channel-meta skipped:', channelMetaSummary.error);
      }
    }

    let proofTaxonomySummary: {
      ok: boolean;
      contractsOk: number;
      contracts: number;
      consistencyOk: number;
      consistencyTotal: number;
      proofHash?: string;
      timestamp?: string;
      audits?: Array<{
        path: string;
        reportPath: string;
        ok: boolean;
        primarySubsystem: string;
        rows: number;
      }>;
      consistency?: Array<{ id: string; ok: boolean }>; // brand-ok — consistency row id
    } | null = null;
    try {
      const tax = await saveProofTaxonomyAudit(root);
      proofTaxonomySummary = {
        ok: tax.ok,
        contractsOk: tax.audits.filter(a => a.ok).length,
        contracts: tax.audits.length,
        consistencyOk: tax.consistency.filter(c => c.ok).length,
        consistencyTotal: tax.consistency.length,
        proofHash: tax.proofHash,
        timestamp: tax.timestamp,
        audits: tax.audits.map(a => ({
          path: a.path,
          reportPath: a.reportPath,
          ok: a.ok,
          primarySubsystem: a.primarySubsystem,
          rows: a.rows,
        })),
        consistency: tax.consistency.map(c => ({ id: c.id, ok: c.ok })),
      };
      if (!tax.ok) {
        console.warn('[ops-snapshot] proof taxonomy audit degraded — run verify:proof-taxonomy');
      }
    } catch (e) {
      console.warn(
        '[ops-snapshot] proof taxonomy audit skipped:',
        e instanceof Error ? e.message : e
      );
    }

    try {
      const pf = await runCloudflarePagesPreflight({ rootDir: root });
      await saveCloudflarePagesPreflight(pf, root);
      if (!pf.ok) {
        console.warn(
          '[ops-snapshot] cloudflare preflight degraded — run bun run cloudflare:preflight'
        );
      }
    } catch (e) {
      console.warn(
        '[ops-snapshot] cloudflare preflight skipped:',
        e instanceof Error ? e.message : e
      );
    }

    try {
      const { buildHarnessSkillsCatalog, buildSkillsCatalog } =
        await import('../lib/http/skills-catalog.ts');
      const skillsCatalog = await buildSkillsCatalog();
      await Bun.write(
        `${root}/public/registry/skills-catalog.json`,
        `${JSON.stringify(skillsCatalog, null, 2)}\n`
      );
      const harnessSkills = await buildHarnessSkillsCatalog(root);
      await Bun.write(
        `${root}/public/registry/harness-skills-catalog.json`,
        `${JSON.stringify(harnessSkills, null, 2)}\n`
      );
    } catch (e) {
      console.warn('[ops-snapshot] skills catalog skipped:', e instanceof Error ? e.message : e);
    }

    // 2. Demo seeds (ops / prediction / DOD / tenant registries) when empty
    if (!argv.includes('--no-seed')) {
      const forceSeed = argv.includes('--seed-force');
      const wantSeed = forceSeed || argv.includes('--seed');
      const ifEmptyOnly = !forceSeed && !argv.includes('--seed');

      if (wantSeed || isOperationsDbEmpty(db)) {
        const seed = await seedOperationsDemo(db, {
          force: forceSeed,
          ifEmpty: ifEmptyOnly,
        });
        if (seed.seeded) {
          console.log(
            `[ops-snapshot] ops seed → ${seed.experts} experts · ${seed.plays} plays · $${seed.liquidity} sb liquidity`
          );
        }
      }

      if (wantSeed || isPredictionDataEmpty(db)) {
        const pred = seedPredictionDemo(db, { force: forceSeed, ifEmpty: ifEmptyOnly });
        if (pred.seeded) {
          console.log(
            `[ops-snapshot] prediction seed → ${pred.snapshots} snapshots · n=${pred.accuracy?.n ?? 0}`
          );
        }
      }

      if (wantSeed || isDodQueueEmpty(cfg.dbPath)) {
        const dod = await seedDodDemo({
          dbPath: cfg.dbPath,
          force: forceSeed,
          ifEmpty: ifEmptyOnly,
        });
        if (dod.seeded) {
          console.log(
            `[ops-snapshot] dod seed → ${dod.inserted} submissions · ${JSON.stringify(dod.byStatus)}`
          );
        }
      }

      if (wantSeed || isPartnerProfileBindingsEmpty(db)) {
        const partners = await seedPartnerProfilesDemo(db, {
          force: forceSeed,
          ifEmpty: ifEmptyOnly,
        });
        if (partners.seeded) {
          console.log(
            `[ops-snapshot] partner profiles → ${partners.bindings} bound · channels ${partners.channelEvents} · accounts +${partners.platformAccounts}`
          );
        }
      }

      try {
        const tenants = await seedTenantRegistries({
          force: forceSeed || argv.includes('--seed-tenants'),
        });
        if (tenants.seeded) {
          console.log(`[ops-snapshot] tenant registries → ${JSON.stringify(tenants.tenants)}`);
        }
      } catch (e) {
        console.warn(
          '[ops-snapshot] tenant registry seed skipped:',
          e instanceof Error ? e.message : e
        );
      }

      if (wantSeed || isTocOpsSnapshotMissing(root)) {
        const toc = await seedTocOpsDemo({
          root,
          force: forceSeed,
          ifEmpty: ifEmptyOnly,
        });
        if (toc.seeded) {
          console.log(
            `[ops-snapshot] toc-ops seed → ${toc.partners} partners · warmed ${toc.warmed} · openTasks ${toc.openTasks}`
          );
        }
      }
    }

    try {
      const catalog = await exportCatalogSnapshot(db);
      console.log(`[ops-snapshot] catalog snapshot → ${catalog.accounts} accounts`);
    } catch (e) {
      console.warn('[ops-snapshot] catalog snapshot skipped:', e instanceof Error ? e.message : e);
    }

    // Always bake TOC fixture before ops-summary so `payload.toc` is available.
    try {
      const { exportTocOpsSnapshot, buildDemoTocOpsFixture, withTocEnforcement } =
        await import('../lib/toc-ops/index.ts');
      const { enrichTocFixtureWithIdentity } =
        await import('../lib/operations/toc-identity-bridge.ts');
      const { seedTocSoftFromFixture } = await import('../lib/operations/toc-soft-balance.ts');
      let fixture = enrichTocFixtureWithIdentity(db, buildDemoTocOpsFixture(), {
        seed: true,
        force: argv.includes('--seed-force'),
      });
      const soft = seedTocSoftFromFixture(db, fixture, { force: argv.includes('--seed-force') });
      fixture = withTocEnforcement(fixture);
      const toc = await exportTocOpsSnapshot({
        root,
        fixture,
        bakeEmbed: true,
      });
      console.log(
        `[ops-snapshot] toc-ops → ${toc.partners} partners · warmed ${toc.warmed} · openTasks ${toc.openTasks}` +
          (fixture.identity?.linked
            ? ` · identity ${fixture.identity.linkedPartners}p/${fixture.identity.linkedAccounts}a`
            : ' · identity unlinked') +
          (soft.inserted ? ` · soft+${soft.inserted}` : '') +
          (fixture.enforcement
            ? ` · focus=${fixture.enforcement.diagnosis.focus} fail=${fixture.enforcement.failed}`
            : '')
      );
    } catch (e) {
      console.warn('[ops-snapshot] toc-ops export skipped:', e instanceof Error ? e.message : e);
    }

    // Compliance board before ops-summary so payload.compliance + monitoring slice are fresh.
    try {
      await runComplianceSnapshotBake({ enabled: cfg.withCompliance });
    } catch (e) {
      console.warn('[ops-snapshot] compliance bake skipped:', e instanceof Error ? e.message : e);
    }

    // Monorepo health before ops-summary so payload.monorepoHealth + /registry/monorepo-health.json are fresh.
    if (cfg.withMonorepoHealth) {
      try {
        const { bakeMonorepoHealthRegistry } =
          await import('../lib/monitoring/monorepo-health-slice.ts');
        const mh = await bakeMonorepoHealthRegistry({ root, log: false });
        console.log(
          `[ops-snapshot] monorepo-health → ${mh.score}/100 (${mh.grade}) · cycles ${mh.metrics.cyclicDependencyCount}`
        );
      } catch (e) {
        console.warn(
          '[ops-snapshot] monorepo-health bake skipped:',
          e instanceof Error ? e.message : e
        );
      }
    }

    // Install-hygiene audit before monitoring.json so the portal row is fresh.
    try {
      const ih = await bakeInstallHygieneReport({ log: false });
      console.log(
        `[ops-snapshot] install-hygiene → ${ih.path.replace(root + '/', '')} · ok=${ih.ok}`
      );
    } catch (e) {
      console.warn(
        '[ops-snapshot] install-hygiene bake skipped:',
        e instanceof Error ? e.message : e
      );
    }

    // TOC identity → sportsbook raises bridge (demo/snapshot:demo path).
    // Opt out: --no-toc-limits or OPS_SNAPSHOT_TOC_LIMITS=0
    const skipTocLimits =
      argv.includes('--no-toc-limits') ||
      Bun.env.OPS_SNAPSHOT_TOC_LIMITS === '0' ||
      Bun.env.OPS_SNAPSHOT_TOC_LIMITS === 'false';
    if (!skipTocLimits && !argv.includes('--no-seed')) {
      try {
        const { seedTocLimitBridge } = await import('../lib/operations/toc-limit-bridge-seed.ts');
        const bridge = await seedTocLimitBridge(db, {
          force: argv.includes('--seed-force') || argv.includes('--seed-toc-limits-force'),
          captureContext: true,
        });
        if (bridge.nodes.length > 0) {
          console.log(
            `[ops-snapshot] toc-limit-bridge → source=${bridge.source} · targets=${bridge.targets} · raises=${bridge.raises} · rows=${bridge.limitRows}`
          );
        }
      } catch (e) {
        console.warn(
          '[ops-snapshot] toc-limit-bridge skipped:',
          e instanceof Error ? e.message : e
        );
      }
    }

    // Multi-factor limit raises: capture missing context + bake Pages/agent snapshot.
    try {
      const { exportLimitRaisesSnapshot } =
        await import('../lib/operations/partner-analytics-repo.ts');
      const lim = await exportLimitRaisesSnapshot(db, { root, lookbackHours: 48, capture: true });
      console.log(
        `[ops-snapshot] limit-raises → ${lim.raises} raise(s) · ${lim.partners} partner(s) · 48h`
      );
    } catch (e) {
      console.warn(
        '[ops-snapshot] limit-raises export skipped:',
        e instanceof Error ? e.message : e
      );
    }

    let telegramHandshakeSlice = (
      await import('../lib/telegram/handshake-snapshot.ts')
    ).emptyTelegramHandshakeSummarySlice();
    try {
      const { exportTelegramHandshakeSnapshot, exportTelegramHandshakeCatalog } =
        await import('../lib/telegram/handshake-snapshot.ts');
      const tg = loadTelegramEnv();
      await exportTelegramHandshakeCatalog(root);
      telegramHandshakeSlice = await exportTelegramHandshakeSnapshot(db, root, {
        telegramToken: tg.effectiveToken,
      });
      if (telegramHandshakeSlice.available) {
        console.log(
          `[ops-snapshot] telegram-handshake → ${telegramHandshakeSlice.partners} partners · invite gaps ${telegramHandshakeSlice.inviteGaps} · operator_ready ${telegramHandshakeSlice.operatorReady}`
        );
      }
    } catch (e) {
      console.warn(
        '[ops-snapshot] telegram-handshake export skipped:',
        e instanceof Error ? e.message : e
      );
    }

    let seatCapitalDeskSlice = (
      await import('../lib/telegram/seat-desk-snapshot.ts')
    ).emptySeatCapitalDeskSummarySlice();
    try {
      const { exportSeatCapitalDeskSnapshot } =
        await import('../lib/telegram/seat-desk-snapshot.ts');
      seatCapitalDeskSlice = await exportSeatCapitalDeskSnapshot(root);
      console.log(
        `[ops-snapshot] seat-capital-desk → ${seatCapitalDeskSlice.desks} desks · blocked ${seatCapitalDeskSlice.blocked} · incomplete outs ${seatCapitalDeskSlice.incompleteOuts}`
      );
    } catch (e) {
      console.warn(
        '[ops-snapshot] seat-capital-desk export skipped:',
        e instanceof Error ? e.message : e
      );
    }

    try {
      const { exportPartnersOpsRegistry } = await import('../lib/telegram/partner-ops-registry.ts');
      const partnersOps = await exportPartnersOpsRegistry(root);
      console.log(
        `[ops-snapshot] partners-ops → ${partnersOps.summary.partners} partners · ${partnersOps.summary.outs} outs · validation ${partnersOps.validation.ok ? 'ok' : 'FAIL'}`
      );
    } catch (e) {
      console.warn(
        '[ops-snapshot] partners-ops export skipped:',
        e instanceof Error ? e.message : e
      );
    }

    const payload = buildOpsSummary(db, 'snapshot');
    payload.telegramHandshake = telegramHandshakeSlice;
    payload.seatCapitalDesk = seatCapitalDeskSlice;
    if (routingSlice) payload.routing = routingSlice;

    if (Bun.env.NETWORKING_VERIFY === '1') {
      try {
        const net = await runNetworkingVerification({
          saveProof: true,
          remote: Bun.env.NETWORKING_VERIFY_REMOTE === '1',
          base: Bun.env.HEALTH_URL || Bun.env.BASE_URL || 'http://127.0.0.1:3000',
        });
        (payload as Record<string, unknown>).networking = {
          proofHash: net.proofHash,
          ...net.proofObj,
        };
        if (!net.ok) {
          console.warn(
            `[ops-snapshot] networking verify degraded: ${net.proofObj.global.checksPassed}/${net.proofObj.global.checksTotal} passed`
          );
        }
      } catch (e) {
        console.warn(
          '[ops-snapshot] networking verify failed:',
          e instanceof Error ? e.message : e
        );
        (payload as Record<string, unknown>).networking = {
          available: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    await Bun.write(cfg.outPath, `${JSON.stringify(payload, null, 2)}\n`);

    // 3. Bun utils proof → static allowlisted path
    const bunProof = buildBunUtilsProof();
    const bunDir = 'public/registry/@factorywager/bun-utils-test';
    await Bun.$`mkdir -p ${bunDir}`.quiet();
    await Bun.write(`${bunDir}/latest.json`, `${JSON.stringify(bunProof, null, 2)}\n`);

    let bunPublish: { ok: boolean; status?: number; error?: string } | null = null;
    if (cfg.publish) {
      bunPublish = await maybePublishJsonArtifact(
        '@factorywager/bun-utils-test',
        `v${Date.now()}`,
        bunProof,
        {
          proofHash: bunProof.proofHash,
          passed: bunProof.summary?.passed,
          total: bunProof.summary?.total,
          bunVersion: bunProof.bunVersion,
        }
      );
    }

    const registryClientSlice = payload.registryClient as
      { available?: boolean; passed?: number; total?: number; proofHash?: string } | undefined;

    // 4. Monitoring snapshot (+ env status — edge /api/env reads monitoring.env)
    const monitoring = await collectMonitoring(db, { source: 'snapshot' });
    const { enrichMonitoringForSnapshot } = await import('../lib/monitoring/enrich-snapshot.ts');
    const monitoringWithEnv = enrichMonitoringForSnapshot(monitoring, {
      env: buildPortalEnvStatus(),
      routing:
        payload.routing as import('../lib/monitoring/enrich-snapshot.ts').MonitoringSnapshotExtras['routing'],
      bunUtils: {
        passed: bunProof.summary?.passed,
        total: bunProof.summary?.total,
        bunVersion: bunProof.bunVersion,
        proofHash: bunProof.proofHash,
        timestamp: bunProof.timestamp,
      },
      registryClient: payload.registryClient as Record<string, unknown> | undefined,
      docsCoverage: payload.docsCoverage as Record<string, unknown> | undefined,
      networking: (payload as Record<string, unknown>).networking as
        Record<string, unknown> | undefined,
    });
    await Bun.write(monitoringPath, `${JSON.stringify(monitoringWithEnv, null, 2)}\n`);

    const dodQueuePath = `${root}/public/registry/dod-queue.json`;
    try {
      const { exportDodQueueSnapshot } = await import('../lib/dod/export-queue-snapshot.ts');
      const dodSnap = exportDodQueueSnapshot();
      await Bun.write(dodQueuePath, `${JSON.stringify(dodSnap, null, 2)}\n`);
      const { bakeJsonEmbed } = await import('../lib/http/portal-embed-bake.ts');
      await bakeJsonEmbed(`${root}/public/portal/dod/index.html`, 'dod-embed', dodSnap);
    } catch (e) {
      console.warn('[ops-snapshot] dod queue export skipped:', e instanceof Error ? e.message : e);
    }

    const portalWeavePath = `${root}/public/registry/portal-weave.json`;
    try {
      const { buildPortalWeavePayload } = await import('../lib/http/portal-weave.ts');
      await Bun.write(
        portalWeavePath,
        `${JSON.stringify(buildPortalWeavePayload(payload.generated), null, 2)}\n`
      );
    } catch (e) {
      console.warn('[ops-snapshot] portal weave skipped:', e instanceof Error ? e.message : e);
    }

    try {
      const { bakeMonitoringPage } = await import('../lib/monitoring/bake-page.ts');
      await bakeMonitoringPage({
        snapshotPath: monitoringPath,
        htmlPath: `${root}/public/monitoring/index.html`,
        opsPath: cfg.outPath,
      });
    } catch (e) {
      console.warn(
        '[ops-snapshot] monitoring page bake skipped:',
        e instanceof Error ? e.message : e
      );
    }

    // 4b. llms.txt / llms-full.txt / portal/*.md static mirror for Pages
    const llmsFiles = await writeLlmsStatic();
    console.log(`  llms mirror: ${llmsFiles.length} files`);

    // 5. Prediction report (HTML + SVG; optional WebView PNG)
    let report: {
      svgPath: string;
      htmlPath: string;
      pngPath?: string;
      points: number;
    } | null = null;
    if (cfg.withReport) {
      try {
        const r = await writePredictionReport(db, {
          outDir: 'public/registry/prediction',
          webview: cfg.withWebView,
        });
        report = {
          svgPath: r.svgPath,
          htmlPath: r.htmlPath,
          pngPath: r.pngPath,
          points: r.points,
        };
      } catch (e) {
        console.error('prediction report skipped:', e instanceof Error ? e.message : e);
      }
    }

    // 6. Composite static registry (fast serve — no DB)
    let staticWritten: string | null = null;
    if (cfg.withStatic) {
      let registryIndex: unknown = {};
      const regFile = Bun.file('public/registry/registry.json');
      if (await regFile.exists()) {
        try {
          registryIndex = await regFile.json();
        } catch {
          registryIndex = {};
        }
      }
      const packages =
        registryIndex &&
        typeof registryIndex === 'object' &&
        registryIndex !== null &&
        'packages' in registryIndex
          ? (registryIndex as { packages: Record<string, unknown> }).packages
          : registryIndex;

      const staticSnapshot = {
        generated: new Date().toISOString(),
        bunVersion: Bun.version,
        schemaVersion: 1,
        packageCount:
          packages && typeof packages === 'object' ? Object.keys(packages as object).length : 0,
        packages,
        monitoring,
        ops: payload,
        /** Top-level MA/NJ board rollup (also under ops.compliance). */
        compliance: payload.compliance,
        bunUtils: {
          proofHash: bunProof.proofHash,
          passed: bunProof.summary?.passed,
          total: bunProof.summary?.total,
          bunVersion: bunProof.bunVersion,
          path: '/registry/@factorywager/bun-utils-test/latest.json',
        },
        routing: payload.routing,
        channelMeta: payload.channelMeta,
        proofTaxonomy: payload.proofTaxonomy,
        telegramHandshake: payload.telegramHandshake,
        seatCapitalDesk: payload.seatCapitalDesk,
      };
      await Bun.write(staticRegistryPath, `${JSON.stringify(staticSnapshot, null, 2)}\n`);
      staticWritten = staticRegistryPath;
    }

    const summary = {
      out: cfg.outPath,
      monitoring: monitoringPath,
      static: staticWritten,
      generated: payload.generated,
      experiments: payload.experiments.active,
      predictionN: payload.prediction.coverage.n,
      growth: {
        period: payload.growth.period,
        playsReceived: payload.growth.playsReceived,
        playsPlaced: payload.growth.playsPlaced,
      },
      bunUtils: {
        proofHash: payload.bunUtils.proofHash.slice(0, 16),
        passed: payload.bunUtils.passed,
        total: payload.bunUtils.total,
        bunVersion: payload.bunUtils.bunVersion,
        published: bunPublish,
      },
      registryClient: registryClientSlice?.available
        ? {
            available: true,
            sdkVersion: (registryClientSlice as { sdkVersion?: string }).sdkVersion,
            passed: registryClientSlice.passed,
            total: registryClientSlice.total,
            status: (registryClientSlice as { status?: string }).status,
            proofHash: registryClientSlice.proofHash?.slice(0, 16),
          }
        : { available: false },
      routing: payload.routing.available
        ? {
            available: true,
            passed: payload.routing.passed,
            total: payload.routing.total,
            criticalFailed: payload.routing.criticalFailed,
            errorRate: payload.routing.errorRate,
            p95Ms: payload.routing.p95Ms,
            meanMs: payload.routing.meanMs,
            regressions: payload.routing.regressions,
            proofHash: payload.routing.proofHash.slice(0, 16),
            cached: payload.routing.cached ?? false,
            stale: payload.routing.stale ?? false,
            failedRoutes: (payload.routing.routes || [])
              .filter(r => !r.pass)
              .slice(0, 8)
              .map(r => r.path),
          }
        : { available: false },
      proofTaxonomy: proofTaxonomySummary ?? {
        ok: false,
        contractsOk: 0,
        contracts: 0,
        consistencyOk: 0,
      },
      channelMeta: channelMetaSummary ?? { ok: false, skipped: true },
      dodQueue: monitoring.dodQueue,
      packageCount: monitoring.packageCount,
      liquidity: payload.liquidity.total,
      report,
    };

    jsonOut(summary);
    return summary;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await buildRegistrySnapshot();
}
