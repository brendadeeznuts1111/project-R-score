// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Seed / bake TOC Ops portal fixture (partners · rails · WARMED · Soft · Gate 12).
 *
 * Fixture-first (Pages-safe): writes `public/registry/toc-ops.json`.
 * When ops DB is available, binds ASH/PAT/NOV → tree_nodes / rails / sb_accounts,
 * seeds append-only toc_soft_entries, and enqueues topic=`toc` outbox events
 * (metrics bake · critical gates · ranked actions).
 *
 * @see tools/ops-seed-toc.ts
 * @see lib/toc-ops/fixture.ts
 * @see lib/operations/toc-identity-bridge.ts
 * @see lib/channels/toc-outbox.ts
 * @see lib/toc-ops/return-efficiency.ts
 * @see lib/toc-ops/enforcement.ts
 */
import { enqueueTocBakeChannelEvents } from '../channels/toc-outbox.ts';
import { buildDemoTocOpsFixture } from '../toc-ops/fixture.ts';
import {
  exportTocOpsSnapshot,
  loadTocOpsSnapshotSync,
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
  /** Enqueue topic=`toc` channel events after bake (default when DB open). */
  enqueueChannels?: boolean;
};

export type SeedTocOpsDemoResult = {
  seeded: boolean;
  reason?: string;
  identityLinked?: boolean;
  identityPartners?: number;
  softInserted?: number;
  channelEnqueued?: number;
  enforcementFailed?: number;
  enforcementFocus?: string;
  topRankedProcess?: string;
  avgRP?: number;
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
  let channelEnqueued = 0;
  let ownedDb: Database | null = null;
  let db: Database | null = null;

  try {
    const needsDb =
      opts.linkIdentity !== false || opts.seedSoft !== false || opts.enqueueChannels !== false;
    if (needsDb) {
      db = opts.db ?? openOperationsDb({ path: opts.dbPath ?? DEFAULT_OPS_DB_PATH });
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
    // Ops DB optional — still bake fixture without links / Soft / channels
    fixture = { ...fixture, plane: 'demo-readonly' };
    db = null;
    void e;
  }

  const exported = await exportTocOpsSnapshot({ root, fixture, bakeEmbed: true });
  const baked = loadTocOpsSnapshotSync(root);

  try {
    if (db && baked && opts.enqueueChannels !== false) {
      channelEnqueued = enqueueTocBakeChannelEvents(db, baked).enqueued;
    }
  } catch {
    // Channel enqueue best-effort — fixture bake already succeeded
  } finally {
    ownedDb?.close();
  }

  return {
    seeded: true,
    identityLinked,
    identityPartners,
    softInserted,
    channelEnqueued,
    enforcementFailed: baked?.enforcement?.failed,
    enforcementFocus: baked?.enforcement?.diagnosis.focus,
    topRankedProcess: baked?.rankedActions?.[0]?.process,
    avgRP: baked?.returnEfficiency?.avgRP,
    ...exported,
  };
}
