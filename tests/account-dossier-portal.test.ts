// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';
import {
  buildAccountDossier,
  collectAccountIds,
  partnerCodeFromRef,
  resolveAccountId,
} from '../public/portal/account/account-dossier.js';

const ACCOUNT_HTML = 'public/portal/account/index.html';
const LIMIT_CARD = 'public/portal/components/limit-changes-card.js';
const HISTORY_HTML = 'public/portal/partner-history/index.html';

describe('account dossier helpers', () => {
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
});

describe('account dossier portal wiring', () => {
  test('board exposes selector, sections, and glossary page concept', async () => {
    const html = await Bun.file(ACCOUNT_HTML).text();
    expect(html).toContain('page.accountDossier');
    expect(html).toContain('id="ad-account-select"');
    expect(html).toContain('Connected tree');
    expect(html).toContain('Evidence traces');
    expect(html).toContain('Limit telemetry');
    expect(html).toContain('Betlog CSV');
    expect(html).toContain('limit-changes-card');
    expect(html).toContain("from './account-dossier.js'");
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
