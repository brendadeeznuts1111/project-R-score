-- UP: Player Domain Migration (Desert Rose: #d4a5a5)
-- Tables: customers, player_notes, player_transactions, player_flags, player_links

PRAGMA foreign_keys = ON;

-- ============================================================================
-- customers: Canonical customer/player records
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT    NOT NULL UNIQUE,    -- Stable customer identifier
  player_id       TEXT,                       -- Link to raw_players
  agent_login     TEXT    NOT NULL,
  display_name    TEXT,
  email           TEXT,
  phone           TEXT,
  date_of_birth   TEXT,                       -- YYYY-MM-DD
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT    DEFAULT 'US',
  postal_code     TEXT,
  balance         REAL    DEFAULT 0,          -- In cents
  lifetime_deposit REAL   DEFAULT 0,
  lifetime_withdrawal REAL DEFAULT 0,
  lifetime_pnl    REAL    DEFAULT 0,
  risk_tier       TEXT    DEFAULT 'GREEN',    -- BLACK | RED | YELLOW | GREEN
  risk_score      INTEGER DEFAULT 0,
  archetype       TEXT,                       -- sharp | whale | chase_gambler | new | recreational | suspicious
  archetype_confidence REAL,                  -- 0.0 - 1.0
  kyc_status      TEXT    DEFAULT 'pending',  -- pending | verified | rejected | review
  kyc_verified_at INTEGER,
  status          TEXT    DEFAULT 'active',   -- active | suspended | closed | self_excluded
  self_excluded_until INTEGER,
  last_wager_at   INTEGER,
  last_login_at   INTEGER,
  wager_count     INTEGER DEFAULT 0,
  win_rate        REAL,
  avg_stake       REAL,
  tags_json       TEXT,
  notes           TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_agent ON customers(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(risk_tier, status);
CREATE INDEX IF NOT EXISTS idx_customers_archetype ON customers(archetype, status);
CREATE INDEX IF NOT EXISTS idx_customers_kyc ON customers(kyc_status, status);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(display_name);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(balance);

-- ============================================================================
-- player_notes: Free-form notes attached to player records
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_notes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,           -- FK to customers.customer_id
  agent_login     TEXT    NOT NULL,           -- Who wrote the note
  note_type       TEXT    DEFAULT 'general',  -- general | risk | kyc | incident | followup
  content         TEXT    NOT NULL,
  is_pinned       INTEGER DEFAULT 0,
  is_active       INTEGER DEFAULT 1,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_player_notes_player ON player_notes(player_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_notes_type ON player_notes(note_type, player_id);
CREATE INDEX IF NOT EXISTS idx_player_notes_agent ON player_notes(agent_login, created_at DESC);

-- ============================================================================
-- player_transactions: Financial transactions per player
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id  TEXT    NOT NULL UNIQUE,    -- Transaction reference
  player_id       TEXT    NOT NULL,           -- FK to customers
  agent_login     TEXT    NOT NULL,
  transaction_type TEXT   NOT NULL,           -- deposit | withdrawal | adjustment | bonus | chargeback
  amount          REAL    NOT NULL,           -- In cents (positive = credit, negative = debit)
  currency        TEXT    DEFAULT 'USD',
  status          TEXT    DEFAULT 'pending',  -- pending | completed | failed | reversed
  method          TEXT,                       -- ach | card | crypto | cash | wire
  reference       TEXT,                       -- External reference number
  notes           TEXT,
  metadata_json   TEXT,
  processed_at    INTEGER,
  processed_by    TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_player_tx_player ON player_transactions(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_tx_type ON player_transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_player_tx_agent ON player_transactions(agent_login, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_tx_status ON player_transactions(status, processed_at);

-- ============================================================================
-- player_flags: Active flags on players (risk, compliance, fraud, VIP, manual)
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,           -- FK to customers
  flag_type       TEXT    NOT NULL,           -- risk | compliance | fraud | vip | manual
  flag_subtype    TEXT,                       -- velocity | loss_rate | ip_anomaly | chargeback | etc.
  severity        TEXT    DEFAULT 'medium',   -- low | medium | high | critical
  title           TEXT    NOT NULL,
  description     TEXT,
  source          TEXT,                       -- Which system raised the flag
  source_rule_id  TEXT,                       -- Which rule triggered (if applicable)
  is_active       INTEGER DEFAULT 1,          -- 1 = active, 0 = cleared
  cleared_by      TEXT,
  cleared_at      INTEGER,
  clear_reason    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_player_flags_player ON player_flags(player_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_flags_type ON player_flags(flag_type, severity, is_active);
CREATE INDEX IF NOT EXISTS idx_player_flags_source ON player_flags(source, is_active);

-- ============================================================================
-- player_links: Linked accounts, devices, and IPs for multi-account detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_links (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id           TEXT    NOT NULL,       -- FK to customers
  link_type           TEXT    NOT NULL,       -- device | ip | account
  link_value          TEXT    NOT NULL,       -- Device fingerprint, IP, or account ID
  confidence          INTEGER DEFAULT 0,      -- 0-100 match confidence
  first_seen          INTEGER NOT NULL,
  last_seen           INTEGER NOT NULL,
  occurrence_count    INTEGER DEFAULT 1,
  metadata_json       TEXT,
  created_at          INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_player_links_player ON player_links(player_id, link_type);
CREATE INDEX IF NOT EXISTS idx_player_links_value ON player_links(link_type, link_value);
CREATE INDEX IF NOT EXISTS idx_player_links_confidence ON player_links(confidence DESC);

-- ============================================================================
-- Seed: 25 demo customers with varied archetypes and risk tiers
-- ============================================================================

INSERT OR IGNORE INTO customers (
  customer_id, player_id, agent_login, display_name, email, phone,
  balance, lifetime_deposit, lifetime_withdrawal, lifetime_pnl,
  risk_tier, risk_score, archetype, archetype_confidence,
  kyc_status, status, wager_count, win_rate, avg_stake,
  last_wager_at, created_at
) VALUES
-- Sharp players (high win rate)
('CUST_001', 'PLY_001', 'agent_001', 'Alex Mercer', 'alex.m@email.com', '+1-555-0101',
 1250000, 5000000, 2500000, 1250000, 'YELLOW', 45, 'sharp', 0.92,
 'verified', 'active', 342, 0.58, 75000,
 strftime('%s','now') - 3600, strftime('%s','now') - 86400*120),

('CUST_002', 'PLY_002', 'agent_001', 'Sarah Chen', 'sarah.c@email.com', '+1-555-0102',
 2800000, 8000000, 4000000, 2800000, 'GREEN', 25, 'sharp', 0.88,
 'verified', 'active', 567, 0.61, 95000,
 strftime('%s','now') - 1800, strftime('%s','now') - 86400*200),

('CUST_003', 'PLY_003', 'agent_002', 'Marcus Webb', 'marcus.w@email.com', '+1-555-0103',
 450000, 2000000, 1000000, 450000, 'RED', 72, 'sharp', 0.85,
 'verified', 'active', 189, 0.56, 55000,
 strftime('%s','now') - 7200, strftime('%s','now') - 86400*90),

-- Whale players (high balance/volume)
('CUST_004', 'PLY_004', 'agent_003', 'Victoria Sterling', 'v.s@email.com', '+1-555-0104',
 15000000, 50000000, 20000000, 15000000, 'GREEN', 15, 'whale', 0.95,
 'verified', 'active', 1245, 0.52, 250000,
 strftime('%s','now') - 600, strftime('%s','now') - 86400*365),

('CUST_005', 'PLY_005', 'agent_003', 'James Rothschild', 'j.r@email.com', '+1-555-0105',
 25000000, 100000000, 50000000, 25000000, 'GREEN', 10, 'whale', 0.97,
 'verified', 'active', 2341, 0.48, 500000,
 strftime('%s','now') - 300, strftime('%s','now') - 86400*500),

('CUST_006', 'PLY_006', 'agent_002', 'Dmitri Volkov', 'd.v@email.com', '+1-555-0106',
 3200000, 15000000, 8000000, 3200000, 'YELLOW', 55, 'whale', 0.78,
 'verified', 'active', 876, 0.49, 180000,
 strftime('%s','now') - 2400, strftime('%s','now') - 86400*180),

-- Chase gamblers (<35% win, escalating)
('CUST_007', 'PLY_007', 'agent_001', 'Tommy Kowalski', 'tommy.k@email.com', '+1-555-0107',
 15000, 800000, 650000, -550000, 'RED', 82, 'chase_gambler', 0.91,
 'verified', 'active', 412, 0.28, 45000,
 strftime('%s','now') - 1800, strftime('%s','now') - 86400*60),

('CUST_008', 'PLY_008', 'agent_004', 'Elena Rossi', 'elena.r@email.com', '+1-555-0108',
 5000, 1200000, 950000, -650000, 'BLACK', 95, 'chase_gambler', 0.89,
 'verified', 'suspended', 567, 0.31, 38000,
 strftime('%s','now') - 86400, strftime('%s','now') - 86400*45),

('CUST_009', 'PLY_009', 'agent_001', 'Bobby Lee', 'bobby.l@email.com', '+1-555-0109',
 85000, 3500000, 2800000, -450000, 'RED', 68, 'chase_gambler', 0.82,
 'verified', 'active', 723, 0.33, 62000,
 strftime('%s','now') - 3600, strftime('%s','now') - 86400*110),

('CUST_010', 'PLY_010', 'agent_004', 'Maria Santos', 'maria.s@email.com', '+1-555-0110',
 22000, 1500000, 1100000, -320000, 'YELLOW', 58, 'chase_gambler', 0.76,
 'verified', 'active', 289, 0.30, 28000,
 strftime('%s','now') - 5400, strftime('%s','now') - 86400*75),

-- New players (low wager count)
('CUST_011', 'PLY_011', 'agent_002', 'Jake Wilson', 'jake.w@email.com', '+1-555-0111',
 250000, 500000, 0, 0, 'GREEN', 20, 'new', 0.85,
 'pending', 'active', 8, 0.50, 25000,
 strftime('%s','now') - 86400*3, strftime('%s','now') - 86400*14),

('CUST_012', 'PLY_012', 'agent_002', 'Lisa Park', 'lisa.p@email.com', '+1-555-0112',
 100000, 200000, 0, 15000, 'GREEN', 15, 'new', 0.80,
 'pending', 'active', 12, 0.58, 18000,
 strftime('%s','now') - 86400*2, strftime('%s','now') - 86400*10),

('CUST_013', 'PLY_013', 'agent_001', 'Carlos Mendez', 'carlos.m@email.com', '+1-555-0113',
 50000, 100000, 0, -5000, 'GREEN', 30, 'new', 0.72,
 'pending', 'active', 5, 0.40, 15000,
 strftime('%s','now') - 86400*5, strftime('%s','now') - 86400*7),

('CUST_014', 'PLY_014', 'agent_003', 'Amy Foster', 'amy.f@email.com', '+1-555-0114',
 175000, 300000, 0, 25000, 'GREEN', 18, 'new', 0.78,
 'pending', 'active', 15, 0.53, 22000,
 strftime('%s','now') - 86400, strftime('%s','now') - 86400*20),

-- Recreational players (moderate)
('CUST_015', 'PLY_015', 'agent_002', 'Mike Johnson', 'mike.j@email.com', '+1-555-0115',
 450000, 2500000, 1500000, 450000, 'GREEN', 35, 'recreational', 0.70,
 'verified', 'active', 234, 0.48, 42000,
 strftime('%s','now') - 7200, strftime('%s','now') - 86400*150),

('CUST_016', 'PLY_016', 'agent_001', 'Karen Davis', 'karen.d@email.com', '+1-555-0116',
 180000, 1200000, 800000, 180000, 'GREEN', 28, 'recreational', 0.65,
 'verified', 'active', 156, 0.46, 35000,
 strftime('%s','now') - 10800, strftime('%s','now') - 86400*130),

('CUST_017', 'PLY_017', 'agent_004', 'Steve Brown', 'steve.b@email.com', '+1-555-0117',
 620000, 4000000, 2500000, 620000, 'GREEN', 22, 'recreational', 0.60,
 'verified', 'active', 389, 0.49, 55000,
 strftime('%s','now') - 5400, strftime('%s','now') - 86400*220),

('CUST_018', 'PLY_018', 'agent_003', 'Nancy White', 'nancy.w@email.com', '+1-555-0118',
 95000, 800000, 550000, 95000, 'GREEN', 32, 'recreational', 0.68,
 'verified', 'active', 98, 0.47, 28000,
 strftime('%s','now') - 14400, strftime('%s','now') - 86400*95),

('CUST_019', 'PLY_019', 'agent_002', 'David Kim', 'david.k@email.com', '+1-555-0119',
 310000, 1800000, 1200000, 310000, 'GREEN', 26, 'recreational', 0.62,
 'verified', 'active', 178, 0.50, 38000,
 strftime('%s','now') - 9000, strftime('%s','now') - 86400*170),

-- Suspicious players (anomalous)
('CUST_020', 'PLY_020', 'agent_001', 'Unknown User 1', 'u1@temp.com', '+1-555-0120',
 500000, 2000000, 1000000, 800000, 'RED', 78, 'suspicious', 0.88,
 'review', 'active', 89, 0.68, 95000,
 strftime('%s','now') - 3600, strftime('%s','now') - 86400*30),

('CUST_021', 'PLY_021', 'agent_004', 'Unknown User 2', 'u2@temp.com', '+1-555-0121',
 120000, 600000, 300000, -80000, 'YELLOW', 62, 'suspicious', 0.74,
 'review', 'active', 45, 0.42, 52000,
 strftime('%s','now') - 7200, strftime('%s','now') - 86400*25),

('CUST_022', 'PLY_022', 'agent_003', 'Multi Account A', 'multi.a@email.com', '+1-555-0122',
 80000, 400000, 200000, 50000, 'YELLOW', 48, 'suspicious', 0.70,
 'verified', 'active', 34, 0.44, 35000,
 strftime('%s','now') - 10800, strftime('%s','now') - 86400*40),

-- Additional varied
('CUST_023', 'PLY_023', 'agent_002', 'Jennifer Lopez', 'jenny.l@email.com', '+1-555-0123',
 890000, 5000000, 3000000, 890000, 'GREEN', 20, 'recreational', 0.55,
 'verified', 'active', 445, 0.51, 65000,
 strftime('%s','now') - 1800, strftime('%s','now') - 86400*300),

('CUST_024', 'PLY_024', 'agent_001', 'Robert Taylor', 'rob.t@email.com', '+1-555-0124',
 75000, 600000, 400000, 75000, 'GREEN', 40, 'new', 0.68,
 'pending', 'active', 18, 0.44, 20000,
 strftime('%s','now') - 43200, strftime('%s','now') - 86400*18),

('CUST_025', 'PLY_025', 'agent_004', 'Amanda Hughes', 'amanda.h@email.com', '+1-555-0125',
 5400000, 20000000, 10000000, 5400000, 'GREEN', 12, 'whale', 0.93,
 'verified', 'active', 678, 0.47, 320000,
 strftime('%s','now') - 1200, strftime('%s','now') - 86400*400);

-- ============================================================================
-- Seed: Sample notes
-- ============================================================================

INSERT OR IGNORE INTO player_notes (player_id, agent_login, note_type, content, is_pinned, is_active, created_at)
VALUES
('CUST_001', 'agent_001', 'general', 'Sharp player, consistent winner on NBA spreads. Monitor closely.', 1, 1, strftime('%s','now') - 86400*5),
('CUST_001', 'agent_001', 'risk', 'Win rate 58% over 342 wagers. Approaching sharp threshold.', 0, 1, strftime('%s','now') - 86400*2),
('CUST_004', 'agent_003', 'general', 'VIP whale player. Prefers NFL and NBA. Handle with care.', 1, 1, strftime('%s','now') - 86400*10),
('CUST_007', 'agent_001', 'risk', 'Chase behavior detected. Increasing stakes after losses.', 1, 1, strftime('%s','now') - 86400*3),
('CUST_007', 'agent_001', 'followup', 'Called player to discuss responsible gaming. Left voicemail.', 0, 1, strftime('%s','now') - 86400*1),
('CUST_008', 'agent_004', 'incident', 'Multiple chargeback requests. Account under review.', 1, 1, strftime('%s','now') - 86400*7),
('CUST_020', 'agent_001', 'compliance', 'Unusual betting patterns. IP geolocation mismatch detected.', 1, 1, strftime('%s','now') - 86400*4);

-- ============================================================================
-- Seed: Sample transactions
-- ============================================================================

INSERT OR IGNORE INTO player_transactions (
  transaction_id, player_id, agent_login, transaction_type, amount,
  currency, status, method, reference, created_at
)
VALUES
('TXN_001', 'CUST_001', 'agent_001', 'deposit', 500000, 'USD', 'completed', 'ach', 'ACH_20250101', strftime('%s','now') - 86400*30),
('TXN_002', 'CUST_001', 'agent_001', 'withdrawal', -250000, 'USD', 'completed', 'ach', 'ACH_20250115', strftime('%s','now') - 86400*15),
('TXN_003', 'CUST_004', 'agent_003', 'deposit', 2000000, 'USD', 'completed', 'wire', 'WIRE_001', strftime('%s','now') - 86400*60),
('TXN_004', 'CUST_004', 'agent_003', 'deposit', 3000000, 'USD', 'completed', 'wire', 'WIRE_002', strftime('%s','now') - 86400*30),
('TXN_005', 'CUST_007', 'agent_001', 'deposit', 200000, 'USD', 'completed', 'card', 'CARD_001', strftime('%s','now') - 86400*20),
('TXN_006', 'CUST_007', 'agent_001', 'withdrawal', -50000, 'USD', 'completed', 'ach', 'ACH_OUT_001', strftime('%s','now') - 86400*10),
('TXN_007', 'CUST_011', 'agent_002', 'deposit', 500000, 'USD', 'completed', 'card', 'CARD_011', strftime('%s','now') - 86400*14),
('TXN_008', 'CUST_005', 'agent_003', 'deposit', 10000000, 'USD', 'completed', 'wire', 'WIRE_VIP_001', strftime('%s','now') - 86400*90),
('TXN_009', 'CUST_008', 'agent_004', 'chargeback', -150000, 'USD', 'completed', 'card', 'CB_001', strftime('%s','now') - 86400*7),
('TXN_010', 'CUST_008', 'agent_004', 'chargeback', -200000, 'USD', 'pending', 'card', 'CB_002', strftime('%s','now') - 86400*3),
('TXN_011', 'CUST_002', 'agent_001', 'deposit', 1000000, 'USD', 'completed', 'crypto', 'BTC_001', strftime('%s','now') - 86400*45),
('TXN_012', 'CUST_002', 'agent_001', 'withdrawal', -500000, 'USD', 'completed', 'crypto', 'BTC_OUT_001', strftime('%s','now') - 86400*20);

-- ============================================================================
-- Seed: Sample flags
-- ============================================================================

INSERT OR IGNORE INTO player_flags (
  player_id, flag_type, flag_subtype, severity, title, description, source, is_active, created_at
)
VALUES
('CUST_001', 'risk', 'win_rate', 'medium', 'High Win Rate Alert', '58% win rate over 342 wagers. Above threshold of 55%.', 'auto_rule', 1, strftime('%s','now') - 86400*5),
('CUST_003', 'risk', 'win_rate', 'high', 'Sharp Player Monitoring', '56% win rate with aggressive betting patterns.', 'auto_rule', 1, strftime('%s','now') - 86400*3),
('CUST_007', 'risk', 'chase_behavior', 'high', 'Chase Gambler Detected', 'Consistently increases stakes following losses.', 'auto_rule', 1, strftime('%s','now') - 86400*10),
('CUST_008', 'compliance', 'chargeback', 'critical', 'Multiple Chargebacks', '2 chargeback requests in 7 days. $350,000 total.', 'manual', 1, strftime('%s','now') - 86400*7),
('CUST_008', 'risk', 'loss_rate', 'high', 'Severe Loss Pattern', '69% loss rate over 567 wagers. Account suspended.', 'auto_rule', 1, strftime('%s','now') - 86400*14),
('CUST_020', 'fraud', 'ip_anomaly', 'high', 'IP Geolocation Mismatch', 'Betting from 6 different IPs across 3 countries in 24h.', 'auto_rule', 1, strftime('%s','now') - 86400*4),
('CUST_021', 'fraud', 'device_anomaly', 'medium', 'Multiple Devices', '3 devices used simultaneously.', 'auto_rule', 1, strftime('%s','now') - 86400*6),
('CUST_001', 'risk', 'win_rate', 'low', 'Win Rate Watch', 'Initial flag for monitoring.', 'auto_rule', 0, strftime('%s','now') - 86400*30);

-- ============================================================================
-- Seed: Sample player links
-- ============================================================================

INSERT OR IGNORE INTO player_links (player_id, link_type, link_value, confidence, first_seen, last_seen, occurrence_count)
VALUES
('CUST_020', 'ip', '203.0.113.45', 85, strftime('%s','now') - 86400*30, strftime('%s','now') - 3600, 42),
('CUST_020', 'ip', '198.51.100.12', 72, strftime('%s','now') - 86400*25, strftime('%s','now') - 7200, 18),
('CUST_020', 'device', 'a1b2c3d4e5f6', 95, strftime('%s','now') - 86400*30, strftime('%s','now') - 3600, 56),
('CUST_022', 'ip', '192.168.1.100', 90, strftime('%s','now') - 86400*40, strftime('%s','now') - 1800, 34),
('CUST_022', 'account', 'CUST_021', 65, strftime('%s','now') - 86400*20, strftime('%s','now') - 86400, 8),
('CUST_001', 'device', 'f6e5d4c3b2a1', 98, strftime('%s','now') - 86400*120, strftime('%s','now') - 1800, 312),
('CUST_004', 'device', 'abc123def456', 99, strftime('%s','now') - 86400*365, strftime('%s','now') - 600, 1245),
('CUST_004', 'ip', '10.0.0.55', 92, strftime('%s','now') - 86400*200, strftime('%s','now') - 1200, 289);

-- ============================================================================

-- DOWN
-- DROP TABLE IF EXISTS player_links;
-- DROP TABLE IF EXISTS player_flags;
-- DROP TABLE IF EXISTS player_transactions;
-- DROP TABLE IF EXISTS player_notes;
-- DROP TABLE IF EXISTS customers;
