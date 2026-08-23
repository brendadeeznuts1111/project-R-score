import { describe, expect, test } from 'bun:test';
import {
  areaOf,
  healthOf,
  parseLaneCliOpts,
  type LaneReport,
} from '../tools/lane-status.ts';

describe('lane-status areaOf', () => {
  test('maps path prefixes to lane areas', () => {
    expect(areaOf('public/registry/x.json')).toBe('registry');
    expect(areaOf('public/portal/board.html')).toBe('portal');
    expect(areaOf('public/monitoring/a.js')).toBe('portal');
    expect(areaOf('lib/console/index.ts')).toBe('lib');
    expect(areaOf('docs/AGENTS.md')).toBe('docs');
    expect(areaOf('tests/lane-status.test.ts')).toBe('tests');
    expect(areaOf('tools/lane-status.ts')).toBe('tooling');
    expect(areaOf('scripts/pre-commit-harness.ts')).toBe('tooling');
    expect(areaOf('.gitignore')).toBe('other');
  });
});

describe('lane-status healthOf', () => {
  const base = (over: Partial<LaneReport['primary']>): Pick<LaneReport, 'primary'> => ({
    primary: {
      path: '/tmp',
      branch: 'main',
      head: 'abc',
      aheadOfOriginMain: 0,
      behindOriginMain: 0,
      dirtyTotal: 0,
      dirtyByArea: {},
      dirtyFiles: [],
      stagedFiles: [],
      bakeDriftFiles: [],
      ...over,
    },
  });

  test('ok when clean on main', () => {
    expect(healthOf(base({}))).toBe('ok');
  });

  test('fail when main is behind origin', () => {
    expect(healthOf(base({ behindOriginMain: 2 }))).toBe('fail');
  });

  test('warn when dirty or bake drift', () => {
    expect(healthOf(base({ dirtyTotal: 1 }))).toBe('warn');
    expect(healthOf(base({ bakeDriftFiles: ['public/registry/a.json'] }))).toBe('warn');
  });
});

describe('lane-status parseLaneCliOpts', () => {
  test('parses known flags and every cron', () => {
    const opts = parseLaneCliOpts(['--json', '--short', '--verbose', '--every', '0 * * * *']);
    expect(opts.json).toBe(true);
    expect(opts.short).toBe(true);
    expect(opts.verbose).toBe(true);
    expect(opts.every).toBe('0 * * * *');
    expect(opts.watch).toBe(false);
  });
});
