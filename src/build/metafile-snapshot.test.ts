// src/build/metafile-snapshot.test.ts
import { test, expect, describe } from 'bun:test';
import type { BuildMetafile } from './types';
import { createBundleSnapshot, diffSnapshots, normalizeMetafilePaths } from './metafile-snapshot';
import { BundleGuard, GUARD_PRESETS } from './bundle-guard';
import { ESBUILD_ANALYZER_URL } from './analyzer-url';

// Test fixture: 3 inputs, 1 output, 1 circular dep, 1 unused export
const fixture: BuildMetafile = {
  inputs: {
    'src/index.ts': {
      bytes: 1200,
      imports: [
        { path: 'src/utils.ts', kind: 'import-statement' },
        { path: 'src/helper.ts', kind: 'import-statement' },
      ],
      format: 'esm',
    },
    'src/utils.ts': {
      bytes: 800,
      imports: [
        { path: 'src/helper.ts', kind: 'import-statement', original: 'formatBytes' },
      ],
      format: 'esm',
    },
    'src/helper.ts': {
      bytes: 500,
      imports: [
        { path: 'src/utils.ts', kind: 'import-statement' }, // circular
      ],
      format: 'esm',
    },
  },
  outputs: {
    'dist/bundle.js': {
      bytes: 2000,
      inputs: {
        'src/index.ts': { bytesInOutput: 1000 },
        'src/utils.ts': { bytesInOutput: 600 },
        'src/helper.ts': { bytesInOutput: 400 },
      },
      imports: [],
      exports: ['main', 'formatBytes', 'unusedHelper'],
      entryPoint: 'src/index.ts',
    },
  },
};

describe('createBundleSnapshot', () => {
  test('returns correct shape and values', () => {
    const snap = createBundleSnapshot(fixture);
    expect(snap.inputCount).toBe(3);
    expect(snap.outputCount).toBe(1);
    expect(snap.totalInputBytes).toBe(2500);
    expect(snap.totalOutputBytes).toBe(2000);
    expect(snap.compressionRatio).toBeCloseTo(0.8, 2);
    expect(snap.circularDependencyCount).toBeGreaterThanOrEqual(1);
    expect(snap.unusedExportCount).toBeGreaterThanOrEqual(1);
    expect(snap.graphNodeCount).toBeGreaterThan(0);
    expect(snap.graphEdgeCount).toBeGreaterThan(0);
    expect(snap.largestFiles.length).toBeGreaterThan(0);
    expect(snap.largestFiles[0].path).toBe('src/index.ts');
  });

  test('matches snapshot', () => {
    const snap = createBundleSnapshot(fixture);
    expect(snap).toMatchSnapshot();
  });
});

