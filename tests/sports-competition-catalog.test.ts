import { describe, expect, test } from 'bun:test';

import {
  buildSportsTaxonomyArtifact,
  COMPETITIONS,
  countryFlagEmoji,
  LEAGUES,
  resolveCompetitionContext,
  SPORTS_COUNTRIES,
  sportsTaxonomyGlossaryConcepts,
  validateSportsTaxonomy,
} from '../lib/operations/sports-competition-catalog.ts';

describe('sports competition taxonomy', () => {
  test('keeps the hierarchy and geography references internally consistent', () => {
    expect(validateSportsTaxonomy()).toBeUndefined();
    expect(LEAGUES).toHaveLength(18);
    expect(COMPETITIONS).toHaveLength(13);
    expect(SPORTS_COUNTRIES).toHaveLength(24);
  });

  test('builds accessible country flags from ISO alpha-2 codes', () => {
    expect(countryFlagEmoji('US')).toBe('🇺🇸');
    expect(countryFlagEmoji('GB')).toBe('🇬🇧');
    expect(SPORTS_COUNTRIES.find(country => country.code === 'BR')).toMatchObject({
      label: 'Brazil',
      region: 'south_america',
      flagEmoji: '🇧🇷',
      flagAriaLabel: 'Brazil flag',
    });
  });

  test('infers ITF hierarchy while assigning flags from event host country', () => {
    const global = resolveCompetitionContext({ competition: 'itf_m25' });
    expect(global).toMatchObject({
      sport: { key: 'tennis' },
      league: { key: 'itf', scope: 'global' },
      competition: { key: 'itf_m25', tier: 'M25' },
      hostCountry: null,
      flagEmoji: '🌐',
      issues: [],
    });

    const hosted = resolveCompetitionContext({
      competition: 'itf_m25',
      hostCountry: 'BR',
    });
    expect(hosted.flagEmoji).toBe('🇧🇷');
    expect(hosted.flagAriaLabel).toBe('Brazil flag');
  });

  test('reports contradictory dimensions instead of silently coercing them', () => {
    const context = resolveCompetitionContext({
      sport: 'basketball',
      league: 'nfl',
      competition: 'itf_w50',
    });
    expect(context.issues).toEqual([
      'Competition itf_w50 belongs to league itf.',
      'Competition itf_w50 belongs to sport tennis.',
      'League nfl belongs to sport american_football.',
    ]);
  });

  test('projects glossary-native concepts and a portal registry artifact', () => {
    const concepts = sportsTaxonomyGlossaryConcepts();
    expect(concepts).toHaveLength(63);
    expect(concepts.find(concept => concept.id === 'league.itf')).toMatchObject({
      parentId: 'sport.tennis',
      scope: 'global',
      flagEmoji: '🌐',
    });
    expect(concepts.find(concept => concept.id === 'country.us')).toMatchObject({
      parentId: 'region.north_america',
      flagEmoji: '🇺🇸',
      countryCodes: ['US'],
    });

    const artifact = buildSportsTaxonomyArtifact('2026-07-31T00:00:00.000Z');
    expect(artifact).toMatchObject({
      schemaVersion: 1,
      kind: 'sports-competition-taxonomy',
      path: '/registry/sports-taxonomy.json',
      semantics: {
        hierarchy: ['sport', 'league', 'competition', 'event_host_country'],
        flagOwner: 'event_host_country',
        globalMarker: '🌐',
      },
      summary: {
        sports: 8,
        regions: 5,
        countries: 24,
        leagues: 18,
        competitions: 13,
        glossaryConcepts: 63,
      },
    });
  });
});

describe('Limits Forecast Lab taxonomy integration', () => {
  test('loads the registry artifact and preserves URL-addressable dimensions', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/limits-lab/index.html').text(),
      Bun.file('public/portal/limits-lab/limits-lab.js').text(),
    ]);
    expect(html).toContain('id="section:sports-taxonomy"');
    expect(html).toContain('Event host country');
    expect(script).toContain("const TAXONOMY_URL = '/registry/sports-taxonomy.json'");
    expect(script).toContain("url.searchParams.set(key, value)");
    expect(script).toContain("url.hash = '#section:sports-taxonomy'");
  });
});
