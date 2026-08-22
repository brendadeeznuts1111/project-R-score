// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';
import {
  detectCodeLanguage,
  extractCodeBlocks,
  filterHarvestForConfig,
  formatHarvestFlagCmdTable,
  formatHarvestTable,
  formatHarvestTemplateTable,
  harvestTableHeaderLabel,
  HARVEST_CLI_CMD,
  HARVEST_RUNTIME,
  HARVEST_TEMPLATE_ROWS,
  harvestLanguageStats,
  harvestRuntimeVersion,
  mapHarvestToBlogMarkdown,
  resolveHarvestMapConfig,
} from '../lib/docs/blog-codeblocks.ts';
import { CONFIG } from '../tools/harvest.ts';
import {
  harvestUniversalUsage,
  parseHarvestUniversalArgv,
  runHarvestUniversal,
} from '../lib/docs/harvest-universal.ts';

describe('harvest-ai-universal argv', () => {
  test('parses --ai url outdir depth', () => {
    expect(
      parseHarvestUniversalArgv(['--ai', 'https://example.com/blog', './report', '0'])
    ).toEqual({
      ai: true,
      help: false,
      url: 'https://example.com/blog',
      outDir: './report',
      depth: 0,
    });
    expect(parseHarvestUniversalArgv(['https://example.com/blog', './report', '0'])).toEqual({
      ai: false,
      help: false,
      url: 'https://example.com/blog',
      outDir: './report',
      depth: 0,
    });
  });
});

describe('harvest.js CONFIG', () => {
  test('all include* flags default true and enableAI is false until --ai', () => {
    expect(CONFIG.includeToc).toBe(true);
    expect(CONFIG.includeStats).toBe(true);
    expect(CONFIG.includeImages).toBe(true);
    expect(CONFIG.includeLinks).toBe(true);
    expect(CONFIG.includeInlineCode).toBe(true);
    expect(CONFIG.includeCodeBlocks).toBe(true);
    expect(CONFIG.includeTables).toBe(true);
    expect(CONFIG.includeFootnotes).toBe(true);
    expect(CONFIG.includeRawJson).toBe(true);
    expect(CONFIG.includeSocial).toBe(true);
    expect(CONFIG.enableAI).toBe(false);
  });

  test('template table lists Type, Property, Flag, Cmd, Runtime, and Version', () => {
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.flag)).toEqual([
      '—',
      '—',
      '—',
      '—',
      '—',
      'includeCodeBlocks',
      'includeImages',
      'includeLinks',
      'includeInlineCode',
      'includeTables',
      'includeFootnotes',
      'includeSocial',
      'includeToc',
      'includeStats',
      'includeRawJson',
      '--ai',
      '<url>',
      '<outdir>',
      '[depth]',
    ]);
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.property)).toContain('CONFIG.includeTables');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.property)).toContain('SocialMetadata.image');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.flag)).toContain('includeSocial');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.cmd)).toContain('HTMLRewriter');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.property)).toContain('HTMLRewriter.transform');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.property)).toContain('Bun.version');
    expect(HARVEST_TEMPLATE_ROWS.map(row => row.property)).toContain('Bun.argv');
    const flags = formatHarvestFlagCmdTable();
    expect(flags).toContain('| Type');
    expect(flags).toContain('| Property');
    expect(flags).toContain('| Flag');
    expect(flags).toContain('| Cmd');
    expect(flags).toContain('| Runtime');
    expect(flags).toContain('| Version');
    expect(flags).toContain('includeTables');
    expect(flags).toContain('CONFIG.includeTables');
    expect(flags).toContain('--ai');
    expect(flags).toContain(HARVEST_CLI_CMD);
    expect(flags).toContain(HARVEST_RUNTIME);
    expect(flags).toContain(harvestRuntimeVersion());
    expect(flags).not.toContain('| Field');
    expect(harvestUniversalUsage()).toContain(flags);

    const html = `
      <h2 id="what-s-new">What's new</h2>
      <table><tr><th>K</th><th>V</th></tr><tr><td>fastify</td><td>120 MB</td></tr></table>`;
    const table = formatHarvestTemplateTable(extractCodeBlocks(html));
    expect(table).toContain('| Field');
    expect(table).toContain('| Type');
    expect(table).toContain('| Property');
    expect(table).toContain('| Flag');
    expect(table).toContain('| Cmd');
    expect(table).toContain('| Runtime');
    expect(table).toContain('| Version');
    expect(table).toContain('| Count');
    expect(table).toContain(HARVEST_RUNTIME);
    expect(table).toContain(harvestRuntimeVersion());
    expect(table).toMatch(
      /\|\s*Tables\s+\|\s+BlogTable\[\]\s+\|\s+CONFIG\.includeTables\s+\|\s+includeTables\s+\|\s+CONFIG\s+\|\s+Bun\s+\|\s+\S+\s+\|\s+1\s+\|/
    );
    expect(table).toMatch(
      /\|\s*H2\s+\|\s+HeadingNode\[\]\s+\|\s+HarvestMapStats\.h2\s+\|\s+—\s+\|\s+extract\s+\|\s+Bun\s+\|\s+\S+\s+\|\s+1\s+\|/
    );
  });
});

