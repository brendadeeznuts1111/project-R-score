/**
 * BunToken export contract — catalog → TokenRef → BunToken.
 */
import { describe, expect, test } from 'bun:test';
import {
  announcementUrlFromEvents,
  buildVersionEvents,
  sinceFromEvents,
  toBunTokenKind,
} from '../lib/docs/bun-token.ts';
import { catalogEntryToBunToken, catalogEntryToTokenRef } from '../lib/docs/token-ref-adapter.ts';

describe('toBunTokenKind', () => {
  test('maps fine types to coarse kinds', () => {
    expect(toBunTokenKind('api')).toBe('API');
    expect(toBunTokenKind('cli-flag')).toBe('CLI');
    expect(toBunTokenKind('config-key')).toBe('Config');
    expect(toBunTokenKind('env-var')).toBe('Env');
    expect(toBunTokenKind('package-json-key')).toBe('PackageJson');
    expect(toBunTokenKind('concept')).toBe('Concept');
  });
});

describe('buildVersionEvents', () => {
  test('prefers overlay hits over scalars and sorts by version', () => {
    const events = buildVersionEvents({
      hits: [
        {
          version: '1.3.0',
          url: 'https://bun.com/blog/bun-v1.3',
          section: 'Features',
          kind: 'ship',
        },
        {
          version: '1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          section: 'Bugfixes',
          kind: 'fix',
        },
        {
          version: '1.2.0',
          url: 'https://bun.com/blog/bun-v1.2.0',
          section: 'Earlier',
          kind: 'ship',
        },
      ],
      introduced: '1.3.0', // should not duplicate 1.3.0 since
      fixed: '1.3.14',
    });
    expect(events[0]!.version).toBe('1.2.0');
    expect(events[0]!.type).toBe('since');
    expect(events.some(e => e.type === 'fixed' && e.version === '1.3.14')).toBe(true);
    expect(sinceFromEvents(events)).toBe('1.2.0');
  });

  test('falls back to scalars when no hits', () => {
    const events = buildVersionEvents({
      introduced: '1.0.0',
      changed: '1.1.0',
      changeNote: 'API tweak',
      evidenceUrl: 'https://bun.com/blog/bun-v1.0',
    });
    expect(events).toEqual([
      {
        version: '1.0.0',
        type: 'since',
        date: null,
        evidenceUrl: 'https://bun.com/blog/bun-v1.0',
      },
      {
        version: '1.1.0',
        type: 'changed',
        date: null,
        note: 'API tweak',
        evidenceUrl: 'https://bun.com/blog/bun-v1.0',
      },
    ]);
  });
});

describe('announcementUrlFromEvents', () => {
  test('prefers anchored catalog blogUrl when since evidence is bare same post', () => {
    const events = buildVersionEvents({
      introduced: '1.4.0',
      eventUrls: { since: 'https://bun.com/blog/bun-v1.4' },
    });
    expect(
      announcementUrlFromEvents(events, 'https://bun.com/blog/bun-v1.4#cpu-prof-md')
    ).toBe('https://bun.com/blog/bun-v1.4#cpu-prof-md');
  });

  test('prefers earliest since event evidenceUrl over catalog blogUrl fallback', () => {
    const events = buildVersionEvents({
      hits: [
        {
          version: '1.2.0',
          url: 'https://bun.com/blog/bun-v1.2.0',
          section: 'Bun.cron',
          kind: 'ship',
        },
        {
          version: '1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          section: 'Bugfixes',
          kind: 'fix',
        },
      ],
    });
    expect(
      announcementUrlFromEvents(events, 'https://bun.com/blog/bun-v1.3.14')
    ).toBe('https://bun.com/blog/bun-v1.2.0');
  });

  test('falls back to catalog blogUrl when no since evidence', () => {
    const events = buildVersionEvents({
      hits: [
        {
          version: '1.3.14',
          url: 'https://bun.com/blog/bun-v1.3.14',
          section: 'Bugfixes',
          kind: 'fix',
        },
      ],
    });
    expect(
      announcementUrlFromEvents(events, 'https://bun.com/blog/bun-v1.3.14')
    ).toBe('https://bun.com/blog/bun-v1.3.14');
  });

  test('prefers ship-hit blog over older scalar since with docs evidenceUrl', () => {
    const events = buildVersionEvents({
      hits: [
        {
          version: '1.2.0',
          url: 'https://bun.com/blog/bun-v1.2.0',
          section: 'Bun.cron',
          kind: 'ship',
        },
      ],
      introduced: '1.0.0',
      evidenceUrl: 'https://github.com/oven-sh/bun/releases/tag/bun-v1.0.0',
    });
    expect(announcementUrlFromEvents(events, null)).toBe('https://bun.com/blog/bun-v1.2.0');
  });
});

