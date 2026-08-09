// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildDeskAccountRows,
  buildMorningDesk,
  groupDeskAccounts,
  parseFreeplayPct,
  parseMaxBetMajor,
  prepareSoftExportForDeskWindows,
  projectTelegramSignals,
  sumSoftPnlWindow,
  DESK_PRIMARY_ARTIFACT_REF,
  DESK_ANCILLARY_REFS,
} from '../public/portal/desk/desk-board.js';
import { PORTAL_OVERFLOW_NAV, PORTAL_FOOTER_LINKS } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_HTML_ROUTES, PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';

const sampleDashboard = {
  schema: 'factorywager.partners-dashboard.v2',
  generatedAt: '2026-08-09T12:00:00.000Z',
  activeOutIds: ['out-ASH-1'],
  summary: { partnerCount: 1, registeredOutCount: 2, activeOutCount: 1 },
  partners: [
    {
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      operationalPhase: 'operator_ready',
      communication: { chatLinked: true, handshakeStatus: 'operator_ready' },
      outs: [
        {
          outId: 'out-ASH-1',
          sportsbookId: 'hard-rock-florida',
          operationalStatus: 'ready',
          fundingStatus: 'funded',
          observedMaxStake: { amount: { currency: 'USD', minorUnits: 50000 } },
          limitCoverageRatio: 1,
        },
        {
          outId: 'out-ASH-2',
          sportsbookId: 'hard-rock-florida',
          operationalStatus: 'deferred',
          fundingStatus: 'funded',
          limitCoverageRatio: 0,
        },
      ],
      accounting: {
        balancePositions: [
          {
            accountScope: { kind: 'partner', partnerCode: 'ASH' },
            amount: { currency: 'USD', minorUnits: 1_000_000 },
          },
          {
            accountScope: { kind: 'out', outId: 'out-ASH-1' },
            amount: { currency: 'USD', minorUnits: 200_000 },
          },
        ],
        recentEntries: [
          {
            entryType: 'settlement',
            amount: { currency: 'USD', minorUnits: -25000 },
            postedAt: '2026-08-09T10:00:00.000Z',
          },
          {
            entryType: 'deposit',
            amount: { currency: 'USD', minorUnits: 10000 },
            postedAt: '2026-08-09T09:00:00.000Z',
          },
        ],
      },
      limits: { tracked: 1, missing: 0, coverageRatio: 1 },
      attention: [
        {
          reasonCode: 'partner.limits.raise_observed',
          severity: 'info',
          label: 'raise observed',
          actionHref: '/portal/limits/',
        },
      ],
    },
  ],
};

const sampleOps = {
  partners: [
    {
      code: 'ASH',
      outs: [
        {
          id: 'out-ASH-1',
          book: { type: 'legal', name: 'Hard Rock Florida' },
          credentials: { username: 'ash1.staging' },
          maxBet: '500',
          freeRollPercent: 25,
          status: 'ready',
        },
        {
          id: 'out-ASH-2',
          book: { type: 'legal', name: 'Hard Rock Florida' },
          credentials: { username: '—' },
          maxBet: '—',
          freeRollPercent: null,
          status: 'deferred',
        },
      ],
    },
  ],
};

const sampleBooks = {
  bookmakers: {
    'hard-rock-florida': {
      id: 'hard-rock-florida',
      label: 'Hard Rock Florida',
      skin: 'HardRockBet Florida',
      brandGroup: 'Hard Rock International',
    },
  },
};

const sampleSoft = {
  available: true,
  source: 'toc-ops-fixture',
  plays: [
    {
      playId: 'p1',
      partnerCode: 'ASH',
      pnl: 100,
      settledAt: '2026-08-09T08:00:00.000Z',
      placedAt: '2026-08-09T06:00:00.000Z',
    },
    {
      playId: 'p2',
      partnerCode: 'ASH',
      pnl: -40,
      settledAt: '2026-08-03T08:00:00.000Z',
      placedAt: '2026-08-03T06:00:00.000Z',
    },
    {
      playId: 'p3',
      partnerCode: 'ASH',
      pnl: 50,
      settledAt: '2026-07-01T08:00:00.000Z',
      placedAt: '2026-07-01T06:00:00.000Z',
    },
  ],
};

