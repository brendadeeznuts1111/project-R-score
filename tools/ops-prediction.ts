#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/bunx — bunx (args after bin name; --bun before package)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Coverage prediction backtest CLI (`package.json` → `ops:prediction`).
 *
 *   bun run ops:prediction --help
 *   bun run ops:prediction backtest --from 2025-01-01 --to 2025-12-31
 *   bun run ops:prediction report [--webview]
 *   bun run ops:prediction accuracy [--json]
 *
 * @see lib/prediction/README.md
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  getPredictionAccuracy,
  runCoverageBacktest,
  runDailyCoveragePredictionCycle,
  writePredictionReport,
} from '../lib/prediction/index.ts';
import { evaluateShadow, shadowLog } from '../lib/experiments/champion-challenger.ts';
import { cliOut, jsonOut } from '../lib/console-depth.ts';

const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;
const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:prediction', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const json = args.includes('--json');
const cmd = args.find(a => !a.startsWith('-')) ?? 'help';

function flag(name: string): string | undefined {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return args[i + 1];
}

function printHelp(): void {
  console.log(`
ops:prediction — coverage prediction backtest (ops C5)

Commands:
  daily    [--lookback N]     Snapshot coverage + idempotent backtest (cron entry)
  backtest [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  report   [--webview] [--out DIR]
                              SVG+HTML under public/registry/prediction/
                              --webview: Bun.WebView screenshot → Bun.Image PNG
  accuracy
  shadow-eval [--min-n N] [--margin M]   Champion/challenger MAE promote rule
  shadow-log  --champion NAME --challenger NAME --cpred N --gpred N [--actual N]

Compares naive coverage predictor (prod accounts / launched platforms)
against coverage_snapshots in the ops DB, writing rows to prediction_accuracy.
System-model shadow logs live in prediction_shadow (not per-partner factorials).

Env: OPS_DB_PATH (default ${DEFAULT_OPS_DB_PATH})
Flags: --json · --webview (report only)
`);
}

function out(data: object | string | number | boolean | null): void {
  if (json) {
    jsonOut(data);
  } else {
    cliOut(data);
  }
}

async function main(): Promise<number> {
  if (cmd === 'help' || cmd === '--help' || args.includes('--help')) {
    printHelp();
    return 0;
  }

  const db = openOperationsDb({ path: dbPath });
  try {
    switch (cmd) {
      case 'daily': {
        const lookback = Number(flag('lookback') ?? 30);
        const result = runDailyCoveragePredictionCycle(db, {
          lookbackDays: Number.isFinite(lookback) ? lookback : 30,
        });
        out({
          snapshotDate: result.snapshotDate,
          coverage: result.snapshot,
          newBacktestRows: result.backtest.length,
          accuracy: result.accuracy,
          window: result.window,
        });
        return 0;
      }
      case 'backtest': {
        const from = flag('from') ?? '2020-01-01';
        const to = flag('to') ?? new Date().toISOString().slice(0, 10);
        const results = runCoverageBacktest(db, from, to);
        const acc = getPredictionAccuracy(db, 'coverage');
        out({ from, to, rows: results.length, accuracy: acc, sample: results.slice(0, 5) });
        return 0;
      }
      case 'report': {
        const webview = args.includes('--webview');
        const report = await writePredictionReport(db, {
          outDir: flag('out') ?? 'public/registry/prediction',
          webview,
        });
        out({
          svgPath: report.svgPath,
          htmlPath: report.htmlPath,
          summaryPath: report.summaryPath,
          pngPath: report.pngPath ?? null,
          points: report.points,
          accuracy: report.accuracy,
          diagnostics: report.diagnostics,
          openedWebView: report.openedWebView,
        });
        return 0;
      }
      case 'accuracy': {
        out(getPredictionAccuracy(db, 'coverage'));
        return 0;
      }
      case 'shadow-eval': {
        out(
          evaluateShadow(db, {
            minN: Number(flag('min-n') ?? 100),
            margin: Number(flag('margin') ?? 0.01),
          })
        );
        return 0;
      }
      case 'shadow-log': {
        const champion = flag('champion');
        const challenger = flag('challenger');
        const cpred = flag('cpred');
        const gpred = flag('gpred');
        if (!champion || !challenger || cpred === undefined || gpred === undefined) {
          console.error('shadow-log requires --champion --challenger --cpred --gpred');
          return 1;
        }
        const actual = flag('actual');
        const id = shadowLog(db, {
          championModel: champion,
          challengerModel: challenger,
          championPred: Number(cpred),
          challengerPred: Number(gpred),
          actual: actual !== undefined ? Number(actual) : undefined,
        });
        out({ id });
        return 0;
      }
      default:
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        return 1;
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return 1;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  process.exit(await main());
}
