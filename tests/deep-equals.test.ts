// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/guides/util/deep-equals — strict-mode guide
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  BUN_DEEP_EQUALS_DOCS,
  BUN_DEEP_EQUALS_GUIDE,
  deepEquals,
  deepEqualsChangedIndex,
  deepEqualsChangedKey,
  deepEqualsDocsStrictCases,
  deepEqualsDocsStrictProof,
  deepEqualsLoose,
  deepEqualsModes,
  deepEqualsStrict,
  deepEqualsStrictDiverges,
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
  test('canonical docs URLs point at Bun.deepEquals anchors', () => {
    expect(BUN_DEEP_EQUALS_DOCS).toBe('https://bun.com/docs/runtime/utils#bun-deepequals');
    expect(BUN_DEEP_EQUALS_GUIDE).toBe('https://bun.com/docs/guides/util/deep-equals');
  });

  test('deepEquals defaults to strict (Bun.deepEquals(a, b, true))', () => {
    expect(deepEquals({ a: 1, b: [2] }, { a: 1, b: [2] })).toBe(true);
    expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);

    // docs shape we want as house default
    const a = { entries: [1, 2] };
    const b = { entries: [1, 2], extra: undefined };
    expect(Bun.deepEquals(a, b)).toBe(true);
    expect(Bun.deepEquals(a, b, true)).toBe(false);
    expect(deepEquals(a, b)).toBe(false); // wrapper defaults strict=true
    expect(deepEquals(a, b, false)).toBe(true); // explicit loose
    expect(deepEqualsLoose(a, b)).toBe(true);
  });

  test('deepEqualsStrict treats undefined vs missing as unequal', () => {
    expect(deepEqualsStrict({ a: undefined }, {})).toBe(false);
    expect(deepEqualsStrict({ a: 1 }, { a: 1 })).toBe(true);
  });

  test('deepEqualsModes dual probe + strictDiverges', () => {
    const a = { entries: [1, 2] };
    const b = { entries: [1, 2], extra: undefined };
    expect(deepEqualsModes(a, b)).toEqual({ strict: false, loose: true, diverges: true });
    expect(deepEqualsStrictDiverges(a, b)).toBe(true);

    expect(deepEqualsModes({ x: 1 }, { x: 1 })).toEqual({
      strict: true,
      loose: true,
      diverges: false,
    });
    expect(deepEqualsStrictDiverges({ x: 1 }, { x: 1 })).toBe(false);

    expect(deepEqualsModes({ x: 1 }, { x: 2 })).toEqual({
      strict: false,
      loose: false,
      diverges: false,
    });
    expect(deepEqualsStrictDiverges({ x: 1 }, { x: 2 })).toBe(false);
  });

  test('docs strict matrix: every case loose-equal, strict-unequal', () => {
    const cases = deepEqualsDocsStrictCases();
    expect(cases.length).toBeGreaterThanOrEqual(5);

    for (const c of cases) {
      expect(deepEquals(c.a, c.b)).toBe(c.expectedStrict);
      expect(deepEqualsLoose(c.a, c.b)).toBe(c.expectedLoose);
      expect(deepEqualsStrictDiverges(c.a, c.b)).toBe(
        c.expectedLoose && !c.expectedStrict
      );
    }

    const proof = deepEqualsDocsStrictProof();
    expect(proof.every(r => r.ok)).toBe(true);
    expect(proof.map(r => r.id)).toEqual(cases.map(c => c.id));
  });

  test('docs cases: undefined / sparse / class / nested (named)', () => {
    // undefined values
    expect(deepEquals({}, { a: undefined })).toBe(false);
    expect(deepEqualsLoose({}, { a: undefined })).toBe(true);

    // undefined in arrays
    expect(deepEquals(['asdf'], ['asdf', undefined])).toBe(false);
    expect(deepEqualsLoose(['asdf'], ['asdf', undefined])).toBe(true);

    // sparse arrays
    const sparse: unknown[] = new Array(2);
    sparse[1] = 1;
    expect(deepEquals(sparse, [undefined, 1])).toBe(false);
    expect(deepEqualsLoose(sparse, [undefined, 1])).toBe(true);

    // class vs plain
    class Foo {
      a = 1;
    }
    expect(deepEquals(new Foo(), { a: 1 })).toBe(false);
    expect(deepEqualsLoose(new Foo(), { a: 1 })).toBe(true);

    // nested undefined key
    expect(deepEquals({ a: { b: undefined } }, { a: {} })).toBe(false);
    expect(deepEqualsLoose({ a: { b: undefined } }, { a: {} })).toBe(true);
  });

  test('deepEquals handles Map, Set, Date, typed arrays, NaN', () => {
    expect(deepEquals(new Map([['k', 1]]), new Map([['k', 1]]))).toBe(true);
    expect(deepEquals(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEquals(new Map([['k', 1]]), new Map([['k', 2]]))).toBe(false);
    expect(deepEquals(new Date(0), new Date(0))).toBe(true);
    expect(deepEquals(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(deepEquals(NaN, NaN)).toBe(true);
    // Object.is semantics: 0 ≠ -0 under deepEquals
    expect(deepEquals(0, -0)).toBe(false);
  });

  test('deepEqualsChangedIndex finds first drift', () => {
    expect(deepEqualsChangedIndex([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(-1);
    expect(deepEqualsChangedIndex([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(1);
    expect(deepEqualsChangedIndex([{ a: 1 }], [{ a: 1 }, { b: 2 }])).toBe(1);
    // strict: undefined key counts as drift
    expect(
      deepEqualsChangedIndex([{ entries: [1, 2] }], [{ entries: [1, 2], extra: undefined }])
    ).toBe(0);
  });

  test('deepEqualsChangedKey finds first diverging own key', () => {
    expect(deepEqualsChangedKey({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeUndefined();
    expect(deepEqualsChangedKey({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe('b');
    expect(deepEqualsChangedKey({ entries: [1, 2] }, { entries: [1, 2], extra: undefined })).toBe(
      'extra'
    );
    expect(deepEqualsChangedKey({ a: undefined }, {})).toBe('a');
    // sorted: 'a' before 'z'
    expect(deepEqualsChangedKey({ z: 1, a: 2 }, { z: 1, a: 9 })).toBe('a');
  });

  test('imageEvidenceMetaEqual / sameImageEvidence use deepEquals', async () => {
    if (typeof (Bun as { Image?: unknown }).Image !== 'function') {
      // Runtime without Bun.Image (some canary/minimal builds)
      return;
    }
    const a = await extractImageEvidenceMeta(PNG_10);
    const b = await extractImageEvidenceMeta(PNG_10);
    expect(imageEvidenceMetaEqual(a, b)).toBe(true);
    expect(sameImageEvidence(a, b)).toBe(true);
    expect(imageEvidenceMetaEqual(a, { ...b, width: b.width + 1 })).toBe(false);
  });
});
