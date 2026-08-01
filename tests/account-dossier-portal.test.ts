// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';
import {
  accountIdFromLocation,
  buildAccountDossier,
  buildAccountDossierHref,
  buildDossierActivity,
  buildDossierSoftPlays,
  collectAccountIds,
  partnerCodeFromRef,
  resolveAccountId,
  rollupWeeksFromPlays,
  sectionFromLocation,
  weekStartIsoFromPlacedAt,
} from '../public/portal/account/account-dossier.js';
import {
  ACCOUNT_DOSSIER_GLOSSARY,
  ACCOUNT_DOSSIER_SECTIONS,
  PARTNER_OPS_EVENT_CODE_CONCEPTS,
  conceptIdForPartnerOpsEventCode,
} from '../public/portal/account/glossary-map.js';
import {
  PARTNER_OPS_EVENT_CODES,
  PARTNER_OPS_EVENT_GLOSSARY,
} from '../lib/telegram/partner-ops-events.ts';
import { conceptIdForPartnerOpsEvent } from '../lib/telegram/ops-accounting-view.ts';

const ACCOUNT_HTML = 'public/portal/account/index.html';
const LIMIT_CARD = 'public/portal/components/limit-changes-card.js';
const HISTORY_HTML = 'public/portal/partner-history/index.html';

