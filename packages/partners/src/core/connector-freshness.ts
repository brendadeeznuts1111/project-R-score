import type { ConnectorSnapshot } from './types.ts';

export const PARTNER_CONNECTOR_FRESHNESS_POLICY = {
  staleAcceptableSeconds: 300,
  maxLastKnownGoodAgeSeconds: 86_400,
  maxFutureSkewSeconds: 30,
} as const;

export type ConnectorFreshnessPolicy = {
  staleAcceptableSeconds: number;
  maxLastKnownGoodAgeSeconds: number;
  maxFutureSkewSeconds: number;
};

export type ConnectorObservation = {
  observedAt: string;
  inputRef: string;
  snapshotRef?: string;
};

export type ConnectorFreshnessDecision =
  | {
      disposition: 'use_current' | 'use_last_known_good';
      snapshot: ConnectorSnapshot;
    }
  | {
      disposition: 'mark_unavailable';
      snapshot: ConnectorSnapshot;
    }
  | {
      disposition: 'fail_bake';
      reasonCode: 'required_source_unavailable' | 'required_source_expired';
    };

export type EvaluateConnectorFreshnessInput = {
  asOf: string;
  expectedInputRef: string;
  required: boolean;
  current?: ConnectorObservation;
  lastKnownGood?: ConnectorObservation;
  policy?: ConnectorFreshnessPolicy;
};

function canonicalTime(value: string, label: string): number {
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${label} must be a canonical UTC ISO timestamp`);
  }
  return Date.parse(value);
}

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
}

function validatePolicy(policy: ConnectorFreshnessPolicy): void {
  positiveInteger(policy.staleAcceptableSeconds, 'staleAcceptableSeconds');
  positiveInteger(policy.maxLastKnownGoodAgeSeconds, 'maxLastKnownGoodAgeSeconds');
  if (!Number.isSafeInteger(policy.maxFutureSkewSeconds) || policy.maxFutureSkewSeconds < 0) {
    throw new TypeError('maxFutureSkewSeconds must be a non-negative safe integer');
  }
  if (policy.maxLastKnownGoodAgeSeconds < policy.staleAcceptableSeconds) {
    throw new TypeError(
      'maxLastKnownGoodAgeSeconds must be greater than or equal to staleAcceptableSeconds'
    );
  }
}

function observationAgeSeconds(
  observation: ConnectorObservation,
  asOfMs: number,
  expectedInputRef: string,
  policy: ConnectorFreshnessPolicy,
  label: string
): number {
  if (observation.inputRef !== expectedInputRef) {
    throw new TypeError(`${label}.inputRef must match the configured connector input`);
  }
  if (label === 'lastKnownGood' && !observation.snapshotRef) {
    throw new TypeError('lastKnownGood.snapshotRef is required');
  }
  const observedAtMs = canonicalTime(observation.observedAt, `${label}.observedAt`);
  const futureMs = observedAtMs - asOfMs;
  if (futureMs > policy.maxFutureSkewSeconds * 1000) {
    throw new TypeError(`${label}.observedAt exceeds the allowed future clock skew`);
  }
  return Math.max(0, Math.ceil((asOfMs - observedAtMs) / 1000));
}

function usableSnapshot(
  observation: ConnectorObservation,
  ageSeconds: number,
  sourceMode: 'current' | 'last_known_good',
  policy: ConnectorFreshnessPolicy
): ConnectorSnapshot {
  const currentFresh = sourceMode === 'current' && ageSeconds <= policy.staleAcceptableSeconds;
  return {
    dataStatus: currentFresh ? 'ok' : 'stale',
    sourceMode,
    reasonCode: currentFresh
      ? 'current_fresh'
      : sourceMode === 'current'
        ? 'current_stale'
        : 'last_known_good',
    observedAt: observation.observedAt,
    ageSeconds,
    inputRef: observation.inputRef,
    ...(observation.snapshotRef ? { snapshotRef: observation.snapshotRef } : {}),
  };
}

/**
 * Pure bake-time freshness decision. It never performs I/O or owns the circuit
 * breaker; connectors supply current/LKG observations after their fetch attempt.
 */
export function evaluateConnectorFreshness(
  input: EvaluateConnectorFreshnessInput
): ConnectorFreshnessDecision {
  const policy = input.policy ?? PARTNER_CONNECTOR_FRESHNESS_POLICY;
  validatePolicy(policy);
  const asOfMs = canonicalTime(input.asOf, 'asOf');
  const maxUsableAge = input.required
    ? policy.staleAcceptableSeconds
    : policy.maxLastKnownGoodAgeSeconds;

  if (input.current) {
    const ageSeconds = observationAgeSeconds(
      input.current,
      asOfMs,
      input.expectedInputRef,
      policy,
      'current'
    );
    if (ageSeconds <= maxUsableAge) {
      return {
        disposition: 'use_current',
        snapshot: usableSnapshot(input.current, ageSeconds, 'current', policy),
      };
    }
  }

  if (input.lastKnownGood) {
    const ageSeconds = observationAgeSeconds(
      input.lastKnownGood,
      asOfMs,
      input.expectedInputRef,
      policy,
      'lastKnownGood'
    );
    if (ageSeconds <= maxUsableAge) {
      return {
        disposition: 'use_last_known_good',
        snapshot: usableSnapshot(input.lastKnownGood, ageSeconds, 'last_known_good', policy),
      };
    }
  }

  if (input.required) {
    return {
      disposition: 'fail_bake',
      reasonCode:
        input.current || input.lastKnownGood
          ? 'required_source_expired'
          : 'required_source_unavailable',
    };
  }
  return {
    disposition: 'mark_unavailable',
    snapshot: {
      dataStatus: 'unavailable',
      sourceMode: 'none',
      reasonCode: 'optional_source_unavailable',
      inputRef: input.expectedInputRef,
    },
  };
}
