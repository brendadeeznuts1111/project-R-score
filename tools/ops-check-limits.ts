#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Ops limit check — detect partner account limit raises (+ CLV / line move).
 *
 *   bun run ops:limits:check
 *   bun run ops:limits:check --partner partner-42
 *   bun run ops:limits:check --hours 48 --clv
 *   bun run ops:limits:check --all
 *   bun run ops:limits:check --alerts
 *   bun run ops:limits:check --seed          # demo data for partner-42
 *   bun run ops:limits:check --force-seed --clv
 *
 * DB: operations.db (schema via ensureAccountLimitsSchema on migrate).
 */
import {
  AccountLimitsRepository,
  ensureAccountLimitsSchema,
  formatEnrichedLimitRaises,
  formatLimitRaisesTable,
  seedAccountLimitsDemo,
  type EnrichedLimitRaise,
  type LimitRaise,
} from '../lib/account-limits-repo.ts';
import { openOperationsDb } from '../lib/operations/db.ts';

const HELP = `Usage: ops-check-limits.ts [opts]

  --partner <nodeId>   Check limits for one partner (default: "partner-42")
  --all                Check limits for every partner with data
  --hours <N>          Look back N hours (default: 24)
  --clv                Correlate with gold/platinum CLV + 5m line move
  --alerts             Also show recent alert messages
  --seed               Seed demo limit/CLV/line rows if missing
  --force-seed         Re-seed demo for the target partner
  --json               Output raw JSON
  --help               This message
`;

function parseArgs(): {
  partner: string | null;
  hours: number;
  alerts: boolean;
  json: boolean;
  all: boolean;
  clv: boolean;
  seed: boolean;
  forceSeed: boolean;
} {
  const args = Bun.argv.slice(2);
  const flags: Record<string, string> = {};
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--help') {
      console.log(HELP);
      process.exit(0);
    }
    if (args[i]!.startsWith('--')) {
      const key = args[i]!.replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1]!.startsWith('--') ? args[++i]! : 'true';
      flags[key] = val;
    }
    i++;
  }
  return {
    partner: flags.partner ?? null,
    hours: flags.hours ? Number(flags.hours) : 24,
    alerts: flags.alerts === 'true',
    json: flags.json === 'true',
    all: flags.all === 'true',
    clv: flags.clv === 'true',
    seed: flags.seed === 'true',
    forceSeed: flags['force-seed'] === 'true',
  };
}

function main(): void {
  const opts = parseArgs();
  const db = openOperationsDb();
  ensureAccountLimitsSchema(db);
  const repo = new AccountLimitsRepository(db);

  const defaultNode = opts.partner ?? 'partner-42';
  if (opts.seed || opts.forceSeed) {
    const s = seedAccountLimitsDemo(db, {
      nodeId: defaultNode,
      force: opts.forceSeed,
    });
    console.error(
      s.seeded
        ? `[ops-check-limits] seeded demo for ${s.nodeId}`
        : `[ops-check-limits] demo already present for ${s.nodeId} (use --force-seed)`
    );
  }

  let nodes: string[];
  if (opts.all) {
    const rows = db
      .query(`SELECT DISTINCT node_id FROM partner_account_limits ORDER BY node_id`)
      .all() as Array<{ node_id: string }>; // brand-ok — partner slug column
    nodes = rows.map(r => r.node_id);
    if (nodes.length === 0) {
      console.log('No nodes with limit data found. Try: bun run ops:limits:check --seed --clv');
      return;
    }
  } else {
    nodes = [defaultNode];
  }

  const since = Math.floor(Date.now() / 1000) - opts.hours * 3600;
  const allRaises: Array<{
    node_id: string; // brand-ok — partner slug
    raises: LimitRaise[] | EnrichedLimitRaise[];
  }> = [];

  for (const nodeId of nodes) {
    const raises = opts.clv
      ? repo.detectRaisesEnriched(nodeId, since)
      : repo.detectRaises(nodeId, since);
    if (raises.length > 0) {
      allRaises.push({ node_id: nodeId, raises });
    }
  }

  if (opts.json) {
    const output: Record<string, unknown> = {
      since_hours: opts.hours,
      clv: opts.clv,
      total_raises: allRaises.reduce((s, r) => s + r.raises.length, 0),
      partners: allRaises,
    };
    if (opts.alerts) {
      const alertsMap: Record<string, unknown[]> = {};
      for (const nodeId of nodes) {
        const alerts = repo.readAlerts(nodeId, 20);
        if (alerts.length > 0) alertsMap[nodeId] = alerts;
      }
      output.alerts = alertsMap;
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (allRaises.length === 0) {
    console.log(
      `\n  ✅ No limit raises in the last ${opts.hours}h for ${opts.all ? 'any partner' : nodes.join(', ')}.\n` +
        (opts.seed || opts.forceSeed ? '' : '  hint: bun run ops:limits:check --seed --clv\n')
    );
    return;
  }

  for (const entry of allRaises) {
    console.log(`\n  🚀 Limit raises — ${entry.node_id} (last ${opts.hours}h)`);
    if (opts.clv) {
      console.log(formatEnrichedLimitRaises(entry.raises as EnrichedLimitRaise[]));
    } else {
      console.log(formatLimitRaisesTable(entry.raises));
    }
  }

  const total = allRaises.reduce((s, r) => s + r.raises.length, 0);
  console.log(`\n  Total: ${total} raise(s) across ${allRaises.length} partner(s)\n`);

  if (opts.alerts) {
    for (const nodeId of nodes) {
      const alerts = repo.readAlerts(nodeId, 10);
      if (alerts.length > 0) {
        console.log(`  🔔 Alerts — ${nodeId}`);
        for (const a of alerts) {
          const ts = new Date(a.created_at * 1000).toISOString();
          console.log(`    [${ts}] ${a.message}`);
        }
        console.log();
      }
    }
  }
}

if (import.meta.main) {
  main();
}
