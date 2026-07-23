/**
 * Join blog CodeBlock harvests to catalog tokens (L2 overlay).
 *
 * @see ./blog-codeblocks.ts — extractCodeBlocks
 * @see ./blog-release-tokens.ts — extractTokenCandidates, matchCatalogTokenWithAliases
 * @see ./bun-site-url.ts — bunBlog, guideKeyFromUrl
 * @see ./token-ref.ts — TokenExample fragment provenance
 */
import { bunBlog, guideKeyFromUrl } from './bun-site-url.ts';
import {
  classifySectionHeading,
  extractTokenCandidates,
  matchCatalogTokenWithAliases,
  type SectionKind,
  type TokenIndex,
} from './blog-release-tokens.ts';
import { extractCodeBlocks, type CodeBlock } from './blog-codeblocks.ts';

export type BlogExampleHit = {
  lang: string;
  body: string;
  version: string;
  url: string;
  guideKey: string;
  section: string;
  blockIndex: number;
  kind: SectionKind;
};

export type BlogExamplesEntry = {
  name: string;
  examples: BlogExampleHit[];
};

export type BlogExamplesFile = {
  generated: string;
  postsProcessed: number;
  exampleCount: number;
  entries: BlogExamplesEntry[];
};

export type DerivedApiRow = {
  label: string;
  catalogToken: string | null;
  since: string;
  blockIndex: number;
  lineRange: [number, number];
  preview: string;
  source: 'blog-codeblock';
};

/** Default lang when Shiki class is absent. */
export function inferBlockLang(_preHtml?: string): string {
  return 'ts';
}

function blogFragment(version: string, blockIndex: number): string {
  return `blog/bun-v${version}#${blockIndex}`;
}

export function matchBlocksToTokens(
  blocks: CodeBlock[],
  opts: {
    version: string;
    postUrl: string;
    tokenIndex: TokenIndex;
    scrapeAliases: Record<string, string>;
  }
): BlogExamplesEntry[] {
  const byName = new Map<string, BlogExamplesEntry>();
  const seen = new Set<string>();
  const guideKey = guideKeyFromUrl(opts.postUrl, { keepHash: true });

  for (const block of blocks) {
    const text = `${block.section}\n${block.code}`;
    const tokens = extractTokenCandidates(text);
    const kind = classifySectionHeading(block.section);
    if (kind === 'skip') continue;

    const matched = new Set<string>();
    for (const candidate of tokens) {
      const name =
        matchCatalogTokenWithAliases(candidate, opts.tokenIndex, opts.scrapeAliases) ?? null;
      if (!name || matched.has(name)) continue;
      matched.add(name);

      const dedupeKey = `${name}\0${block.index}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      let entry = byName.get(name);
      if (!entry) {
        entry = { name, examples: [] };
        byName.set(name, entry);
      }
      entry.examples.push({
        lang: inferBlockLang(),
        body: block.code,
        version: opts.version,
        url: opts.postUrl,
        guideKey: guideKey || bunBlog(`bun-v${opts.version}`),
        section: block.section,
        blockIndex: block.index,
        kind,
      });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeBlogExampleEntries(
  acc: Map<string, BlogExamplesEntry>,
  entries: BlogExamplesEntry[]
): void {
  for (const row of entries) {
    let existing = acc.get(row.name);
    if (!existing) {
      existing = { name: row.name, examples: [] };
      acc.set(row.name, existing);
    }
    const seen = new Set(existing.examples.map(e => `${e.blockIndex}\0${e.version}`));
    for (const ex of row.examples) {
      const key = `${ex.blockIndex}\0${ex.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      existing.examples.push(ex);
    }
  }
}

export function blogExamplesFileFromMap(
  map: Map<string, BlogExamplesEntry>,
  postsProcessed: number
): BlogExamplesFile {
  const entries = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  const exampleCount = entries.reduce((n, e) => n + e.examples.length, 0);
  return {
    generated: new Date().toISOString(),
    postsProcessed,
    exampleCount,
    entries,
  };
}

/** Mechanical split on blank lines + `//` section headers (L3 derived view, non-SSOT). */
export function buildDerivedApiRows(
  blocks: CodeBlock[],
  opts: {
    version: string;
    tokenIndex: TokenIndex;
    scrapeAliases: Record<string, string>;
  }
): DerivedApiRow[] {
  const rows: DerivedApiRow[] = [];

  for (const block of blocks) {
    const lines = block.code.split('\n');
    let chunkStart = 0;
    let chunkLines: string[] = [];

    const flush = (endLine: number) => {
      if (chunkLines.length === 0) return;
      const body = chunkLines.join('\n').trim();
      if (!body) return;
      const tokens = extractTokenCandidates(`${block.section}\n${body}`);
      let catalogToken: string | null = null;
      for (const c of tokens) {
        const name = matchCatalogTokenWithAliases(c, opts.tokenIndex, opts.scrapeAliases);
        if (name) {
          catalogToken = name;
          break;
        }
      }
      const previewLine =
        chunkLines.map(l => l.trim()).find(l => l.length > 0 && !l.startsWith('//')) ?? body;
      rows.push({
        label: previewLine.slice(0, 80),
        catalogToken,
        since: opts.version,
        blockIndex: block.index,
        lineRange: [chunkStart + 1, endLine],
        preview: previewLine.slice(0, 60),
        source: 'blog-codeblock',
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const isBoundary =
        line.trim() === '' ||
        (line.trim().startsWith('//') && chunkLines.length > 0 && i > chunkStart);

      if (isBoundary && chunkLines.length > 0) {
        flush(i);
        chunkLines = [];
        chunkStart = i + 1;
      }
      if (line.trim() !== '') {
        chunkLines.push(line);
      }
    }
    if (chunkLines.length > 0) {
      flush(lines.length);
    }
  }

  return rows;
}

/** Join one post HTML into catalog-token example entries. */
export async function joinBlogExamplesFromHtml(
  html: string,
  release: { version: string; url: string },
  deps: {
    tokenIndex: TokenIndex;
    scrapeAliases: Record<string, string>;
  }
): Promise<BlogExamplesEntry[]> {
  const { blocks } = extractCodeBlocks(html);
  return matchBlocksToTokens(blocks, {
    version: release.version,
    postUrl: release.url,
    tokenIndex: deps.tokenIndex,
    scrapeAliases: deps.scrapeAliases,
  });
}

/** Map blog hit to catalog TokenExample fragment. */
export function blogHitToTokenExample(hit: BlogExampleHit): {
  lang: string;
  body: string;
  fragment: string;
} {
  return {
    lang: hit.lang,
    body: hit.body,
    fragment: blogFragment(hit.version, hit.blockIndex),
  };
}
