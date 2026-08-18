#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
/**
 * Curated operations demos wired to the lib/operations domain implementation.
 * Their `apis` metadata identifies the Bun symbols exercised; it is not a Bun
 * API coverage inventory or documentation authority.
 *
 * CLI: bun tools/bun-doc-refs.ts ops-oneliners [--json] [--run <id>] [--live]
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import { proofHash, proofPreview } from '../lib/bun-api-proof.ts';
import { inspectTable } from '../lib/console-depth.ts';
import { openOperationsDb, PlaySigner } from '../lib/operations/index.ts';
import { formatCliTable, toolTableVersion } from './cli-table.ts';

export type OpsOneliner = {
  id: string; // brand-ok — demo oneliner id
  summary: string;
  /** Bun token names exercised by this demo; resolved externally against official sources. */
  apis: readonly string[];
  /** Display link for this example; not documentation proof authority. */
  docs?: string;
  live?: boolean;
  run?: () => Promise<string> | string;
};

function seedOpsDb(db: Database): {
  expertId: string; // brand-ok — demo seed id
  partnerId: string; // brand-ok — demo seed id
  agentId: string; // brand-ok — demo seed id
  railId: string; // brand-ok — demo seed id
} {
  const now = new Date().toISOString();
  const expertId = randomUUIDv7();
  const partnerId = randomUUIDv7();
  const agentId = randomUUIDv7();
  const railId = randomUUIDv7();

  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ($id, 'Edge NBA', 'NBA', 'totals', 0.72, 1, $now)`,
    { $id: expertId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, rail_preference, active, created_at)
     VALUES ($pid, 'partner', NULL, $eid, 'Partner A', NULL, 'paypal', 1, $now)`,
    { $pid: partnerId, $eid: expertId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, rail_preference, active, created_at)
     VALUES ($aid, 'agent', $pid, $eid, 'Agent 1', 'tg-100', 'paypal', 1, $now)`,
    { $aid: agentId, $pid: partnerId, $eid: expertId, $now: now }
  );
  db.run(
    `INSERT INTO rails (id, type, agent_id, identifier, daily_limit, monthly_limit, total_sent, status, created_at)
     VALUES ($rid, 'paypal', $aid, 'ops@factory-wager.com', 50000, 200000, 0, 'active', $now)`,
    { $rid: railId, $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, created_at)
     VALUES ($sid, $aid, 'fanduel', 'agent1_fd', 5000, 'active', $now)`,
    { $sid: randomUUIDv7(), $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO operations (id, total_liquidity, total_exposure, updated_at) VALUES ('main', 500000, 0, $now)`,
    {
      $now: now,
    }
  );

  return { expertId, partnerId, agentId, railId };
}

function memoryOpsDb() {
  const db = openOperationsDb({ path: ':memory:' });
  seedOpsDb(db);
  return db;
}

export const OPS_ONELINERS: readonly OpsOneliner[] = [
  {
    id: 'onboard-partner',
    summary: 'Onboard partner node with proof hash',
    apis: ['Bun.randomUUIDv7', 'Bun.CryptoHasher', 'bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/utils#bun-randomuuidv7',
    run: () => {
      const db = memoryOpsDb();
      const id = randomUUIDv7();
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, rail_preference, active, created_at)
         VALUES ($id, 'partner', NULL, (SELECT id FROM experts LIMIT 1), 'Partner B', 'venmo', 1, $now)`,
        { $id: id, $now: now }
      );
      const row = db.query('SELECT name FROM tree_nodes WHERE id = $id').get({ $id: id }) as {
        name: string;
      };
      const hash = proofHash({ signature: 'partner-created', runtimeOutput: row.name });
      db.close();
      return `partner=${row.name} proof=${proofPreview(hash)}`;
    },
  },
  {
    id: 'fund-agent-rail',
    summary: 'Fund agent via PayPal rail',
    apis: ['bun:sqlite', 'Bun.CryptoHasher'],
    docs: 'https://bun.com/docs/runtime/sqlite',
    run: () => {
      const db = memoryOpsDb();
      const agent = db.query(`SELECT id FROM tree_nodes WHERE type = 'agent' LIMIT 1`).get() as {
        id: string; // brand-ok — opaque SQL primary key
      };
      const rail = db.query(`SELECT id FROM rails LIMIT 1`).get() as { id: string }; // brand-ok — opaque SQL primary key
      const amount = 10_000;
      const txId = randomUUIDv7();
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO funding (id, rail_id, from_operations, to_agent_id, amount, fee, net_amount, status, sent_at)
         VALUES ($id, $rid, 1, $aid, $amt, 0, $amt, 'sent', $now)`,
        { $id: txId, $rid: rail.id, $aid: agent.id, $amt: amount, $now: now }
      );
      db.run(`UPDATE sb_accounts SET balance = balance + $amt WHERE agent_id = $aid`, {
        $amt: amount,
        $aid: agent.id,
      });
      const bal = db
        .query(`SELECT balance FROM sb_accounts WHERE agent_id = $aid`)
        .get({ $aid: agent.id }) as { balance: number };
      const hash = proofHash({ signature: 'agent-funded', runtimeOutput: String(bal.balance) });
      db.close();
      return `funded=$${amount} balance=$${bal.balance} proof=${proofPreview(hash)}`;
    },
  },
  {
    id: 'generate-play',
    summary: 'Expert play HMAC-signed via PlaySigner',
    apis: ['Bun.CryptoHasher', 'Bun.randomUUIDv7', 'bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
    run: async () => {
      const db = memoryOpsDb();
      const expert = db.query(`SELECT id FROM experts LIMIT 1`).get() as { id: string }; // brand-ok — opaque SQL primary key
      const signer = new PlaySigner();
      const play = await signer.publish(
        {
          expertId: expert.id,
          sport: 'NBA',
          market: 'totals',
          event: 'LAL vs GSW',
          selection: 'over 225.5',
          odds: -110,
          stakeRecommended: 5000,
          confidence: 0.68,
        },
        db
      );
      db.close();
      return `play=stored sig=${/^[a-f0-9]{64}$/.test(play.signedHash)}`;
    },
  },
  {
    id: 'distribute-play',
    summary: 'Fan-out play to agent tree nodes',
    apis: ['bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/sqlite',
    run: async () => {
      const db = memoryOpsDb();
      const expert = db.query(`SELECT id FROM experts LIMIT 1`).get() as { id: string }; // brand-ok — opaque SQL primary key
      const signer = new PlaySigner();
      const play = await signer.publish(
        {
          expertId: expert.id,
          sport: 'NBA',
          market: 'spread',
          event: 'BOS vs MIA',
          selection: 'BOS -4.5',
          odds: -105,
          stakeRecommended: 2500,
        },
        db
      );
      const count = db
        .query(`SELECT COUNT(*) as n FROM play_distribution WHERE play_id = $pid`)
        .get({ $pid: play.id }) as { n: number };
      db.close();
      return `recipients=${count.n} play=stored`;
    },
  },
  {
    id: 'place-bet-webview',
    summary: 'WebView bet automation (live)',
    apis: ['Bun.WebView', 'Bun.sleep', 'Bun.write'],
    docs: 'https://bun.com/docs/runtime/webview',
    live: true,
    run: async () => {
      const wv = new Bun.WebView({ url: 'about:blank', title: 'ops-demo' });
      await Bun.sleep(100);
      wv.close();
      return 'webview=closed';
    },
  },
  {
    id: 'track-wager',
    summary: 'Close play with P&L',
    apis: ['bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/sqlite',
    run: async () => {
      const db = memoryOpsDb();
      const expert = db.query(`SELECT id FROM experts LIMIT 1`).get() as { id: string }; // brand-ok — opaque SQL primary key
      const signer = new PlaySigner();
      const play = await signer.publish(
        {
          expertId: expert.id,
          sport: 'NBA',
          market: 'moneyline',
          event: 'DEN vs PHX',
          selection: 'DEN ML',
          odds: -150,
          stakeRecommended: 3000,
        },
        db
      );
      const pnl = 2000;
      db.run(`UPDATE plays SET result = 'win', pnl = $pnl, closed_at = $now WHERE id = $id`, {
        $pnl: pnl,
        $now: new Date().toISOString(),
        $id: play.id,
      });
      const row = db.query(`SELECT pnl FROM plays WHERE id = $id`).get({ $id: play.id }) as {
        pnl: number;
      };
      db.close();
      return `pnl=$${row.pnl}`;
    },
  },
  {
    id: 'reconcile-rails',
    summary: 'Reconcile rail totals vs agent deposits',
    apis: ['bun:sqlite', 'Bun.inspect'],
    docs: 'https://bun.com/docs/runtime/utils#bun-inspect',
    run: () => {
      const db = memoryOpsDb();
      const rails = db.query(`SELECT COALESCE(SUM(total_sent), 0) as sent FROM rails`).get() as {
        sent: number;
      };
      const deposits = db
        .query(`SELECT COALESCE(SUM(balance), 0) as total FROM sb_accounts`)
        .get() as {
        total: number;
      };
      const diff = rails.sent - deposits.total;
      db.close();
      const ok = Math.abs(diff) < 100_000;
      return ok ? `reconciled diff=$${diff}` : `mismatch diff=$${diff}`;
    },
  },
  {
    id: 'phone-inventory',
    summary: 'Assign phone to agent from inventory',
    apis: ['bun:sqlite', 'Bun.randomUUIDv7'],
    docs: 'https://bun.com/docs/runtime/sqlite',
    run: () => {
      const db = memoryOpsDb();
      const agent = db.query(`SELECT id FROM tree_nodes WHERE type = 'agent' LIMIT 1`).get() as {
        id: string; // brand-ok — opaque SQL primary key
      };
      const phoneId = randomUUIDv7();
      db.run(
        `INSERT INTO phones (id, model, imei, carrier, data_plan, assigned_to, status, issued_at)
         VALUES ($id, 'iPhone 14', 'imei-demo-001', 'T-Mobile', '5GB', $aid, 'issued', $now)`,
        { $id: phoneId, $aid: agent.id, $now: new Date().toISOString() }
      );
      const row = db
        .query(`SELECT assigned_to FROM phones WHERE id = $id`)
        .get({ $id: phoneId }) as { assigned_to: string };
      db.close();
      return `phone=issued assigned=${row.assigned_to === agent.id}`;
    },
  },
  {
    id: 'daily-pnl-report',
    summary: 'P&L table via Bun.inspect.table',
    apis: ['bun:sqlite', 'Bun.inspect.table'],
    docs: 'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
    run: async () => {
      const db = memoryOpsDb();
      const expert = db.query(`SELECT id FROM experts LIMIT 1`).get() as { id: string }; // brand-ok — opaque SQL primary key
      const signer = new PlaySigner();
      await signer.publish(
        {
          expertId: expert.id,
          sport: 'NBA',
          market: 'totals',
          event: 'NYK vs BKN',
          selection: 'under 220',
          odds: -108,
          stakeRecommended: 1000,
        },
        db
      );
      db.run(`UPDATE plays SET result = 'win', pnl = 925 WHERE result = 'pending'`);
      const rows = db
        .query(`SELECT sport, COALESCE(SUM(pnl), 0) as total FROM plays GROUP BY sport`)
        .all() as { sport: string; total: number }[];
      const table = inspectTable(
        rows.map(r => [r.sport, r.total]),
        ['Sport', 'P&L'],
        { colors: false }
      );
      db.close();
      return table.includes('NBA') ? 'table=NBA' : 'table=empty';
    },
  },
  {
    id: 'auto-fund-cron',
    summary: 'Preview auto-fund cron and execute one cycle',
    apis: ['Bun.cron', 'bun:sqlite'],
    docs: 'https://bun.com/docs/runtime/cron',
    run: () => {
      const db = memoryOpsDb();
      const next = Bun.cron.parse('0 */6 * * *');
      const low = db.query(`SELECT id FROM sb_accounts WHERE balance < 10000 LIMIT 1`).get() as {
        id: string; // brand-ok — opaque SQL primary key
      } | null;
      if (low)
        db.run(`UPDATE sb_accounts SET balance = balance + 5000 WHERE id = $id`, {
          $id: low.id,
        });
      db.close();
      if (!next) throw new Error('auto-fund cron has no future occurrence');
      return `scheduled=${next.getTime() > Date.now()} funded=${low ? 'yes' : 'no'}`;
    },
  },
];

export function lookupOpsOneliner(id: string): OpsOneliner | undefined {
  // brand-ok — demo oneliner id
  return OPS_ONELINERS.find(d => d.id === id);
}

export async function runOpsOneliner(
  id: string, // brand-ok — demo oneliner id
  opts?: { live?: boolean }
): Promise<{ id: string; result: string }> {
  // brand-ok — demo oneliner id
  const d = lookupOpsOneliner(id);
  if (!d) throw new Error(`unknown ops oneliner: ${id}`);
  if (d.live && !opts?.live) throw new Error(`ops oneliner ${id} is live — pass --live`);
  if (!d.run) throw new Error(`ops oneliner ${id} has no run()`);
  const result = await d.run();
  return { id, result };
}

export function opsOnelinerCoveredApis(opts?: { includeLive?: boolean }): Set<string> {
  const includeLive = opts?.includeLive ?? true;
  const set = new Set<string>();
  for (const d of OPS_ONELINERS) {
    if (d.live && !includeLive) continue;
    for (const a of d.apis) set.add(a);
  }
  return set;
}

export function formatOpsOnelinersBlock(opts?: { id?: string }): string {
  // brand-ok — demo oneliner id
  const bun = toolTableVersion();
  const rows = OPS_ONELINERS.filter(d => !opts?.id || d.id === opts.id).map(d => ({
    id: d.id,
    live: d.live ? 'live' : 'offline',
    apis: d.apis.slice(0, 3).join(',') + (d.apis.length > 3 ? '…' : ''),
    summary: d.summary,
  }));
  if (!rows.length) return `unknown ops oneliner id: ${opts?.id}\n`;

  const lines = [
    'Operations one-liners (curated domain demos)',
    '',
    formatCliTable(
      rows,
      [
        { key: 'id', header: 'ID', maxWidth: 22 },
        { key: 'live', header: 'LIVE', maxWidth: 8 },
        { key: 'apis', header: 'APIS', maxWidth: 36 },
        { key: 'summary', header: 'SUMMARY', maxWidth: 40 },
      ],
      { indent: '  ', bun, cols: ['id', 'live', 'apis', 'summary'] }
    ).trimEnd(),
    '',
    '  Run: bun tools/bun-doc-refs.ts ops-oneliners --run <id> [--live]',
  ];

  if (opts?.id) {
    const d = lookupOpsOneliner(opts.id);
    if (d?.docs) lines.push('', `docs  ${d.docs}`, `apis  ${d.apis.join(', ')}`);
  }

  return `${lines.join('\n')}\n`;
}

export function opsOnelinersSnapshot() {
  return {
    bunVersion: Bun.version,
    count: OPS_ONELINERS.length,
    offline: OPS_ONELINERS.filter(d => !d.live).length,
    live: OPS_ONELINERS.filter(d => d.live).length,
    demoApis: [...opsOnelinerCoveredApis()].sort(),
    demos: OPS_ONELINERS.map(d => ({
      id: d.id,
      apis: d.apis,
      live: Boolean(d.live),
      summary: d.summary,
      docs: d.docs,
    })),
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const json = args.includes('--json') || args.includes('-j');
  const live = args.includes('--live');
  const idFlag = args.find(a => a.startsWith('--id='))?.slice('--id='.length);
  const runIdx = args.indexOf('--run');
  if (runIdx !== -1) {
    const id = args[runIdx + 1];
    if (!id) {
      console.error('usage: --run <id>');
      process.exit(1);
    }
    const { result } = await runOpsOneliner(id, { live });
    console.log(result);
    process.exit(0);
  }
  if (json) {
    console.log(JSON.stringify(opsOnelinersSnapshot(), null, 2));
  } else {
    console.log(formatOpsOnelinersBlock({ id: idFlag }).trimEnd());
  }
}