describe('account dossier helpers', () => {
  test('aligns query + #account: hash deep-links with limits board pattern', () => {
    expect(accountIdFromLocation('/portal/account/?account=ASH-001')).toBe('ASH-001');
    expect(
      accountIdFromLocation(
        '/portal/account/#account:019f92bf-40d6-72e3-aa09-f0a9b8a95824'
      )
    ).toBe('019f92bf-40d6-72e3-aa09-f0a9b8a95824');
    // Query wins when both present (picker SSOT).
    expect(
      accountIdFromLocation(
        '/portal/account/?account=from-query#account:from-hash'
      )
    ).toBe('from-query');
    expect(sectionFromLocation('/portal/account/#section:tree')).toBe('tree');
    const href = buildAccountDossierHref({
      accountId: '019f92bf-40d6-72e3-aa09-f0a9b8a95824',
      hours: 168,
    });
    expect(href).toContain('?account=019f92bf-40d6-72e3-aa09-f0a9b8a95824');
    expect(href).toContain('#account:019f92bf-40d6-72e3-aa09-f0a9b8a95824');
  });

  test('glossary map owns page.accountDossier and collapses onto ops.limits.*', () => {
    expect(ACCOUNT_DOSSIER_GLOSSARY.page).toBe('page.accountDossier');
    expect(ACCOUNT_DOSSIER_GLOSSARY.identity).toBe('ops.limits.account');
    expect(ACCOUNT_DOSSIER_GLOSSARY.outs).toBe('section.partnersOuts');
    expect(ACCOUNT_DOSSIER_GLOSSARY.telegram).toBe('section.partnersTelegram');
    expect(ACCOUNT_DOSSIER_GLOSSARY.handshake).toBe('telegram.handshake');
    expect(ACCOUNT_DOSSIER_SECTIONS).toContain('identity');
    expect(ACCOUNT_DOSSIER_SECTIONS).toContain('outs');
    expect(ACCOUNT_DOSSIER_SECTIONS).toContain('telegram');
    expect(ACCOUNT_DOSSIER_SECTIONS).toContain('accounting');
    expect(ACCOUNT_DOSSIER_SECTIONS).toContain('activity');
    expect(ACCOUNT_DOSSIER_GLOSSARY.activity).toBe('partner.ops.event');
    expect(ACCOUNT_DOSSIER_GLOSSARY.perAccount).toBe('ops.view.per_account');
    expect(ACCOUNT_DOSSIER_GLOSSARY.accountDeposits).toBe('ops.view.account_deposits');
    expect(ACCOUNT_DOSSIER_GLOSSARY.msgCommand).toBe('telegram.message.command');
  });

  test('ledger activity maps codes to event.* (aligned with TS glossary)', () => {
    expect(Object.keys(PARTNER_OPS_EVENT_CODE_CONCEPTS).sort()).toEqual(
      [...PARTNER_OPS_EVENT_CODES].sort()
    );
    for (const code of PARTNER_OPS_EVENT_CODES) {
      expect(PARTNER_OPS_EVENT_CODE_CONCEPTS[code]).toBe(PARTNER_OPS_EVENT_GLOSSARY[code]);
      expect(conceptIdForPartnerOpsEventCode(code)).toBe(conceptIdForPartnerOpsEvent(code));
    }
    expect(conceptIdForPartnerOpsEventCode('UNKNOWN_CODE')).toBe('partner.ops.event');

    const activity = buildDossierActivity({
      code: 'ASH',
      accounting: {
        ledger: [
          {
            at: '2026-07-01T00:00:00.000Z',
            code: 'DEPOSIT_RECEIVED',
            amount: 100,
            rail: 'venmo',
          },
        ],
      },
    });
    expect(activity[0]?.kind).toBe('DEPOSIT_RECEIVED');
    expect(activity[0]?.conceptId).toBe('event.deposit.received');
    expect(activity[0]?.conceptId).not.toBe('telegram.message.receipt');
  });

  test('resolves CODE / call-sign seeds onto account ids', () => {
    expect(partnerCodeFromRef('ASH-001')).toBe('ASH');
    expect(partnerCodeFromRef('limit-demo-atlantic')).toBe(null);
    const ids = ['ASH-001', 'ASH-002', 'limit-demo-atlantic'];
    expect(resolveAccountId('ASH', ids)).toBe('ASH-001');
    expect(resolveAccountId('ash-002', ids)).toBe('ASH-002');
    expect(resolveAccountId('limit-demo-atlantic', ids)).toBe('limit-demo-atlantic');
  });

  test('builds dossier from limit-raises bake for a demo node', async () => {
    const limitRaises = await Bun.file('public/registry/limit-raises.json').json();
    const partnersOps = await Bun.file('public/registry/partners-ops.json').json();
    const ids = collectAccountIds(limitRaises);
    expect(ids).toContain('limit-demo-atlantic');

    const dossier = buildAccountDossier({
      accountId: 'limit-demo-atlantic',
      limitRaises,
      partnersOps,
      hours: 168 * 24 * 30,
    });
    expect(dossier.found).toBe(true);
    expect(dossier.name).toContain('Atlantic');
    expect(dossier.connected.length).toBeGreaterThan(1);
    expect(dossier.connected.some(row => row.node_id === 'limit-demo-newark-agent')).toBe(true);
    expect(dossier.location.state).toBe('NJ');
    expect(dossier.links.betlogCsv).toContain('format=csv');
    expect(dossier.links.history).toContain('/portal/partner-history/?account=');
  });

  test('joins partners-ops telegram + handshake for ASH CODE', async () => {
    const limitRaises = await Bun.file('public/registry/limit-raises.json').json();
    const partnersOps = await Bun.file('public/registry/partners-ops.json').json();
    const handshake = await Bun.file('public/registry/telegram-handshake.json').json();
    const ash = partnersOps.partners.find((row: { code: string }) => row.code === 'ASH');
    expect(ash?.telegram?.chatId).toBeTruthy();

    const seed =
      ash?.callSign ||
      limitRaises.accountProfiles?.profiles?.find(
        (row: { callSign?: string }) => String(row.callSign || '').startsWith('ASH')
      )?.treeNodeId ||
      'ASH';
    const accountId = resolveAccountId(seed, collectAccountIds(limitRaises));
    const dossier = buildAccountDossier({
      accountId,
      limitRaises,
      partnersOps,
      handshake,
      hours: 168,
    });
    expect(dossier.partnerCode).toBe('ASH');
    expect(dossier.telegram.chatLinked).toBe(true);
    expect(dossier.telegram.topicsConfigured).toBeGreaterThanOrEqual(1);
    expect(dossier.telegram.topics.some((t: { key: string }) => t.key === 'accounting')).toBe(
      true
    );
    expect(dossier.links.partnersTelegram).toContain('#partner/ASH/telegram/general');
    expect(dossier.links.handshake).toBe('/registry/telegram-handshake.json');
    if (dossier.telegram.handshakeOk != null) {
      expect(typeof dossier.telegram.handshakeOk).toBe('boolean');
    }
    expect(dossier.activity.length).toBeGreaterThan(0);
    expect(
      dossier.activity.some(
        (row: { kind: string }) =>
          row.kind === 'PACKAGE_CHAT' || row.kind === 'NEXT_STEP' || row.kind === 'DM_SEAT'
      )
    ).toBe(true);
    expect(dossier.accountingView?.type).toBe('per_account');
    expect(dossier.accountingView?.conceptIds.dimension).toBe('ops.view.per_account');
    expect(dossier.accountingView?.conceptIds.deposits).toBe('ops.view.account_deposits');
  });

  test('weaves Soft plays from soft-accounting-export onto ASH dossier', async () => {
    const [limitRaises, partnersOps, handshake, softAccounting] = await Promise.all([
      Bun.file('public/registry/limit-raises.json').json(),
      Bun.file('public/registry/partners-ops.json').json(),
      Bun.file('public/registry/telegram-handshake.json').json(),
      Bun.file('public/registry/soft-accounting-export.json').json(),
    ]);
    const ash = partnersOps.partners.find((row: { code: string }) => row.code === 'ASH');
    const seed =
      ash?.callSign ||
      limitRaises.accountProfiles?.profiles?.find(
        (row: { callSign?: string }) => String(row.callSign || '').startsWith('ASH')
      )?.treeNodeId ||
      'ASH';
    const accountId = resolveAccountId(seed, collectAccountIds(limitRaises));
    const dossier = buildAccountDossier({
      accountId,
      limitRaises,
      partnersOps,
      handshake,
      softAccounting,
      hours: 168,
    });
    expect(dossier.partnerCode).toBe('ASH');
    expect(dossier.softPlays?.available).toBe(true);
    expect(dossier.softPlays?.conceptId).toBe('ops.view.per_play');
    expect(dossier.softPlays?.playCount).toBeGreaterThan(0);
    expect(dossier.softPlays?.bookConceptId).toBe('ops.view.per_book_type');
    expect(dossier.softPlays?.byBookType?.some(b => b.bookType === 'book.type.legal')).toBe(true);
    expect(dossier.links.softAccounting).toBe('/registry/soft-accounting-export.json');
  });

  test('normalizes padded Soft partner codes before joining', () => {
    const softPlays = buildDossierSoftPlays(
      {
        source: 'soft-ct',
        path: '/registry/soft-accounting-export.json',
        plays: [{ partnerCode: ' ASH ', placedAt: '2026-07-31T00:00:00.000Z' }],
      },
      'ASH'
    );

    expect(softPlays?.available).toBe(true);
    expect(softPlays?.playCount).toBe(1);
  });

  test('keeps the dossier available when optional Soft accounting is absent', async () => {
    const [limitRaises, partnersOps, handshake] = await Promise.all([
      Bun.file('public/registry/limit-raises.json').json(),
      Bun.file('public/registry/partners-ops.json').json(),
      Bun.file('public/registry/telegram-handshake.json').json(),
    ]);
    const ash = partnersOps.partners.find((row: { code: string }) => row.code === 'ASH');
    const seed =
      ash?.callSign ||
      limitRaises.accountProfiles?.profiles?.find(
        (row: { callSign?: string }) => String(row.callSign || '').startsWith('ASH')
      )?.treeNodeId ||
      'ASH';
    const accountId = resolveAccountId(seed, collectAccountIds(limitRaises));
    const dossier = buildAccountDossier({
      accountId,
      limitRaises,
      partnersOps,
      handshake,
      softAccounting: null,
      hours: 168,
    });

    expect(dossier.partnerCode).toBe('ASH');
    expect(dossier.softPlays?.available).toBe(false);
    expect(dossier.softPlays?.playCount).toBe(0);
  });

  test('includes depth-2 downlines from profile lineage when patterns are empty', () => {
    const partner = 'partner-root-id';
    const agent = 'agent-mid-id';
    const sub = 'sub-agent-id';
    const dossier = buildAccountDossier({
      accountId: partner,
      limitRaises: {
        accountProfiles: {
          profiles: [
            {
              treeNodeId: partner,
              accountName: 'Root',
              accountKind: 'partner',
              callSign: 'ROOT',
              parentNodeId: null,
              jurisdiction: { stateCode: 'NJ', location: 'Newark', zipCode: '07102' },
            },
            {
              treeNodeId: agent,
              accountName: 'Mid agent',
              accountKind: 'agent',
              callSign: 'ROOT-001',
              parentNodeId: partner,
              jurisdiction: { stateCode: 'NJ', location: 'Jersey City', zipCode: '07302' },
            },
            {
              treeNodeId: sub,
              accountName: 'Sub agent',
              accountKind: 'sub_agent',
              callSign: 'ROOT-001-SUB01',
              parentNodeId: agent,
              jurisdiction: { stateCode: 'NJ', location: 'Hoboken', zipCode: '07030' },
            },
          ],
        },
        byNode: {},
        patterns: { nodePatterns: [] },
      },
      hours: 168,
    });
    expect(dossier.connected.map(row => row.node_id).sort()).toEqual(
      [partner, agent, sub].sort()
    );
    expect(dossier.connected.find(row => row.node_id === sub)?.downline_depth).toBe(2);
  });

  test('resolves partner CODE from profile.callSign for UUID accounts', () => {
    const dossier = buildAccountDossier({
      accountId: '019f92bf-40d6-72e3-aa09-f0a9b8a95824',
      limitRaises: {
        accountProfiles: {
          profiles: [
            {
              treeNodeId: '019f92bf-40d6-72e3-aa09-f0a9b8a95824',
              accountName: 'Cascade Partner',
              accountKind: 'partner',
              callSign: 'ASH',
              parentNodeId: null,
              jurisdiction: { stateCode: 'NJ', location: 'Newark', zipCode: '07102' },
              license: { status: 'active' },
              observations: { raises: 2 },
            },
            {
              treeNodeId: '019f92ee-5ef8-71e9-b207-5ae20c07d095',
              accountName: 'TOC ASH-001',
              accountKind: 'agent',
              callSign: 'ASH-001',
              parentNodeId: '019f92bf-40d6-72e3-aa09-f0a9b8a95824',
              jurisdiction: { stateCode: 'NJ', location: 'Jersey City', zipCode: '07302' },
              license: { status: 'active' },
              observations: { raises: 1 },
            },
          ],
        },
        byNode: {},
        patterns: { nodePatterns: [] },
      },
      partnersOps: {
        partners: [{ code: 'ASH', outs: [{ book: 'FanDuel', maxBet: 1200 }] }],
      },
      hours: 168,
    });
    expect(dossier.found).toBe(true);
    expect(dossier.partnerCode).toBe('ASH');
    expect(dossier.outs.length).toBe(1);
    expect(dossier.location.state).toBe('NJ');
    expect(dossier.connected.length).toBeGreaterThanOrEqual(2);
  });
});

