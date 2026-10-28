import type { FormatOperation } from './data-format-manifest.ts';

type ApiObject = Record<string, unknown>;

export type TimedProof = {
  ok: boolean;
  durationNs: number;
  durationMs: number;
  outputBytes?: number;
  outputSha256?: string;
  errorSha256?: string;
  error?: string;
};

export type NegativeProof = TimedProof & {
  behavior: 'threw' | 'error-result' | 'accepted';
};

export type RoundTripProof = TimedProof & {
  beforeSha256?: string;
  afterSha256?: string;
};

export type FormatBehaviorProof = {
  ok: boolean;
  positive: Record<string, TimedProof>;
  negative: Record<string, NegativeProof>;
  roundTrip: RoundTripProof | null;
};

export type JsonlParseChunkResult = {
  values: unknown[];
  read: number;
  done: boolean;
  error: SyntaxError | null;
};

export type JsonlChunkApi = {
  parseChunk(input: string): JsonlParseChunkResult;
};

/**
 * Compose JSONL chunks without losing the unconsumed remainder. A complete
 * stream must end on a consumed value boundary; malformed and truncated final
 * input fail closed.
 *
 * @see https://bun.com/reference/bun/JSONL
 */
export function parseCompleteJsonlChunks(api: JsonlChunkApi, chunks: Iterable<string>): unknown[] {
  const values: unknown[] = [];
  let remainder = '';
  for (const chunk of chunks) {
    remainder += chunk;
    while (remainder.length > 0) {
      const result = api.parseChunk(remainder);
      if (!Number.isSafeInteger(result.read) || result.read < 0 || result.read > remainder.length) {
        throw new RangeError(`JSONL parseChunk returned invalid read=${result.read}`);
      }
      values.push(...result.values);
      if (result.error) throw result.error;
      if (result.done) {
        remainder = '';
        break;
      }
      if (result.read === 0) break;
      remainder = remainder.slice(result.read);
    }
  }
  if (remainder.length > 0) {
    const final = api.parseChunk(remainder);
    if (!Number.isSafeInteger(final.read) || final.read < 0 || final.read > remainder.length) {
      throw new RangeError(`JSONL parseChunk returned invalid read=${final.read}`);
    }
    values.push(...final.values);
    if (final.error) throw final.error;
    if (!final.done) throw new SyntaxError('incomplete JSONL stream');
    remainder = '';
  }
  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sha256(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex');
}

function parseStableValue(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(parseStableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, parseStableValue(value[key])])
  );
}

function parseProofText(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(parseStableValue(value)) ?? String(value);
}

function elapsed(startedNs: number): Pick<TimedProof, 'durationNs' | 'durationMs'> {
  const durationNs = Bun.nanoseconds() - startedNs;
  return { durationNs, durationMs: durationNs / 1_000_000 };
}

function parseOutputProof(value: unknown, startedNs: number, maxOutputBytes: number): TimedProof {
  const timing = elapsed(startedNs);
  const text = parseProofText(value);
  const outputBytes = new TextEncoder().encode(text).byteLength;
  if (outputBytes > maxOutputBytes) {
    return { ok: false, ...timing, outputBytes, error: `output exceeds ${maxOutputBytes} bytes` };
  }
  return { ok: true, ...timing, outputBytes, outputSha256: sha256(text) };
}

function parseErrorProof(error: unknown, startedNs: number): TimedProof {
  const text = error instanceof Error ? `${error.name}:${error.message}` : String(error);
  return { ok: false, ...elapsed(startedNs), errorSha256: sha256(text), error: 'operation threw' };
}

