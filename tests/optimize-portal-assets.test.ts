import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  minifyCssFallback,
  optimizeHtml,
  optimizePortalAssets,
} from '../tools/optimize-portal-assets.ts';

describe('portal deployment optimizer', () => {
  test('minifies runnable inline assets without changing JSON scripts', async () => {
    const html = `
      <style>.card { color: red; padding: 4px 8px; }</style>
      <script type="application/json">{ "keep": "readable value" }</script>
      <script type="module">const longName = 1 + 2; console.log(longName);</script>
    `;
    const optimized = await optimizeHtml(html);
    expect(optimized).toContain('<style>.card{color:red;padding:4px 8px;}</style>');
    expect(optimized).toContain('{ "keep": "readable value" }');
    expect(optimized.length).toBeLessThan(html.length);
  });

  test('defers redundant shared chrome scripts when topbar owns their idle imports', async () => {
    const html = `
      <script type="module" src="/portal/topbar.js"></script>
      <script type="module" src="/portal/data.js"></script>
      <script type="module" src="/portal/components/sidebar.js"></script>
      <script type="module" src="/portal/components/notification.js"></script>
      <script type="module" src="/portal/components/footer.js"></script>
    `;
    const optimized = await optimizeHtml(html);
    expect(optimized).toContain('src="/portal/topbar.js"');
    expect(optimized).not.toContain('src="/portal/data.js"');
    expect(optimized).not.toContain('src="/portal/components/sidebar.js"');
    expect(optimized).not.toContain('src="/portal/components/notification.js"');
    expect(optimized).not.toContain('src="/portal/components/footer.js"');
  });

  test('CSS fallback preserves quoted whitespace', () => {
    expect(minifyCssFallback('.x { content: "a  b"; margin: 0  1px; }')).toBe(
      '.x{content:"a  b";margin:0 1px;}'
    );
  });

  test(
    'optimized Pages output keeps dot-directory discovery assets',
    async () => {
      const outdir = resolvePath(import.meta.dir, `../tmp/portal-optimizer-test-${process.pid}`);
      const report = await optimizePortalAssets({ outdir });
      expect(report.pass).toBe(true);
      const discovery = await Bun.file(joinPath(outdir, '.well-known/mcp.json')).json();
      expect(discovery).toBeObject();
    },
    { timeout: 15_000 }
  );
});
