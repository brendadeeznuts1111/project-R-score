import { describe, expect, test } from 'bun:test';
import { ESLint } from 'eslint';
import {
  buildHarnessEslintArgs,
  HARNESS_ESLINT_CONFIG,
} from '../config/eslint/harness/command.ts';
import {
  HARNESS_IGNORES,
  HARNESS_PATHS,
  HARNESS_ROOTS,
  isHarnessLintPath,
} from '../config/eslint/harness/rollout.ts';
import { parseHarnessLintArgs } from '../scripts/lint-harness.ts';

const repoRoot = `${import.meta.dir}/..`;

describe('harness ESLint scope', () => {
  test('configures TypeScript and TSX under every harness root', () => {
    expect(HARNESS_PATHS).toHaveLength(HARNESS_ROOTS.length);
    for (const root of HARNESS_ROOTS) {
      expect(HARNESS_PATHS).toContain(`${root}/**/*.{ts,tsx}`);
    }
  });

  test('changed and staged selectors use the same scope and ignores', () => {
    expect(isHarnessLintPath('lib/example.ts')).toBe(true);
    expect(isHarnessLintPath('./packages/ui/example.tsx')).toBe(true);
    expect(isHarnessLintPath('lib/example.test.ts')).toBe(false);
    expect(isHarnessLintPath('lib/example.spec.tsx')).toBe(false);
    expect(isHarnessLintPath('lib/example.bench.ts')).toBe(false);
    expect(isHarnessLintPath('lib/example.d.ts')).toBe(false);
    expect(isHarnessLintPath('projects/example.ts')).toBe(false);
    expect(isHarnessLintPath('lib/example.js')).toBe(false);
  });

  test('ESLint resolves TSX and globally ignores declaration files', async () => {
    const eslint = new ESLint({
      cwd: repoRoot,
      overrideConfigFile: `${repoRoot}/${HARNESS_ESLINT_CONFIG}`,
    });

    expect(await eslint.isPathIgnored('lib/example.tsx')).toBe(false);
    expect(await eslint.isPathIgnored('lib/example.d.ts')).toBe(true);

    const config = await eslint.calculateConfigForFile('lib/example.tsx');
    expect(config?.rules['harness/no-unknown-function-param']).toEqual([2]);
    expect(config?.rules['no-restricted-imports']?.[0]).toBe(2);
  });
});

describe('harness ESLint command', () => {
  test('uses canonical config, paths, and ignores by default', () => {
    const args = buildHarnessEslintArgs();
    expect(args.slice(0, 3)).toEqual(['eslint', '--config', HARNESS_ESLINT_CONFIG]);
    for (const path of HARNESS_PATHS) expect(args).toContain(path);
    for (const ignore of HARNESS_IGNORES) {
      const index = args.indexOf(ignore);
      expect(index).toBeGreaterThan(0);
      expect(args[index - 1]).toBe('--ignore-pattern');
    }
  });

  test('runner parses scoped cache and enforcement options', () => {
    const options = parseHarnessLintArgs([
      '--scope=lib',
      '--cache-location=.cache/eslint',
      '--quiet',
      '--fix',
      '--max-warnings=0',
    ]);

    expect(options).toEqual({
      cacheLocation: '.cache/eslint',
      files: ['lib/**/*.{ts,tsx}'],
      fix: true,
      maxWarnings: 0,
      quiet: true,
    });
  });

  test('runner rejects unknown scopes and invalid warning thresholds', () => {
    expect(() => parseHarnessLintArgs(['--scope=projects'])).toThrow(
      'Unknown harness scope: projects'
    );
    expect(() => parseHarnessLintArgs(['--max-warnings=-1'])).toThrow(
      'Invalid --max-warnings value: -1'
    );
  });
});
