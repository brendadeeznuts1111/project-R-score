// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  injectLiveReload,
  liveReloadClientScript,
  maybeInjectLiveReloadResponse,
  shouldEnableLiveReload,
} from '../lib/http/live-reload.ts';

describe('live-reload (browser HMR helper)', () => {
  test('injectLiveReload inserts client before </body>', () => {
    const html = '<html><body><h1>x</h1></body></html>';
    const out = injectLiveReload(html);
    expect(out).toContain('EventSource');
    expect(out).toContain('/__hmr');
    expect(out).toContain('serve-public-live-reload');
    expect(out.indexOf('EventSource')).toBeLessThan(out.indexOf('</body>'));
    // idempotent
    expect(injectLiveReload(out)).toBe(out);
  });

  test('liveReloadClientScript is non-empty', () => {
    expect(liveReloadClientScript().length).toBeGreaterThan(40);
  });

  test('maybeInjectLiveReloadResponse only rewrites HTML when enabled', async () => {
    const html = new Response('<html><body>hi</body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });
    const off = await maybeInjectLiveReloadResponse(html.clone(), false);
    expect(await off.text()).toBe('<html><body>hi</body></html>');

    const on = await maybeInjectLiveReloadResponse(html, true);
    expect(await on.text()).toContain('EventSource');
    expect(on.headers.get('Cache-Control')).toBe('no-store');

    const json = await maybeInjectLiveReloadResponse(
      Response.json({ ok: true }),
      true
    );
    expect(await json.json()).toEqual({ ok: true });
  });

  test('shouldEnableLiveReload defaults on for loopback', () => {
    expect(
      shouldEnableLiveReload({ host: '127.0.0.1', env: {}, argv: [] })
    ).toBe(true);
    expect(
      shouldEnableLiveReload({
        host: '0.0.0.0',
        env: { SERVE_PUBLIC_HMR: '0' },
        argv: [],
      })
    ).toBe(false);
    expect(
      shouldEnableLiveReload({
        host: '0.0.0.0',
        env: { SERVE_PUBLIC_HMR: '1' },
        argv: [],
      })
    ).toBe(true);
    expect(
      shouldEnableLiveReload({ host: '0.0.0.0', env: {}, argv: ['--hot'] })
    ).toBe(true);
  });
});
