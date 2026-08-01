// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

describe('portal file-mode handoff', () => {
  test('health and the page template load the relative handoff before root assets', async () => {
    const [health, template] = await Promise.all([
      Bun.file('public/portal/health/index.html').text(),
      Bun.file('public/portal/_page-template.html').text(),
    ]);

    for (const html of [health, template]) {
      expect(html).toContain('href="../file-mode.css"');
      expect(html).toContain('src="../file-mode.js"');
      expect(html.indexOf('../file-mode.js')).toBeLessThan(html.indexOf('/portal/style.css'));
    }
  });

  test('file mode derives the portal route and offers local plus deployed origins', async () => {
    const script = await Bun.file('public/portal/file-mode.js').text();

    expect(script).toContain("location.protocol !== 'file:'");
    expect(script).toContain("const publicMarker = '/public/'");
    expect(script).toContain("route.replace(/\\/index\\.html$/, '/')");
    expect(script).toContain("new URL(route, 'http://localhost:3000')");
    expect(script).toContain("new URL(route, 'https://project-r-score.pages.dev')");
    expect(script).toContain('bun run serve:public:hot');
    expect(script).not.toContain('location.replace(');
  });

  test('critical file-mode styling hides the broken shell and keeps the handoff visible', async () => {
    const css = await Bun.file('public/portal/file-mode.css').text();

    expect(css).toContain('html[data-portal-runtime="file"]');
    expect(css).toContain("body > :not(.file-mode-guard)");
    expect(css).toContain('display: none !important');
    expect(css).toContain('html[data-portal-runtime="file"] .file-mode-guard');
  });
});
