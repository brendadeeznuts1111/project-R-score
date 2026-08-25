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

  test('generates one external-source MP4 share page per manifest video', async () => {
    const manifest = await Bun.file('public/registry/bun-1.4-assets.json').json();
    const sitemap = await Bun.file('public/sitemap-bun-1.4-videos.xml').text();
    const videos = manifest.assets.filter((asset: { kind: string }) => asset.kind === 'video');
    expect(videos).toHaveLength(4);
    for (const video of videos) {
      expect(video.stewardship).toEqual({
        team: 'project-r-score-release-channel',
        reviewRole: 'release-channel-maintainer',
        responsibility: 'metadata-routing-and-rights-review',
      });
      const path = `public/channels/bun-1.4/videos/${video.id}/index.html`;
      const html = await Bun.file(path).text();
      expect(html).toContain(`property="og:video" content="${video.publicUrl}"`);
      expect(html).toContain('property="og:video:type" content="video/mp4"');
      expect(html).toContain('preload="none"');
      expect(html).toContain(`/channels/bun-1.4/videos/${video.id}/`);
      expect(sitemap).toContain(`/channels/bun-1.4/videos/${video.id}/`);
    }
  });
});