describe('catalogEntryToBunToken', () => {
  test('maps through TokenRef to BunToken export shape', () => {
    const entry = {
      name: 'Bun.cron',
      type: 'api',
      stability: 'stable',
      description: 'In-process cron scheduler',
      releasedIn: '1.2.0',
      fixedIn: '1.3.5',
      canonicalPage: 'https://bun.com/docs/runtime/cron',
      anchor: 'bun-cron',
      locusUnresolved: false,
      blogUrl: 'https://bun.com/blog/bun-v1.2.0',
      allPages: ['https://bun.com/docs/runtime/cron'],
      section: 'runtime',
      related: ['Bun.serve'],
      examples: [{ lang: 'ts', body: 'Bun.cron("*/5 * * * *", () => {})' }],
      verifiedOn: '1.4.0',
      lastUpdated: '2026-07-20T00:00:00.000Z',
    };
    const ref = catalogEntryToTokenRef(entry);
    expect(ref.id).toBeTruthy();
    expect(ref.history.introduced).toBe('1.2.0');

    const token = catalogEntryToBunToken(entry, {
      hits: [
        {
          version: '1.2.0',
          url: 'https://bun.com/blog/bun-v1.2.0',
          section: 'Bun.cron',
          kind: 'ship',
        },
        {
          version: '1.3.5',
          url: 'https://bun.com/blog/bun-v1.3.5',
          section: 'Bugfixes',
          kind: 'fix',
        },
      ],
    });
    expect(token.kind).toBe('API');
    expect(token.description).toBe('In-process cron scheduler');
    expect(token.docsLocus).toEqual({
      page: 'https://bun.com/docs/runtime/cron',
      anchor: 'bun-cron',
    });
    expect(token.since).toBe('1.2.0');
    expect(token.announcementUrl).toBe('https://bun.com/blog/bun-v1.2.0');
    expect(token.versionEvents.length).toBe(2);
    expect(token.examples[0]).toEqual({
      lang: 'ts',
      code: 'Bun.cron("*/5 * * * *", () => {})',
    });
    expect(token.related).toContain('Bun.serve');
    expect(token.meta?.buildPin).toBe('1.4.0');
  });

  test('announcementUrl uses earliest since hit, not latest catalog blogUrl', () => {
    const token = catalogEntryToBunToken(
      {
        name: 'Bun.cron',
        type: 'api',
        stability: 'stable',
        description: 'In-process cron scheduler',
        releasedIn: '1.2.0',
        canonicalPage: 'https://bun.com/docs/runtime/cron',
        anchor: 'bun-cron',
        blogUrl: 'https://bun.com/blog/bun-v1.3.14',
        allPages: ['https://bun.com/docs/runtime/cron'],
        section: 'runtime',
      },
      {
        hits: [
          {
            version: '1.2.0',
            url: 'https://bun.com/blog/bun-v1.2.0',
            section: 'Bun.cron',
            kind: 'ship',
          },
          {
            version: '1.3.14',
            url: 'https://bun.com/blog/bun-v1.3.14',
            section: 'Bugfixes',
            kind: 'fix',
          },
        ],
      }
    );
    expect(token.announcementUrl).toBe('https://bun.com/blog/bun-v1.2.0');
    expect(token.since).toBe('1.2.0');
  });

  test('unresolved locus yields null anchor', () => {
    const token = catalogEntryToBunToken({
      name: 'Bun.$',
      type: 'api',
      stability: 'stable',
      description: 'Shell',
      canonicalPage: 'https://bun.com/docs/runtime/shell',
      locusUnresolved: true,
      allPages: ['https://bun.com/docs/runtime/shell'],
      section: 'runtime',
    });
    expect(token.docsLocus.anchor).toBeNull();
  });

  test('catalogEntryToBunToken reads releaseHits from entry shape (getBunToken path)', () => {
    const token = catalogEntryToBunToken(
      {
        name: 'Bun.WebView',
        type: 'api',
        stability: 'stable',
        description: 'Headless browser control',
        releasedIn: '1.4.0',
        canonicalPage: 'https://bun.com/docs/runtime/webview',
        allPages: ['https://bun.com/docs/runtime/webview'],
        section: 'runtime',
        releaseHits: [
          {
            version: '1.4.0',
            url: 'https://bun.com/blog/bun-v1.4.0',
            section: 'WebView',
            kind: 'ship',
          },
        ],
      },
      {}
    );
    expect(token.since).toBe('1.4.0');
    expect(token.versionEvents.some(e => e.version === '1.4.0')).toBe(true);
  });
});

describe('getBunToken embedded hits', () => {
  test('returns version events from catalog releaseHits without overlay file', async () => {
    const { getBunToken } = await import('../tools/bun-docs-catalog.ts');
    const token = await getBunToken('Bun.WebView');
    if (!token) return;
    expect(token.versionEvents.length).toBeGreaterThan(0);
    expect(token.since).toBeTruthy();
  });
});
