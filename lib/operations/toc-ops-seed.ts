// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Seed / bake TOC Ops portal fixture (partners · rails · WARMED · Soft · Gate 12).
 *
 * Fixture-first (Pages-safe): writes `public/registry/toc-ops.json`.
 * Does not require toc-ops-repo SQLite. Theory SSOT remains in toc-ops-repo.
 *
 * @see tools/ops-seed-toc.ts
 * @see lib/toc-ops/fixture.ts
 */
import { buildDemoTocOpsFixture } from '../toc-ops/fixture.ts';
import {
  exportTocOpsSnapshot,
  TOC_OPS_REGISTRY_REL,
  type ExportTocOpsSnapshotResult,
} from '../toc-ops/export-snapshot.ts';

export type SeedTocOpsDemoOpts = {
  root?: string;
  force?: boolean;
  /** Skip write when toc-ops.json already exists (default true). */
  ifEmpty?: boolean;
};

export type SeedTocOpsDemoResult = {
  seeded: boolean;
  reason?: string;
} & Partial<ExportTocOpsSnapshotResult>;

export function isTocOpsSnapshotMissing(root = process.cwd()): boolean {
  const path = root.endsWith('/')
    ? `${root}${TOC_OPS_REGISTRY_REL}`
    : `${root}/${TOC_OPS_REGISTRY_REL}`;
  try {
    return Bun.file(path).size === 0;
  } catch {
    return true;
  }
}

export async function seedTocOpsDemo(opts: SeedTocOpsDemoOpts = {}): Promise<SeedTocOpsDemoResult> {
  const root = opts.root ?? process.cwd();
  const ifEmpty = opts.ifEmpty ?? true;

  if (!opts.force && ifEmpty && !isTocOpsSnapshotMissing(root)) {
    return {
      seeded: false,
      reason: 'toc-ops.json already present (use --force to rebuild)',
    };
  }

  const fixture = buildDemoTocOpsFixture();
  const exported = await exportTocOpsSnapshot({ root, fixture, bakeEmbed: true });
  return { seeded: true, ...exported };
}
