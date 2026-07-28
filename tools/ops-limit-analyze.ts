#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite
/**
 * Granular limit analysis — breakdown by book/sport/market + regulatory correlation.
 *
 *   bun run ops:limits:analyze
 *   bun run ops:limits:analyze --json
 *   bun run ops:limits:analyze --hours 168
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import {
  runGranularAnalysis,
  formatDimensionTable,
  formatRegulatoryTable,
} from '../lib/prediction/granular-analysis.ts';

const HELP = `Usage: ops-limit-analyze.ts [opts]

  --hours <N>   Lookback window (default: 48)
  --json        Output raw JSON
  --reg-only    Show regulatory correlations only
  --help        This message
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
  const hours = Number(flags.hours) || 48;

  if (flags.json) {
    const analysis = runGranularAnalysis(db, hours);
    console.log(JSON.stringify(analysis, null, 2));
    db.close();
    return;
  }

  console.log(`\n  📊 Granular Limit Analysis (last ${hours}h)\n`);

  const analysis = runGranularAnalysis(db, hours);

  if (!flags['reg-only']) {
    console.log(formatDimensionTable('By Sportsbook', analysis.bySportsbook));
    console.log('');
    console.log(formatDimensionTable('By Sport', analysis.bySport));
    console.log('');
    console.log(formatDimensionTable('By Market', analysis.byMarket));
    console.log('');
    console.log(formatDimensionTable('By Bet Type', analysis.byBetType));
    console.log('');
  }

  console.log('  🛡️ Regulatory Correlation');
  console.log(formatRegulatoryTable(analysis.regulatoryCorrelations));
  console.log('');

  db.close();
}

if (import.meta.main) main();
