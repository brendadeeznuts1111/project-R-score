// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
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
 * @see ./blog-codeblock-join.ts — L2 token join
 */

export type CodeBlock = {
  index: number;
  section: string;
  code: string;
  htmlOffset: number;
  className: 'CodeBlock';
  classNames: string[];
  status: 'parsed';
  statusLabel: 'parsed';
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

function nearestHeading(before: string): string {
  const hs = [...before.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)];
  if (!hs.length) return '(intro)';
  return decodeHtmlEntities(hs[hs.length - 1]![1]!.replace(/<[^>]+>/g, '').trim());
}

/** Parse `div.CodeBlock` (not `CodeBlockTab`) from Bun blog HTML. */
export function extractCodeBlocks(html: string): ExtractResult {
  const divs = divClassLists(html);
  const classStatuses = summarizeCodeBlockClasses(divs.map(div => div.classNames));
  const codeBlockTabCount =
    classStatuses.find(summary => summary.className === 'CodeBlockTab')?.count ?? 0;

  const blocks: CodeBlock[] = [];
  for (const div of divs) {
    if (!div.classNames.includes('CodeBlock')) continue;
    const start = div.htmlOffset;
    const after = html.slice(start);
    const preMatch = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(after);
    if (!preMatch) continue;
    const code = stripShikiPre(preMatch[1]!).trimEnd();
    const section = nearestHeading(html.slice(0, start));
    blocks.push({
      index: blocks.length + 1,
      section,
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

  return {
    blocks,
    codeBlockCount: blocks.length,
    codeBlockTabCount,
    classPattern: CODE_BLOCK_CLASS_PATTERN,
    classStatuses,
    bySection,
  };
}

/** Typed BunFile boundary for saved Bun blog HTML. */
export async function extractCodeBlocksFromFile(file: Bun.BunFile): Promise<ExtractResult> {
  return extractCodeBlocks(await file.text());
}
