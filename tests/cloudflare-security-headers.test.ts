// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
import { describe, expect, test } from 'bun:test';
import { dataFormatCanonicalRedirect, onRequest } from '../functions/_middleware.ts';
import {
  CLOUDFLARE_SECURITY_HEADERS,
  inspectCloudflareSecurityHeaders,
  withCloudflareSecurityHeaders,
} from '../lib/http/cloudflare-security-headers.ts';

describe('Cloudflare security headers', () => {
  test('static _headers stays aligned with the shared edge contract', async () => {
    const text = await Bun.file('public/_headers').text();
    for (const [name, value] of Object.entries(CLOUDFLARE_SECURITY_HEADERS)) {
      expect(text).toContain(`${name}: ${value}`);
      expect(text.match(new RegExp(`^\\s+${name}:`, 'gmi'))?.length).toBe(1);
    }
  });

  test('contract blocks form, frame, and unused browser capabilities', () => {
    expect(CLOUDFLARE_SECURITY_HEADERS['Content-Security-Policy']).toContain(
      "form-action 'self'"
    );
    expect(CLOUDFLARE_SECURITY_HEADERS['Content-Security-Policy']).toContain(
      "frame-src 'none'"
    );
    expect(CLOUDFLARE_SECURITY_HEADERS['Permissions-Policy']).toContain(
      'display-capture=()'
    );
    expect(CLOUDFLARE_SECURITY_HEADERS['Permissions-Policy']).toContain(
      'gyroscope=()'
    );
  });

  test('middleware preserves route headers and applies browser protections', async () => {
    const response = await onRequest({
      request: new Request('https://factory-wager.com/portal/'),
      next: async () =>
        Response.json(
          { ok: true },
          {
            headers: {
              'Access-Control-Allow-Origin': 'https://factory-wager.com',
              'Cache-Control': 'public, max-age=15',
            },
          }
        ),
    });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://factory-wager.com'
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=15');
    for (const [name, value] of Object.entries(CLOUDFLARE_SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });

  test('root response advertises enhancement discovery without changing nested routes', async () => {
    const root = await onRequest({
      request: new Request('https://factory-wager.com/'),
      next: async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
    });
    expect(root.headers.get('Link')).toContain('</.well-known/experiments>; rel="help"');

    const nested = await onRequest({
      request: new Request('https://factory-wager.com/portal/'),
      next: async () => new Response('portal'),
    });
    expect(nested.headers.get('Link')).toBeNull();
  });

  test('data-format lab redirects unprotected Pages aliases to the Access host', async () => {
    const response = await onRequest({
      request: new Request('https://factory-wager.com/portal/labs/data-formats/?view=proof'),
      next: async () => {
        throw new Error('redirect must happen before the Pages asset is served');
      },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(
      'https://score.factory-wager.com/portal/labs/data-formats/?view=proof'
    );
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  test('data-format lab remains local and accepts both protected production hosts', () => {
    expect(
      dataFormatCanonicalRedirect(
        new Request('https://score.factory-wager.com/portal/registry/data-format-lab.json')
      )
    ).toBeNull();
    expect(
      dataFormatCanonicalRedirect(
        new Request('https://project-r-score.pages.dev/portal/labs/data-formats/')
      )
    ).toBeNull();
    expect(
      dataFormatCanonicalRedirect(new Request('http://localhost:8788/portal/labs/data-formats/'))
    ).toBeNull();
  });

  test('helper replaces weaker inherited values instead of appending duplicates', () => {
    const response = withCloudflareSecurityHeaders(
      new Response('ok', {
        headers: {
          'Referrer-Policy': 'unsafe-url',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      })
    );

    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  test('live inspector reports missing and mismatched headers without response bodies', () => {
    const headers = new Headers(CLOUDFLARE_SECURITY_HEADERS);
    headers.delete('Permissions-Policy');
    headers.set('Referrer-Policy', 'unsafe-url');

    expect(inspectCloudflareSecurityHeaders(headers)).toEqual([
      {
        name: 'Permissions-Policy',
        expected: CLOUDFLARE_SECURITY_HEADERS['Permissions-Policy'],
        actual: null,
      },
      {
        name: 'Referrer-Policy',
        expected: 'no-referrer',
        actual: 'unsafe-url',
      },
    ]);
  });
});
