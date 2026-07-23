// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/child-process — Bun.spawnSync
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';
import {
  blogUrlForVersion,
  extractCodeBlocks,
  filterBlocks,
  parseBlogVersion,
  previewLine,
  runCli,
} from '../tools/bun-blog-codeblocks.ts';
import { bunBlog, BunBlogPattern } from '../lib/docs/bun-site-url.ts';

const FIXTURE = resolvePath(import.meta.dir, 'fixtures/bun-blog-codeblocks/sample.html');
const TOOL = resolvePath(import.meta.dir, '../tools/bun-blog-codeblocks.ts');

describe('bun-blog-codeblocks extract', () => {
  test('counts CodeBlock and skips CodeBlockTab', async () => {
    const html = await Bun.file(FIXTURE).text();
    const result = extractCodeBlocks(html);
    expect(result.codeBlockCount).toBe(2);
    expect(result.codeBlockTabCount).toBe(1);
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]?.section).toBe('files in Bun.build');
    expect(result.blocks[1]?.section).toBe('S3 Requester Pays Support');
    expect(result.blocks[0]?.code).toContain('Bun.build');
    expect(result.blocks[1]?.code).toContain('requestPayer: true');
  });

  test('previewLine prefers first non-comment line', () => {
    const preview = previewLine('// comment\nimport { s3 } from "bun";\ns3.file("x");');
    expect(preview).toBe('import { s3 } from "bun";');
  });

  test('parseBlogVersion from url / filename / semver', () => {
    expect(parseBlogVersion('https://bun.com/blog/bun-v1.3.6')).toBe('1.3.6');
    expect(parseBlogVersion('/tmp/bun-v1.3.6.html')).toBe('1.3.6');
    expect(parseBlogVersion('1.3.6')).toBe('1.3.6');
    expect(parseBlogVersion('nope')).toBeNull();
  });

  test('blogUrlForVersion uses bunBlog canonical shape', () => {
    const url = blogUrlForVersion('1.3.6');
    expect(url).toBe(bunBlog('bun-v1.3.6'));
    expect(BunBlogPattern.test(url)).toBe(true);
  });

  test('filterBlocks --section and --grep', async () => {
    const html = await Bun.file(FIXTURE).text();
    const { blocks } = extractCodeBlocks(html);
    expect(filterBlocks(blocks, { section: 2 })).toHaveLength(1);
    expect(filterBlocks(blocks, { section: 2 })[0]?.index).toBe(2);
    expect(filterBlocks(blocks, { grep: 'requestPayer' })).toHaveLength(1);
    expect(filterBlocks(blocks, { grep: 'files in Bun' })).toHaveLength(1);
    expect(filterBlocks(blocks, { all: true })).toHaveLength(2);
    expect(filterBlocks(blocks, {})).toHaveLength(0);
  });
});

describe('bun-blog-codeblocks CLI', () => {
  test('runCli on fixture prints index and writes artifacts', async () => {
    const outDir = resolvePath(Bun.env.TMPDIR ?? '/tmp', `fw-blog-cb-${Bun.randomUUIDv7()}`);
    const code = await runCli([
      FIXTURE,
      '--url',
      'https://bun.com/blog/bun-v9.9.9',
      '--out-dir',
      outDir,
    ]);
    expect(code).toBe(0);
    const jsonPath = resolvePath(outDir, 'bun-v9.9.9-CodeBlock.json');
    expect(await Bun.file(jsonPath).exists()).toBe(true);
    const inv = await Bun.file(jsonPath).json();
    expect(inv.count).toBe(2);
    expect(inv.version).toBe('9.9.9');
    expect(inv.guideKey).toBe('blog/bun-v9.9.9');
  });

  test('runCli --join adds matchedTokens to blocks', async () => {
    const outDir = resolvePath(Bun.env.TMPDIR ?? '/tmp', `fw-blog-cb-join-${Bun.randomUUIDv7()}`);
    const code = await runCli([
      FIXTURE,
      '--url',
      'https://bun.com/blog/bun-v9.9.9',
      '--out-dir',
      outDir,
      '--join',
    ]);
    expect(code).toBe(0);
    const inv = await Bun.file(resolvePath(outDir, 'bun-v9.9.9-CodeBlock.json')).json();
    expect(inv.blocks[0]?.matchedTokens).toContain('Bun.build');
  });

  test('missing HTML exits non-zero with curl hint', () => {
    const missing = resolvePath(
      Bun.env.TMPDIR ?? '/tmp',
      `bun-v0.0.0-missing-${Bun.randomUUIDv7()}.html`
    );
    const result = Bun.spawnSync({
      cmd: [
        'bun',
        TOOL,
        missing,
        '--url',
        'https://bun.com/blog/bun-v0.0.0',
      ],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(result.exitCode).not.toBe(0);
    const err = result.stderr.toString();
    expect(err).toContain('curl -fsSL');
    expect(err).toContain(missing);
  });
});
