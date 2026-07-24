#!/usr/bin/env bun
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
 *
 * Writes (SSOT paths):
 *   public/registry/ops-summary.json
 *   public/registry/proof-taxonomy-audit.json
 *   public/registry/monitoring.json
 *   public/registry/static.json          — composite fast snapshot
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
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { resolvePath } from '../lib/path-bun.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
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

const argv = Bun.argv.slice(2);
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

export async function buildRegistrySnapshot(options?: {
  withRouting?: boolean;
  withReport?: boolean;
  withWebView?: boolean;
  withStatic?: boolean;
  forceRouting?: boolean;
  publish?: boolean;
  withChannelMeta?: boolean;
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
    outPath: options?.outPath ?? outPath,
    dbPath: options?.dbPath ?? dbPath,
  };

  if (cfg.dbPath !== ':memory:') await ensureParent(cfg.dbPath);
  await ensureParent(cfg.outPath);
  await ensureParent(monitoringPath);
  if (cfg.withStatic) await ensureParent(staticRegistryPath);

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
      const { buildSkillsCatalog } = await import('../lib/http/skills-catalog.ts');
      const skillsCatalog = await buildSkillsCatalog();
      await Bun.write(
        `${root}/public/registry/skills-catalog.json`,
        `${JSON.stringify(skillsCatalog, null, 2)}\n`
      );
    } catch (e) {
      console.warn('[ops-snapshot] skills catalog skipped:', e instanceof Error ? e.message : e);
    }

    // 2. Ops summary (embeds disk routing / taxonomy / channel-meta slices)
    const payload = buildOpsSummary(db, 'snapshot');
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
      | { available?: boolean; passed?: number; total?: number; proofHash?: string }
      | undefined;

    // 4. Monitoring snapshot (+ env status — edge /api/env reads monitoring.env)
    const monitoring = await collectMonitoring(db, { source: 'snapshot' });
    const monitoringWithEnv = {
      ...monitoring,
      env: buildPortalEnvStatus(),
    };
    await Bun.write(monitoringPath, `${JSON.stringify(monitoringWithEnv, null, 2)}\n`);

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

    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await buildRegistrySnapshot();
}
