// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { BUN_DEEP_EQUALS_DOCS, deepEquals } from '../lib/deep-equals.ts';
import {
  extractImageEvidenceMeta,
  imageEvidenceMetaEqual,
  sameImageEvidence,
} from '../lib/image-metadata.ts';

const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64',
);

describe('lib/deep-equals', () => {
  test('canonical docs URL points at Bun.deepEquals anchor', () => {
    expect(BUN_DEEP_EQUALS_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-deepequals');
  });

  test('deepEquals matches Bun.deepEquals for plain objects', () => {
    expect(deepEquals({ a: 1, b: [2] }, { a: 1, b: [2] })).toBe(true);
    expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEquals({ a: undefined }, {}, true)).toBe(false);
  });

  test('imageEvidenceMetaEqual / sameImageEvidence use deepEquals', async () => {
    const a = await extractImageEvidenceMeta(PNG_10);
    const b = await extractImageEvidenceMeta(PNG_10);
    expect(imageEvidenceMetaEqual(a, b)).toBe(true);
    expect(sameImageEvidence(a, b)).toBe(true);
    expect(imageEvidenceMetaEqual(a, { ...b, width: b.width + 1 })).toBe(false);
  });
});
