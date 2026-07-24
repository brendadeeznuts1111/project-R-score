// @see https://bun.com/docs/runtime/utils — FactorLevel helpers
/**
 * Sequential phase presets for practical factorials (1–2 new factors per phase).
 *
 * Phase 1: routing → Phase 2: +cut → Phase 3: +stake → Phase 4: +timing
 */
import { fullRunCount, type Factor } from './design.ts';

export type ExperimentProtocol = 'between' | 'switchback';

export type PhasePreset = {
  phase: 1 | 2 | 3 | 4;
  name: string;
  factors: Factor[];
  fractionDenom: 1;
  metricName: 'win_rate';
  /** Suggested wall-clock length before deciding. */
  recommendedWeeks: number;
  /** Default protocol for this phase (caller may override). */
  protocol: ExperimentProtocol;
};

const ROUTING: Factor = {
  name: 'routing',
  levels: ['static', 'dynamic'],
  scope: 'partner',
};

const CUT: Factor = {
  name: 'cut',
  levels: [0.1, 0.15],
  scope: 'partner',
};

const STAKE: Factor = {
  name: 'stake',
  levels: ['fixed', 'kelly'],
  scope: 'partner',
};

const TIMING: Factor = {
  name: 'timing',
  levels: ['immediate', 'batched'],
  scope: 'partner',
};

/** Canonical sequential phases (full factorial within each phase). */
export const EXPERIMENT_PHASES: readonly PhasePreset[] = [
  {
    phase: 1,
    name: 'Phase 1: Routing',
    factors: [ROUTING],
    fractionDenom: 1,
    metricName: 'win_rate',
    recommendedWeeks: 8,
    protocol: 'switchback',
  },
  {
    phase: 2,
    name: 'Phase 2: Routing × Cut',
    factors: [ROUTING, CUT],
    fractionDenom: 1,
    metricName: 'win_rate',
    recommendedWeeks: 8,
    protocol: 'switchback',
  },
  {
    phase: 3,
    name: 'Phase 3: Routing × Cut × Stake',
    factors: [ROUTING, CUT, STAKE],
    fractionDenom: 1,
    metricName: 'win_rate',
    recommendedWeeks: 8,
    protocol: 'switchback',
  },
  {
    phase: 4,
    name: 'Phase 4: Routing × Cut × Stake × Timing',
    factors: [ROUTING, CUT, STAKE, TIMING],
    fractionDenom: 1,
    metricName: 'win_rate',
    recommendedWeeks: 8,
    protocol: 'switchback',
  },
] as const;

export function getPhase(phase: number): PhasePreset {
  if (!Number.isInteger(phase) || phase < 1 || phase > 4) {
    throw new Error(`Phase must be 1..4 (got ${phase})`);
  }
  return EXPERIMENT_PHASES[phase - 1]!;
}

/** Expected full factorial cell count for a phase (2, 4, 8, 16). */
export function phaseDesignSize(phase: number): number {
  return fullRunCount(getPhase(phase).factors);
}
