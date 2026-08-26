import { cleanInlineMarkdown } from './knowledge-markdown.ts';

function isParagraphBoundary(line: string): boolean {
  return (
    !line.trim() ||
    /^(#{2,4})\s+/.test(line) ||
    /^\s*(`{3,}|~{3,})/.test(line) ||
    /^(\s*)([-+*]|\d+[.)])\s+/.test(line) ||
    /\{%\s*(?:image|lazyVideo)\s+/.test(line) ||
    /<iframe\b/i.test(line) ||
    /^\s*\|/.test(line) ||
    /^\s*[-:]+\s*(?:\||$)/.test(line) ||
    /^\s*<[^>]+>\s*$/.test(line)
  );
}

export function extractMarkdownParagraph(
  lines: readonly string[],
  startIndex: number
): { text: string; endIndex: number } | null {
  const first = lines[startIndex] ?? '';
  if (isParagraphBoundary(first)) return null;
  const body = [first.replace(/^\s*>\s?/, '')];
  let endIndex = startIndex;
  while (endIndex + 1 < lines.length) {
    const next = lines[endIndex + 1] ?? '';
    if (isParagraphBoundary(next)) break;
    endIndex += 1;
    body.push(next.replace(/^\s*>\s?/, ''));
  }
  const text = cleanInlineMarkdown(body.join(' '));
  return text ? { text, endIndex } : null;
}
