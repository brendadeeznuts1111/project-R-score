// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/** Persisted, counterbalanced within-partner switchback schedules. */
import type { Database } from 'bun:sqlite';
import {
  asExperimentVariantId,
  unbrand,
  type ExperimentId,
  type TreeNodeId,
} from '../types/branded.ts';
import { FactorialEngine } from './engine.ts';
import type { VariantConfig } from './design.ts';

export type SwitchbackPeriod = {
  id: string; // brand-ok — SQLite period row identity
  experimentId: ExperimentId;
  partnerId: TreeNodeId;
  variantId: ReturnType<typeof asExperimentVariantId>;
  config: VariantConfig;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  washoutDays: number;
};

export type SwitchbackAnalysis = {
  metricName: string;
  nObservations: number;
  linearTimeTrendPerDay: number;
  effects: Array<{
    variantId: ReturnType<typeof asExperimentVariantId>;
    config: VariantConfig;
    effectAfterLinearTimeAdjustment: number;
    n: number;
  }>;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function seededOrder<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let state = Number(Bun.hash(seed) & 0xffff_ffffn) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function linearSlope(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  const meanX = average(points.map(point => point.x));
  const meanY = average(points.map(point => point.y));
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator === 0) return 0;
  return (
    points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator
  );
}

/** Create treatment periods with washout gaps between each scheduled variant. */
export function createSwitchbackSchedule(
  db: Database,
  engine: FactorialEngine,
  input: {
    experimentId: ExperimentId;
    partnerId: TreeNodeId;
    periodDays: number;
    washoutDays?: number;
    cycles?: number;
    startsAt?: Date;
    seed?: string;
    firstVariantId?: ReturnType<typeof asExperimentVariantId>;
  }
): SwitchbackPeriod[] {
  if (!Number.isInteger(input.periodDays) || input.periodDays < 1)
    throw new Error('periodDays must be an integer ≥ 1');
  const washoutDays = input.washoutDays ?? 3;
  const cycles = input.cycles ?? 1;
  if (!Number.isInteger(washoutDays) || washoutDays < 0)
    throw new Error('washoutDays must be an integer ≥ 0');
  if (!Number.isInteger(cycles) || cycles < 1) throw new Error('cycles must be an integer ≥ 1');
  const exists = db
    .query(
      `SELECT 1 FROM experiment_switchback_periods
     WHERE experiment_id = $experimentId AND partner_id = $partnerId LIMIT 1`
    )
    .get({ $experimentId: unbrand(input.experimentId), $partnerId: unbrand(input.partnerId) });
  if (exists) throw new Error('Switchback schedule already exists for this partner');

  const variants = engine.listVariants(input.experimentId);
  if (variants.length < 2) throw new Error('Switchback requires at least two variants');
  let ordered = seededOrder(variants, input.seed ?? unbrand(input.partnerId));
  if (input.firstVariantId) {
    const first = ordered.find(variant => unbrand(variant.id) === unbrand(input.firstVariantId!));
    if (!first) throw new Error('firstVariantId is not in this experiment');
    ordered = [first, ...ordered.filter(variant => unbrand(variant.id) !== unbrand(first.id))];
  }

  const insert = db.prepare(
    `INSERT INTO experiment_switchback_periods
       (id, experiment_id, partner_id, variant_id, config_json, period_index, starts_at, ends_at, washout_days, created_at)
     VALUES ($id, $experimentId, $partnerId, $variantId, $config, $periodIndex, $startsAt, $endsAt, $washoutDays, $createdAt)`
  );
  const periods: SwitchbackPeriod[] = [];
  let cursor = input.startsAt ? new Date(input.startsAt) : new Date();
  let periodIndex = 0;
  for (let cycle = 0; cycle < cycles; cycle++)
    for (const variant of ordered) {
      const startsAt = cursor.toISOString();
      const endsAt = addDays(cursor, input.periodDays).toISOString();
      const id = Bun.randomUUIDv7();
      insert.run({
        $id: id,
        $experimentId: unbrand(input.experimentId),
        $partnerId: unbrand(input.partnerId),
        $variantId: unbrand(variant.id),
        $config: JSON.stringify(variant.config),
        $periodIndex: periodIndex,
        $startsAt: startsAt,
        $endsAt: endsAt,
        $washoutDays,
        $createdAt: new Date().toISOString(),
      });
      periods.push({
        id,
        experimentId: input.experimentId,
        partnerId: input.partnerId,
        variantId: variant.id,
        config: variant.config,
        periodIndex,
        startsAt,
        endsAt,
        washoutDays,
      });
      cursor = addDays(new Date(endsAt), washoutDays);
      periodIndex++;
    }
  return periods;
}

