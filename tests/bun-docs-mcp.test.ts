import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildDocIndex,
  buildSlugMap,
  cleanMdx,
  extractSection,
  htmlArticleToText,
  listCategories,
  parseRssItems,
  pickBestDocRoot,
  queryDocs,
  readDocPage,
  resolveDocSlug,
  searchDocs,
  searchDocsAsync,
  warmDocContent,
  blogSlugFromLink,
  buildBlogUrl,
  normalizeBlogSlug,
  type DocRootCandidate,
} from '../tools/bun-docs-mcp-lib.ts';
import { formatSearchHits } from '../tools/bun-docs-mcp-format.ts';
import { getCuratedEntry } from '../tools/bun-docs-curated.ts';

describe('bun-docs-mcp-lib', () => {
  let savedEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    savedEnv = {};
  });

  function stashEnv(key: string) {
    if (!(key in savedEnv)) savedEnv[key] = process.env[key];
  }

  test('pickBestDocRoot prefers highest semver then workspace node_modules', () => {
    const workspace = '/Users/nolarose/Projects';
    const candidates: DocRootCandidate[] = [
      { root: '/tmp/old/node_modules/bun-types/docs/', version: '1.3.6' },
      { root: `${workspace}/node_modules/bun-types/docs/`, version: '1.3.14' },
      { root: '/tmp/newer/node_modules/bun-types/docs/', version: '1.3.14' },
    ];
    const picked = pickBestDocRoot(candidates, workspace);
    expect(picked?.version).toBe('1.3.14');
    expect(picked?.root).toBe(`${workspace}/node_modules/bun-types/docs/`);
  });

  test('buildDocIndex selects newest bun-types tree in temp workspace', async () => {
    stashEnv('BUN_TYPES_DOCS');
    delete process.env.BUN_TYPES_DOCS;

    const root = await mkdtemp(join(tmpdir(), 'bun-docs-mcp-'));
    const oldRoot = join(root, 'nested/old/node_modules/bun-types');
    const newRoot = join(root, 'node_modules/bun-types');

    for (const base of [oldRoot, newRoot]) {
      await mkdir(join(base, 'docs/runtime'), { recursive: true });
      await writeFile(
        join(base, 'package.json'),
        JSON.stringify({ version: base.includes('nested/old') ? '1.3.6' : '1.3.14' })
      );
      await writeFile(
        join(base, 'docs/runtime/image.mdx'),
        `---\ntitle: Image\ndescription: Bun.Image pipeline\n---\n\nResize with \`Bun.Image\`.\n`
      );
    }

    const index = await buildDocIndex(root);
    expect(index.docsVersion).toBe('1.3.14');
    expect(index.docs.some(d => d.slug === 'runtime/image')).toBe(true);

    await warmDocContent(index.docs);
    const hits = await searchDocsAsync(index.docs, 'Bun.Image resize', 5);
    expect(hits[0]?.slug).toBe('runtime/image');
  });

  test('formatSearchHits is compact and omits per-row urls', () => {
    const text = formatSearchHits([
      {
        slug: 'runtime/image',
        title: 'Image',
        desc: 'Bun.Image pipeline',
        score: 10,
        url: 'https://bun.com/docs/runtime/image',
        snippet: 'Resize with Bun.Image',
      },
    ]);
    expect(text).toContain('runtime/image');
    expect(text).toContain('https://bun.com/docs');
    expect(text).not.toContain('score:');
  });

  test('cleanMdx strips mintlify and code markers', () => {
    const raw = `<Note>HTTP/3 is experimental.</Note>\n\n\`\`\`ts\nconst x = 1; // [!code ++]\n\`\`\``;
    const cleaned = cleanMdx(raw);
    expect(cleaned).toContain('HTTP/3 is experimental');
    expect(cleaned).not.toContain('<Note>');
  });

  test('extractSection returns matching heading block', () => {
    const content = '# Top\n\n## Input\n\ninput details\n\n## Output\n\noutput details';
    const section = extractSection(content, 'output');
    expect(section.startsWith('## Output')).toBe(true);
    expect(section).not.toContain('input details');
  });

  test('readDocPage applies cleanup, section, and maxLines', async () => {
    const docs = [
      {
        path: '/x.mdx',
        slug: 'runtime/demo',
        title: 'Demo',
        desc: 'desc',
        content: '## Alpha\n\nalpha text\n\n## Beta\n\n<Beta>beta text</Beta>',
      },
    ];
    const page = await readDocPage(docs, 'runtime/demo', { section: 'beta', maxLines: 3 });
    expect(page?.content).toContain('beta text');
    expect(page?.content).not.toContain('alpha text');
  });

  test('queryDocs finds exact pattern in JS fallback', async () => {
    const docs = [
      {
        path: '/a.mdx',
        slug: 'runtime/http/server',
        title: 'Server',
        desc: '',
        content: 'line one\n  http3: true,\nline three',
      },
    ];
    const { hits, engine } = await queryDocs(docs, '', 'http3: true', { limit: 5 });
    expect(engine).toBe('js');
    expect(hits[0]?.slug).toBe('runtime/http/server');
  });

  test('listCategories groups docs by top-level slug', () => {
    const docs = [
      { path: '/a', slug: 'runtime/a', title: 'A', desc: '', content: '' },
      { path: '/b', slug: 'runtime/b', title: 'B', desc: '', content: '' },
      { path: '/c', slug: 'pm/install', title: 'C', desc: '', content: '' },
    ];
    const cats = listCategories(docs);
    expect(cats.find(c => c.category === 'runtime')?.count).toBe(2);
  });

  test('resolveDocSlug uses slug map', () => {
    const docs = [{ path: '/x', slug: 'runtime/image', title: 'Image', desc: '' }];
    const map = buildSlugMap(docs);
    const hit = resolveDocSlug(map, '/runtime/image.mdx');
    expect(hit.exists).toBe(true);
    expect(hit.slug).toBe('runtime/image');
  });

  test('getCuratedEntry resolves Bun.Image', () => {
    const entry = getCuratedEntry('Bun.Image');
    expect(entry?.path).toBe('runtime/image');
    expect(entry?.minVersion).toBe('1.3.14');
  });

  test('searchDocs codeOnly searches fenced blocks', () => {
    const docs = [
      {
        path: '/x',
        slug: 'runtime/demo',
        title: 'Demo',
        desc: '',
        content: 'prose http3\n\n```ts\nhttp3: true\n```',
      },
    ];
    expect(searchDocs(docs, 'http3', 5, undefined, true)[0]?.slug).toBe('runtime/demo');
  });

  test('parseRssItems extracts blog links', () => {
    const xml = `<rss><channel><item>
      <title>Bun v1.3.14</title>
      <link>https://bun.com/blog/bun-v1.3.14</link>
      <description>Built-in &amp; fast</description>
      <pubDate>Wed, 13 May 2026 03:19:35 GMT</pubDate>
    </item></channel></rss>`;
    const items = parseRssItems(xml, 5);
    expect(items[0]?.title).toBe('Bun v1.3.14');
    expect(blogSlugFromLink(items[0]!.link)).toBe('bun-v1.3.14');
    expect(buildBlogUrl('bun-v1.3.14')).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(normalizeBlogSlug('https://bun.com/blog/bun-v1.3.14')).toBe('bun-v1.3.14');
  });

  test('htmlArticleToText and boilerplate strip', () => {
    const text = htmlArticleToText('<article><h1>Bun v1.3.14</h1><p>HTTP/3 support.</p></article>');
    expect(text).toContain('HTTP/3 support');
  });
});
