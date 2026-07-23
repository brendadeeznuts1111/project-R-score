// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Factorial experiment engine — create designs, sticky balanced assign, metrics, analyze.
 */
import type { Database } from 'bun:sqlite';
import {
  asExperimentAssignmentId,
  asExperimentId,
  asExperimentVariantId,
  asTreeNodeId,
  unbrand,
  type ExperimentId,
  type ExperimentVariantId,
  type TreeNodeId,
} from '../types/branded.ts';
import {
  analyzeFactorial,
  predictFromEffects,
  type FactorialAnalysis,
  type PartnerMetricRow,
} from './analyze.ts';
import {
  configKey,
  generateDesign,
  stickyVariantIndex,
  type Factor,
  type FactorialDesignResult,
  type VariantConfig,
} from './design.ts';
import { ensureExperimentsSchema } from './schema.ts';

export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed';

export type ExperimentRow = {
  id: ExperimentId;
  name: string;
  status: ExperimentStatus;
  factors: Factor[];
  design: FactorialDesignResult;
  fractionDenom: number;
  designMethod: string;
  metricName: string;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
};

export type AssignmentResult = {
  assignmentId: string; // brand-ok — ExperimentAssignmentId
  experimentId: ExperimentId;
  partnerId: TreeNodeId;
  variantId: ExperimentVariantId;
  config: VariantConfig;
  assignedAt: string;
  created: boolean;
};

type ExpDbRow = {
  id: string; // brand-ok — SQLite row; minted as ExperimentId in mapExperiment
  name: string;
  status: ExperimentStatus;
  factors_json: string;
  design_json: string;
  fraction_denom: number;
  design_method: string;
  metric_name: string;
  aliases_json: string | null;
  created_at: string;
  updated_at: string;
};

type VariantDbRow = {
  id: string; // brand-ok — SQLite row → ExperimentVariantId
  experiment_id: string; // brand-ok — FK column
  variant_index: number;
  config_json: string;
  config_key: string;
};

/** Known variant keys that override coverage floor in canOfferOnPlatform. */
export const COVERAGE_FLOOR_KEYS = ['min_coverage_pct', 'coverage_floor'] as const;

export class FactorialEngine {
  constructor(private readonly db: Database) {
    ensureExperimentsSchema(db);
  }

  /** Create experiment + persist design variants. Status starts as draft. */
  createExperiment(input: {
    name: string;
    factors: Factor[];
    fractionDenom?: number;
    metricName?: string;
    id?: ExperimentId;
  }): ExperimentRow {
    const factors = input.factors;
    if (!factors.length) throw new Error('At least one factor required');
    for (const f of factors) {
      if (!f.name?.trim()) throw new Error('Factor name required');
      if (!f.levels?.length) throw new Error(`Factor "${f.name}" needs levels`);
    }

    const design = generateDesign(factors, input.fractionDenom ?? 1);
    const id = input.id ?? asExperimentId(Bun.randomUUIDv7());
    const now = new Date().toISOString();
    const metricName = input.metricName ?? 'win_rate';

    this.db.run(
      `INSERT INTO experiments (
         id, name, status, factors_json, design_json, fraction_denom,
         design_method, metric_name, aliases_json, created_at, updated_at
       ) VALUES (
         $id, $name, 'draft', $factors, $design, $frac,
         $method, $metric, $aliases, $now, $now
       )`,
      {
        $id: unbrand(id),
        $name: input.name,
        $factors: JSON.stringify(factors),
        $design: JSON.stringify(design),
        $frac: design.fractionDenom,
        $method: design.method,
        $metric: metricName,
        $aliases: JSON.stringify(design.aliases),
        $now: now,
      }
    );

    const insertVariant = this.db.prepare(
      `INSERT INTO experiment_variants (id, experiment_id, variant_index, config_json, config_key)
       VALUES ($id, $exp, $idx, $cfg, $key)`
    );
    for (let i = 0; i < design.variants.length; i++) {
      const config = design.variants[i]!;
      insertVariant.run({
        $id: unbrand(asExperimentVariantId(Bun.randomUUIDv7())),
        $exp: unbrand(id),
        $idx: i,
        $cfg: JSON.stringify(config),
        $key: configKey(config),
      });
    }

    return this.getExperiment(id)!;
  }

  getExperiment(experimentId: ExperimentId): ExperimentRow | null {
    const row = this.db
      .query(`SELECT * FROM experiments WHERE id = $id`)
      .get({ $id: unbrand(experimentId) }) as ExpDbRow | null;
    if (!row) return null;
    return this.mapExperiment(row);
  }

  listExperiments(): ExperimentRow[] {
    const rows = this.db
      .query(`SELECT * FROM experiments ORDER BY created_at DESC`)
      .all() as ExpDbRow[];
    return rows.map(r => this.mapExperiment(r));
  }

  setStatus(experimentId: ExperimentId, status: ExperimentStatus): void {
    const now = new Date().toISOString();
    const r = this.db.run(
      `UPDATE experiments SET status = $s, updated_at = $now WHERE id = $id`,
      { $s: status, $now: now, $id: unbrand(experimentId) }
    );
    if (r.changes === 0) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
  }