describe('account dossier seed (test db)', () => {
  test('non-force seed does not clobber existing agent labels', async () => {
    const { openOperationsDb } = await import('../lib/operations/db.ts');
    const {
      ensureDossierDemoTree,
      seedAccountDossierDemo,
      DOSSIER_ASH_PARTNER_ID,
      DOSSIER_ASH_ACCOUNTS,
    } = await import('../lib/operations/account-dossier-seed.ts');

    const db = openOperationsDb({ path: ':memory:' });
    try {
      ensureDossierDemoTree(db, { force: true });
      const agentId = DOSSIER_ASH_ACCOUNTS[0]!.id;
      db.run(`UPDATE tree_nodes SET name = 'Operator Label', call_sign = 'ASH-001' WHERE id = $id`, {
        $id: agentId,
      });

      await seedAccountDossierDemo(db, { force: false, bake: false });

      const row = db
        .query(`SELECT name, call_sign FROM tree_nodes WHERE id = $id`)
        .get({ $id: agentId }) as { name: string; call_sign: string };
      expect(row.name).toBe('Operator Label');
      expect(row.call_sign).toBe('ASH-001');

      await seedAccountDossierDemo(db, { force: true, bake: false });
      const forced = db
        .query(`SELECT name, call_sign FROM tree_nodes WHERE id = $id`)
        .get({ $id: agentId }) as { name: string; call_sign: string };
      expect(forced.name).toBe('TOC ASH-001');
      expect(forced.call_sign).toBe('ASH-001');

      const partner = db
        .query(`SELECT call_sign FROM tree_nodes WHERE id = $id`)
        .get({ $id: DOSSIER_ASH_PARTNER_ID }) as { call_sign: string };
      expect(partner.call_sign).toBe('ASH');
    } finally {
      db.close();
    }
  });

  test('seeds disposable db with ASH geo + raises inside 168h', async () => {
    const { openOperationsDb } = await import('../lib/operations/db.ts');
    const { seedAccountDossierDemo, DOSSIER_ASH_PARTNER_ID } = await import(
      '../lib/operations/account-dossier-seed.ts'
    );
    const { buildAccountDossier } = await import('../public/portal/account/account-dossier.js');

    const db = openOperationsDb({ path: ':memory:' });
    try {
      const result = await seedAccountDossierDemo(db, {
        force: true,
        bake: true,
        includeLimitDemo: true,
        lookbackHours: 168,
        bakePath: '/tmp/account-dossier-limit-raises-test.json',
        root: process.cwd(),
      });
      expect(result.toc.nodes.some(n => n.nodeId === DOSSIER_ASH_PARTNER_ID && n.seeded)).toBe(
        true
      );
      expect(result.compliance.some(c => c.nodeId === DOSSIER_ASH_PARTNER_ID && c.applied)).toBe(
        true
      );
      expect(result.baked?.raises ?? 0).toBeGreaterThan(0);

      const limitRaises = await Bun.file('/tmp/account-dossier-limit-raises-test.json').json();
      const partnersOps = await Bun.file('public/registry/partners-ops.json').json();
      const dossier = buildAccountDossier({
        accountId: DOSSIER_ASH_PARTNER_ID,
        limitRaises,
        partnersOps,
        hours: 168,
      });
      expect(dossier.found).toBe(true);
      expect(dossier.partnerCode).toBe('ASH');
      expect(dossier.location.state).toBe('NJ');
      expect(dossier.location.city).toBe('Newark');
      expect(dossier.raiseCount).toBeGreaterThan(0);
      expect(dossier.connected.length).toBeGreaterThanOrEqual(5);
      expect(dossier.monitoringStatus).not.toBe('incomplete');
      const cities = new Set(
        dossier.connected.map(row => row.location).filter((c): c is string => Boolean(c))
      );
      expect(cities.size).toBeGreaterThanOrEqual(3);
      expect(dossier.outs.length).toBeGreaterThan(0);
      const license = limitRaises.accountProfiles?.profiles?.find(
        (p: { treeNodeId: string }) => p.treeNodeId === DOSSIER_ASH_PARTNER_ID // brand-ok — profile wire
      )?.license?.licenseNumber;
      expect(String(license || '')).toMatch(/^NJ-ASH$/);
    } finally {
      db.close();
    }
  });
});

