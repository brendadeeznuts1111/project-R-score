# Sports Terminal OS — Complete Database Schema

> **Version:** v5.2.0+partner-profile-1.0+telegram-hub-1.0
> **Dialect:** SQLite 3.45+ (WAL mode, foreign keys enabled)
> **Runtime:** bun:sqlite
> **Total Tables:** 46 (34 core + 10 partner profile + 2 telegram hub)
> **Total Indexes:** 80+

---

## Table of Contents

1. [Schema Conventions](#1-schema-conventions)
2. [Complete Table Inventory by Domain](#2-complete-table-inventory-by-domain)
3. [Migration Strategy](#3-migration-strategy)
4. [Domain: Live Data (6 tables)](#4-domain-live-data)
5. [Domain: IP Surveillance (4 tables)](#5-domain-ip-surveillance)
6. [Domain: Rules (1 table)](#6-domain-rules)
7. [Domain: Webhooks (3 tables)](#7-domain-webhooks)
8. [Domain: Sandbox (5 tables)](#8-domain-sandbox)
9. [Domain: Protected (10 tables)](#9-domain-protected)
10. [Domain: Player & Agent (5 tables)](#10-domain-player--agent)
11. [Domain: Risk & Analytics (8 tables)](#11-domain-risk--analytics)
12. [Domain: Partner Profile OS (10 tables)](#12-domain-partner-profile-os)
13. [Domain: Telegram Hub (2 tables)](#13-domain-telegram-hub)
14. [Seed Data](#14-seed-data)
15. [ER Diagram Summary](#15-er-diagram-summary)

---

## 1. Schema Conventions

### Naming
- `snake_case` for all table names, column names, and index names
- Table names are plural nouns: `wagers`, `risk_positions`, `partner_profiles`
- Junction tables use both entity names: `player_agent_map`
- Audit/log tables use `_log` suffix: `partner_gate_log`, `limit_enforcement_log`

### Types
| SQLite Type | Usage |
|-------------|-------|
| `TEXT` | Strings, UUIDs, enums, JSON blobs, identifiers |
| `INTEGER` | Booleans (0/1), counts, timestamps (unix epoch seconds), IDs |
| `REAL` | Monetary amounts, percentages, scores, odds |
| `BLOB` | Binary data (rarely used) |
| `DATETIME` | ISO-8601 strings (used in telegram hub for compatibility) |

### Timestamps
- All timestamps stored as **INTEGER unix epoch seconds** (except telegram hub which uses DATETIME)
- Default: `DEFAULT (strftime('%s','now'))`
- Naming: `created_at`, `updated_at`, `delivered_at`, `materialized_at`, etc.

### Foreign Keys
- `PRAGMA foreign_keys = ON` on every connection
- All foreign keys indexed
- `ON DELETE CASCADE` for dependent/junction data
- `ON DELETE RESTRICT` for master records referenced by logs

### JSON Columns
- Stored as `TEXT` containing JSON objects/arrays
- Named with `_json` suffix: `jurisdiction_json`, `metadata_json`
- Validated at application layer (Zod schemas)

### Booleans
- Stored as `INTEGER` with `DEFAULT 0`
- `0` = false, `1` = true

### Indexes
- All PRIMARY KEY columns automatically indexed
- All FOREIGN KEY columns explicitly indexed
- All frequently queried columns indexed
- Composite indexes ordered by selectivity (most selective first)
- Partial indexes used where appropriate

---

## 2. Complete Table Inventory by Domain

### Core Terminal (34 tables)

| # | Domain | Count | Tables |
|---|--------|-------|--------|
| 1 | Live Data | 6 | `buckeye_sessions`, `raw_players`, `raw_wagers`, `raw_agent_performance`, `tokens`, `request_log` |
| 2 | IP Surveillance | 4 | `ip_tracking`, `ip_denylist`, `ip_flags`, `ip_reputation_log` |
| 3 | Rules | 1 | `rules` |
| 4 | Webhooks | 3 | `webhook_configs`, `alert_log`, `webhook_delivery_log` |
| 5 | Sandbox | 5 | `sandbox_scenarios_v2`, `sandbox_customers`, `sandbox_snapshots`, `sandbox_ab_tests_v2`, `sandbox_summary_queue_v2` |
| 6 | Protected | 10 | `wagers`, `bet_actions`, `agent_hierarchy`, `player_agent_map`, `agent_supergroups`, `agent_supergroup_topics`, `telegram_topics`, `telegram_channels`, `telegram_messages`, `log_snapshots` |
| 7 | Player & Agent | 5 | `customers`, `agents`, `player_notes`, `player_transactions`, `player_flags` |
| 8 | Risk & Analytics | 8 | `customer_features`, `ai_risk_flags`, `risk_positions`, `enforcement_queue`, `limit_enforcement_log`, `wager_violations`, `risk_config`, `risk_analytics_snapshots` |

### Partner Profile OS (10 tables)

| # | Domain | Count | Tables |
|---|--------|-------|--------|
| 9 | Partner Profile | 10 | `partner_profiles`, `partner_sources`, `partner_cultivation`, `partner_settlement`, `partner_telegram_topics`, `partner_gates`, `partner_runtime_state`, `partner_lifecycle_log`, `partner_gate_log`, `partner_settlement_log` |

### Telegram Hub (2 tables)

| # | Domain | Count | Tables |
|---|--------|-------|--------|
| 10 | Telegram Hub | 2 | `bot_heartbeat`, `telegram_dispatch_log` |

**Grand Total: 46 tables**

---

## 3. Migration Strategy

| File | Contents | Tables |
|------|----------|--------|
| `001_core_tables.sql` | Core terminal infrastructure | 19 tables (Live Data, IP Surveillance, Rules, Webhooks, Sandbox) |
| `002_protected_tables.sql` | Protected data layer | 10 tables (wagers, bet_actions, hierarchy, telegram core) |
| `003_player_agent_risk.sql` | Player, Agent, Risk & Analytics | 13 tables + risk config |
| `004_partner_profile.sql` | Partner Profile OS | 10 tables |
| `005_telegram_hub.sql` | Telegram Bot Hub + modifications | 2 tables + 1 column addition |

Each migration has:
- `-- UP` section with `CREATE TABLE IF NOT EXISTS` statements
- `-- DOWN` section with safe rollback (`DROP TABLE IF EXISTS` for non-protected tables only)
- `PRAGMA foreign_keys = ON;`
- All indexes, triggers, and seed data

---

## 4. Domain: Live Data

### 4.1 buckeye_sessions

Active session records from Buckeye upstream. Each successful auth creates one row.

```sql
CREATE TABLE IF NOT EXISTS buckeye_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT    NOT NULL UNIQUE,        -- Buckeye session UUID
  token       TEXT    NOT NULL,               -- JWT / session token (encrypted at rest)
  expires_at  INTEGER NOT NULL,               -- Unix epoch when session expires
  is_active   INTEGER DEFAULT 1,              -- 1 = active, 0 = expired/revoked
  cf_token    TEXT,                           -- Cloudflare clearance token
  user_agent  TEXT,                           -- Client user agent
  ip_address  TEXT,                           -- Origin IP
  metadata_json TEXT,                         -- Additional session metadata
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_active ON buckeye_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_expires ON buckeye_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_created ON buckeye_sessions(created_at DESC);
```

### 4.2 raw_players

Player roster ingested from Buckeye /players endpoint. Immutable raw data.

```sql
CREATE TABLE IF NOT EXISTS raw_players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,           -- Upstream player ID
  session_id      TEXT    NOT NULL,           -- FK to buckeye_sessions
  agent_login     TEXT    NOT NULL,           -- Agent this player belongs to
  name            TEXT,                       -- Display name
  email           TEXT,                       -- Contact email
  phone           TEXT,                       -- Contact phone
  balance         REAL    DEFAULT 0,          -- Current balance in cents
  status          TEXT    DEFAULT 'active',   -- active | suspended | closed
  risk_tier       TEXT    DEFAULT 'GREEN',    -- BLACK | RED | YELLOW | GREEN
  archetype       TEXT,                       -- sharp | whale | chase_gambler | new | recreational | suspicious
  last_wager_at   INTEGER,                    -- Unix epoch of last wager
  wager_count     INTEGER DEFAULT 0,
  win_rate        REAL,                       -- 0.0 - 1.0
  pnl_lifetime    REAL    DEFAULT 0,          -- Lifetime P&L in cents
  metadata_json   TEXT,                       -- Raw upstream response JSON
  ingested_at     INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(player_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_players_agent ON raw_players(agent_login);
CREATE INDEX IF NOT EXISTS idx_raw_players_tier ON raw_players(risk_tier);
CREATE INDEX IF NOT EXISTS idx_raw_players_archetype ON raw_players(archetype);
CREATE INDEX IF NOT EXISTS idx_raw_players_ingested ON raw_players(ingested_at DESC);
```

### 4.3 raw_wagers

Individual wagers ingested from Buckeye /wagers endpoint. Immutable raw data.

```sql
CREATE TABLE IF NOT EXISTS raw_wagers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_id        TEXT    NOT NULL,           -- Upstream wager ID
  session_id      TEXT    NOT NULL,           -- FK to buckeye_sessions
  player_id       TEXT    NOT NULL,           -- FK to raw_players
  agent_login     TEXT    NOT NULL,           -- Agent handling this wager
  wager_number    TEXT,                       -- Human-readable wager number
  sport           TEXT,                       -- Sport code (NBA, NFL, MLB, etc.)
  event_id        TEXT,                       -- Event/match ID
  event_name      TEXT,                       -- Human-readable event name
  market          TEXT,                       -- spread | ml | total | parlay | etc.
  selection       TEXT,                       -- Team/player selected
  odds            REAL,                       -- American odds (+150, -110, etc.)
  stake           REAL    NOT NULL,           -- Wager amount in cents
  potential_payout REAL,                     -- Potential win amount in cents
  status          TEXT    DEFAULT 'pending',  -- pending | won | lost | pushed | cancelled
  result          TEXT,                       -- win | loss | push
  settled_at      INTEGER,                    -- When wager was settled
  placed_at       INTEGER NOT NULL,           -- When wager was placed
  ip_address      TEXT,                       -- IP address at placement
  device_fingerprint TEXT,                    -- Device fingerprint hash
  metadata_json   TEXT,                       -- Raw upstream response JSON
  ingested_at     INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_raw_wagers_player ON raw_wagers(player_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_agent ON raw_wagers(agent_login, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_status ON raw_wagers(status, settled_at);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_event ON raw_wagers(event_id, sport);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_session ON raw_wagers(session_id, ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_ip ON raw_wagers(ip_address);
```

### 4.4 raw_agent_performance

Agent performance metrics ingested from Buckeye /agentPerformance endpoint.

```sql
CREATE TABLE IF NOT EXISTS raw_agent_performance (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login         TEXT    NOT NULL,       -- Agent identifier
  session_id          TEXT    NOT NULL,       -- FK to buckeye_sessions
  report_date         TEXT    NOT NULL,       -- YYYY-MM-DD
  period              TEXT    DEFAULT 'daily', -- daily | weekly | monthly
  total_wagers        INTEGER DEFAULT 0,
  total_stake         REAL    DEFAULT 0,      -- In cents
  total_payout        REAL    DEFAULT 0,      -- In cents
  net_pnl             REAL    DEFAULT 0,      -- Agent P&L in cents
  hold_percentage     REAL,                   -- hold % for the period
  active_players      INTEGER DEFAULT 0,
  new_players         INTEGER DEFAULT 0,
  avg_wager_size      REAL,                   -- Average stake in cents
  unique_sports       INTEGER DEFAULT 0,      -- Number of sports wagered on
  parlay_count        INTEGER DEFAULT 0,
  straight_count      INTEGER DEFAULT 0,
  teaser_count        INTEGER DEFAULT 0,
  metadata_json       TEXT,
  ingested_at         INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(agent_login, report_date, period)
);

CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_agent ON raw_agent_performance(agent_login, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_session ON raw_agent_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_ingested ON raw_agent_performance(ingested_at DESC);
```

### 4.5 tokens

API tokens and JWT secrets vault. Stores both internal and external credentials.

```sql
CREATE TABLE IF NOT EXISTS tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id    TEXT    NOT NULL UNIQUE,        -- Human-readable token identifier
  token_type  TEXT    NOT NULL,               -- jwt_secret | api_key | bearer | cf_clearance
  token_hash  TEXT    NOT NULL,               -- Hashed token value (never store plain)
  scope       TEXT    DEFAULT 'read',         -- read | write | admin | system
  description TEXT,
  expires_at  INTEGER,                        -- NULL = never expires
  is_active   INTEGER DEFAULT 1,
  last_used_at INTEGER,
  created_by  TEXT,                           -- Who created this token
  metadata_json TEXT,
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_tokens_type ON tokens(token_type, is_active);
CREATE INDEX IF NOT EXISTS idx_tokens_scope ON tokens(scope, is_active);
```

### 4.6 request_log

HTTP request/response audit log for all API calls.

```sql
CREATE TABLE IF NOT EXISTS request_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      TEXT    NOT NULL,           -- UUID for tracing
  method          TEXT    NOT NULL,           -- GET | POST | PUT | DELETE | PATCH
  path            TEXT    NOT NULL,           -- Request path
  query_params_json TEXT,                     -- Parsed query parameters
  request_headers_json TEXT,
  request_body_json TEXT,                     -- Truncated body (max 10KB)
  response_status INTEGER,                   -- HTTP status code
  response_body_json TEXT,                    -- Truncated response (max 10KB)
  duration_ms     INTEGER,                    -- Request duration
  client_ip       TEXT,
  user_agent      TEXT,
  auth_method     TEXT,                       -- jwt | apikey | session | public
  auth_subject    TEXT,                       -- User ID or agent login
  error_message   TEXT,
  error_code      TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_request_log_path ON request_log(path, method, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_status ON request_log(response_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_auth ON request_log(auth_subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_created ON request_log(created_at DESC);
```

---

## 5. Domain: IP Surveillance

### 5.1 ip_tracking

IP address tracking per player/wager. Core table for IP surveillance pipeline.

```sql
CREATE TABLE IF NOT EXISTS ip_tracking (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,           -- IPv4 or IPv6 address
  player_id       TEXT    NOT NULL,           -- Which player used this IP
  agent_login     TEXT    NOT NULL,           -- Which agent the player belongs to
  wager_id        TEXT,                       -- Associated wager (if from wager)
  first_seen_at   INTEGER NOT NULL,           -- Unix epoch, first time this IP was seen
  last_seen_at    INTEGER NOT NULL,           -- Unix epoch, most recent sighting
  sighting_count  INTEGER DEFAULT 1,          -- Number of times this IP was observed
  country_code    TEXT,                       -- GeoIP country (ISO 3166-1 alpha-2)
  region_code     TEXT,                       -- GeoIP region/state code
  city            TEXT,                       -- GeoIP city
  isp             TEXT,                       -- Internet Service Provider
  is_vpn          INTEGER DEFAULT 0,          -- 1 = VPN detected
  is_proxy        INTEGER DEFAULT 0,          -- 1 = Proxy detected
  is_tor          INTEGER DEFAULT 0,          -- 1 = Tor exit node
  is_mobile       INTEGER DEFAULT 0,          -- 1 = Mobile carrier
  risk_score      INTEGER DEFAULT 0,          -- 0-100 aggregated IP risk
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(ip_address, player_id)
);

CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip ON ip_tracking(ip_address, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_player ON ip_tracking(player_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_agent ON ip_tracking(agent_login, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_risk ON ip_tracking(risk_score, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_vpn ON ip_tracking(is_vpn, is_proxy, is_tor);
```

### 5.2 ip_denylist

Manually or automatically blocked IP addresses. Checked on every wager ingestion.

```sql
CREATE TABLE IF NOT EXISTS ip_denylist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL UNIQUE,    -- IPv4 or IPv6 address / CIDR range
  ip_range_start  INTEGER,                    -- For CIDR: integer representation of start
  ip_range_end    INTEGER,                    -- For CIDR: integer representation of end
  list_type       TEXT    DEFAULT 'manual',   -- manual | auto | threat_intel | compliance
  reason          TEXT    NOT NULL,           -- Why this IP was blocked
  source          TEXT,                       -- Which system/service flagged it
  blocked_by      TEXT,                       -- Admin user who added (null = auto)
  expiry_at       INTEGER,                    -- NULL = permanent block
  is_active       INTEGER DEFAULT 1,
  hit_count       INTEGER DEFAULT 0,          -- How many times this IP was matched
  last_hit_at     INTEGER,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_denylist_active ON ip_denylist(is_active, ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_type ON ip_denylist(list_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_expiry ON ip_denylist(expiry_at);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_range ON ip_denylist(ip_range_start, ip_range_end) WHERE ip_range_start IS NOT NULL;
```

### 5.3 ip_flags

Automated IP analysis results from the IP surveillance cron job (*/15 min).

```sql
CREATE TABLE IF NOT EXISTS ip_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,           -- Flagged IP
  player_id       TEXT    NOT NULL,           -- Affected player
  agent_login     TEXT    NOT NULL,           -- Affected agent
  flag_type       TEXT    NOT NULL,           -- shared_ip | vpn_jump | bot_pattern | geo_anomaly | velocity_spike | new_country
  severity        TEXT    DEFAULT 'medium',   -- low | medium | high | critical
  description     TEXT    NOT NULL,
  evidence_json   TEXT,                       -- Supporting data: geo diffs, ASN changes, etc.
  resolution      TEXT,                       -- NULL = open | dismissed | confirmed | auto_resolved
  resolved_by     TEXT,                       -- Admin who resolved
  resolved_at     INTEGER,
  is_active       INTEGER DEFAULT 1,          -- 1 = open, 0 = resolved
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_flags_ip ON ip_flags(ip_address, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_player ON ip_flags(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_type ON ip_flags(flag_type, severity, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_agent ON ip_flags(agent_login, is_active, created_at DESC);
```

### 5.4 ip_reputation_log

Immutable audit log of IP reputation scoring changes.

```sql
CREATE TABLE IF NOT EXISTS ip_reputation_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,
  player_id       TEXT,
  old_score       INTEGER,
  new_score       INTEGER NOT NULL,
  score_delta     INTEGER NOT NULL,
  reason          TEXT    NOT NULL,           -- Why score changed
  source          TEXT,                       -- Which system triggered the change
  triggered_by    TEXT,                       -- Manual action or system
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_rep_log_ip ON ip_reputation_log(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_rep_log_player ON ip_reputation_log(player_id, created_at DESC);
```

---

## 6. Domain: Rules

### 6.1 rules

Rules engine configuration. Each rule is a condition + action evaluated against incoming signals.

```sql
CREATE TABLE IF NOT EXISTS rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id         TEXT    NOT NULL UNIQUE,    -- Human-readable rule identifier
  name            TEXT    NOT NULL,
  description     TEXT,
  rule_type       TEXT    NOT NULL,           -- threshold | pattern | composite | time_based
  condition_json  TEXT    NOT NULL,           -- JSON: { field, operator, value, unit? }
  action_json     TEXT    NOT NULL,           -- JSON: { type, params }
  priority        INTEGER DEFAULT 100,        -- Lower = higher priority (evaluated first)
  is_active       INTEGER DEFAULT 1,
  match_count     INTEGER DEFAULT 0,          -- How many times this rule fired
  last_matched_at INTEGER,
  tags_json       TEXT,                       -- Array of category tags
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(rule_type, is_active);
```

---

## 7. Domain: Webhooks

### 7.1 webhook_configs

Webhook endpoint configurations. Each row is a target URL + event filter.

```sql
CREATE TABLE IF NOT EXISTS webhook_configs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id      TEXT    NOT NULL UNIQUE,    -- Human-readable webhook identifier
  name            TEXT    NOT NULL,
  url             TEXT    NOT NULL,           -- Target URL
  method          TEXT    DEFAULT 'POST',     -- HTTP method
  headers_json    TEXT,                       -- Custom headers to send
  auth_type       TEXT,                       -- none | bearer | hmac | api_key
  auth_config_json TEXT,                     -- { secret, header_name } for HMAC
  event_types_json TEXT NOT NULL,            -- ["risk_alert", "wager_placed", ...]
  filters_json    TEXT,                       -- Optional filtering conditions
  retry_policy_json TEXT DEFAULT '{"max_retries":3,"backoff_ms":1000}', -- Retry config
  timeout_ms      INTEGER DEFAULT 5000,
  is_active       INTEGER DEFAULT 1,
  last_delivered_at INTEGER,
  last_error_at   INTEGER,
  last_error_message TEXT,
  delivery_count  INTEGER DEFAULT 0,
  failure_count   INTEGER DEFAULT 0,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_created ON webhook_configs(created_at DESC);
```

### 7.2 alert_log

Alert records generated by the risk system and other sources. Dispatched to webhooks.

```sql
CREATE TABLE IF NOT EXISTS alert_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id        TEXT    NOT NULL UNIQUE,    -- UUID for this alert
  alert_type      TEXT    NOT NULL,           -- risk_alert | system_alert | pattern_alert | enforcement_alert
  severity        TEXT    NOT NULL,           -- INFO | LOW | MEDIUM | HIGH | CRITICAL
  source          TEXT    NOT NULL,           -- Which system generated the alert
  source_id       TEXT,                       -- ID of the triggering record
  title           TEXT    NOT NULL,
  message         TEXT    NOT NULL,
  entity_type     TEXT,                       -- player | agent | wager | system
  entity_id       TEXT,                       -- ID of the affected entity
  agent_login     TEXT,                       -- Affected agent (for routing)
  player_id       TEXT,                       -- Affected player
  context_json    TEXT,                       -- Full alert context
  dispatched      INTEGER DEFAULT 0,          -- 1 = sent to webhooks
  dispatch_results_json TEXT,                -- Per-webhook delivery status
  acknowledged_by TEXT,                       -- Admin who acknowledged
  acknowledged_at INTEGER,
  resolved_at     INTEGER,
  is_active       INTEGER DEFAULT 1,          -- 1 = open, 0 = closed/resolved
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_alert_log_type ON alert_log(alert_type, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_severity ON alert_log(severity, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_log_entity ON alert_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_agent ON alert_log(agent_login, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_created ON alert_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_dispatched ON alert_log(dispatched, created_at);
```

### 7.3 webhook_delivery_log

Immutable audit log of every webhook delivery attempt.

```sql
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id      TEXT    NOT NULL,           -- FK to webhook_configs.webhook_id
  alert_id        TEXT    NOT NULL,           -- FK to alert_log.alert_id
  attempt_number  INTEGER DEFAULT 1,          -- 1 = first attempt
  request_body_json TEXT,                     -- What was sent
  response_status INTEGER,                   -- HTTP status from target
  response_body   TEXT,                       -- Response body (truncated)
  latency_ms      INTEGER,
  success         INTEGER DEFAULT 0,          -- 1 = delivered successfully
  error_message   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_del_webhook ON webhook_delivery_log(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_del_alert ON webhook_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_webhook_del_success ON webhook_delivery_log(success, created_at DESC);
```

---

## 8. Domain: Sandbox

### 8.1 sandbox_scenarios_v2

Sandbox test scenarios — saved configurations for A/B testing simulations.

```sql
CREATE TABLE IF NOT EXISTS sandbox_scenarios_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id     TEXT    NOT NULL UNIQUE,    -- Human-readable scenario identifier
  name            TEXT    NOT NULL,
  description     TEXT,
  scenario_type   TEXT    NOT NULL,           -- a_b_test | simulation | regression | stress
  config_json     TEXT    NOT NULL,           -- Full scenario configuration
  is_active       INTEGER DEFAULT 1,
  run_count       INTEGER DEFAULT 0,
  last_run_at     INTEGER,
  last_result_json TEXT,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_type ON sandbox_scenarios_v2(scenario_type, is_active);
CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_active ON sandbox_scenarios_v2(is_active);
```

### 8.2 sandbox_customers

Customer records within sandbox environments. Isolated from production data.

```sql
CREATE TABLE IF NOT EXISTS sandbox_customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT    NOT NULL,           -- Sandbox customer identifier
  scenario_id     TEXT    NOT NULL,           -- FK to sandbox_scenarios_v2
  name            TEXT,
  email           TEXT,
  archetype       TEXT    DEFAULT 'recreational', -- sandbox archetype for sim
  balance         REAL    DEFAULT 100000,     -- Starting balance in cents
  risk_tier       TEXT    DEFAULT 'GREEN',
  config_json     TEXT,                       -- Simulation parameters
  is_active       INTEGER DEFAULT 1,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(customer_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_sandbox_customers_scenario ON sandbox_customers(scenario_id, is_active);
```

### 8.3 sandbox_snapshots

Point-in-time snapshots of sandbox state for comparison and rollback.

```sql
CREATE TABLE IF NOT EXISTS sandbox_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     TEXT    NOT NULL UNIQUE,    -- UUID
  scenario_id     TEXT    NOT NULL,           -- FK to sandbox_scenarios_v2
  customer_id     TEXT,                       -- NULL = full scenario snapshot
  snapshot_type   TEXT    DEFAULT 'manual',   -- manual | scheduled | pre_test | post_test
  label           TEXT,                       -- Human-readable label
  state_json      TEXT    NOT NULL,           -- Serialized full state
  metrics_json    TEXT,                       -- Derived metrics at snapshot time
  created_by      TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_snapshots_scenario ON sandbox_snapshots(scenario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_snapshots_customer ON sandbox_snapshots(customer_id, created_at DESC);
```

### 8.4 sandbox_ab_tests_v2

A/B test definitions and results within the sandbox.

```sql
CREATE TABLE IF NOT EXISTS sandbox_ab_tests_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id         TEXT    NOT NULL UNIQUE,    -- Human-readable test identifier
  scenario_id     TEXT    NOT NULL,           -- FK to sandbox_scenarios_v2
  name            TEXT    NOT NULL,
  description     TEXT,
  variant_a_json  TEXT    NOT NULL,           -- Control configuration
  variant_b_json  TEXT    NOT NULL,           -- Treatment configuration
  status          TEXT    DEFAULT 'draft',    -- draft | running | paused | completed
  winner          TEXT,                       -- a | b | tie | inconclusive
  sample_size_a   INTEGER DEFAULT 0,
  sample_size_b   INTEGER DEFAULT 0,
  metric_name     TEXT,                       -- Primary metric being tested
  results_json    TEXT,                       -- Full statistical results
  started_at      INTEGER,
  ended_at        INTEGER,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_ab_scenario ON sandbox_ab_tests_v2(scenario_id, status);
CREATE INDEX IF NOT EXISTS idx_sandbox_ab_status ON sandbox_ab_tests_v2(status, created_at DESC);
```

### 8.5 sandbox_summary_queue_v2

Queue for pending AI-generated summaries of sandbox test results.

```sql
CREATE TABLE IF NOT EXISTS sandbox_summary_queue_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id         TEXT    NOT NULL,           -- FK to sandbox_ab_tests_v2.test_id
  scenario_id     TEXT    NOT NULL,           -- FK to sandbox_scenarios_v2.scenario_id
  status          TEXT    DEFAULT 'pending',  -- pending | processing | completed | failed
  priority        INTEGER DEFAULT 100,        -- Lower = higher priority
  prompt_text     TEXT,                       -- AI prompt
  summary_text    TEXT,                       -- Generated summary (when completed)
  model_used      TEXT,                       -- Which AI model generated the summary
  tokens_used     INTEGER,
  error_message   TEXT,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  processed_at    INTEGER,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_queue_status ON sandbox_summary_queue_v2(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_queue_test ON sandbox_summary_queue_v2(test_id);
```

---

## 9. Domain: Protected

> **WARNING:** These tables contain production data that must NEVER be dropped.
> Migrations use `CREATE TABLE IF NOT EXISTS` and DOWN migrations do NOT include DROP for these tables.

### 9.1 wagers

Production wager records. The canonical wager table (not raw_wagers which is upstream data).

```sql
CREATE TABLE IF NOT EXISTS wagers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_number    TEXT    NOT NULL UNIQUE,    -- Human-readable wager number
  player_id       TEXT    NOT NULL,           -- FK to customers/players
  agent_login     TEXT    NOT NULL,           -- FK to agents
  sport           TEXT    NOT NULL,
  event_id        TEXT,
  event_name      TEXT,
  market          TEXT    NOT NULL,           -- spread | ml | total | parlay | teaser | etc.
  selection       TEXT    NOT NULL,
  odds            REAL    NOT NULL,
  stake           REAL    NOT NULL,           -- In cents
  potential_payout REAL,
  actual_payout   REAL,                       -- NULL until settled
  status          TEXT    DEFAULT 'open',     -- open | pending | won | lost | pushed | cancelled | void
  result          TEXT,                       -- win | loss | push | void
  placed_at       INTEGER NOT NULL,
  settled_at      INTEGER,
  graded_at       INTEGER,
  graded_by       TEXT,
  ip_address      TEXT,
  device_hash     TEXT,                       -- Device fingerprint
  geo_country     TEXT,
  geo_region      TEXT,
  source          TEXT    DEFAULT 'direct',   -- direct | api | kiosk | phone
  flags_json      TEXT,                       -- Array of flag IDs
  notes           TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_wagers_player ON wagers(player_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wagers_agent ON wagers(agent_login, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wagers_status ON wagers(status, settled_at);
CREATE INDEX IF NOT EXISTS idx_wagers_event ON wagers(event_id, sport);
CREATE INDEX IF NOT EXISTS idx_wagers_number ON wagers(wager_number);
CREATE INDEX IF NOT EXISTS idx_wagers_placed ON wagers(placed_at DESC);
```

### 9.2 bet_actions

Individual bet legs within parlays/teasers and action history for each wager.

```sql
CREATE TABLE IF NOT EXISTS bet_actions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_id        INTEGER NOT NULL,           -- FK to wagers.id
  leg_number      INTEGER DEFAULT 1,          -- Position in parlay (1 for straight)
  sport           TEXT    NOT NULL,
  event_id        TEXT    NOT NULL,
  event_name      TEXT,
  market          TEXT    NOT NULL,
  selection       TEXT    NOT NULL,
  odds            REAL    NOT NULL,
  line            REAL,                       -- Point spread or total line
  status          TEXT    DEFAULT 'pending',  -- pending | won | lost | pushed | void
  result          TEXT,
  settled_at      INTEGER,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (wager_id) REFERENCES wagers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bet_actions_wager ON bet_actions(wager_id, leg_number);
CREATE INDEX IF NOT EXISTS idx_bet_actions_event ON bet_actions(event_id, status);
CREATE INDEX IF NOT EXISTS idx_bet_actions_status ON bet_actions(status, settled_at);
```

### 9.3 agent_hierarchy

Agent reporting structure. parent_login → child_login relationships.

```sql
CREATE TABLE IF NOT EXISTS agent_hierarchy (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_login    TEXT    NOT NULL,           -- Upline agent
  child_login     TEXT    NOT NULL,           -- Downline agent
  level           INTEGER DEFAULT 1,          -- Depth in hierarchy (1 = direct)
  commission_pct  REAL    DEFAULT 0,          -- Commission override %
  is_active       INTEGER DEFAULT 1,
  effective_from  INTEGER NOT NULL,
  effective_to    INTEGER,                    -- NULL = current
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(parent_login, child_login, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON agent_hierarchy(parent_login, is_active);
CREATE INDEX IF NOT EXISTS idx_hierarchy_child ON agent_hierarchy(child_login, is_active);
CREATE INDEX IF NOT EXISTS idx_hierarchy_level ON agent_hierarchy(level, is_active);
```

### 9.4 player_agent_map

Junction table mapping players to their assigned agents.

```sql
CREATE TABLE IF NOT EXISTS player_agent_map (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  is_primary      INTEGER DEFAULT 1,          -- 1 = primary agent, 0 = secondary
  assignment_type TEXT    DEFAULT 'auto',     -- auto | manual | transfer
  assigned_by     TEXT,                       -- Who created this mapping
  assigned_at     INTEGER NOT NULL,
  ended_at       INTEGER,                    -- NULL = current assignment
  is_active       INTEGER DEFAULT 1,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(player_id, agent_login, is_active) WHERE is_active = 1
);

CREATE INDEX IF NOT EXISTS idx_player_agent_map_player ON player_agent_map(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_player_agent_map_agent ON player_agent_map(agent_login, is_active);
```

### 9.5 agent_supergroups

Telegram supergroup definitions per agent. Each agent has one primary supergroup.

```sql
CREATE TABLE IF NOT EXISTS agent_supergroups (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  supergroup_id       TEXT    NOT NULL UNIQUE,    -- Telegram supergroup/chat ID (string)
  owner_agent_login   TEXT    NOT NULL,           -- Agent who owns this group
  group_name          TEXT    NOT NULL,
  description         TEXT,
  bot_id              TEXT,                       -- Assigned bot worker (risk_bot, payment_bot, agent_bot)
  is_active           INTEGER DEFAULT 1,
  is_forum            INTEGER DEFAULT 0,          -- 1 = forum/supergroup with topics
  settings_json       TEXT,                       -- Telegram group settings
  created_at          INTEGER DEFAULT (strftime('%s','now')),
  updated_at          INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_supergroups_owner ON agent_supergroups(owner_agent_login, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_supergroups_bot ON agent_supergroups(bot_id, is_active);
```

### 9.6 agent_supergroup_topics

Topics within agent supergroups. Each topic maps to a specific purpose (riskAlerts, general, etc.).

```sql
CREATE TABLE IF NOT EXISTS agent_supergroup_topics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  supergroup_id   TEXT    NOT NULL,           -- FK to agent_supergroups
  agent_login     TEXT    NOT NULL,           -- Agent this topic belongs to
  purpose         TEXT    NOT NULL,           -- riskAlerts | general | settlements | steam | arb | clv | compliance | custom
  thread_id       INTEGER NOT NULL,           -- Telegram thread_id (topic ID)
  topic_name      TEXT    NOT NULL,
  icon_color      INTEGER,                   -- Telegram topic icon color
  is_active       INTEGER DEFAULT 1,
  created_by      TEXT    DEFAULT 'manual',   -- manual | bot_worker | api
  settings_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(agent_login, purpose)
);

CREATE INDEX IF NOT EXISTS idx_supergroup_topics_group ON agent_supergroup_topics(supergroup_id, is_active);
CREATE INDEX IF NOT EXISTS idx_supergroup_topics_agent ON agent_supergroup_topics(agent_login, is_active);
CREATE INDEX IF NOT EXISTS idx_supergroup_topics_created_by ON agent_supergroup_topics(created_by);
```

### 9.7 telegram_topics

Global Telegram topic registry. Cross-reference for topic management.

```sql
CREATE TABLE IF NOT EXISTS telegram_topics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id        TEXT    NOT NULL UNIQUE,    -- Global topic identifier
  chat_id         TEXT    NOT NULL,           -- Telegram chat ID
  thread_id       INTEGER NOT NULL,
  topic_name      TEXT    NOT NULL,
  topic_type      TEXT    NOT NULL,           -- forum | group | channel | private
  purpose         TEXT,                       -- Purpose tag
  is_active       INTEGER DEFAULT 1,
  settings_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_topics_chat ON telegram_topics(chat_id, is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_topics_type ON telegram_topics(topic_type, is_active);
```

### 9.8 telegram_channels

Telegram channel registrations for broadcasting.

```sql
CREATE TABLE IF NOT EXISTS telegram_channels (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id      TEXT    NOT NULL UNIQUE,    -- Telegram channel ID
  channel_name    TEXT    NOT NULL,
  channel_type    TEXT    DEFAULT 'broadcast', -- broadcast | group | supergroup
  description     TEXT,
  invite_link     TEXT,
  subscriber_count INTEGER DEFAULT 0,
  is_active       INTEGER DEFAULT 1,
  settings_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_channels_active ON telegram_channels(is_active);
```

### 9.9 telegram_messages

Sent Telegram message log for deduplication and audit.

```sql
CREATE TABLE IF NOT EXISTS telegram_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id      INTEGER NOT NULL,           -- Telegram message ID
  chat_id         TEXT    NOT NULL,
  thread_id       INTEGER DEFAULT 0,          -- 0 = main chat (not a topic)
  bot_id          TEXT,                       -- Which bot sent this
  message_type    TEXT    NOT NULL,           -- alert | summary | command | notification
  content_preview TEXT,                       -- Truncated content
  content_hash    TEXT,                       -- Hash for deduplication
  status          TEXT    DEFAULT 'sent',     -- sent | edited | deleted | failed
  sent_at         INTEGER NOT NULL,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_msg_chat ON telegram_messages(chat_id, thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_msg_hash ON telegram_messages(content_hash);
CREATE INDEX IF NOT EXISTS idx_telegram_msg_bot ON telegram_messages(bot_id, sent_at DESC);
```

### 9.10 log_snapshots

Periodic snapshots of all log tables for point-in-time recovery and analytics.

```sql
CREATE TABLE IF NOT EXISTS log_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     TEXT    NOT NULL UNIQUE,    -- UUID
  snapshot_type   TEXT    NOT NULL,           -- full | incremental | table_specific
  table_name      TEXT,                       -- NULL = full snapshot, else specific table
  snapshot_json   TEXT    NOT NULL,           -- Serialized snapshot data
  record_count    INTEGER,
  size_bytes      INTEGER,
  checksum        TEXT,                       -- SHA-256 of snapshot data
  created_by      TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_log_snapshots_type ON log_snapshots(snapshot_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_snapshots_table ON log_snapshots(table_name, created_at DESC);
```

---

## 10. Domain: Player & Agent

### 10.1 customers

Canonical customer/player records. Merged from raw_players + enriched with risk data.

```sql
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
  balance         REAL    DEFAULT 0,
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
  tags_json       TEXT,                       -- Array of tags
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
```

### 10.2 agents

Canonical agent records with performance metrics.

```sql
CREATE TABLE IF NOT EXISTS agents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login     TEXT    NOT NULL UNIQUE,    -- Agent identifier
  display_name    TEXT    NOT NULL,
  email           TEXT,
  phone           TEXT,
  parent_login    TEXT,                       -- Upline agent (NULL = top-level)
  tier            TEXT    DEFAULT 'standard', -- standard | premium | vip | internal
  commission_pct  REAL    DEFAULT 25.0,       -- Base commission percentage
  status          TEXT    DEFAULT 'active',   -- active | suspended | inactive
  balance         REAL    DEFAULT 0,
  lifetime_pnl    REAL    DEFAULT 0,
  player_count    INTEGER DEFAULT 0,
  active_players  INTEGER DEFAULT 0,
  wager_count     INTEGER DEFAULT 0,
  total_stake     REAL    DEFAULT 0,
  total_payout    REAL    DEFAULT 0,
  hold_pct        REAL,                       -- Current hold percentage
  rating          REAL,                       -- 1.0 - 5.0 agent rating
  tags_json       TEXT,
  settings_json   TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_login, status);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_tier ON agents(tier, status);
```

### 10.3 player_notes

Free-form notes attached to player records.

```sql
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
```

### 10.4 player_transactions

Financial transactions per player (deposits, withdrawals, adjustments).

```sql
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
```

### 10.5 player_flags

Active flags on players (risk, compliance, operational).

```sql
CREATE TABLE IF NOT EXISTS player_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,           -- FK to customers
  flag_type       TEXT    NOT NULL,           -- risk | compliance | operational | manual
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
```

---

## 11. Domain: Risk & Analytics

### 11.1 customer_features

ML feature vectors for each customer. Updated by feature extraction cron (*/10 min).

```sql
CREATE TABLE IF NOT EXISTS customer_features (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT    NOT NULL,           -- FK to customers
  agent_login     TEXT    NOT NULL,
  feature_version TEXT    DEFAULT '1.0',
  -- Betting behavior features
  wager_count_7d  INTEGER DEFAULT 0,
  wager_count_30d INTEGER DEFAULT 0,
  wager_count_90d INTEGER DEFAULT 0,
  avg_stake_7d    REAL    DEFAULT 0,
  avg_stake_30d   REAL    DEFAULT 0,
  avg_odds_30d    REAL    DEFAULT 0,
  total_stake_30d REAL    DEFAULT 0,
  total_stake_90d REAL    DEFAULT 0,
  -- Performance features
  win_rate_30d    REAL,                       -- 0.0 - 1.0
  win_rate_90d    REAL,
  pnl_30d         REAL    DEFAULT 0,
  pnl_90d         REAL    DEFAULT 0,
  pnl_lifetime    REAL    DEFAULT 0,
  roi_30d         REAL,                       -- Return on investment
  roi_90d         REAL,
  -- Velocity features
  daily_wager_count REAL,                     -- Average wagers per day
  max_daily_stake REAL,                       -- Largest single day stake
  stake_variance  REAL,                       -- Standard deviation of stakes
  -- Pattern features
  parlay_pct      REAL,                       -- % of wagers that are parlays
  teaser_pct      REAL,
  live_bet_pct    REAL,                       -- % of in-play wagers
  favorite_pct    REAL,                       -- % betting on favorites
  -- Archetype classification
  archetype       TEXT,                       -- sharp | whale | chase_gambler | new | recreational | suspicious
  archetype_confidence REAL DEFAULT 0,
  risk_signals_json TEXT,                     -- Array of detected risk signals
  features_json   TEXT,                       -- Raw feature vector (for debugging)
  calculated_at   INTEGER NOT NULL,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(customer_id, feature_version)
);

CREATE INDEX IF NOT EXISTS idx_customer_features_customer ON customer_features(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_features_agent ON customer_features(agent_login, archetype);
CREATE INDEX IF NOT EXISTS idx_customer_features_archetype ON customer_features(archetype, archetype_confidence);
```

### 11.2 ai_risk_flags

AI-generated risk flags from Kimi/live analysis endpoint.

```sql
CREATE TABLE IF NOT EXISTS ai_risk_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id         TEXT    NOT NULL UNIQUE,    -- UUID
  customer_id     TEXT    NOT NULL,           -- FK to customers
  agent_login     TEXT    NOT NULL,
  flag_type       TEXT    NOT NULL,           -- model_prediction | anomaly | pattern_match | sentiment
  severity        TEXT    NOT NULL,           -- info | low | medium | high | critical
  model_name      TEXT,                       -- Which AI model generated this
  model_version   TEXT,
  prompt_hash     TEXT,                       -- Hash of the prompt for reproducibility
  -- Risk dimensions
  financial_risk  REAL,                       -- 0.0 - 1.0
  behavioral_risk REAL,                       -- 0.0 - 1.0
  compliance_risk REAL,                       -- 0.0 - 1.0
  overall_score   REAL,                       -- 0.0 - 1.0 composite
  -- Explanation
  explanation     TEXT,                       -- Human-readable explanation
  evidence_json   TEXT,                       -- Supporting evidence
  recommended_action TEXT,                    -- block | limit | monitor | review | none
  -- Status
  status          TEXT    DEFAULT 'open',     -- open | acknowledged | dismissed | confirmed | escalated
  reviewed_by     TEXT,
  reviewed_at     INTEGER,
  review_notes    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_risk_customer ON ai_risk_flags(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_agent ON ai_risk_flags(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_risk_severity ON ai_risk_flags(severity, status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_score ON ai_risk_flags(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_risk_created ON ai_risk_flags(created_at DESC);
```

### 11.3 risk_positions

Open risk positions per agent/player/market. Generated by risk analysis, expired by hourly cron.

```sql
CREATE TABLE IF NOT EXISTS risk_positions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  position_id     TEXT    NOT NULL UNIQUE,    -- UUID
  agent_login     TEXT    NOT NULL,
  player_id       TEXT,                       -- NULL = aggregated across players
  sport           TEXT    NOT NULL,
  event_id        TEXT    NOT NULL,
  event_name      TEXT,
  market          TEXT    NOT NULL,
  position_type   TEXT    NOT NULL,           -- exposure | liability | exposure_sided
  side            TEXT,                       -- over | under | home | away (for sided positions)
  -- Amounts
  total_stake     REAL    DEFAULT 0,          -- In cents
  total_exposure  REAL    DEFAULT 0,          -- In cents
  max_payout      REAL    DEFAULT 0,          -- In cents
  player_count    INTEGER DEFAULT 0,
  wager_count     INTEGER DEFAULT 0,
  -- Risk assessment
  risk_score      REAL,                       -- 0.0 - 1.0
  risk_tier       TEXT,                       -- GREEN | YELLOW | RED | BLACK
  concentration_pct REAL,                     -- % of agent's total book
  -- Status
  status          TEXT    DEFAULT 'open',     -- open | warning | breached | closed | expired
  expires_at      INTEGER NOT NULL,           -- Auto-expiry timestamp
  closed_at       INTEGER,
  close_reason    TEXT,                       -- settled | expired | manual | hedged
  -- Context
  breakdown_json  TEXT,                       -- Per-player breakdown
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_positions_agent ON risk_positions(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_positions_player ON risk_positions(player_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_event ON risk_positions(event_id, sport, market);
CREATE INDEX IF NOT EXISTS idx_risk_positions_expires ON risk_positions(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_tier ON risk_positions(risk_tier, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_status ON risk_positions(status, created_at DESC);
```

### 11.4 enforcement_queue

Queue of pending enforcement actions (limit applications, blocks, etc.).

```sql
CREATE TABLE IF NOT EXISTS enforcement_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id        TEXT    NOT NULL UNIQUE,    -- UUID
  action_type     TEXT    NOT NULL,           -- apply_limit | block_wager | suspend_account | reduce_limit | notify
  entity_type     TEXT    NOT NULL,           -- player | agent | wager
  entity_id       TEXT    NOT NULL,           -- ID of the target
  agent_login     TEXT    NOT NULL,
  -- Action parameters
  params_json     TEXT    NOT NULL,           -- { limit_amount, reason, duration_minutes, ... }
  -- Queue status
  status          TEXT    DEFAULT 'pending',  -- pending | processing | completed | failed | cancelled
  priority        INTEGER DEFAULT 100,        -- Lower = higher priority
  scheduled_at    INTEGER,                    -- NULL = ASAP
  processed_at    INTEGER,
  processed_by    TEXT,                       -- System or admin
  result_json     TEXT,                       -- Outcome of the action
  error_message   TEXT,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_enforcement_queue_status ON enforcement_queue(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_agent ON enforcement_queue(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_entity ON enforcement_queue(entity_type, entity_id, status);
```

### 11.5 limit_enforcement_log

Immutable audit log of every limit enforcement action.

```sql
CREATE TABLE IF NOT EXISTS limit_enforcement_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  enforcement_id  TEXT    NOT NULL,           -- Reference to enforcement_queue.queue_id
  action_type     TEXT    NOT NULL,
  entity_type     TEXT    NOT NULL,
  entity_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  -- Before/after
  old_value_json  TEXT,                       -- Previous state
  new_value_json  TEXT,                       -- New state after enforcement
  params_json     TEXT,                       -- Parameters used
  -- Execution
  executed_by     TEXT,                       -- System or admin name
  result          TEXT    NOT NULL,           -- success | failed | partial
  result_message  TEXT,
  wager_id        TEXT,                       -- Associated wager (if any)
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_limit_enf_entity ON limit_enforcement_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limit_enf_agent ON limit_enforcement_log(agent_login, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limit_enf_action ON limit_enforcement_log(action_type, created_at DESC);
```

### 11.6 wager_violations

Wagers that triggered risk violations. Streamed via SSE /api/stream/live-wagers.

```sql
CREATE TABLE IF NOT EXISTS wager_violations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id    TEXT    NOT NULL UNIQUE,    -- UUID
  wager_id        TEXT    NOT NULL,           -- FK to wagers or raw_wagers
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  -- Violation details
  rule_id         TEXT,                       -- Which rule was violated
  violation_type  TEXT    NOT NULL,           -- limit_exceeded | tier_breach | velocity | pattern | manual_flag
  severity        TEXT    NOT NULL,           -- low | medium | high | critical
  description     TEXT    NOT NULL,
  -- Wager snapshot at violation time
  wager_snapshot_json TEXT NOT NULL,          -- Full wager data at time of violation
  -- Enforcement
  action_taken    TEXT,                       -- blocked | limited | allowed | escalated
  action_params_json TEXT,
  enforced_by     TEXT,
  -- Status
  status          TEXT    DEFAULT 'open',     -- open | reviewed | dismissed | confirmed
  reviewed_by     TEXT,
  reviewed_at     INTEGER,
  review_notes    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_wager_violations_wager ON wager_violations(wager_id);
CREATE INDEX IF NOT EXISTS idx_wager_violations_player ON wager_violations(player_id, status);
CREATE INDEX IF NOT EXISTS idx_wager_violations_agent ON wager_violations(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wager_violations_severity ON wager_violations(severity, status);
CREATE INDEX IF NOT EXISTS idx_wager_violations_created ON wager_violations(created_at DESC);
```

### 11.7 risk_config

Risk tier configuration and global risk parameters.

```sql
CREATE TABLE IF NOT EXISTS risk_config (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key      TEXT    NOT NULL UNIQUE,    -- Parameter name
  config_value    TEXT    NOT NULL,           -- Parameter value (as string)
  config_type     TEXT    DEFAULT 'string',   -- string | number | boolean | json
  description     TEXT,
  category        TEXT    DEFAULT 'general',  -- tier | threshold | model | notification
  is_active       INTEGER DEFAULT 1,
  updated_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_config_category ON risk_config(category, is_active);
```

### 11.8 risk_analytics_snapshots

Aggregated risk metrics snapshots for dashboards and historical analysis.

```sql
CREATE TABLE IF NOT EXISTS risk_analytics_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     TEXT    NOT NULL UNIQUE,    -- UUID
  snapshot_type   TEXT    NOT NULL,           -- agent | player | system | event
  entity_type     TEXT,                       -- agent | player | system
  entity_id       TEXT,                       -- NULL = system-wide
  agent_login     TEXT,
  -- Metrics
  total_wagers    INTEGER DEFAULT 0,
  total_stake     REAL    DEFAULT 0,
  total_exposure  REAL    DEFAULT 0,
  total_payout    REAL    DEFAULT 0,
  net_pnl         REAL    DEFAULT 0,
  hold_pct        REAL,
  active_positions INTEGER DEFAULT 0,
  open_violations INTEGER DEFAULT 0,
  player_count    INTEGER DEFAULT 0,
  avg_risk_score  REAL,
  risk_breakdown_json TEXT,                   -- Per-tier counts
  top_exposures_json  TEXT,                   -- Top 10 exposures
  metrics_json    TEXT,                       -- Full metric blob
  period_start    INTEGER NOT NULL,           -- Snapshot period start
  period_end      INTEGER NOT NULL,           -- Snapshot period end
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_snapshots_entity ON risk_analytics_snapshots(entity_type, entity_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_agent ON risk_analytics_snapshots(agent_login, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_type ON risk_analytics_snapshots(snapshot_type, period_end DESC);
```

---

## 12. Domain: Partner Profile OS

### 12.1 partner_profiles

Canonical master record (static config + runtime state). Created from TOML template materialization.

```sql
CREATE TABLE IF NOT EXISTS partner_profiles (
  partner_id          TEXT    PRIMARY KEY,    -- e.g., "HYBRID_001", "RETAIL_042"
  template_id         TEXT    NOT NULL,       -- "hybrid-sharp" | "retail" | "offshore"
  status              TEXT    DEFAULT 'signup', -- signup | materialized | kyc_pending | active | cultivating | graduated | frozen | suspended | terminated
  display_name        TEXT    NOT NULL,
  email               TEXT    NOT NULL,
  phone               TEXT,
  created_at          INTEGER NOT NULL,
  materialized_at     INTEGER,
  activated_at        INTEGER,
  graduated_at        INTEGER,
  frozen_at           INTEGER,
  frozen_reason       TEXT,
  terminated_at       INTEGER,
  updated_at          INTEGER,
  -- Immutable JSON config (set at materialization from TOML template)
  jurisdiction_json   TEXT    NOT NULL,       -- { type, allowed_states[], allowed_countries[], kyc_tier, tax_form, ... }
  sources_json        TEXT    NOT NULL,       -- { defaults[], api_access, max_sources }
  cultivation_json    TEXT    NOT NULL,       -- { initial_deposit_target, deposit_schedule_weeks[], initial_limit, ... }
  settlement_json     TEXT    NOT NULL,       -- { commission_structure, commission_tiers[], makeup_enabled, ... }
  sor_json            TEXT    NOT NULL,       -- { eligible_tiers[], max_exposure_per_signal, book_whitelist[], ... }
  telegram_json       TEXT    NOT NULL,       -- { auto_create_groups, groups[], alert_stake_minimum, ... }
  balance_json        TEXT    NOT NULL,       -- { initial_capital_requirement, margin_call_threshold, ... }
  compliance_json     TEXT    NOT NULL,       -- { auto_suspend_rules[], review_required_for[], max_opsec_score, ... }
  -- Runtime mutable state (updated frequently)
  current_limit       REAL    DEFAULT 0,      -- Current betting limit in cents
  daily_used          REAL    DEFAULT 0,      -- Today's consumed exposure
  total_deposited     REAL    DEFAULT 0,      -- Cumulative deposits
  total_withdrawn     REAL    DEFAULT 0,      -- Cumulative withdrawals
  total_settled_pnl   REAL    DEFAULT 0,      -- Cumulative settled P&L
  current_balance     REAL    DEFAULT 0,      -- Available capital
  opsec_score         INTEGER DEFAULT 0,      -- 0-100, lower is better
  risk_level          TEXT    DEFAULT 'green', -- green | yellow | orange | red
  kyc_status          TEXT    DEFAULT 'pending' -- pending | verified | rejected
);

CREATE INDEX IF NOT EXISTS idx_partner_profiles_status ON partner_profiles(status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_template ON partner_profiles(template_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_kyc ON partner_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_risk ON partner_profiles(risk_level, status);
```

### 12.2 partner_sources

One row per attached source (book API, wallet, kiosk, exchange).

```sql
CREATE TABLE IF NOT EXISTS partner_sources (
  partner_id          TEXT    NOT NULL,
  source_id           TEXT    NOT NULL,       -- e.g., "dk_retail", "pin_offshore"
  source_type         TEXT    NOT NULL,       -- book_api | wallet | kiosk | exchange
  book_id             TEXT,                   -- e.g., "DRAFTKINGS", "PINNACLE"
  endpoint            TEXT,                   -- API endpoint URL
  api_key_hash        TEXT,                   -- Hashed API key
  api_secret_hash     TEXT,                   -- Hashed API secret
  webhook_url         TEXT,
  location            TEXT,
  geo_lat             REAL,
  geo_lon             REAL,
  address             TEXT,
  chain               TEXT,                   -- For wallets: "polygon", "ethereum"
  currency            TEXT,
  max_stake           REAL,
  daily_limit         REAL,
  priority            INTEGER DEFAULT 1,      -- Lower = higher priority
  status              TEXT    DEFAULT 'pending', -- pending | active | paused | revoked
  last_health_check   INTEGER,                -- Unix epoch of last health check
  latency_ms          INTEGER,                -- Last measured latency
  created_at          INTEGER,
  activated_at        INTEGER,
  PRIMARY KEY (partner_id, source_id),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_sources_partner ON partner_sources(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_sources_book ON partner_sources(book_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_sources_type ON partner_sources(source_type, status);
```

### 12.3 partner_cultivation

Limit raising progress tracker. Monitors partner warmup → graduation journey.

```sql
CREATE TABLE IF NOT EXISTS partner_cultivation (
  partner_id              TEXT    PRIMARY KEY,
  phase                   TEXT    DEFAULT 'warmup', -- warmup | depositing | betting | raising | graduation_ready
  target_deposit_total    REAL,                   -- Total deposit target from template
  actual_deposit_total    REAL    DEFAULT 0,
  deposit_count           INTEGER DEFAULT 0,
  target_limit            REAL,                   -- Limit raise target
  current_limit           REAL,
  bet_count               INTEGER DEFAULT 0,
  straight_bet_count      INTEGER DEFAULT 0,
  parlay_bet_count        INTEGER DEFAULT 0,
  casino_play_total       REAL    DEFAULT 0,
  odds_boosts_taken       INTEGER DEFAULT 0,
  sports_diversity_count  INTEGER DEFAULT 0,      -- Number of different sports bet on
  last_deposit_at         INTEGER,
  last_bet_at             INTEGER,
  raise_requested_at      INTEGER,
  raise_approved_at       INTEGER,
  graduation_eligible     INTEGER DEFAULT 0,      -- 1 = all requirements met, awaiting admin
  created_at              INTEGER,
  updated_at              INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_cultivation_phase ON partner_cultivation(phase, graduation_eligible);
```

### 12.4 partner_settlement

Commission terms + payout state. Makeup tracking and tiered commission.

```sql
CREATE TABLE IF NOT EXISTS partner_settlement (
  partner_id              TEXT    PRIMARY KEY,
  commission_structure    TEXT,                   -- flat | tiered
  commission_rate         REAL,                   -- Flat rate (if structure = flat)
  commission_tiers_json   TEXT,                   -- [{ threshold, rate }, ...]
  makeup_enabled          INTEGER DEFAULT 0,
  makeup_window_days      INTEGER DEFAULT 30,
  makeup_balance          REAL    DEFAULT 0,      -- Negative balance carried forward
  payout_cadence          TEXT,                   -- daily | weekly | biweekly | monthly
  payout_method           TEXT,                   -- ach | usdc | cash | ach_usdc_split
  payout_split_json       TEXT,                   -- { ach_pct, usdc_pct }
  payout_minimum          REAL,
  currency                TEXT    DEFAULT 'USD',
  hold_target_pct         REAL,                   -- Target hold percentage
  lifetime_commission_paid    REAL DEFAULT 0,
  lifetime_makeup_cleared     REAL DEFAULT 0,
  last_payout_at          INTEGER,
  next_payout_at          INTEGER,
  created_at              INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);
```

### 12.5 partner_telegram_topics

Telegram group/topic mappings per partner. Auto-provisioned by telegram-integration.

```sql
CREATE TABLE IF NOT EXISTS partner_telegram_topics (
  partner_id      TEXT    NOT NULL,
  topic_type      TEXT    NOT NULL,           -- personal | signals | steam | arb | settlement | opsec | compliance
  chat_id         TEXT,                       -- Telegram chat ID
  chat_name       TEXT,
  auto_create     INTEGER DEFAULT 1,
  status          TEXT    DEFAULT 'pending',  -- pending | created | failed | archived
  error           TEXT,                       -- Error message if creation failed
  created         INTEGER DEFAULT 0,          -- 1 = successfully created in Telegram
  created_at      INTEGER,
  PRIMARY KEY (partner_id, topic_type),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_partner_tg_topics_status ON partner_telegram_topics(status, created);
```

### 12.6 partner_gates

SOR (Smart Order Router) eligibility + compliance flags. Core gating configuration.

```sql
CREATE TABLE IF NOT EXISTS partner_gates (
  partner_id              TEXT    PRIMARY KEY,
  sor_eligible_tiers_json TEXT,                   -- ["T1", "T2", "T3", "T4"]
  max_exposure_per_signal REAL,                   -- Max stake per individual signal
  max_daily_exposure      REAL,                   -- Daily exposure cap
  max_single_bet          REAL,                   -- Max single bet size
  book_whitelist_json     TEXT,                   -- ["DRAFTKINGS", "PINNACLE", ...]
  book_blacklist_json     TEXT,                   -- ["1XBET", ...]
  steam_allowed           INTEGER DEFAULT 0,
  arb_allowed             INTEGER DEFAULT 0,
  clv_allowed             INTEGER DEFAULT 1,
  manual_allowed          INTEGER DEFAULT 1,
  predictive_allowed      INTEGER DEFAULT 0,
  require_opsec_green     INTEGER DEFAULT 0,      -- 1 = require OpSec score in green range
  opsec_score_max         INTEGER DEFAULT 50,     -- Maximum allowed OpSec score
  auto_suspend_rules_json TEXT,                   -- ["public_wifi", "vpn_detected", ...]
  review_required_json    TEXT,                   -- ["graduation", "capital_injection", ...]
  last_gate_review_at     INTEGER,
  created_at              INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);
```

### 12.7 partner_runtime_state

Live runtime state snapshot. Persisted for recovery, primarily lives in memory.

```sql
CREATE TABLE IF NOT EXISTS partner_runtime_state (
  partner_id      TEXT    PRIMARY KEY,
  runtime_json    TEXT    NOT NULL,           -- Full PartnerRuntimeState serialized
  updated_at      INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id) ON DELETE CASCADE
);
```

### 12.8 partner_lifecycle_log

Immutable audit trail of all partner lifecycle state transitions.

```sql
CREATE TABLE IF NOT EXISTS partner_lifecycle_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id      TEXT    NOT NULL,
  from_state      TEXT,                       -- Previous state (NULL for signup)
  to_state        TEXT    NOT NULL,           -- New state
  triggered_by    TEXT    NOT NULL,           -- system | admin | compliance | auto_suspend | partner
  reason          TEXT,                       -- Human-readable reason
  guard_checks_json TEXT,                   -- JSON: [{ name, passed, failReason }]
  timestamp       INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_lifecycle_partner ON partner_lifecycle_log(partner_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_partner_lifecycle_state ON partner_lifecycle_log(to_state, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_partner_lifecycle_trigger ON partner_lifecycle_log(triggered_by, timestamp DESC);
```

### 12.9 partner_gate_log

Immutable gate decision audit. Every signal evaluation result is logged here.

```sql
CREATE TABLE IF NOT EXISTS partner_gate_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id      TEXT    NOT NULL,
  signal_id       TEXT    NOT NULL,           -- Original signal identifier
  action          TEXT    NOT NULL,           -- allow | block | adjust | defer
  reason          TEXT,                       -- Human-readable reason
  original_stake  REAL,                       -- Suggested stake from signal
  adjusted_stake  REAL,                       -- Reduced stake (if action = adjust)
  metadata_json   TEXT,                       -- Full GateResult metadata
  timestamp       INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_gate_partner ON partner_gate_log(partner_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_partner_gate_signal ON partner_gate_log(signal_id);
CREATE INDEX IF NOT EXISTS idx_partner_gate_action ON partner_gate_log(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_partner_gate_created ON partner_gate_log(timestamp DESC);
```

### 12.10 partner_settlement_log

Per-bet settlement audit. Commission calculation and makeup application history.

```sql
CREATE TABLE IF NOT EXISTS partner_settlement_log (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id              TEXT    NOT NULL,
  bet_id                  TEXT    NOT NULL,
  stake                   REAL,
  odds                    REAL,
  result                  TEXT,                   -- win | loss | push
  profit_loss             REAL,                   -- P&L in cents
  commission              REAL,                   -- Commission charged in cents
  commission_rate_applied REAL,                   -- Rate used for this bet
  makeup_applied          REAL    DEFAULT 0,      -- Makeup deducted in cents
  house_net               REAL,                   -- House net after commission
  partner_balance_after   REAL,
  metadata_json           TEXT,
  timestamp               INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_settlement_partner ON partner_settlement_log(partner_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_bet ON partner_settlement_log(bet_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlement_created ON partner_settlement_log(timestamp DESC);
```

---

## 13. Domain: Telegram Hub

### 13.1 bot_heartbeat

Tracks each bot worker's health and throughput. Updated every 30s by bot workers.

```sql
CREATE TABLE IF NOT EXISTS bot_heartbeat (
  bot_id              TEXT    PRIMARY KEY,    -- 'risk_bot', 'payment_bot', 'agent_bot'
  last_seen           TEXT    NOT NULL,       -- ISO-8601 timestamp of last heartbeat
  uptime_ms           INTEGER DEFAULT 0,      -- Cumulative uptime
  messages_delivered  INTEGER DEFAULT 0,
  messages_failed     INTEGER DEFAULT 0,
  created_at          TEXT    DEFAULT CURRENT_TIMESTAMP,
  updated_at          TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at trigger
CREATE TRIGGER IF NOT EXISTS bot_heartbeat_updated
AFTER UPDATE ON bot_heartbeat
BEGIN
  UPDATE bot_heartbeat SET updated_at = CURRENT_TIMESTAMP WHERE bot_id = NEW.bot_id;
END;

CREATE INDEX IF NOT EXISTS idx_bot_heartbeat_seen ON bot_heartbeat(last_seen);
```

### 13.2 telegram_dispatch_log

Audit log for every event processed by bot workers. Success and failure both logged.

```sql
CREATE TABLE IF NOT EXISTS telegram_dispatch_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id            TEXT,                   -- Original event ID (alertId, transactionId)
  bot_id              TEXT    NOT NULL,       -- Which bot processed this
  agent_login         TEXT,                   -- Target agent (if resolved)
  chat_id             TEXT,                   -- Telegram chat ID (stored as TEXT for large ints)
  thread_id           INTEGER,                -- Topic thread ID (0 = main chat)
  purpose             TEXT,                   -- Topic purpose: riskAlerts | general | settlements
  status              TEXT    NOT NULL CHECK (status IN ('delivered', 'failed', 'pending', 'deduped')),
  latency_ms          INTEGER,                -- End-to-end latency
  telegram_message_id INTEGER,                -- Telegram message ID on success
  event_type          TEXT    NOT NULL,       -- 'risk_alert', 'deposit_request', etc.
  payload_preview     TEXT,                   -- Truncated payload JSON (max 500 chars)
  error_message       TEXT,                   -- Error on failure
  delivered_at        TEXT    NOT NULL        -- ISO-8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_time ON telegram_dispatch_log(delivered_at);
CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_bot ON telegram_dispatch_log(bot_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_status ON telegram_dispatch_log(status, delivered_at);
CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_agent ON telegram_dispatch_log(agent_login, delivered_at);
CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_event ON telegram_dispatch_log(event_id, bot_id);
```

---

## 14. Seed Data

### 14.1 Default Admin User

```sql
-- Admin token for initial access (replace in production)
INSERT OR IGNORE INTO tokens (token_id, token_type, token_hash, scope, description, is_active, created_by)
VALUES (
  'admin_default',
  'api_key',
  '$2a$10$ADMIN_HASH_REPLACE_IN_PRODUCTION',
  'admin',
  'Default admin API key. Rotate immediately after first login.',
  1,
  'system'
);
```

### 14.2 Sample Sportsbooks

```sql
INSERT OR IGNORE INTO tokens (token_id, token_type, token_hash, scope, description, is_active, created_by)
VALUES
  ('book_draftkings',  'api_key', 'dk_hash_placeholder',  'read', 'DraftKings API access', 1, 'system'),
  ('book_fanduel',     'api_key', 'fd_hash_placeholder',  'read', 'FanDuel API access',    1, 'system'),
  ('book_pinnacle',    'api_key', 'pin_hash_placeholder', 'read', 'Pinnacle API access',   1, 'system'),
  ('book_bet365',      'api_key', 'b365_hash_placeholder','read', 'bet365 API access',     1, 'system'),
  ('book_caesars',     'api_key', 'czr_hash_placeholder', 'read', 'Caesars API access',    1, 'system');
```

### 14.3 Risk Tier Configuration

```sql
INSERT OR IGNORE INTO risk_config (config_key, config_value, config_type, description, category)
VALUES
  ('tier_black_max_wager',      '0',         'number',  'Maximum wager for BLACK tier (cents)',          'tier'),
  ('tier_black_max_payout',     '0',         'number',  'Maximum payout for BLACK tier (cents)',         'tier'),
  ('tier_red_max_wager',        '5000',      'number',  'Maximum wager for RED tier: $50 (cents)',       'tier'),
  ('tier_red_max_payout',       '10000',     'number',  'Maximum payout for RED tier: $100 (cents)',     'tier'),
  ('tier_yellow_action',        'monitor',   'string',  'Action for YELLOW tier',                        'tier'),
  ('tier_green_action',         'normal',    'string',  'Action for GREEN tier',                         'tier'),
  ('velocity_check_window_min', '60',        'number',  'Velocity check window in minutes',              'threshold'),
  ('max_wagers_per_hour',       '20',        'number',  'Max wagers per hour before flag',               'threshold'),
  ('pattern_min_sample_size',   '10',        'number',  'Minimum wagers for pattern detection',          'threshold'),
  ('sharp_win_rate_threshold',  '0.55',      'number',  'Win rate threshold for sharp classification',   'threshold'),
  ('chase_loss_rate_threshold', '0.35',      'number',  'Loss rate threshold for chase gambler',         'threshold'),
  ('new_player_wager_limit',    '100',       'number',  'Max wager count for "new" archetype',           'threshold'),
  ('position_expiry_hours',     '24',        'number',  'Risk position auto-expiry in hours',            'threshold'),
  ('alert_cleanup_days',        '90',        'number',  'Alert retention before cleanup',                'threshold'),
  ('ai_model_name',             'kimi',      'string',  'AI model for risk analysis',                    'model'),
  ('feature_extract_interval',  '600',       'number',  'Feature extraction interval in seconds',        'model');
```

### 14.4 Partner Profile TOML Templates

Stored as JSON records for the three default template types:

```sql
INSERT OR IGNORE INTO risk_config (config_key, config_value, config_type, description, category)
VALUES
  ('partner_template_hybrid_sharp', '{"meta":{"template_id":"hybrid-sharp","name":"Hybrid Sharp","version":"1.0.0"},"jurisdiction":{"type":"hybrid","allowed_states":["NV","NJ","PA"],"kyc_tier":"enhanced","tax_form":"W-9"},"sources":{"api_access":true,"max_sources":10},"cultivation":{"initial_deposit_target":25000,"initial_limit":2000,"limit_raise_target":50000},"settlement":{"commission_structure":"tiered","makeup_enabled":true,"payout_cadence":"daily","currency":"USD"},"sor":{"eligible_tiers":["T1","T2","T3","T4"],"max_exposure_per_signal":25000,"max_daily_exposure":100000,"max_single_bet":25000,"steam_allowed":true,"arb_allowed":true,"clv_allowed":true,"manual_allowed":true,"predictive_allowed":true},"balance":{"initial_capital_requirement":50000,"margin_call_threshold":0.15}}', 'json', 'hybrid-sharp partner template defaults', 'partner'),

  ('partner_template_retail', '{"meta":{"template_id":"retail","name":"Retail","version":"1.0.0"},"jurisdiction":{"type":"regulated-us","allowed_states":["NV","NJ","PA","NY"],"kyc_tier":"standard","tax_form":"W-9"},"sources":{"api_access":false,"max_sources":3},"cultivation":{"initial_deposit_target":5000,"initial_limit":500,"limit_raise_target":10000},"settlement":{"commission_structure":"flat","commission_rate":0.25,"makeup_enabled":false,"payout_cadence":"weekly","currency":"USD"},"sor":{"eligible_tiers":["T2","T3","T4"],"max_exposure_per_signal":5000,"max_daily_exposure":25000,"max_single_bet":5000,"steam_allowed":false,"arb_allowed":false,"clv_allowed":true,"manual_allowed":true,"predictive_allowed":false},"balance":{"initial_capital_requirement":10000,"margin_call_threshold":0.20}}', 'json', 'retail partner template defaults', 'partner'),

  ('partner_template_offshore', '{"meta":{"template_id":"offshore","name":"Offshore","version":"1.0.0"},"jurisdiction":{"type":"offshore","allowed_countries":["CR","PA","CW"],"kyc_tier":"basic","tax_form":"none"},"sources":{"api_access":true,"max_sources":20},"cultivation":{"initial_deposit_target":50000,"initial_limit":10000,"limit_raise_target":100000},"settlement":{"commission_structure":"tiered","makeup_enabled":true,"payout_cadence":"daily","currency":"USDC"},"sor":{"eligible_tiers":["T1","T2","T3","T4"],"max_exposure_per_signal":50000,"max_daily_exposure":250000,"max_single_bet":50000,"steam_allowed":true,"arb_allowed":true,"clv_allowed":true,"manual_allowed":true,"predictive_allowed":true},"balance":{"initial_capital_requirement":100000,"margin_call_threshold":0.10}}', 'json', 'offshore partner template defaults', 'partner');
```

### 14.5 Default Bot Heartbeat Entries

```sql
INSERT OR IGNORE INTO bot_heartbeat (bot_id, last_seen, uptime_ms, messages_delivered, messages_failed)
VALUES
  ('risk_bot',    datetime('now'), 0, 0, 0),
  ('payment_bot', datetime('now'), 0, 0, 0),
  ('agent_bot',   datetime('now'), 0, 0, 0);
```

---

## 15. ER Diagram Summary

### Key Relationships

```
partner_profiles (1)
  ├── partner_sources (N)     CASCADE DELETE
  ├── partner_cultivation (1) CASCADE DELETE
  ├── partner_settlement (1)  CASCADE DELETE
  ├── partner_telegram_topics (N) CASCADE DELETE
  ├── partner_gates (1)       CASCADE DELETE
  ├── partner_runtime_state (1) CASCADE DELETE
  ├── partner_lifecycle_log (N)
  ├── partner_gate_log (N)
  └── partner_settlement_log (N)

agents (1)
  ├── agent_hierarchy (N, self-referential parent/child)
  ├── player_agent_map (N, junction to customers)
  ├── agent_supergroups (N)
  │   └── agent_supergroup_topics (N)
  ├── raw_players (N)
  ├── raw_wagers (N)
  └── risk_positions (N)

customers (1)
  ├── player_notes (N)
  ├── player_transactions (N)
  ├── player_flags (N)
  ├── customer_features (1 per version)
  ├── ai_risk_flags (N)
  └── wager_violations (N)

wagers (1)
  └── bet_actions (N) CASCADE DELETE

buckeye_sessions (1)
  ├── raw_players (N)
  ├── raw_wagers (N)
  └── raw_agent_performance (N)

alert_log (1)
  └── webhook_delivery_log (N)

webhook_configs (1)
  └── webhook_delivery_log (N)

sandbox_scenarios_v2 (1)
  ├── sandbox_customers (N)
  ├── sandbox_snapshots (N)
  └── sandbox_ab_tests_v2 (N)
  └── sandbox_summary_queue_v2 (N)

ip_tracking (N per IP+player)
  ├── ip_flags (N)
  └── ip_reputation_log (N)

bot_heartbeat (1 per bot)
telegram_dispatch_log (N, per event)
```

### Table Count Summary

| Domain | Tables | Indexes |
|--------|--------|---------|
| Live Data | 6 | 18 |
| IP Surveillance | 4 | 14 |
| Rules | 1 | 2 |
| Webhooks | 3 | 10 |
| Sandbox | 5 | 10 |
| Protected | 10 | 24 |
| Player & Agent | 5 | 16 |
| Risk & Analytics | 8 | 28 |
| **Partner Profile** | **10** | **16** |
| **Telegram Hub** | **2** | **7** |
| **TOTAL** | **54** | **145** |

---

*Document generated for Sports Terminal OS v5.2 — SQLite Schema Reference*
*Partner Profile OS v1.0 — Telegram Hub v1.0*
