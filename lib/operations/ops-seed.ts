// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Demo seed for operations portal — populates SQLite when empty so
 * `ops:snapshot` → `/registry/ops-summary.json` renders live panels on Pages.
 *
 * @see tools/ops-seed.ts
 * @see lib/operations/ops-summary.ts
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import { PlaySigner } from './play-signing.ts';

export type SeedOperationsDemoOpts = {
  /** Insert even when experts already exist (adds a fresh demo slice). */
  force?: boolean;
  /** Only seed when experts table is empty (default true). */
  ifEmpty?: boolean;
};

export type SeedOperationsDemoResult = {
  seeded: boolean;
  reason?: string;
  experts?: number;
  plays?: number;
  liquidity?: number;
};

export function isOperationsDbEmpty(db: Database): boolean {
  try {
    const row = db.query(`SELECT COUNT(*) AS n FROM experts`).get() as { n: number };
    return (row?.n ?? 0) === 0;
  } catch {
    return true;
  }
}

/** Populate demo experts, tree, plays, rails, growth, and experiments. */
export async function seedOperationsDemo(
  db: Database,
  opts?: SeedOperationsDemoOpts
): Promise<SeedOperationsDemoResult> {
  const ifEmpty = opts?.ifEmpty ?? true;
  if (!opts?.force && ifEmpty && !isOperationsDbEmpty(db)) {
    return { seeded: false, reason: 'experts already present (use --force to add anyway)' };
  }

  const now = new Date().toISOString();
  const period = now.slice(0, 7);
  const signer = new PlaySigner();

  const experts = [
    { name: 'Edge NBA', sport: 'NBA', market: 'totals', edge: 0.74 },
    { name: 'Sharp NFL', sport: 'NFL', market: 'spread', edge: 0.68 },
    { name: 'Kalshi Tennis', sport: 'Tennis', market: 'moneyline', edge: 0.61 },
  ] as const;

  const expertIds: string[] = []; // brand-ok — demo seed ids
  for (const e of experts) {
    const id = randomUUIDv7();
    expertIds.push(id);
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, $name, $sport, $market, $edge, 1, $now)`,
      { $id: id, $name: e.name, $sport: e.sport, $market: e.market, $edge: e.edge, $now: now }
    );
  }

  const partnerA = randomUUIDv7();
  const partnerB = randomUUIDv7();
  const agent1 = randomUUIDv7();
  const agent2 = randomUUIDv7();
  const agent3 = randomUUIDv7();
  const subAgent = randomUUIDv7();

  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, rail_preference, active, created_at)
     VALUES ($pa, 'partner', NULL, $e0, 'Cascade Partner', NULL, 'paypal', 1, $now),
            ($pb, 'partner', NULL, $e1, 'Factory Rail Co', NULL, 'venmo', 1, $now),
            ($a1, 'agent', $pa, $e0, 'Agent Alpha', 'tg-alpha', 'paypal', 1, $now),
            ($a2, 'agent', $pa, $e0, 'Agent Beta', 'tg-beta', 'paypal', 1, $now),
            ($a3, 'agent', $pb, $e1, 'Agent Gamma', 'tg-gamma', 'venmo', 1, $now),
            ($sa, 'sub_agent', $a1, $e0, 'Sub Scout', 'tg-scout', 'paypal', 1, $now)`,
    {
      $pa: partnerA,
      $pb: partnerB,
      $e0: expertIds[0],
      $e1: expertIds[1],
      $a1: agent1,
      $a2: agent2,
      $a3: agent3,
      $sa: subAgent,
      $now: now,
    }
  );

  const accounts = [
    { agent: agent1, book: 'fanduel', balance: 18_500 },
    { agent: agent1, book: 'draftkings', balance: 12_200 },
    { agent: agent2, book: 'betmgm', balance: 9_800 },
    { agent: agent3, book: 'caesars', balance: 7_400 },
  ] as const;

  for (const ac of accounts) {
    db.run(
      `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, created_at)
       VALUES ($id, $aid, $book, $user, $bal, 'active', $now)`,
      {
        $id: randomUUIDv7(),
        $aid: ac.agent,
        $book: ac.book,
        $user: `${ac.book}-demo`,
        $bal: ac.balance,
        $now: now,
      }
    );
  }

  const railPaypal = randomUUIDv7();
  const railVenmo = randomUUIDv7();
  db.run(
    `INSERT INTO rails (id, type, agent_id, identifier, daily_limit, monthly_limit, total_sent, status, created_at)
     VALUES ($rp, 'paypal', $a1, 'ops@factory-wager.com', 75000, 300000, 42000, 'active', $now),
            ($rv, 'venmo', $a3, '@factory-rail', 25000, 100000, 12800, 'active', $now)`,
    { $rp: railPaypal, $rv: railVenmo, $a1: agent1, $a3: agent3, $now: now }
  );

  db.run(
    `INSERT INTO operations (id, total_liquidity, total_exposure, updated_at)
     VALUES ('main', 520000, 18500, $now)
     ON CONFLICT(id) DO UPDATE SET total_liquidity = excluded.total_liquidity, updated_at = excluded.updated_at`,
    { $now: now }
  );

  const playSpecs = [
    {
      expertId: expertIds[0]!,
      sport: 'NBA',
      market: 'totals',
      event: 'LAL vs GSW',
      selection: 'over 228.5',
      odds: -108,
      stakeRecommended: 5000,
      confidence: 0.71,
      result: 'win' as const,
      pnl: 4620,
    },
    {
      expertId: expertIds[0]!,
      sport: 'NBA',
      market: 'spread',
      event: 'BOS vs MIA',
      selection: 'BOS -3.5',
      odds: -105,
      stakeRecommended: 3500,
      confidence: 0.66,
      result: 'loss' as const,
      pnl: -3500,
    },
    {
      expertId: expertIds[1]!,
      sport: 'NFL',
      market: 'spread',
      event: 'KC vs BUF',
      selection: 'KC -2.5',
      odds: -110,
      stakeRecommended: 4000,
      confidence: 0.63,
      result: 'pending' as const,
      pnl: null,
    },
    {
      expertId: expertIds[2]!,
      sport: 'Tennis',
      market: 'moneyline',
      event: 'Sinner vs Alcaraz',
      selection: 'Sinner ML',
      odds: +125,
      stakeRecommended: 2000,
      confidence: 0.58,
      result: 'win' as const,
      pnl: 2500,
    },
  ];

  const agentNodes = [agent1, agent2, agent3, subAgent];
  let playCount = 0;

  for (const spec of playSpecs) {
    const play = await signer.publish(
      {
        expertId: spec.expertId,
        sport: spec.sport,
        market: spec.market,
        event: spec.event,
        selection: spec.selection,
        odds: spec.odds,
        stakeRecommended: spec.stakeRecommended,
        confidence: spec.confidence,
      },
      db
    );
    playCount++;
    if (spec.result !== 'pending') {
      db.run(`UPDATE plays SET result = $res, pnl = $pnl, closed_at = $now WHERE id = $id`, {
        $res: spec.result,
        $pnl: spec.pnl,
        $now: now,
        $id: play.id,
      });
    }
    for (const nodeId of agentNodes) {
      const placed = nodeId === agent1 || nodeId === agent3;
      db.run(
        `INSERT INTO play_distribution (play_id, node_id, channel, received_at, acted_at, status, stake_actual, odds_actual)
         VALUES ($pid, $nid, 'telegram', $now, $acted, $status, $stake, $odds)
         ON CONFLICT(play_id, node_id) DO NOTHING`,
        {
          $pid: play.id,
          $nid: nodeId,
          $now: now,
          $acted: placed ? now : null,
          $status: placed ? 'placed' : 'received',
          $stake: placed ? spec.stakeRecommended * 0.8 : null,
          $odds: placed ? spec.odds : null,
        }
      );
    }
  }

  for (const [nodeId, received, placed, volume, pnl] of [
    [agent1, 12, 9, 48_000, 6200],
    [agent2, 8, 5, 22_000, -1100],
    [agent3, 6, 4, 18_500, 2800],
    [partnerA, 20, 14, 70_000, 7900],
  ] as const) {
    db.run(
      `INSERT INTO growth_metrics (node_id, period, plays_received, plays_placed, volume, pnl, new_sub_agents, new_accounts)
       VALUES ($nid, $period, $recv, $placed, $vol, $pnl, 0, 0)
       ON CONFLICT(node_id, period) DO UPDATE SET
         plays_received = excluded.plays_received,
         plays_placed = excluded.plays_placed,
         volume = excluded.volume,
         pnl = excluded.pnl`,
      {
        $nid: nodeId,
        $period: period,
        $recv: received,
        $placed: placed,
        $vol: volume,
        $pnl: pnl,
      }
    );
  }

  const expActive = randomUUIDv7();
  const expDone = randomUUIDv7();
  const varA = randomUUIDv7();
  const varB = randomUUIDv7();

  db.run(
    `INSERT INTO experiments (id, name, status, hypothesis, factors_json, design_json, fraction_denom, design_method, metric_name, activated_at, created_at, updated_at)
     VALUES ($ea, 'Partner policy factorial', 'active', 'Higher cut improves placement rate', '[]', '{}', 1, 'full', 'placement_rate', $now, $now, $now),
            ($ed, 'Rail timing switchback', 'completed', 'Morning sends outperform evening', '[]', '{}', 1, 'switchback', 'win_rate', $now, $now, $now)`,
    { $ea: expActive, $ed: expDone, $now: now }
  );
  db.run(
    `INSERT INTO experiment_variants (id, experiment_id, variant_index, config_json, config_key, name, weight)
     VALUES ($va, $ea, 0, '{"cut":0.05}', 'cut-low', 'Low cut', 1),
            ($vb, $ea, 1, '{"cut":0.10}', 'cut-high', 'High cut', 1)`,
    { $va: varA, $vb: varB, $ea: expActive }
  );
  db.run(
    `INSERT INTO experiment_assignments (id, experiment_id, partner_id, variant_id, config_json, assigned_at)
     VALUES ($id1, $ea, $pa, $va, '{"cut":0.05}', $now),
            ($id2, $ea, $pb, $vb, '{"cut":0.10}', $now)`,
    {
      $id1: randomUUIDv7(),
      $id2: randomUUIDv7(),
      $ea: expActive,
      $pa: partnerA,
      $pb: partnerB,
      $va: varA,
      $vb: varB,
      $now: now,
    }
  );
  db.run(
    `INSERT INTO experiment_metrics (id, experiment_id, partner_id, metric_name, metric_value, recorded_at)
     VALUES ($m1, $ea, $pa, 'placement_rate', 0.72, $now),
            ($m2, $ea, $pb, 'placement_rate', 0.64, $now)`,
    {
      $m1: randomUUIDv7(),
      $m2: randomUUIDv7(),
      $ea: expActive,
      $pa: partnerA,
      $pb: partnerB,
      $now: now,
    }
  );

  db.run(
    `INSERT INTO phones (id, model, imei, carrier, data_plan, assigned_to, status, issued_at)
     VALUES ($p1, 'iPhone 15', 'demo-imei-001', 'T-Mobile', '10GB', $a1, 'issued', $now),
            ($p2, 'Pixel 8', 'demo-imei-002', 'Verizon', '5GB', NULL, 'inventory', NULL),
            ($p3, 'iPhone 14', 'demo-imei-003', 'AT&T', '5GB', NULL, 'returned', $now)`,
    { $p1: randomUUIDv7(), $p2: randomUUIDv7(), $p3: randomUUIDv7(), $a1: agent1, $now: now }
  );

  const liquidity = db
    .query(`SELECT COALESCE(SUM(balance), 0) AS total FROM sb_accounts WHERE status = 'active'`)
    .get() as { total: number };

  return {
    seeded: true,
    experts: experts.length,
    plays: playCount,
    liquidity: liquidity.total,
  };
}
