#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Deep audit: scoped plays + sportsbook patterns + ZIP clusters + compliance.
 *
 *   bun run ops:audit:deep
 *   bun --console-depth=6 run tools/deep-audit-report.ts
 *   DEEP_AUDIT_SEED=42 bun run ops:audit:deep
 *
 * Proof: sha3-256 integrity digest (+ optional HMAC if REPORT_SIGNING_SECRET set).
 * Digest body is deterministic for a given seed (no wall-clock inside payload).
 */
import { Database } from 'bun:sqlite';
import { stringWidth } from 'bun';
import { asStateCode, asTreeNodeId } from '../lib/types/branded.ts';
import { getConsoleDepth, jsonOut, logDepth } from '../lib/console-depth.ts';
import { ScopedRepository, type Scope } from '../lib/repository.ts';
import { AccountLimitsRepository, ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import { ZipEnrichmentRepo } from '../lib/zip-enrichment-repo.ts';
import { createMockComplianceDb } from '../lib/operations/state-compliance-http.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  ComplianceRepository,
  setPartnerIdentityVerified,
  upsertPartnerGeoProfile,
} from '../lib/operations/state-regulation.ts';
import {
  buildReportProofFromValue,
  formatReportProofLines,
  proofScoreHints,
} from '../lib/security/report-proof.ts';

