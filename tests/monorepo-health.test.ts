// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
import { describe, expect, test } from 'bun:test';
import {
  computeMonorepoHealth,
  countCycles,
  findImportCycles,
  gradeMonorepoHealth,
  loaderForPath,
  parseCoveragePercent,
  parseTestSummary,
  scanSourceExports,
  scanSourceImports,
} from '../lib/harness/monorepo-health.ts';

describe('monorepo-health formula', () => {
  test('v2 structural formula uses bounded penalties', () => {
    // 100 - min(20, 5×5) - 15 - 10×0.75 - 3×5 = 42.5
    const r = computeMonorepoHealth({
      duplicateDepCount: 5,
      deadCodePercent: 15,
      largeFilePercent: 10,
      testFailureRate: 2,
      cyclicDependencyCount: 3,
      testCoveragePercent: 80,
    });
    expect(r.score).toBe(42.5);
    expect(r.grade).toBe('critical');
    expect(r.breakdown.duplicateDepPenalty).toBe(20);
    expect(r.breakdown.largeFilePenalty).toBe(7.5);
  });

  test('perfect metrics score 100 healthy', () => {
    const r = computeMonorepoHealth({
      duplicateDepCount: 0,
      deadCodePercent: 0,
      largeFilePercent: 0,
      testFailureRate: null,
      cyclicDependencyCount: 0,
      testCoveragePercent: null,
    });
    expect(r.score).toBe(100);
    expect(r.grade).toBe('healthy');
  });

  test('grades bands', () => {
    expect(gradeMonorepoHealth(95)).toBe('healthy');
    expect(gradeMonorepoHealth(90)).toBe('healthy');
    expect(gradeMonorepoHealth(89.9)).toBe('needs-improvement');
    expect(gradeMonorepoHealth(60)).toBe('needs-improvement');
    expect(gradeMonorepoHealth(59.9)).toBe('critical');
  });

  test('clamps score to 0–100', () => {
    const low = computeMonorepoHealth({
      duplicateDepCount: 100,
      deadCodePercent: 100,
      largeFilePercent: 100,
      testFailureRate: null,
      cyclicDependencyCount: 100,
      testCoveragePercent: null,
    });
    expect(low.score).toBe(0);
    const high = computeMonorepoHealth({
      duplicateDepCount: 0,
      deadCodePercent: 0,
      largeFilePercent: 0,
      testFailureRate: null,
      cyclicDependencyCount: 0,
      testCoveragePercent: null,
    });
    expect(high.score).toBe(100);
  });

  test('optional test evidence does not change the structural score', () => {
    const base = {
      duplicateDepCount: 0,
      deadCodePercent: 10,
      largeFilePercent: 20,
      cyclicDependencyCount: 0,
    };
    const unmeasured = computeMonorepoHealth({
      ...base,
      testFailureRate: null,
      testCoveragePercent: null,
    });
    const measured = computeMonorepoHealth({
      ...base,
      testFailureRate: 25,
      testCoveragePercent: 80,
    });
    expect(measured.score).toBe(unmeasured.score);
  });
});

describe('monorepo-health helpers', () => {
  test('countCycles detects back-edge', () => {
    const adj = new Map<string, string[]>([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    expect(countCycles(adj)).toBeGreaterThanOrEqual(1);
  });

  test('findImportCycles classifies static and lazy cycles once', () => {
    const graph = new Map([
      ['a', [{ target: 'b', lazy: false }]],
      ['b', [{ target: 'a', lazy: false }]],
      ['c', [{ target: 'd', lazy: true }]],
      ['d', [{ target: 'c', lazy: false }]],
    ]);
    const cycles = findImportCycles(graph);
    expect(cycles).toHaveLength(2);
    expect(cycles.filter(cycle => cycle.weak)).toHaveLength(1);
  });

  test('parseCoveragePercent reads All-files table and Lines: summary', () => {
    const table = `
--------------------------------|---------|---------|-------------------
File                            | % Funcs | % Lines | Uncovered Line #s
--------------------------------|---------|---------|-------------------
All files                       |   27.78 |   19.58 |
 lib/harness/monorepo-health.ts |   55.56 |   25.52 | 136-178
--------------------------------|---------|---------|-------------------
`;
    expect(parseCoveragePercent(table)).toBe(19.58);
    expect(parseCoveragePercent('Lines        : 42.5% ( 10/24 )')).toBe(42.5);
    expect(parseCoveragePercent('no coverage here')).toBeNull();
  });

  test('parseTestSummary reads pass/fail lines', () => {
    const s = parseTestSummary('  27 pass\n  2 fail\nRan 29 tests');
    expect(s.pass).toBe(27);
    expect(s.fail).toBe(2);
    expect(s.testFailureRate).toBeCloseTo((2 / 29) * 100, 5);
  });

  test('loaderForPath maps extensions', () => {
    expect(loaderForPath('a.ts')).toBe('ts');
    expect(loaderForPath('a.tsx')).toBe('tsx');
    expect(loaderForPath('a.jsx')).toBe('jsx');
    expect(loaderForPath('a.js')).toBe('js');
  });
});

describe('Bun.Transpiler scan for import graph', () => {
  test('scanSourceImports finds ESM, require, and dynamic import; skips type-only', () => {
    const code = `
      import React from 'react';
      import type { Node } from 'typescript';
      import { joinPath } from '../path-bun.ts';
      const cjs = require('./cjs-dep.ts');
      const dyn = import('./lazy.ts');
      export const name = 'x';
    `;
    const imports = scanSourceImports(code, 'ts');
    const paths = imports.map(i => i.path);
    expect(paths).toContain('react');
    expect(paths).toContain('../path-bun.ts');
    expect(paths).toContain('./cjs-dep.ts');
    expect(paths).toContain('./lazy.ts');
    // type-only import ignored by Bun.Transpiler.scan
    expect(paths.some(p => p === 'typescript')).toBe(false);

    const kinds = new Map(imports.map(i => [i.path, i.kind]));
    expect(kinds.get('react')).toBe('import-statement');
    expect(kinds.get('./cjs-dep.ts')).toBe('require-call');
    expect(kinds.get('./lazy.ts')).toBe('dynamic-import');
  });

  test('scanSourceExports lists value exports only', () => {
    const code = `
      export type T = string;
      export const y = 1;
      export function f() {}
    `;
    const exports = scanSourceExports(code, 'ts');
    expect(exports).toContain('y');
    expect(exports).toContain('f');
    expect(exports).not.toContain('T');
  });
});
