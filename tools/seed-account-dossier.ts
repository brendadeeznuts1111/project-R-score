#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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
import {
  DOSSIER_ASH_PARTNER_ID,
  seedAccountDossierDemo,
} from '../lib/operations/account-dossier-seed.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { buildAccountDossier } from '../public/portal/account/account-dossier.js';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:dossier:seed', Bun.argv.slice(2))
  : Bun.argv.slice(2);
async function dossierCompleteness(
  accountId: string, // brand-ok — TreeNodeId wire for CLI summary
  bakePath: string | undefined,
  hours: number
) {
  if (!bakePath || !(await Bun.file(bakePath).exists())) return null;
  const limitRaises = await Bun.file(bakePath).json();
  const partnersDashboard = (await Bun.file('public/registry/partners-dashboard.json').exists())
    ? await Bun.file('public/registry/partners-dashboard.json').json()
    : null;
  const partnersOps = (await Bun.file('public/registry/partners-ops.json').exists())
    ? await Bun.file('public/registry/partners-ops.json').json()
    : null;
  const d = buildAccountDossier({
    accountId,
    limitRaises,
    partnersDashboard,
    partnersOps,
    hours,
  });
  const locationOk = Boolean(d.location.state && d.location.city && d.location.zip);
  const licenseOk = Boolean(d.licenseStatus);
  const monitoringOk = d.monitoringStatus != null && d.monitoringStatus !== 'incomplete';
  return {
    accountId,
    partnerCode: d.partnerCode,
    callSign: d.callSign,
    locationOk,
    licenseOk,
    monitoringOk,
    outs: d.outs.length,
    connected: d.connected.length,
    raises: d.raiseCount,
    policies: d.policies.length,
    cities: [...new Set(d.connected.map(row => row.location).filter(Boolean))],
    complete:
      locationOk &&
      licenseOk &&
      monitoringOk &&
      d.outs.length > 0 &&
      d.connected.length > 1 &&
      d.raiseCount > 0 &&
      d.policies.length > 0 &&
      d.partnerCode != null,
  };
}

function basenameNoExt(path: string): string {
  const base = basenamePath(path);
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(0, i) : base;
}

const force = argv.includes('--force');
const bake = argv.includes('--bake') || !argv.includes('--no-bake');
const includeLimitDemo = argv.includes('--include-limit-demo');
const refreshOpsSummary = argv.includes('--ops-summary') || bake;
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

  const primaryId = result.toc.nodes[0]?.nodeId ?? DOSSIER_ASH_PARTNER_ID;
  const resolvedBakePath = result.baked?.path ?? bakePath;
  const completeness = await dossierCompleteness(primaryId, resolvedBakePath, lookbackHours);

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
        completeness,
        open: `/portal/account/?account=${encodeURIComponent(primaryId)}&hours=${lookbackHours}`,
      },
      null,
      2
    )
  );
  if (completeness && !completeness.complete) {
    exitCode = 1;
    console.error('dossier completeness incomplete — re-run with --force --bake');
  }
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
