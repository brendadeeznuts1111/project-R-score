// bookmakers-registry-bake.test.ts — portal bookmaker registry tenant wiring.
// Offline: asserts the committed mirror schema, the board page, and the
// route/chrome/weave registrations. Network-free (reads committed artifacts).

import { describe, expect, test } from 'bun:test';
import { buildBookmakersBake } from '../scripts/bake-bookmakers-board';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave';

const BOARD_PATH = 'public/portal/bookmakers/index.html';

describe('bookmakers registry mirror', () => {
  test('committed mirror matches the bake shape and is valid', async () => {
    const payload = JSON.parse(
      await Bun.file('public/registry/bookmakers.json').text(),
    ) as {
      schemaVersion: number;
      artifact: { name: string; version: string; checksum: string };
      bookmakers: Record<string, unknown>;
      audit: { ok: boolean; issues: string[] };
      summary: { count: number; webview: number; rest: number; seat: number; sports: string[] };
    };
    expect(payload.schemaVersion).toBe(1);
    expect(payload.artifact.name).toBe('@factorywager/bookmakers');
    expect(payload.artifact.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(payload.artifact.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.audit.ok).toBe(true);
    expect(payload.summary.count).toBeGreaterThanOrEqual(5);
    expect(payload.summary.webview + payload.summary.rest + (payload.summary.seat ?? 0)).toBe(
      payload.summary.count
    );
    expect(payload.bookmakers.fanduel).toBeDefined();
    expect(payload.bookmakers.pinnacle?.fetcherType).toBe('rest');
  });

  test('buildBookmakersBake flags an invalid registry', () => {
    const bad = buildBookmakersBake(
      { x: { fetcherType: 'scrape' } as unknown },
      '9.9.9',
      '0'.repeat(64),
      'fixed',
    );
    expect(bad.audit.ok).toBe(false);
    expect(bad.audit.issues.length).toBeGreaterThanOrEqual(2);
    expect(bad.summary.count).toBe(1);
  });
});

describe('portal wiring', () => {
  test('board page exists and is committed', async () => {
    const html = await Bun.file(BOARD_PATH).text();
    expect(html).toContain('/registry/bookmakers.json');
    expect(html).toContain('id="bookmakers-body"');
    expect(html).toContain('bookmakers-board.js');
    expect(html).toContain('id="bookmakers-filter"');
    expect(html).toContain('portal-hero');
  });

  test('route manifest exposes /portal/bookmakers/', async () => {
    const { PORTAL_HTML_ROUTES } = await import('../lib/http/portal-route-manifest');
    expect(PORTAL_HTML_ROUTES).toContain('/portal/bookmakers/');
  });

  test('chrome catalog lists the bookmakers nav entry', async () => {
    const { PORTAL_OVERFLOW_NAV } = await import('../lib/portal/chrome-catalog');
    const entry = PORTAL_OVERFLOW_NAV.find((n) => n.id === 'bookmakers');
    expect(entry).toBeDefined();
    expect(entry?.href).toBe('/portal/bookmakers/');
  });

  test('weave surfaces + artifacts include the bookmakers entries', () => {
    const surface = PORTAL_WEAVE_SURFACES.find((s) => s.id === 'bookmakers');
    expect(surface).toBeDefined();
    expect(surface?.href).toBe('/portal/bookmakers/');
    const artifact = PORTAL_WEAVE_ARTIFACTS.find((a) => a.id === 'bookmakers-registry');
    expect(artifact).toBeDefined();
    expect(artifact?.href).toBe('/registry/bookmakers.json');
  });
});
