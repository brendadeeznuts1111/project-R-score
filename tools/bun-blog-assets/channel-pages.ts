// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
import type { AssetManifest, AssetRecord } from './types.ts';

const ORIGIN = 'https://score.factory-wager.com';
const ROOT = 'public/channels/bun-1.4/videos';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

function posterFor(asset: AssetRecord, manifest: AssetManifest): AssetRecord {
  const poster = manifest.assets.find(candidate => candidate.id === asset.posterId);
  if (!poster) throw new Error(`video ${asset.id} is missing its manifest poster`);
  return poster;
}

function pagePath(asset: AssetRecord): string {
  return `${ROOT}/${asset.id}/index.html`;
}

export function buildBun14VideoSharePage(asset: AssetRecord, manifest: AssetManifest): string {
  const poster = posterFor(asset, manifest);
  const url = `${ORIGIN}/channels/bun-1.4/videos/${asset.id}/`;
  const source = asset.publicUrl;
  const image = poster.publicUrl;
  const title = `${asset.alt} · Bun 1.4 video`;
  const description = `${asset.alt} Official Bun 1.4 release media; ${manifest.rights.delivery}.`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}" />\n<link rel="canonical" href="${url}" /><link rel="alternate" type="application/rss+xml" title="Bun 1.4 videos" href="/feeds/v1/videos.xml" />\n<meta property="og:type" content="video.other" /><meta property="og:site_name" content="FactoryWager" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${escapeHtml(image)}" /><meta property="og:image:alt" content="${escapeHtml(poster.alt)}" /><meta property="og:video" content="${escapeHtml(source)}" /><meta property="og:video:type" content="video/mp4" />\n<meta name="twitter:card" content="player" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:image" content="${escapeHtml(image)}" /></head>\n<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><video controls muted playsinline preload="none" poster="${escapeHtml(image)}"><source src="${escapeHtml(source)}" type="video/mp4" /></video><p><a href="${escapeHtml(source)}">Official Bun MP4 source</a> · <a href="/feeds/v1/videos.xml">Videos RSS</a> · <a href="/portal/bun-1.4/">Release gallery</a></p></main></body></html>\n`;
}

export function buildBun14VideoSitemap(manifest: AssetManifest): string {
  const urls = manifest.assets
    .filter(asset => asset.kind === 'video')
    .map(asset => `${ORIGIN}/channels/bun-1.4/videos/${asset.id}/`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export async function syncBun14VideoSharePages(
  manifest: AssetManifest,
  check: boolean
): Promise<void> {
  const videos = manifest.assets.filter(asset => asset.kind === 'video');
  const expected = new Map(
    videos.map(asset => [pagePath(asset), buildBun14VideoSharePage(asset, manifest)])
  );
  expected.set('public/sitemap-bun-1.4-videos.xml', buildBun14VideoSitemap(manifest));
  for (const [path, contents] of expected) {
    const file = Bun.file(path);
    if (check) {
      if (!(await file.exists()) || (await file.text()) !== contents)
        throw new Error(`Bun 1.4 video share-page drift: ${path}`);
    } else await Bun.write(path, contents);
  }
}
