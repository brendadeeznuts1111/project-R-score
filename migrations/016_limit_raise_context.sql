-- Multi-factor context captured at the moment of a partner account limit raise.
-- Runtime compatibility lives in ensureAccountLimitsSchema +
-- PartnerAnalyticsRepository's additive proof-column migration.

CREATE TABLE IF NOT EXISTS limit_raise_context (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id                  TEXT NOT NULL,
  limit_record_id          INTEGER NOT NULL REFERENCES partner_account_limits(id),
  active_players_7d        INTEGER,
  new_players_7d           INTEGER,
  total_handle_7d          REAL,
  avg_clv_7d               REAL,
  top_tier_player_count    INTEGER,
  violation_count_30d      INTEGER,
  chargeback_count_30d     INTEGER,
  kyc_pass_rate            REAL,
  market_volatility_index  REAL,
  peak_betting_hours       TEXT,
  sportsbook_share         REAL,
  partner_profit_30d       REAL,
  partner_roi_30d          REAL,
  snapshot_at              INTEGER NOT NULL DEFAULT (unixepoch()),
  proof_algorithm          TEXT,
  proof_digest             TEXT,
  proof_hmac               TEXT
);

CREATE INDEX IF NOT EXISTS idx_lrc_node_limit
  ON limit_raise_context(node_id, limit_record_id);
CREATE INDEX IF NOT EXISTS idx_lrc_snapshot
  ON limit_raise_context(node_id, snapshot_at DESC);