  listVariants(experimentId: ExperimentId): Array<{
    id: ExperimentVariantId;
    index: number;
    config: VariantConfig;
    configKey: string;
    assignmentCount: number;
  }> {
    const rows = this.db
      .query(
        `SELECT v.*, (
           SELECT COUNT(*) FROM experiment_assignments a WHERE a.variant_id = v.id
         ) AS n
         FROM experiment_variants v
         WHERE v.experiment_id = $id
         ORDER BY v.variant_index`
      )
      .all({ $id: unbrand(experimentId) }) as Array<VariantDbRow & { n: number }>;

    return rows.map(r => ({
      id: asExperimentVariantId(r.id),
      index: r.variant_index,
      config: JSON.parse(r.config_json) as VariantConfig,
      configKey: r.config_key,
      assignmentCount: r.n,
    }));
  }

  /**
   * Sticky balanced assignment: reuse existing row; else pick least-filled
   * design cell, breaking ties with sticky hash(experiment, partner).
   */
  assignBalanced(experimentId: ExperimentId, partnerId: TreeNodeId): AssignmentResult {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
    if (exp.status !== 'active' && exp.status !== 'draft') {
      throw new Error(`Cannot assign while experiment is ${exp.status}`);
    }

    const existing = this.db
      .query(
        `SELECT id, experiment_id, partner_id, variant_id, config_json, assigned_at
         FROM experiment_assignments
         WHERE experiment_id = $e AND partner_id = $p`
      )
      .get({ $e: unbrand(experimentId), $p: unbrand(partnerId) }) as {
      id: string; // brand-ok
      experiment_id: string; // brand-ok
      partner_id: string; // brand-ok
      variant_id: string; // brand-ok
      config_json: string;
      assigned_at: string;
    } | null;

    if (existing) {
      return {
        assignmentId: existing.id,
        experimentId,
        partnerId,
        variantId: asExperimentVariantId(existing.variant_id),
        config: JSON.parse(existing.config_json) as VariantConfig,
        assignedAt: existing.assigned_at,
        created: false,
      };
    }

    const variants = this.listVariants(experimentId);
    if (!variants.length) throw new Error('Experiment has no variants');

    const minCount = Math.min(...variants.map(v => v.assignmentCount));
    const candidates = variants.filter(v => v.assignmentCount === minCount);
    const sticky = stickyVariantIndex(experimentId, partnerId, candidates.length);
    const chosen = candidates[sticky] ?? candidates[0]!;

    const assignmentId = asExperimentAssignmentId(Bun.randomUUIDv7());
    const assignedAt = new Date().toISOString();
    this.db.run(
      `INSERT INTO experiment_assignments
         (id, experiment_id, partner_id, variant_id, config_json, assigned_at)
       VALUES ($id, $e, $p, $v, $cfg, $at)`,
      {
        $id: unbrand(assignmentId),
        $e: unbrand(experimentId),
        $p: unbrand(partnerId),
        $v: unbrand(chosen.id),
        $cfg: JSON.stringify(chosen.config),
        $at: assignedAt,
      }
    );

    return {
      assignmentId: unbrand(assignmentId),
      experimentId,
      partnerId,
      variantId: chosen.id,
      config: chosen.config,
      assignedAt,
      created: true,
    };
  }

  /**
   * Assign partner to an exact design cell (must exist on the experiment).
   * Sticky if already assigned (returns existing; does not re-point).
   */
  assignToConfig(
    experimentId: ExperimentId,
    partnerId: TreeNodeId,
    config: VariantConfig
  ): AssignmentResult {
    const existing = this.getAssignment(experimentId, partnerId);
    if (existing) return existing;

    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
    if (exp.status !== 'active' && exp.status !== 'draft') {
      throw new Error(`Cannot assign while experiment is ${exp.status}`);
    }

    const key = configKey(config);
    const variant = this.listVariants(experimentId).find(v => v.configKey === key);
    if (!variant) {
      throw new Error(`Config not in design: ${key}`);
    }

    const assignmentId = asExperimentAssignmentId(Bun.randomUUIDv7());
    const assignedAt = new Date().toISOString();
    this.db.run(
      `INSERT INTO experiment_assignments
         (id, experiment_id, partner_id, variant_id, config_json, assigned_at)
       VALUES ($id, $e, $p, $v, $cfg, $at)`,
      {
        $id: unbrand(assignmentId),
        $e: unbrand(experimentId),
        $p: unbrand(partnerId),
        $v: unbrand(variant.id),
        $cfg: JSON.stringify(variant.config),
        $at: assignedAt,
      }
    );

    return {
      assignmentId: unbrand(assignmentId),
      experimentId,
      partnerId,
      variantId: variant.id,
      config: variant.config,
      assignedAt,
      created: true,
    };
  }

