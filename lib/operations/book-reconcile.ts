// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/webview
/**
 * Book balance reconciliation — scrape sportsbook balances and reconcile vs sb_accounts.
 * Cached path uses reported DB balance; live/webview paths are fail-closed stubs.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';

/** Same soft tolerance as rails/deposits reconciliation. */
const DEPOSIT_TOLERANCE = 1_000;

export type SbAccountRow = {
  id: string; // brand-ok
  agent_id: string; // brand-ok
  book: string;
  username: string | null;
  balance: number;
  login_method: string;
  status: string;
};

export type BookScrapeResult = {
  accountId: string; // brand-ok
  agentId: string; // brand-ok
  book: string;
  reportedBalance: number;
  scrapedBalance: number;
  source: string; // 'cached' | 'live' | 'webview'
  ok: boolean;
};

export type BookBalanceMismatch = {
  kind: 'book_balance';
  detail: string;
  diff: number;
  nodeId?: string; // brand-ok — tree_nodes id (agent)
};

function hasBookScrapeLog(db: Database): boolean {
  const rows = db
    .query(`SELECT name AS id FROM sqlite_master WHERE type = 'table' AND name = 'book_scrape_log'`)
    .all() as { id: string }[]; // brand-ok — sqlite_master name alias
  return rows.length > 0;
}

/** Active sportsbook accounts, optionally scoped to one agent. */
export function loadActiveSbAccounts(
  db: Database,
  agentId?: string // brand-ok — tree_nodes / sb_accounts.agent_id filter
): SbAccountRow[] {
  if (agentId) {
    return db
      .query(
        `SELECT id, agent_id, book, username, balance, login_method, status
         FROM sb_accounts
         WHERE status = 'active' AND agent_id = $aid
         ORDER BY book`
      )
      .all({ $aid: agentId }) as SbAccountRow[];
  }
  return db
    .query(
      `SELECT id, agent_id, book, username, balance, login_method, status
       FROM sb_accounts
       WHERE status = 'active'
       ORDER BY agent_id, book`
    )
    .all() as SbAccountRow[];
}

/**
 * Scrape a single account balance.
 * Default (live:false): return cached sb_accounts.balance with source='cached'.
 * live/webview without a real scraper: fail-closed (ok:false).
 */
export async function scrapeBookBalance(
  acct: SbAccountRow,
  opts?: { live?: boolean; webview?: boolean }
): Promise<{
  ok: boolean;
  scrapedBalance: number;
  source: string;
  accountId: string; // brand-ok
  agentId: string; // brand-ok
  book: string;
  reportedBalance: number;
}> {
  const base = {
    accountId: acct.id,
    agentId: acct.agent_id,
    book: acct.book,
    reportedBalance: acct.balance,
  };

  if (opts?.live || opts?.webview) {
    // Fail-closed: no real live/webview scraper wired in this module.
    return {
      ...base,
      ok: false,
      scrapedBalance: acct.balance,
      source: opts.webview ? 'webview' : 'live',
    };
  }

  return {
    ...base,
    ok: true,
    scrapedBalance: acct.balance,
    source: 'cached',
  };
}

/**
 * Apply scrape results: update balances, stamp last_scraped_at, log, and flag mismatches.
 * Mismatch when |scraped - reported| > DEPOSIT_TOLERANCE (1000).
 */
export function applyBookScrapes(
  db: Database,
  scrapes: Array<{
    accountId: string; // brand-ok
    agentId: string; // brand-ok
    book: string;
    reportedBalance: number;
    scrapedBalance: number;
    source: string;
    ok: boolean;
  }>
): {
  mismatches: Array<{ kind: 'book_balance'; detail: string; diff: number; nodeId?: string }>; // brand-ok
} {
  const mismatches: BookBalanceMismatch[] = [];
  const now = new Date().toISOString();
  const logEnabled = hasBookScrapeLog(db);

  for (const s of scrapes) {
    if (!s.ok) continue;

    const diff = Math.abs(s.scrapedBalance - s.reportedBalance);

    db.run(
      `UPDATE sb_accounts
       SET balance = $bal, last_scraped_at = $now
       WHERE id = $id`,
      { $bal: s.scrapedBalance, $now: now, $id: s.accountId }
    );

    if (logEnabled) {
      db.run(
        `INSERT INTO book_scrape_log
           (id, account_id, agent_id, book, reported_balance, scraped_balance, source, scraped_at)
         VALUES ($id, $aid, $agent, $book, $rep, $scr, $src, $now)`,
        {
          $id: randomUUIDv7(),
          $aid: s.accountId,
          $agent: s.agentId,
          $book: s.book,
          $rep: s.reportedBalance,
          $scr: s.scrapedBalance,
          $src: s.source,
          $now: now,
        }
      );
    }

    if (diff > DEPOSIT_TOLERANCE) {
      mismatches.push({
        kind: 'book_balance',
        detail: `${s.book} account ${s.accountId}: reported $${s.reportedBalance} vs scraped $${s.scrapedBalance}`,
        diff,
        nodeId: s.agentId,
      });
    }
  }

  return { mismatches };
}

/** Load active accounts → scrape each → apply; return counts for CLI/ops. */
export async function runBookReconciliation(
  db: Database,
  opts?: { live?: boolean; webview?: boolean }
): Promise<{
  scrapes: number;
  updated: number;
  mismatches: Array<{ kind: string; detail: string; diff: number }>;
}> {
  const accounts = loadActiveSbAccounts(db);
  const scrapes: BookScrapeResult[] = [];

  for (const acct of accounts) {
    scrapes.push(await scrapeBookBalance(acct, opts));
  }

  const { mismatches } = applyBookScrapes(db, scrapes);
  const updated = scrapes.filter(s => s.ok).length;

  return {
    scrapes: scrapes.length,
    updated,
    mismatches,
  };
}
