// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/glob — Bun.Glob
import { describe, expect, test } from 'bun:test';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';

async function portalPages(): Promise<string[]> {
  const pages = new Set<string>(['public/portal/index.html']);
  for await (const path of new Bun.Glob('public/portal/**/index.html').scan({
    cwd: process.cwd(),
    onlyFiles: true,
  })) {
    pages.add(path);
  }
  return [...pages].sort();
}

describe('portal design kernel', () => {
  test('every portal page consumes shared tokens, brand chrome, and glossary bootstrap', async () => {
    const discoveredPages = new Set(await portalPages());
    const pages = PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => `public${page.path}index.html`);
    expect(pages).toHaveLength(28);

    const failures: string[] = [];
    for (const page of pages) {
      if (!discoveredPages.has(page)) failures.push(`${page}: registered glossary page is missing`);
      const html = await Bun.file(page).text();
      const requirements = [
        ['/portal/style.css', 'shared theme stylesheet'],
        ['/portal/data.js', 'shared data service'],
        ['/portal/topbar.js', 'brand and glossary bootstrap'],
      ] as const;
      for (const [needle, label] of requirements) {
        if (!html.includes(needle)) failures.push(`${page}: missing ${label}`);
      }
      if (/:root\s*\{/.test(html)) failures.push(`${page}: redeclares root design tokens`);
    }
    expect(failures).toEqual([]);
  });

  test('shared kernel owns brand and semantic tone aliases', async () => {
    const [tokens, style, topbar, glossaryUx] = await Promise.all([
      Bun.file('public/portal/theme-tokens.css').text(),
      Bun.file('public/portal/style.css').text(),
      Bun.file('public/portal/topbar.js').text(),
      Bun.file('public/portal/components/glossary-ux.js').text(),
    ]);

    for (const token of [
      '--brand-accent',
      '--brand-wordmark',
      '--tone-ok',
      '--tone-warn',
      '--tone-bad',
      '--tone-info',
      '--tone-skip',
    ]) {
      expect(tokens).toContain(`${token}:`);
    }
    expect(style).toContain('color: var(--brand-wordmark)');
    expect(style).toContain('background: var(--tone-ok-bg)');
    expect(topbar).toContain('bootstrapGlossarySurface');
    expect(glossaryUx).toContain("const conceptId = surface?.concept ?? 'ui.semantic.surface'");
  });
});
