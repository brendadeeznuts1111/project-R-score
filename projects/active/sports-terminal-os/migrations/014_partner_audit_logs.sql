-- Migration 014: Partner Audit Logs
-- Zone: Partner Profile OS
-- Tables: partner_gate_log, partner_lifecycle_log
--
-- partner_gate_log: Immutable audit trail of every gate evaluation.
--   Written by PartnerGateway.logAndReturn().
--   Used by partner-routes.ts gate log / compliance endpoints.
--
-- partner_lifecycle_log: Immutable audit trail of every lifecycle
--   state transition. Written by partner-profile-materializer.
--   Used by partner-routes.ts lifecycle log endpoint.

-- UP

-- ---------------------------------------------------------------------------
-- partner_gate_log — every signal gate evaluation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_gate_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id    TEXT    NOT NULL,
  signal_id     TEXT    NOT NULL,
  action        TEXT    NOT NULL CHECK(action IN ('allow', 'block', 'adjust', 'defer')),
  reason        TEXT,
  adjusted_stake REAL,
  metadata_json TEXT,          -- full GateResult.metadata as JSON
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_gate_log_partner ON partner_gate_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_gate_log_action  ON partner_gate_log(action);
CREATE INDEX IF NOT EXISTS idx_gate_log_created ON partner_gate_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- partner_lifecycle_log — every state transition
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_lifecycle_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id    TEXT    NOT NULL,
  from_state    TEXT    NOT NULL,
  to_state      TEXT    NOT NULL,
  triggered_by  TEXT,           -- "admin", "auto", "system"
  reason        TEXT,
  metadata_json TEXT,
  changed_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_log_partner ON partner_lifecycle_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_state  ON partner_lifecycle_log(from_state, to_state);
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_changed ON partner_lifecycle_log(changed_at DESC);
