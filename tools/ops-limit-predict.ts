#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite
/**
 * Limit prediction cycle — forecast raise probability, backfill, report accuracy.
 *
 *   bun run ops:limits:predict
 *   bun run ops:limits:predict --json
 *   bun run ops:limits:predict --partner partner-42
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensureAccountLimitsSchema, formatChangeSummary } from '../lib/account-limits-repo.ts';
import {
  runLimitPredictionCycle,
  predictLimitRaise,
  formatLimitPrediction,
  type LimitPredictionInput,
} from '../lib/prediction/limit-prediction.ts';

const HELP = `Usage: ops-limit-predict.ts [opts]

  --partner <nodeId>   Predict for a single partner (default: all)
  --json               Output raw JSON
  --help               This message
`;

function main(): void {
  const args = process.argv.slice(2);
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

  if (flags.partner) {
    // Single-partner prediction
    const dims = db
      .query(
        `
      SELECT DISTINCT node_id, sportsbook, sport_id, market_id, bet_type
      FROM partner_account_limits
      WHERE node_id = ?
    `,
        [flags.partner]
      )
      .all() as LimitPredictionInput[];

    if (dims.length === 0) {
      console.log(`No limit data for partner ${flags.partner}. Try: bun run ops:limits:demo`);
      process.exit(0);
    }

    const results = dims.map(dim => {
      const prediction = predictLimitRaise(db, dim);
      return { dimension: dim, prediction };
    });

    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n  🔮 Limit predictions — ${flags.partner}\n`);
      for (const r of results) {
        console.log(
          `  ${r.dimension.sportsbook} ${r.dimension.sport_id}/${r.dimension.market_id} (${r.dimension.bet_type})`
        );
        console.log(`  ${formatLimitPrediction(r.prediction)}`);
        console.log('');
      }
    }
  } else {
    // Full cycle
    console.log('  🔮 Running limit prediction cycle...');
    const result = runLimitPredictionCycle(db);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`  Predictions recorded: ${result.predictions}`);
      console.log(`  Backfilled: ${result.backfilled}`);
      if (result.accuracy && result.accuracy.n > 0) {
        console.log(`\n  📊 Accuracy (${result.accuracy.n} samples):`);
        console.log(`     MAE:  ${result.accuracy.mae.toFixed(4)}`);
        console.log(`     RMSE: ${result.accuracy.rmse.toFixed(4)}`);
        console.log(`     Bias: ${result.accuracy.bias.toFixed(4)}`);
      } else {
        console.log('  No accuracy data yet — predictions will backfill on next cycle.');
      }
    }
  }

  db.close();
}

if (import.meta.main) main();
