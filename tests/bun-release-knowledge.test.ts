import { describe, expect, test } from 'bun:test';
import {
  adoptionMatrixRows,
  diffReleaseKnowledge,
  extractMarkdownCodeExamples,
  normalizeReleaseKnowledge,
  parseKnowledgeCatalog,
  parseReleaseKnowledge,
  renderReleaseKnowledge,
  searchReleaseKnowledge,
  type KnowledgeCatalogEntry,
  type ReleaseKnowledge,
} from '../packages/bun-release-contracts/src/knowledge.ts';

const MARKDOWN = `---
title: Bun v1.3.14
---

## \`Bun.Image\` — Built-in Image Processing

Resize an image and write the result.

\`\`\`js
await Bun.file("photo.jpg").image().resize(200).write("thumb.webp");
\`\`\`

## HTTP/3 support in \`Bun.serve\`

> ⚠️ **Highly experimental.** Do not deploy this yet.

\`\`\`ts
Bun.serve({ http3: true, tls: { cert, key }, fetch: () => new Response("ok") });
\`\`\`

More details between the examples deliberately push the warning out of the local prose window.
This is another paragraph.
And this is a third paragraph.

### HTTP/3 only

\`\`\`ts
Bun.serve({ http3: true, http1: false, fetch: () => new Response("ok") });
\`\`\`
`;

const CATALOG: KnowledgeCatalogEntry[] = [
  {
    name: 'Bun.file',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/file-io',
    description: 'Lazy file handle',
  },
  {
    name: 'Bun.Image',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/image',
    description: 'Image pipeline',
  },
  {
    name: 'Image',
    stability: 'stable',
    docsUrl: 'https://example.test/generic-image',
    description: 'Generic image token',
  },
  {
    name: 'Bun.Image.resize',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/image#resize',
    description: 'Resize image',
  },
  {
    name: 'Bun.Image.write',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/image#terminals',
    description: 'Write image',
  },
  {
    name: 'Bun.serve',
    stability: 'stable',
    docsUrl: 'https://bun.com/docs/runtime/http/server',
    description: 'HTTP server',
  },
];

function knowledge(markdown = MARKDOWN): ReleaseKnowledge {
  return normalizeReleaseKnowledge({
    version: '1.3.14',
    sourceUrl: 'https://bun.com/blog/bun-v1.3.14',
    sourceMarkdownUrl: 'https://bun.com/blog/bun-v1.3.14.md',
    publishedAt: '2026-05-13T03:19:35.000Z',
    markdown,
    catalog: CATALOG,
  });
}

