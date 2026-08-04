/**
 * Boundary parser for limit-change / raise rows (lifecycle + derivation fields).
 *
 * @see docs/WIRE_BOUNDARY.md
 * @see docs/harness/tenants/partner-limits.md#e3-wire-contract-pending
 */

export const LIMIT_LIFECYCLE_STATES = ['pending', 'active', 'expired', 'superseded'] as const;

export type LimitLifecycleState = (typeof LIMIT_LIFECYCLE_STATES)[number];

export type ParsedLimitRowWire = {
  lifecycleState?: LimitLifecycleState;
  /** Glossary concept keys (inventory); not a branded ConceptId yet. */
  derivesFrom?: readonly string[]; // brand-ok — glossary concept key
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLimitLifecycleState(value: string): value is LimitLifecycleState {
  return (LIMIT_LIFECYCLE_STATES as readonly string[]).includes(value);
}

/**
 * Parse optional E3 wire fields from a raw API / fixture row.
 * Missing fields → omitted (`undefined`). Invalid present values → throw.
 */
export function parseLimitRowWire(input: unknown): ParsedLimitRowWire {
  if (!isRecord(input)) {
    throw new Error('Invalid limit row: expected object');
  }

  const result: ParsedLimitRowWire = {};

  if ('lifecycleState' in input) {
    const val = input.lifecycleState;
    if (val === undefined) {
      // present key with undefined — treat as absent
    } else if (typeof val === 'string' && isLimitLifecycleState(val)) {
      result.lifecycleState = val;
    } else {
      throw new Error(`Invalid lifecycleState: ${String(val)}`);
    }
  }

  if ('derivesFrom' in input) {
    const val = input.derivesFrom;
    if (val === undefined) {
      // absent
    } else if (!Array.isArray(val)) {
      throw new Error('derivesFrom must be an array');
    } else if (!val.every(v => typeof v === 'string')) {
      throw new Error('derivesFrom must be an array of strings');
    } else {
      result.derivesFrom = val as string[]; // brand-ok — glossary concept key
    }
  }

  return result;
}
