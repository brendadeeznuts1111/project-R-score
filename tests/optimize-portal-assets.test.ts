import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  minifyCssFallback,
  measureInlineAssetBytes,
  optimizeHtml,
  optimizePortalAssets,
} from '../tools/optimize-portal-assets.ts';

async function temporaryBaseline(overrides: Record<string, unknown> = {}): Promise<string> {
  const path = resolvePath(import.meta.dir, `../tmp/portal-baseline-${crypto.randomUUID()}.json`);
  await Bun.write(
    path,
    JSON.stringify(
      {
        schemaVersion: 1,
        metric: 'aggregate-initial-js-css-by-route',
        pageCount: 0,
        baselineBytes: 10_000_000,
        minimumReductionPct: 1,
        revision: 'test',
        ...overrides,
      },
      null,
      2
    )
  );
  return path;
}

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

  test('bundle metric counts executable inline assets, not embedded JSON', () => {
    const html = `<script type="application/json">${'x'.repeat(100)}</script>
      <script type="module">const x = 1;</script><style>.x { color: red; }</style>`;
    expect(measureInlineAssetBytes(html)).toBe('const x = 1;'.length + '.x { color: red; }'.length);
  });

  test(
    'optimized Pages output keeps dot-directory discovery assets',
    async () => {
      const outdir = resolvePath(import.meta.dir, `../tmp/portal-optimizer-test-${process.pid}`);
      const report = await optimizePortalAssets({
        outdir,
        baselinePath: await temporaryBaseline(),
      });
      expect(report.pass).toBe(true);
      const discovery = await Bun.file(joinPath(outdir, '.well-known/mcp.json')).json();
      expect(discovery).toBeObject();
    },
    { timeout: 15_000 }
  );

  test('derives target bytes from the versioned reduction policy', async () => {
    const outdir = resolvePath(import.meta.dir, `../tmp/portal-optimizer-policy-${process.pid}`);
    const report = await optimizePortalAssets({
      outdir,
      baselinePath: await temporaryBaseline({ baselineBytes: 10_000, minimumReductionPct: 12.5 }),
    });
    expect(report.targetReductionPct).toBe(12.5);
    expect(report.targetBytes).toBe(8_750);
  });

  test('rejects a missing or invalid reduction policy', async () => {
    const outdir = resolvePath(import.meta.dir, `../tmp/portal-optimizer-invalid-${process.pid}`);
    await expect(
      optimizePortalAssets({
        outdir,
        baselinePath: await temporaryBaseline({ minimumReductionPct: 0 }),
      })
    ).rejects.toThrow('Unsupported portal performance baseline');
  });
});
