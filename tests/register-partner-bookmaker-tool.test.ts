// register-partner-bookmaker tool — registry resolution helpers.
import { describe, expect, test } from 'bun:test';
import {
  loadBookmakerRegistry,
  resolveBookmakerEntry,
  type BookmakerEntry,
} from '../tools/register-partner-bookmaker';

describe('partner:bookmaker:register registry resolution', () => {
  test('loads the canonical bookmaker registry mirror', async () => {
    const reg = await loadBookmakerRegistry();
    expect(Object.keys(reg).length).toBeGreaterThanOrEqual(5);
    expect(reg.fanduel?.id).toBe('fanduel');
    expect(reg.pinnacle?.id).toBe('pinnacle');
  });

  test('resolves by exact id', async () => {
    const reg = await loadBookmakerRegistry();
    expect(resolveBookmakerEntry(reg, 'fanduel')?.id).toBe('fanduel');
    expect(resolveBookmakerEntry(reg, 'pinnacle')?.id).toBe('pinnacle');
  });

  test('resolves by label / domain / partial, case-insensitive', async () => {
    const reg = await loadBookmakerRegistry();
    expect(resolveBookmakerEntry(reg, 'FanDuel')?.id).toBe('fanduel');
    expect(resolveBookmakerEntry(reg, 'sportsbook.fanduel.com')?.id).toBe('fanduel');
    expect(resolveBookmakerEntry(reg, 'draft')?.id).toBe('draftkings');
    expect(resolveBookmakerEntry(reg, 'FANDUEL')?.id).toBe('fanduel');
  });

  test('resolves v0.4 slug / skin / urls.web host', async () => {
    const reg = await loadBookmakerRegistry();
    expect(resolveBookmakerEntry(reg, 'hard-rock-florida')?.id).toBe('hard-rock-florida');
    expect(resolveBookmakerEntry(reg, 'HardRockBet Florida')?.id).toBe('hard-rock-florida');
    expect(resolveBookmakerEntry(reg, 'hardrockfl.sportsbook.hardrock.bet')?.id).toBe(
      'hard-rock-florida'
    );
  });

  test('unknown or blank query → undefined', async () => {
    const reg = await loadBookmakerRegistry();
    expect(resolveBookmakerEntry(reg, 'no-such-book')).toBeUndefined();
    expect(resolveBookmakerEntry(reg, '   ')).toBeUndefined();
    expect(resolveBookmakerEntry(reg, '')).toBeUndefined();
  });

  test('works against a minimal fake registry (no label/domain fields)', () => {
    const fake: Record<string, BookmakerEntry> = { xyz: { id: 'xyz' } };
    expect(resolveBookmakerEntry(fake, 'xyz')?.id).toBe('xyz');
    expect(resolveBookmakerEntry(fake, 'XYZ')?.id).toBe('xyz');
    expect(resolveBookmakerEntry(fake, 'nope')).toBeUndefined();
  });
});
