#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Deep audit: scoped plays + sportsbook patterns + ZIP clusters + compliance.
 *
 *   bun --console-depth=6 run tools/deep-audit-report.ts
 *   bun run ops:audit:deep
 *   cat tools/deep-audit-report.ts | bun --console-depth=6 run -
 */
import { Database } from 'bun:sqlite';
import { stringWidth, CryptoHasher } from 'bun';
import { asStateCode } from '../lib/types/branded.ts';
import { logDepth } from '../lib/console-depth.ts';
import { ScopedRepository, type Scope } from '../lib/repository.ts';
import { ZipEnrichmentRepo } from '../lib/zip-enrichment-repo.ts';
import {
  createMockComplianceDb,
  seedDemoCompliancePartners,
} from '../lib/operations/state-compliance-http.ts';
import { ComplianceRepository } from '../lib/operations/state-regulation.ts';

function pad(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - stringWidth(s)));
}

function buildTable(title: string, headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(stringWidth(h), ...rows.map(r => stringWidth(r[i] ?? '')))
  );
  const border = (l: string, j: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(j) + r;
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i]!)).join(' │ ') + ' │';
  return [
    `  ${title}`,
    border('┌', '┬', '┐'),
    line(headers),
    border('├', '┼', '┤'),
    ...rows.map(r => line(r)),
    border('└', '┴', '┘'),
  ].join('\n');
}

function signReport(report: string): string {
  const enc = new TextEncoder();
  const a = enc.encode(report);
  const b = enc.encode(`\nTimestamp: ${new Date().toISOString()}`);
  const payload = new Uint8Array(a.byteLength + b.byteLength);
  payload.set(a, 0);
  payload.set(b, a.byteLength);
  return new CryptoHasher('sha256').update(payload).digest('hex');
}

