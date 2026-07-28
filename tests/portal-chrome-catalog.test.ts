// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildPortalChromeCatalog,
  PORTAL_CHROME_COMPONENTS,
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

  test('components register topbar footer sidebar', () => {
    const ids = PORTAL_CHROME_COMPONENTS.map(c => c.id);
    expect(ids).toContain('topbar');
    expect(ids).toContain('footer');
    expect(ids).toContain('sidebar');
    expect(ids).toContain('operations-dashboard');
  });

  test('renderPriorityNavHtml marks active and overflow packages', () => {
    const html = renderPriorityNavHtml('ops');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('/portal/ops/');
    expect(html).toContain('/portal/packages/');
    expect(html).toContain('nav-overflow');
  });

  test('renderFooterHtml links monorepo health registry', () => {
    const html = renderFooterHtml();
    expect(html).toContain('/registry/monorepo-health.json');
    expect(html).toContain('portal-chrome.json');
  });

  test('catalog schema v1 with summary + related', () => {
    const c = buildPortalChromeCatalog('t');
    expect(c.schemaVersion).toBe(1);
    expect(c.kind).toBe('portal-chrome');
    expect(c.components.length).toBeGreaterThan(5);
    expect(c.summary.components).toBe(c.components.length);
    expect(c.summary.priorityNav).toBe(c.priorityNav.length);
    expect(c.related.weave).toBe('/registry/portal-weave.json');
    expect(c.related.monorepoHealth).toBe('/registry/monorepo-health.json');
  });
});
