// @see https://bun.com/docs/runtime/utils
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
import { describe, expect, test } from 'bun:test';
import {
  buildBunUtilsProof,
  canonicalJson,
  inspectDepthPasses,
  sha256Hex,
} from '../lib/bun-utils-proof.ts';
import { deepEqualsDocsStrictCases } from '../lib/deep-equals.ts';

describe('bun-utils-proof', () => {
  test('all baselines pass on this Bun', () => {
    const proof = buildBunUtilsProof({
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: 'test',
      bunRevision: 'test',
    });
    expect(proof.summary.failed).toBe(0);
    expect(proof.summary.passed).toBe(proof.summary.total);
    expect(proof.proofHash).toMatch(/^[a-f0-9]{64}$/);

    // Docs strict matrix expanded into proof rows (strict + loose + diverges per case).
    const docsRows = proof.testCases.filter(c => c.note.includes('docs matrix'));
    expect(docsRows.length).toBe(deepEqualsDocsStrictCases().length * 3);
    expect(docsRows.every(c => Object.is(c.actual, c.expected))).toBe(true);
  });

  test('proof hash is stable for fixed timestamp and cases', () => {
    const a = buildBunUtilsProof({
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: Bun.version,
      bunRevision: Bun.revision || 'unknown',
    });
    const b = buildBunUtilsProof({
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: Bun.version,
      bunRevision: Bun.revision || 'unknown',
    });
    expect(a.proofHash).toBe(b.proofHash);
  });

  test('canonicalJson + sha256Hex are deterministic', () => {
    const h1 = sha256Hex(canonicalJson({ b: 1, a: { z: 2, y: 3 } }));
    const h2 = sha256Hex(canonicalJson({ a: { y: 3, z: 2 }, b: 1 }));
    expect(h1).toBe(h2);
  });

  test('inspectDepthPasses classifies Bun inspect shapes', () => {
    expect(inspectDepthPasses('{\n  a: [Object ...],\n}', 0)).toBe(true);
    expect(inspectDepthPasses('{\n  a: {\n    b: [Object ...],\n  },\n}', 1)).toBe(true);
    expect(
      inspectDepthPasses(
        '{\n  a: {\n    b: {\n      c: {\n        d: "e",\n      },\n    },\n  },\n}',
        'default'
      )
    ).toBe(true);
    expect(inspectDepthPasses('{ a: { b: { c: 1 } } }', 0)).toBe(false);
  });
});