function runPositive(
  api: ApiObject,
  operations: FormatOperation[],
  fixture: string,
  maxOutputBytes: number
): { proofs: Record<string, TimedProof>; parsed: unknown; serialized: string | null } {
  const proofs: Record<string, TimedProof> = {};
  let parsed: unknown;
  let serialized: string | null = null;
  for (const operation of operations) {
    const startedNs = Bun.nanoseconds();
    try {
      if (operation === 'stringify' && !proofs.parse?.ok) {
        proofs.stringify = { ok: false, ...elapsed(startedNs), error: 'parse dependency failed' };
        continue;
      }
      const output = (api[operation] as (value: unknown) => unknown).call(
        api,
        operation === 'stringify' ? parsed : fixture
      );
      if (operation === 'parse') parsed = output;
      if (operation === 'stringify') serialized = typeof output === 'string' ? output : null;
      proofs[operation] = parseOutputProof(output, startedNs, maxOutputBytes);
    } catch (error) {
      proofs[operation] = parseErrorProof(error, startedNs);
    }
  }
  return { proofs, parsed, serialized };
}

function runNegative(
  api: ApiObject,
  operations: FormatOperation[],
  fixture: string
): Record<string, NegativeProof> {
  const proofs: Record<string, NegativeProof> = {};
  for (const operation of operations.filter(value => value !== 'stringify')) {
    const startedNs = Bun.nanoseconds();
    try {
      const output = (api[operation] as (value: string) => unknown).call(api, fixture);
      const rejected = isRecord(output) && output.error !== null && output.error !== undefined;
      const errorText = rejected ? parseProofText(output.error) : '';
      proofs[operation] = {
        ok: rejected,
        ...elapsed(startedNs),
        behavior: rejected ? 'error-result' : 'accepted',
        ...(rejected ? { errorSha256: sha256(errorText) } : { error: 'invalid fixture accepted' }),
      };
    } catch (error) {
      const text = error instanceof Error ? `${error.name}:${error.message}` : String(error);
      proofs[operation] = {
        ok: true,
        ...elapsed(startedNs),
        behavior: 'threw',
        errorSha256: sha256(text),
      };
    }
  }
  return proofs;
}

function parseRoundTrip(
  api: ApiObject,
  parsed: unknown,
  serialized: string | null,
  positive: Record<string, TimedProof>,
  maxOutputBytes: number
): RoundTripProof | null {
  if (!('parse' in positive) || !('stringify' in positive)) return null;
  const startedNs = Bun.nanoseconds();
  if (!positive.parse?.ok || !positive.stringify?.ok || serialized === null) {
    return { ok: false, ...elapsed(startedNs), error: 'positive parse/stringify proof failed' };
  }
  try {
    const reparsed = (api.parse as (value: string) => unknown).call(api, serialized);
    const before = parseProofText(parsed);
    const after = parseProofText(reparsed);
    const outputBytes = new TextEncoder().encode(after).byteLength;
    if (outputBytes > maxOutputBytes) {
      return {
        ok: false,
        ...elapsed(startedNs),
        outputBytes,
        error: `output exceeds ${maxOutputBytes} bytes`,
      };
    }
    const beforeSha256 = sha256(before);
    const afterSha256 = sha256(after);
    return {
      ok: beforeSha256 === afterSha256,
      ...elapsed(startedNs),
      outputBytes,
      beforeSha256,
      afterSha256,
      ...(beforeSha256 === afterSha256 ? {} : { error: 'round-trip semantic mismatch' }),
    };
  } catch (error) {
    return parseErrorProof(error, startedNs);
  }
}

export function runFormatBehaviorProof(
  api: ApiObject,
  operations: FormatOperation[],
  fixture: string,
  negativeFixture: string,
  maxOutputBytes: number
): FormatBehaviorProof {
  const positive = runPositive(api, operations, fixture, maxOutputBytes);
  const negative = runNegative(api, operations, negativeFixture);
  const roundTrip = parseRoundTrip(
    api,
    positive.parsed,
    positive.serialized,
    positive.proofs,
    maxOutputBytes
  );
  const all = [
    ...Object.values(positive.proofs),
    ...Object.values(negative),
    ...(roundTrip ? [roundTrip] : []),
  ];
  return { ok: all.every(proof => proof.ok), positive: positive.proofs, negative, roundTrip };
}
