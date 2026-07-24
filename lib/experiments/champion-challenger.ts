// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Champion/challenger shadow evaluation for system-scoped models.
 * Promote recommendation is margin + n based — not a p-value claim.
 */
import type { Database } from 'bun:sqlite';

export function ensurePredictionShadowSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS prediction_shadow (
      id TEXT PRIMARY KEY,
      context_json TEXT,
      champion_model TEXT NOT NULL,
      challenger_model TEXT NOT NULL,
      champion_pred REAL NOT NULL,
      challenger_pred REAL NOT NULL,
      actual REAL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pred_shadow_unresolved
      ON prediction_shadow(actual) WHERE actual IS NULL;
  `);
}

export type ShadowLogInput = {
  championModel: string;
  challengerModel: string;
  championPred: number;
  challengerPred: number;
  context?: Record<string, unknown>;
  actual?: number;
};

export function shadowLog(db: Database, input: ShadowLogInput): string {
  ensurePredictionShadowSchema(db);
  const id = Bun.randomUUIDv7();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO prediction_shadow
       (id, context_json, champion_model, challenger_model, champion_pred, challenger_pred,
        actual, created_at, resolved_at)
     VALUES ($id, $ctx, $ch, $cg, $cp, $gp, $act, $now, $res)`,
    {
      $id: id,
      $ctx: input.context ? JSON.stringify(input.context) : null,
      $ch: input.championModel,
      $cg: input.challengerModel,
      $cp: input.championPred,
      $gp: input.challengerPred,
      $act: input.actual ?? null,
      $now: now,
      $res: input.actual != null ? now : null,
    }
  );
  return id;
}

export function resolveShadowActual(db: Database, id: string, actual: number): void {
  // brand-ok — opaque shadow row id
  ensurePredictionShadowSchema(db);
  db.run(`UPDATE prediction_shadow SET actual = $a, resolved_at = $now WHERE id = $id`, {
    $a: actual,
    $now: new Date().toISOString(),
    $id: id,
  });
}

export type ShadowEvalResult = {
  n: number;
  championMae: number;
  challengerMae: number;
  maeImprovement: number;
  /** True when challenger MAE is lower by ≥ margin and n ≥ minN. */
  recommendPromote: boolean;
  margin: number;
  minN: number;
  note: string;
};

function mae(preds: number[], actuals: number[]): number {
  let s = 0;
  for (let i = 0; i < preds.length; i++) s += Math.abs(preds[i]! - actuals[i]!);
  return s / preds.length;
}

/**
 * Evaluate resolved shadow rows. Operational promote rule only — no t-test.
 */
export function evaluateShadow(
  db: Database,
  opts?: { minN?: number; margin?: number; limit?: number }
): ShadowEvalResult {
  ensurePredictionShadowSchema(db);
  const minN = opts?.minN ?? 100;
  const margin = opts?.margin ?? 0.01;
  const limit = opts?.limit ?? 10_000;

  const rows = db
    .query(
      `SELECT champion_pred, challenger_pred, actual FROM prediction_shadow
       WHERE actual IS NOT NULL
       ORDER BY resolved_at DESC LIMIT $n`
    )
    .all({ $n: limit }) as Array<{
    champion_pred: number;
    challenger_pred: number;
    actual: number;
  }>;

  if (rows.length === 0) {
    return {
      n: 0,
      championMae: 0,
      challengerMae: 0,
      maeImprovement: 0,
      recommendPromote: false,
      margin,
      minN,
      note: 'No resolved shadow rows.',
    };
  }

  const championMae = mae(
    rows.map(r => r.champion_pred),
    rows.map(r => r.actual)
  );
  const challengerMae = mae(
    rows.map(r => r.challenger_pred),
    rows.map(r => r.actual)
  );
  const maeImprovement = championMae - challengerMae;
  const recommendPromote = rows.length >= minN && maeImprovement >= margin;

  return {
    n: rows.length,
    championMae,
    challengerMae,
    maeImprovement,
    recommendPromote,
    margin,
    minN,
    note: recommendPromote
      ? `Operational promote: challenger MAE ${challengerMae.toFixed(4)} beats champion ${championMae.toFixed(4)} by ${maeImprovement.toFixed(4)} (n=${rows.length}). Margin + n threshold only — not inferential statistics.`
      : `Hold champion: improvement ${maeImprovement.toFixed(4)} (need ≥ ${margin}) with n=${rows.length} (need ≥ ${minN}).`,
  };
}
