#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
/**
 * Coverage prediction backtest CLI (`package.json` → `ops:prediction`).
 *
 * Implementation: `lib/prediction/` (`runCoverageBacktest`, `getPredictionAccuracy`).
 * DB: `openOperationsDb` / `OPS_DB_PATH` / `DEFAULT_OPS_DB_PATH`.
 *
 *   bun run ops:prediction --help
 *   bun run ops:prediction backtest --from=2025-01-01 --to=2025-12-31
 *   bun run ops:prediction accuracy
 *
 * @see lib/prediction/README.md
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { getPredictionAccuracy, runCoverageBacktest } from '../lib/prediction/tester.ts';

const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';

function flag(name: string): string | undefined {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const db = openOperationsDb({ path: dbPath });

try {
  switch (cmd) {
    case 'backtest': {
      const from = flag('from') ?? '2020-01-01';
      const to = flag('to') ?? new Date().toISOString().slice(0, 10);
      const results = runCoverageBacktest(db, from, to);
      const acc = getPredictionAccuracy(db, 'coverage');
      console.log(`Backtest rows: ${results.length}`);
      console.log(JSON.stringify(acc, null, 2));
      break;
    }
    case 'accuracy': {
      console.log(JSON.stringify(getPredictionAccuracy(db, 'coverage'), null, 2));
      break;
    }
    default:
      console.log(`Usage:
  backtest [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
  accuracy
`);
  }
} finally {
  db.close();
}
