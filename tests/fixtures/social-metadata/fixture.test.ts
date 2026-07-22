/**
 * @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
 * @see https://bun.com/docs/runtime/html-rewriter
 *
 * Social metadata from static HTML via HTMLRewriter (offline, deterministic).
 * Covers: Open Graph, Twitter Card fallback, title/description fallback,
 * relative URL resolution, and property name normalization (site_name → siteName).
 */
import { describe, expect, test } from 'bun:test';
import {
  extractSocialMetadataFromHtml,
  normalizeSocialKey,
} from '../../../lib/docs/extract-metadata.ts';
import { BunComSite, bunComOrigin, hrefFromInit } from '../../../lib/docs/bun-site-url.ts';

const BASE = bunComOrigin();
const ABS_OG_IMAGE = hrefFromInit({ ...BunComSite, pathname: '/og-image.png' });

const FULL_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Bun Blog</title>
  <meta property="og:title" content="Bun v1.3.14" />
  <meta property="og:description" content="WebView, SHA3, and more" />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Bun Blog" />
  <meta name="twitter:title" content="Twitter Title Fallback" />
  <meta name="description" content="Fallback description" />
</head>
<body></body>
</html>`;

describe('social-metadata-boundaries', () => {
  test('normalizeSocialKey maps site_name → siteName', () => {
    expect(normalizeSocialKey('site_name')).toBe('siteName');
    expect(normalizeSocialKey('title')).toBe('title');
    expect(normalizeSocialKey('unknown_prop')).toBeUndefined();
  });

  test('extracts Open Graph metadata with site_name normalization', async () => {
    const meta = await extractSocialMetadataFromHtml(FULL_HTML, BASE);
    expect(meta.title).toBe('Bun v1.3.14');
    expect(meta.description).toBe('WebView, SHA3, and more');
    expect(meta.image).toBe(ABS_OG_IMAGE);
    expect(meta.type).toBe('article');
    expect(meta.siteName).toBe('Bun Blog');
  });

  test('falls back to Twitter Card if OG absent', async () => {
    const html = `<html><head>
    <meta name="twitter:title" content="Twitter Title" />
    <meta name="twitter:description" content="Twitter Desc" />
  </head></html>`;
    const meta = await extractSocialMetadataFromHtml(html);
    expect(meta.title).toBe('Twitter Title');
    expect(meta.description).toBe('Twitter Desc');
  });

  test('falls back to <title> and meta description', async () => {
    const html = `<html><head>
    <title>Page Title</title>
    <meta name="description" content="Meta Desc" />
  </head></html>`;
    const meta = await extractSocialMetadataFromHtml(html);
    expect(meta.title).toBe('Page Title');
    expect(meta.description).toBe('Meta Desc');
  });

  test('keeps relative image if no baseUrl', async () => {
    const html = `<html><head>
    <meta property="og:image" content="/relative.png" />
  </head></html>`;
    const meta = await extractSocialMetadataFromHtml(html);
    expect(meta.image).toBe('/relative.png');
  });

  test('OG wins over Twitter when both present', async () => {
    const meta = await extractSocialMetadataFromHtml(FULL_HTML, BASE);
    expect(meta.title).not.toBe('Twitter Title Fallback');
    expect(meta.description).not.toBe('Fallback description');
  });

  test('reads name="og:*" (bun.com blog shape)', async () => {
    const html = `<html><head>
    <meta name="og:title" content="Named OG Title" />
    <meta name="og:image" content="/named.png" />
    <meta name="og:site_name" content="Bun" />
  </head></html>`;
    const meta = await extractSocialMetadataFromHtml(html, BASE);
    expect(meta.title).toBe('Named OG Title');
    expect(meta.image).toBe(hrefFromInit({ ...BunComSite, pathname: '/named.png' }));
    expect(meta.siteName).toBe('Bun');
  });
});
