// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect (depth)
/**
 * Limit-prediction report with Bun.inspect.table + inspect.custom.
 * Pair with LimitRaiseReport for multi-factor history + forecast in one CLI flow.
 */
import {
  getConsoleDepth,
  inspectCustom,
  inspectTable as inspectTableCore,
  logDepth,
  shouldColor,
} from '../console-depth.ts';
import {
  inspectTable,
  proveInspectTable,
  projectTableRows,
  type InspectTableProof,
  type TableRow,
} from '../http/networking-report.ts';
import { deepEquals } from '../deep-equals.ts';
import type { LimitPrediction, LimitPredictionInput } from './limit-prediction.ts';

export const LIMIT_PREDICTION_TABLE_PROPERTIES = [
  'book',
  'sport',
  'market',
  'type',
  'prob',
  'mag_pct',
  'conf',
  'window',
] as const;

export const LIMIT_PRED_DRIVER_TABLE_PROPERTIES = ['book', 'market', 'driver', 'i'] as const;

export type PredictionRow = {
  dimension: LimitPredictionInput;
  prediction: LimitPrediction;
};

export class LimitPredictionReport {
  readonly nodeId: string; // brand-ok — TreeNodeId wire / partner slug
  readonly rows: PredictionRow[];

  constructor(rows: PredictionRow[], opts?: { nodeId?: string /* brand-ok */ }) {
    this.rows = rows;
    this.nodeId = opts?.nodeId ?? rows[0]?.dimension.node_id ?? '—';
  }

  predictionRows(): TableRow[] {
    return this.rows.map(({ dimension: d, prediction: p }) => ({
      book: d.sportsbook,
      sport: d.sport_id,
      market: d.market_id,
      type: d.bet_type,
      prob: `${(p.predictedRaiseProb * 100).toFixed(0)}%`,
      mag_pct: `+${p.predictedMagnitudePct}%`,
      conf: p.confidence,
      window: p.windowHint.replace(/^Best window:\s*/i, '').slice(0, 28),
    }));
  }

  driverRows(): TableRow[] {
    const out: TableRow[] = [];
    for (const { dimension: d, prediction: p } of this.rows) {
      p.topDrivers.forEach((driver, i) => {
        out.push({
          book: d.sportsbook,
          market: `${d.sport_id}/${d.market_id}`,
          driver,
          i: i + 1,
        });
      });
    }
    return out;
  }

  /** Deep payload: arrays of drivers + numeric scores for Bun.inspect depth. */
  deepPayload(): object {
    return this.rows.map(({ dimension: d, prediction: p }) => ({
      dimension: { ...d },
      predictedRaiseProb: p.predictedRaiseProb,
      predictedMagnitudePct: p.predictedMagnitudePct,
      confidence: p.confidence,
      /** string[] drivers */
      topDrivers: [...p.topDrivers],
      /** number[] bar samples 0..1 for sparkline-style inspect */
      prob_bar: Array.from({ length: 10 }, (_, i) =>
        i < Math.round(p.predictedRaiseProb * 10) ? 1 : 0
      ),
      windowHint: p.windowHint,
      predictionDate: p.predictionDate,
    }));
  }

  tableProof(): { predictions: InspectTableProof; drivers?: InspectTableProof } {
    const pred = projectTableRows(this.predictionRows(), LIMIT_PREDICTION_TABLE_PROPERTIES);
    const out: { predictions: InspectTableProof; drivers?: InspectTableProof } = {
      predictions: proveInspectTable(pred, LIMIT_PREDICTION_TABLE_PROPERTIES),
    };
    const drivers = this.driverRows();
    if (drivers.length) {
      out.drivers = proveInspectTable(drivers, LIMIT_PRED_DRIVER_TABLE_PROPERTIES);
    }
    return out;
  }

  render(opts: { colors?: boolean } = {}): {
    predictions: string;
    drivers: string;
    deep: string;
  } {
    const colors = opts.colors ?? shouldColor();
    const pred = this.predictionRows();
    const projected = projectTableRows(pred, LIMIT_PREDICTION_TABLE_PROPERTIES);
    const a = inspectTableCore(projected, [...LIMIT_PREDICTION_TABLE_PROPERTIES], {
      colors: false,
    });
    const b = inspectTableCore(projected, [...LIMIT_PREDICTION_TABLE_PROPERTIES], {
      colors: false,
    });
    if (!deepEquals(a, b)) {
      throw new Error('LimitPredictionReport: inspect.table not idempotent');
    }
    const drivers = this.driverRows();
    return {
      predictions: inspectTable(pred, LIMIT_PREDICTION_TABLE_PROPERTIES, { colors }),
      drivers: drivers.length
        ? inspectTable(drivers, LIMIT_PRED_DRIVER_TABLE_PROPERTIES, { colors })
        : '(no drivers)',
      deep: Bun.inspect(this.deepPayload(), {
        depth: getConsoleDepth(),
        colors,
        sorted: true,
      }),
    };
  }

  toJSON(): object {
    return {
      nodeId: this.nodeId,
      count: this.rows.length,
      predictions: this.predictionRows(),
      drivers: this.driverRows(),
      deep: this.deepPayload(),
      tableProof: this.tableProof(),
    };
  }

  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    const r = this.render({ colors });
    return [
      `LimitPredictionReport · node=${this.nodeId} · n=${this.rows.length} · depth=${getConsoleDepth()}`,
      '',
      '── PREDICTIONS (Bun.inspect.table · properties) ──',
      r.predictions,
      '',
      '── DRIVERS (array → table) ──',
      r.drivers,
      '',
      '── DEEP (Bun.inspect · string[] · number[] bars) ──',
      r.deep,
    ].join('\n');
  }
}

export function printLimitPredictionReport(
  rows: PredictionRow[],
  opts?: { nodeId?: string /* brand-ok */ }
): LimitPredictionReport {
  const report = new LimitPredictionReport(rows, opts);
  logDepth(report);
  return report;
}
