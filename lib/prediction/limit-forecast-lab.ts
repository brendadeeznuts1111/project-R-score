/**
 * Read-only limit forecast laboratory.
 *
 * This module intentionally evaluates transition-only evidence. It does not
 * write production forecasts or claim 48-hour calibration from change rows.
 */
import type { SportsbookId, TreeNodeId } from '../types/branded.ts';
import type { LimitForecastEvidenceSummary } from './limit-forecast-evidence.ts';

export const LIMIT_FORECAST_LAB_SCHEMA = 1;
export const LIMIT_FORECAST_LAB_MODEL = 'beta-binomial-transition-v0';
export const LIMIT_FORECAST_POOLING_STRENGTH = 8;

export const LIMIT_FORECAST_SUPPORT_GATES = {
  globalCompleted: 100,
  globalRaises: 20,
  bookCompleted: 50,
  bookRaises: 10,
} as const;

export type LimitForecastInputClass =
  | 'partner-observation'
  | 'tier-4-observation'
  | 'fixture-seed'
  | 'unclassified';

export type LimitSnapshotSample = {
  nodeId: TreeNodeId;
  sportsbook: SportsbookId;
  sportKey: string;
  marketKey: string;
  phase: string;
  maxWager: number;
  recordedAt: number;
  /** Evidence provenance. Missing values are treated as unclassified and ineligible. */
  inputClass?: LimitForecastInputClass;
  /** Explicit opt-in. Research, fixture, and unclassified inputs must remain false/absent. */
  decisionEligible?: boolean;
};

export type LimitTransition = {
  nodeId: TreeNodeId;
  sportsbook: SportsbookId;
  sportKey: string;
  marketKey: string;
  phase: string;
  previousLimit: number;
  nextLimit: number;
  delta: number;
  raised: boolean;
  recordedAt: number;
  inputClass: LimitForecastInputClass | 'mixed';
  decisionEligible: boolean;
};

export type RaiseRateEstimate = {
  sportsbook: SportsbookId;
  transitions: number;
  raises: number;
  cutsOrFlat: number;
  observedRate: number;
  pooledRate: number;
  globalWeight: number;
  support: 'insufficient' | 'exploratory';
  /** Transition estimates are laboratory diagnostics, never deployable forecasts. */
  forecastEligible: false;
};

export type WalkForwardScore = {
  samples: number;
  positives: number;
  brier: number | null;
  logLoss: number | null;
};

function dimensionKey(row: LimitSnapshotSample): string {
  return [
    row.nodeId,
    row.sportsbook,
    row.sportKey,
    row.marketKey,
    row.phase,
    row.inputClass ?? 'unclassified',
  ].join('\u001f');
}

function round(value: number, places = 6): number {
  return Number(value.toFixed(places));
}

function clampProbability(value: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, value));
}

