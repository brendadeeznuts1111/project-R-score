-- UP
-- Zone 2: Patterns & Rules Engine — Golden Hour (#f4a900)

-- ---------------------------------------------------------------------------
-- patterns_detected: Stores all detected wagering patterns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patterns_detected (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  sport TEXT NOT NULL,
  event_id TEXT NOT NULL,
  market TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  factors_json TEXT NOT NULL DEFAULT '[]',
  triggered_by_rule_id TEXT,
  outcome TEXT CHECK (outcome IN ('hit', 'miss', 'pending')),
  outcome_note TEXT,
  detected_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ---------------------------------------------------------------------------
-- rules: Trading rules for auto-trade simulation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rule_type TEXT NOT NULL,
  conditions_json TEXT NOT NULL DEFAULT '[]',
  actions_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  simulation_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  total_pnl INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- rule_executions: Log of rule execution results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rule_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('simulated', 'live')),
  input_data_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  pnl INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  executed_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes for patterns_detected
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns_detected(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_sport ON patterns_detected(sport);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns_detected(confidence);
CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON patterns_detected(detected_at);
CREATE INDEX IF NOT EXISTS idx_patterns_event ON patterns_detected(event_id);

-- ---------------------------------------------------------------------------
-- Indexes for rules
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled);
CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority);
CREATE INDEX IF NOT EXISTS idx_rules_created_at ON rules(created_at);

-- ---------------------------------------------------------------------------
-- Indexes for rule_executions
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exec_rule_id ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_exec_type ON rule_executions(execution_type);
CREATE INDEX IF NOT EXISTS idx_exec_executed_at ON rule_executions(executed_at);

-- ---------------------------------------------------------------------------
-- Seed: 3 sample rules (disabled by default)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO rules (id, name, description, rule_type, conditions_json, actions_json, enabled, priority, simulation_count, win_count, loss_count, total_pnl, created_by, created_at, updated_at) VALUES
(
  'rule_steam_alert',
  'Steam Move Alert',
  'Alert when 3+ books move the same direction within 5 minutes on NFL spreads',
  'steam_detected',
  '[{"field":"steam_book_count","comparator":"gte","value":3,"logic":"AND"},{"field":"sport","comparator":"eq","value":"NFL","logic":"AND"},{"field":"market","comparator":"eq","value":"spread"}]',
  '[{"type":"alert","config":{"severity":"high"}},{"type":"simulate","config":{"stake":10000}}]',
  0, 8, 0, 0, 0, 0, 'system',
  strftime('%s', 'now'), strftime('%s', 'now')
),
(
  'rule_odds_dip',
  'Odds Dip Capture',
  'Simulate a trade when odds drop below -120 on any NBA moneyline',
  'odds_threshold',
  '[{"field":"odds","comparator":"lt","value":-120,"logic":"AND"},{"field":"sport","comparator":"eq","value":"NBA","logic":"AND"},{"field":"market","comparator":"eq","value":"ml"}]',
  '[{"type":"simulate","config":{"stake":5000}},{"type":"log_only","config":{}}]',
  0, 6, 0, 0, 0, 0, 'system',
  strftime('%s', 'now'), strftime('%s', 'now')
),
(
  'rule_confidence_high',
  'High Confidence Auto-Sim',
  'Auto-simulate when pattern confidence exceeds 80% on any sport',
  'confidence_level',
  '[{"field":"confidence","comparator":"gte","value":80,"logic":"AND"},{"field":"odds","comparator":"lt","value":0}]',
  '[{"type":"simulate","config":{"stake":15000}},{"type":"webhook","config":{"url":"/api/webhooks/alert"}}]',
  0, 9, 0, 0, 0, 0, 'system',
  strftime('%s', 'now'), strftime('%s', 'now')
);