describe('Bun release knowledge', () => {
  test('extracts fenced examples with source lines, heading ownership, and section ordinals', () => {
    const examples = extractMarkdownCodeExamples(MARKDOWN);
    expect(examples).toHaveLength(3);
    expect(examples[0]).toMatchObject({
      language: 'js',
      section: 'Bun.Image — Built-in Image Processing',
      featureSection: 'Bun.Image — Built-in Image Processing',
      sectionOrdinal: 1,
      sourceLine: 10,
    });
    expect(examples[2]).toMatchObject({
      language: 'ts',
      section: 'HTTP/3 only',
      featureSection: 'HTTP/3 support in Bun.serve',
      sectionOrdinal: 1,
    });
    expect(examples[2]?.context).toContain('Highly experimental');
  });

  test('normalizes stable IDs, exact API matches, provenance, and conservative execution metadata', () => {
    const result = knowledge();
    expect(result.counts).toEqual({ examples: 3, runnable: 0, documented: 3, astNodes: 10 });
    expect(result.ast?.nodes.map(node => node.type)).toEqual([
      'document',
      'heading',
      'paragraph',
      'codeBlock',
      'heading',
      'paragraph',
      'codeBlock',
      'paragraph',
      'heading',
      'codeBlock',
    ]);
    const root = result.ast?.nodes[0];
    const headings = result.ast?.nodes.filter(node => node.type === 'heading') ?? [];
    expect(root?.childIds).toEqual([headings[0]?.id, headings[1]?.id]);
    expect(headings[1]?.childIds).toContain(headings[2]?.id);
    expect(result.publishedAt).toBe('2026-05-13T03:19:35.000Z');
    expect(result.examples[0]).toMatchObject({
      feature: 'Bun.Image',
      stability: 'stable',
      runnable: false,
      requiresSetup: ['filesystem-fixtures'],
    });
    expect(result.examples[0]?.api).toEqual([
      'Bun.file',
      'Bun.Image',
      'Bun.Image.resize',
      'Bun.Image.write',
    ]);
    expect(result.examples[0]?.api).not.toContain('Image');
    expect(result.examples.slice(1).every(example => example.stability === 'highly-experimental'))
      .toBe(true);
    expect(result.examples.slice(1).every(example => example.feature === 'Bun.serve')).toBe(true);
    expect(knowledge().examples.map(example => example.id)).toEqual(
      result.examples.map(example => example.id)
    );
    const cleanupExample = normalizeReleaseKnowledge({
      version: '1.3.14',
      sourceUrl: 'https://bun.com/blog/bun-v1.3.14',
      sourceMarkdownUrl: 'https://bun.com/blog/bun-v1.3.14.md',
      publishedAt: '2026-05-13T03:19:35.000Z',
      markdown: '## Signals\n\n```js\ncleanup();\n```\n',
      catalog: [],
    }).examples[0];
    expect(cleanupExample).toMatchObject({
      runnable: false,
      requiresSetup: ['external-bindings'],
    });
  });

  test('preserves media directive metadata and links asset AST nodes', () => {
    const result = knowledge(`---
title: Fixture
---

## Media

{% image src="/images/blog/bun-1.4/cpu.png" alt="CPU dropped 42.3%" /%}
<iframe src="https://www.youtube.com/embed/example" title="Overview"></iframe>

\`\`\`ts title="probe"
console.log("ok");
\`\`\`
`);
    const assets = result.ast?.nodes.filter(node => node.type === 'asset') ?? [];
    expect(assets).toHaveLength(2);
    expect(assets[0]).toMatchObject({
      directive: 'image',
      assetIds: ['bun-1.3.14-cpu'],
      metadata: { alt: 'CPU dropped 42.3%', src: '/images/blog/bun-1.4/cpu.png' },
    });
    expect(assets[1]).toMatchObject({
      directive: 'iframe',
      assetIds: ['bun-1.3.14-youtube-overview'],
    });
    expect(result.ast?.nodes.find(node => node.type === 'codeBlock')).toMatchObject({
      language: 'ts',
      meta: 'title="probe"',
      childIds: [],
    });
  });

  test('materializes list-item leaves with stable ownership and nesting', () => {
    const result = knowledge(`## Security hardening

- Parent behavior
  - Nested behavior
- **\`bun install\` and registry auth** Build artifacts are created with owner-only permissions.
`);
    const items = result.ast?.nodes.filter(node => node.type === 'listItem') ?? [];
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ marker: '-', indent: 0, text: 'Parent behavior' });
    expect(items[1]).toMatchObject({ marker: '-', indent: 2, text: 'Nested behavior' });
    expect(items[0]?.childIds).toEqual([items[1]?.id]);
    expect(items[1]?.parentId).toBe(items[0]?.id);
    expect(items[2]).toMatchObject({
      marker: '-',
      indent: 0,
      text: 'bun install and registry auth Build artifacts are created with owner-only permissions.',
    });
  });

  test('materializes multi-line paragraph leaves', () => {
    const result = knowledge(`## Runtime

Bun starts this behavior on one line
and completes it on the next line.
`);
    expect(result.ast?.nodes.find(node => node.type === 'paragraph')).toMatchObject({
      sourceLine: 3,
      endLine: 4,
      text: 'Bun starts this behavior on one line and completes it on the next line.',
      childIds: [],
    });
  });

  test('parses catalog and knowledge boundaries fail closed', () => {
    expect(
      parseKnowledgeCatalog({
        entries: [{ name: 'Bun.Image', stability: 'stable', docsUrl: 'not-a-url' }],
      })
    ).toEqual([
      { name: 'Bun.Image', stability: 'stable', docsUrl: null, description: null },
    ]);
    const result = knowledge();
    expect(parseReleaseKnowledge(JSON.parse(renderReleaseKnowledge(result)))).toEqual(result);
    expect(() =>
      normalizeReleaseKnowledge({
        version: '1.3.14',
        sourceUrl: 'https://bun.com/blog/bun-v1.3.14',
        sourceMarkdownUrl: 'https://bun.com/blog/bun-v1.3.14.md',
        publishedAt: '2026-05-13',
        markdown: MARKDOWN,
        catalog: CATALOG,
      })
    ).toThrow('canonical ISO-8601');
    expect(() =>
      normalizeReleaseKnowledge({
        version: '1.3.14',
        sourceUrl: 'https://example.test',
        sourceMarkdownUrl: 'https://bun.com/blog/bun-v1.3.14.md',
        publishedAt: '2026-05-13T03:19:35.000Z',
        markdown: MARKDOWN,
        catalog: CATALOG,
      })
    ).toThrow('Release source URL must be');
    expect(() =>
      parseReleaseKnowledge({ ...result, counts: { ...result.counts, runnable: 99 } })
    ).toThrow('counts are stale');
  });

  test('searches, diffs, and aggregates adoption without executing examples', () => {
    const previous = knowledge();
    const current = normalizeReleaseKnowledge({
      version: '1.3.15',
      sourceUrl: 'https://bun.com/blog/bun-v1.3.15',
      sourceMarkdownUrl: 'https://bun.com/blog/bun-v1.3.15.md',
      publishedAt: '2026-06-01T00:00:00.000Z',
      markdown: MARKDOWN.replace('resize(200)', 'resize(400)').replace(
        /\n### HTTP\/3 only[\s\S]*$/,
        ''
      ),
      catalog: CATALOG,
    });
    expect(searchReleaseKnowledge(previous, 'resize image', 1)[0]).toMatchObject({
      feature: 'Bun.Image',
    });
    expect(diffReleaseKnowledge(previous, current)).toMatchObject({
      from: '1.3.14',
      to: '1.3.15',
      removedExamples: ['http-3-support-in-bun-serve-http-3-only-1'],
    });
    expect(diffReleaseKnowledge(previous, current).changedExamples).toHaveLength(1);
    expect(adoptionMatrixRows(previous)[0]).toMatchObject({
      feature: 'Bun.serve',
      stability: 'highly-experimental',
      examples: 2,
      runnable: 0,
    });
  });

  test('validates the committed knowledge artifact and RSS provenance offline', async () => {
    const repoRoot = new URL('..', import.meta.url);
    const artifactFile = Bun.file(
      new URL('packages/bun-release-contracts/knowledge/bun-v1.3.14.json', repoRoot)
    );
    const artifactText = await artifactFile.text();
    const artifact = parseReleaseKnowledge(JSON.parse(artifactText));
    const feeds = (await Bun.file(new URL('tools/bun-docs-feeds.json', repoRoot)).json()) as {
      rss: { entries: Array<{ version: string; url: string; pubDate: string }> };
    };
    const provenance = feeds.rss.entries.find(entry => entry.version === artifact.releaseVersion);

    expect(renderReleaseKnowledge(artifact)).toBe(artifactText);
    expect(provenance).toMatchObject({
      url: artifact.sourceUrl,
      pubDate: artifact.publishedAt,
    });
  });
});
