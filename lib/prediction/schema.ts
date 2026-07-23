// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';

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
  `);
}
