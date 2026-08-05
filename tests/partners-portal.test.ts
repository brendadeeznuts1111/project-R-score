// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import { PORTAL_HTML_ROUTES, PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_OVERFLOW_NAV } from '../lib/portal/chrome-catalog.ts';
import {
  parsePartnerHash,
  partnerAccountingHash,
  partnerBookHash,
  partnerHash,
  partnerOutHash,
  partnerTelegramHash,
} from '../public/portal/partners/partner-routes.js';

const BOARD = 'public/portal/partners/index.html';

describe('partners portal board', () => {
  test('is registered in chrome, routes, and markdown slugs', () => {
    expect(PORTAL_HTML_ROUTES).toContain('/portal/partners/');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('partners');
    const nav = PORTAL_OVERFLOW_NAV.find(n => n.id === 'partners');
    expect(nav?.href).toBe('/portal/partners/');
    expect(nav?.cli).toContain('telegram:handshake:catalog');
  });

  test('board loads handshake, seat desk, and accounting/deposit sections', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('id="section:telegram"');
    expect(html).toContain('id="section:accounting"');
    expect(html).toContain('id="section:accounts-limits"');
    expect(html).toContain('id="section:outs"');
    expect(html).toContain('id="outs-tbody"');
    expect(html).toContain('id="phase-filter-bar"');
    expect(html).toContain('id="section:onboard"');
    expect(html).toContain('id="partner-profile"');
    expect(html).toContain('id="section:deposits"');
    expect(html).toContain('id="section:partner-message"');
    expect(html).toContain('renderPartnerProfile');
    expect(html).toContain('renderOutsInventory');
    expect(html).toContain('renderPhaseFilter');
    expect(html).toContain('summarizePartnerDesk');
    expect(html).toContain('coverageBarHtml');
    expect(html).toContain('/portal/partners/partners-board.js');
    expect(html).toContain('telegramTopicsForPhase');
    expect(html).toContain('onboard:partner');
    expect(html).toContain('/portal/limits/?partner=');
    expect(html).toContain('/portal/partner-history/?partner=');
    expect(html).toContain('/registry/telegram-handshake.json');
    expect(html).toContain('/registry/seat-capital-desk.json');
    expect(html).toContain('/registry/telegram-handshake-catalog.json');
    expect(html).toContain('/registry/scrape-wire-taxonomy.json');
    expect(html).toContain('/registry/partners-ops.json');
    expect(html).toContain('/registry/partner-profiles.json');
    expect(html).toContain('partnerProfilesCache?.profiles?.[code]');
    expect(html).toContain('Profile lifecycle');
    expect(html).toContain('/registry/limit-raises.json');
    expect(html).toContain('depositMethod');
    expect(html).toContain('telegram:package-group:accounting');
    expect(html).toContain('Betting deposits');
    expect(html).toContain('Accounting deals');
    expect(html).toContain('ops.view.per_account');
    expect(html).toContain('data-glossary-concept="ops.view.per_account"');
    expect(html).toContain('ops.view.per_play');
    expect(html).toContain('ops.view.per_week');
    expect(html).toContain('soft-plays-tbody');
    expect(html).toContain('soft-weeks-tbody');
    expect(html).toContain('soft-book-types-tbody');
    expect(html).toContain('ops.view.per_book_type');
    expect(html).toContain('soft-accounting-export.json');
    expect(html).toMatch(
      /String\(play\?\.partnerCode \|\| ''\)\s*\.trim\(\)\s*\.toUpperCase\(\)/
    );
    expect(html).toContain('Partner messages');
    expect(html).toContain('seat:desk:partner-message');
    expect(html).toContain('renderPartnerMessages');
    expect(html).toContain('renderAccountsLimits');
    expect(html).toContain('applyPartnerRoute');
    expect(html).toContain('id="tag-filter-bar"');
    expect(html).toContain('id="out-table"');
    expect(html).toContain('id="book-registry"');
    expect(html).toContain('id="partners-glossary-crumbs"');
    expect(html).toContain('book-card-${');
    expect(html).toContain('renderBooks');
    expect(html).toContain('telegramDeepLink');
    expect(html).toContain('accounting-events-tbody');
    expect(html).toContain('partners:event');
    expect(html).toContain('/portal/components/partner-ops-event-concepts.js');
    expect(html).toContain('conceptIdForPartnerOpsEventCode');
    expect(html).toContain('data-domain-lanes="partner"');
    expect(html).toContain('partner-profile-outs');
    expect(html).toContain('data-glossary-concept="section.partnersTags"');
    expect(html).toContain('data-glossary-concept="section.partnersOuts"');
    expect(html).toContain('data-glossary-concept="section.partnersBookDetail"');
    expect(html).toContain('data-glossary-concept="ui.route.partnerHash"');
  });

  test('wires telegram glossary concepts and color kernel consumers', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('data-glossary-concept="page.partners"');
    expect(html).toContain('data-glossary-concept="section.partnersTelegram"');
    expect(html).toContain('data-glossary-concept="section.partnersAccounting"');
    expect(html).toContain('data-glossary-concept="section.partnersAccountsLimits"');
    expect(html).toContain('data-glossary-concept="section.partnersOnboard"');
    expect(html).toContain('id="section:onboard"');
    expect(html).toContain('data-glossary-concept="section.partnersDeposits"');
    expect(html).toContain('data-glossary-concept="section.partnersPartnerMessage"');
    expect(html).toContain('data-glossary-concept="telegram.wire"');
    expect(html).toContain('data-glossary-concept="telegram.handshake"');
    expect(html).toContain('data-glossary-concept="telegram.deposit_rail"');
    expect(html).toContain('data-glossary-concept="scrape.book"');
    expect(html).toContain('telegram.topic.liquidity');
    expect(html).toContain('accounting.free_roll');
    expect(html).toContain('bootGlossaryUx');
    expect(html).toContain('scrollSections: true');
    expect(html).toContain('--chip-color');
    expect(html).toContain('--partner-ops-');
    expect(html).toContain('installColorTokens');
    expect(html).toContain('isChipHex');
    expect(html).toContain('/^#[0-9A-Fa-f]{6}$/');
    expect(html).toContain('Fallback first');
    expect(html).toContain('partners-ops.json');
    expect(html).toContain('bookRegistry');
  });

  test('ships valid head, accessible loading/filter states, and non-nested book links', async () => {
    const html = await Bun.file(BOARD).text();
    const head = html.slice(0, html.indexOf('</head>'));
    const renderBooks = html.slice(
      html.indexOf('function renderBooks'),
      html.indexOf('function applyPartnerRoute')
    );

    expect(head).not.toContain('\\n');
    expect(html).toMatch(
      /<div\s+id="error-banner"\s+class="ops-banner error hidden"\s+role="alert"\s+aria-live="assertive"/
    );
    expect(html).toMatch(
      /<div\s+id="loading"\s+class="ops-loading"\s+role="status"\s+aria-live="polite"/
    );
    expect(html).toContain('aria-pressed="${!phaseFilter}"');
    expect(html).toContain('aria-pressed="${phaseFilter === p.phase}"');
    expect(renderBooks).toContain('class="book-card book-chip"');
    expect(renderBooks).not.toContain('conceptChip(');
  });

  test('labels zero-profile data as legacy compatibility instead of canonical readiness', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('partnerReadinessGate');
    expect(html).toContain('Canonical profiles');
    expect(html).toContain('Legacy compatibility view; canonical profile coverage is incomplete');
    expect(html).toContain('renderStats(handshake, seat, ops, partnerProfiles)');
  });

  test('baked registry artifacts exist for the board consumers', async () => {
    expect(await Bun.file('public/registry/telegram-handshake.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/seat-capital-desk.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/telegram-handshake-catalog.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/partners-ops.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/soft-accounting-export.json').exists()).toBe(true);
    const handshake = await Bun.file('public/registry/telegram-handshake.json').json();
    const seat = await Bun.file('public/registry/seat-capital-desk.json').json();
    const catalog = await Bun.file('public/registry/telegram-handshake-catalog.json').json();
    const ops = await Bun.file('public/registry/partners-ops.json').json();
    expect(Array.isArray(handshake.rows)).toBe(true);
    expect(handshake.rows.length).toBeGreaterThan(0);
    expect(Array.isArray(seat.rows)).toBe(true);
    expect(seat.rows.some((r: { outs?: unknown[] }) => Array.isArray(r.outs) && r.outs.length > 0)).toBe(
      true
    );
    expect(Array.isArray(seat.partnerViews)).toBe(true);
    expect(seat.partnerViews.length).toBeGreaterThan(0);
    expect(Array.isArray(seat.partnerMessageTemplates)).toBe(true);
    expect(seat.commands?.partnerMessage).toContain('partner-message');
    expect(catalog.colors?.packageTopics?.accounting?.hex).toMatch(/^#/);
    expect(catalog.glossary?.conceptIds).toContain('telegram.wire');
    expect(ops.schema).toBe('factorywager.partners-ops.v2');
    expect(ops.validation.ok).toBe(true);
    expect(ops.summary.accounts).toBeGreaterThan(0);
    expect(ops.summary.trackedLimits).toBeGreaterThan(0);
    expect(ops.partners.every((partner: { tracking?: unknown }) => partner.tracking)).toBe(true);
    expect(ops.glossary.conceptIds).toContain('ops.view.per_account');
    expect(ops.colors?.['ops.view.per_account']?.hex).toMatch(/^#/);
  });

  test('URLPattern routes keep partner, out, accounting, and Telegram anchors aligned', () => {
    expect(parsePartnerHash('#partners')).toEqual({ type: 'partners' });
    expect(parsePartnerHash('#partner/ash')).toEqual({ type: 'partner', code: 'ASH' });
    expect(parsePartnerHash('#partner/ASH/out/out-ASH-2')).toEqual({
      type: 'out',
      code: 'ASH',
      outId: 'out-ASH-2',
    });
    expect(parsePartnerHash('#partner/ASH/accounting')).toEqual({
      type: 'accounting',
      code: 'ASH',
    });
    expect(parsePartnerHash('#partner/ASH/telegram/liquidity')).toEqual({
      type: 'telegram',
      code: 'ASH',
      topic: 'liquidity',
    });
    expect(parsePartnerHash('#partner/ASH/telegram/not-a-topic')).toBeNull();
    expect(partnerHash('ash')).toBe('#partner/ASH');
    expect(partnerOutHash('ASH', 'out-ASH-2')).toBe('#partner/ASH/out/out-ASH-2');
    expect(partnerOutHash('ASH', 'out-ASH-0')).toBe('#partners');
    expect(partnerOutHash('ASH', 'out-ASH-01')).toBe('#partners');
    expect(partnerAccountingHash('ASH')).toBe('#partner/ASH/accounting');
    expect(partnerTelegramHash('ASH', 'accounting')).toBe('#partner/ASH/telegram/accounting');
    expect(parsePartnerHash('#book/book-dk-nj')).toEqual({ type: 'book', bookId: 'book-dk-nj' });
    expect(parsePartnerHash('#book/not-a-book')).toBeNull();
    expect(partnerBookHash('book-dk-nj')).toBe('#book/book-dk-nj');
  });

  test('partner profile panel wires ledger balance, history, and per-out DOM contracts', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('renderPartnerProfile');
    expect(html).toContain('partner-ledger-tbody');
    expect(html).toContain('partner-outs-tbody');
    expect(html).toContain('ops?.accounting?.balance');
    expect(html).toContain('ops?.accounting?.initialCapital');
    expect(html).toContain('ops?.accounting?.ledgerRows');
    expect(html).toContain('ops?.accounting?.outs');
    expect(html).toContain("const conceptId = `accounting.${type}`");
    expect(html).toContain('conceptChip(conceptId, type, ops?.colors?.[conceptId])');
    expect(html).toContain('trackingId');
    expect(html).toContain('tone-bad');
    expect(html).toContain('.reverse()');
    expect(html).toContain('partner:settlement:post');
    expect(html).toContain('partners:build');
  });

  test('partners Soft week rollup table wires ops.view.per_week rows from softWeekRows', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain('soft-weeks-tbody');
    expect(html).toContain('softWeekRows');
    expect(html).toContain('data-glossary-concept="ops.view.per_week"');
    expect(html).toContain('w.weekStart');
    expect(html).toContain('w.net');
  });

  test('partners Soft book-type table wires live soft-ct byBookType into ops.view.per_book_type', async () => {
    const {
      finalizeSoftAccountingExport,
      buildPartnerSoftPlayChrome,
      SOFT_ACCOUNTING_EXPORT_SCHEMA,
    } = await import('../lib/telegram/soft-accounting-export.ts');
    const live = finalizeSoftAccountingExport({
      schema: SOFT_ACCOUNTING_EXPORT_SCHEMA,
      version: '1',
      generatedAt: '2026-07-31T18:00:00.000Z',
      source: 'soft-ct',
      available: true,
      path: '/registry/soft-accounting-export.json',
      plays: [
        {
          playId: 'epr-live-ash',
          partnerCode: 'ASH',
          stake: 1000,
          odds: -110,
          result: 'win',
          pnl: 909.09,
          placedAt: '2026-07-17T19:10:00.000Z',
          settledAt: '2026-07-18T02:00:00.000Z',
          bookType: 'book.type.legal',
          market: 'NFL moneyline',
        },
      ],
      weeks: [],
      byBookType: [],
    });
    const chrome = buildPartnerSoftPlayChrome(live, 'ASH');
    expect(chrome?.bookConceptId).toBe('ops.view.per_book_type');
    expect(chrome?.byBookType.some(b => b.bookType === 'book.type.legal')).toBe(true);
    expect(chrome?.bookViews.every(v => v.conceptIds.dimension === 'ops.view.per_book_type')).toBe(
      true
    );

    const html = await Bun.file('public/portal/partners/index.html').text();
    expect(html).toContain('soft-book-types-tbody');
    expect(html).toContain('softAccounting?.byBookType');
    expect(html).toContain('ops.view.per_book_type');
  });
});
