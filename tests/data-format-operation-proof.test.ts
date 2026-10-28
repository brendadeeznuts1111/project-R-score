import { describe, expect, test } from 'bun:test';
import { runFormatBehaviorProof } from '../lib/data-format-operation-proof.ts';

describe('data-format behavioral proof engine', () => {
  test('proves acceptance, rejection, round-trip equivalence, and nanosecond units', () => {
    const proof = runFormatBehaviorProof(
      JSON as unknown as Record<string, unknown>,
      ['parse', 'stringify'],
      '{"ready":true}',
      '{"ready":}',
      1024
    );
    expect(proof.ok).toBe(true);
    expect(proof.positive.parse?.ok).toBe(true);
    expect(proof.negative.parse?.behavior).toBe('threw');
    expect(proof.roundTrip?.beforeSha256).toBe(proof.roundTrip?.afterSha256);
    const timing = proof.positive.parse!;
    expect(timing.durationNs).toBeGreaterThanOrEqual(0);
    expect(timing.durationMs).toBe(timing.durationNs / 1_000_000);
  });

  test('recognizes structured streaming errors without requiring a throw', () => {
    const api = {
      parseChunk(value: string) {
        return value === 'valid' ? { values: [1], error: null } : { values: [], error: new SyntaxError('invalid') };
      },
    };
    const proof = runFormatBehaviorProof(api, ['parseChunk'], 'valid', 'invalid', 1024);
    expect(proof.ok).toBe(true);
    expect(proof.negative.parseChunk?.behavior).toBe('error-result');
    expect(proof.negative.parseChunk?.errorSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  test('fails when invalid input is accepted or positive output exceeds its cap', () => {
    const permissive = { parse: () => ({ accepted: true }) };
    const accepted = runFormatBehaviorProof(permissive, ['parse'], 'valid', 'invalid', 1024);
    expect(accepted.ok).toBe(false);
    expect(accepted.negative.parse?.behavior).toBe('accepted');

    const oversized = runFormatBehaviorProof(
      JSON as unknown as Record<string, unknown>,
      ['parse'],
      '{"payload":"large"}',
      'invalid',
      1
    );
    expect(oversized.ok).toBe(false);
    expect(oversized.positive.parse?.error).toContain('output exceeds');
  });
});
