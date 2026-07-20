/**
 * TokenRef northstar — locus resolution + catalog adapter.
 */
import { describe, expect, test } from 'bun:test';
import { buildPageAnchorIndex, resolveVerifiedLocus } from '../lib/docs/locus-resolve.ts';
import { catalogEntryToTokenRef } from '../lib/docs/token-ref-adapter.ts';
import { locusUrl, locusResolved, historyAttested } from '../lib/docs/token-ref.ts';

describe('locus-resolve', () => {
  test('prefers CANONICAL_REFS fragment when in index anchors', () => {
    const page = 'https://bun.com/docs/runtime/utils';
    const anchors = buildPageAnchorIndex([
      { url: `${page}.md`, anchors: ['bun-stringwidth', 'bun-inspect'] },
    ]);
    const refs = { 'Bun.stringWidth': `${page}#bun-stringwidth` };
    const { locus } = resolveVerifiedLocus(
      { name: 'Bun.stringWidth', canonicalPage: page },
      refs,
      anchors,
      '2026-07-20T00:00:00.000Z'
    );
    expect(locus.fragment).toBe('bun-stringwidth');
    expect(locus.unresolved).toBe(false);
    expect(locusUrl(locus)).toBe(`${page}#bun-stringwidth`);
  });

  test('marks page-only when fragment not verified', () => {
    const page = 'https://bun.com/docs/runtime/shell';
    const anchors = buildPageAnchorIndex([{ url: `${page}.md`, anchors: ['other'] }]);
    const { locus } = resolveVerifiedLocus(
      { name: 'Bun.$', canonicalPage: page, anchor: 'wrong-heading' },
      {},
      anchors,
      '2026-07-20T00:00:00.000Z'
    );
    expect(locus.unresolved).toBe(true);
    expect(locus.fragment).toBeUndefined();
  });

  test('verifies CANONICAL_REFS fragment against canonical page, not scrape page', () => {
    const dump = 'https://bun.com/docs/runtime/bun-apis';
    const tcp = 'https://bun.com/docs/runtime/networking/tcp';
    const anchors = buildPageAnchorIndex([
      { url: `${dump}.md`, anchors: [] },
      { url: `${tcp}.md`, anchors: ['create-a-connection-bun-connect'] },
    ]);
    const refs = {
      'Bun.connect': `${tcp}#create-a-connection-bun-connect`,
    };
    const { locus, provenance } = resolveVerifiedLocus(
      { name: 'Bun.connect', canonicalPage: dump },
      refs,
      anchors,
      '2026-07-20T00:00:00.000Z'
    );
    expect(locus.page).toBe(tcp);
    expect(locus.fragment).toBe('create-a-connection-bun-connect');
    expect(locus.unresolved).toBe(false);
    expect(provenance.confidence).toBe(1);
  });

  test('resolveName alias hits CANONICAL_REFS', () => {
    const page = 'https://bun.com/docs/runtime/redis';
    const anchors = buildPageAnchorIndex([
      { url: `${page}.md`, anchors: ['getting-started'] },
    ]);
    const refs = { RedisClient: `${page}#getting-started` };
    const { locus } = resolveVerifiedLocus(
      { name: 'Bun.redis', canonicalPage: 'https://bun.com/docs/runtime/bun-apis' },
      refs,
      anchors,
      '2026-07-20T00:00:00.000Z',
      { resolveName: n => (n === 'Bun.redis' ? 'RedisClient' : n) }
    );
    expect(locus.page).toBe(page);
    expect(locus.fragment).toBe('getting-started');
  });
});

describe('token-ref adapter', () => {
  test('catalogEntryToTokenRef maps history and locus', () => {
    const ref = catalogEntryToTokenRef({
      name: 'Bun.Image',
      type: 'api',
      stability: 'stable',
      description: 'Image pipeline',
      releasedIn: '1.3.14',
      canonicalPage: 'https://bun.com/docs/runtime/image',
      anchor: 'bun-image',
      locusUnresolved: false,
      allPages: ['https://bun.com/docs/runtime/image'],
      section: 'runtime',
      examples: [{ lang: 'ts', body: 'Bun.image(buffer)' }],
      related: ['Bun.file'],
    });
    expect(ref.name).toBe('Bun.Image');
    expect(ref.locus.fragment).toBe('bun-image');
    expect(ref.examples[0]?.lang).toBe('ts');
    expect(ref.history.introduced).toBe('1.3.14');
    expect(ref.relations.some(r => r.target === 'Bun.file')).toBe(true);
    expect(locusResolved(ref.locus)).toBe(true);
    expect(historyAttested(ref.history)).toBe(true);
  });
});
