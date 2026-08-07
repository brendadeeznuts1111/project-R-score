#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect (depth)
/**
 * Ops limit check — detect partner account limit raises (+ CLV / multi-factor).
 *
 * Multi/clv output uses LimitRaiseReport:
 *   console.log(report) → [Bun.inspect.custom]
 *     · Bun.inspect.table(rows, properties)
 *     · deep Bun.inspect(arrays · Uint8Array digests)
 *
 *   bun run ops:limits:check
 *   bun run ops:limits:check --partner partner-42 --clv
 *   bun run ops:limits:check --multi          # multi-factor score + context
 *   bun run ops:limits:check --force-seed --multi
 *   bun run ops:limits:demo                   # force-seed --multi
 *   bun --console-depth=6 run ops:limits:demo
 *
 * DB: operations.db (schema via ensureAccountLimitsSchema on migrate).
 */
import {
  AccountLimitsRepository,
  ensureAccountLimitsSchema,
  formatChangeSummary,
  formatLimitChangeTable,
  seedAccountLimitsDemo,
  type EnrichedLimitRaise,
  type LimitRaise,
} from '../lib/account-limits-repo.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  PartnerAnalyticsRepository,
  type MultiFactorEnrichedRaise,
} from '../lib/operations/partner-analytics-repo.ts';
import { LimitRaiseReport, printLimitRaiseReport } from '../lib/operations/limit-raise-report.ts';
import { cliOut } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  OPS_LIMITS_CHECK_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { OPS_LIMITS_CHECK_ALLOWED_LONG };

const HELP = `Usage: ops-check-limits.ts [opts]

  --partner <nodeId>   Check limits for one partner (default: "partner-42")
  --all                Check limits for every partner with data
  --hours <N>          Look back N hours (default: 24)
  --clv                Correlate with gold/platinum CLV + 5m line move
  --multi              Multi-factor score + top drivers + context (implies --clv)
  --capture            Derive+store missing limit_raise_context before report
  --alerts             Also show recent alert messages
  --seed               Seed demo limit/CLV/line/context rows if missing
  --force-seed         Re-seed demo for the target partner
  --json               Output raw JSON (includes tableProof + deep payload)
  --inspect            Force LimitRaiseReport Bun.inspect.custom tables (default for multi/clv)
  --help               This message
`;

function parseArgs(): {
  partner: string | null;
  hours: number;
  alerts: boolean;
  json: boolean;
  all: boolean;
  clv: boolean;
  multi: boolean;
  capture: boolean;
  seed: boolean;
  forceSeed: boolean;
  inspect: boolean;
} {
  const args = applyUnknownLongOptionGuardFor('ops:limits:check', Bun.argv.slice(2));
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
  const multi = flags.multi === 'true';
  const clv = multi || flags.clv === 'true';
  return {
    partner: flags.partner ?? null,
    hours: flags.hours ? Number(flags.hours) : 24,
    alerts: flags.alerts === 'true',
    json: flags.json === 'true',
    all: flags.all === 'true',
    clv,
    multi,
    capture: flags.capture === 'true',
    seed: flags.seed === 'true',
    forceSeed: flags['force-seed'] === 'true',
    // default on for multi/clv so Bun.inspect.table + inspect.custom always fire
    inspect: flags.inspect === 'true' || clv || multi || flags.inspect !== 'false',
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
    // Seal context proofs so deep inspect shows Uint8Array digests
    if (opts.multi || opts.inspect || opts.clv) {
      const analytics = new PartnerAnalyticsRepository(db, defaultNode);
      const sealed = analytics.sealMissingRaiseContextProofs(0);
      if (sealed.sealed > 0 || sealed.signed > 0) {
        console.error(
          `[ops-check-limits] sealed proofs sealed=${sealed.sealed} signed=${sealed.signed}`
        );
      }
    }
  }

  let nodes: string[];
  if (opts.all) {
    const rows = db
      .query(`SELECT DISTINCT node_id FROM partner_account_limits ORDER BY node_id`)
      .all() as Array<{ node_id: string }>; // brand-ok — partner slug column
    nodes = rows.map(r => r.node_id);
    if (nodes.length === 0) {
      console.log('No nodes with limit data found. Try: bun run ops:limits:demo');
      return;
    }
  } else {
    nodes = [defaultNode];
  }

  const since = Math.floor(Date.now() / 1000) - opts.hours * 3600;
  const allRaises: Array<{
    node_id: string; // brand-ok — partner slug
    raises: LimitRaise[] | EnrichedLimitRaise[] | MultiFactorEnrichedRaise[];
  }> = [];

  for (const nodeId of nodes) {
    if (opts.multi || opts.capture) {
      const analytics = new PartnerAnalyticsRepository(db, nodeId);
      if (opts.capture) {
        const n = analytics.captureMissingRaiseContexts(since);
        if (n > 0) console.error(`[ops-check-limits] captured ${n} context row(s) for ${nodeId}`);
        const proofs = analytics.sealMissingRaiseContextProofs(since);
        if (proofs.sealed > 0 || proofs.signed > 0 || proofs.invalid > 0) {
          console.error(
            `[ops-check-limits] context proofs sealed=${proofs.sealed} signed=${proofs.signed} invalid=${proofs.invalid}`
          );
        }
      }
      if (opts.multi) {
        const raises = analytics.getEnrichedRaisesWithContext(since);
        if (raises.length > 0) allRaises.push({ node_id: nodeId, raises });
        continue;
      }
    }
    const raises = opts.clv
      ? repo.detectRaisesEnriched(nodeId, since)
      : repo.detectRaises(nodeId, since);
    if (raises.length > 0) {
      allRaises.push({ node_id: nodeId, raises });
    }
  }

  if (opts.json) {
    const partners = allRaises.map(entry =>
      new LimitRaiseReport(entry.raises, {
        nodeId: entry.node_id,
        hours: opts.hours,
        multi: opts.multi || opts.clv,
      }).toJSON()
    );
    const output: Record<string, unknown> = {
      since_hours: opts.hours,
      clv: opts.clv,
      multi: opts.multi,
      total_raises: allRaises.reduce((s, r) => s + r.raises.length, 0),
      partners,
    };
    if (opts.alerts) {
      const alertsMap: Record<string, unknown[]> = {};
      for (const nodeId of nodes) {
        const alerts = repo.readAlerts(nodeId, 20);
        if (alerts.length > 0) alertsMap[nodeId] = alerts;
      }
      output.alerts = alertsMap;
    }
    cliOut(output, { json: true });
    return;
  }

  if (allRaises.length === 0) {
    console.log(
      `\n  ✅ No limit raises in the last ${opts.hours}h for ${opts.all ? 'any partner' : nodes.join(', ')}.\n` +
        (opts.seed || opts.forceSeed ? '' : '  hint: bun run ops:limits:demo\n')
    );
    return;
  }

  for (const entry of allRaises) {
    if (opts.inspect || opts.multi || opts.clv) {
      // Bun.inspect.custom → inspect.table(data, properties) + deep arrays/Uint8Array
      printLimitRaiseReport(entry.raises, {
        nodeId: entry.node_id,
        hours: opts.hours,
        multi: opts.multi || opts.clv,
      });
    } else {
      console.log(`\n  🚀 Limit raises — ${entry.node_id} (last ${opts.hours}h)`);
      console.log(formatLimitChangeTable(entry.raises as LimitRaise[]));
      console.log(formatChangeSummary(entry.raises as LimitRaise[]));
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
