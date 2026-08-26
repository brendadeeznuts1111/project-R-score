// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * Production registry snapshot orchestrator — routing proof (retry+cache),
 * ops summary, monitoring, bun utils proof, prediction report, static aggregate.
 *
 * @see tools/build-registry-snapshot.ts
 * @see tools/ops-snapshot.ts
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from './operations/db.ts';
import { buildOpsSummary, type OpsSummaryPayload } from './operations/ops-summary.ts';
import { buildBunUtilsProof, type BunUtilsProofResult } from './bun-utils-proof.ts';
import { collectMonitoring, type MonitoringPayload } from './monitoring/index.ts';
import { writePredictionReport } from './prediction/index.ts';
import {
  getRoutingProof,
  resolveRoutingProbeBaseUrl,
  routingToOpsSlice,
  type RoutingOpsSlice,
  type RoutingProofResult,
} from './routing-proof.ts';
import { sha256Hex, canonicalJson } from './bun-utils-proof.ts';
import {
  resolveSnapshotPhase,
  tagsForPhase,
  writeTaggedProofArtifact,
  type SnapshotPhase,
} from './registry-tags.ts';
import { factoryWagerLocalRegistryWriteUrlFromEnv } from '../config/r2-env.ts';

export const STATIC_REGISTRY_PATH = Bun.env.STATIC_REGISTRY_PATH || 'public/registry/static.json';

export type BuildRegistrySnapshotOpts = {
  withRouting?: boolean;
  withReport?: boolean;
  withWebView?: boolean;
  withStaticRegistry?: boolean;
  forceRoutingRefresh?: boolean;
  /** pre = canary before deploy; post = verified after deploy. Default env SNAPSHOT_PHASE or pre. */
  phase?: SnapshotPhase;
  pinStable?: boolean;
  dbPath?: string;
  outPath?: string;
  monitoringPath?: string;
  baseUrl?: string;
};

export type RegistrySnapshotSummary = {
  out: string;
  monitoring: string;
  staticRegistry?: string;
  phase: SnapshotPhase;
  generated: string;
  experiments: number;
  predictionN: number;
  growth: { period: string; playsReceived: number; playsPlaced: number };
  bunUtils: {
    proofHash: string;
    passed: number;
    total: number;
    bunVersion: string;
    phase?: SnapshotPhase;
    version?: string;
  };
  routing: Record<string, unknown>;
  dodQueue: number;
  packageCount: number;
  liquidity: number;
  report: { points: number; svgPath?: string; htmlPath?: string } | null;
  proofHash: string;
};

export type StaticRegistrySnapshot = {
  schemaVersion: 1;
  generated: string;
  bunVersion: string;
  bunRevision: string;
  packageCount: number;
  packages: unknown;
  monitoring: MonitoringPayload | null;
  ops: OpsSummaryPayload | null;
  bunUtils: BunUtilsProofResult | null;
  routing: RoutingOpsSlice | null;
  proofHash: string;
};

