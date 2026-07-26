import { describe, expect, test } from 'bun:test';
import {
  TOC_OPS_SURFACES,
  TOC_OPS_TITLE_PREFIX,
  TOC_OPS_TITLE_SEP,
  assertTocOpsGroupTitle,
  formatPackageGroupTitle,
  formatTocOpsGroupTitle,
  getSurface,
  inferSurfaceSlug,
  parseTelegramSurfacesMap,
  parseTocOpsGroupTitle,
  preferredSurfaceForOutboxTopic,
  resolveOpsChatForOutbox,
  resolvePrimaryOpsChatId,
} from '../lib/telegram/surfaces.ts';

describe('TOC Ops surfaces — concern separation + naming', () => {
  test('every surface has a distinct concern-shaped title', () => {
    const titles = TOC_OPS_SURFACES.map(formatTocOpsGroupTitle);
    expect(new Set(titles).size).toBe(titles.length);
    for (const t of titles) {
      expect(t.startsWith(`${TOC_OPS_TITLE_PREFIX}${TOC_OPS_TITLE_SEP}`)).toBe(true);
      expect(assertTocOpsGroupTitle(t)).toBeNull();
    }
  });

  test('naming grammar: HQ / partner / sandbox / package', () => {
    expect(formatTocOpsGroupTitle(getSurface('hq')!)).toBe('TOC Ops · HQ');
    expect(formatTocOpsGroupTitle(getSurface('ash-staging')!)).toBe('TOC Ops · ASH · staging');
    expect(formatTocOpsGroupTitle(getSurface('sandbox')!)).toBe('TOC Ops · sandbox');
    expect(formatPackageGroupTitle('billy', 'Billy Ops')).toBe('TOC Ops · BILLY · Billy Ops');
  });

  test('parse round-trips canonical titles', () => {
    for (const s of TOC_OPS_SURFACES) {
      const title = formatTocOpsGroupTitle(s);
      const p = parseTocOpsGroupTitle(title);
      expect(p.ok).toBe(true);
      if (!p.ok) continue;
      expect(p.concern).toBe(s.concern);
      if (s.slug === 'hq' || s.slug === 'sandbox' || s.slug === 'ash-staging') {
        expect(p.surfaceSlug).toBe(s.slug);
      }
    }
  });

  test('rejects non-TOC titles', () => {
    expect(parseTocOpsGroupTitle('spen outs').ok).toBe(false);
    expect(parseTocOpsGroupTitle('TOC Ops').ok).toBe(false);
    expect(assertTocOpsGroupTitle('Random Group')).toContain('must start');
  });

  test('topic plans differ by concern (do not mix)', () => {
    const hq = getSurface('hq')!.topics;
    const ash = getSurface('ash-staging')!.topics;
    const sandbox = getSurface('sandbox')!.topics;
    expect(hq).toContain('aar');
    expect(hq).not.toContain('plays');
    expect(ash).toContain('plays');
    expect(ash).toContain('balances');
    expect(ash).not.toContain('aar');
    expect(sandbox).toEqual(['scratch', 'experiments']);
    expect(sandbox).not.toContain('alerts');
  });

  test('TELEGRAM_SURFACES JSON parse', () => {
    expect(parseTelegramSurfacesMap('{"hq":"-1001","sandbox":"-1002"}')).toEqual({
      hq: '-1001',
      sandbox: '-1002',
    });
    expect(parseTelegramSurfacesMap('not-json')).toEqual({});
  });

  test('resolvePrimaryOpsChatId prefers TELEGRAM_OPS_CHAT_ID', () => {
    expect(
      resolvePrimaryOpsChatId({
        TELEGRAM_OPS_CHAT_ID: '-1003937534779',
        TELEGRAM_SURFACES: '{"hq":"-100111"}',
      })
    ).toBe('-1003937534779');
    expect(
      resolvePrimaryOpsChatId({
        TELEGRAM_SURFACES: '{"hq":"-100111","ash-staging":"-100222"}',
      })
    ).toBe('-100111');
  });

  test('outbox topic → preferred surface (concern routing)', () => {
    expect(preferredSurfaceForOutboxTopic('alerts')).toBe('hq');
    expect(preferredSurfaceForOutboxTopic('plays')).toBe('ash-staging');
    expect(preferredSurfaceForOutboxTopic('experiments')).toBe('sandbox');
  });

  test('resolveOpsChatForOutbox prefers TELEGRAM_SURFACES over OPS_CHAT_ID', () => {
    const env = {
      TELEGRAM_OPS_CHAT_ID: '-1003937534779',
      TELEGRAM_SURFACES: JSON.stringify({
        hq: '-100111',
        'ash-staging': '-1003937534779',
        sandbox: '-100222',
      }),
    };
    expect(resolveOpsChatForOutbox({ topic: 'alerts', env })?.chatId).toBe('-100111');
    expect(resolveOpsChatForOutbox({ topic: 'plays', env })?.chatId).toBe('-1003937534779');
    expect(resolveOpsChatForOutbox({ topic: 'experiments', env })?.chatId).toBe('-100222');
    expect(resolveOpsChatForOutbox({ topic: 'alerts', env })?.source).toBe('surface');
  });

  test('resolveOpsChatForOutbox falls back to TELEGRAM_OPS_CHAT_ID', () => {
    const r = resolveOpsChatForOutbox({
      topic: 'alerts',
      env: { TELEGRAM_OPS_CHAT_ID: '-100999' },
    });
    expect(r).toEqual({ chatId: '-100999', surfaceSlug: 'hq', source: 'ops_chat' });
  });

  test('inferSurfaceSlug from title + map', () => {
    expect(
      inferSurfaceSlug({
        chatId: '-1001',
        title: 'TOC Ops · ASH · staging',
      })
    ).toBe('ash-staging');
    expect(
      inferSurfaceSlug({
        chatId: '-1004400413853',
        surfacesMap: { sandbox: '-1004400413853' },
      })
    ).toBe('sandbox');
  });
});