describe('language stats, captions, inline context', () => {
  test('detectCodeLanguage maps class tokens to labels', () => {
    expect(detectCodeLanguage('language-ts')).toBe('TypeScript');
    expect(detectCodeLanguage('highlight-source-js')).toBe('JavaScript');
    expect(detectCodeLanguage('')).toBe('text');
  });

  test('pre/code language, line count, caption, and inline context honour include* filters', () => {
    const html = `
      <h2 id="what-s-new">What's new</h2>
      <p>See <code>Bun.markdown.html</code> in the guide.</p>
      <pre class="language-ts"><code class="language-ts">const html = Bun.markdown.html("# Hello");
const ansi = Bun.markdown.render(src, {});</code></pre>
      <table>
        <caption>Peak memory</caption>
        <tr><th>Server</th><th>RSS</th></tr>
        <tr><td>Bun.serve</td><td>36 MB</td></tr>
      </table>`;
    const result = extractCodeBlocks(html, { includeGenericPre: true });
    expect(result.blocks[0]?.language).toBe('TypeScript');
    expect(result.blocks[0]?.lineCount).toBe(2);
    expect(result.blocks[0]?.codeHash.length).toBe(64);
    expect(harvestLanguageStats(result.blocks)[0]).toMatchObject({
      language: 'TypeScript',
      blocks: 1,
      percent: 100,
    });
    expect(result.tables[0]?.caption).toBe('Peak memory');
    expect(result.inlineCodes[0]?.text).toBe('Bun.markdown.html');
    expect(result.inlineCodes[0]?.context).toContain('Bun.markdown.html');

    const md = mapHarvestToBlogMarkdown(result, { sourceUrl: 'https://example.com/blog' });
    expect(md).toContain('| Language   | Blocks | Share | Lines |');
    expect(md).toContain('| TypeScript |      1 |  100% |     2 |');
    expect(md).toContain('*Peak memory*');
    expect(md).toContain('| Server    | RSS   |');
    expect(md).toContain('| Bun.serve | 36 MB |');
    expect(md).toContain('language: `TypeScript` · 2 lines');

    const skipped = filterHarvestForConfig(
      result,
      resolveHarvestMapConfig({
        includeImages: false,
        includeLinks: false,
        includeInlineCode: false,
        includeCodeBlocks: false,
        includeTables: true,
        includeFootnotes: true,
      })
    );
    expect(skipped.blocks).toEqual([]);
    expect(skipped.inlineCodes).toEqual([]);
    expect(skipped.tables).toHaveLength(1);
  });
});

