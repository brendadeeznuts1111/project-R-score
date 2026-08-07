#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Operator research agent CLI.
 *
 * Usage:
 *   bun run agent seeds --list --limit 20
 *   bun run agent batch-enrich --domains config/operator-research/seeds.json --parallel 5
 *   bun run agent detect-stack --batch --input data/exports/batch-enrich.json --store
 *   bun run agent partner-coverage --detailed --output data/exports/coverage-report.md
 *   bun run agent research --run full --seed config/operator-research/seeds.json
 *   bun run agent detect-edges --host hardrock.bet --window 5
 *   bun run agent monitor-odds --once --hosts hardrock.bet,sportsbook.draftkings.com
 *   bun run agent odds-dashboard --port 8787
 *   bun run agent check-version | test-webview | test-image | doctor
 *   bun run agent serve --port 8790
 *   bun run agent seed
 *   bun run agent normalize-odds --host hardrock.bet --fixture hardrock
 *   bun run agent arb [--minEdgePct N] [--json]
 *   bun run agent alerts [--evaluate] [--json]
 */
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
import { joinPath } from '../lib/path-bun.ts';
import { inspect } from 'bun';
import { runBatchEnrich } from '../lib/operator-research/batch.ts';
import { generateCoverageReport } from '../lib/operator-research/coverage.ts';
import { startResearchDashboard } from '../lib/operator-research/dashboard.ts';
import {
  checkImage,
  checkWebView,
  formatDoctorTable,
  runDoctor,
} from '../lib/operator-research/doctor.ts';
import {
  loadOperators,
  loadSeeds,
  seedsFromOperators,
} from '../lib/operator-research/operators.ts';
import {
  BATCH_ENRICH_EXPORT,
  COVERAGE_REPORT_MD,
  DEFAULT_SEEDS_PATH,
  FIXTURES_DIR,
  ODDS_EDGES_EXPORT,
  ROOT,
} from '../lib/operator-research/paths.ts';
import { batchDetectStack, runFullResearch } from '../lib/operator-research/research.ts';
import type { SeedDomain } from '../lib/operator-research/types.ts';
import { assertBunVersion, checkBunVersion } from '../lib/operator-research/version-check.ts';
import { evaluateAlerts, listRecentAlerts } from '../lib/operator-research/matching/alerts.ts';
import { detectCrossBookArbitrage } from '../lib/operator-research/matching/arbitrage.ts';
import { detectDelays } from '../lib/operator-research/matching/delay-detector.ts';
import { queryOddsHistorySeries } from '../lib/operator-research/matching/history-query.ts';
import { detectNotableMovements } from '../lib/operator-research/matching/line-movement.ts';
import { detectSmartMoney } from '../lib/operator-research/matching/smart-money.ts';
import { enrichOdds } from '../lib/operator-research/normalization/enrich-odds.ts';
import { getMarketTypeId } from '../lib/operator-research/normalization/market-classifier.ts';
import { queryNormalizedOdds } from '../lib/operator-research/normalization/store.ts';
import { seedAll } from '../lib/operator-research/normalization/seed.ts';
import {
  detectChanges,
  detectPatterns,
  endpointFromHost,
  ensureOddsStore,
  getLastSnapshots,
  HIGH_PRIORITY_BOOKS,
  parseOddsJson,
  rankSignals,
  runEdgeScan,
  runMonitorTick,
  startOddsDashboard,
  startOddsMonitor,
  storeSnapshot,
} from '../lib/operator-research/odds/index.ts';

// Boot guard — Bun.semver against package.json engines.bun
await assertBunVersion();

