import { describe, expect, test } from 'bun:test';
import {
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
});