describe('tables and footnotes', () => {
  test('extracts a table and a footnote under the owning heading', () => {
    const html = `
      <h2 id="what-s-new">What's new</h2>
      <table>
        <tr><th>Module</th><th>Pass</th></tr>
        <tr><td>node:http</td><td>97%</td></tr>
      </table>
      <li id="fn-1" class="footnote">See the Bun.markdown guide.</li>
      <div class="CodeBlock group/code"><pre><code>const html = Bun.markdown.html("# Hello");</code></pre></div>`;
    const result = extractCodeBlocks(html);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]?.headingId).toBe('what-s-new');
    expect(result.tables[0]?.markdown).toContain('| Module    | Pass |');
    expect(result.tables[0]?.markdown).toContain('| node:http |  97% |');
    expect(result.footnotes).toHaveLength(1);
    expect(result.footnotes[0]?.footnoteId).toBe('fn-1');
    expect(result.footnotes[0]?.text).toContain('Bun.markdown');
  });

  test('empty headers come from the parsed th form object, not Open Graph', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Bun 1.4" />
      </head><body>
      <h2 id="binary-size">Binary size</h2>
      <table>
        <caption>Binary size</caption>
        <tr><th aria-label="Platform"></th><th>Bun 1.4</th><th>Bun 1.3.14</th></tr>
        <tr><td>Linux x64</td><td>77.0 MB</td><td>88.5 MB</td></tr>
      </table>
      <table>
        <tr><th></th><th>Bun 1.3</th><th>Bun 1.4</th><th title="Speedup"></th></tr>
        <tr><td>no-op call</td><td>2.13 ns</td><td>0.70 ns</td><td>3.0×</td></tr>
        <tr><td>opentui layout reads (1,000)</td><td></td><td></td><td>2.08×</td></tr>
      </table>
      </body></html>`;
    const result = extractCodeBlocks(html);
    expect(result.social.title).toBe('Bun 1.4');
    expect(result.tables[0]?.caption).toBe('Binary size');
    expect(result.tables[0]?.headers[0]).toMatchObject({
      text: '',
      ariaLabel: 'Platform',
      label: 'Platform',
    });
    expect(result.tables[0]?.markdown).toContain('| Platform');
    expect(result.tables[0]?.markdown).not.toContain('| Bun 1.4 | Bun 1.4 |');
    expect(result.tables[1]?.headers[3]).toMatchObject({
      text: '',
      title: 'Speedup',
      label: 'Speedup',
    });
    expect(result.tables[1]?.markdown).toContain('| Speedup');
    expect(result.tables[1]?.markdown).toMatch(/\|\s*—\s+\|\s+—\s+\|\s+2\.08×/);

    const live = result.tables[0]!;
    live.headers[0] = { ...live.headers[0]!, ariaLabel: 'OS', text: '' };
    expect(
      harvestTableHeaderLabel(live.headers[0]!, 0, ['Linux x64'])
    ).toBe('OS');
    expect(formatHarvestTable(live.headers, live.rows)).toContain('| OS');
    expect(formatHarvestTable(live.headers, live.rows)).not.toContain('| Platform');
    const remapped = mapHarvestToBlogMarkdown(result, { sourceUrl: 'https://bun.com/blog/bun-v1.4' });
    expect(remapped).toContain('| OS');
  });

  test('includeTables: false drops tables from the markdown map', () => {
    const html = `
      <h2 id="production">Production</h2>
      <table><tr><th>A</th></tr><tr><td>1</td></tr></table>`;
    const result = extractCodeBlocks(html);
    const withTables = mapHarvestToBlogMarkdown(result, {
      sourceUrl: 'https://example.com/blog',
    });
    expect(withTables).toMatch(/\|\s*A\s*\|/);
    const without = mapHarvestToBlogMarkdown(result, {
      sourceUrl: 'https://example.com/blog',
      config: { includeTables: false, includeRawJson: false },
    });
    expect(without).not.toContain('| A |');
    expect(without).toContain('## TOC');
  });

  test('HTMLRewriter extracts Open Graph and Twitter share images', () => {
    const html = `<html><head>
      <title>Fallback Title</title>
      <meta property="og:title" content="OG Title" />
      <meta property="og:image" content="/share.png" />
      <meta name="twitter:description" content="Twitter desc" />
    </head><body><h2 id="what-s-new">What's new</h2></body></html>`;
    const result = extractCodeBlocks(html, { baseUrl: 'https://bun.com/blog/bun-v1.4' });
    expect(result.social).toMatchObject({
      title: 'OG Title',
      image: 'https://bun.com/share.png',
      description: 'Twitter desc',
    });
    const md = mapHarvestToBlogMarkdown(result, { sourceUrl: 'https://bun.com/blog/bun-v1.4' });
    expect(md).toContain('## Social');
    expect(md).toContain('![og:image](https://bun.com/share.png)');
    const dropped = mapHarvestToBlogMarkdown(result, {
      sourceUrl: 'https://bun.com/blog/bun-v1.4',
      config: { includeSocial: false, includeRawJson: false },
    });
    expect(dropped).not.toContain('## Social');
    expect(dropped).not.toContain('og:image');
  });
});

