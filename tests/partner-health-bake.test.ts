// @see https://bun.com/docs/test — bun:test
// tests/partner-health-bake.test.ts — partner health board bake snapshot.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';

import {
  bakePartnerHealth,
  buildPartnerHealthBake,
  partnerHealthBakeMatches,
} from '../lib/partner-profile/partner-health-bake.ts';
import { resetTelegramRateLimiters } from '../lib/telegram/telegram-api.ts';

const OUT = '.tmp/partner-health-bake.json';

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  resetTelegramRateLimiters();
  originalFetch = globalThis.fetch;
  rmSync(OUT, { force: true });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  rmSync(OUT, { force: true });
});

describe('partner health bake', () => {
  test('builds the combined snapshot shape (never throws on degraded state)', async () => {
    const bake = await buildPartnerHealthBake();
    expect(bake.schemaVersion).toBe(1);
    expect(typeof bake.generatedAt).toBe('string');
    expect(typeof bake.health.ok).toBe('boolean');
    expect(typeof bake.health.opsDb.ok).toBe('boolean');
    expect(typeof bake.health.bindings.count).toBe('number');
    expect(bake.outChecks.checked).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(bake.outChecks.degraded)).toBe(true);
  });

  test('bakePartnerHealth writes parseable JSON with the snapshot', async () => {
    const { bake, path } = await bakePartnerHealth(OUT);
    expect(path).toBe(OUT);
    const text = await Bun.file(OUT).text();
    const parsed = JSON.parse(text) as { schemaVersion: number; health: { ok: boolean } };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.health.ok).toBe(bake.health.ok);
  });

  test('partnerHealthBakeMatches detects drift', async () => {
    const live = await buildPartnerHealthBake();
    expect(partnerHealthBakeMatches(live, live)).toBe(true);
    expect(partnerHealthBakeMatches(live, { schemaVersion: 1, health: live.health, outChecks: { ...live.outChecks, checked: -1 } })).toBe(false);
    expect(partnerHealthBakeMatches(live, null)).toBe(false);
  });
});
