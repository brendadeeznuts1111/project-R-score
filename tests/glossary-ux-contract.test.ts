import { describe, expect, test } from 'bun:test';

describe('shared glossary UX contract', () => {
  test('keeps DOM, fragments, focus, and telemetry bounded', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();

    expect(ux).toContain("new URLPattern({ hash: 'section\\\\::section' })");
    expect(ux).toContain("new URLPattern({ hash: 'glossary\\\\::concept' })");
    expect(ux).toContain('decodeURIComponent(value)');
    expect(ux).not.toContain('location.hash.slice');
    expect(ux).not.toContain('.innerHTML');
    expect(ux).toContain("el.setAttribute('aria-describedby'");
    expect(ux).toContain("item.setAttribute('aria-selected', 'false')");
    expect(ux).toContain("input.removeAttribute('aria-activedescendant')");
    expect(ux).toContain("button.addEventListener('click'");
    expect(ux).toContain("if (event.key === 'Escape') hideTip()");
    expect(ux).toContain('const TRACK_DETAIL_KEYS = Object.freeze');
    expect(ux).toContain("'page.view': ['page', 'section']");
    expect(ux).not.toContain("'page.view': ['path'");
    expect(ux).not.toContain('detail: { name, ...detail');
    expect(ux).toContain('export function surfaceByPath');
    expect(ux).toContain('export function markPortalSurface');
    expect(ux).toContain("const conceptId = surface?.concept ?? 'ui.semantic.surface'");
    expect(ux).toContain("document.documentElement.dataset.brand = 'factorywager'");
    expect(ux).toContain("link.dataset.portalGlossaryLink = 'true'");
    expect(ux).toContain('/portal/glossary/#glossary:');
    expect(ux).toContain('const tooltipRoots = new WeakSet()');
    expect(ux).toContain('const trackedPageViews = new Set()');
  });
});
