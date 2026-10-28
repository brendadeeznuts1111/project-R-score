import { describe, expect, test } from 'bun:test';
import {
  canonicalJsonDigests,
  canonicalJsonText,
  parseCanonicalJsonValue,
} from '../lib/quality/canonical-json.ts';
import {
  createGeneratedPropertyRandom,
  runGeneratedProperty,
} from '../lib/quality/property.ts';
import { summarizeQualityChecks, type QualityCheck } from '../lib/quality/result.ts';
import { semanticJsonDiff } from '../lib/quality/semantic-diff.ts';

function check(overrides: Partial<QualityCheck> = {}): QualityCheck {
  return {
    id: 'technical.shape',
    owner: 'tests/quality-primitives.test.ts',
    layer: 'technical',
    severity: 'error',
    passed: true,
    changed: false,
    semanticDigest: 'abc',
    snapshotApproval: 'eligible',
    ...overrides,
  };
}

describe('quality verdict lattice', () => {
  test('hard failures outrank review, drift, and warnings', () => {
    const summary = summarizeQualityChecks([
      check({ id: 'hard', passed: false }),
      check({ id: 'review', layer: 'policy', changed: true, snapshotApproval: 'manual-only' }),
      check({ id: 'warning', passed: false, severity: 'warning' }),
    ]);
    expect(summary.verdict).toBe('failed');
    expect(summary).toMatchObject({ total: 3, passed: 1, failed: 2, changed: 1 });
  });

  test('protected drift requires review and eligible drift becomes a candidate', () => {
    expect(
      summarizeQualityChecks([
        check({ layer: 'domain', changed: true, snapshotApproval: 'manual-only' }),
      ]).verdict
    ).toBe('review-required');
    expect(summarizeQualityChecks([check({ changed: true })]).verdict).toBe('update-candidate');
    expect(
      summarizeQualityChecks([check({ passed: false, severity: 'warning' })]).verdict
    ).toBe('passed-with-warnings');
    expect(summarizeQualityChecks([check()]).verdict).toBe('passed');
  });

  test('duplicate ids fail closed', () => {
    expect(() => summarizeQualityChecks([check(), check()])).toThrow('duplicate quality check id');
  });
});

describe('deterministic generated properties', () => {
  test('same seed produces the same sequence', () => {
    const first = createGeneratedPropertyRandom(0x5eed);
    const second = createGeneratedPropertyRandom(0x5eed);
    const sequence = (random: ReturnType<typeof createGeneratedPropertyRandom>) =>
      Array.from({ length: 12 }, () => random.int(-100, 100));
    expect(sequence(first)).toEqual(sequence(second));
  });

  test('reports seed, case, and a shrunken counterexample', async () => {
    const result = await runGeneratedProperty({
      id: 'quality.shrink-proof',
      seed: 42,
      cases: 5,
      generate: () => 100,
      check: value => value < 10,
      shrink: value => [Math.floor(value / 2), 10],
    });
    expect(result.passed).toBe(false);
    expect(result.failure).toMatchObject({ seed: 42, caseIndex: 0, counterexample: 10 });
    expect(result.failure!.shrinkSteps).toBeGreaterThan(0);
  });
});

describe('canonical JSON and semantic diff', () => {
  test('key order is canonical and both declared digests are stable', () => {
    expect(canonicalJsonText({ z: 1, a: { y: true, x: null } })).toBe(
      '{"a":{"x":null,"y":true},"z":1}'
    );
    expect(canonicalJsonText({ b: 2, a: 1 })).toBe(canonicalJsonText({ a: 1, b: 2 }));
    const digests = canonicalJsonDigests({ a: 1 });
    expect(digests.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(digests.sha3_256).toMatch(/^[a-f0-9]{64}$/);
    expect(digests.bytes).toBe(7);
  });

  test('rejects values that JSON cannot represent deterministically', () => {
    expect(() => parseCanonicalJsonValue({ value: undefined })).toThrow('rejects undefined');
    expect(() => parseCanonicalJsonValue(Number.NaN)).toThrow('non-finite');
    expect(() => parseCanonicalJsonValue(new Date())).toThrow('plain objects');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => parseCanonicalJsonValue(cyclic)).toThrow('cyclic');
  });

  test('emits deterministic bounded JSON Pointer changes', () => {
    const diff = semanticJsonDiff(
      { stable: true, nested: { old: 1 }, rows: ['a', 'b'] },
      { stable: true, nested: { next: 2 }, rows: ['a', 'c', 'd'] }
    );
    expect(diff.changed).toBe(true);
    expect(diff.changes).toEqual([
      { operation: 'add', path: '/nested/next', after: 2 },
      { operation: 'remove', path: '/nested/old', before: 1 },
      { operation: 'replace', path: '/rows/1', before: 'b', after: 'c' },
      { operation: 'add', path: '/rows/2', after: 'd' },
    ]);
    expect(semanticJsonDiff({ a: 1 }, { a: 2, b: 3 }, { maxChanges: 1 })).toMatchObject({
      totalChanges: 2,
      truncated: true,
    });
  });
});
