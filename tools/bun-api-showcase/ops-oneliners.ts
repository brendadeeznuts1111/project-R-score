#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/bun-apis
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Ops-model Bun one-liners (Operations, Partners, Agents, Rails, Sportsbook
 * Accounts, Plays, Phones) — corrected and self-verifying versions of the
 * pasted set. Each demo prints a sha256 proof hash of its result.
 *
 * Corrections vs the pasted set are marked `// FIX:`:
 *   - bare `new Database(...)`        → import { Database } from "bun:sqlite"
 *   - Bun.cron("title", expr, fn)     → Bun.cron(expr, fn, title)
 *   - hardcoded play file / endpoints → local Bun.serve + scratch fixtures
 *
 * Usage: bun run showcase:ops [--live]
 */
import { logTable } from '../../lib/console-depth.ts';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('showcase:ops', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const OPS = '.tmp/showcase/ops';
await Bun.$`mkdir -p ${OPS}/{partners,transactions,plays}`.quiet();

// eslint-disable-next-line harness/no-unknown-function-param
const proof = (data: unknown): string => {
  const h = new Bun.CryptoHasher('sha256');
  h.update(JSON.stringify(data));
  return h.digest('hex').slice(0, 12);
};

type OpsDemo = { id: string; title: string; live?: boolean; run: () => Promise<void> | void }; // brand-ok — demo id

export const opsDemos: OpsDemo[] = [
  {
    id: 'onboard-partner',
    title: 'Onboard partner (UUID v7 + contract hash)',
    async run() {
      const partner = { id: Bun.randomUUIDv7(), name: 'Partner A', rail: 'paypal', credit: 500000 };
      const p = proof(partner);
      await Bun.write(`${OPS}/partners/${partner.id}.json`, JSON.stringify({ partner, proof: p }));
      console.log(`  partner ${partner.id} proof=${p}`);
    },
  },
  {
    id: 'fund-agent',
    title: 'Fund agent via rail (balance-checked tx + hash)',
    async run() {
      const rail = { type: 'paypal', balance: 100000 };
      const agent = { id: 'agent-1', book: 'fanduel', deposit: 0 };
      const amount = 10000;
      if (rail.balance < amount) throw new Error('insufficient rail balance');
      rail.balance -= amount;
      agent.deposit += amount;
      const tx = { rail: rail.type, agent: agent.id, amount, timestamp: Date.now() };
      await Bun.write(
        `${OPS}/transactions/${tx.timestamp}.json`,
        JSON.stringify({ tx, proof: proof(tx) })
      );
      console.log(`  funded ${agent.id} $${amount} via ${rail.type} proof=${proof(tx)}`);
    },
  },
  {
    id: 'generate-play',
    title: 'Generate expert play (HMAC-signed)',
    async run() {
      const play = {
        id: Bun.randomUUIDv7(),
        sport: 'NBA',
        market: 'totals',
        total: 225.5,
        stake: 5000,
        generatedAt: Bun.nanoseconds(),
      };
      const h = new Bun.CryptoHasher('sha256', 'model-123');
      h.update(JSON.stringify(play));
      const signature = h.digest('hex');
      await Bun.write(`${OPS}/plays/${play.id}.json`, JSON.stringify({ play, signature }));
      console.log(`  play ${play.id} sig=${signature.slice(0, 12)}`);
    },
  },
  {
    id: 'distribute-play',
    title: 'Distribute play to agent tree (local serve)',
    async run() {
      // FIX: no hardcoded file/endpoints — spin up a loopback distribution server.
      const received: string[] = [];
      const server = Bun.serve({
        port: 0,
        fetch: async req => {
          received.push(new URL(req.url).pathname);
          return new Response('ok');
        },
      });
      const play = { id: Bun.randomUUIDv7(), sport: 'NBA' };
      for (const target of ['partner-1', 'agent-2', 'sub-3']) {
        const res = await fetch(`http://127.0.0.1:${server.port}/play/${target}`, {
          method: 'POST',
          body: JSON.stringify(play),
        });
        if (res.status !== 200) throw new Error(`delivery to ${target} failed`);
      }
      server.stop(true);
      console.log(`  delivered to ${received.length} targets proof=${proof(received)}`);
    },
  },
  {
    id: 'place-bet-webview',
    title: 'Place bet via WebView automation',
    live: true,
    async run() {
      const wv = new Bun.WebView({ url: 'about:blank', headless: true });
      const shot = await wv.screenshot({ format: 'png' });
      await Bun.write(`${OPS}/bet-confirmation.png`, shot);
      wv.close();
      console.log('  screenshot saved (live target wiring required for real books)');
    },
  },
  {
    id: 'track-wager',
    title: 'Track wager in ops.db',
    async run() {
      // FIX: Database must be imported from bun:sqlite.
      const { Database } = await import('bun:sqlite');
      const db = new Database(`${OPS}/ops.db`);
      db.run(
        'CREATE TABLE IF NOT EXISTS wagers (id TEXT, stake INT, odds INT, result TEXT, pnl INT)'
      );
      db.query('INSERT INTO wagers VALUES (?, ?, ?, ?, ?)').run('wager-1', 5000, -110, 'win', 4545);
      const pnl = db.query('SELECT sum(pnl) as total FROM wagers').get() as { total: number };
      db.close();
      console.log(`  cumulative P&L=${pnl.total}`);
    },
  },
  {
    id: 'reconcile-rails',
    title: 'Reconcile rail balances vs agent deposits',
    async run() {
      await Bun.write(`${OPS}/rails.json`, JSON.stringify([{ type: 'paypal', balance: 90000 }]));
      await Bun.write(`${OPS}/agents.json`, JSON.stringify([{ id: 'agent-1', deposit: 90000 }]));
      const rails = await Bun.file(`${OPS}/rails.json`).json();
      const agents = await Bun.file(`${OPS}/agents.json`).json();
      const diff =
        rails.reduce((s: number, r: { balance: number }) => s + r.balance, 0) -
        agents.reduce((s: number, a: { deposit: number }) => s + a.deposit, 0);
      console.log(`  diff=$${diff} ${Math.abs(diff) > 1000 ? 'MISMATCH' : 'reconciled'}`);
      if (Math.abs(diff) > 1000) throw new Error('reconciliation mismatch');
    },
  },
  {
    id: 'inventory-phones',
    title: 'Phone inventory assignment',
    async run() {
      const phone = { imei: '12345', model: 'iPhone 14', dataPlan: '5GB', assignedTo: 'agent-1' };
      const inventory = await Bun.file(`${OPS}/inventory.json`)
        .json()

        .catch(() => ({ phones: [] as unknown[] }));
      inventory.phones.push(phone);
      await Bun.write(`${OPS}/inventory.json`, JSON.stringify(inventory, null, 2));
      console.log(`  phones=${inventory.phones.length} proof=${proof(inventory.phones)}`);
    },
  },
  {
    id: 'pnl-report',
    title: 'Daily P&L table',
    async run() {
      const { Database } = await import('bun:sqlite');
      const db = new Database(`${OPS}/ops.db`);
      db.run(
        'CREATE TABLE IF NOT EXISTS wagers (id TEXT, stake INT, odds INT, result TEXT, pnl INT)'
      );
      const rows = db
        .query('SELECT result, sum(pnl) as total FROM wagers GROUP BY result')
        .all() as { result: string; total: number }[];
      db.close();
      logTable(rows.map(r => ({ Result: r.result, 'P&L': r.total })));
    },
  },
  {
    id: 'auto-fund-cron',
    title: 'Auto-fund cron (register + stop)',
    run() {
      // FIX: Bun.cron(expr, fn, title) — title is the third argument.
      const handle = Bun.cron(
        '0 */6 * * *',
        async () => {
          const { Database } = await import('bun:sqlite');
          const db = new Database(`${OPS}/ops.db`);
          console.log('  [cron] would fund low agents');
          db.close();
        },
        'auto-fund'
      );
      handle.stop();
      console.log("  cron 'auto-fund' registered + stopped (0 */6 * * *)");
    },
  },
];

const live = argv.includes('--live');
let pass = 0;
let fail = 0;
let skip = 0;
for (const demo of opsDemos) {
  if (demo.live && !live) {
    skip++;
    console.log(`SKIP ${demo.id} (live)`);
    continue;
  }
  try {
    console.log(`RUN  ${demo.id.padEnd(18)} ${demo.title}`);
    await demo.run();
    pass++;
  } catch (err) {
    fail++;
    console.log(`FAIL ${demo.id.padEnd(18)} ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`\n${pass} pass · ${fail} fail · ${skip} skip (of ${opsDemos.length})`);
if (fail > 0) process.exit(1);
