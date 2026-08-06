// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import {
  assertPortalChromeBoardCoverage,
  assertUniqueChromeNavIds,
  buildPortalChromeCatalog,
  groupOverflowNav,
  listChromeBoardCoverage,
  PORTAL_CHROME_BADGE_SOURCES,
  PORTAL_CHROME_COMPONENTS,
  PORTAL_OVERFLOW_NAV,
  PORTAL_PRIORITY_NAV,
  renderFooterHtml,
  renderPriorityNavHtml,
} from '../lib/portal/chrome-catalog.ts';

describe('portal-chrome-catalog', () => {
  test('priority nav includes ops and compliance', () => {
    const ids = PORTAL_PRIORITY_NAV.map(n => n.id);
    expect(ids).toContain('ops');
    expect(ids).toContain('compliance');
    expect(ids).toContain('health');
  });

  test('nav ids are unique (no duplicate env/etc)', () => {
    expect(() => assertUniqueChromeNavIds()).not.toThrow();
    const all = [...PORTAL_PRIORITY_NAV, ...PORTAL_OVERFLOW_NAV];
    expect(all.filter(n => n.id === 'env')).toHaveLength(1);
    expect(all.filter(n => n.href === '/portal/env/')).toHaveLength(1);
  });

  test('overflow includes vault packages ops boards; omits harness slots', () => {
    const byId = Object.fromEntries(PORTAL_OVERFLOW_NAV.map(n => [n.id, n]));
    expect(byId.vault?.href).toBe('/portal/vault/');
    expect(byId.vault?.group).toBe('secrets');
    expect(byId.env?.group).toBe('secrets');
    // Harness boards stay on direct URL / weave / footer — not default overflow nav.
    expect(byId.tools).toBeUndefined();
    expect(byId.failures).toBeUndefined();
    expect(byId.bunfig).toBeUndefined();
    expect(byId.doctor).toBeUndefined();
    expect(byId['install-hygiene']).toBeUndefined();
    expect(byId['console-format']).toBeUndefined();
    expect(PORTAL_OVERFLOW_NAV.every(n => n.group !== 'harness')).toBe(true);
    expect(byId.packages?.cli).toContain('ssot:flow:soft');
    expect(byId['prediction-report']?.href).toBe('/registry/prediction/report/');
    expect(byId.partners?.href).toBe('/portal/partners/');
    expect(byId.partners?.cli).toContain('telegram:handshake:catalog');
    expect(byId['partner-history']?.href).toBe('/portal/partner-history/');
    // Product boards that were missing from chrome
    expect(byId.tennis?.href).toBe('/portal/tennis/');
    expect(byId.factory?.href).toBe('/portal/factory/');
    expect(byId.identity?.href).toBe('/portal/identity/');
    expect(byId['limits-lab']?.href).toBe('/portal/limits-lab/');
    expect(byId.skills?.cli).toContain('skills:validate');
  });

  test('components register topbar footer sidebar glossary-ux', () => {
    const ids = PORTAL_CHROME_COMPONENTS.map(c => c.id);
    expect(ids).toContain('topbar');
    expect(ids).toContain('footer');
    expect(ids).toContain('sidebar');
    expect(ids).toContain('glossary-ux');
    expect(ids).toContain('brand-assets');
    expect(ids).toContain('operations-dashboard');
  });

  test('renderPriorityNavHtml marks active and overflow packages', () => {
    const html = renderPriorityNavHtml('ops');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('/portal/ops/');
    expect(html).toContain('/portal/packages/');
    expect(html).not.toContain('/portal/tools/');
    expect(html).not.toContain('/portal/doctor/');
    expect(html).not.toContain('/portal/failures/');
    expect(html).toContain('data-group="secrets"');
    expect(html).toContain('nav-overflow');
    expect(html).toContain('nav-group-label');
    expect(html).toContain('aria-label="Registry"');
    expect(html).toContain('aria-label="Ops · domain"');
    expect(html).toContain('data-registry=');
  });

  test('overflow menu groups ops (domain) before registry', () => {
    const groups = groupOverflowNav();
    const labels = groups.map(g => g.group);
    expect(labels.indexOf('ops')).toBeLessThan(labels.indexOf('registry'));
    expect(groups.some(g => g.group === 'secrets')).toBe(true);
    const opsItems = groups.find(g => g.group === 'ops')?.items.map(i => i.id) ?? [];
    expect(opsItems.indexOf('partners')).toBeLessThan(opsItems.indexOf('tennis'));
    expect(opsItems.indexOf('partners')).toBeLessThan(opsItems.indexOf('dashboard'));
    expect(opsItems).toContain('tennis');
  });

  test('domain lanes list partner desk boards first', () => {
    const c = buildPortalChromeCatalog('t');
    expect(c.domainLanes[0]?.id).toBe('partner');
    expect(c.domainLanes[0]?.boardIds).toContain('partners');
    expect(c.domainLanes[0]?.boardIds).toContain('limits');
    expect(c.summary.domainLanes).toBe(c.domainLanes.length);
    expect(c.related.partnersOps).toBe('/registry/partners-ops.json');
    expect(c.related.limitRaises).toBe('/registry/limit-raises.json');
    const partners = PORTAL_OVERFLOW_NAV.find(n => n.id === 'partners');
    expect(partners?.domain).toBe('partner');
    expect(partners?.registryArtifact).toBe('/registry/partners-ops.json');
    expect(renderPriorityNavHtml()).toContain('data-domain="partner"');
    expect(renderPriorityNavHtml()).toContain('aria-label="Ops · domain"');
  });

  test('board coverage includes every public portal board', () => {
    const portalDir = join(import.meta.dir, '../public/portal');
    const report = assertPortalChromeBoardCoverage(portalDir);
    expect(report.orphans).toEqual([]);
    expect(report.diskBoards).toContain('tennis');
    expect(report.diskBoards).toContain('doctor');
    const ids = listChromeBoardCoverage().map(b => b.id);
    expect(ids).toContain('tennis');
    expect(ids).toContain('doctor');
    expect(PORTAL_CHROME_BADGE_SOURCES.length).toBeGreaterThanOrEqual(6);
  });

  test('renderFooterHtml links monorepo health registry + bun slot', () => {
    const html = renderFooterHtml();
    expect(html).toContain('/registry/monorepo-health.json');
    expect(html).toContain('/registry/portal-weave.json');
    expect(html).toContain('portal-chrome.json');
    expect(html).not.toContain('/portal/tools/');
    expect(html).not.toContain('/portal/failures/');
    expect(html).not.toContain('/portal/install-hygiene/');
    expect(html).toContain('data-footer-bun');
  });

  test('catalog schema v1 with summary + related + bake-time Bun runtime', () => {
    const c = buildPortalChromeCatalog('t');
    expect(c.schemaVersion).toBe(1);
    expect(c.kind).toBe('portal-chrome');
    expect(c.components.length).toBeGreaterThan(5);
    expect(c.summary.components).toBe(c.components.length);
    expect(c.summary.priorityNav).toBe(c.priorityNav.length);
    expect(c.summary.badgeSources).toBe(c.badgeSources.length);
    expect(c.summary.unlistedSurfaces).toBe(c.unlistedSurfaces.length);
    expect(c.summary.boardCoverage).toBe(c.boardCoverage.length);
    expect(c.boardCoverage.some(b => b.tier === 'unlisted' && b.id === 'doctor')).toBe(true);
    expect(c.summary.groups.ops).toBeGreaterThan(0);
    expect(c.summary.groups.registry).toBeGreaterThan(0);
    expect(c.related.weave).toBe('/registry/portal-weave.json');
    expect(c.related.monorepoHealth).toBe('/registry/monorepo-health.json');
    expect(c.related.glossary).toBe('/registry/domain-glossary.json');
    expect(c.related.doctor).toBe('/registry/doctor-state.json');
    expect(c.related.bookmakers).toBe('/registry/bookmakers.json');
    expect(c.related.chrome).toBe('/registry/portal-chrome.json');
    expect(c.badgeSources.some(b => b.href === '/portal/health/')).toBe(true);
    expect(c.unlistedSurfaces.some(u => u.id === 'doctor')).toBe(true);
    expect(c.runtime.bunVersion).toBe(Bun.version);
    expect(c.runtime.bunRevision).toBe(Bun.revision.slice(0, 8));
  });

  test('footer includes tennis bookmakers wiki product links', () => {
    const html = renderFooterHtml();
    expect(html).toContain('/portal/tennis/');
    expect(html).toContain('/portal/bookmakers/');
    expect(html).toContain('Wiki');
  });
});
