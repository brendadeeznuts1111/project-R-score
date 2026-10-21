import { describe, expect, test } from 'bun:test';
import { buildBun14VideoSitemap, escapeXml } from '../tools/bun-blog-assets/channel-pages.ts';
import type { AssetManifest } from '../tools/bun-blog-assets/types.ts';

const NASTY = `a&b<c>"d'e]]>`;

describe('channel-pages XML escaping', () => {
  test('escapeXml escapes & < > " \'', () => {
    expect(escapeXml(NASTY)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;e]]&gt;');
  });

  test('sitemap <loc> values are escaped and well-formed', () => {
    const manifest = {
      assets: [
        { id: NASTY, kind: 'video' },
        { id: 'poster', kind: 'image' },
      ],
    } as unknown as AssetManifest;
    const xml = buildBun14VideoSitemap(manifest);
    expect(xml).toContain(
      '<loc>https://score.factory-wager.com/channels/bun-1.4/videos/a&amp;b&lt;c&gt;&quot;d&apos;e]]&gt;/</loc>'
    );
    expect(xml).not.toContain(NASTY);
    const parsed = Bun.XML.parse(xml) as { urlset: { url: { loc: string } } };
    expect(parsed.urlset.url.loc).toBe(`https://score.factory-wager.com/channels/bun-1.4/videos/${NASTY}/`);
  });
});
