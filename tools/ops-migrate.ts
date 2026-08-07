#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * One-shot migration: merge legacy data/accounts-*.db tree into data/operations.db SSOT.
 *
 * Usage: bun tools/ops-migrate.ts [--dry-run] [--legacy=data/accounts-operations.db]
 */
import { Database } from 'bun:sqlite';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';

const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:migrate', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const dryRun = args.includes('--dry-run');
const legacyFlag = args.find(a => a.startsWith('--legacy='))?.slice('--legacy='.length);
const legacyPath = legacyFlag ?? 'data/accounts-operations.db';

function tableExists(db: Database, name: string): boolean {
  const row = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name = $n")
    .get({ $n: name }) as { name: string } | null;
  return Boolean(row);
}

async function main(): Promise<void> {
  const legacyFile = Bun.file(legacyPath);
  if (!(await legacyFile.exists())) {
    console.log(`No legacy DB at ${legacyPath} — nothing to migrate`);
    process.exit(0);
  }

  const target = openOperationsDb({ path: DEFAULT_OPS_DB_PATH });
  const legacy = new Database(legacyPath, { readonly: true });

  if (!tableExists(legacy, 'tree_nodes')) {
    console.log('Legacy DB has no tree_nodes table');
    legacy.close();
    target.close();
    process.exit(0);
  }

  const nodes = legacy.query('SELECT * FROM tree_nodes').all() as Record<string, unknown>[];
  let inserted = 0;
  let skipped = 0;

  for (const row of nodes) {
    const exists = target
      .query(
        'SELECT id FROM tree_nodes WHERE id = $id OR telegram_id = $tg OR oidc_subject = $oidc'
      )
      .get({
        $id: row.id,
        $tg: row.telegram_id ?? null,
        $oidc: row.oidc_subject ?? null,
      }) as { id: string } | null;

    if (exists) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      target.run(
        `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, email, telegram_id, oidc_subject,
          rail_preference, cut_percentage, total_liquidity, total_accounts, status, active, promoted_at, created_at, last_play_at, phone_id)
         VALUES ($id, $type, $parent, $expert, $name, $email, $tg, $oidc, $rail, $cut, $liq, $acct, $status, $active, $promo, $created, $last, $phone)`,
        {
          $id: row.id,
          $type: row.type,
          $parent: row.parent_id ?? null,
          $expert: row.expert_id ?? null,
          $name: row.name,
          $email: row.email ?? null,
          $tg: row.telegram_id,
          $oidc: row.oidc_subject ?? null,
          $rail: row.rail_preference ?? 'paypal',
          $cut: row.cut_percentage ?? 0,
          $liq: row.total_liquidity ?? 0,
          $acct: row.total_accounts ?? 0,
          $status: row.status ?? 'active',
          $active: row.status === 'suspended' ? 0 : 1,
          $promo: row.promoted_at ?? null,
          $created: row.created_at,
          $last: row.last_play_at ?? null,
          $phone: row.phone_id ?? null,
        }
      );
    }
    inserted++;
  }

  if (tableExists(legacy, 'growth_metrics') && !dryRun) {
    const metrics = legacy.query('SELECT * FROM growth_metrics').all() as Record<string, unknown>[];
    for (const m of metrics) {
      target.run(
        `INSERT OR IGNORE INTO growth_metrics (node_id, period, plays_received, plays_placed, volume, pnl, new_sub_agents, new_accounts)
         VALUES ($nid, $p, $pr, $pp, $vol, $pnl, $ns, $na)`,
        {
          $nid: m.node_id,
          $p: m.period,
          $pr: m.plays_received ?? 0,
          $pp: m.plays_placed ?? 0,
          $vol: m.volume ?? 0,
          $pnl: m.pnl ?? 0,
          $ns: m.new_sub_agents ?? 0,
          $na: m.new_accounts ?? 0,
        }
      );
    }
  }

  legacy.close();
  target.close();

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Migrated ${inserted} tree_nodes, skipped ${skipped} duplicates from ${legacyPath} → ${DEFAULT_OPS_DB_PATH}`
  );
}

if (import.meta.main) {
  await main();
}
