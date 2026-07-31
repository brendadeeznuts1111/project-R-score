// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Prediction accuracy tables.
 * Idempotent CREATE IF NOT EXISTS; called from ops `migrateSchema`.
 */
import type { Database } from 'bun:sqlite';

/** Ensure prediction accuracy and immutable limit-forecast evidence tables exist. */
export function ensurePredictionSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS prediction_accuracy (
      id TEXT PRIMARY KEY,
      prediction_type TEXT NOT NULL,
      predicted_value REAL NOT NULL,
      actual_value REAL NOT NULL,
      error REAL NOT NULL,
      prediction_date TEXT NOT NULL,
      actual_date TEXT NOT NULL,
      model_version TEXT,
      context TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pred_type ON prediction_accuracy(prediction_type);
    CREATE INDEX IF NOT EXISTS idx_pred_date ON prediction_accuracy(prediction_date);

    CREATE TABLE IF NOT EXISTS limit_forecast_issues (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      sportsbook TEXT NOT NULL,
      sport_id TEXT NOT NULL,
      market_id TEXT NOT NULL,
      bet_type TEXT NOT NULL,
      model_version TEXT NOT NULL,
      feature_version TEXT NOT NULL,
      predicted_raise_probability REAL NOT NULL
        CHECK(predicted_raise_probability >= 0 AND predicted_raise_probability <= 1),
      predicted_magnitude_pct REAL NOT NULL,
      current_limit REAL NOT NULL CHECK(current_limit >= 0),
      feature_json TEXT NOT NULL,
      issued_at INTEGER NOT NULL,
      horizon_seconds INTEGER NOT NULL CHECK(horizon_seconds > 0),
      evaluation_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (
        node_id,
        sportsbook,
        sport_id,
        market_id,
        bet_type,
        model_version,
        issued_at
      )
    );
    CREATE INDEX IF NOT EXISTS idx_limit_forecast_issues_evaluation
      ON limit_forecast_issues(evaluation_at);
    CREATE INDEX IF NOT EXISTS idx_limit_forecast_issues_dimension
      ON limit_forecast_issues(node_id, sportsbook, sport_id, market_id, bet_type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_limit_forecast_issues_daily_cadence
      ON limit_forecast_issues(
        node_id,
        sportsbook,
        sport_id,
        market_id,
        bet_type,
        model_version,
        CAST(issued_at / 86400 AS INTEGER)
      );
    CREATE TRIGGER IF NOT EXISTS trg_limit_forecast_issues_immutable_update
      BEFORE UPDATE ON limit_forecast_issues
      BEGIN
        SELECT RAISE(ABORT, 'limit forecast issues are immutable');
      END;
    CREATE TRIGGER IF NOT EXISTS trg_limit_forecast_issues_immutable_delete
      BEFORE DELETE ON limit_forecast_issues
      BEGIN
        SELECT RAISE(ABORT, 'limit forecast issues are immutable');
      END;

    CREATE TABLE IF NOT EXISTS limit_forecast_outcomes (
      issue_id TEXT PRIMARY KEY
        REFERENCES limit_forecast_issues(id) ON DELETE RESTRICT,
      actual_raise INTEGER NOT NULL CHECK(actual_raise IN (0, 1)),
      actual_magnitude_pct REAL NOT NULL,
      observation_count INTEGER NOT NULL CHECK(observation_count >= 0),
      observed_through_at INTEGER NOT NULL,
      first_raise_at INTEGER,
      brier_score REAL NOT NULL CHECK(brier_score >= 0),
      log_loss REAL NOT NULL CHECK(log_loss >= 0),
      evidence_json TEXT NOT NULL,
      matured_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_limit_forecast_outcomes_matured
      ON limit_forecast_outcomes(matured_at);
    CREATE TRIGGER IF NOT EXISTS trg_limit_forecast_outcomes_immutable_update
      BEFORE UPDATE ON limit_forecast_outcomes
      BEGIN
        SELECT RAISE(ABORT, 'limit forecast outcomes are immutable');
      END;
    CREATE TRIGGER IF NOT EXISTS trg_limit_forecast_outcomes_immutable_delete
      BEFORE DELETE ON limit_forecast_outcomes
      BEGIN
        SELECT RAISE(ABORT, 'limit forecast outcomes are immutable');
      END;
  `);
}
