import { describe, expect, test } from 'bun:test';
import {
  buildRefreshSteps,
  resolveRefreshOptions,
} from '../tools/bun-docs-refresh.ts';

describe('bun-docs-refresh', () => {
  test('full mode runs feeds, scrape, catalog, schedule', () => {
    const opts = resolveRefreshOptions(['bun', 'tools/bun-docs-refresh.ts']);
    expect(opts.mode).toBe('full');
    const names = buildRefreshSteps(opts).map(s => s.name);
    expect(names).toEqual([
      'Phase 0: docs feeds',
      'Phase 2b: release scrape',
      'Catalog build',
      'Integrity + JSONL log',
    ]);
  });

  test('fast mode skips feeds and scrape; runs index-gen before catalog', () => {
    const opts = resolveRefreshOptions(['bun', 'tools/bun-docs-refresh.ts', '--fast']);
    expect(opts.mode).toBe('fast');
    const steps = buildRefreshSteps(opts);
    expect(steps.map(s => s.name)).toEqual([
      'Phase 1: llms.txt index',
      'Catalog build',
      'Integrity verify',
    ]);
    expect(steps[1]?.cmd).toContain('--no-refresh-rss');
    expect(steps[2]?.cmd).toContain('integrity');
    expect(steps[2]?.cmd).not.toContain('schedule');
  });

  test('feeds mode only refreshes RSS and reference indexes', () => {
    const opts = resolveRefreshOptions(['bun', 'tools/bun-docs-refresh.ts', '--feeds']);
    expect(opts.mode).toBe('feeds');
    expect(buildRefreshSteps(opts).map(s => s.name)).toEqual(['Phase 0: docs feeds']);
  });

  test('--skip-scrape omits scrape but keeps feeds', () => {
    const opts = resolveRefreshOptions(['bun', 'tools/bun-docs-refresh.ts', '--skip-scrape']);
    const names = buildRefreshSteps(opts).map(s => s.name);
    expect(names).not.toContain('Phase 2b: release scrape');
    expect(names).toContain('Phase 0: docs feeds');
  });

  test('--fast and --feeds together throws', () => {
    expect(() =>
      resolveRefreshOptions(['bun', 'tools/bun-docs-refresh.ts', '--fast', '--feeds'])
    ).toThrow(/not both/);
  });
});