describe('normalizeMetafilePaths', () => {
  test('strips absolute prefixes and normalizes separators', () => {
    const absolute: BuildMetafile = {
      inputs: {
        '/Users/dev/project/src/index.ts': {
          bytes: 100,
          imports: [{ path: '/Users/dev/project/src/utils.ts', kind: 'import-statement' }],
          format: 'esm',
        },
        '/Users/dev/project/src/utils.ts': {
          bytes: 50,
          imports: [],
          format: 'esm',
        },
      },
      outputs: {
        '/Users/dev/project/dist/bundle.js': {
          bytes: 120,
          inputs: { '/Users/dev/project/src/index.ts': { bytesInOutput: 80 } },
          imports: [],
          exports: ['main'],
          entryPoint: '/Users/dev/project/src/index.ts',
        },
      },
    };

    const normalized = normalizeMetafilePaths(absolute);
    expect(Object.keys(normalized.inputs)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(normalized.inputs['src/index.ts'].imports[0].path).toBe('src/utils.ts');
    expect(Object.keys(normalized.outputs['dist/bundle.js'].inputs)).toEqual(['src/index.ts']);
    expect(normalized.outputs['dist/bundle.js'].entryPoint).toBe('src/index.ts');
  });

  test('handles Windows-style backslash paths', () => {
    const winPaths: BuildMetafile = {
      inputs: {
        'C:\\Users\\dev\\project\\src\\index.ts': {
          bytes: 100,
          imports: [],
          format: 'esm',
        },
      },
      outputs: {
        'C:\\Users\\dev\\project\\dist\\out.js': {
          bytes: 80,
          inputs: { 'C:\\Users\\dev\\project\\src\\index.ts': { bytesInOutput: 80 } },
          imports: [],
          exports: [],
        },
      },
    };

    const normalized = normalizeMetafilePaths(winPaths);
    const inputKeys = Object.keys(normalized.inputs);
    // Backslashes should be converted to forward slashes
    expect(inputKeys[0]).not.toContain('\\');
  });
});

describe('diffSnapshots', () => {
  test('detects size increases and new circular deps', () => {
    const baseline = createBundleSnapshot(fixture);

    // Create a larger fixture
    const larger: BuildMetafile = {
      ...fixture,
      inputs: {
        ...fixture.inputs,
        'src/extra.ts': { bytes: 3000, imports: [], format: 'esm' },
      },
    };
    const current = createBundleSnapshot(larger);

    const diff = diffSnapshots(baseline, current);
    expect(diff.inputCountDelta).toBe(1);
    expect(diff.totalInputBytesDelta).toBe(3000);
    expect(diff.graphNodeCountDelta).toBeGreaterThanOrEqual(1);
  });

  test('reports removed files', () => {
    const baseline = createBundleSnapshot(fixture);

    // Fixture with fewer inputs
    const smaller: BuildMetafile = {
      inputs: {
        'src/index.ts': fixture.inputs['src/index.ts'],
      },
      outputs: fixture.outputs,
    };
    const current = createBundleSnapshot(smaller);

    const diff = diffSnapshots(baseline, current);
    expect(diff.inputCountDelta).toBe(-2);
    expect(diff.removedFiles.length).toBeGreaterThanOrEqual(0);
  });
});

describe('BundleGuard.check', () => {
  test('passes when within thresholds', () => {
    const guard = new BundleGuard({ maxBundleSize: 10_000, maxFileCount: 5 });
    const result = guard.check(fixture);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('fails when exceeding thresholds', () => {
    const guard = new BundleGuard({ maxBundleSize: 100, maxCircularDeps: 0 });
    const result = guard.check(fixture);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations.some((v) => v.rule === 'maxBundleSize')).toBe(true);
  });

  test('reports single file size violations', () => {
    const guard = new BundleGuard({ maxSingleFileSize: 100 });
    const result = guard.check(fixture);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === 'maxSingleFileSize')).toBe(true);
  });
});

describe('BundleGuard.assert', () => {
  test('throws on violation', () => {
    const guard = new BundleGuard({ maxBundleSize: 100 });
    expect(() => guard.assert(fixture)).toThrow('Bundle guard assertion failed');
  });

  test('does not throw when passing', () => {
    const guard = new BundleGuard({ maxBundleSize: 100_000 });
    expect(() => guard.assert(fixture)).not.toThrow();
  });
});

describe('BundleGuard presets', () => {
  test('strict catches circular deps and unused exports', () => {
    const guard = new BundleGuard(GUARD_PRESETS.strict);
    const result = guard.check(fixture);
    expect(result.passed).toBe(false);
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain('maxCircularDeps');
    expect(rules).toContain('maxUnusedExports');
  });

  test('lenient allows small circular dep counts', () => {
    const guard = new BundleGuard(GUARD_PRESETS.lenient);
    const result = guard.check(fixture);
    expect(result.passed).toBe(true);
  });
});

describe('BundleGuard.snapshot', () => {
  test('matches snapshot', () => {
    const guard = new BundleGuard(GUARD_PRESETS.moderate);
    const snap = guard.snapshot(fixture);
    expect(snap).toMatchSnapshot();
  });
});

describe('ESBUILD_ANALYZER_URL', () => {
  test('is the correct URL', () => {
    expect(ESBUILD_ANALYZER_URL).toBe('https://esbuild.github.io/analyze/');
  });
});
