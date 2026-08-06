import { describe, expect, test } from 'bun:test';
import {
  resolveBookmakerAccount,
  type BookmakerAccountCatalogEntry,
} from '../packages/partners/src/index.ts';

const REGISTRY = {
  'hard-rock-florida': {
    id: 'hard-rock-florida',
    label: 'Hard Rock Bet Florida',
    skin: 'HardRockBet Florida',
    brandGroup: 'Hard Rock International',
    urls: { web: 'https://hardrockfl.sportsbook.hardrock.bet' },
  },
  'parlay21-com': {
    id: 'parlay21-com',
    label: 'Parlay21',
    skin: 'Parlay21',
    brandGroup: 'Parlay21',
    urls: { web: 'https://parlay21.com' },
  },
} as const satisfies Readonly<Record<string, BookmakerAccountCatalogEntry>>;

describe('partner bookmaker account adapter', () => {
  test('resolves exact registry hosts and carries skin metadata', () => {
    expect(
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://parlay21.com/login',
        registry: REGISTRY,
      })
    ).toEqual({
      status: 'resolved',
      sportsbook: {
        sportsbookId: 'parlay21-com',
        accountEntrypointUrl: 'https://parlay21.com/login',
        host: 'parlay21.com',
        skinLabel: 'Parlay21',
        brandGroup: 'Parlay21',
        resolutionMethod: 'exact',
      },
    });
  });

  test('uses only explicit aliases for alternate account hosts', () => {
    const result = resolveBookmakerAccount({
      accountEntrypointUrl: 'https://account.hardrock.bet/login',
      registry: REGISTRY,
      hostAliases: { 'account.hardrock.bet': 'hard-rock-florida' },
    });
    expect(result).toMatchObject({
      status: 'resolved',
      sportsbook: {
        sportsbookId: 'hard-rock-florida',
        skinLabel: 'HardRockBet Florida',
        resolutionMethod: 'alias',
      },
    });
  });

  test('stops unknown hosts for manual review unless an operator selects a registered book', () => {
    expect(
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://newskin.example/login',
        registry: REGISTRY,
      })
    ).toEqual({
      status: 'manual_review',
      accountEntrypointUrl: 'https://newskin.example/login',
      host: 'newskin.example',
      reason: 'unregistered_host',
    });
    expect(
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://newskin.example/login',
        registry: REGISTRY,
        manualSportsbookId: 'parlay21-com',
      })
    ).toMatchObject({
      status: 'resolved',
      sportsbook: { sportsbookId: 'parlay21-com', resolutionMethod: 'manual' },
    });
  });

  test('rejects secret-bearing URLs, unknown targets, and ambiguous registry hosts', () => {
    expect(() =>
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://user:secret@parlay21.com/login?token=x',
        registry: REGISTRY,
      })
    ).toThrow('must not contain credentials');
    expect(() =>
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://newskin.example/login',
        registry: REGISTRY,
        hostAliases: { 'newskin.example': 'missing-book' },
      })
    ).toThrow('is not registered');
    expect(() =>
      resolveBookmakerAccount({
        accountEntrypointUrl: 'https://parlay21.com/login',
        registry: {
          ...REGISTRY,
          duplicate: { id: 'other-book', urls: { web: 'https://www.parlay21.com' } },
        },
      })
    ).toThrow('matches multiple registered sportsbooks');
  });
});
