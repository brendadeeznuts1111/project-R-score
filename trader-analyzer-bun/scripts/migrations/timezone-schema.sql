-- ============================================================================
-- Timezone Schema Migration
-- [DoD][TIMEZONE] Add timezone tracking to all timestamp columns
-- Regulatory requirement: All timestamps must be traceable to UTC with local offset
-- ============================================================================

-- Add timezone tracking to multi_layer_correlations table
ALTER TABLE multi_layer_correlations ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE multi_layer_correlations ADD COLUMN IF NOT EXISTS tz_offset INTEGER NOT NULL DEFAULT 0;

-- Add timezone tracking to audit_log table
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tz_offset INTEGER NOT NULL DEFAULT 0;

-- Create timezone-aware indexes
CREATE INDEX IF NOT EXISTS idx_ml_corr_tz ON multi_layer_correlations(detected_at, timezone);
CREATE INDEX IF NOT EXISTS idx_audit_tz ON audit_log(timestamp, timezone);

-- Create timezone transitions table (if not exists)
CREATE TABLE IF NOT EXISTS timezone_transitions (
    transition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transition_timestamp INTEGER NOT NULL,
    from_tz TEXT NOT NULL,
    to_tz TEXT NOT NULL,
    offset_change INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transition_time ON timezone_transitions(transition_timestamp);

-- Verify timezone consistency trigger
-- Prevents insertion of events that violate chronological order
CREATE TRIGGER IF NOT EXISTS tr_verify_timestamp_consistency
BEFORE INSERT ON multi_layer_correlations
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Timestamp chronology violation')
    WHERE EXISTS (
        SELECT 1 FROM multi_layer_correlations 
        WHERE event_id = NEW.event_id 
        AND detected_at > NEW.detected_at 
        AND ABS(latency_ms) < 3600000  -- Allow out-of-order only if latency > 1 hour
    );
END;

-- Migration complete
-- Run: sqlite3 correlations.db < scripts/migrations/timezone-schema.sql
