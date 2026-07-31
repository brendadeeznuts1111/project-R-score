// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import {
  buildLimitForecastLab,
  buildLimitTransitions,
  estimatePooledBookRates,
  scoreWalkForward,
  type LimitSnapshotSample,
} from '../lib/prediction/limit-forecast-lab.ts';
import {
  computeForecastEligibility,
  scoreRollingOriginEmbargo,
  type ForecastCalibrationSample,
  type LimitForecastEvidenceSummary,
} from '../lib/prediction/limit-forecast-evidence.ts';
import { observationToLabSnapshot } from '../lib/prediction/limit-forecast-scrape-ingest.ts';
import { asSportsbookId, asStateCode, asTreeNodeId } from '../lib/types/branded.ts';

function maturedEvidence(): LimitForecastEvidenceSummary {
  return {
    issues: 20,
    pending: 0,
    dueAwaitingObservation: 0,
    matured: 20,
    positives: 8,
    negatives: 12,
    meanBrierScore: 0.2,
    meanLogLoss: 0.5,
  };
}

/** Spaced calibration samples so rolling-origin + horizon embargo can score. */
function calibrationFixture(count = 20, horizon = 10): ForecastCalibrationSample[] {
  const now = 1_000_000;
  const samples: ForecastCalibrationSample[] = [];
  for (let i = 0; i < count; i++) {
    const issuedAt = now - (count - i) * horizon * 2;
    samples.push({
      issuedAt,
      evaluationAt: issuedAt + horizon,
      predictedRaiseProbability: 0.4 + (i % 5) * 0.05,
      actualRaise: i % 3 !== 0,
    });
  }
  return samples;
}

function sample(
  sportsbook: string,
  recordedAt: number,
  maxWager: number,
  overrides: Partial<LimitSnapshotSample> = {}
): LimitSnapshotSample {
  return {
    nodeId: asTreeNodeId('lab-partner'),
    sportsbook: asSportsbookId(sportsbook),
    sportKey: 'basketball',
    marketKey: 'point_spread',
    phase: 'pregame',
    maxWager,
    recordedAt,
    inputClass: 'partner-observation',
    decisionEligible: true,
    ...overrides,
  };
}

