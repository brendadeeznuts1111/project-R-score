import type { MarkdownCodeExample } from './knowledge-types.ts';

export function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function knowledgeSlug(value: string): string {
  return (
    cleanInlineMarkdown(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'example'
  );
}

export function extractMarkdownCodeExamples(markdown: string): MarkdownCodeExample[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let contentStart = 0;
  if (lines[0]?.trim() === '---') {
    const closing = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closing > 0) contentStart = closing + 1;
  }
  const examples: MarkdownCodeExample[] = [];
  const headings = new Map<number, string>();
  const sectionCounts = new Map<string, number>();
  let context: string[] = [];
  let featureSignals: string[] = [];

  for (let index = contentStart; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const heading = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      headings.set(level, cleanInlineMarkdown(heading[2] ?? ''));
      for (const key of [...headings.keys()]) if (key > level) headings.delete(key);
      context = [];
      if (level === 2) featureSignals = [];
      continue;
    }

    const fence = /^\s*(`{3,}|~{3,})([^`]*)$/.exec(line);
    if (!fence) {
      const prose = cleanInlineMarkdown(line.replace(/^>\s*/, ''));
      if (prose && !prose.startsWith('{%') && !prose.startsWith('|')) {
        context = [...context, prose].slice(-3);
        if (/\b(?:highly experimental|experimental|deprecated)\b/i.test(prose)) {
          featureSignals.push(prose);
        }
      }
      continue;
    }

    const marker = fence[1] ?? '```';
    const language = (fence[2] ?? '').trim().split(/[\s#]/, 1)[0]?.toLowerCase() ?? '';
    const body: string[] = [];
    const sourceLine = index + 2;
    index += 1;
    while (
      index < lines.length &&
      !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[index] ?? '')
    ) {
      body.push(lines[index] ?? '');
      index += 1;
    }
    const code = body.join('\n').trimEnd();
    if (!code.trim()) continue;

    const section = headings.get(4) ?? headings.get(3) ?? headings.get(2) ?? '(intro)';
    const featureSection = headings.get(2) ?? section;
    const sectionOrdinal = (sectionCounts.get(section) ?? 0) + 1;
    sectionCounts.set(section, sectionOrdinal);
    examples.push({
      language,
      code,
      section,
      featureSection,
      context: [...featureSignals, ...context].join(' '),
      sourceLine,
      sectionOrdinal,
    });
  }
  return examples;
}