export function currentSwitchbackPeriod(
  db: Database,
  experimentId: ExperimentId,
  partnerId: TreeNodeId,
  now = new Date()
): SwitchbackPeriod | null {
  const row = db
    .query(
      `SELECT * FROM experiment_switchback_periods WHERE experiment_id = $experimentId AND partner_id = $partnerId
       AND starts_at <= $now AND ends_at > $now ORDER BY starts_at DESC LIMIT 1`
    )
    .get({
      $experimentId: unbrand(experimentId),
      $partnerId: unbrand(partnerId),
      $now: now.toISOString(),
    }) as {
    id: string; // brand-ok — SQLite period row PK
    variant_id: string; // brand-ok — SQLite FK → ExperimentVariantId
    config_json: string;
    period_index: number;
    starts_at: string;
    ends_at: string;
    washout_days: number;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    experimentId,
    partnerId,
    variantId: asExperimentVariantId(row.variant_id),
    config: JSON.parse(row.config_json) as VariantConfig,
    periodIndex: row.period_index,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    washoutDays: row.washout_days,
  };
}

/** Metrics are accepted only inside a treatment period, never a washout gap. */
export function recordSwitchbackMetric(
  db: Database,
  input: {
    experimentId: ExperimentId;
    partnerId: TreeNodeId;
    metricName: string;
    value: number;
    recordedAt?: Date;
  }
): string {
  const recordedAt = input.recordedAt ?? new Date();
  if (!currentSwitchbackPeriod(db, input.experimentId, input.partnerId, recordedAt)) {
    throw new Error('Cannot record switchback metric outside an active treatment period');
  }
  const id = Bun.randomUUIDv7();
  db.run(
    `INSERT INTO experiment_metrics (id, experiment_id, partner_id, metric_name, metric_value, recorded_at)
     VALUES ($id, $experimentId, $partnerId, $metricName, $value, $recordedAt)`,
    {
      $id: id,
      $experimentId: unbrand(input.experimentId),
      $partnerId: unbrand(input.partnerId),
      $metricName: input.metricName,
      $value: input.value,
      $recordedAt: recordedAt.toISOString(),
    }
  );
  return id;
}

/** Descriptive effects after one shared linear time-trend adjustment. */
export function analyzeSwitchback(
  db: Database,
  engine: FactorialEngine,
  experimentId: ExperimentId,
  metricName?: string
): SwitchbackAnalysis {
  const experiment = engine.getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
  const name = metricName ?? experiment.metricName;
  const rows = db
    .query(
      `SELECT p.variant_id, p.config_json, m.metric_value, m.recorded_at FROM experiment_switchback_periods p
     JOIN experiment_metrics m ON m.experiment_id = p.experiment_id AND m.partner_id = p.partner_id
       AND m.recorded_at >= p.starts_at AND m.recorded_at < p.ends_at
     WHERE p.experiment_id = $experimentId AND m.metric_name = $metricName ORDER BY m.recorded_at`
    )
    .all({ $experimentId: unbrand(experimentId), $metricName: name }) as Array<{
    variant_id: string; // brand-ok — SQLite FK → ExperimentVariantId
    config_json: string;
    metric_value: number;
    recorded_at: string;
  }>;
  if (!rows.length)
    return { metricName: name, nObservations: 0, linearTimeTrendPerDay: 0, effects: [] };
  const origin = new Date(rows[0]!.recorded_at).getTime();
  const points = rows.map(row => ({
    x: (new Date(row.recorded_at).getTime() - origin) / 86_400_000,
    y: row.metric_value,
  }));
  const slope = linearSlope(points);
  const groups = new Map<string, { config: VariantConfig; values: number[] }>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const group = groups.get(row.variant_id) ?? {
      config: JSON.parse(row.config_json) as VariantConfig,
      values: [],
    };
    group.values.push(points[i]!.y - slope * points[i]!.x);
    groups.set(row.variant_id, group);
  }
  const baseline = engine.listVariants(experimentId)[0];
  const baselineId = baseline ? unbrand(baseline.id) : '';
  const baselineMean = baseline ? average(groups.get(baselineId)?.values ?? []) : NaN;
  return {
    metricName: name,
    nObservations: rows.length,
    linearTimeTrendPerDay: slope,
    effects: [...groups.entries()]
      .filter(([id]) => id !== baselineId)
      .map(([id, group]) => ({
        variantId: asExperimentVariantId(id),
        config: group.config,
        effectAfterLinearTimeAdjustment: Number.isFinite(baselineMean)
          ? average(group.values) - baselineMean
          : 0,
        n: group.values.length,
      })),
  };
}
