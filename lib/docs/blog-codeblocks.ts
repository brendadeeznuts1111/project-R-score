// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/reference/bun/CryptoHasher — Bun.CryptoHasher reference
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/glob#quickstart
/**
 * Parse `div.CodeBlock` regions from Bun blog HTML (L0 harvest core).
 *
 * @see ../../tools/bun-blog-codeblocks.ts — CLI runner
 * @see ../../tools/bun-blog-codeblocks.ts --mode=join — L2 token join
 */

/** Official heading `id`, or `intro` when the sample precedes the first h2–h4. */
export const INTRO_HEADING_ID = 'intro' as const;

export type HeadingLevel = 2 | 3 | 4;

export type HeadingNode = {
  level: HeadingLevel;
  headingId: string; // brand-ok — Bun blog heading slug, not a domain brand
  title: string;
  shippedIn: string | null;
  improvedIn: string | null;
  blockIds: string[];
  children: HeadingNode[];
};

export type CodeBlock = {
  index: number;
  headingId: string; // brand-ok — Bun blog heading slug, not a domain brand
  h2Id: string;
  h3Id: string | null;
  h4Id: string | null;
  ordinal: number;
  /** `${headingId}/${ordinal}` — CLI `-s` key; not an HTML id or CSS class. */
  blockId: string; // brand-ok — harvest locator headingId/ordinal
  /** SHA-256 of newline-normalized code; shift detector, not the locator. */
  codeHash: string;
  shippedIn: string | null;
  improvedIn: string | null;
  section: string;
  code: string;
  htmlOffset: number;
  className: 'CodeBlock';
  classNames: string[];
  status: 'parsed';
  statusLabel: 'parsed';
};

type HeadingHit = {
  htmlOffset: number;
  level: HeadingLevel;
  headingId: string; // brand-ok — Bun blog heading slug, not a domain brand
  title: string;
  shippedIn: string | null;
  improvedIn: string | null;
};

export type CodeBlockClassStatus = 'parsed' | 'skipped' | 'scoped';

export type CodeBlockClassSummary = {
  className: string;
  status: CodeBlockClassStatus;
  statusLabel: string;
  count: number;
};

export type ExtractResult = {
  blocks: CodeBlock[];
  codeBlockCount: number;
  codeBlockTabCount: number;
  classPattern: typeof CODE_BLOCK_CLASS_PATTERN;
  classStatuses: CodeBlockClassSummary[];
  bySection: Record<string, number>;
  outline: HeadingNode[];
  introBlockIds: string[];
};

/** Bun.Glob matches the complete CodeBlock CSS-class family, not substrings. */
export const CODE_BLOCK_CLASS_PATTERN = 'CodeBlock*' as const;
const CODE_BLOCK_CLASS_GLOB = new Bun.Glob(CODE_BLOCK_CLASS_PATTERN);

function classStatus(className: string): Omit<CodeBlockClassSummary, 'className' | 'count'> {
  if (className === 'CodeBlock') return { status: 'parsed', statusLabel: 'parsed' };
  if (className === 'CodeBlockTab') {
    return { status: 'skipped', statusLabel: 'skipped · tab container' };
  }
  return { status: 'scoped', statusLabel: 'scoped · supporting class' };
}

