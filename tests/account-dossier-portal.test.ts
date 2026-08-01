// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';
import {
  accountIdFromLocation,
  buildAccountDossier,
  buildAccountDossierHref,
  collectAccountIds,
  partnerCodeFromRef,
  resolveAccountId,
  sectionFromLocation,
} from '../public/portal/account/account-dossier.js';
import {
  ACCOUNT_DOSSIER_GLOSSARY,
  ACCOUNT_DOSSIER_SECTIONS,
} from '../public/portal/account/glossary-map.js';

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
    expect(html).toContain('#account:');
    expect(html).toContain('section.partnersOuts');
    expect(html).toContain('section.partnersTelegram');
    expect(html).toContain('ops.limits.policy_code');
  });

  test('page-glossary registers account dossier sections', async () => {
    const { PORTAL_GLOSSARY_SURFACES } = await import('../lib/portal/page-glossary.ts');
    const surface = PORTAL_GLOSSARY_SURFACES.find(row => row.path === '/portal/account/');
    expect(surface?.concept).toBe('page.accountDossier');
    expect(surface?.sections.identity).toBe('ops.limits.account');
    expect(surface?.sections.outs).toBe('section.partnersOuts');
    expect(surface?.sections.telegram).toBe('section.partnersTelegram');
    expect(surface?.sections.accounting).toBe('section.partnersAccounting');
  });

  test('account clicks on history cards and limit card target the dossier', async () => {
    const history = await Bun.file(HISTORY_HTML).text();
    const card = await Bun.file(LIMIT_CARD).text();
    expect(history).toContain('/portal/account/?account=');
    expect(history).toContain('page.accountDossier');
    expect(card).toContain('/portal/account/?account=${encodeURIComponent(c.node_id)}');
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
});