export function buildLimitTransitions(rows: readonly LimitSnapshotSample[]): LimitTransition[] {
  const groups = new Map<string, LimitSnapshotSample[]>();
  for (const row of rows) {
    if (!Number.isFinite(row.maxWager) || !Number.isFinite(row.recordedAt)) continue;
    const key = dimensionKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const transitions: LimitTransition[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort(
      (left, right) => left.recordedAt - right.recordedAt || left.maxWager - right.maxWager
    );
    for (let index = 1; index < ordered.length; index++) {
      const previous = ordered[index - 1]!;
      const next = ordered[index]!;
      const delta = next.maxWager - previous.maxWager;
      const previousClass = previous.inputClass ?? 'unclassified';
      const nextClass = next.inputClass ?? 'unclassified';
      transitions.push({
        nodeId: next.nodeId,
        sportsbook: next.sportsbook,
        sportKey: next.sportKey,
        marketKey: next.marketKey,
        phase: next.phase,
        previousLimit: previous.maxWager,
        nextLimit: next.maxWager,
        delta,
        raised: delta > 0,
        recordedAt: next.recordedAt,
        inputClass: previousClass === nextClass ? nextClass : 'mixed',
        decisionEligible: previous.decisionEligible === true && next.decisionEligible === true,
      });
    }
  }

  return transitions.sort(
    (left, right) =>
      left.recordedAt - right.recordedAt ||
      left.sportsbook.localeCompare(right.sportsbook) ||
      left.nodeId.localeCompare(right.nodeId)
  );
}

export function estimatePooledBookRates(
  transitions: readonly LimitTransition[],
  poolingStrength = LIMIT_FORECAST_POOLING_STRENGTH
): { globalRate: number; books: RaiseRateEstimate[] } {
  const raises = transitions.filter(row => row.raised).length;
  const globalRate = (raises + 0.5) / (transitions.length + 1);
  const grouped = new Map<string, LimitTransition[]>();

  for (const row of transitions) {
    const group = grouped.get(row.sportsbook) ?? [];
    group.push(row);
    grouped.set(row.sportsbook, group);
  }

  const books = [...grouped.entries()]
    .map(([sportsbook, rows]) => {
      const bookRaises = rows.filter(row => row.raised).length;
      const pooledRate =
        (bookRaises + poolingStrength * globalRate) / (rows.length + poolingStrength);
      return {
        sportsbook,
        transitions: rows.length,
        raises: bookRaises,
        cutsOrFlat: rows.length - bookRaises,
        observedRate: round(bookRaises / rows.length),
        pooledRate: round(pooledRate),
        globalWeight: round(poolingStrength / (rows.length + poolingStrength)),
        support:
          rows.length >= LIMIT_FORECAST_SUPPORT_GATES.bookCompleted &&
          bookRaises >= LIMIT_FORECAST_SUPPORT_GATES.bookRaises
            ? ('exploratory' as const)
            : ('insufficient' as const),
        forecastEligible: false as const,
      };
    })
    .sort(
      (left, right) =>
        right.transitions - left.transitions || left.sportsbook.localeCompare(right.sportsbook)
    );

  return { globalRate: round(globalRate), books };
}

export function scoreWalkForward(
  transitions: readonly LimitTransition[],
  mode: 'global' | 'pooled',
  minimumTrainingSamples = 8
): WalkForwardScore {
  const ordered = [...transitions].sort((left, right) => left.recordedAt - right.recordedAt);
  const history: LimitTransition[] = [];
  const scored: Array<{ probability: number; actual: number }> = [];

  for (let cursor = 0; cursor < ordered.length; ) {
    const recordedAt = ordered[cursor]!.recordedAt;
    const sameOrigin: LimitTransition[] = [];
    while (cursor < ordered.length && ordered[cursor]!.recordedAt === recordedAt) {
      sameOrigin.push(ordered[cursor]!);
      cursor++;
    }

    if (history.length >= minimumTrainingSamples) {
      const estimate = estimatePooledBookRates(history);
      const byBook = new Map(estimate.books.map(row => [row.sportsbook, row.pooledRate]));
      for (const row of sameOrigin) {
        const probability =
          mode === 'pooled'
            ? (byBook.get(row.sportsbook) ?? estimate.globalRate)
            : estimate.globalRate;
        scored.push({ probability: clampProbability(probability), actual: row.raised ? 1 : 0 });
      }
    }
    history.push(...sameOrigin);
  }

  if (scored.length === 0) {
    return { samples: 0, positives: 0, brier: null, logLoss: null };
  }
  const brier =
    scored.reduce((sum, row) => sum + (row.probability - row.actual) ** 2, 0) / scored.length;
  const logLoss =
    -scored.reduce(
      (sum, row) =>
        sum +
        row.actual * Math.log(row.probability) +
        (1 - row.actual) * Math.log(1 - row.probability),
      0
    ) / scored.length;

  return {
    samples: scored.length,
    positives: scored.filter(row => row.actual === 1).length,
    brier: round(brier),
    logLoss: round(logLoss),
  };
}

export type LimitForecastLabSourceMeta = {
  database: string;
  table: string;
  mode: 'read-only';
  /** Optional Tier 4 JSONL ingest path. */
  scrapeJsonl?: string | null;
  partnerSnapshots?: number;
  scrapeSnapshots?: number;
};

export function buildLimitForecastLab(
  rows: readonly LimitSnapshotSample[],
  generatedAt = new Date().toISOString(),
  evidence: LimitForecastEvidenceSummary = {
    issues: 0,
    pending: 0,
    dueAwaitingObservation: 0,
    matured: 0,
    positives: 0,
    negatives: 0,
    meanBrierScore: null,
    meanLogLoss: null,
  },
  sourceMeta: LimitForecastLabSourceMeta = {
    database: 'data/operations.db',
    table: 'partner_account_limits',
    mode: 'read-only',
  }
) {
  const transitions = buildLimitTransitions(rows);
  const raised = transitions.filter(row => row.raised).length;
  const decisionEligibleSnapshots = rows.filter(row => row.decisionEligible === true).length;
  const researchOnlySnapshots = rows.length - decisionEligibleSnapshots;
  const decisionEligibleTransitions = transitions.filter(row => row.decisionEligible).length;
  const pooled = estimatePooledBookRates(transitions);
  const globalSupport =
    transitions.length >= LIMIT_FORECAST_SUPPORT_GATES.globalCompleted &&
    raised >= LIMIT_FORECAST_SUPPORT_GATES.globalRaises
      ? 'exploratory'
      : 'insufficient';

  return {
    schemaVersion: LIMIT_FORECAST_LAB_SCHEMA,
    kind: 'limit-forecast-lab',
    generatedAt,
    source: sourceMeta,
    dataset: {
      kind: 'transitions-only',
      forecastEligible: false,
      reason:
        'Change snapshots do not provide unbiased no-change 48-hour outcome windows; scores are diagnostics only.',
      snapshots: rows.length,
      decisionEligibleSnapshots,
      researchOnlySnapshots,
      transitions: transitions.length,
      decisionEligibleTransitions,
      raises: raised,
      cutsOrFlat: transitions.length - raised,
      sportsbooks: new Set(transitions.map(row => row.sportsbook)).size,
      earliestAt: transitions[0]?.recordedAt ?? null,
      latestAt: transitions.at(-1)?.recordedAt ?? null,
      support: globalSupport,
    },
    model: {
      id: LIMIT_FORECAST_LAB_MODEL,
      globalRate: pooled.globalRate,
      poolingStrength: LIMIT_FORECAST_POOLING_STRENGTH,
      supportGates: LIMIT_FORECAST_SUPPORT_GATES,
      candidates: [
        {
          id: 'global-base-rate-v0',
          label: 'Global transition baseline',
          scope: 'global',
          forecastEligible: false,
          score: scoreWalkForward(transitions, 'global'),
        },
        {
          id: 'pooled-book-beta-binomial-v0',
          label: 'Pooled sportsbook transition baseline',
          scope: 'sportsbook-partial-pooling',
          forecastEligible: false,
          score: scoreWalkForward(transitions, 'pooled'),
        },
      ],
      books: pooled.books,
    },
    evidence,
    promotion: {
      eligible: false,
      blockers: [
        ...(researchOnlySnapshots > 0
          ? ['Research, fixture, or unclassified snapshots are diagnostics-only']
          : []),
        ...(evidence.issues === 0 ? ['No immutable issued-at forecast rows'] : []),
        ...(evidence.matured === 0 ? ['No matured 48-hour outcome windows'] : []),
        ...(evidence.negatives === 0 ? ['No matured no-raise outcomes'] : []),
        'No leakage-safe rolling-origin calibration set',
      ],
      nextModel: 'regularized-global-logistic-with-pooled-book-effects',
    },
    links: {
      lab: '/portal/limits-lab/',
      limits: '/portal/limits/#section:prediction',
      artifact: '/registry/limit-forecast-lab.json',
      glossary: '/portal/glossary/#glossary:ops.limits.prediction',
    },
  } as const;
}