function usage(): never {
  console.log(`operator-agent — research-grade bookmaker discovery + live odds

Commands:
  seeds --list [--limit N] [--json]
  batch-enrich [--domains <file>] [--parallel N] [--no-screenshot] [--spawn] [--no-fixture]
  detect-stack --batch [--input <file>] [--store]
  partner-coverage --detailed [--output <md>]
  research --run full [--seed <file>] [--parallel N] [--limit N] [--spawn]
  detect-edges --host <host> [--window N] [--fixture <id>] [--seed-fixtures]
  edge-scan [--hosts a,b,c] [--seed-arb] [--seed-value] [--minEdgePct N] [--minEvPct N] [--json]
  monitor-odds [--once|--cron] [--hosts a,b] [--arb] [--no-fixture] [--dashboard] [--port N]
  odds-dashboard [--port N]
  check-version [--json]
  test-webview [--json]
  test-image [--json]
  doctor [--json]
  serve [--port N] [--no-odds] [--no-research] [--monitor|--no-monitor]
  research-cycle [--live] [--json]
  registry-readme <name> [--version V] [--json]
  scrape odds --source <bookId> [--live] [--html]
  scrape odds <bookId> [--live] [--html]
  seed [--json]
  normalize-odds --host <host> [--fixture <id>] [--session pregame|live]
  query-odds [--sport s] [--league l] [--market m] [--host h] [--limit N]
  movements [--minPct N] [--sinceMin N] [--json]
  delays --eventId N [--market moneyline] [--selection NYY]
  arb [--minEdgePct N] [--market moneyline] [--eventId N] [--json]
  alerts [--evaluate] [--limit N] [--json]
  history --eventId N [--market moneyline] [--selection S] [--bucketMs N]
  smart-money [--limit N] [--json]

Examples:
  bun run agent research --run full --seed config/operator-research/seeds.json
  bun run agent research-cycle
  bun run agent research-cycle --live --json
  bun run agent detect-edges --host hardrock.bet --window 5 --seed-fixtures
  bun run agent monitor-odds --once --hosts hardrock.bet
  bun run scrape:odds bet365
  bun run agent scrape odds --source bet365
  bun run agent scrape odds bet365 --live
  bun run agent seed
  bun run agent normalize-odds --host hardrock.bet --fixture hardrock
  bun run agent movements --minPct 1
  bun run agent arb --minEdgePct 1.5
  bun run agent alerts --evaluate
  bun run agent doctor
`);
  process.exit(1);
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function opt(args: string[], name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
}

async function cmdSeeds(args: string[]) {
  const limit = Number(opt(args, '--limit', '20'));
  let seeds: SeedDomain[];
  try {
    seeds = await loadSeeds();
  } catch {
    seeds = seedsFromOperators(await loadOperators(), limit);
  }
  seeds = seeds.slice(0, limit);
  if (flag(args, '--json')) {
    console.log(JSON.stringify(seeds, null, 2)); // console-ok
  } else {
    console.log(`# ${seeds.length} seed domains`);
    for (const s of seeds) console.log(`${s.id}\t${s.url}`);
  }
}

function resolvePath(p: string): string {
  return p.startsWith('/') ? p : joinPath(ROOT, p);
}

async function cmdBatchEnrich(args: string[]) {
  const domainsPath = opt(args, '--domains', DEFAULT_SEEDS_PATH)!;
  const parallel = Number(opt(args, '--parallel', '5'));
  const seeds = await loadSeeds(resolvePath(domainsPath));
  const report = await runBatchEnrich(seeds, {
    parallel,
    screenshot: !flag(args, '--no-screenshot'),
    fixtureFallback: !flag(args, '--no-fixture'),
    inProcess: !flag(args, '--spawn'),
    store: true,
  });
  console.log(JSON.stringify({ count: report.count, export: BATCH_ENRICH_EXPORT }, null, 2)); // console-ok
}

async function cmdDetectStack(args: string[]) {
  if (!flag(args, '--batch')) {
    console.error('detect-stack currently supports --batch mode');
    process.exit(2);
  }
  const input = opt(args, '--input', BATCH_ENRICH_EXPORT)!;
  const stacks = await batchDetectStack({
    input: input.startsWith('/') ? input : joinPath(ROOT, input),
    store: flag(args, '--store') || !flag(args, '--no-store'),
  });
  console.log(JSON.stringify({ count: stacks.length }, null, 2)); // console-ok
}

async function cmdCoverage(args: string[]) {
  const output = opt(args, '--output', COVERAGE_REPORT_MD)!;
  const report = await generateCoverageReport({
    detailed: flag(args, '--detailed') || true,
    outputMd: output.startsWith('/') ? output : joinPath(ROOT, output),
  });
  console.log(
    JSON.stringify(
      {
        operators: report.operators,
        meanScore: report.meanScore,
        output,
      },
      null,
      2
    )
  );
}

async function cmdResearch(args: string[]) {
  if (opt(args, '--run') !== 'full' && !flag(args, '--run')) {
    // allow `--run full`
  }
  const run = opt(args, '--run', 'full');
  if (run !== 'full') {
    console.error(`Unknown research run mode: ${run}`);
    process.exit(2);
  }
  const seed = opt(args, '--seed', DEFAULT_SEEDS_PATH)!;
  const result = await runFullResearch({
    seedPath: seed.startsWith('/') ? seed : joinPath(ROOT, seed),
    parallel: Number(opt(args, '--parallel', '5')),
    limit: opt(args, '--limit') ? Number(opt(args, '--limit')) : 20,
    screenshot: !flag(args, '--no-screenshot'),
    fixtureFallback: !flag(args, '--no-fixture'),
    inProcess: !flag(args, '--spawn'),
  });
  console.log(
    JSON.stringify(
      {
        enriched: result.batch.count,
        meanScore: result.coverage.meanScore,
        exports: result.exports,
      },
      null,
      2
    )
  );
}

async function seedFixtureSnapshots(host: string, fixtureBase: string): Promise<number> {
  await ensureOddsStore();
  const basePath = joinPath(FIXTURES_DIR, 'odds', `${fixtureBase}.json`);
  const movedPath = joinPath(FIXTURES_DIR, 'odds', `${fixtureBase}-moved.json`);
  let n = 0;
  for (const path of [basePath, movedPath]) {
    const f = Bun.file(path);
    if (!(await f.exists())) continue;
    const text = await f.text();
    const snap = parseOddsJson(text, { host, source: 'fixture' });
    storeSnapshot(snap);
    n++;
  }
  return n;
}

async function cmdDetectEdges(args: string[]) {
  const host = opt(args, '--host');
  if (!host) {
    console.error('--host is required');
    process.exit(2);
  }
  const window = Number(opt(args, '--window', '5'));
  const fixtureId = opt(args, '--fixture', host.split('.')[0] ?? host)!;

  await ensureOddsStore();

  if (flag(args, '--seed-fixtures')) {
    const seeded = await seedFixtureSnapshots(host, fixtureId);
    if (seeded === 0) {
      console.error(`No fixtures under fixtures/odds/${fixtureId}*.json`);
      process.exit(2);
    }
  }

  // Optionally pull one live/fixture tick to refresh store
  if (flag(args, '--fetch')) {
    await runMonitorTick({
      endpoints: [endpointFromHost(host, { fixtureId })],
      fixtureFallback: !flag(args, '--no-fixture'),
      store: true,
      window,
    });
  }

  const snapshots = getLastSnapshots(host, window);
  if (snapshots.length === 0) {
    console.error(
      `No snapshots for ${host}. Try --seed-fixtures or --fetch (with fixtures if live blocks).`
    );
    process.exit(2);
  }

  const current = snapshots[snapshots.length - 1]!;
  const previous = snapshots.slice(0, -1);
  const prev = previous[previous.length - 1] ?? null;
  const diff = prev ? detectChanges(prev, current) : null;
  const patterns = detectPatterns(current, previous, { diff });

  const out = {
    host,
    window: snapshots.length,
    identical: diff?.identical ?? null,
    diff,
    patterns,
  };

  if (flag(args, '--json')) {
    console.log(JSON.stringify(out, null, 2)); // console-ok
  } else {
    console.log(inspect(out, { depth: 4, colors: Boolean(Bun.enableANSIColors) }));
  }

  if (flag(args, '--export') || flag(args, '--store-export')) {
    await Bun.write(ODDS_EDGES_EXPORT, JSON.stringify(out, null, 2));
    console.error(`wrote ${ODDS_EDGES_EXPORT}`);
  }
}

async function cmdMonitorOdds(args: string[]) {
  const hostsRaw = opt(args, '--hosts', HIGH_PRIORITY_BOOKS.join(','))!;
  const hosts = hostsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const once = flag(args, '--once') || !flag(args, '--cron');
  const useDashboard = flag(args, '--dashboard');
  const port = Number(opt(args, '--port', '8787'));

  let dashboard: ReturnType<typeof startOddsDashboard> | null = null;
  if (useDashboard) {
    dashboard = startOddsDashboard({ port });
    console.error(`odds dashboard ${dashboard.url}`);
  }

  const hooks = {
    onDiff: () => {
      /* no-op; publish via results */
    },
    onPatterns: (
      host: import('../lib/types/branded.ts').HostId,
      patterns: import('../lib/operator-research/odds/types.ts').EdgeSignal[]
    ) => {
      dashboard?.publishPatterns(String(host), patterns);
    },
    onAlerts: (alerts: import('../lib/operator-research/matching/alerts.ts').AlertEvent[]) => {
      for (const a of alerts) dashboard?.publishAlert(a);
    },
  };

  if (once) {
    const results = await runMonitorTick({
      endpoints: hosts.map(h => endpointFromHost(h)),
      fixtureFallback: !flag(args, '--no-fixture'),
      store: !flag(args, '--no-store'),
      window: Number(opt(args, '--window', '5')),
      // Multi-host ticks default to cross-book arb+value; single host is line/steam only.
      crossBookArb: flag(args, '--arb') || hosts.length > 1,
      crossBookValue: flag(args, '--arb') || flag(args, '--value') || hosts.length > 1,
      hooks,
    });
    dashboard?.publishTick(results);
    console.log(
      inspect(
        results.map(r => ({
          host: String(r.host),
          ok: r.ok,
          identical: r.identical,
          patterns: r.patterns.length,
          elapsedMs: Math.round(r.elapsedMs),
          error: r.error,
          priceChanges: r.diff?.priceChanges.length ?? 0,
        })),
        { depth: 3, colors: Boolean(Bun.enableANSIColors) }
      )
    );
    dashboard?.stop();
    return;
  }

  const handle = startOddsMonitor({
    hosts,
    fixtureFallback: !flag(args, '--no-fixture'),
    store: !flag(args, '--no-store'),
    window: Number(opt(args, '--window', '5')),
    fireImmediately: true,
    hooks: {
      onPatterns: hooks.onPatterns,
      onDiff(_host, tick) {
        dashboard?.publishTick([tick]);
      },
    },
  });

  console.error(`monitoring ${hosts.join(', ')} (Bun.cron / interval). Ctrl+C to stop.`);
  const shutdown = () => {
    handle.stop();
    dashboard?.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  // Keep process alive
  await new Promise(() => {});
}

async function cmdOddsDashboard(args: string[]) {
  const port = Number(opt(args, '--port', '8787'));
  const dash = startOddsDashboard({ port });
  console.error(`odds dashboard ${dash.url}  ws://${new URL(dash.url).hostname}:${dash.port}/ws`);
  process.on('SIGINT', () => {
    dash.stop();
    process.exit(0);
  });
  await new Promise(() => {});
}

async function cmdCheckVersion(args: string[]) {
  const result = await checkBunVersion();
  if (flag(args, '--json')) {
    console.log(JSON.stringify(result, null, 2)); // console-ok
  } else {
    console.log(`Bun ${result.bunVersion} (${result.bunRevision})`);
    console.log(`Required: ${result.required}`);
    console.log(`Satisfies: ${result.satisfies}`);
    console.log(`Agent: ${result.packageName}@${result.agentVersion}`);
  }
  if (!result.satisfies) process.exitCode = 1;
}

async function cmdTestWebView(args: string[]) {
  const result = await checkWebView();
  if (flag(args, '--json')) {
    console.log(JSON.stringify(result, null, 2)); // console-ok
  } else {
    console.log(
      result.ok ? `webview ok (${result.elapsedMs.toFixed(1)}ms)` : `webview FAIL: ${result.error}`
    );
  }
  if (!result.ok) process.exitCode = 1;
}

async function cmdTestImage(args: string[]) {
  const result = await checkImage();
  if (flag(args, '--json')) {
    console.log(JSON.stringify(result, null, 2)); // console-ok
  } else {
    console.log(
      result.ok
        ? `image ok (${result.elapsedMs.toFixed(1)}ms, ${result.detail?.bytes ?? '?'}B jpeg)`
        : `image FAIL: ${result.error}`
    );
  }
  if (!result.ok) process.exitCode = 1;
}

async function cmdDoctor(args: string[]) {
  const report = await runDoctor();
  if (flag(args, '--json')) {
    console.log(JSON.stringify(report, null, 2)); // console-ok
  } else {
    console.log(formatDoctorTable(report));
  }
  if (!report.bun.satisfies || !report.checks.image.ok) process.exitCode = 1;
}

function wantOddsMonitor(args: string[]): boolean {
  if (flag(args, '--no-monitor')) return false;
  if (flag(args, '--monitor')) return true;
  return Bun.env.OPERATOR_ODDS_MONITOR === '1';
}

async function cmdServe(args: string[]) {
  const port = Number(opt(args, '--port', '8790'));
  const hostsRaw = opt(args, '--hosts', '');
  const hosts = hostsRaw
    ? hostsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [...HIGH_PRIORITY_BOOKS];

  const oddsMonitor = wantOddsMonitor(args)
    ? startOddsMonitor({
        hosts,
        fixtureFallback: !flag(args, '--no-fixture'),
        store: !flag(args, '--no-store'),
        window: Number(opt(args, '--window', '5')),
        fireImmediately: true,
        quiet: flag(args, '--quiet'),
      })
    : undefined;

  const dash = startResearchDashboard({
    port,
    withOdds: !flag(args, '--no-odds'),
    withResearchAgent: !flag(args, '--no-research'),
    oddsMonitor,
  });
  console.log(`research dashboard → ${dash.url}`);
  console.log(`  GET ${dash.url}api/platform`);
  console.log(`  GET ${dash.url}api/system/jobs`);
  console.log(`  GET ${dash.url}api/tasks/:id`);
  console.log(`  GET ${dash.url}api/research/markets`);
  console.log(`  GET ${dash.url}api/research/limits?partnerId=hard-rock-florida`);
  console.log(`  POST ${dash.url}api/research/run`);
  if (dash.research) {
    console.log(`research agent   → every ${dash.research.status().intervalMs}ms`);
  }
  if (dash.odds) {
    console.log(`odds dashboard   → ${dash.odds.url}`);
    console.log(`  GET ${dash.odds.url}api/odds?league=MLB&market=moneyline`);
  }
  if (oddsMonitor) {
    console.log(
      `odds monitor     → Bun.cron ${oddsMonitor.cronExpr} · ${oddsMonitor.hosts.join(', ')}`
    );
  } else {
    console.log(`odds monitor     → off (pass --monitor or OPERATOR_ODDS_MONITOR=1)`);
  }
  const shutdown = () => {
    dash.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await new Promise(() => {});
}

async function cmdRegistryReadme(args: string[]) {
  const { getRegistryPackage } = await import('../lib/operator-research/registry-desk.ts');
  const { renderReadmeAnsi } = await import('../lib/factory/markdown.ts');
  const name = args.find(a => !a.startsWith('-'));
  if (!name) {
    console.error('Usage: bun run agent registry-readme <package> [--version V] [--json]');
    process.exitCode = 1;
    return;
  }
  const version = opt(args, '--version', '') || undefined;
  const detail = await getRegistryPackage(name, version);
  if (!detail) {
    console.error(`Package not found in snapshot: ${name}`);
    process.exitCode = 1;
    return;
  }
  if (flag(args, '--json')) {
    console.log(
      JSON.stringify(
        {
          name: detail.name,
          selectedVersion: detail.selectedVersion,
          readme: detail.readme ?? null,
          readmeFilename: detail.readmeFilename ?? null,
        },
        null,
        2
      )
    );
    return;
  }
  if (!detail.readme) {
    console.error(
      `No README in snapshot for ${detail.name}@${detail.selectedVersion ?? '?'} (refresh factory:snapshot / publish with Bun ≥1.3.14)`
    );
    process.exitCode = 1;
    return;
  }
  const columns = process.stdout.columns || 80;
  const header = `${detail.name}@${detail.selectedVersion ?? '?'} · ${detail.readmeFilename ?? 'README.md'}\n`;
  process.stdout.write(header + '\n');
  process.stdout.write(renderReadmeAnsi(detail.readme, columns));
  if (!detail.readme.endsWith('\n')) process.stdout.write('\n');
}

async function cmdResearchCycle(args: string[]) {
  const { runResearchCycle } = await import('../lib/research/agent.ts');
  const live = flag(args, '--live') || Bun.env.RESEARCH_AGENT_LIVE === '1';
  const result = await runResearchCycle({ live });
  if (flag(args, '--json')) {
    console.log(JSON.stringify(result, null, 2)); // console-ok
  } else {
    console.log(
      `research-cycle ok=${result.ok} markets=${result.markets.length} limits=${result.limitsRecorded} liquidity=${result.liquidityPushed} live=${live}`
    );
    for (const f of result.fetches) {
      console.log(
        `  ${f.partnerId}: ${f.mode} markets=${f.markets.length}${f.error ? ` err=${f.error}` : ''}`
      );
    }
    if (result.error) console.error(result.error);
  }
  if (!result.ok) process.exitCode = 1;
}

async function cmdSeed(args: string[]) {
  const report = await seedAll();
  if (flag(args, '--json')) {
    console.log(JSON.stringify(report, null, 2)); // console-ok
  } else {
    console.log(
      `seeded leagues=${report.leagues} teams=${report.teams} marketTypes=${report.marketTypes} bookmakers=${report.bookmakers}`
    );
  }
}

async function cmdNormalizeOdds(args: string[]) {
  const host = opt(args, '--host');
  if (!host) {
    console.error('--host is required');
    process.exit(2);
  }
  const fixtureId = opt(args, '--fixture', host.split('.')[0] ?? host)!;
  const session = (opt(args, '--session', 'pregame') as 'pregame' | 'live') ?? 'pregame';
  const path = joinPath(FIXTURES_DIR, 'odds', `${fixtureId}.json`);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`fixture not found: ${path}`);
    process.exit(2);
  }
  await seedAll();
  const text = await file.text();
  const snapshot = parseOddsJson(text, { host, source: 'fixture' });
  // Stagger timestamps slightly when re-ingesting so history can show movement
  const tsBump = Number(opt(args, '--ts-bump', '0'));
  if (tsBump) snapshot.timestamp = snapshot.timestamp + tsBump;

  const result = await enrichOdds(snapshot, { session, storeBlob: true, minMovePct: 1 });
  console.log(
    JSON.stringify(
      {
        host,
        fixture: fixtureId,
        blobId: result.blob?.id ?? null,
        lines: result.lines,
        events: result.events,
        provenance: {
          eventIds: result.provenance.eventIds,
          mappingIds: result.provenance.mappingIds,
          historyRows: result.provenance.historyRows,
          movements: result.provenance.movements.length,
        },
      },
      null,
      2
    )
  );
}

async function cmdMovements(args: string[]) {
  await seedAll();
  // Default window: ~10 years so fixture/historical timestamps are included.
  const movements = detectNotableMovements({
    minAbsPct: Number(opt(args, '--minPct', '1')),
    sinceMs: Date.now() - Number(opt(args, '--sinceMin', '5256000')) * 60 * 1000,
    limit: Number(opt(args, '--limit', '50')),
  });
  if (flag(args, '--json')) {
    console.log(JSON.stringify({ count: movements.length, movements }, null, 2)); // console-ok
  } else {
    console.log(`# ${movements.length} movements`);
    for (const m of movements) {
      console.log(
        `mapping=${m.mappingId} ${m.selection} ${m.direction} ${m.percentageChange.toFixed(2)}% ${m.from}→${m.to} Δt=${m.timeDeltaMs}ms`
      );
    }
  }
}

async function cmdDelays(args: string[]) {
  await seedAll();
  const eventId = Number(opt(args, '--eventId'));
  if (!Number.isFinite(eventId) || eventId <= 0) {
    console.error('--eventId is required');
    process.exit(2);
  }
  const market = opt(args, '--market', 'moneyline')!;
  const marketTypeId = getMarketTypeId(market);
  if (marketTypeId == null) {
    console.error(`Unknown market: ${market}`);
    process.exit(2);
  }
  const delays = detectDelays(eventId, marketTypeId, {
    selection: opt(args, '--selection'),
  });
  console.log(JSON.stringify({ eventId, market, delays }, null, 2)); // console-ok
}

async function cmdArb(args: string[]) {
  await seedAll();
  const opportunities = detectCrossBookArbitrage({
    minEdgePct: Number(opt(args, '--minEdgePct', '1.5')),
    market: opt(args, '--market'),
    eventId: opt(args, '--eventId') ? Number(opt(args, '--eventId')) : undefined,
  });
  if (flag(args, '--json')) {
    console.log(JSON.stringify({ count: opportunities.length, opportunities }, null, 2)); // console-ok
    return;
  }
  console.log(`# ${opportunities.length} arbitrage opportunities`);
  for (const a of opportunities) {
    const legs = a.legs
      .map(l => `${l.selection}@${l.bookmaker} ${l.oddsDecimal.toFixed(3)}`)
      .join(' · ');
    console.log(
      `${a.edgePct.toFixed(2)}%  ${a.homeTeam ?? '?'} vs ${a.awayTeam ?? '?'}  invSum=${a.invSum.toFixed(4)}  ${legs}`
    );
  }
}

/**
 * Live multi-book edge scan (snapshot arb/value/steam) — deeper than provenance arb alone.
 */
async function cmdEdgeScan(args: string[]) {
  const hostsRaw =
    opt(args, '--hosts') ?? 'hardrock.bet,sportsbook.draftkings.com,www.pinnacle.com';
  const hosts = hostsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let seedFixtures: Record<string, string> | undefined;
  if (flag(args, '--seed-arb')) {
    seedFixtures = {
      'hardrock.bet': 'hardrock-arb',
      'sportsbook.draftkings.com': 'draftkings-arb',
    };
  } else if (flag(args, '--seed-value')) {
    seedFixtures = {
      'www.pinnacle.com': 'pinnacle',
      'hardrock.bet': 'hardrock',
      'sportsbook.draftkings.com': 'draftkings',
    };
  } else if (flag(args, '--seed-fixtures')) {
    seedFixtures = Object.fromEntries(
      hosts.map(h => {
        const id = h.replace(/^www\./, '').split('.')[0] ?? h;
        return [h, id];
      })
    );
  }

  const report = await runEdgeScan({
    hosts,
    seedFixtures,
    fixtureFallback: !flag(args, '--no-fixture'),
    store: !flag(args, '--no-store'),
    minArbEdge: Number(opt(args, '--minEdgePct', '1.5')) / 100,
    minEvPct: Number(opt(args, '--minEvPct', '2')),
    includeHistoryPatterns: flag(args, '--history'),
  });
  report.signals = rankSignals(report.signals);

  if (flag(args, '--json')) {
    console.log(JSON.stringify(report, null, 2)); // console-ok
    return;
  }
  console.log(
    inspect(
      {
        hosts: report.hosts,
        snapshots: report.snapshots,
        summary: report.summary,
        top: report.signals.slice(0, 12).map(s => ({
          type: s.type,
          host: String(s.host),
          confidence: +s.confidence.toFixed(3),
          details: s.details,
          meta: s.meta,
        })),
      },
      { depth: 5, colors: Boolean(Bun.enableANSIColors) }
    )
  );
}

async function cmdAlerts(args: string[]) {
  await seedAll();
  if (flag(args, '--evaluate')) {
    const alerts = await evaluateAlerts();
    console.log(JSON.stringify({ count: alerts.length, alerts, evaluated: true }, null, 2)); // console-ok
    return;
  }
  const alerts = listRecentAlerts(Number(opt(args, '--limit', '50')));
  console.log(JSON.stringify({ count: alerts.length, alerts }, null, 2)); // console-ok
}

async function cmdHistory(args: string[]) {
  await seedAll();
  const eventId = Number(opt(args, '--eventId'));
  if (!Number.isFinite(eventId) || eventId <= 0) {
    console.error('--eventId is required');
    process.exit(2);
  }
  const series = queryOddsHistorySeries({
    eventId,
    market: opt(args, '--market', 'moneyline'),
    selection: opt(args, '--selection'),
    bucketMs: opt(args, '--bucketMs') ? Number(opt(args, '--bucketMs')) : undefined,
    limit: Number(opt(args, '--limit', '500')),
  });
  console.log(JSON.stringify(series, null, 2)); // console-ok
}

async function cmdSmartMoney(args: string[]) {
  await seedAll();
  const signals = await detectSmartMoney({
    sinceMs: 1,
    limit: Number(opt(args, '--limit', '50')),
  });
  console.log(JSON.stringify({ count: signals.length, signals }, null, 2)); // console-ok
}

/**
 * Thin UX sugar over tools/baseline-scrape-book.ts (Tier 4 book agents).
 * Does not belong on `factory` (R2 registry lane).
 */
async function cmdScrape(args: string[]) {
  const kind = args[0];
  if (kind !== 'odds') {
    console.error(
      'Usage: bun run agent scrape odds --source <bookId> [--live] [--html]\n' +
        '   or: bun run scrape:odds <bookId> [--live]\n' +
        'Sink: artifacts/raw-limits/<bookId>.jsonl'
    );
    process.exitCode = 1;
    return;
  }
  const rest = args.slice(1);
  const sourceEq = rest.find(a => a.startsWith('--source='))?.slice('--source='.length);
  const sourceFlag = opt(rest, '--source', '') || sourceEq || '';
  const positional = rest.find(a => !a.startsWith('-'));
  const bookRaw = (sourceFlag || positional || '').trim();
  if (!bookRaw) {
    const { trackedScrapeBooks } = await import('../lib/operations/scrapers/books/registry.ts');
    console.error(
      'Usage: bun run agent scrape odds --source <bookId> [--live] [--html]\n' +
        `Registered: ${trackedScrapeBooks().join(', ')}\n` +
        'Alias: bun run scrape:odds <bookId>'
    );
    process.exitCode = 1;
    return;
  }
  const { parseSportsbookId } = await import('../lib/types/branded.ts');
  const { runBookCli } = await import('./baseline-scrape-book.ts');
  const flags = rest.filter(a => a.startsWith('--') && !a.startsWith('--source'));
  await runBookCli(parseSportsbookId(bookRaw), flags);
}

async function cmdQueryOdds(args: string[]) {
  await seedAll();
  const rows = queryNormalizedOdds({
    sport: opt(args, '--sport'),
    league: opt(args, '--league'),
    market: opt(args, '--market'),
    host: opt(args, '--host'),
    bookmaker: opt(args, '--bookmaker'),
    session: opt(args, '--session') as 'pregame' | 'live' | undefined,
    limit: Number(opt(args, '--limit', '50')),
  });
  if (flag(args, '--json')) {
    console.log(JSON.stringify({ count: rows.length, rows }, null, 2)); // console-ok
  } else {
    console.log(`# ${rows.length} normalized lines`);
    for (const r of rows) {
      console.log(
        [
          r.host ?? '—',
          r.league ?? '—',
          r.homeTeam && r.awayTeam ? `${r.homeTeam} vs ${r.awayTeam}` : '—',
          r.marketCode ?? '—',
          r.selection,
          r.oddsDecimal?.toFixed(3) ?? '—',
          r.oddsAmerican ?? '—',
        ].join('\t')
      );
    }
  }
}

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('agent', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

switch (cmd) {
  case 'seeds':
    await cmdSeeds(rest);
    break;
  case 'batch-enrich':
    await cmdBatchEnrich(rest);
    break;
  case 'detect-stack':
    await cmdDetectStack(rest);
    break;
  case 'partner-coverage':
    await cmdCoverage(rest);
    break;
  case 'research':
    await cmdResearch(rest);
    break;
  case 'research-cycle':
    await cmdResearchCycle(rest);
    break;
  case 'detect-edges':
    await cmdDetectEdges(rest);
    break;
  case 'edge-scan':
    await cmdEdgeScan(rest);
    break;
  case 'monitor-odds':
    await cmdMonitorOdds(rest);
    break;
  case 'odds-dashboard':
    await cmdOddsDashboard(rest);
    break;
  case 'check-version':
    await cmdCheckVersion(rest);
    break;
  case 'test-webview':
    await cmdTestWebView(rest);
    break;
  case 'test-image':
    await cmdTestImage(rest);
    break;
  case 'doctor':
    await cmdDoctor(rest);
    break;
  case 'serve':
    await cmdServe(rest);
    break;
  case 'registry-readme':
    await cmdRegistryReadme(rest);
    break;
  case 'scrape':
    await cmdScrape(rest);
    break;
  case 'seed':
    await cmdSeed(rest);
    break;
  case 'normalize-odds':
    await cmdNormalizeOdds(rest);
    break;
  case 'query-odds':
    await cmdQueryOdds(rest);
    break;
  case 'movements':
    await cmdMovements(rest);
    break;
  case 'delays':
    await cmdDelays(rest);
    break;
  case 'arb':
  case 'arbitrage':
    await cmdArb(rest);
    break;
  case 'alerts':
    await cmdAlerts(rest);
    break;
  case 'history':
    await cmdHistory(rest);
    break;
  case 'smart-money':
    await cmdSmartMoney(rest);
    break;
  default:
    usage();
}
