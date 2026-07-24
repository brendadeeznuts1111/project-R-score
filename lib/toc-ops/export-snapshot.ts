// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io — Bun.mmap (sync path read)
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Bake TOC Ops fixture → public/registry/toc-ops.json (+ optional portal embed).
 *
 * @see lib/toc-ops/fixture.ts
 * @see tools/ops-seed-toc.ts
 */
import { withTocEnforcement } from './enforcement.ts';
import { buildDemoTocOpsFixture } from './fixture.ts';
import { getTioeSnapshot } from './return-efficiency.ts';
import type { TocOpsSnapshot, TocOpsSummarySlice } from './types.ts';

export const TOC_OPS_REGISTRY_REL = 'public/registry/toc-ops.json';
export const TOC_OPS_REGISTRY_PATH = '/registry/toc-ops.json' as const;

function tocOpsAbsPath(root = process.cwd()): string {
  return root.endsWith('/') ? `${root}${TOC_OPS_REGISTRY_REL}` : `${root}/${TOC_OPS_REGISTRY_REL}`;
}

export function emptyTocOpsSummarySlice(): TocOpsSummarySlice {
  return {
    available: false,
    path: TOC_OPS_REGISTRY_PATH,
    generatedAt: null,
    partners: 0,
    warmed: 0,
    warming: 0,
    onboarding: 0,
    confirmedRails: 0,
    openTasks: 0,
    openOnb: 0,
    openLimit: 0,
    openBottlenecks: 0,
    criticalBottlenecks: 0,
    principalOutstandingTotal: 0,
    throttleOnboarding: false,
    primedDrums: 0,
    playableDrums: 0,
    playsPending: 0,
    playsSettled: 0,
    activeExperiments: 0,
    plane: 'demo-readonly',
    identityLinked: false,
    identityPartners: 0,
    enforcementFocus: null,
    enforcementFailed: 0,
    enforcementCritical: 0,
    throughputT: null,
    throughputI: null,
    throughputOE: null,
    topRankedProcess: null,
    avgRP: null,
    settlementFloatRatio: null,
  };
}

export function tocOpsToSummarySlice(snap: TocOpsSnapshot): TocOpsSummarySlice {
  const enf = snap.enforcement;
  const top = snap.rankedActions?.[0];
  return {
    available: true,
    path: TOC_OPS_REGISTRY_PATH,
    generatedAt: snap.generatedAt,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    warming: snap.summary.warming,
    onboarding: snap.summary.onboarding,
    confirmedRails: snap.summary.confirmedRails,
    openTasks: snap.summary.openTasks,
    openOnb: snap.summary.openOnb,
    openLimit: snap.summary.openLimit,
    openBottlenecks: snap.summary.openBottlenecks,
    criticalBottlenecks: snap.summary.criticalBottlenecks,
    principalOutstandingTotal: snap.summary.principalOutstandingTotal,
    throttleOnboarding: snap.buffer.throttleOnboarding,
    primedDrums: snap.buffer.primedDrums,
    playableDrums: snap.buffer.playableDrums,
    playsPending: snap.summary.playsPending,
    playsSettled: snap.summary.playsSettled,
    activeExperiments: snap.summary.activeExperiments,
    plane: 'demo-readonly',
    identityLinked: snap.identity?.linked ?? false,
    identityPartners: snap.identity?.linkedPartners ?? 0,
    enforcementFocus: enf?.diagnosis.focus ?? null,
    enforcementFailed: enf?.failed ?? 0,
    enforcementCritical: enf?.criticalFailed ?? 0,
    throughputT: enf?.throughput.T ?? null,
    throughputI: enf?.throughput.I ?? null,
    throughputOE: enf?.throughput.OE ?? null,
    topRankedProcess: top?.process ?? null,
    avgRP: snap.returnEfficiency?.avgRP ?? null,
    settlementFloatRatio: snap.buffer.settlementFloatRatio ?? null,
  };
}