describe('harvest-ai-universal CLI', () => {
  test('writes report.md html json from a local HTML file without --ai', async () => {
    const tmp = resolvePath(Bun.env.TMPDIR ?? '/tmp', `fw-harvest-uni-${Bun.randomUUIDv7()}`);
    const htmlPath = resolvePath(tmp, 'page.html');
    const outDir = resolvePath(tmp, 'report');
    await Bun.write(
      htmlPath,
      `<html><head>
         <meta property="og:title" content="Bun — A fast all-in-one JavaScript runtime" />
         <meta property="og:image" content="https://bun.com/share_v4.png" />
         <meta property="og:type" content="website" />
         <meta name="twitter:description" content="Bundle, install, and run JavaScript." />
       </head><body>
       <h2 id="intro-heading">Hello</h2>
       <table><tr><th>K</th><th>V</th></tr><tr><td>fastify</td><td>120 MB</td></tr></table>
       <li id="fn-note">A footnote.</li>
       </body></html>`
    );
    const code = await runHarvestUniversal([htmlPath, outDir, '0']);
    expect(code).toBe(0);
    const md = await Bun.file(resolvePath(outDir, 'report.md')).text();
    expect(md).toContain('## Config');
    expect(md).toContain('| Type');
    expect(md).toContain('| Property');
    expect(md).toContain('| Flag');
    expect(md).toContain('| Cmd');
    expect(md).toContain('| Runtime');
    expect(md).toContain('| Version');
    expect(md).toContain('includeTables');
    expect(md).toContain('CONFIG.includeTables');
    expect(md).toContain('## Social');
    expect(md).toContain('Bun — A fast all-in-one JavaScript runtime');
    expect(md).toContain('![og:image](https://bun.com/share_v4.png)');
    expect(md).toContain('Bundle, install, and run JavaScript.');
    expect(md).toMatch(/\|\s*K\s+\|\s+V\s+\|/);
    expect(md).toContain('fastify');
    expect(md).toContain('footnote `fn-note`');
    expect(md).not.toContain('- summary:');
    expect(await Bun.file(resolvePath(outDir, 'report.html')).exists()).toBe(true);
    const json = await Bun.file(resolvePath(outDir, 'report.json')).json();
    expect(json.ai).toBe(false);
    expect(json.extracted.tables.length).toBe(1);
    expect(json.extracted.footnotes.length).toBe(1);
    expect(json.extracted.social).toMatchObject({
      title: 'Bun — A fast all-in-one JavaScript runtime',
      image: 'https://bun.com/share_v4.png',
      type: 'website',
      description: 'Bundle, install, and run JavaScript.',
    });
  });
});