-- ---------------------------------------------------------------------------
-- Seed: 5 sample pattern detections
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO patterns_detected (id, pattern_type, sport, event_id, market, description, confidence, factors_json, triggered_by_rule_id, outcome, detected_at) VALUES
(
  'pat_steam_nfl_001',
  'steam_moves',
  'NFL',
  'evt_ne_vs_mia_001',
  'spread',
  'Steam move: 5 books moved down on spread (-3.5 to -4.5)',
  85,
  '[{"factor":"book_count","weight":0.4,"description":"5 books aligned","value":5},{"factor":"direction","weight":0.35,"description":"All moved down","value":"down"},{"factor":"line_delta","weight":0.25,"description":"1 point move","value":1}]',
  NULL,
  'pending',
  strftime('%s', 'now') - 3600
),
(
  'pat_rev_nba_001',
  'reverse_line',
  'NBA',
  'evt_lal_vs_gsw_001',
  'spread',
  'Reverse line: spread moved toward Lakers despite 70% public on GSW',
  72,
  '[{"factor":"public_pct","weight":0.45,"description":"70% public on favorite","value":70},{"factor":"line_move","weight":0.35,"description":"Moved 0.5 against public","value":0.5},{"factor":"book_count","weight":0.2,"description":"3 books involved","value":3}]',
  NULL,
  'hit',
  strftime('%s', 'now') - 7200
),
(
  'pat_sharp_nfl_001',
  'sharp_money',
  'NFL',
  'evt_kc_vs_buf_001',
  'total',
  'Sharp money: PINNACLE moved total down 0.5, 4 books followed within 3 min',
  91,
  '[{"factor":"sharp_book","weight":0.35,"description":"Pinnacle triggered","value":"PINNACLE"},{"factor":"follower_count","weight":0.35,"description":"4 books followed","value":4},{"factor":"speed","weight":0.3,"description":"Within 3 minutes","value":3}]',
  NULL,
  'hit',
  strftime('%s', 'now') - 1800
),
(
  'pat_freeze_ncaab_001',
  'line_freeze',
  'NCAAB',
  'evt_duke_vs_unc_001',
  'spread',
  'Line freeze: 12 ticks but only 0.3% avg move — books holding at -2.5',
  58,
  '[{"factor":"tick_count","weight":0.4,"description":"12 price updates","value":12},{"factor":"avg_movement","weight":0.4,"description":"Tiny average movement","value":0.3},{"factor":"stability","weight":0.2,"description":"40:1 tick-to-move ratio","value":40}]',
  NULL,
  'pending',
  strftime('%s', 'now') - 900
),
(
  'pat_key_nfl_001',
  'key_number',
  'NFL',
  'evt_phi_vs_dal_001',
  'spread',
  'Key number: spread crossed +3 (moved from +2.5 to +3.5) — key number breach',
  78,
  '[{"factor":"key_number","weight":0.5,"description":"Key number 3 crossed","value":3},{"factor":"line_delta","weight":0.3,"description":"+2.5 to +3.5","value":"+2.5 to +3.5"},{"factor":"sport","weight":0.2,"description":"NFL high-value key number","value":"NFL"}]',
  NULL,
  'miss',
  strftime('%s', 'now') - 5400
);

-- DOWN
-- DROP INDEX IF EXISTS idx_exec_executed_at;
-- DROP INDEX IF EXISTS idx_exec_type;
-- DROP INDEX IF EXISTS idx_exec_rule_id;
-- DROP INDEX IF EXISTS idx_rules_created_at;
-- DROP INDEX IF EXISTS idx_rules_priority;
-- DROP INDEX IF EXISTS idx_rules_enabled;
-- DROP INDEX IF EXISTS idx_rules_type;
-- DROP INDEX IF EXISTS idx_patterns_event;
-- DROP INDEX IF EXISTS idx_patterns_detected_at;
-- DROP INDEX IF EXISTS idx_patterns_confidence;
-- DROP INDEX IF EXISTS idx_patterns_sport;
-- DROP INDEX IF EXISTS idx_patterns_type;
-- DROP TABLE IF EXISTS rule_executions;
-- DROP TABLE IF EXISTS rules;
-- DROP TABLE IF EXISTS patterns_detected;
