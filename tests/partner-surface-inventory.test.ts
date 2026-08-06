import { describe, expect, test } from 'bun:test';
import {
  PORTAL_DOMAIN_LANE_META,
  PORTAL_OVERFLOW_NAV,
  PORTAL_PRIORITY_NAV,
} from '../lib/portal/chrome-catalog.ts';
import { CONCEPT_DOMAINS } from '../lib/portal/concept-domains.ts';
import {
  allPartnerSurfaceRows,
  buildPartnerSurfaceInventory,
  listPartnerChromeNavItems,
  outIdSurfaceRows,
  partnerChromeNavSurfaceRows,
  partnerCodeSurfaceRows,
  partnerDeskHrefs,
  PARTNER_DOCUMENTATION_REFS,
} from '../lib/docs/partner-surface-inventory.ts';
import { explainHomonym } from '../lib/docs/workspace-taxonomy.ts';

const LIVE_FIXTURE = [
  { code: 'ASH', phase: 'operator_ready', callSign: 'ASH-001' },
  { code: 'BIL', phase: 'operator_ready', callSign: 'BIL-001' },
  { code: 'NOV', phase: 'operator_ready', callSign: 'NOV-001' },
  { code: 'SPEN', phase: 'operator_ready', callSign: 'SPEN-001' },
] as const;

const LIVE_OUTS = [
  { outId: 'out-ASH-1', partnerCode: 'ASH', status: 'ready' },
  { outId: 'out-ASH-2', partnerCode: 'ASH', status: 'deferred' },
  { outId: 'out-SPEN-1', partnerCode: 'SPEN', status: 'ready' },
] as const;