const sampleHandshake = {
  source: 'snapshot',
  inviteGaps: 0,
  rows: [
    {
      partnerCode: 'ASH',
      callSign: 'ASH-001',
      handshakeOk: true,
      gapCount: 0,
      nextSteps: ['ready for welcome DM + bot commands'],
      dmSeatStatus: 'linked',
      phase: 'operator_ready',
      verifyPassed: 11,
      verifyTotal: 11,
    },
  ],
};

describe('desk-board parsers', () => {
  test('parseMaxBetMajor and parseFreeplayPct', () => {
    expect(parseMaxBetMajor('$500')).toBe(500);
    expect(parseMaxBetMajor('—')).toBeNull();
    expect(parseFreeplayPct('25%')).toBe(25);
    expect(parseFreeplayPct(25)).toBe(25);
    expect(parseFreeplayPct(null)).toBeNull();
  });
});

describe('desk-board soft windows', () => {
  test('sumSoftPnlWindow splits 24h / 7d / all', () => {
    const nowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const d24 = sumSoftPnlWindow(sampleSoft, { nowMs, windowMs: 24 * 3_600_000 });
    const d7 = sumSoftPnlWindow(sampleSoft, { nowMs, windowMs: 7 * 24 * 3_600_000 });
    const all = sumSoftPnlWindow(sampleSoft, { nowMs, windowMs: null });
    expect(d24.netMajor).toBe(100);
    expect(d24.playCount).toBe(1);
    expect(d7.netMajor).toBe(60); // 100 - 40
    expect(d7.playCount).toBe(2);
    expect(all.netMajor).toBe(110); // 100 - 40 + 50
    expect(all.playCount).toBe(3);
    expect(d24.byPartner.get('ASH')?.netMajor).toBe(100);
  });

  test('prepareSoftExportForDeskWindows rebases stale toc-ops-fixture onto wall clock', () => {
    const wallNowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const fixture = {
      available: true,
      source: 'toc-ops-fixture',
      plays: [
        {
          playId: 'old',
          partnerCode: 'ASH',
          pnl: 50,
          settledAt: '2026-07-01T12:00:00.000Z',
          placedAt: '2026-07-01T10:00:00.000Z',
        },
        {
          playId: 'tip',
          partnerCode: 'ASH',
          pnl: 25,
          settledAt: '2026-07-02T12:00:00.000Z',
          placedAt: '2026-07-02T10:00:00.000Z',
        },
      ],
    };
    const prep = prepareSoftExportForDeskWindows(fixture, wallNowMs);
    expect(prep.rebased).toBe(true);
    expect(prep.mode).toBe('fixture-rebase');
    // tip and the day-before play both land within 24h after rebase
    const soft24 = sumSoftPnlWindow(prep.soft, { nowMs: wallNowMs, windowMs: 24 * 3_600_000 });
    expect(soft24.netMajor).toBe(75);
    expect(soft24.playCount).toBe(2);
    const soft7 = sumSoftPnlWindow(prep.soft, {
      nowMs: wallNowMs,
      windowMs: 7 * 24 * 3_600_000,
    });
    expect(soft7.netMajor).toBe(75);
  });

  test('prepareSoftExportForDeskWindows never rebases soft-ct', () => {
    const wallNowMs = Date.parse('2026-08-09T12:00:00.000Z');
    const live = {
      available: true,
      source: 'soft-ct',
      plays: [
        {
          playId: 'old',
          partnerCode: 'ASH',
          pnl: 50,
          settledAt: '2026-07-01T12:00:00.000Z',
          placedAt: '2026-07-01T10:00:00.000Z',
        },
      ],
    };
    const prep = prepareSoftExportForDeskWindows(live, wallNowMs);
    expect(prep.rebased).toBe(false);
    expect(prep.mode).toBe('wall-clock');
    const soft24 = sumSoftPnlWindow(prep.soft, { nowMs: wallNowMs, windowMs: 24 * 3_600_000 });
    expect(soft24.playCount).toBe(0);
  });
});

