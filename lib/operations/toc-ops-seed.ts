// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Seed / bake TOC Ops portal fixture (partners · rails · WARMED · Soft · Gate 12).
 *
 * Fixture-first (Pages-safe): writes `public/registry/toc-ops.json`.
 * When ops DB is available, binds ASH/PAT/NOV → tree_nodes / rails / sb_accounts
 * and seeds append-only toc_soft_entries. Always bakes operate-lite enforcement.
 *
 * @see tools/ops-seed-toc.ts
 * @see lib/toc-ops/fixture.ts
 * @see lib/operations/toc-identity-bridge.ts
 * @see lib/toc-ops/enforcement.ts
 */
import { withTocEnforcement } from '../toc-ops/enforcement.ts';
import { buildDemoTocOpsFixture } from '../toc-ops/fixture.ts';
import {
  exportTocOpsSnapshot,
  TOC_OPS_REGISTRY_REL,
  type ExportTocOpsSnapshotResult,
} from '../toc-ops/export-snapshot.ts';
import { enrichTocFixtureWithIdentity } from './toc-identity-bridge.ts';
import { seedTocSoftFromFixture } from './toc-soft-balance.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from './db.ts';
import type { Database } from 'bun:sqlite';

export type SeedTocOpsDemoOpts = {
  root?: string;
  force?: boolean;
  /** Skip write when toc-ops.json already exists (default true). */
  ifEmpty?: boolean;
  db?: Database;
  dbPath?: string;
  /** Bind TOC codes into ops SQLite (default true when DB opens). */
  linkIdentity?: boolean;
  /** Seed append-only toc_soft_entries from fixture Soft rows (default with identity). */
  seedSoft?: boolean;
};

export type SeedTocOpsDemoResult = {
  seeded: boolean;
  reason?: string;
  identityLinked?: boolean;
  identityPartners?: number;
  softInserted?: number;
  enforcementFailed?: number;
  enforcementFocus?: string;
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

  let fixture = buildDemoTocOpsFixture();
  let identityLinked = false;
  let identityPartners = 0;
  let softInserted = 0;
  let ownedDb: Database | null = null;

  try {
    if (opts.linkIdentity !== false || opts.seedSoft !== false) {
      const db = opts.db ?? openOperationsDb({ path: opts.dbPath ?? DEFAULT_OPS_DB_PATH });
      if (!opts.db) ownedDb = db;
      if (opts.linkIdentity !== false) {
        fixture = enrichTocFixtureWithIdentity(db, fixture, {
          seed: true,
          force: opts.force,
        });
        identityLinked = fixture.identity?.linked ?? false;
        identityPartners = fixture.identity?.linkedPartners ?? 0;
      }
      if (opts.seedSoft !== false) {
        softInserted = seedTocSoftFromFixture(db, fixture, { force: opts.force }).inserted;
      }
    }
  } catch (e) {
    // Ops DB optional — still bake fixture without links / Soft journal
    fixture = { ...fixture, plane: 'demo-readonly' };
    void e;
  } finally {
    ownedDb?.close();
  }

  fixture = withTocEnforcement(fixture);
  const exported = await exportTocOpsSnapshot({ root, fixture, bakeEmbed: true });
  return {
    seeded: true,
    identityLinked,
    identityPartners,
    softInserted,
    enforcementFailed: fixture.enforcement?.failed,
    enforcementFocus: fixture.enforcement?.diagnosis.focus,
    ...exported,
  };
}
