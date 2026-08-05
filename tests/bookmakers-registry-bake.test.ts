// bookmakers-registry-bake.test.ts — portal bookmaker registry tenant wiring.
// Offline: asserts the committed mirror schema, the board page, and the
// route/chrome/weave registrations. Network-free (reads committed artifacts).

import { describe, expect, test } from 'bun:test';
import { buildBookmakersBake } from '../scripts/bake-bookmakers-board';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave';
import { auditPublicCatalog } from '../lib/bookmakers/migrate-v03-to-v04.ts';
import type { PublicBookmakerV04 } from '../lib/bookmakers/v04-types.ts';

const BOARD_PATH = 'public/portal/bookmakers/index.html';

describe('bookmakers registry mirror', () => {
  test('committed mirror is v0.4 public catalog shape', async () => {
    const payload = JSON.parse(await Bun.file('public/registry/bookmakers.json').text()) as {
      schemaVersion: number;
      artifact: { name: string; version: string; checksum?: string };
      bookmakers: Record<string, PublicBookmakerV04>;
      audit: { ok: boolean; issues: string[] };
      summary: { count: number; webview: number; rest: number; seat: number; sports: string[] };
    };
    expect(payload.schemaVersion).toBe(2);
    expect(payload.artifact.name).toBe('@factorywager/bookmakers');
    expect(payload.artifact.version).toMatch(/^0\.4\./);
    // v0.4 local mirror may omit registry checksum until package publish.
    if (payload.artifact.checksum) {
      expect(payload.artifact.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(payload.audit.ok).toBe(true);
    expect(payload.summary.count).toBeGreaterThanOrEqual(5);
    expect(payload.summary.webview + payload.summary.rest + (payload.summary.seat ?? 0)).toBe(
      payload.summary.count
    );
    expect(payload.bookmakers.fanduel).toBeDefined();
    expect(payload.bookmakers.pinnacle?.fetcher).toBe('rest');
    expect(payload.bookmakers.pinnacle?.sports).toContain('tennis');
  });

  test('branding fields (label, skin, brandGroup) are present in public catalog', async () => {
    const payload = JSON.parse(await Bun.file('public/registry/bookmakers.json').text()) as {
      bookmakers: Record<string, PublicBookmakerV04>;
    };
    const hr = payload.bookmakers['hard-rock-florida'];
    expect(hr).toBeDefined();
    expect(hr!.label).toBeTruthy();
    expect(hr!.skin).toBe('HardRockBet Florida');
    expect(hr!.brandGroup).toBe('Hard Rock International');
    for (const [id, b] of Object.entries(payload.bookmakers)) {
      expect(b.label, id).toBeTruthy();
      expect(b.brandGroup, id).toBeTruthy();
    }
  });

  test('slug equals id (v0.4 mode A) for every book', async () => {
    const payload = JSON.parse(await Bun.file('public/registry/bookmakers.json').text()) as {
      bookmakers: Record<string, PublicBookmakerV04>;
    };
    for (const [key, b] of Object.entries(payload.bookmakers)) {
      expect(b.id).toBe(b.slug);
      expect(key).toBe(b.id);
    }
  });

  test('public catalog has no ops secrets or live balance/health', async () => {
    const payload = JSON.parse(await Bun.file('public/registry/bookmakers.json').text()) as {
      bookmakers: Record<string, Record<string, unknown>>;
    };
    for (const [id, b] of Object.entries(payload.bookmakers)) {
      for (const secret of ['restBaseUrl', 'restProtocol', 'apiKeyEnv', 'envVars', 'balance', 'health']) {
        expect(b[secret], `${id}.${secret}`).toBeUndefined();
      }
      expect(b.urls && typeof b.urls === 'object').toBe(true);
      expect(Array.isArray(b.lifecycle)).toBe(true);
      expect(b.limits && typeof b.limits === 'object').toBe(true);
    }
  });

  test('ops desk holds private rest credentials (not under public/)', async () => {
    const ops = JSON.parse(
      await Bun.file('artifact-registry/bookmakers/v0.4.0/ops/books.json').text()
    ) as {
      bookmakers: Record<string, { restBaseUrl?: string; apiKeyEnv?: string }>;
    };
    expect(ops.bookmakers.pinnacle?.restBaseUrl).toContain('pinnacle');
    expect(ops.bookmakers.pinnacle?.apiKeyEnv).toBe('PINNACLE_API_KEY');
    expect(await Bun.file('public/registry/bookmakers-ops.json').exists()).toBe(false);
  });

  test('seat books carry desk-observed maxBetUsd enrichment', async () => {
    const payload = JSON.parse(await Bun.file('public/registry/bookmakers.json').text()) as {
      bookmakers: Record<string, { limits?: { maxBetUsd?: number | null } }>;
    };
    expect(payload.bookmakers['hard-rock-florida']?.limits?.maxBetUsd).toBe(500);
    expect(payload.bookmakers['parlay21-com']?.limits?.maxBetUsd).toBe(500);
    expect(payload.bookmakers.pinnacle?.limits?.maxBetUsd ?? null).toBeNull();
  });

  test('buildBookmakersBake flags an invalid registry', () => {
    const bad = buildBookmakersBake(
      { x: { fetcherType: 'scrape' } as unknown },
      '9.9.9',
      '0'.repeat(64),
      'fixed'
    );
    expect(bad.audit.ok).toBe(false);
    expect(bad.audit.issues.length).toBeGreaterThanOrEqual(2);
    expect(bad.summary.count).toBe(1);
  });

  test('buildBookmakersBake accepts v0.4 field names', () => {
    const ok = buildBookmakersBake(
      {
        pinnacle: {
          id: 'pinnacle',
          slug: 'pinnacle',
          label: 'Pinnacle',
          fetcher: 'rest',
          sports: ['tennis'],
          color: '#f59e0b',
          urls: { web: 'https://www.pinnacle.com' },
          brandGroup: 'Pinnacle',
        },
      },
      '0.4.0',
      'a'.repeat(64),
      'fixed'
    );
    expect(ok.schemaVersion).toBe(2);
    expect(ok.audit.ok).toBe(true);
    expect(ok.summary.rest).toBe(1);
  });

  test('auditPublicCatalog rejects secret leakage', () => {
    const audit = auditPublicCatalog({
      x: {
        id: 'x',
        slug: 'x',
        label: 'X',
        brandGroup: 'X',
        fetcher: 'seat',
        lifecycle: ['pre_match'],
        sports: ['tennis'],
        regions: [],
        urls: { web: 'https://x.example', api: null, limitsPage: null, termsPage: null },
        limits: { minBetUsd: null, maxBetUsd: null, liquidityTier: 'low' },
        restBaseUrl: 'https://secret',
      } as PublicBookmakerV04,
    });
    expect(audit.ok).toBe(false);
    expect(audit.issues.some(i => i.includes('restBaseUrl'))).toBe(true);
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
    const entry = PORTAL_OVERFLOW_NAV.find(n => n.id === 'bookmakers');
    expect(entry).toBeDefined();
    expect(entry?.href).toBe('/portal/bookmakers/');
  });

  test('weave surfaces + artifacts include the bookmakers entries', () => {
    const surface = PORTAL_WEAVE_SURFACES.find(s => s.id === 'bookmakers');
    expect(surface).toBeDefined();
    expect(surface?.href).toBe('/portal/bookmakers/');
    const artifact = PORTAL_WEAVE_ARTIFACTS.find(a => a.id === 'bookmakers-registry');
    expect(artifact).toBeDefined();
    expect(artifact?.href).toBe('/registry/bookmakers.json');
  });
});
