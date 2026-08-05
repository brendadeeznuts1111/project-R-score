// partner-watch.test.ts — watch-mode trigger filter for the accounting bake loop.

import { describe, expect, test } from 'bun:test';
import { shouldRebake, WATCH_ROOTS } from '../tools/partner-watch';

describe('shouldRebake', () => {
  test('source files trigger a re-bake', () => {
    expect(shouldRebake('config/partner-profiles/SPEN.toml')).toBe(true);
    expect(shouldRebake('data/operations.db')).toBe(true);
    expect(shouldRebake('public/registry/seat-capital-desk.json')).toBe(true);
  });

  test('outputs and unrelated files do not trigger (no self-write loops)', () => {
    expect(shouldRebake('public/registry/partner-profiles.json')).toBe(false);
    expect(shouldRebake('public/registry/partners-ops.json')).toBe(false);
    expect(shouldRebake('public/registry/domain-glossary.json')).toBe(false);
    expect(shouldRebake('data/operations.db-wal')).toBe(false);
    expect(shouldRebake('data/operations.db-shm')).toBe(false);
    expect(shouldRebake('config/other.toml')).toBe(false);
    expect(shouldRebake('public/portal/partners/index.html')).toBe(false);
  });

  test('watch roots cover the accounting sources', () => {
    expect(WATCH_ROOTS).toEqual(['config/partner-profiles', 'data', 'public/registry']);
  });
});

void 0;