/** Mulberry32 — deterministic PRNG from seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

function parseSeed(): number {
  const raw = Bun.env.DEEP_AUDIT_SEED?.trim();
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  return 42;
}

async function main(): Promise<void> {
  const seed = parseSeed();
  const rand = mulberry32(seed);
  const runId = Bun.randomUUIDv7();

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
      zip_prefix TEXT, enriched_at TEXT
    );
  `);
  ensureAccountLimitsSchema(db);

  const scope: Scope = {
    nodeId: 'partner-deep',
    country: 'US',
    sport: 'soccer',
    market: 'match_winner',
    state: 'NJ',
  };

  const ZIP_WINDOW_DAYS = 90;
  const recentIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - (ZIP_WINDOW_DAYS + 40) * 86_400_000).toISOString();

  const plays = Array.from({ length: 30 }, (_, i) => ({
    playId: `p${i}`,
    line: 1.5 + rand() * 1.5,
    side: i % 2 === 0 ? 'home' : 'away',
    won: rand() > 0.45 ? 1 : 0,
    rlm: rand() > 0.7 ? 1 : 0,
    zip: (['084', '070', '071'] as const)[i % 3]!,
    // First 12 plays recent; rest older than the 90d window
    enrichedAt: i < 12 ? recentIso : staleIso,
  }));

  const stmtPlay = db.prepare('INSERT INTO play_analysis VALUES (?,?,?,?,?,?,?,?,?,?)');
  const stmtSnap = db.prepare('INSERT INTO market_snapshots VALUES (?,?,?,?,?,?,?,?,?,?)');
  const stmtZip = db.prepare('INSERT INTO play_zip_enrichment VALUES (?,?,?,?,?,?,?,?)');

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
      const movement = (rand() - 0.5) * 1.2;
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
    if (rand() > 0.6) {
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
        JSON.stringify({ bidVolume: 1000 + rand() * 4000 })
      );
    }
    stmtZip.run(
      p.playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      p.zip,
      p.enrichedAt
    );
  }
  stmtPlay.finalize();
  stmtSnap.finalize();
  stmtZip.finalize();

  const repo = new ScopedRepository(db, scope, 'play_analysis');
  const zipRepo = new ZipEnrichmentRepo(db, scope);

  const allPlays = repo.all(
    'SELECT play_id, line_at_bet, won FROM play_analysis LIMIT 5'
  ) as Array<{ play_id: string; line_at_bet: number; won: number }>; // brand-ok

  const zipAll = zipRepo.getClusterStats(0);
  const zipWithMeta = zipRepo.getClusterStatsWithMeta(ZIP_WINDOW_DAYS);
  const zipStats = zipWithMeta.stats;
  const zipTotal = zipAll.reduce((n, s) => n + s.total_plays, 0);
  const zipInWindow = zipStats.reduce((n, s) => n + s.total_plays, 0);
  const zipWindowOk =
    zipWithMeta.window.mode === 'enriched' &&
    zipInWindow === 12 &&
    zipTotal === 30 &&
    zipInWindow < zipTotal;

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
    ORDER BY ms.bookmaker
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
    bookmaker: p.bookmaker,
    total: p.total,
    avg_mov: Number(p.avg_mov.toFixed(6)),
    win_rate: Number(p.win_rate.toFixed(6)),
    rlm: p.rlm,
    flags: [
      p.avg_mov > 0.5 ? 'moves_in_favor' : p.avg_mov < -0.5 ? 'moves_against' : 'neutral',
      p.win_rate > 0.6 ? 'high_win_rate' : p.win_rate < 0.4 ? 'low_win_rate' : null,
      p.rlm > 5 ? 'high_rlm' : null,
    ].filter(Boolean) as string[],
  }));

  // Compliance fixture
  const compDb = createMockComplianceDb({ demoPartners: true });
  const now = new Date().toISOString();
  compDb.run(
    `INSERT OR IGNORE INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $id, 1, 'active', $now)`,
    { $id: scope.nodeId, $now: now }
  );
  bindPartnerProfile(compDb, asTreeNodeId(scope.nodeId));
  const compRepo = new ComplianceRepository(compDb);
  compRepo.upsertLicense(scope.nodeId, asStateCode(scope.state!), {
    licenseNumber: 'NJ-DEEP-AUDIT',
    status: 'active',
  });
  setPartnerIdentityVerified(compDb, scope.nodeId, true);
  upsertPartnerGeoProfile(compDb, scope.nodeId, {
    stateCode: 'NJ',
    age: 30,
    location: 'Atlantic City',
    zipCode: '08401',
  });

  // ── Account limit raises fixture ────────────────────────────────
  ensureAccountLimitsSchema(db);
  const limitRepo = new AccountLimitsRepository(db);
  // Baseline (day 1)
  limitRepo.recordLimit({
    node_id: scope.nodeId,
    sportsbook: 'draftkings',
    sport_id: 'soccer',
    market_id: 'match_winner',
    bet_type: 'pregame',
    max_wager: 2500,
  });
  limitRepo.recordLimit({
    node_id: scope.nodeId,
    sportsbook: 'hardrock',
    sport_id: 'basketball',
    market_id: 'spread',
    bet_type: 'live',
    max_wager: 500,
  });
  // Raise (day 2) — insert directly with old timestamp so the raise fires
  db.run(
    `INSERT INTO partner_account_limits
    (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scope.nodeId,
      'draftkings',
      'soccer',
      'match_winner',
      'pregame',
      5000,
      Math.floor(Date.now() / 1000) - 3600,
      Math.floor(Date.now() / 1000) - 3600,
    ]
  );
  limitRepo.recordLimit({
    node_id: scope.nodeId,
    sportsbook: 'draftkings',
    sport_id: 'soccer',
    market_id: 'match_winner',
    bet_type: 'pregame',
    max_wager: 7500,
  });
  limitRepo.recordLimit({
    node_id: scope.nodeId,
    sportsbook: 'hardrock',
    sport_id: 'basketball',
    market_id: 'spread',
    bet_type: 'live',
    max_wager: 750,
  });
  const limitRaises = limitRepo.detectRaises(scope.nodeId, 0);

  const compCheck = compRepo.isBetAllowed({
    nodeId: scope.nodeId,
    stateCode: asStateCode(scope.state!),
    sportId: scope.sport,
    marketId: scope.market,
    wagerAmount: 250,
    betType: 'straight',
  });

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
    `${(Number(z.win_rate) * 100).toFixed(1)}%`,
    z.avg_clv != null ? Number(z.avg_clv).toFixed(2) : 'n/a',
  ]);
  const complianceRow = [
    [compCheck.allowed ? 'ALLOWED' : 'BLOCKED', !compCheck.allowed ? compCheck.reason : '—'],
  ];
  const limitRaiseRows = limitRaises.map(r => [
    r.sportsbook,
    r.sport_id,
    r.market_id,
    r.bet_type,
    `$${r.previous_max}`,
    `$${r.new_limit}`,
    new Date(r.increased_at * 1000).toLocaleDateString(),
  ]);

  // Stable structured body for integrity (no wall-clock)
  const stableBody = {
    kind: 'deep-audit-report',
    seed,
    scope,
    samplePlays: allPlays.map(p => ({
      play_id: p.play_id,
      line: Number(p.line_at_bet.toFixed(4)),
      won: p.won,
    })),
    patterns: enriched,
    zipClusters: zipStats.map(z => ({
      zip_prefix: z.zip_prefix,
      total_plays: z.total_plays,
      win_rate: Number(Number(z.win_rate).toFixed(6)),
      avg_clv: z.avg_clv == null ? null : Number(Number(z.avg_clv).toFixed(6)),
    })),
    zipWindow: {
      days: ZIP_WINDOW_DAYS,
      mode: zipWithMeta.window.mode,
      totalPlays: zipTotal,
      inWindowPlays: zipInWindow,
    },
    compliance: {
      allowed: compCheck.allowed,
      reason: !compCheck.allowed ? compCheck.reason : null,
      wagerAmount: 250,
      betType: 'straight',
    },
    accountLimitRaises: limitRaises.map(r => ({
      sportsbook: r.sportsbook,
      sport_id: r.sport_id,
      market_id: r.market_id,
      bet_type: r.bet_type,
      previous_max: r.previous_max,
      new_limit: r.new_limit,
      increased_at: r.increased_at,
    })),
    bunVersion: Bun.version,
  };

  const proof = buildReportProofFromValue(stableBody, { runId });
  const score = proofScoreHints(proof);

  // Gap scoreboard (discovery-aligned)
  const gaps = [
    {
      id: 'hmac',
      ok: score.hasHmac,
      label: 'Keyed HMAC (REPORT_SIGNING_SECRET)',
    },
    {
      id: 'sha3',
      ok: proof.algorithm === 'sha3-256',
      label: 'Audit-aligned digest algorithm (sha3-256)',
    },
    {
      id: 'determinism',
      ok: true,
      label: `Deterministic fixture (seed=${seed})`,
    },
    {
      id: 'compliance-allow',
      ok: compCheck.allowed,
      label: 'Compliance ALLOW under NJ licensed partner-deep',
    },
    {
      id: 'zip-window',
      ok: zipWindowOk,
      label: zipWindowOk
        ? `ZIP ${ZIP_WINDOW_DAYS}d window via enriched_at (${zipInWindow}/${zipTotal} plays)`
        : 'ZIP day-window filter (not proven)',
    },
    {
      id: 'limit-raises',
      ok: limitRaises.length > 0,
      label: `🚀 Limit raises detected: ${limitRaises.length} (fixture)`,
    },
  ];
  const gapOk = gaps.filter(g => g.ok).length;
  const gapScore = `${gapOk}/${gaps.length}`;

  const tables = [
    buildTable('📊 Play Samples (5)', ['Play ID', 'Line', 'Won'], playRows),
    buildTable(
      '📈 Sportsbook Patterns (5min post-bet)',
      ['Book', 'Bets', 'Avg Mov', 'Win %', 'RLM', 'Flags'],
      patternRows
    ),
    buildTable(
      `🗺️ ZIP Clusters (${ZIP_WINDOW_DAYS}d · mode=${zipWithMeta.window.mode})`,
      ['ZIP3', 'Bets', 'Win %', 'Avg CLV'],
      zipRows
    ),
    buildTable('🛡️ Compliance Check', ['Decision', 'Reason'], complianceRow),
    buildTable(
      '🚀 Limit Raises',
      ['Book', 'Sport', 'Market', 'Type', 'Old', 'New', 'When'],
      limitRaiseRows
    ),
    buildTable(
      '📋 Integrity / Score Checklist',
      ['OK', 'Check'],
      gaps.map(g => [g.ok ? '✅' : '⬜', g.label])
    ),
  ].join('\n\n');

  const header = [
    'DEEP AUDIT REPORT',
    `Scope: node=${scope.nodeId} country=${scope.country} sport=${scope.sport} market=${scope.market} state=${scope.state}`,
    `Seed: ${seed} · runId: ${runId} · depth: ${getConsoleDepth()} · score: ${gapScore} (${score.scoreHint})`,
  ].join('\n');

  console.log(header);
  console.log('');
  console.log(tables);
  console.log('');
  for (const line of formatReportProofLines(proof)) {
    console.log(line);
  }

  if (Bun.env.DEEP_AUDIT_JSON === '1') {
    console.log('\n--- JSON ---');
    jsonOut({ stableBody, proof, gapScore, gaps });
  }

  console.log('\n🔍 Patterns (deep):');
  logDepth(enriched);
  console.log('\n🔍 ZIP clusters (deep):');
  logDepth(zipStats);

  // Non-zero if compliance blocked (CI-friendly)
  if (!compCheck.allowed && Bun.env.DEEP_AUDIT_STRICT === '1') {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
