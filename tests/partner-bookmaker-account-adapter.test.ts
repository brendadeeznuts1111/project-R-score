import { describe, expect, test } from 'bun:test';
import {
  parseBookmakerCatalogArtifact,
  resolveBookmakerAccount,
} from '../packages/partners/src/index.ts';

const ARTIFACT = {
  schemaVersion: 2,
  generatedAt: '2026-08-06T12:00:00.000Z',
  artifact: {
    name: '@factorywager/bookmakers',
    version: '0.4.1',
    checksum: 'a'.repeat(64),
    source: 'artifact-registry',
  },
  bookmakers: {
    'hard-rock-florida': {
      id: 'hard-rock-florida',
      slug: 'hard-rock-florida',
      label: 'Hard Rock Bet Florida',
      skin: 'HardRockBet Florida',
      brandGroup: 'Hard Rock International',
      urls: { web: 'https://hardrockfl.sportsbook.hardrock.bet' },
    },
    'parlay21-com': {
      id: 'parlay21-com',
      slug: 'parlay21-com',
      label: 'Parlay21',
      skin: 'Parlay21',
      brandGroup: 'Parlay21',
      urls: { web: 'https://parlay21.com' },
    },
  },
};

const REGISTRY = parseBookmakerCatalogArtifact(ARTIFACT).registry;

describe('partner bookmaker account adapter', () => {
  test('parses the checked-in public catalog into a safe partner intake projection', async () => {
    const artifact = await Bun.file(`${import.meta.dir}/../public/registry/bookmakers.json`).json();
    const projection = parseBookmakerCatalogArtifact(artifact);
    expect(Object.keys(projection.registry)).toHaveLength(10);
    expect(projection.registry['hard-rock-florida']).toEqual({
      id: 'hard-rock-florida',
      slug: 'hard-rock-florida',
      label: 'Hard Rock Florida',
      skin: 'HardRockBet Florida',
      brandGroup: 'Hard Rock International',
      urls: { web: 'https://hardrockfl.sportsbook.hardrock.bet/' },
    });
    expect(JSON.stringify(projection.registry)).not.toMatch(
      /apiKeyEnv|restBaseUrl|webViewConfig|color|note/
    );
  });

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

  test('rejects secret-bearing URLs and unknown targets', () => {
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
  });

  test('rejects catalog identity drift, duplicate hosts, and ops-only fields', () => {
    const identityDrift = structuredClone(ARTIFACT);
    identityDrift.bookmakers['parlay21-com'].slug = 'wrong-book';
    expect(() => parseBookmakerCatalogArtifact(identityDrift)).toThrow(
      'object key === id === slug'
    );

    const duplicateHost = structuredClone(ARTIFACT) as typeof ARTIFACT & {
      bookmakers: Record<string, unknown>;
    };
    duplicateHost.bookmakers['other-book'] = {
      id: 'other-book',
      slug: 'other-book',
      label: 'Other',
      urls: { web: 'https://www.parlay21.com' },
    };
    expect(() => parseBookmakerCatalogArtifact(duplicateHost)).toThrow(
      'duplicates host owned by parlay21-com'
    );

    const leakedOps = structuredClone(ARTIFACT) as typeof ARTIFACT & {
      bookmakers: Record<string, unknown>;
    };
    leakedOps.bookmakers['parlay21-com'] = {
      ...ARTIFACT.bookmakers['parlay21-com'],
      apiKeyEnv: 'SECRET_NAME',
    };
    expect(() => parseBookmakerCatalogArtifact(leakedOps)).toThrow(
      'apiKeyEnv is ops-only and forbidden'
    );
  });
});
