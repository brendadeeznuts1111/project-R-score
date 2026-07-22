// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_DEEP_EQUALS_DOCS,
  deepEquals,
  deepEqualsChangedIndex,
  deepEqualsStrict,
} from '../lib/deep-equals.ts';
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

  test('deepEqualsStrict treats undefined vs missing as unequal', () => {
    expect(deepEqualsStrict({ a: undefined }, {})).toBe(false);
    expect(deepEqualsStrict({ a: 1 }, { a: 1 })).toBe(true);
  });

  test('deepEquals handles Map and Set', () => {
    expect(deepEquals(new Map([['k', 1]]), new Map([['k', 1]]))).toBe(true);
    expect(deepEquals(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEquals(new Map([['k', 1]]), new Map([['k', 2]]))).toBe(false);
  });

  test('deepEqualsChangedIndex finds first drift', () => {
    expect(deepEqualsChangedIndex([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(-1);
    expect(deepEqualsChangedIndex([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(1);
    expect(deepEqualsChangedIndex([{ a: 1 }], [{ a: 1 }, { b: 2 }])).toBe(1);
  });

  test('imageEvidenceMetaEqual / sameImageEvidence use deepEquals', async () => {
    const a = await extractImageEvidenceMeta(PNG_10);
    const b = await extractImageEvidenceMeta(PNG_10);
    expect(imageEvidenceMetaEqual(a, b)).toBe(true);
    expect(sameImageEvidence(a, b)).toBe(true);
    expect(imageEvidenceMetaEqual(a, { ...b, width: b.width + 1 })).toBe(false);
  });
});
