#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Limit prediction cycle — forecast raise probability, backfill, report accuracy.
 *
 *   bun run ops:limits:predict
 *   bun run ops:limits:predict --json
 *   bun run ops:limits:predict --partner partner-42
 *   bun run ops:limits:predict --partner partner-42 --inspect
 *   bun --console-depth=6 run ops:limits:predict --partner partner-42
 */
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import {
  runLimitPredictionCycle,
  predictLimitRaise,
  type LimitPredictionInput,
} from '../lib/prediction/limit-prediction.ts';
import {
  LimitPredictionReport,
  printLimitPredictionReport,
} from '../lib/prediction/limit-prediction-report.ts';

const HELP = `Usage: ops-limit-predict.ts [opts]

  --partner <nodeId>   Predict for a single partner (default: all cycle)
  --json               Output raw JSON (includes tableProof + deep)
  --inspect            Bun.inspect.table + inspect.custom (default with --partner)
  --help               This message
`;

function main(): void {
  const args = Bun.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') {
      console.log(HELP);
      process.exit(0);
    }
    if (args[i]!.startsWith('--')) {
      const key = args[i]!.replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1]!.startsWith('--') ? args[++i]! : 'true';
      flags[key] = val;
    }
  }

  const db = openOperationsDb();
  ensureAccountLimitsSchema(db);
  const wantJson = flags.json === 'true';
  const wantInspect = flags.inspect === 'true' || (!wantJson && Boolean(flags.partner));

  if (flags.partner) {
    const dims = db
      .query(
        `
      SELECT DISTINCT node_id, sportsbook, sport_id, market_id, bet_type
      FROM partner_account_limits
      WHERE node_id = ?
    `
      )
      .all(flags.partner) as LimitPredictionInput[];

    if (dims.length === 0) {
      console.log(`No limit data for partner ${flags.partner}. Try: bun run ops:limits:demo`);
      process.exit(0);
    }

    const results = dims.map(dim => {
      const prediction = predictLimitRaise(db, dim);
      return { dimension: dim, prediction };
    });

    if (wantJson) {
      const report = new LimitPredictionReport(results, { nodeId: flags.partner });
      jsonOut(report.toJSON());
    } else if (wantInspect) {
      printLimitPredictionReport(results, { nodeId: flags.partner });
    } else {
      printLimitPredictionReport(results, { nodeId: flags.partner });
    }
  } else {
    console.log('  🔮 Running limit prediction cycle...');
    const result = runLimitPredictionCycle(db);

    if (wantJson) {
      jsonOut(result);
    } else {
      // Cycle summary as inspect.table
      const summaryRows = [
        { metric: 'predictions', value: result.predictions },
        { metric: 'backfilled', value: result.backfilled },
        {
          metric: 'accuracy_n',
          value: result.accuracy?.n ?? 0,
        },
        {
          metric: 'mae',
          value: result.accuracy?.n ? result.accuracy.mae.toFixed(4) : '—',
        },
        {
          metric: 'rmse',
          value: result.accuracy?.n ? result.accuracy.rmse.toFixed(4) : '—',
        },
        {
          metric: 'bias',
          value: result.accuracy?.n ? result.accuracy.bias.toFixed(4) : '—',
        },
        { metric: 'evidence_issues', value: result.evidence.issues },
        { metric: 'evidence_pending', value: result.evidence.pending },
        { metric: 'evidence_matured', value: result.evidence.matured },
        { metric: 'evidence_no_raise', value: result.evidence.negatives },
      ];
      logTable(summaryRows, ['metric', 'value'], {
        colors: true,
      });
      if (!result.accuracy || result.accuracy.n === 0) {
        console.log('  No accuracy data yet — predictions will backfill on next cycle.');
      }
    }
  }

  db.close();
}

if (import.meta.main) main();