/** Apply return-efficiency metrics then operate-lite enforcement. */
export function withTocMetrics(snap: TocOpsSnapshot): TocOpsSnapshot {
  const now = Date.parse(snap.generatedAt);
  const tioe = getTioeSnapshot(snap, Number.isFinite(now) ? now : Date.now());
  const enriched: TocOpsSnapshot = {
    ...snap,
    catalog: {
      ...snap.catalog,
      returnEfficiency: {
        ...snap.catalog.returnEfficiency,
        daysCover: snap.catalog.returnEfficiency?.daysCover ?? 14,
        staticFloatFloor: snap.catalog.returnEfficiency?.staticFloatFloor ?? 50_000,
        settlementThrottleRatio: snap.catalog.returnEfficiency?.settlementThrottleRatio ?? 0.6,
        tVelocityWindowDays: snap.catalog.returnEfficiency?.tVelocityWindowDays ?? 30,
        defaultExpectedPlayT: snap.catalog.returnEfficiency?.defaultExpectedPlayT ?? 840,
        // WD (Gate 12 principal) before profit PLAY
        processRank:
          snap.catalog.returnEfficiency?.processRank ??
          (['LIMIT', 'ONB', 'WD', 'PLAY', 'WARM', 'FUND'] as const),
      },
    },
    buffer: tioe.buffer,
    partners: tioe.partners,
    returnEfficiency: tioe.returnEfficiency,
    rankedActions: tioe.rankedActions,
  };
  return withTocEnforcement(enriched);
}

export function loadTocOpsSnapshotSync(root = process.cwd()): TocOpsSnapshot | null {
  const path = tocOpsAbsPath(root);
  try {
    const file = Bun.file(path);
    if (file.size === 0) return null;
    const mapped = Bun.mmap(path);
    return JSON.parse(new TextDecoder().decode(mapped)) as TocOpsSnapshot;
  } catch {
    return null;
  }
}

/** Prefer filesystem snapshot; else build demo in-memory. */
export function resolveTocOpsSnapshot(root = process.cwd()): TocOpsSnapshot {
  return loadTocOpsSnapshotSync(root) ?? buildDemoTocOpsFixture();
}

export function loadTocOpsSummarySlice(root = process.cwd()): TocOpsSummarySlice {
  const snap = loadTocOpsSnapshotSync(root);
  return snap ? tocOpsToSummarySlice(snap) : emptyTocOpsSummarySlice();
}

export type ExportTocOpsSnapshotResult = {
  path: string;
  partners: number;
  warmed: number;
  openTasks: number;
  openBottlenecks: number;
  generatedAt: string;
};

export async function exportTocOpsSnapshot(opts?: {
  root?: string;
  fixture?: TocOpsSnapshot;
  bakeEmbed?: boolean;
  /** Re-evaluate operate-lite gates (default true). */
  enforce?: boolean;
}): Promise<ExportTocOpsSnapshotResult> {
  const root = opts?.root ?? process.cwd();
  const base = opts?.fixture ?? buildDemoTocOpsFixture();
  const snap = opts?.enforce === false ? base : withTocMetrics(base);
  const outPath = tocOpsAbsPath(root);
  await Bun.write(outPath, `${JSON.stringify(snap, null, 2)}\n`);

  try {
    const { writeTocOpsBakeProof } = await import('./bake-proof.ts');
    await writeTocOpsBakeProof(snap, root);
  } catch {
    // Proof write is best-effort during first bake
  }

  if (opts?.bakeEmbed !== false) {
    try {
      const { bakeJsonEmbed } = await import('../http/portal-embed-bake.ts');
      const htmlPath = root.endsWith('/')
        ? `${root}public/portal/toc/index.html`
        : `${root}/public/portal/toc/index.html`;
      await bakeJsonEmbed(htmlPath, 'toc-embed', snap);
    } catch {
      // Portal page may not exist yet during first bake
    }
  }

  return {
    path: outPath,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    openTasks: snap.summary.openTasks,
    openBottlenecks: snap.summary.openBottlenecks,
    generatedAt: snap.generatedAt,
  };
}
