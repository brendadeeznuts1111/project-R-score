import { describe, expect, test } from 'bun:test';
import { buildBun14VideoSitemap, escapeXml } from '../tools/bun-blog-assets/channel-pages.ts';
import { DEFAULT_MANIFEST_PATH } from '../tools/bun-blog-assets/constants.ts';
import type { AssetManifest } from '../tools/bun-blog-assets/types.ts';

type SitemapDoc = { urlset: { url?: { loc: string } | Array<{ loc: string }> } };

// Bun.XML.parse compact mode returns a plain object for a single <url> and an
// array for several, so normalize with [x ?? []].flat().
function locs(xml: string): string[] {
  const doc = Bun.XML.parse(xml) as SitemapDoc;
  return [doc.urlset.url ?? []].flat().map(entry => entry.loc);
}

function manifestWith(ids: string[]): AssetManifest {
  return {
    assets: [
      ...ids.map(id => ({ id, kind: 'video' })),
      { id: 'poster-<not-a-video>', kind: 'image' },
    ],
  } as unknown as AssetManifest;
}

describe('Bun 1.4 video sitemap <loc> escaping', () => {
  test('escapeXml escapes all five XML special characters', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
    expect(escapeXml('plain-id')).toBe('plain-id');
  });

  test('loc values with XML special characters stay well-formed and round-trip', () => {
    const ids = [`a&b`, `c<d>e`, `q"uote'`];
    const xml = buildBun14VideoSitemap(manifestWith(ids));
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    expect(locs(xml)).toEqual(
      ids.map(id => `https://score.factory-wager.com/channels/bun-1.4/videos/${id}/`)
    );
  });

  test('a single video still parses to one loc (compact-mode single child)', () => {
    const xml = buildBun14VideoSitemap(manifestWith(['x&y']));
    expect(locs(xml)).toEqual(['https://score.factory-wager.com/channels/bun-1.4/videos/x&y/']);
  });

  test('no videos yields an empty urlset', () => {
    expect(locs(buildBun14VideoSitemap(manifestWith([])))).toEqual([]);
  });

  test('committed sitemap is unchanged for the real manifest', async () => {
    const manifest = (await Bun.file(DEFAULT_MANIFEST_PATH).json()) as AssetManifest;
    const committed = await Bun.file('public/sitemap-bun-1.4-videos.xml').text();
    expect(buildBun14VideoSitemap(manifest)).toBe(committed);
  });
});