describe('desk-board account join', () => {
  test('buildDeskAccountRows joins ops login/type/freeplay + book skin', () => {
    const rows = buildDeskAccountRows(sampleDashboard, {
      ops: sampleOps,
      bookmakers: sampleBooks,
    });
    expect(rows).toHaveLength(2);
    const live = rows.find(r => r.outId === 'out-ASH-1');
    expect(live?.username).toBe('ash1.staging');
    expect(live?.bookType).toBe('legal');
    expect(live?.skin).toBe('HardRockBet Florida');
    expect(live?.live).toBe(true);
    expect(live?.maxBetMajor).toBe(500);
    expect(live?.freeplayPct).toBe(25);
    expect(live?.balanceMinor).toBe(200_000);

    const deferred = rows.find(r => r.outId === 'out-ASH-2');
    expect(deferred?.freeze).toBe(true);
    expect(deferred?.freezeReasons).toContain('deferred');
  });

  test('groupDeskAccounts by type and live', () => {
    const rows = buildDeskAccountRows(sampleDashboard, {
      ops: sampleOps,
      bookmakers: sampleBooks,
    });
    const byType = groupDeskAccounts(rows, 'bookType');
    expect(byType.some(g => g.key === 'legal' && g.count === 2)).toBe(true);
    const byLive = groupDeskAccounts(rows, 'live');
    expect(byLive.find(g => g.key === 'live')?.count).toBe(1);
  });
});

describe('desk-board telegram + full model', () => {
  test('projectTelegramSignals surfaces handshake without inventing messages', () => {
    const tg = projectTelegramSignals(sampleHandshake, sampleDashboard, {
      partners: [
        {
          code: 'ASH',
          telegram: { chatId: '-1001', topicIds: { general: 1, ops: 2 } },
          accounting: { freeRoll: { total: 25, used: 0 } },
        },
      ],
    });
    expect(tg.available).toBe(true);
    expect(tg.messageFeedAvailable).toBe(false);
    expect(tg.note).toMatch(/no live telegram message/i);
    expect(tg.rows[0]?.chatLinked).toBe(true);
    expect(tg.rows[0]?.chatId).toBe('-1001');
    expect(tg.rows[0]?.topicCount).toBe(2);
    // ready-for-welcome alone is not a signal
    expect(tg.newSignals).toHaveLength(0);
  });

  test('buildMorningDesk aggregates summary money and freezes with fixture rebase', () => {
    const nowMs = Date.parse('2026-08-09T12:00:00.000Z');
    // Stale fixture tip (July) → desk rebases onto wall clock for 24h/7d.
    const staleSoft = {
      available: true,
      source: 'toc-ops-fixture',
      plays: [
        {
          playId: 'p-old',
          partnerCode: 'ASH',
          pnl: 40,
          settledAt: '2026-07-01T08:00:00.000Z',
          placedAt: '2026-07-01T06:00:00.000Z',
        },
        {
          playId: 'p-mid',
          partnerCode: 'ASH',
          pnl: -10,
          settledAt: '2026-07-05T08:00:00.000Z',
          placedAt: '2026-07-05T06:00:00.000Z',
        },
        {
          playId: 'p-tip',
          partnerCode: 'ASH',
          pnl: 100,
          settledAt: '2026-07-08T08:00:00.000Z',
          placedAt: '2026-07-08T06:00:00.000Z',
        },
      ],
    };
    const desk = buildMorningDesk({
      dashboard: sampleDashboard,
      soft: staleSoft,
      ops: sampleOps,
      bookmakers: sampleBooks,
      handshake: sampleHandshake,
      nowMs,
    });
    expect(desk.summary.partners).toBe(1);
    expect(desk.summary.accounts).toBe(2);
    expect(desk.summary.live).toBe(1);
    expect(desk.summary.limitTotalMajor).toBe(500);
    expect(desk.softWindow.rebased).toBe(true);
    expect(desk.summary.softRebased).toBe(true);
    // tip play lands in 24h after rebase
    expect(desk.summary.softNet24h).toBe(100);
    expect(desk.summary.softPlays24h).toBe(1);
    // all three plays sit within 7d of rebased tip (tip − 7d inclusive)
    expect(desk.summary.softNet7d).toBe(130);
    expect(desk.summary.softNetAll).toBe(130);
    expect(desk.summary.ledgerNet24h).toBe(-250);
    expect(desk.summary.freezes).toBe(1);
    expect(desk.summary.freerolls).toBe(1);
    expect(desk.summary.attention).toBe(1);
    expect(desk.summary.messageFeedAvailable).toBe(false);
    expect(desk.partners[0]?.balanceDisplay).toBe('$10,000.00');
    expect(desk.accounts[0]?.partnerCode).toBe('ASH');
  });

  test('live registry fixture soft nets are non-zero after fixture rebase', async () => {
    const dashboard = await Bun.file('public/registry/partners-dashboard.json').json();
    const soft = await Bun.file('public/registry/soft-accounting-export.json').json();
    const seat = await Bun.file('public/registry/seat-capital-desk.json').json();
    const ops = await Bun.file('public/registry/partners-ops.json').json();
    const bookmakers = await Bun.file('public/registry/bookmakers.json').json();
    const handshake = await Bun.file('public/registry/telegram-handshake.json').json();
    const desk = buildMorningDesk({
      dashboard,
      soft,
      seat,
      ops,
      bookmakers,
      handshake,
      nowMs: Date.now(),
    });
    expect(desk.summary.softAvailable).toBe(true);
    expect(desk.summary.softSource).toBe('toc-ops-fixture');
    expect(desk.softWindow.rebased).toBe(true);
    // After rebase, 7d should include fixture activity
    expect(desk.summary.softPlays7d).toBeGreaterThan(0);
    expect(desk.telegram.rows.every(r => r.messageFeedAvailable === false)).toBe(true);
    expect(desk.telegram.rows.some(r => r.chatId)).toBe(true);
  });
});

