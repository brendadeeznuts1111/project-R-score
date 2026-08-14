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
};

export type ExtractResult = {
  blocks: CodeBlock[];
  codeBlockCount: number;
  codeBlockTabCount: number;
  bySection: Record<string, number>;
};

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
  const classLists = [...html.matchAll(/<div\b[^>]*\bclass="([^"]*)"[^>]*>/g)].map(match =>
    match[1]!.split(/\s+/)
  );
  const codeBlockTabCount = classLists.filter(classes => classes.includes('CodeBlockTab')).length;

  const blocks: CodeBlock[] = [];
  const openRe = /<div\b[^>]*\bclass="[^"]*\bCodeBlock\b[^"]*"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html))) {
    const start = m.index;
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
    });
  }

  const bySection: Record<string, number> = {};
  for (const b of blocks) bySection[b.section] = (bySection[b.section] ?? 0) + 1;

  return {
    blocks,
    codeBlockCount: blocks.length,
    codeBlockTabCount,
    bySection,
  };
}
