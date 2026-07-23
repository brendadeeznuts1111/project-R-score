// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';
import {
  blogHitToTokenExample,
  buildDerivedApiRows,
  joinBlogExamplesFromHtml,
  matchBlocksToTokens,
} from '../lib/docs/blog-codeblock-join.ts';
import { bunBlog } from '../lib/docs/bun-site-url.ts';
import { extractCodeBlocks, filterBlocks } from '../tools/bun-blog-codeblocks.ts';
import { buildTokenIndex, loadScrapeAliases } from '../tools/bun-docs-releases.ts';

const FIXTURE = resolvePath(import.meta.dir, 'fixtures/bun-blog-codeblocks/sample.html');
const ARCHIVE_FIXTURE = resolvePath(
  import.meta.dir,
  'fixtures/bun-blog-codeblocks/bun-v1.3.6-archive.html'
);

describe('blog-codeblock-join', () => {
  test('matchBlocksToTokens maps Bun.build and S3 blocks to catalog names', async () => {
    const html = await Bun.file(FIXTURE).text();
    const { blocks } = extractCodeBlocks(html);
    const tokenIndex = new Map<string, string>([
      ['bun.build', 'Bun.build'],
      ['bun.file', 'Bun.file'],
    ]);
    const joined = matchBlocksToTokens(blocks, {
      version: '9.9.9',
      postUrl: bunBlog('bun-v9.9.9'),
      tokenIndex,
      scrapeAliases: {},
    });
    const names = joined.map(e => e.name).sort();
    expect(names).toContain('Bun.build');
    const build = joined.find(e => e.name === 'Bun.build');
    expect(build?.examples[0]?.blockIndex).toBe(1);
    expect(blogHitToTokenExample(build!.examples[0]!).fragment).toBe('blog/bun-v9.9.9#1');
  });

  test('v1.3.6 Archive fixture joins Bun.Archive, Bun.file, Bun.write', async () => {
    const html = await Bun.file(ARCHIVE_FIXTURE).text();
    const { codeBlockCount } = extractCodeBlocks(html);
    expect(codeBlockCount).toBe(3);

    const [tokenIndex, scrapeAliases] = await Promise.all([
      buildTokenIndex(),
      loadScrapeAliases(),
    ]);
    const joined = await joinBlogExamplesFromHtml(html, {
      version: '1.3.6',
      url: bunBlog('bun-v1.3.6'),
    }, { tokenIndex, scrapeAliases });

    const names = joined.map(e => e.name).sort();
    expect(names).toContain('Bun.Archive');
    expect(names).toContain('Bun.write');

    const archive = joined.find(e => e.name === 'Bun.Archive');
    expect(archive?.examples).toHaveLength(3);
    expect(archive?.examples[0]?.body).toContain('new Bun.Archive({');
    expect(archive?.examples[0]?.blockIndex).toBe(1);
    expect(archive?.examples[0]?.kind).toBe('ship');
    expect(blogHitToTokenExample(archive!.examples[0]!).fragment).toBe('blog/bun-v1.3.6#1');
  });

  test('buildDerivedApiRows splits Archive block #1 into sub-API rows', async () => {
    const html = await Bun.file(ARCHIVE_FIXTURE).text();
    const { blocks } = extractCodeBlocks(html);
    const main = blocks[0]!;
    expect(main.code.split('\n').length).toBeGreaterThan(20);

    const [tokenIndex, scrapeAliases] = await Promise.all([
      buildTokenIndex(),
      loadScrapeAliases(),
    ]);
    const rows = buildDerivedApiRows([main], {
      version: '1.3.6',
      tokenIndex,
      scrapeAliases,
    });
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.every(r => r.catalogToken === 'Bun.Archive')).toBe(true);
    expect(rows.some(r => r.preview.includes('archive.blob'))).toBe(true);
    expect(rows.some(r => r.preview.includes('compress: "gzip"'))).toBe(true);
  });

  test('buildDerivedApiRows splits multi-concern blocks in sample fixture', async () => {
    const html = await Bun.file(FIXTURE).text();
    const { blocks } = extractCodeBlocks(html);
    const rows = buildDerivedApiRows(blocks, {
      version: '9.9.9',
      tokenIndex: new Map([['bun.build', 'Bun.build']]),
      scrapeAliases: {},
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.source === 'blog-codeblock')).toBe(true);
    expect(rows.some(r => r.catalogToken === 'Bun.build')).toBe(true);
  });
});

describe('blog-codeblock-join live cache', () => {
  test('cached bun-v1.3.6.html has 32 blocks and 3 Archive grep hits', async () => {
    const cached = '/tmp/bun-v1.3.6.html';
    if (!(await Bun.file(cached).exists())) return;

    const html = await Bun.file(cached).text();
    const { codeBlockCount } = extractCodeBlocks(html);
    expect(codeBlockCount).toBeGreaterThanOrEqual(30);

    const arch = filterBlocks(extractCodeBlocks(html).blocks, { grep: 'Bun.Archive' });
    expect(arch).toHaveLength(3);
    expect(arch[0]?.code.split('\n').length).toBe(25);
  });
});
