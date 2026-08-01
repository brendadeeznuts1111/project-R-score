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
    expect(ux).toContain('export function sectionDomIdFromSurface');
    expect(ux).toContain('export function sectionTitleFromSurface');
    expect(ux).toContain('export function applySectionTitles');
    expect(ux).toContain('export function primarySectionTitleEl');
    expect(ux).toContain('export function sectionHashFromLocation');
    expect(ux).toContain('export function scrollGlossarySection');
    expect(ux).toContain('export function scrollGlossarySectionFromUrl');
    expect(ux).toContain('scrollSections');
    expect(ux).toContain('applySectionTitles');
    expect(ux).toContain('el.scrollIntoView');
    expect(ux).toContain("const conceptId = surface?.concept ?? 'ui.semantic.surface'");
    expect(ux).toContain("document.documentElement.dataset.brand = 'factorywager'");
    expect(ux).toContain("link.dataset.portalGlossaryLink = 'true'");
    expect(ux).toContain('/portal/glossary/#glossary:');
    expect(ux).toContain('const tooltipRoots = new WeakSet()');
    expect(ux).toContain('const sectionScrollRoots = new WeakSet()');
    expect(ux).toContain('const trackedPageViews = new Set()');
  });

  test('resolves v3 surface domId without board-local id inventing', async () => {
    const {
      sectionDomIdFromSurface,
      sectionConceptFromSurface,
      sectionTitleFromSurface,
    } = await import('../public/portal/components/glossary-ux.js');
    const surface = {
      path: '/portal/account/',
      concept: 'page.accountDossier',
      sections: [
        {
          hash: 'identity',
          domId: 'ad-section-identity',
          conceptId: 'ops.limits.account',
          title: 'Identity',
        },
        {
          hash: 'outs',
          domId: 'ad-section-outs',
          conceptId: 'section.partnersOuts',
          title: 'Outs',
        },
      ],
    };
    expect(sectionDomIdFromSurface(surface, 'identity')).toBe('ad-section-identity');
    expect(sectionDomIdFromSurface(surface, 'missing')).toBeNull();
    expect(sectionConceptFromSurface(surface, 'outs')).toBe('section.partnersOuts');
    expect(sectionTitleFromSurface(surface, 'identity')).toBe('Identity');
    expect(sectionTitleFromSurface(surface, 'missing')).toBeNull();
    expect(sectionDomIdFromSurface({ sections: 'legacy' }, 'identity')).toBeNull();
  });

  test('applySectionTitles is wireable without inventing concept.label as heading', async () => {
    const ux = await Bun.file('public/portal/components/glossary-ux.js').text();
    // Board heading path uses section.title; tooltips still use concept label/description
    expect(ux).toContain('target.textContent = title');
    expect(ux).toContain('sectionEl.dataset.sectionTitle = title');
    expect(ux).toContain('a.section-anchor');
    expect(ux).toContain('options.applySectionTitles !== false');
    // Limits explicitly enables the PoC
    const limits = await Bun.file('public/portal/limits/limit-profiles.js').text();
    expect(limits).toContain('applySectionTitles: true');
  });
});
