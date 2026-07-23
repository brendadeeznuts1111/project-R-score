// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite Database
/**
 * Operations platform schema — tree-structured sportsbook agent management.
 *
 * Entity hierarchy:
 *   Operations → Expert → Partner → Agent → Sub-agent
 *
 * Each node in the tree can source sportsbook accounts and receive plays
 * from the expert they follow. Agents become Partners when they grow enough
 * accounts/liquidity to manage their own down-tree.
 */

import { Database } from 'bun:sqlite';

export function initSchema(db: Database): void {
  db.run(`
    -- Singleton config for the operations platform
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY DEFAULT 'main',
      total_liquidity REAL DEFAULT 0,
      total_exposure REAL DEFAULT 0,
      updated_at TEXT
    );

    -- Experts: people with proven edge in a sport/market
    CREATE TABLE IF NOT EXISTS experts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      market TEXT NOT NULL,
      edge_score REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Unified tree: partners, agents, sub-agents
    CREATE TABLE IF NOT EXISTS tree_nodes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('partner', 'agent', 'sub_agent')),
      parent_id TEXT REFERENCES tree_nodes(id),
      expert_id TEXT REFERENCES experts(id),
      name TEXT NOT NULL,
      telegram_id TEXT,
      phone_id TEXT,
      rail_preference TEXT DEFAULT 'paypal',
      total_accounts INTEGER DEFAULT 0,
      total_liquidity REAL DEFAULT 0,
      cut_percentage REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Sportsbook accounts belonging to agents
    CREATE TABLE IF NOT EXISTS sb_accounts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES tree_nodes(id),
      book TEXT NOT NULL CHECK(book IN ('draftkings', 'fanduel', 'hardrock', 'betmgm', 'caesars')),
      username TEXT,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'limited', 'banned', 'pending')),
      login_method TEXT DEFAULT 'webview',
      last_login TEXT,
      created_at TEXT NOT NULL
    );

    -- Funding channels (rails)
    CREATE TABLE IF NOT EXISTS rails (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('paypal', 'venmo', 'cashapp', 'wire', 'zelle')),
      agent_id TEXT REFERENCES tree_nodes(id),
      identifier TEXT NOT NULL,
      daily_limit REAL DEFAULT 0,
      monthly_limit REAL DEFAULT 0,
      total_sent REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    -- Plays: wager recommendations from experts
    CREATE TABLE IF NOT EXISTS plays (
      id TEXT PRIMARY KEY,
      expert_id TEXT NOT NULL REFERENCES experts(id),
      sport TEXT NOT NULL,
      market TEXT NOT NULL,
      event TEXT NOT NULL,
      selection TEXT NOT NULL,
      odds INTEGER NOT NULL,
      stake_recommended REAL NOT NULL,
      confidence REAL DEFAULT 0,
      signed_hash TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      closed_at TEXT,
      result TEXT DEFAULT 'pending' CHECK(result IN ('pending', 'win', 'loss', 'push', 'void')),
      pnl REAL
    );

    -- Play distribution: who received each play
    CREATE TABLE IF NOT EXISTS play_distribution (
      play_id TEXT NOT NULL REFERENCES plays(id),
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      channel TEXT NOT NULL DEFAULT 'telegram',
      received_at TEXT NOT NULL,
      acted_at TEXT,
      stake_actual REAL,
      odds_actual INTEGER,
      status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'received', 'placed', 'passed', 'missed')),
      PRIMARY KEY (play_id, node_id)
    );

    -- Hardware inventory
    CREATE TABLE IF NOT EXISTS phones (
      id TEXT PRIMARY KEY,
      model TEXT,
      imei TEXT UNIQUE,
      carrier TEXT,
      data_plan TEXT,
      assigned_to TEXT REFERENCES tree_nodes(id),
      status TEXT DEFAULT 'inventory' CHECK(status IN ('inventory', 'issued', 'returned', 'lost')),
      issued_at TEXT,
      returned_at TEXT
    );

    -- Funding transaction history
    CREATE TABLE IF NOT EXISTS funding (
      id TEXT PRIMARY KEY,
      rail_id TEXT NOT NULL REFERENCES rails(id),
      from_operations INTEGER DEFAULT 1,
      to_agent_id TEXT NOT NULL REFERENCES tree_nodes(id),
      amount REAL NOT NULL,
      fee REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'received', 'failed')),
      sent_at TEXT NOT NULL,
      confirmed_at TEXT
    );
  `);
}
