#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Seed a full account-dossier demo (ASH tree + optional limit-demo) and bake.
 *
 * Usage:
 *   bun tools/seed-account-dossier.ts --force --bake
 *   bun tools/seed-account-dossier.ts --db=data/account-dossier-test.db --force --bake --include-limit-demo
 *   bun run ops:dossier:seed
 *   bun run ops:dossier:seed:test-db
 *
 * Test DB is a disposable SQLite file for local dossier work — it does not
 * replace production data/operations.db unless you omit --db.
 */
import { basenamePath, dirnamePath } from '../lib/path-bun.ts';
import { ensureDir } from '../scripts/lib/fs-bun.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { seedAccountDossierDemo } from '../lib/operations/account-dossier-seed.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';

function basenameNoExt(path: string): string {
  const base = basenamePath(path);
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(0, i) : base;
}

const force = Bun.argv.includes('--force');
const bake = Bun.argv.includes('--bake') || !Bun.argv.includes('--no-bake');
const includeLimitDemo = Bun.argv.includes('--include-limit-demo');
const refreshOpsSummary = Bun.argv.includes('--ops-summary') || bake;
const dbArg = Bun.argv.find(a => a.startsWith('--db='))?.slice('--db='.length);
const lookbackArg = Bun.argv.find(a => a.startsWith('--hours='))?.slice('--hours='.length);
const bakePathArg = Bun.argv.find(a => a.startsWith('--bake-path='))?.slice('--bake-path='.length);
const lookbackHours = lookbackArg ? Number(lookbackArg) : 168;

const dbPath = dbArg?.trim() || DEFAULT_OPS_DB_PATH;
const isDefaultDb = !dbArg?.trim() || dbPath === DEFAULT_OPS_DB_PATH;
if (dbPath !== ':memory:') {
  await ensureDir(dirnamePath(dbPath));
}

/** Non-default DBs must not clobber production registry unless --bake-path is set. */
const bakePath =
  bakePathArg?.trim() ||
  (isDefaultDb ? undefined : `${dirnamePath(dbPath)}/${basenameNoExt(dbPath)}-limit-raises.json`);

const db = openOperationsDb({ path: dbPath });
let exitCode = 0;

try {
  if (bake && bakePath) {
    await ensureDir(dirnamePath(bakePath));
  }
  const result = await seedAccountDossierDemo(db, {
    force,
    bake,
    includeLimitDemo,
    lookbackHours: Number.isFinite(lookbackHours) ? lookbackHours : 168,
    bakePath,
    root: process.cwd(),
  });

  let opsSummaryPath: string | null = null;
  if (refreshOpsSummary && isDefaultDb) {
    // Only rewrite production ops-summary when seeding the default ops DB.
    const summary = buildOpsSummary(db);
    opsSummaryPath = 'public/registry/ops-summary.json';
    await Bun.write(opsSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  }

  console.log(
    JSON.stringify(
      {
        dbPath,
        force,
        lookbackHours: result.baked?.lookbackHours ?? lookbackHours,
        toc: {
          source: result.toc.source,
          nodes: result.toc.nodes.map(n => ({
            role: n.role,
            callSign: n.callSign,
            nodeId: n.nodeId,
            seeded: n.seeded,
            raises: n.raises,
          })),
          raises: result.toc.raises,
        },
        compliance: result.compliance,
        limitDemo: result.limitDemo
          ? {
              seeded: result.limitDemo.seeded,
              nodes: result.limitDemo.nodes,
              raises: result.limitDemo.raises,
            }
          : null,
        baked: result.baked,
        opsSummaryPath,
        open: result.toc.nodes[0]
          ? `/portal/account/?account=${encodeURIComponent(result.toc.nodes[0]!.nodeId)}&hours=${lookbackHours}`
          : '/portal/account/?partner=ASH',
      },
      null,
      2
    )
  );
} catch (err) {
  exitCode = 1;
  console.error(err instanceof Error ? err.message : String(err));
} finally {
  try {
    db.close();
  } catch {
    // ignore close races when WAL checkpoint is busy
  }
  // bun:sqlite can keep the event loop alive after WAL write; exit explicitly.
  process.exit(exitCode);
}