async function main(): Promise<void> {
  // ── 1. In-memory analysis DB + schema ──
  const db = new Database(':memory:');
  db.run(`
    CREATE TABLE play_analysis (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      line_at_bet REAL, side TEXT, won INT, rlm_flag INT
    );
    CREATE TABLE market_snapshots (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      bookmaker TEXT, snapshot_type TEXT, relative_time_sec INT, snapshot_data TEXT
    );
    CREATE TABLE play_zip_enrichment (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      zip_prefix TEXT
    );
  `);

  const scope: Scope = {
    nodeId: 'partner-deep',
    country: 'US',
    sport: 'soccer',
    market: 'match_winner',
    state: 'NJ',
  };

  const plays = Array.from({ length: 30 }, (_, i) => ({
    playId: `p${i}`,
    line: 1.5 + Math.random() * 1.5,
    side: i % 2 === 0 ? 'home' : 'away',
    won: Math.random() > 0.45 ? 1 : 0,
    rlm: Math.random() > 0.7 ? 1 : 0,
    zip: (['084', '070', '071'] as const)[i % 3]!,
  }));

  const stmtPlay = db.prepare('INSERT INTO play_analysis VALUES (?,?,?,?,?,?,?,?,?,?)');
  const stmtSnap = db.prepare('INSERT INTO market_snapshots VALUES (?,?,?,?,?,?,?,?,?,?)');
  const stmtZip = db.prepare('INSERT INTO play_zip_enrichment VALUES (?,?,?,?,?,?,?)');

  for (const p of plays) {
    stmtPlay.run(
      p.playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      p.line,
      p.side,
      p.won,
      p.rlm
    );
    for (const book of ['pinnacle', 'bet365', 'fonbet'] as const) {
      const movement = (Math.random() - 0.5) * 1.2;
      stmtSnap.run(
        p.playId,
        scope.nodeId,
        scope.country,
        scope.sport,
        scope.market,
        scope.state,
        book,
        'line',
        300,
        JSON.stringify({ line: p.line + movement })
      );
    }
    if (Math.random() > 0.6) {
      stmtSnap.run(
        p.playId,
        scope.nodeId,
        scope.country,
        scope.sport,
        scope.market,
        scope.state,
        'kalshi',
        'orderbook',
        300,
        JSON.stringify({ bidVolume: 1000 + Math.random() * 4000 })
      );
    }
    stmtZip.run(
      p.playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      p.zip
    );
  }
  stmtPlay.finalize();
  stmtSnap.finalize();
  stmtZip.finalize();

  // ── 2. Scoped repository queries ──
  const repo = new ScopedRepository(db, scope, 'play_analysis');
  const zipRepo = new ZipEnrichmentRepo(db, scope);

  const allPlays = repo.all(
    'SELECT play_id, line_at_bet, won FROM play_analysis LIMIT 5'
  ) as Array<{ play_id: string; line_at_bet: number; won: number }>; // brand-ok — analysis projection
  const zipStats = zipRepo.getClusterStats(90);

  // ── 3. Sportsbook pattern discovery (scoped via bind params — analysis layer) ──
  const patterns = db
    .query(
      `
    SELECT ms.bookmaker,
           COUNT(*) AS total,
           AVG(CAST(json_extract(ms.snapshot_data, '$.line') AS REAL) - pa.line_at_bet) AS avg_mov,
           AVG(CASE WHEN pa.won = 1 THEN 1.0 ELSE 0.0 END) AS win_rate,
           SUM(pa.rlm_flag) AS rlm
    FROM market_snapshots ms
    JOIN play_analysis pa ON pa.play_id = ms.play_id
    WHERE ms.snapshot_type = 'line' AND ms.relative_time_sec = 300
      AND pa.node_id = ? AND pa.country_code = ? AND pa.sport_id = ? AND pa.market_id = ? AND pa.state_code = ?
    GROUP BY ms.bookmaker
  `
    )
    .all(scope.nodeId, scope.country, scope.sport, scope.market, scope.state) as Array<{
    bookmaker: string;
    total: number;
    avg_mov: number;
    win_rate: number;
    rlm: number;
  }>;

  const enriched = patterns.map(p => ({
    ...p,
    flags: [
      p.avg_mov > 0.5 ? 'moves_in_favor' : p.avg_mov < -0.5 ? 'moves_against' : 'neutral',
      p.win_rate > 0.6 ? 'high_win_rate' : p.win_rate < 0.4 ? 'low_win_rate' : null,
      p.rlm > 5 ? 'high_rlm' : null,
    ].filter(Boolean) as string[],
  }));

  // ── 4. Compliance (seed partner-deep as NJ licensed for a meaningful ALLOW) ──
  const compDb = createMockComplianceDb({ demoPartners: true });
  const now = new Date().toISOString();
  compDb.run(
    `INSERT OR IGNORE INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $id, 1, 'active', $now)`,
    { $id: scope.nodeId, $now: now }
  );
  const compRepo = new ComplianceRepository(compDb);
  compRepo.upsertLicense(scope.nodeId, asStateCode(scope.state!), {
    licenseNumber: 'NJ-DEEP-AUDIT',
    status: 'active',
  });
  // Identity for NJ special rules
  const { setPartnerIdentityVerified, upsertPartnerGeoProfile } = await import(
    '../lib/operations/state-regulation.ts'
  );
  const { bindPartnerProfile } = await import('../lib/operations/partner-profile-bridge.ts');
  const { asTreeNodeId } = await import('../lib/types/branded.ts');
  bindPartnerProfile(compDb, asTreeNodeId(scope.nodeId));
  setPartnerIdentityVerified(compDb, scope.nodeId, true);
  upsertPartnerGeoProfile(compDb, scope.nodeId, {
    stateCode: 'NJ',
    age: 30,
    location: 'Atlantic City',
    zipCode: '08401',
  });

  const compCheck = compRepo.isBetAllowed({
    nodeId: scope.nodeId,
    stateCode: asStateCode(scope.state!),
    sportId: scope.sport,
    marketId: scope.market,
    wagerAmount: 250,
    betType: 'straight',
  });

  // Silence unused import path for demoPartners side-effect
  void seedDemoCompliancePartners;

  // ── 5. Tables ──
  const playRows = allPlays.map(p => [p.play_id, p.line_at_bet.toFixed(2), p.won ? '✅' : '❌']);
  const patternRows = enriched.map(p => [
    p.bookmaker,
    String(p.total),
    p.avg_mov.toFixed(3),
    `${(p.win_rate * 100).toFixed(1)}%`,
    String(p.rlm),
    p.flags.join(', ') || '—',
  ]);
  const zipRows = zipStats.map(z => [
    z.zip_prefix,
    String(z.total_plays),
    `${(z.win_rate * 100).toFixed(1)}%`,
    z.avg_clv != null ? z.avg_clv.toFixed(2) : 'n/a',
  ]);
  const complianceRow = [
    [compCheck.allowed ? 'ALLOWED' : 'BLOCKED', !compCheck.allowed ? compCheck.reason : '—'],
  ];

  const report = [
    `DEEP AUDIT REPORT – ${new Date().toISOString()}`,
    `Scope: node=${scope.nodeId} country=${scope.country} sport=${scope.sport} market=${scope.market} state=${scope.state}`,
    buildTable('📊 Play Samples (5)', ['Play ID', 'Line', 'Won'], playRows),
    buildTable(
      '📈 Sportsbook Patterns (5min post-bet)',
      ['Book', 'Bets', 'Avg Mov', 'Win %', 'RLM', 'Flags'],
      patternRows
    ),
    buildTable('🗺️ ZIP Cluster Stats (90d)', ['ZIP3', 'Bets', 'Win %', 'Avg CLV'], zipRows),
    buildTable('🛡️ Compliance Check', ['Decision', 'Reason'], complianceRow),
  ].join('\n\n');

  const sig = signReport(report);

  console.log(report);
  console.log(`\n📜 Signature: ${sig}`);
  console.log('\n🔍 Deep object dump (patterns):');
  logDepth(enriched);
  console.log('\n🔍 Deep object dump (zip clusters):');
  logDepth(zipStats);
}

if (import.meta.main) {
  await main();
}