describe('partner surface inventory', () => {
  test('every chrome nav with domain partner appears as chrome-nav row', () => {
    const navIds = new Set(listPartnerChromeNavItems().map(n => n.id));
    expect(navIds.size).toBeGreaterThanOrEqual(8);
    const rowTokens = new Set(partnerChromeNavSurfaceRows().map(r => r.token));
    for (const id of navIds) {
      expect(rowTokens.has(id)).toBe(true);
    }
  });

  test('taxonomy machines partner / partners are distinct rows', () => {
    const rows = allPartnerSurfaceRows().filter(r => r.aspect === 'taxonomy');
    const session = rows.find(r => r.machine === 'sessionLane' && r.token === 'partner');
    const chrome = rows.find(r => r.machine === 'chromeDomain' && r.token === 'partner');
    const concept = rows.find(r => r.machine === 'conceptDomain' && r.token === 'partners');
    expect(session).toBeDefined();
    expect(chrome).toBeDefined();
    expect(concept).toBeDefined();
    expect(session!.id).not.toBe(chrome!.id);
    expect(concept!.token).not.toBe(chrome!.token);
    expect(session!.href).toBe('/portal/lanes/');
    expect(chrome!.href).toBe('/portal/partners/');
    expect(concept!.href).toBe('/portal/concepts/#domain=partners');
  });

  test('brand and partner-desk rows carry portal hrefs', () => {
    const brands = allPartnerSurfaceRows().filter(r => r.aspect === 'brand');
    expect(brands.every(r => r.href?.startsWith('/portal/brands/'))).toBe(true);
    expect(partnerDeskHrefs('spen')).toEqual({
      partnersHref: '/portal/partners/#partner/SPEN',
      accountingHref: '/portal/partners/#partner/SPEN/accounting',
      accountHref: '/portal/account/?account=SPEN',
      historyHref: '/portal/partner-history/?account=SPEN',
    });
    const boards = allPartnerSurfaceRows().filter(r => r.aspect === 'portal-board');
    expect(boards.every(r => Boolean(r.href))).toBe(true);
  });

  test('taxonomy homonyms carry distinct machine fields', () => {
    const taxonomy = allPartnerSurfaceRows().filter(r => r.aspect === 'taxonomy');
    for (const r of taxonomy) {
      expect(r.machine).toBeDefined();
    }
    const partnerRows = taxonomy.filter(r => r.token === 'partner');
    expect(partnerRows.length).toBeGreaterThanOrEqual(2);
    expect(new Set(partnerRows.map(r => r.machine)).size).toBe(partnerRows.length);
  });

  test('buildPartnerSurfaceInventory is stable-shaped', () => {
    const inv = buildPartnerSurfaceInventory('1970-01-01T00:00:00.000Z');
    expect(inv.kind).toBe('partner-surface-inventory');
    expect(inv.principle).toBe('map-before-rename');
    expect(inv.chromeDomain.id).toBe('partner');
    expect(inv.conceptDomain.id).toBe('partners');
    expect(inv.sessionLane.id).toBe('partner');
    expect(inv.rows.length).toBeGreaterThan(30);
    expect(inv.docs.lib).toBe('lib/docs/partner-surface-inventory.ts');
  });

  test('inventory ids are unique', () => {
    const ids = allPartnerSurfaceRows().map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('canonical partner docs have REF:ID anchors and typed portal/domain mappings', async () => {
    const conceptDomains = new Set<string>(CONCEPT_DOMAINS);
    const chromeDomains = new Set(PORTAL_DOMAIN_LANE_META.map(domain => domain.id));
    const chromeByPortalPath = new Map(
      [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV]
        .filter(item => item.domain)
        .map(item => [new URL(item.href, 'https://score.factory-wager.com').pathname, item.domain!])
    );
    expect(new Set(PARTNER_DOCUMENTATION_REFS.map(ref => ref.path)).size).toBe(
      PARTNER_DOCUMENTATION_REFS.length
    );

    const discovered = new Set<string>();
    for (const pattern of [
      'docs/**/*.md',
      'public/portal/**/*.md',
      'packages/partners/**/*.md',
      'lib/partner-profile/**/*.md',
      'lib/bookmakers/**/*.md',
    ]) {
      for await (const path of new Bun.Glob(pattern).scan({
        cwd: `${import.meta.dir}/..`,
        onlyFiles: true,
      })) {
        const lower = path.toLowerCase();
        if ((lower.includes('partner') || lower.includes('bookmaker')) && !lower.endsWith('.generated.md')) {
          discovered.add(path);
        }
      }
    }
    const mappedPaths = new Set(PARTNER_DOCUMENTATION_REFS.map(ref => ref.path));
    expect([...discovered].filter(path => !mappedPaths.has(path)).sort()).toEqual([]);

    for (const ref of PARTNER_DOCUMENTATION_REFS) {
      const file = Bun.file(`${import.meta.dir}/../${ref.path}`);
      expect(await file.exists()).toBe(true);
      const markdown = await file.text();
      expect(markdown).toContain(`<!-- REF:ID ${ref.refId} -->`);
      expect(markdown).toContain(`<a id="${ref.refId}"></a>`);
      expect(ref.conceptDomains.every(domain => conceptDomains.has(domain))).toBe(true);
      expect(ref.chromeDomains.every(domain => chromeDomains.has(domain))).toBe(true);
      expect(ref.primaryPortalHref.startsWith('/portal/')).toBe(true);
      const primaryPortalPath = new URL(
        ref.primaryPortalHref,
        'https://score.factory-wager.com'
      ).pathname;
      expect(ref.chromeDomains).toContain(chromeByPortalPath.get(primaryPortalPath)!);
    }
  });

  test('partner homonym still spans session + chrome + concept', () => {
    const exp = explainHomonym('partner');
    const machines = new Set(exp.hits.map(h => h.machine));
    expect(machines.has('sessionLane')).toBe(true);
    expect(machines.has('chromeDomain')).toBe(true);
    expect(machines.has('conceptDomain')).toBe(true);
  });

  test('schema v3 bags appear on brand registry wire chrome taxonomy and documentation rows', () => {
    const inv = buildPartnerSurfaceInventory('1970-01-01T00:00:00.000Z');
    expect(inv.schemaVersion).toBe(3);
    const brands = inv.rows.filter(r => r.aspect === 'brand');
    expect(brands.every(r => r.brand)).toBe(true);
    expect(brands.every(r => typeof r.brand?.isActive === 'boolean')).toBe(true);
    expect(brands.every(r => Boolean(r.brand?.domain && r.brand?.category))).toBe(true);
    const regs = inv.rows.filter(r => r.aspect === 'registry');
    expect(regs.every(r => r.registry)).toBe(true);
    const wires = inv.rows.filter(r => r.aspect === 'wire-field');
    expect(wires.every(r => r.wireField)).toBe(true);
    const nav = inv.rows.filter(r => r.aspect === 'chrome-nav');
    expect(nav.every(r => r.chromeNav)).toBe(true);
    const tax = inv.rows.filter(r => r.aspect === 'taxonomy');
    expect(tax.every(r => r.taxonomy?.homonymDistinct)).toBe(true);
    const docs = inv.rows.filter(r => r.aspect === 'doc-tenant');
    expect(docs).toHaveLength(PARTNER_DOCUMENTATION_REFS.length);
    expect(docs.every(r => r.documentation)).toBe(true);
    expect(docs.every(r => r.href === r.documentation?.primaryPortalHref)).toBe(true);
  });

  test('partner-code rows derive from live partners-ops codes', () => {
    expect(partnerCodeSurfaceRows([]).length).toBe(0);
    const codes = partnerCodeSurfaceRows(LIVE_FIXTURE);
    expect(codes.length).toBe(4);
    for (const r of codes) {
      expect(r.partnerCode?.brandRef).toBe('PartnerCode');
      expect(r.partnerCode?.registryRef).toBe('partners-ops');
      expect(r.partnerCode?.callSign).toBe(`${r.token}-001`);
      expect(r.properties).toContain('derived-from-partners-ops');
      expect(r.href).toBe(`/portal/partners/#partner/${r.token}`);
    }
    expect(new Set(codes.map(r => r.token))).toEqual(new Set(['ASH', 'BIL', 'NOV', 'SPEN']));
    const inv = buildPartnerSurfaceInventory('1970-01-01T00:00:00.000Z', {
      livePartnerCodes: LIVE_FIXTURE,
    });
    expect(inv.rows.filter(r => r.aspect === 'partner-code').length).toBe(4);
  });

  test('out-id rows derive from live partners-ops outs', () => {
    expect(outIdSurfaceRows([]).length).toBe(0);
    const outs = outIdSurfaceRows(LIVE_OUTS);
    expect(outs.length).toBe(3);
    for (const r of outs) {
      expect(r.outId?.brandRef).toBe('OutId');
      expect(r.outId?.registryRef).toBe('partners-ops');
      expect(r.properties).toContain('derived-from-partners-ops');
      expect(r.href).toBe(`/portal/partners/#partner/${r.outId!.partnerCode}`);
    }
    expect(outs.map(r => r.token)).toEqual(['out-ASH-1', 'out-ASH-2', 'out-SPEN-1']);
    const inv = buildPartnerSurfaceInventory('1970-01-01T00:00:00.000Z', {
      livePartnerCodes: LIVE_FIXTURE,
      liveOutIds: LIVE_OUTS,
    });
    expect(inv.rows.filter(r => r.aspect === 'out-id').length).toBe(3);
  });
});
