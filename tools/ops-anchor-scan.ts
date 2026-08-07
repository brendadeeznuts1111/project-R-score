#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Ops stale-anchor scan — detect partner books sitting at drifted, stable
 * max-stake limits (analytics signal; never places bets).
 *
 *   bun run ops:anchor:scan
 *   bun run ops:anchor:scan --json
 *   bun run ops:anchor:scan --min-drift 250 --max-variance 50
 *   bun run ops:anchor:scan --db data/research/limits.db
 *
 * Reads the live limit-tracker SQLite history (`data/research/limits.db`,
 * path overridable) and emits `StaleAnchorSignal` rows for every
 * partner × market whose limit drifted ≥ minDriftUsd then sat flat
 * (variance < maxVarianceUsd).
 */
import { scanStaleAnchorsFromDb } from '../lib/operations/anchor-stability.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { logTable } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:anchor:scan', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const json = argv.includes('--json');

function flagValue(name: string): string | undefined {
  const idx = Bun.argv.indexOf(`--${name}`);
  return idx >= 0 ? Bun.argv[idx + 1] : undefined;
}

const minDriftUsd = flagValue('min-drift');
const maxVarianceUsd = flagValue('max-variance');
const dbPath = flagValue('db');

const result = scanStaleAnchorsFromDb({
  ...(minDriftUsd !== undefined ? { minDriftUsd: Number(minDriftUsd) } : {}),
  ...(maxVarianceUsd !== undefined ? { maxVarianceUsd: Number(maxVarianceUsd) } : {}),
  ...(dbPath !== undefined ? { path: dbPath } : {}),
});

if (json) {
  jsonOut(result);
} else {
  console.log(`Stale-anchor scan: partners=${result.scanned} signals=${result.signals.length}`);
  if (result.signals.length > 0) {
    logTable(
      result.signals.map(s => ({
        partner: s.partnerId,
        league: s.league,
        market: s.marketType,
        drift: `$${s.driftUsd.toFixed(0)}`,
        stable: `$${s.currentMaxStakeUsd.toFixed(0)}`,
        variance: s.varianceUsd.toFixed(2),
      })),
      ['partner', 'league', 'market', 'drift', 'stable', 'variance']
    );
    for (const s of result.signals) {
      console.log(`  [${s.kind}] ${s.detail}`);
    }
  } else {
    console.log('  no stale anchors detected');
  }
}

process.exit(result.signals.length === 0 ? 0 : 1);