async function maybePublishArtifact(
  packageName: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- JSON wire artifact
  body: unknown,
  metadata: Record<string, unknown>,
  opts: { version: string; tags: string[] }
): Promise<void> {
  const configuredBase = Bun.env.FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL?.trim();
  const key = Bun.env.FACTORY_WAGER_LOCAL_REGISTRY_TOKEN?.trim();
  if (!configuredBase || !key) return;
  const base = factoryWagerLocalRegistryWriteUrlFromEnv();

  try {
    const { jsonFile } = await import('./http/content-type.ts');
    const form = new FormData();
    // Bun sets multipart Content-Type + boundary — never set Content-Type on this fetch
    form.append('file', jsonFile(body, 'artifact.json'));
    form.append('version', opts.version);
    form.append('tags', opts.tags.join(','));
    form.append('metadata', JSON.stringify(metadata));
    const res = await fetch(`${base.replace(/\/$/, '')}/api/registry/${packageName}/versions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      console.warn(`[publish ${packageName}] ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.warn(`[publish ${packageName}]`, e instanceof Error ? e.message : e);
  }
}

/**
 * Full self-healing snapshot pipeline used by ops:snapshot / build-registry-snapshot.
 */
export async function buildRegistrySnapshot(
  opts: BuildRegistrySnapshotOpts = {}
): Promise<RegistrySnapshotSummary> {
  const withRouting = opts.withRouting !== false;
  const withReport = opts.withReport !== false;
  const withWebView = Boolean(opts.withWebView);
  const withStaticRegistry = opts.withStaticRegistry !== false;
  const phase = opts.phase ?? resolveSnapshotPhase();
  const pinStable = Boolean(opts.pinStable);

  const dbPath = opts.dbPath || Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
  const outPath = opts.outPath || Bun.env.OPS_SNAPSHOT_PATH || 'public/registry/ops-summary.json';
  const monitoringPath =
    opts.monitoringPath || Bun.env.MONITORING_SNAPSHOT_PATH || 'public/registry/monitoring.json';
  const baseUrl = resolveRoutingProbeBaseUrl(opts.baseUrl);

  // Ensure parent dirs
  for (const p of [outPath, monitoringPath, STATIC_REGISTRY_PATH]) {
    const parent = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '.';
    if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
  }
  if (dbPath !== ':memory:') {
    const parent = dbPath.includes('/') ? dbPath.slice(0, dbPath.lastIndexOf('/')) : '.';
    if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
  }

  const db = openOperationsDb({ path: dbPath });

  let routingSlice: RoutingOpsSlice | null = null;
  let routingProof: RoutingProofResult | null = null;
  try {
    if (withRouting) {
      const routed = await getRoutingProof({
        baseUrl,
        forceRefresh: opts.forceRoutingRefresh,
        writeArtifact: true,
      });
      if (routed) {
        routingProof = routed.proof;
        routingSlice = routingToOpsSlice(routed.proof, {
          cached: routed.cached,
          stale: routed.stale,
        });
      }
    }
  } catch (e) {
    console.error('Routing proof failed:', e instanceof Error ? e.message : e);
  }

  try {
    const payload = buildOpsSummary(db, 'snapshot');
    if (routingSlice) payload.routing = routingSlice;

    await Bun.write(outPath, `${JSON.stringify(payload, null, 2)}\n`);

    // Bun utils proof → tagged artifact (pre/post/latest)
    const bunProof = buildBunUtilsProof();
    const bunTagged = await writeTaggedProofArtifact('@factorywager/bun-utils-test', bunProof, {
      phase,
      proofHash: bunProof.proofHash,
      pinStable,
    });
    const phaseTags = tagsForPhase(phase, { pinStable });
    await maybePublishArtifact(
      '@factorywager/bun-utils-test',
      bunProof,
      {
        proofHash: bunProof.proofHash,
        passed: bunProof.summary.passed,
        total: bunProof.summary.total,
        bunVersion: bunProof.bunVersion,
        phase,
      },
      { version: bunTagged.version, tags: phaseTags }
    );
    if (routingProof) {
      const routeTagged = await writeTaggedProofArtifact(
        '@factorywager/routing-test',
        routingProof,
        { phase, proofHash: routingProof.proofHash, pinStable }
      );
      await maybePublishArtifact(
        '@factorywager/routing-test',
        routingProof,
        {
          proofHash: routingProof.proofHash,
          passed: routingProof.summary.passed,
          total: routingProof.summary.total,
          criticalFailed: routingProof.summary.criticalFailed,
          phase,
        },
        { version: routeTagged.version, tags: phaseTags }
      );
    }

    const monitoring = await collectMonitoring(db, { source: 'snapshot' });
    await Bun.write(monitoringPath, `${JSON.stringify(monitoring, null, 2)}\n`);

    let report: RegistrySnapshotSummary['report'] = null;
    if (withReport) {
      try {
        const r = await writePredictionReport(db, {
          outDir: 'public/registry/prediction',
          webview: withWebView,
        });
        report = {
          points: r.points,
          svgPath: r.svgPath,
          htmlPath: r.htmlPath,
          ...(r.pngPath ? { pngPath: r.pngPath } : {}),
        } as RegistrySnapshotSummary['report'];
      } catch (e) {
        console.error('Prediction report generation failed:', e);
      }
    }

    let staticPath: string | undefined;
    if (withStaticRegistry) {
      let packages: unknown = {};
      try {
        const registryFile = Bun.file('public/registry/registry.json');
        if (await registryFile.exists()) {
          const reg = (await registryFile.json()) as { packages?: unknown };
          packages = reg.packages ?? reg;
        }
      } catch {
        /* empty packages */
      }

      const staticBody: Omit<StaticRegistrySnapshot, 'proofHash'> = {
        schemaVersion: 1,
        generated: new Date().toISOString(),
        bunVersion: Bun.version,
        bunRevision: Bun.revision || 'unknown',
        packageCount:
          packages && typeof packages === 'object' ? Object.keys(packages as object).length : 0,
        packages,
        monitoring,
        ops: payload,
        bunUtils: bunProof,
        routing: routingSlice,
      };
      const proofHash = sha256Hex(canonicalJson(staticBody));
      const staticSnapshot: StaticRegistrySnapshot = { ...staticBody, proofHash };
      await Bun.write(STATIC_REGISTRY_PATH, `${JSON.stringify(staticSnapshot, null, 2)}\n`);
      await writeTaggedProofArtifact('@factorywager/registry-snapshot', staticSnapshot, {
        phase,
        proofHash,
        pinStable,
      });
      staticPath = STATIC_REGISTRY_PATH;
    }

    const summary: RegistrySnapshotSummary = {
      out: outPath,
      monitoring: monitoringPath,
      staticRegistry: staticPath,
      phase,
      generated: payload.generated,
      experiments: payload.experiments.active,
      predictionN: payload.prediction.coverage.n,
      growth: {
        period: payload.growth.period,
        playsReceived: payload.growth.playsReceived,
        playsPlaced: payload.growth.playsPlaced,
      },
      bunUtils: {
        proofHash: (bunProof.proofHash ?? '').slice(0, 16),
        passed: bunProof.summary.passed,
        total: bunProof.summary.total,
        bunVersion: bunProof.bunVersion,
        phase,
        version: bunTagged.version,
      },
      routing: payload.routing.available
        ? {
            available: true,
            passed: payload.routing.passed,
            total: payload.routing.total,
            criticalFailed: payload.routing.criticalFailed,
            p95Ms: payload.routing.p95Ms,
            errorRate: payload.routing.errorRate,
            regressions: payload.routing.regressions,
            cache: payload.routing.cache ?? (routingSlice ? routingSlice.cache : undefined),
            proofHash: payload.routing.proofHash.slice(0, 16),
            routes: payload.routing.routes?.length ?? 0,
          }
        : { available: false },
      dodQueue: monitoring.dodQueue ?? 0,
      packageCount: monitoring.packageCount ?? 0,
      liquidity: payload.liquidity.total,
      report: report
        ? { points: report.points, svgPath: report.svgPath, htmlPath: report.htmlPath }
        : null,
      proofHash: sha256Hex(
        canonicalJson({
          generated: payload.generated,
          bunUtils: bunProof.proofHash,
          routing: routingSlice?.proofHash,
          monitoring: monitoring.timestamp,
        })
      ),
    };

    return summary;
  } finally {
    db.close();
  }
}
