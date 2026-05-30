-- Migration 008: Prediction Markets
-- Zone: 3 (Forest Canopy)
-- Tables: prediction_markets, prediction_arbitrage, prediction_price_history

-- UP

-- Enable foreign keys and WAL mode
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------------------------
-- prediction_markets: Multi-provider prediction market data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_markets (
  id                  TEXT PRIMARY KEY,
  provider            TEXT    NOT NULL,
  market_id           TEXT    NOT NULL,
  market_name         TEXT    NOT NULL,
  category            TEXT    DEFAULT 'other',
  outcome_yes_price   REAL    NOT NULL DEFAULT 0.50,
  outcome_no_price    REAL    NOT NULL DEFAULT 0.50,
  volume              REAL    DEFAULT 0,
  liquidity           REAL    DEFAULT 0,
  close_date          INTEGER,
  status              TEXT    DEFAULT 'open',
  fetched_at          INTEGER DEFAULT (strftime('%s','now')),
  created_at          INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(provider, market_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_markets_provider ON prediction_markets(provider);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_category ON prediction_markets(category);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_fetched ON prediction_markets(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_close ON prediction_markets(close_date);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_provider_market ON prediction_markets(provider, market_id);

-- ---------------------------------------------------------------------------
-- prediction_arbitrage: Cross-provider arbitrage opportunities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_arbitrage (
  id                      TEXT PRIMARY KEY,
  market_id               TEXT    NOT NULL,
  market_name             TEXT,
  category                TEXT,
  provider_a              TEXT    NOT NULL,
  price_a                 REAL    NOT NULL,
  side_a                  TEXT    NOT NULL DEFAULT 'yes',
  provider_b              TEXT    NOT NULL,
  price_b                 REAL    NOT NULL,
  side_b                  TEXT    NOT NULL DEFAULT 'no',
  spread                  REAL    NOT NULL,
  profit_pct              REAL    NOT NULL,
  implied_probability_a   REAL    NOT NULL,
  implied_probability_b   REAL    NOT NULL,
  detected_at             INTEGER DEFAULT (strftime('%s','now')),
  expires_at              INTEGER NOT NULL,
  status                  TEXT    DEFAULT 'active',
  created_at              INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_prediction_arbitrage_market ON prediction_arbitrage(market_id);
CREATE INDEX IF NOT EXISTS idx_prediction_arbitrage_status ON prediction_arbitrage(status);
CREATE INDEX IF NOT EXISTS idx_prediction_arbitrage_detected ON prediction_arbitrage(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_arbitrage_expires ON prediction_arbitrage(expires_at);
CREATE INDEX IF NOT EXISTS idx_prediction_arbitrage_profit ON prediction_arbitrage(profit_pct DESC);

-- ---------------------------------------------------------------------------
-- prediction_price_history: Time-series price tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_price_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id   TEXT    NOT NULL,
  provider    TEXT    NOT NULL,
  yes_price   REAL    NOT NULL,
  no_price    REAL    NOT NULL,
  volume      REAL    DEFAULT 0,
  timestamp   INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_prediction_price_history_market ON prediction_price_history(market_id);
CREATE INDEX IF NOT EXISTS idx_prediction_price_history_provider ON prediction_price_history(provider);
CREATE INDEX IF NOT EXISTS idx_prediction_price_history_time ON prediction_price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_price_history_market_provider_time ON prediction_price_history(market_id, provider, timestamp DESC);

-- ---------------------------------------------------------------------------
-- Seed: 5 sample prediction markets across providers
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO prediction_markets 
  (id, provider, market_id, market_name, category, outcome_yes_price, outcome_no_price, volume, liquidity, close_date, status, fetched_at, created_at)
VALUES 
  ('kalshi_demo_1', 'kalshi', 'KXSTREASURY-25', 'US Treasury yield above 4.5% in June?', 'economics', 0.42, 0.59, 450000, 120000, strftime('%s','2025-06-30'), 'open', strftime('%s','now'), strftime('%s','now')),
  ('poly_demo_1', 'polymarket', 'poly-trump-2024', 'Trump wins 2024 Presidential Election', 'politics', 0.48, 0.53, 45000000, 12000000, strftime('%s','2024-11-05'), 'open', strftime('%s','now'), strftime('%s','now')),
  ('pi_demo_1', 'predictit', 'pi-senate-2024', 'Republicans control Senate after 2024', 'politics', 0.62, 0.39, 890000, 280000, strftime('%s','2024-11-05'), 'open', strftime('%s','now'), strftime('%s','now')),
  ('bf_demo_1', 'betfair', 'bf-btc-100k', 'Bitcoin above $100,000 in 2025', 'crypto', 0.38, 0.63, 2300000, 680000, strftime('%s','2025-12-31'), 'open', strftime('%s','now'), strftime('%s','now')),
  ('poly_demo_2', 'polymarket', 'poly-eth-etf', 'Ethereum ETF approved by SEC in 2025', 'crypto', 0.75, 0.26, 7600000, 2300000, strftime('%s','2025-12-31'), 'open', strftime('%s','now'), strftime('%s','now'));

-- Seed a sample arbitrage opportunity
INSERT OR IGNORE INTO prediction_arbitrage
  (id, market_id, market_name, category, provider_a, price_a, side_a, provider_b, price_b, side_b, spread, profit_pct, implied_probability_a, implied_probability_b, detected_at, expires_at, status)
VALUES
  ('arb_demo_1', 'poly-trump-2024', 'Trump wins 2024 Presidential Election', 'politics', 'polymarket', 0.48, 'yes', 'predictit', 0.39, 'no', 0.05, 2.35, 2.08, 2.56, strftime('%s','now'), strftime('%s','now', '+15 minutes'), 'active');

-- Seed sample price history
INSERT OR IGNORE INTO prediction_price_history
  (market_id, provider, yes_price, no_price, volume, timestamp)
VALUES
  ('poly-trump-2024', 'polymarket', 0.48, 0.53, 45000000, strftime('%s','now', '-10 minutes')),
  ('poly-trump-2024', 'polymarket', 0.47, 0.54, 44800000, strftime('%s','now', '-5 minutes')),
  ('poly-trump-2024', 'polymarket', 0.48, 0.53, 45000000, strftime('%s','now')),
  ('KXSTREASURY-25', 'kalshi', 0.41, 0.60, 445000, strftime('%s','now', '-10 minutes')),
  ('KXSTREASURY-25', 'kalshi', 0.42, 0.59, 450000, strftime('%s','now', '-5 minutes')),
  ('KXSTREASURY-25', 'kalshi', 0.42, 0.59, 450000, strftime('%s','now'));

-- DOWN

-- DROP TABLE IF EXISTS prediction_price_history;
-- DROP TABLE IF EXISTS prediction_arbitrage;
-- DROP TABLE IF EXISTS prediction_markets;