function divClassLists(html: string): Array<{
  htmlOffset: number;
  classNames: string[];
}> {
  const matches: Array<{ htmlOffset: number; classNames: string[] }> = [];
  const divClass = /<div\b[^>]*\bclass=(['"])(.*?)\1[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = divClass.exec(html))) {
    matches.push({
      htmlOffset: match.index,
      classNames: match[2]!.trim().split(/\s+/).filter(Boolean),
    });
  }
  return matches;
}

export function summarizeCodeBlockClasses(
  classLists: readonly string[][]
): CodeBlockClassSummary[] {
  const counts = new Map<string, number>();
  for (const classNames of classLists) {
    for (const className of classNames) {
      if (!CODE_BLOCK_CLASS_GLOB.match(className)) continue;
      counts.set(className, (counts.get(className) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([className, count]) => ({ className, count, ...classStatus(className) }));
}

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

/** Shiki: join `.line` spans before stripping nested token spans. */
export function stripShikiPre(preInner: string): string {
  const withNewlines = preInner
    .replace(/<\/span>\s*<span class="line"[^>]*>/g, '\n')
    .replace(/<span class="line"[^>]*>/g, '')
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(withNewlines)
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function headingSectionText(inner: string): string {
  const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, '')).trim();
  return text.replace(/#+$/u, '').trim();
}

function expandPatchVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length === 2 && parts.every(part => /^\d+$/.test(part))) return `${version}.0`;
  return version;
}

function parseHeadingVersions(inner: string): {
  shippedIn: string | null;
  improvedIn: string | null;
} {
  let shippedIn: string | null = null;
  let improvedIn: string | null = null;
  const chip = /title="(Shipped|Improved) in Bun v(\d+\.\d+(?:\.\d+)?)"/gi;
  let match: RegExpExecArray | null;
  while ((match = chip.exec(inner))) {
    const version = expandPatchVersion(match[2]!);
    if (match[1]!.toLowerCase() === 'shipped') shippedIn = version;
    else improvedIn = version;
  }
  return { shippedIn, improvedIn };
}

function headingTitle(inner: string): string {
  const withoutChips = inner
    .replace(/<a\b[^>]*class="[^"]*\bsince\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\b[^>]*aria-label="Permalink"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<a\b[^>]*class="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  return headingSectionText(withoutChips);
}

function slugifyHeadingId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || INTRO_HEADING_ID;
}

export function formatBlockId(headingId: string, ordinal: number): string {
  // brand-ok
  return `${headingId}/${ordinal}`;
}

export function hashCodeBlock(code: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(code.replace(/\r\n/g, '\n').trimEnd());
  return hasher.digest('hex');
}

export function subtreeBlockCount(node: HeadingNode): number {
  return (
    node.blockIds.length + node.children.reduce((sum, child) => sum + subtreeBlockCount(child), 0)
  );
}

function collectHeadings(html: string): HeadingHit[] {
  const hits: HeadingHit[] = [];
  const heading = /<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = heading.exec(html))) {
    const level = Number(match[1]) as HeadingLevel;
    const inner = match[3] ?? '';
    const title = headingTitle(inner);
    const idAttr = /\bid=(['"])(.*?)\1/i.exec(match[2] ?? '')?.[2]?.trim();
    const versions = parseHeadingVersions(inner);
    hits.push({
      htmlOffset: match.index,
      level,
      headingId: idAttr && idAttr.length > 0 ? idAttr : slugifyHeadingId(title),
      title: title || `(${INTRO_HEADING_ID})`,
      shippedIn: versions.shippedIn,
      improvedIn: versions.improvedIn,
    });
  }
  return hits;
}

const INTRO_HEADING: HeadingHit = {
  htmlOffset: 0,
  level: 2,
  headingId: INTRO_HEADING_ID,
  title: `(${INTRO_HEADING_ID})`,
  shippedIn: null,
  improvedIn: null,
};

function headingAncestry(
  headings: readonly HeadingHit[],
  offset: number
): { h2: HeadingHit; h3: HeadingHit | null; h4: HeadingHit | null; leaf: HeadingHit } {
  let h2: HeadingHit | undefined;
  let h3: HeadingHit | undefined;
  let h4: HeadingHit | undefined;
  for (const heading of headings) {
    if (heading.htmlOffset >= offset) break;
    if (heading.level === 2) {
      h2 = heading;
      h3 = undefined;
      h4 = undefined;
    } else if (heading.level === 3) {
      h3 = heading;
      h4 = undefined;
    } else {
      h4 = heading;
    }
  }
  const leaf = h4 ?? h3 ?? h2 ?? INTRO_HEADING;
  return { h2: h2 ?? INTRO_HEADING, h3: h3 ?? null, h4: h4 ?? null, leaf };
}

function buildOutline(
  headings: readonly HeadingHit[],
  blocks: readonly CodeBlock[]
): HeadingNode[] {
  const nodes: HeadingNode[] = headings.map(heading => ({
    level: heading.level,
    headingId: heading.headingId,
    title: heading.title,
    shippedIn: heading.shippedIn,
    improvedIn: heading.improvedIn,
    blockIds: [],
    children: [],
  }));
  const byId = new Map(nodes.map(node => [node.headingId, node]));
  const roots: HeadingNode[] = [];
  let h2: HeadingNode | undefined;
  let h3: HeadingNode | undefined;
  for (const node of nodes) {
    if (node.level === 2) {
      h2 = node;
      h3 = undefined;
      roots.push(node);
    } else if (node.level === 3) {
      h3 = node;
      (h2 ?? roots[roots.length - 1])?.children.push(node);
    } else {
      (h3 ?? h2)?.children.push(node);
    }
  }
  for (const block of blocks) {
    byId.get(block.headingId)?.blockIds.push(block.blockId);
  }
  return roots;
}

/** Parse `div.CodeBlock` (not `CodeBlockTab`) from Bun blog HTML. */
export function extractCodeBlocks(html: string): ExtractResult {
  const divs = divClassLists(html);
  const headings = collectHeadings(html);
  const classStatuses = summarizeCodeBlockClasses(divs.map(div => div.classNames));
  const codeBlockTabCount =
    classStatuses.find(summary => summary.className === 'CodeBlockTab')?.count ?? 0;

  const ordinals = new Map<string, number>();
  const blocks: CodeBlock[] = [];
  for (const div of divs) {
    if (!div.classNames.includes('CodeBlock')) continue;
    const start = div.htmlOffset;
    const after = html.slice(start);
    const preMatch = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(after);
    if (!preMatch) continue;
    const code = stripShikiPre(preMatch[1]!).trimEnd();
    const ancestry = headingAncestry(headings, start);
    const leaf = ancestry.leaf;
    const ordinal = (ordinals.get(leaf.headingId) ?? 0) + 1;
    ordinals.set(leaf.headingId, ordinal);
    blocks.push({
      index: blocks.length + 1,
      headingId: leaf.headingId,
      h2Id: ancestry.h2.headingId,
      h3Id: ancestry.h3?.headingId ?? null,
      h4Id: ancestry.h4?.headingId ?? null,
      ordinal,
      blockId: formatBlockId(leaf.headingId, ordinal),
      codeHash: hashCodeBlock(code),
      shippedIn: leaf.shippedIn,
      improvedIn: leaf.improvedIn,
      section: leaf.title,
      code,
      htmlOffset: start,
      className: 'CodeBlock',
      classNames: div.classNames,
      status: 'parsed',
      statusLabel: 'parsed',
    });
  }

  const bySection: Record<string, number> = {};
  for (const b of blocks) bySection[b.section] = (bySection[b.section] ?? 0) + 1;
  const introBlockIds = blocks.filter(b => b.h2Id === INTRO_HEADING_ID).map(b => b.blockId);

  return {
    blocks,
    codeBlockCount: blocks.length,
    codeBlockTabCount,
    classPattern: CODE_BLOCK_CLASS_PATTERN,
    classStatuses,
    bySection,
    outline: buildOutline(headings, blocks),
    introBlockIds,
  };
}

/** Typed BunFile boundary for saved Bun blog HTML. */
export async function extractCodeBlocksFromFile(file: Bun.BunFile): Promise<ExtractResult> {
  return extractCodeBlocks(await file.text());
}
