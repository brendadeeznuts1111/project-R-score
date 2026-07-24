// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations platform schema — tree-structured sportsbook agent management (SSOT).
 *
 * Entity hierarchy:
 *   Operations → Expert → Partner → Agent → Sub-agent
 */
import type { Database } from 'bun:sqlite';
import { ensureExperimentsSchema } from '../experiments/schema.ts';
import { ensureMonitoringSchema } from '../monitoring/schema.ts';
import { ensurePredictionSchema } from '../prediction/schema.ts';
import { ensurePredictionShadowSchema } from '../experiments/champion-challenger.ts';
import { ensureProvisioningSchema } from '../provisioning/schema.ts';
import { ensurePlatformCoverageSchema } from './platform-coverage.ts';

const TREE_NODE_COLUMNS = [
  ['email', 'TEXT'],
  ['call_sign', 'TEXT'],
  ['oidc_subject', 'TEXT'],
  ['status', "TEXT DEFAULT 'active'"],
  ['promoted_at', 'TEXT'],
  ['last_play_at', 'TEXT'],
] as const;

/** Add columns / tables introduced after initial deploy (SQLite-safe). */
export function migrateSchema(db: Database): void {
  const existing = new Set(
    (db.query('PRAGMA table_info(tree_nodes)').all() as { name: string }[]).map(c => c.name)
  );
  for (const [name, def] of TREE_NODE_COLUMNS) {
    if (!existing.has(name)) {
      db.run(`ALTER TABLE tree_nodes ADD COLUMN ${name} ${def}`);
    }
  }
  // Enforce call_sign UNIQUE for databases that got the column before the
  // constraint was in the DDL (SQLite ADD COLUMN ignores UNIQUE).
  if (existing.has('call_sign')) {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_tree_nodes_call_sign ON tree_nodes(call_sign)');
  }

  const opsCols = new Set(
    (db.query('PRAGMA table_info(operations)').all() as { name: string }[]).map(c => c.name)
  );
  if (!opsCols.has('version')) {
    db.run('ALTER TABLE operations ADD COLUMN version INTEGER DEFAULT 0');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      book TEXT NOT NULL DEFAULT '_all',
      deposited REAL DEFAULT 0,
      in_play REAL DEFAULT 0,
      available REAL DEFAULT 0,
      version INTEGER DEFAULT 0,
      last_reconciled TEXT,
      UNIQUE(node_id, book)
    );
    CREATE INDEX IF NOT EXISTS idx_positions_node ON positions(node_id);
  `);

  const sbCols = new Set(
    (db.query('PRAGMA table_info(sb_accounts)').all() as { name: string }[]).map(c => c.name)
  );
  if (!sbCols.has('last_scraped_at')) {
    db.run('ALTER TABLE sb_accounts ADD COLUMN last_scraped_at TEXT');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS book_scrape_log (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES sb_accounts(id),
      agent_id TEXT NOT NULL REFERENCES tree_nodes(id),
      book TEXT NOT NULL,
      reported_balance REAL NOT NULL,
      scraped_balance REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'cached',
      scraped_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_book_scrape_agent ON book_scrape_log(agent_id, scraped_at);

    CREATE TABLE IF NOT EXISTS cut_ledger (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL REFERENCES plays(id),
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cut_ledger_node ON cut_ledger(node_id, created_at);
  `);

  ensurePlatformCoverageSchema(db);
  ensureProvisioningSchema(db);
  ensureExperimentsSchema(db);
  ensurePredictionSchema(db);
  ensurePredictionShadowSchema(db);
  ensureMonitoringSchema(db);

  const pdCols = new Set(
    (db.query('PRAGMA table_info(play_distribution)').all() as { name: string }[]).map(c => c.name)
  );
  if (!pdCols.has('ack_status')) {
    db.run(`ALTER TABLE play_distribution ADD COLUMN ack_status TEXT DEFAULT 'pending'`);
  }
  if (!pdCols.has('telegram_message_id')) {
    db.run(`ALTER TABLE play_distribution ADD COLUMN telegram_message_id INTEGER`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS partner_profile_bindings (
      tree_node_id TEXT PRIMARY KEY REFERENCES tree_nodes(id),
      template_id TEXT NOT NULL,
      profile_key TEXT NOT NULL UNIQUE,
      lifecycle_status TEXT NOT NULL DEFAULT 'materialized'
        CHECK(lifecycle_status IN ('signup', 'materialized', 'kyc_pending', 'active', 'suspended', 'terminated')),
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ppb_template ON partner_profile_bindings(template_id);
    CREATE INDEX IF NOT EXISTS idx_ppb_lifecycle ON partner_profile_bindings(lifecycle_status);

    CREATE TABLE IF NOT EXISTS play_gate_decisions (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL REFERENCES plays(id),
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      allowed INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('allow', 'block', 'adjust', 'defer')),
      reason TEXT,
      adjusted_stake REAL,
      decision_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(play_id, node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_gate_play ON play_gate_decisions(play_id);

    CREATE TABLE IF NOT EXISTS ops_channel_outbox (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL CHECK(topic IN ('identity', 'plays', 'dod', 'experiments', 'alerts', 'provisioning')),
      event_type TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      projectors TEXT NOT NULL DEFAULT 'r2,telegram',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
      retries INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      sent_at TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ops_outbox_status ON ops_channel_outbox(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_ops_outbox_topic ON ops_channel_outbox(topic, created_at);
  `);
}

export function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY DEFAULT 'main',
      total_liquidity REAL DEFAULT 0,
      total_exposure REAL DEFAULT 0,
      version INTEGER DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS experts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      market TEXT NOT NULL,
      edge_score REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tree_nodes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('partner', 'agent', 'sub_agent')),
      parent_id TEXT REFERENCES tree_nodes(id),
      expert_id TEXT REFERENCES experts(id),
      name TEXT NOT NULL,
      call_sign TEXT UNIQUE,
      email TEXT,
      telegram_id TEXT UNIQUE,
      oidc_subject TEXT UNIQUE,
      phone_id TEXT,
      rail_preference TEXT DEFAULT 'paypal',
      total_accounts INTEGER DEFAULT 0,
      total_liquidity REAL DEFAULT 0,
      cut_percentage REAL DEFAULT 0,
      active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active' CHECK(status IN ('prospect', 'active', 'partner', 'suspended')),
      promoted_at TEXT,
      created_at TEXT NOT NULL,
      last_play_at TEXT
    );

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

    CREATE TABLE IF NOT EXISTS growth_metrics (
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      period TEXT NOT NULL,
      plays_received INTEGER DEFAULT 0,
      plays_placed INTEGER DEFAULT 0,
      volume REAL DEFAULT 0,
      pnl REAL DEFAULT 0,
      new_sub_agents INTEGER DEFAULT 0,
      new_accounts INTEGER DEFAULT 0,
      PRIMARY KEY (node_id, period)
    );

    CREATE TABLE IF NOT EXISTS telegram_outbox (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      play_id TEXT NOT NULL REFERENCES plays(id),
      telegram_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
      retries INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

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

    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL CHECK(category IN ('sportsbook', 'exchange', 'dfs', 'crypto_sportsbook', 'casino', 'p2p')),
      sub_category TEXT,
      url TEXT,
      active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      api_available INTEGER DEFAULT 0,
      requires_geolocation INTEGER DEFAULT 1,
      launch_date TEXT,
      kyc_tier TEXT,
      max_wager_default REAL,
      notes TEXT,
      updated_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS partner_platform_accounts (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL REFERENCES platforms(id),
      partner_id TEXT NOT NULL REFERENCES tree_nodes(id),
      account_identifier TEXT NOT NULL,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'limited', 'closed', 'pending')),
      credentials_encrypted TEXT,
      is_test INTEGER DEFAULT 0,
      notes TEXT,
      opened_at TEXT NOT NULL,
      last_verified_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES tree_nodes(id),
      book TEXT NOT NULL DEFAULT '_all',
      deposited REAL DEFAULT 0,
      in_play REAL DEFAULT 0,
      available REAL DEFAULT 0,
      version INTEGER DEFAULT 0,
      last_reconciled TEXT,
      UNIQUE(node_id, book)
    );

    CREATE TABLE IF NOT EXISTS ops_sync_cursor (
      topic TEXT PRIMARY KEY,
      last_seq INTEGER DEFAULT 0
    );
  `);

  // Migrate legacy columns before indexes that reference them (e.g. tree_nodes.status).
  migrateSchema(db);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_positions_node ON positions(node_id);
    CREATE INDEX IF NOT EXISTS idx_expert ON tree_nodes(expert_id);
    CREATE INDEX IF NOT EXISTS idx_telegram ON tree_nodes(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_status ON tree_nodes(status);
    CREATE INDEX IF NOT EXISTS idx_outbox_status ON telegram_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_parent ON tree_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_ppa_platform ON partner_platform_accounts(platform_id);
    CREATE INDEX IF NOT EXISTS idx_ppa_partner ON partner_platform_accounts(partner_id);
    CREATE INDEX IF NOT EXISTS idx_ppa_status ON partner_platform_accounts(status);
  `);
}