describe('desk portal wiring', () => {
  test('chrome, routes, and page concept include desk', () => {
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({ id: 'desk', href: '/portal/desk/' })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual(
      expect.objectContaining({ label: 'Desk', href: '/portal/desk/' })
    );
    expect(PORTAL_HTML_ROUTES).toContain('/portal/desk/');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('desk');
    expect(
      PORTAL_PAGE_CONCEPT_DEFINITIONS.some(
        p => p.id === 'page.partnerDesk' && p.path === '/portal/desk/'
      )
    ).toBe(true);
  });

  test('desk board files exist and reference primary artifact', async () => {
    const html = await Bun.file('public/portal/desk/index.html').text();
    const js = await Bun.file('public/portal/desk/desk-board.js').text();
    const md = await Bun.file('public/portal/desk.md').text();
    expect(html).toContain('Morning desk');
    expect(html).toContain(DESK_PRIMARY_ARTIFACT_REF);
    expect(html).toContain('DESK_ANCILLARY_REFS');
    expect(html).toContain('buildMorningDesk');
    expect(js).toContain('export function buildMorningDesk');
    expect(js).toContain(DESK_ANCILLARY_REFS.soft);
    expect(md).toContain('/portal/desk/');
  });

  test('live registry fixtures project without throw', async () => {
    const dashboard = await Bun.file('public/registry/partners-dashboard.json').json();
    const soft = await Bun.file('public/registry/soft-accounting-export.json').json();
    const seat = await Bun.file('public/registry/seat-capital-desk.json').json();
    const ops = await Bun.file('public/registry/partners-ops.json').json();
    const bookmakers = await Bun.file('public/registry/bookmakers.json').json();
    const handshake = await Bun.file('public/registry/telegram-handshake.json').json();
    const desk = buildMorningDesk({
      dashboard,
      soft,
      seat,
      ops,
      bookmakers,
      handshake,
      nowMs: Date.parse('2026-08-09T12:00:00.000Z'),
    });
    expect(desk.summary.accounts).toBeGreaterThanOrEqual(4);
    expect(desk.accounts.every(a => a.partnerCode && a.outId)).toBe(true);
    expect(desk.telegram.rows.length).toBeGreaterThanOrEqual(1);
  });
});
