/**
 * Offline Bun API showcase demos (corrected one-liner suite).
 * @see ../tools/bun-api-showcase.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  SHOWCASE_DEMOS,
  listDemos,
  runDemo,
  type ShowcaseDemo,
} from '../tools/bun-api-showcase.ts';

describe('bun-api-showcase catalog', () => {
  test('has 20 demos with unique ids 1..20', () => {
    const demos = listDemos();
    expect(demos).toHaveLength(20);
    expect(demos.map(d => d.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const apis = new Set(demos.flatMap(d => d.apis));
    expect(apis.has('Bun.Transpiler')).toBe(true);
    expect(apis.has('bun:ffi')).toBe(true);
    expect(apis.has('Bun.CSRF')).toBe(true);
  });
});

describe('bun-api-showcase offline demos', () => {
  const offline = SHOWCASE_DEMOS.filter(
    (d): d is ShowcaseDemo => d.gate === 'offline' || d.id === 4
  );

  for (const demo of offline) {
    test(`#${demo.id} ${demo.name}`, async () => {
      const r = await runDemo(demo, { verbose: false });
      expect(r.skipped ?? false).toBe(false);
      expect(r.ok).toBe(true);
      expect(r.detail.length).toBeGreaterThan(0);
    }, 30_000);
  }
});
