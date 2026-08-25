import { describe, expect, test } from 'bun:test';

const CHANNEL_URL = 'https://score.factory-wager.com/channels/bun-1.4/';
const FEEDS = [
  '/feeds/v1/all.xml',
  '/feeds/v1/images.xml',
  '/feeds/v1/videos.xml',
  '/feeds/v1/embeds.xml',
] as const;

describe('Bun 1.4 channel discovery', () => {
  test('publishes a crawlable channel page with canonical social and RSS metadata', async () => {
    const html = await Bun.file('public/channels/bun-1.4/index.html').text();
    expect(html).toContain(`rel="canonical" href="${CHANNEL_URL}"`);
    expect(html).toContain(`property="og:url" content="${CHANNEL_URL}"`);
    expect(html).toContain('property="og:image" content="https://bun.com/og/blog/bun-v1.4.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    for (const feed of FEEDS) expect(html).toContain(`href="${feed}"`);
  });

  test('advertises the channel from pages and search discovery documents', async () => {
    const [home, portal, gallery, sitemap, robots] = await Promise.all([
      Bun.file('public/index.html').text(),
      Bun.file('public/portal/index.html').text(),
      Bun.file('public/portal/bun-1.4/index.html').text(),
      Bun.file('public/sitemap-channels.xml').text(),
      Bun.file('public/robots.txt').text(),
    ]);
    for (const html of [home, portal]) {
      expect(html).toContain('rel="alternate"');
      expect(html).toContain('/feeds/v1/all.xml');
    }
    expect(gallery).toContain('/channels/bun-1.4/');
    expect(sitemap).toContain(CHANNEL_URL);
    expect(robots).toContain('Sitemap: https://score.factory-wager.com/sitemap.xml');
  });
});