  getAssignment(
    experimentId: ExperimentId,
    partnerId: TreeNodeId
  ): AssignmentResult | null {
    const row = this.db
      .query(
        `SELECT id, experiment_id, partner_id, variant_id, config_json, assigned_at
         FROM experiment_assignments
         WHERE experiment_id = $e AND partner_id = $p`
      )
      .get({ $e: unbrand(experimentId), $p: unbrand(partnerId) }) as {
      id: string; // brand-ok
      experiment_id: string; // brand-ok
      partner_id: string; // brand-ok
      variant_id: string; // brand-ok
      config_json: string;
      assigned_at: string;
    } | null;
    if (!row) return null;
    return {
      assignmentId: row.id,
      experimentId,
      partnerId,
      variantId: asExperimentVariantId(row.variant_id),
      config: JSON.parse(row.config_json) as VariantConfig,
      assignedAt: row.assigned_at,
      created: false,
    };
  }

  /** Record a metric observation for a partner in an experiment. */
  recordMetric(input: {
    experimentId: ExperimentId;
    partnerId: TreeNodeId;
    value: number;
    metricName?: string;
  }): string {
    const exp = this.getExperiment(input.experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(input.experimentId)}`);
    const metricName = input.metricName ?? exp.metricName;
    const id = Bun.randomUUIDv7();
    this.db.run(
      `INSERT INTO experiment_metrics
         (id, experiment_id, partner_id, metric_name, metric_value, recorded_at)
       VALUES ($id, $e, $p, $n, $v, $at)`,
      {
        $id: id,
        $e: unbrand(input.experimentId),
        $p: unbrand(input.partnerId),
        $n: metricName,
        $v: input.value,
        $at: new Date().toISOString(),
      }
    );
    return id;
  }

  /** Partner-level mean metrics joined to assignment configs. */
  partnerMetricRows(experimentId: ExperimentId, metricName?: string): PartnerMetricRow[] {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
    const name = metricName ?? exp.metricName;

    const rows = this.db
      .query(
        `SELECT a.partner_id, a.config_json,
                AVG(m.metric_value) AS avg_metric
         FROM experiment_assignments a
         JOIN experiment_metrics m
           ON m.experiment_id = a.experiment_id AND m.partner_id = a.partner_id
         WHERE a.experiment_id = $e AND m.metric_name = $n
         GROUP BY a.partner_id, a.config_json`
      )
      .all({ $e: unbrand(experimentId), $n: name }) as Array<{
      partner_id: string; // brand-ok
      config_json: string;
      avg_metric: number;
    }>;

    return rows.map(r => ({
      partnerId: r.partner_id,
      config: JSON.parse(r.config_json) as VariantConfig,
      metric: r.avg_metric,
    }));
  }

  analyze(experimentId: ExperimentId, opts?: { metricName?: string }): FactorialAnalysis {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
    const rows = this.partnerMetricRows(experimentId, opts?.metricName);
    return analyzeFactorial(exp.factors, rows, {
      metricName: opts?.metricName ?? exp.metricName,
    });
  }

  predict(
    experimentId: ExperimentId,
    config: VariantConfig,
    includeInteractions = true
  ): number {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${unbrand(experimentId)}`);
    const analysis = this.analyze(experimentId);
    return predictFromEffects(analysis, exp.factors, config, includeInteractions);
  }

  /**
   * Coverage floor from an active experiment assignment, if the variant
   * sets min_coverage_pct or coverage_floor. Used by canOfferOnPlatform.
   */
  coverageFloorForPartner(partnerId: TreeNodeId): number | undefined {
    const row = this.db
      .query(
        `SELECT a.config_json
         FROM experiment_assignments a
         JOIN experiments e ON e.id = a.experiment_id
         WHERE a.partner_id = $p AND e.status = 'active'
         ORDER BY a.assigned_at DESC
         LIMIT 1`
      )
      .get({ $p: unbrand(partnerId) }) as { config_json: string } | null;
    if (!row) return undefined;
    const config = JSON.parse(row.config_json) as VariantConfig;
    for (const key of COVERAGE_FLOOR_KEYS) {
      const v = config[key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
        return Number(v);
      }
    }
    return undefined;
  }

  private mapExperiment(row: ExpDbRow): ExperimentRow {
    const design = JSON.parse(row.design_json) as FactorialDesignResult;
    return {
      id: asExperimentId(row.id),
      name: row.name,
      status: row.status,
      factors: JSON.parse(row.factors_json) as Factor[],
      design,
      fractionDenom: row.fraction_denom,
      designMethod: row.design_method,
      metricName: row.metric_name,
      aliases: row.aliases_json ? (JSON.parse(row.aliases_json) as string[]) : design.aliases,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/** Resolve coverage floor override for a partner across active experiments. */
export function resolveExperimentCoverageFloor(
  db: Database,
  partnerId: TreeNodeId | string
): number | undefined {
  ensureExperimentsSchema(db);
  const id = typeof partnerId === 'string' ? asTreeNodeId(partnerId) : partnerId;
  return new FactorialEngine(db).coverageFloorForPartner(id);
}
