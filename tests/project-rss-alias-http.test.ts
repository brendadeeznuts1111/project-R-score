import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  projectRSSAliasRedirects,
  projectRSSAliasRoutes,
} from '../lib/rss/project-channel-registry.ts';
import { respondRSSDocument } from '../lib/rss/rss-response.ts';
import { parseRSSFeed } from '../lib/rss/rss-xml.ts';
import { readCapabilityRegistry } from '../tools/bun-blog-assets/capabilities.ts';
import { buildBun14AssetFeeds } from '../tools/bun-blog-assets/feed.ts';
import { readManifest } from '../tools/bun-blog-assets/storage.ts';

let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  const manifest = await readManifest('public/registry/bun-1.4-assets.json');
  const capabilities = await readCapabilityRegistry(manifest);
  const documents = buildBun14AssetFeeds(manifest, capabilities);
  const canonicalRoutes = Object.fromEntries(
    documents.map(document => [
      new URL(document.endpoint).pathname,
      (request: Request) =>
        respondRSSDocument(document, request, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    ])
  );
  server = Bun.serve({
    port: 0,
    routes: { ...canonicalRoutes, ...projectRSSAliasRoutes() },
    fetch: () => new Response('Not found', { status: 404 }),
  });
});

afterAll(() => server.stop(true));

describe('project RSS aliases over Bun.serve', () => {
  test('redirects to the one canonical byte and validator owner', async () => {
    for (const [alias, canonical] of projectRSSAliasRedirects()) {
      const manual = await fetch(new URL(alias, server.url), { redirect: 'manual' });
      expect(manual.status).toBe(301);
      expect(manual.headers.get('Location')).toBe(canonical);

      const [canonicalResponse, aliasResponse] = await Promise.all([
        fetch(new URL(canonical, server.url)),
        fetch(new URL(alias, server.url)),
      ]);
      expect(aliasResponse.url).toBe(new URL(canonical, server.url).href);
      expect(aliasResponse.status).toBe(200);
      expect(aliasResponse.headers.get('ETag')).toBe(canonicalResponse.headers.get('ETag'));
      expect(aliasResponse.headers.get('Last-Modified')).toBe(
        canonicalResponse.headers.get('Last-Modified')
      );
      expect(aliasResponse.headers.get('Content-Length')).toBe(
        canonicalResponse.headers.get('Content-Length')
      );
      const canonicalBytes = new Uint8Array(await canonicalResponse.arrayBuffer());
      const aliasBytes = new Uint8Array(await aliasResponse.arrayBuffer());
      expect(aliasBytes).toEqual(canonicalBytes);
      expect(parseRSSFeed(aliasBytes).selfUrl).toBe(new URL(canonical, server.url).href.replace(
        server.url.origin,
        'https://score.factory-wager.com'
      ));
    }
  });

  test('preserves HEAD and conditional semantics after redirect resolution', async () => {
    const [alias, canonical] = [...projectRSSAliasRedirects()][0]!;
    const canonicalResponse = await fetch(new URL(canonical, server.url));
    const etag = canonicalResponse.headers.get('ETag')!;
    await canonicalResponse.body?.cancel();

    const head = await fetch(new URL(alias, server.url), { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.url).toBe(new URL(canonical, server.url).href);
    expect(head.headers.get('ETag')).toBe(etag);
    expect(await head.text()).toBe('');

    const notModified = await fetch(new URL(alias, server.url), {
      headers: { 'If-None-Match': etag },
    });
    expect(notModified.status).toBe(304);
    expect(notModified.headers.get('ETag')).toBe(etag);
    expect(await notModified.text()).toBe('');
  });

  test('rejects unsupported methods and never falls back for unknown projects', async () => {
    const alias = [...projectRSSAliasRedirects().keys()][0]!;
    const post = await fetch(new URL(alias, server.url), { method: 'POST', redirect: 'manual' });
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET, HEAD');

    const unknown = await fetch(
      new URL('/feeds/v1/projects/scanner/bun-1.4/all.xml', server.url),
      { redirect: 'manual' }
    );
    expect(unknown.status).toBe(404);
  });
});
