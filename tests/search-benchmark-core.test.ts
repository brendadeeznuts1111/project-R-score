import { describe, expect, test } from 'bun:test';
import {
  QUALITY_SCORE_WEIGHTS,
  computeQualityScore,
  extractFirstJsonObject,
  parseArgs,
  normalizeQueryPacks,
  parseJsonPayload,
} from '../scripts/search-benchmark';

describe('search benchmark core helpers', () => {
  test('extracts first JSON object from noisy output', () => {
    const raw = 'log: warmup\n{"hits":[{"qualityTag":"ok"}],"elapsedMs":12}\ntrailer';
    const extracted = extractFirstJsonObject(raw);
    expect(extracted).toBe('{"hits":[{"qualityTag":"ok"}],"elapsedMs":12}');
  });

  test('extracts JSON object with braces in string fields', () => {
    const raw = 'note {"hits":[{"message":"brace { in text }"}],"elapsedMs":7}';
    const extracted = extractFirstJsonObject(raw);
    expect(extracted).toBe('{"hits":[{"message":"brace { in text }"}],"elapsedMs":7}');
  });

  test('parseJsonPayload returns empty hits payload when no JSON exists', () => {
    expect(parseJsonPayload('no json here')).toEqual({ hits: [] });
  });

  test('normalizeQueryPacks merges valid custom packs onto defaults', () => {
    const packs = normalizeQueryPacks({
      custom_pack: ['  alpha  ', '', 'beta'],
      core_delivery: ['custom query'],
      invalid_pack: 42,
    });
    expect(packs.custom_pack).toEqual(['alpha', 'beta']);
    expect(packs.core_delivery).toEqual(['custom query']);
    expect(Array.isArray(packs.core_delivery_wide)).toBe(true);
    expect(Array.isArray(packs.cleanup_noise)).toBe(true);
  });

  test('parseArgs applies query timeout and retry controls', () => {
    const args = parseArgs([
      '--query-timeout-ms',
      '12000',
      '--query-retries',
      '3',
      '--concurrency',
      '99',
    ]);
    expect(args.queryTimeoutMs).toBe(12000);
    expect(args.queryRetries).toBe(3);
    expect(args.concurrency).toBe(32);
  });

  test('quality score weights sum to 1.0', () => {
    const sum = QUALITY_SCORE_WEIGHTS.signalPct +
      QUALITY_SCORE_WEIGHTS.uniqueFamilyPct +
      QUALITY_SCORE_WEIGHTS.slopPenalty +
      QUALITY_SCORE_WEIGHTS.duplicatePenalty;
    expect(sum).toBe(1);
  });

  test('quality score increases with stronger signal and family coverage', () => {
    const low = computeQualityScore({
      avgSignalPct: 70,
      avgUniqueFamilyPct: 40,
      avgSlopPct: 10,
      avgDuplicatePct: 5,
    });
    const high = computeQualityScore({
      avgSignalPct: 85,
      avgUniqueFamilyPct: 55,
      avgSlopPct: 10,
      avgDuplicatePct: 5,
    });
    expect(high).toBeGreaterThan(low);
  });

  test('quality score decreases with higher slop and duplicates', () => {
    const clean = computeQualityScore({
      avgSignalPct: 85,
      avgUniqueFamilyPct: 55,
      avgSlopPct: 5,
      avgDuplicatePct: 2,
    });
    const noisy = computeQualityScore({
      avgSignalPct: 85,
      avgUniqueFamilyPct: 55,
      avgSlopPct: 20,
      avgDuplicatePct: 10,
    });
    expect(noisy).toBeLessThan(clean);
  });

  test('quality score is clamped to 0..100 for invalid metric inputs', () => {
    const low = computeQualityScore({
      avgSignalPct: -10,
      avgUniqueFamilyPct: -10,
      avgSlopPct: 500,
      avgDuplicatePct: 500,
    });
    const high = computeQualityScore({
      avgSignalPct: 300,
      avgUniqueFamilyPct: 300,
      avgSlopPct: -200,
      avgDuplicatePct: -200,
    });
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });
});
