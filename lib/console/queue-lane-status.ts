// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/**
 * Queue / worker lane snapshots — columnar stats via inspectTable + inspectCustom.
 *
 * Distinct from tools/lane-status.ts (git worktree hygiene). Use this for
 * pending/processing/completed/errors aggregates; print with logQueueLaneStatus
 * or logDepth(report) — never raw console.log(Bun.inspect.table(...)).
 *
 * Symbol: inspectCustom === Symbol.for("nodejs.util.inspect.custom")
 * (Symbol.for("Bun.inspect.custom") is ignored by Bun.inspect / console.log).
 */
import { shouldColor } from './color.ts';
import { inspectCustom, logDepth } from './inspect.ts';
import { inspectTable, logTable } from './table.ts';

export const QUEUE_LANE_STAT_KEYS = ['pending', 'processing', 'completed', 'errors'] as const;

export type QueueLaneStatKey = (typeof QUEUE_LANE_STAT_KEYS)[number];

export const QUEUE_LANE_TABLE_KEYS = ['name', ...QUEUE_LANE_STAT_KEYS] as const;

export type QueueLaneTableKey = (typeof QUEUE_LANE_TABLE_KEYS)[number];

export type QueueLaneTotals = Record<QueueLaneStatKey, number>;

/** One worker / queue lane with numeric stats. */
export class QueueLaneStatus {
  constructor(
    readonly name: string,
    readonly pending: number,
    readonly processing: number,
    readonly completed: number,
    readonly errors: number
  ) {}
}

/** Dynamic stats keys for a row (excludes `name`). */
export function queueLaneStatKeys(
  row: QueueLaneStatus | Record<string, unknown>
): QueueLaneStatKey[] {
  return (Object.keys(row) as string[]).filter(
    (k): k is QueueLaneStatKey =>
      k !== 'name' && (QUEUE_LANE_STAT_KEYS as readonly string[]).includes(k)
  );
}

export type QueueLaneStatusReportJson = {
  lanes: Array<{
    name: string;
    pending: number;
    processing: number;
    completed: number;
    errors: number;
  }>;
  totals: QueueLaneTotals;
};

/**
 * Collection wrapper — inspect.custom lives here (not on every row).
 * Call site: logDepth(report) / logQueueLaneStatus(report) / cliOut(report, { json }).
 */
export class QueueLaneStatusReport {
  constructor(readonly lanes: readonly QueueLaneStatus[]) {}

  totals(): QueueLaneTotals {
    const out: QueueLaneTotals = {
      pending: 0,
      processing: 0,
      completed: 0,
      errors: 0,
    };
    for (const lane of this.lanes) {
      out.pending += lane.pending;
      out.processing += lane.processing;
      out.completed += lane.completed;
      out.errors += lane.errors;
    }
    return out;
  }

  toJSON(): QueueLaneStatusReportJson {
    return {
      lanes: this.lanes.map(l => ({
        name: l.name,
        pending: l.pending,
        processing: l.processing,
        completed: l.completed,
        errors: l.errors,
      })),
      totals: this.totals(),
    };
  }

  /**
   * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
   * Bun.inspect / logDepth call this automatically.
   */
  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    const t = this.totals();
    const table = inspectTable([...this.lanes], [...QUEUE_LANE_TABLE_KEYS], { colors });
    const footer =
      `totals · pending=${t.pending} processing=${t.processing} ` +
      `completed=${t.completed} errors=${t.errors}`;
    return [`QueueLaneStatusReport · lanes=${this.lanes.length}`, '', table, '', footer].join('\n');
  }
}

/** Print lanes (or a report) through lib/console — no raw console.table / Bun.inspect.table. */
export function logQueueLaneStatus(
  input: readonly QueueLaneStatus[] | QueueLaneStatusReport,
  options: { statsOnly?: boolean; colors?: boolean } = {}
): void {
  const report = input instanceof QueueLaneStatusReport ? input : new QueueLaneStatusReport(input);
  if (options.statsOnly) {
    const cols = [...QUEUE_LANE_STAT_KEYS];
    logTable([...report.lanes], cols, { colors: options.colors });
    return;
  }
  logDepth(report, { colors: options.colors });
}
