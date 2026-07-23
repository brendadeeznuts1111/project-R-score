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
  getRoutingProofCached,
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
  const base = Bun.env.REGISTRY_URL || Bun.env.FACTORY_REGISTRY_URL;
  const key = Bun.env.API_KEY || Bun.env.REGISTRY_API_KEY;
  if (!base || !key) return;

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
  // Prefer explicit opts; then env if non-loopback; else production custom domain.
  // Loopback REGISTRY_URL (serve-public) must not be written into Pages ops-summary.
  const envBase = (Bun.env.REGISTRY_URL || Bun.env.FACTORY_REGISTRY_URL || '').trim();
  const isLoopback =
    /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/i.test(envBase) ||
    /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(envBase);
  const baseUrl =
    opts.baseUrl ||
    (!isLoopback && envBase ? envBase.replace(/\/$/, '') : '') ||
    'https://score.factory-wager.com';

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
      const { proof, cache } = await getRoutingProofCached({
        baseUrl,
        forceRefresh: opts.forceRoutingRefresh,
        writeArtifact: true,
      });
      routingProof = proof;
      routingSlice = routingToOpsSlice(proof, { cache });
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
