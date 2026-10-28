// @see https://bun.com/docs/runtime/utils#bun-inspect
// @see https://bun.com/docs/runtime/utils#bun-deepequals
/** Small deterministic generated-property runner with reproducible shrinking. */

export type GeneratedPropertyRandom = {
  float(): number;
  int(minInclusive: number, maxInclusive: number): number;
  boolean(): boolean;
  pick<T>(values: readonly T[]): T;
};

export type GeneratedPropertyFailure<T> = {
  seed: number;
  caseIndex: number;
  counterexample: T;
  error: string;
  shrinkSteps: number;
};

export type GeneratedPropertyResult<T> = {
  id: string;
  seed: number;
  cases: number;
  passed: boolean;
  failure?: GeneratedPropertyFailure<T>;
};

export type GeneratedPropertyOptions<T> = {
  id: string;
  seed: number;
  cases: number;
  generate(random: GeneratedPropertyRandom, caseIndex: number): T;
  check(value: T, caseIndex: number): boolean | void | Promise<boolean | void>;
  shrink?(value: T): Iterable<T>;
  maxShrinkSteps?: number;
};

function normalizeSeed(seed: number): number {
  if (!Number.isSafeInteger(seed)) throw new TypeError('property seed must be a safe integer');
  return seed >>> 0;
}

export function createGeneratedPropertyRandom(seed: number): GeneratedPropertyRandom {
  let state = normalizeSeed(seed);
  const float = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    float,
    int(minInclusive, maxInclusive) {
      if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxInclusive)) {
        throw new TypeError('property integer bounds must be safe integers');
      }
      if (maxInclusive < minInclusive) throw new RangeError('property integer bounds are reversed');
      return minInclusive + Math.floor(float() * (maxInclusive - minInclusive + 1));
    },
    boolean: () => float() < 0.5,
    pick<T>(values: readonly T[]): T {
      if (values.length === 0) throw new RangeError('cannot pick from an empty property domain');
      return values[Math.floor(float() * values.length)]!;
    },
  };
}

async function failureMessage<T>(
  check: GeneratedPropertyOptions<T>['check'],
  value: T,
  caseIndex: number
): Promise<string | null> {
  try {
    const result = await check(value, caseIndex);
    return result === false ? 'property returned false' : null;
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

export async function runGeneratedProperty<T>(
  options: GeneratedPropertyOptions<T>
): Promise<GeneratedPropertyResult<T>> {
  if (!options.id.trim()) throw new TypeError('property id must be non-empty');
  if (!Number.isSafeInteger(options.cases) || options.cases <= 0) {
    throw new RangeError('property cases must be a positive safe integer');
  }
  const seed = normalizeSeed(options.seed);
  const random = createGeneratedPropertyRandom(seed);
  for (let caseIndex = 0; caseIndex < options.cases; caseIndex++) {
    let counterexample = options.generate(random, caseIndex);
    let error = await failureMessage(options.check, counterexample, caseIndex);
    if (error === null) continue;

    let shrinkSteps = 0;
    const maxShrinkSteps = options.maxShrinkSteps ?? 100;
    if (options.shrink) {
      while (shrinkSteps < maxShrinkSteps) {
        let smallerFailure: { value: T; error: string } | null = null;
        for (const candidate of options.shrink(counterexample)) {
          if (Bun.deepEquals(candidate, counterexample, true)) continue;
          const candidateError = await failureMessage(options.check, candidate, caseIndex);
          if (candidateError !== null) {
            smallerFailure = { value: candidate, error: candidateError };
            break;
          }
        }
        if (smallerFailure === null) break;
        counterexample = smallerFailure.value;
        error = smallerFailure.error;
        shrinkSteps++;
      }
    }
    return {
      id: options.id,
      seed,
      cases: options.cases,
      passed: false,
      failure: { seed, caseIndex, counterexample, error, shrinkSteps },
    };
  }
  return { id: options.id, seed, cases: options.cases, passed: true };
}

export async function assertGeneratedProperty<T>(
  options: GeneratedPropertyOptions<T>
): Promise<void> {
  const result = await runGeneratedProperty(options);
  if (result.passed) return;
  const failure = result.failure!;
  throw new Error(
    `${result.id} failed (seed=${failure.seed}, case=${failure.caseIndex}, shrinks=${failure.shrinkSteps})\n${failure.error}\ncounterexample=${Bun.inspect(failure.counterexample, { depth: 8, sorted: true })}`
  );
}
