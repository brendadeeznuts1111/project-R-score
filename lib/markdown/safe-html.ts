// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @released Bun.markdown.html · released v1.3.8 · 2026-01-29 · https://bun.com/blog/bun-v1.3.8
// @see https://bun.com/blog/bun-v1.4#bun-markdown — HTML output is not sanitized
import { MARKDOWN_PRESET_SECURE, type MarkdownHtmlOptions } from './options.ts';

const URL_ATTRIBUTE = /\s(href|src)="([^"]*)"/gi;
const NAMED_ENTITIES = /&(colon|tab|newline);/gi;
const NUMERIC_ENTITIES = /&#(?:x([0-9a-f]+)|(\d+));/gi;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function decodeForSchemeCheck(value: string): string {
  return value
    .replace(NUMERIC_ENTITIES, (_, hex: string | undefined, decimal: string | undefined) => {
      const codePoint = Number.parseInt(hex ?? decimal ?? '0', hex ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : '';
    })
    .replace(NAMED_ENTITIES, (_, name: string) =>
      name.toLowerCase() === 'colon' ? ':' : name.toLowerCase() === 'tab' ? '\t' : '\n'
    )
    .trim();
}

function isSafeUrl(value: string, attribute: string): boolean {
  const decoded = decodeForSchemeCheck(value);
  const compact = decoded.replace(/[\u0000-\u0020]/g, '');
  if (!compact || compact.startsWith('//')) return false;
  const scheme = compact.match(SCHEME)?.[0].toLowerCase();
  if (!scheme) return true;
  if (scheme === 'http:' || scheme === 'https:') return true;
  return attribute.toLowerCase() === 'href' && scheme === 'mailto:';
}

export function sanitizeRenderedMarkdownHtml(html: string): string {
  return html.replace(URL_ATTRIBUTE, (match, attribute: string, value: string) =>
    isSafeUrl(value, attribute) ? match : ` ${attribute}="#" data-unsafe-url="removed"`
  );
}

export function markdownSafeHtml(
  markdown: string,
  options: MarkdownHtmlOptions = MARKDOWN_PRESET_SECURE
): string {
  const html = Bun.markdown.html(markdown, {
    ...options,
    tagFilter: true,
    noHtmlBlocks: true,
    noHtmlSpans: true,
  });
  return sanitizeRenderedMarkdownHtml(html);
}