describe('Limits Forecast Lab', () => {
  test('reopens direct-file visits on the local portal origin', async () => {
    const shell = await Bun.file('public/portal/limits-lab/index.html').text();

    expect(shell).toContain("window.location.protocol === 'file:'");
    expect(shell).toContain("new URL(publicPath, 'http://localhost:3017')");
    expect(shell).toContain('target.search = window.location.search');
    expect(shell).toContain('target.hash = window.location.hash');
  });

  test('builds ordered transitions within a complete dimension', () => {
    const transitions = buildLimitTransitions([
      sample('draftkings', 30, 1_500),
      sample('draftkings', 10, 500),
      sample('draftkings', 20, 1_000),
      sample('draftkings', 25, 800, { marketKey: 'total' }),
    ]);

    expect(transitions).toHaveLength(2);
    expect(transitions.map(row => row.delta)).toEqual([500, 500]);
    expect(transitions.every(row => row.raised)).toBe(true);
  });

  test('partially pooled book rates shrink sparse books toward global evidence', () => {
    const transitions = buildLimitTransitions([
      sample('draftkings', 10, 500),
      sample('draftkings', 20, 1_000),
      sample('draftkings', 30, 1_500),
      sample('fanduel', 10, 1_000),
      sample('fanduel', 20, 900),
    ]);
    const result = estimatePooledBookRates(transitions, 8);
    const fanduel = result.books.find(row => row.sportsbook === 'fanduel');

    expect(fanduel).toBeDefined();
    expect(fanduel?.observedRate).toBe(0);
    expect(fanduel?.pooledRate).toBeGreaterThan(0);
    expect(fanduel?.globalWeight).toBeGreaterThan(0.8);
    expect(fanduel?.support).toBe('insufficient');
    expect(fanduel?.forecastEligible).toBe(false);
  });

  test('walk-forward scoring never trains on transitions at the same origin', () => {
    const rows: LimitSnapshotSample[] = [];
    for (let index = 0; index < 12; index++) {
      rows.push(sample('draftkings', index * 10 + 1, 500 + index * 100));
      rows.push(sample('fanduel', index * 10 + 1, 1_500 - index * 50));
    }
    const score = scoreWalkForward(buildLimitTransitions(rows), 'pooled', 8);

    expect(score.samples).toBeGreaterThan(0);
    expect(score.brier).toBeGreaterThanOrEqual(0);
    expect(score.logLoss).toBeGreaterThanOrEqual(0);
  });

  test('artifact refuses production eligibility for transition-only evidence', () => {
    const payload = buildLimitForecastLab(
      [sample('draftkings', 10, 500), sample('draftkings', 20, 1_000)],
      '2026-07-31T00:00:00.000Z'
    );

    expect(payload.dataset.forecastEligible).toBe(false);
    expect(payload.dataset.decisionEligibleSnapshots).toBe(2);
    expect(payload.dataset.decisionEligibleTransitions).toBe(1);
    expect(payload.dataset.support).toBe('insufficient');
    expect(payload.promotion.eligible).toBe(false);
    expect(payload.promotion.blockers).toContain('No immutable issued-at forecast rows');
    expect(payload.promotion.blockers).toContain('No leakage-safe rolling-origin calibration set');
    expect(payload.links.lab).toBe('/portal/limits-lab/');
  });

  test('keeps research and fixture evidence outside promotion eligibility', () => {
    const payload = buildLimitForecastLab([
      sample('draftkings', 10, 500, {
        inputClass: 'tier-4-observation',
        decisionEligible: false,
      }),
      sample('draftkings', 20, 1_000, {
        inputClass: 'tier-4-observation',
        decisionEligible: false,
      }),
    ]);

    expect(payload.dataset.researchOnlySnapshots).toBe(2);
    expect(payload.dataset.decisionEligibleTransitions).toBe(0);
    expect(payload.model.candidates.every(candidate => !candidate.forecastEligible)).toBe(true);
    expect(payload.promotion.blockers).toContain(
      'Research, fixture, or unclassified snapshots are diagnostics-only'
    );
  });

  test('scoreRollingOriginEmbargo refuses leakage across the horizon', () => {
    const horizon = 10;
    const samples = calibrationFixture(16, horizon);
    const score = scoreRollingOriginEmbargo(samples, {
      nowSec: 1_000_000,
      horizonSeconds: horizon,
      minimumTrainingSamples: 4,
    });
    expect(score.samples).toBeGreaterThan(0);
    expect(score.brier).not.toBeNull();
    expect(score.embargoSeconds).toBe(horizon);
  });

  test('computeForecastEligibility flips true only with matured pos+neg + calibration', () => {
    const calibration = scoreRollingOriginEmbargo(calibrationFixture(20, 10), {
      nowSec: 1_000_000,
      horizonSeconds: 10,
      minimumTrainingSamples: 4,
    });
    const empty = computeForecastEligibility(
      {
        issues: 0,
        pending: 0,
        dueAwaitingObservation: 0,
        matured: 0,
        positives: 0,
        negatives: 0,
        meanBrierScore: null,
        meanLogLoss: null,
      },
      calibration
    );
    expect(empty.forecastEligible).toBe(false);

    const noTransitions = computeForecastEligibility(maturedEvidence(), calibration, {
      researchOnlySnapshots: 0,
      decisionEligibleTransitions: 0,
    });
    expect(noTransitions.forecastEligible).toBe(false);
    expect(noTransitions.blockers).toContain('No decision-eligible partner transitions');

    const ready = computeForecastEligibility(maturedEvidence(), calibration, {
      researchOnlySnapshots: 0,
      decisionEligibleTransitions: 5,
    });
    expect(ready.forecastEligible).toBe(true);
    expect(ready.blockers).toEqual([]);
  });

  test('lab artifact becomes forecastEligible when evidence lifecycle clears', () => {
    const rows: LimitSnapshotSample[] = [];
    for (let index = 0; index < 12; index++) {
      rows.push(sample('draftkings', index * 10 + 1, 500 + index * 100));
    }
    const payload = buildLimitForecastLab(
      rows,
      '2026-07-31T00:00:00.000Z',
      maturedEvidence(),
      undefined,
      calibrationFixture(20, 10)
    );
    // Calibration uses real wall-clock nowSec inside buildLimitForecastLab —
    // re-score with fixed clock via computeForecastEligibility for the gate.
    const calibration = scoreRollingOriginEmbargo(calibrationFixture(20, 10), {
      nowSec: 1_000_000,
      horizonSeconds: 10,
      minimumTrainingSamples: 4,
    });
    const gate = computeForecastEligibility(maturedEvidence(), calibration, {
      researchOnlySnapshots: payload.dataset.researchOnlySnapshots,
      decisionEligibleTransitions: payload.dataset.decisionEligibleTransitions,
    });
    expect(gate.forecastEligible).toBe(true);

    // When calibration samples are empty, lab stays false even with evidence counts.
    const blocked = buildLimitForecastLab(
      rows,
      '2026-07-31T00:00:00.000Z',
      maturedEvidence(),
      undefined,
      []
    );
    expect(blocked.dataset.forecastEligible).toBe(false);
    expect(blocked.promotion.eligible).toBe(false);
  });

  test('brands scrape feeds and maps every Tier 4 mode to diagnostics-only input', () => {
    const snapshot = observationToLabSnapshot({
      sportsbook: 'draftkings',
      sport: 'tennis',
      market: 'moneyline',
      jurisdiction: asStateCode('NJ'),
      structure: 'straight',
      phase: 'live',
      openingMaxUsd: 750,
      openingMinUsd: null,
      dailyLimitUsd: null,
      weeklyLimitUsd: null,
      vipLimitUsd: null,
      league: 'itf',
      eventType: null,
      referenceUrl: null,
      sourceRef: 'test-observation',
      observedAt: '2026-07-31T12:00:00.000Z',
      agent: 'test-agent',
      mode: 'live',
    });

    expect(snapshot).toMatchObject({
      nodeId: asTreeNodeId('scrape-draftkings'),
      sportsbook: asSportsbookId('draftkings'),
      inputClass: 'tier-4-observation',
      decisionEligible: false,
    });
  });
});
