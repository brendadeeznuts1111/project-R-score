// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io — Bun.mmap (sync path read)
/**
 * Bake TOC Ops fixture → public/registry/toc-ops.json (+ optional portal embed).
 *
 * @see lib/toc-ops/fixture.ts
 * @see tools/ops-seed-toc.ts
 */
import { buildDemoTocOpsFixture } from './fixture.ts';
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
    confirmedRails: 0,
    openTasks: 0,
    openBottlenecks: 0,
    criticalBottlenecks: 0,
    principalOutstandingTotal: 0,
    throttleOnboarding: false,
    primedDrums: 0,
    playableDrums: 0,
  };
}

export function tocOpsToSummarySlice(snap: TocOpsSnapshot): TocOpsSummarySlice {
  return {
    available: true,
    path: TOC_OPS_REGISTRY_PATH,
    generatedAt: snap.generatedAt,
    partners: snap.summary.partners,
    warmed: snap.summary.warmed,
    warming: snap.summary.warming,
    confirmedRails: snap.summary.confirmedRails,
    openTasks: snap.summary.openTasks,
    openBottlenecks: snap.summary.openBottlenecks,
    criticalBottlenecks: snap.summary.criticalBottlenecks,
    principalOutstandingTotal: snap.summary.principalOutstandingTotal,
    throttleOnboarding: snap.buffer.throttleOnboarding,
    primedDrums: snap.buffer.primedDrums,
    playableDrums: snap.buffer.playableDrums,
  };
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
}): Promise<ExportTocOpsSnapshotResult> {
  const root = opts?.root ?? process.cwd();
  const snap = opts?.fixture ?? buildDemoTocOpsFixture();
  const outPath = tocOpsAbsPath(root);
  await Bun.write(outPath, `${JSON.stringify(snap, null, 2)}\n`);

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
