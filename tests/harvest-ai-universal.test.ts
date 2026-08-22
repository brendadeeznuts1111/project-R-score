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
  harvestLanguageStats,
  mapHarvestToBlogMarkdown,
  resolveHarvestMapConfig,
} from '../lib/docs/blog-codeblocks.ts';
import { CONFIG } from '../tools/harvest.ts';
import {
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
    expect(CONFIG.enableAI).toBe(false);
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
});

describe('harvest-ai-universal CLI', () => {
  test('writes report.md html json from a local HTML file without --ai', async () => {
    const tmp = resolvePath(Bun.env.TMPDIR ?? '/tmp', `fw-harvest-uni-${Bun.randomUUIDv7()}`);
    const htmlPath = resolvePath(tmp, 'page.html');
    const outDir = resolvePath(tmp, 'report');
    await Bun.write(
      htmlPath,
      `<h2 id="intro-heading">Hello</h2>
       <table><tr><th>K</th><th>V</th></tr><tr><td>fastify</td><td>120 MB</td></tr></table>
       <li id="fn-note">A footnote.</li>`
    );
    const code = await runHarvestUniversal([htmlPath, outDir, '0']);
    expect(code).toBe(0);
    const md = await Bun.file(resolvePath(outDir, 'report.md')).text();
    expect(md).toMatch(/\|\s*K\s+\|\s+V\s+\|/);
    expect(md).toContain('fastify');
    expect(md).toContain('footnote `fn-note`');
    expect(md).not.toContain('- summary:');
    expect(await Bun.file(resolvePath(outDir, 'report.html')).exists()).toBe(true);
    const json = await Bun.file(resolvePath(outDir, 'report.json')).json();
    expect(json.ai).toBe(false);
    expect(json.extracted.tables.length).toBe(1);
    expect(json.extracted.footnotes.length).toBe(1);
  });
});