describe('account dossier portal wiring', () => {
  test('board exposes selector, sections, and glossary page concept', async () => {
    const html = await Bun.file(ACCOUNT_HTML).text();
    expect(html).toContain('page.accountDossier');
    expect(html).toContain('Account dossier');
    expect(html).toContain('id="ad-account-select"');
    expect(html).toContain('id="ad-section-identity"');
    expect(html).toContain('id="ad-section-outs"');
    expect(html).toContain('id="ad-section-telegram"');
    expect(html).toContain('id="ad-section-accounting"');
    expect(html).toContain('id="ad-section-activity"');
    expect(html).toContain('/dossier CODE');
    expect(html).toContain('ops.view.per_account');
    expect(html).toContain('ops.view.per_play');
    expect(html).toContain('soft-accounting-export.json');
    expect(html).toContain(
      "loadJson('/registry/soft-accounting-export.json').catch(() => null)"
    );
    expect(html).toContain('ops.view.account_deposits');
    expect(html).toContain('telegram.message.command');
    expect(html).toContain('Connected tree');
    expect(html).toContain('Evidence traces');
    expect(html).toContain('Limit telemetry');
    expect(html).toContain('Telegram package group');
    expect(html).toContain('/dossier');
    expect(html).toContain('telegram-handshake.json');
    expect(html).toContain('Betlog CSV');
    expect(html).toContain('limit-changes-card');
    expect(html).toContain("from './account-dossier.js'");
    expect(html).toContain("from './glossary-map.js'");
    expect(html).toContain('bootGlossaryUx');
    expect(html).toContain('id="account-glossary-crumbs"');
    expect(html).toContain("breadcrumbsMount: document.getElementById('account-glossary-crumbs')");
    expect(html).toContain('#account:');
    expect(html).toContain('section.partnersOuts');
    expect(html).toContain('section.partnersTelegram');
    expect(html).toContain('ops.limits.policy_code');
  });

  test('page-glossary registers account dossier sections', async () => {
    const { PORTAL_GLOSSARY_SURFACES } = await import('../lib/portal/page-glossary.ts');
    const surface = PORTAL_GLOSSARY_SURFACES.find(row => row.path === '/portal/account/');
    expect(surface?.concept).toBe('page.accountDossier');
    const { sectionsByHash } = await import('../lib/portal/page-glossary.ts');
    const byHash = sectionsByHash(surface);
    expect(byHash.identity).toBe('ops.limits.account');
    expect(byHash.outs).toBe('section.partnersOuts');
    expect(byHash.telegram).toBe('section.partnersTelegram');
    expect(byHash.accounting).toBe('section.partnersAccounting');
    expect(byHash.activity).toBe('ops.limits.evidence_trace');
    expect(surface?.sections.find(s => s.hash === 'identity')?.domId).toBe('ad-section-identity');
  });

  test('glossary-ux crumbs treat account dossier like partner-history under Limits', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();
    expect(ux).toContain(
      "pathname.includes('/portal/partner-history') || pathname.includes('/portal/account')"
    );
  });

  test('account clicks on history cards and limit card target the dossier', async () => {
    const history = await Bun.file(HISTORY_HTML).text();
    const card = await Bun.file(LIMIT_CARD).text();
    expect(history).toContain('/portal/account/?account=');
    expect(history).toContain('page.accountDossier');
    expect(card).toContain('/portal/account/?account=${encodeURIComponent(nodeId)}');
    expect(card).not.toContain('/portal/partner-history/?partner=${encodeURIComponent(c.node_id)}');
  });

  test('page concept and board slug are registered', async () => {
    const { PORTAL_PAGE_CONCEPT_DEFINITIONS } = await import('../lib/portal/page-concepts.ts');
    const { PORTAL_BOARD_SLUGS } = await import('../lib/http/portal-board-slugs.ts');
    expect(PORTAL_BOARD_SLUGS).toContain('account');
    expect(PORTAL_PAGE_CONCEPT_DEFINITIONS.some(row => row.id === 'page.accountDossier')).toBe(
      true
    );
  });

  test('Soft dossier chrome derives weeks when export.weeks empty', async () => {
    expect(ACCOUNT_DOSSIER_GLOSSARY.perPlay).toBe('ops.view.per_play');
    expect(ACCOUNT_DOSSIER_GLOSSARY.perWeek).toBe('ops.view.per_week');
    expect(weekStartIsoFromPlacedAt('2026-07-31T15:00:00.000Z')).toBe('2026-07-27');

    const soft = await Bun.file('public/registry/soft-accounting-export.json').json();
    expect(soft.weeks).toEqual([]);
    const chrome = buildDossierSoftPlays(soft, 'ASH');
    expect(chrome?.available).toBe(true);
    expect(chrome?.conceptId).toBe('ops.view.per_play');
    expect(chrome?.weekConceptId).toBe('ops.view.per_week');
    expect(chrome?.plays.length).toBeGreaterThan(0);
    expect(chrome?.weeks.length).toBeGreaterThan(0);
    expect(chrome?.byBookType?.length).toBeGreaterThan(0);
    expect(rollupWeeksFromPlays(soft.plays.filter(p => p.partnerCode === 'ASH')).length).toBe(
      chrome!.weeks.length
    );

    const html = await Bun.file(ACCOUNT_HTML).text();
    expect(html).toContain('Soft weeks');
    expect(html).toContain('Soft book types');
    expect(html).toContain('soft-accounting-export.json');
    expect(html).toContain('ops.view.per_week');
    expect(html).toContain('ops.view.per_book_type');
  });

  test('dossier Soft book-type chrome renders live soft-ct ops.view.per_book_type rows', async () => {
    const { finalizeSoftAccountingExport, SOFT_ACCOUNTING_EXPORT_SCHEMA } = await import(
      '../lib/telegram/soft-accounting-export.ts'
    );
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
    expect(live.byBookType.some(b => b.bookType === 'book.type.legal')).toBe(true);

    const [limitRaises, partnersOps, handshake] = await Promise.all([
      Bun.file('public/registry/limit-raises.json').json(),
      Bun.file('public/registry/partners-ops.json').json(),
      Bun.file('public/registry/telegram-handshake.json').json(),
    ]);
    const ash = partnersOps.partners.find((row: { code: string }) => row.code === 'ASH');
    const seed =
      ash?.callSign ||
      limitRaises.accountProfiles?.profiles?.find(
        (row: { callSign?: string }) => String(row.callSign || '').startsWith('ASH')
      )?.treeNodeId ||
      'ASH';
    const accountId = resolveAccountId(seed, collectAccountIds(limitRaises));
    const dossier = buildAccountDossier({
      accountId,
      limitRaises,
      partnersOps,
      handshake,
      softAccounting: live,
      hours: 168,
    });
    expect(dossier.softPlays?.source).toBe('soft-ct');
    expect(dossier.softPlays?.bookConceptId).toBe('ops.view.per_book_type');
    expect(dossier.softPlays?.byBookType?.some(b => b.bookType === 'book.type.legal')).toBe(true);
    expect(dossier.softPlays?.plays?.some(p => p.odds === -110)).toBe(true);

    const html = await Bun.file(ACCOUNT_HTML).text();
    expect(html).toContain('Soft book types');
    expect(html).toContain('ops.view.per_book_type');
  });
});
