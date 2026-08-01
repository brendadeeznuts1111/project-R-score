// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { expectJs, expectPortalPage } from '../tools/verify-pages-edge.ts';

function accessResponse(): Response {
  return new Response('<html>Cloudflare Access</html>', {
    status: 302,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      Location:
        'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/project-r-score.pages.dev',
    },
  });
}

describe('Pages edge verifier behind Cloudflare Access', () => {
  test('treats a protected portal script as healthy Access enforcement', async () => {
    const calls: RequestInit[] = [];
    const detail = await expectJs('/portal/data.js', (async (_input, init) => {
      calls.push(init ?? {});
      return accessResponse();
    }) as typeof fetch);

    expect(detail).toBe('/portal/data.js 302 Access');
    expect(calls[0].redirect).toBe('manual');
  });

  test('treats a protected portal page as healthy Access enforcement', async () => {
    const detail = await expectPortalPage(
      '/portal/env/',
      (async () => accessResponse()) as typeof fetch
    );

    expect(detail).toBe('/portal/env/ 302 Access');
  });
});
