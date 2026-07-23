/**
 * Operational guardrails for partner-policy experiments.
 *
 * These are launch rules, not statistical proof. They keep system-wide
 * decisions and underpowered fractional designs out of the per-partner
 * assignment path.
 */
import type { Factor } from './design.ts';

export type FactorScope = 'partner' | 'hybrid' | 'system';

export type ExperimentPolicy = {
  /** Smallest acceptable regular fractional-design resolution. */
  minimumResolution: number;
  /** Required active partners for every design cell before activation. */
  minPartnersPerVariant: number;
  /** Minimum planned exposure; analysis remains descriptive before this age. */
  minDurationDays: number;
  /** Explicitly permit a non-regular subset whose interactions are aliased. */
  allowExploratorySubset: boolean;
};

export const DEFAULT_EXPERIMENT_POLICY: ExperimentPolicy = {
  minimumResolution: 4,
  minPartnersPerVariant: 10,
  minDurationDays: 28,
  allowExploratorySubset: false,
};

const SYSTEM_FACTOR_NAMES = new Set([
  'automation_frequency',
  'automationfrequency',
  'infrastructure',
  'model',
  'model_type',
  'modeltype',
  'prediction_model',
  'predictionmodel',
  'reconciliation_mode',
  'reconciliationmode',
]);

function normalizedFactorName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * System factors affect every partner and must be evaluated through a
 * backtest, shadow/challenger evaluation, or an operations change—not a
 * partner-level factorial assignment.
 */
export function classifyFactor(factor: Pick<Factor, 'name' | 'scope'>): FactorScope {
  if (factor.scope) return factor.scope;
  return SYSTEM_FACTOR_NAMES.has(normalizedFactorName(factor.name)) ? 'system' : 'partner';
}

export function normalizeExperimentPolicy(
  input: Partial<ExperimentPolicy> | undefined
): ExperimentPolicy {
  const policy = { ...DEFAULT_EXPERIMENT_POLICY, ...input };
  if (!Number.isInteger(policy.minimumResolution) || policy.minimumResolution < 2) {
    throw new Error('minimumResolution must be an integer ≥ 2');
  }
  if (!Number.isInteger(policy.minPartnersPerVariant) || policy.minPartnersPerVariant < 1) {
    throw new Error('minPartnersPerVariant must be an integer ≥ 1');
  }
  if (!Number.isInteger(policy.minDurationDays) || policy.minDurationDays < 0) {
    throw new Error('minDurationDays must be an integer ≥ 0');
  }
  return policy;
}

export function factorLaunchErrors(factors: Factor[]): string[] {
  return factors.flatMap(f => {
    const scope = classifyFactor(f);
    if (scope === 'system') {
      return [
        `Factor "${f.name}" is system-scoped and cannot be randomized per partner. ` +
          'Evaluate it with backtest/shadow or champion-challenger controls.',
      ];
    }
    return [];
  });
}
