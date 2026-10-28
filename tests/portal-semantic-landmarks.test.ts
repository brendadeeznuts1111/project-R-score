import { describe, expect, test } from 'bun:test';

const templatePath = `${import.meta.dir}/../public/portal/_page-template.html`;
const stylePath = `${import.meta.dir}/../public/portal/style.css`;

describe('portal semantic landmark template', () => {
  test('provides a keyboard path to one named main landmark', async () => {
    const html = await Bun.file(templatePath).text();
    expect(html).toContain(
      '<a class="portal-skip-link" href="#main-content">Skip to main content</a>'
    );
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('<main id="main-content" class="main portal-page" tabindex="-1">');
    expect(html).not.toContain('role="main"');
  });

  test('labels navigation and retains header and footer landmarks', async () => {
    const html = await Bun.file(templatePath).text();
    expect(html).toContain('<header class="topbar">');
    expect(html).toContain('<nav class="topbar-nav" aria-label="Primary">');
    expect(html).toContain('<nav id="tenant-sidebar" class="tenant-sidebar" aria-label="Tenants">');
    expect(html).toContain('<footer class="footer" data-portal-chrome="footer">');
  });

  test('keeps the skip link hidden until keyboard focus', async () => {
    const css = await Bun.file(stylePath).text();
    expect(css).toContain('.portal-skip-link {');
    expect(css).toContain('transform: translateY(-160%);');
    expect(css).toMatch(/\.portal-skip-link\s*\{[\s\S]*?&:focus\s*\{\s*transform: translateY\(0\);/);
  });
});
