// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/reference/bun/CryptoHasher — Bun.CryptoHasher reference
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/blog/bun-v1.4#bun-markdown — Bun.markdown blog heading
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags — SocialMetadata
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
import {
  DEFAULT_HARVEST_AI_CONFIG,
  harvestSectionText,
  requestHarvestAiSummary,
  resolveHarvestAiConfig,
  type HarvestAiConfig,
  type HarvestAiFetch,
  type HarvestAiSummary,
} from './blog-harvest-ai.ts';
import {
  extractSocialMetadataFromHtmlSync,
  type SocialMetadata,
} from './extract-metadata.ts';

export type { HarvestAiConfig, HarvestAiProvider, HarvestAiSummary } from './blog-harvest-ai.ts';
export { DEFAULT_HARVEST_AI_CONFIG, DEFAULT_HARVEST_AI_PROMPT } from './blog-harvest-ai.ts';
export type { SocialMetadata } from './extract-metadata.ts';

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
  language: string;
  lineCount: number;
  htmlOffset: number;
  className: 'CodeBlock' | 'pre';
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

export type BlogImage = {
  headingId: string; // brand-ok — Bun blog heading slug
  h2Id: string;
  src: string;
  alt: string;
  className: string;
  htmlOffset: number;
};

export type BlogLink = {
  headingId: string; // brand-ok — Bun blog heading slug
  h2Id: string;
  href: string;
  className: string;
  title: string | null;
  text: string;
  htmlOffset: number;
};

export type BlogInlineCode = {
  headingId: string; // brand-ok — Bun blog heading slug
  h2Id: string;
  text: string;
  count: number;
  context: string;
};

export type MarkdownTableAlign = 'left' | 'right' | 'center';

export type HarvestTableCell = {
  text: string;
  align?: MarkdownTableAlign;
  scope: string;
  abbr: string;
  title: string;
  ariaLabel: string;
  headersAttr: string;
  id: string; // brand-ok — HTML th/td id, not a domain brand
};

export type HarvestTableHeader = HarvestTableCell & {
  /** Last resolved label. Prefer `harvestTableHeaderLabel` so it stays live. */
  label: string;
};

export type BlogTable = {
  headingId: string; // brand-ok — Bun blog heading slug
  h2Id: string;
  markdown: string;
  caption: string;
  headers: HarvestTableHeader[];
  rows: string[][];
  htmlOffset: number;
};

export type BlogFootnote = {
  headingId: string; // brand-ok — Bun blog heading slug
  h2Id: string;
  footnoteId: string; // brand-ok — HTML footnote id
  text: string;
  htmlOffset: number;
};

export type HarvestMapConfig = {
  includeToc: boolean;
  includeStats: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  includeInlineCode: boolean;
  includeCodeBlocks: boolean;
  includeRawJson: boolean;
  includeTables: boolean;
  includeFootnotes: boolean;
  includeSocial: boolean;
} & HarvestAiConfig;

export const DEFAULT_HARVEST_MAP_CONFIG: HarvestMapConfig = {
  includeToc: true,
  includeStats: true,
  includeImages: true,
  includeLinks: true,
  includeInlineCode: true,
  includeCodeBlocks: true,
  includeRawJson: true,
  includeTables: true,
  includeFootnotes: true,
  includeSocial: true,
  ...DEFAULT_HARVEST_AI_CONFIG,
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
  images: BlogImage[];
  links: BlogLink[];
  inlineCodes: BlogInlineCode[];
  tables: BlogTable[];
  footnotes: BlogFootnote[];
  social: SocialMetadata;
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

const LANGUAGE_LABEL: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  py: 'Python',
  python: 'Python',
  rs: 'Rust',
  rust: 'Rust',
  go: 'Go',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  toml: 'TOML',
  yaml: 'YAML',
  yml: 'YAML',
  sql: 'SQL',
  text: 'text',
};

export function detectCodeLanguage(...blobs: string[]): string {
  const joined = blobs.join(' ');
  const marked = /(?:language|lang|highlight-source|highlight)-([a-z0-9+]+)/i.exec(joined)?.[1];
  if (marked) {
    const key = marked.toLowerCase();
    return LANGUAGE_LABEL[key] ?? marked;
  }
  for (const token of joined.split(/[\s"'=<>/]+/).filter(Boolean)) {
    const key = token.toLowerCase();
    if (LANGUAGE_LABEL[key]) return LANGUAGE_LABEL[key];
  }
  return 'text';
}

function surroundingContext(html: string, start: number, end: number, radius = 48): string {
  const before = headingSectionText(html.slice(Math.max(0, start - radius), start)).trim();
  const after = headingSectionText(html.slice(end, end + radius)).trim();
  const left = before ? `…${before.slice(-40)} ` : '';
  const right = after ? ` ${after.slice(0, 40)}…` : '';
  return `${left}\`${headingSectionText(html.slice(start, end))}\`${right}`.trim();
}

export function harvestLanguageStats(blocks: readonly CodeBlock[]): LanguageStat[] {
  const counts = new Map<string, { blocks: number; lines: number }>();
  for (const block of blocks) {
    const language = block.language || 'text';
    const current = counts.get(language) ?? { blocks: 0, lines: 0 };
    current.blocks += 1;
    current.lines += block.lineCount;
    counts.set(language, current);
  }
  const total = blocks.length || 1;
  return [...counts.entries()]
    .map(([language, row]) => ({
      language,
      blocks: row.blocks,
      lines: row.lines,
      percent: Math.round((row.blocks / total) * 100),
    }))
    .sort((left, right) => right.blocks - left.blocks);
}

export function filterHarvestForConfig(
  extracted: ExtractResult,
  config: HarvestMapConfig
): ExtractResult {
  const blocks = config.includeCodeBlocks ? extracted.blocks : [];
  return {
    ...extracted,
    blocks,
    codeBlockCount: blocks.length,
    images: config.includeImages ? extracted.images : [],
    links: config.includeLinks ? extracted.links : [],
    inlineCodes: config.includeInlineCode ? extracted.inlineCodes : [],
    tables: config.includeTables ? extracted.tables : [],
    footnotes: config.includeFootnotes ? extracted.footnotes : [],
    social: config.includeSocial ? extracted.social : {},
    introBlockIds: config.includeCodeBlocks ? extracted.introBlockIds : [],
  };
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

function attrValue(attrs: string, name: string): string {
  return new RegExp(`\\b${name}=(['"])(.*?)\\1`, 'i').exec(attrs)?.[2]?.trim() ?? '';
}

function collectPreRanges(html: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const pre = /<pre\b[^>]*>[\s\S]*?<\/pre>/gi;
  let match: RegExpExecArray | null;
  while ((match = pre.exec(html))) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function isInsidePre(offset: number, ranges: readonly { start: number; end: number }[]): boolean {
  return ranges.some(range => offset >= range.start && offset < range.end);
}

const NUMERIC_CELL = /^[+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?%?$/;
const UNIT_CELL = /^[+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s?(?:kb|mb|gb|ms|s|x|×)$/i;

function cellAlign(text: string, hinted?: MarkdownTableAlign): MarkdownTableAlign {
  if (hinted) return hinted;
  const trimmed = text.trim();
  if (NUMERIC_CELL.test(trimmed) || UNIT_CELL.test(trimmed)) return 'right';
  return 'left';
}

function alignFromAttrs(attrs: string): MarkdownTableAlign | undefined {
  const align = attrValue(attrs, 'align').toLowerCase();
  if (align === 'right' || align === 'left' || align === 'center') return align;
  const style = attrValue(attrs, 'style');
  const fromStyle = /text-align\s*:\s*(left|right|center)/i.exec(style)?.[1]?.toLowerCase();
  if (fromStyle === 'right' || fromStyle === 'left' || fromStyle === 'center') return fromStyle;
  return undefined;
}

function parseTableCell(attrs: string, inner: string): HarvestTableCell {
  const text = headingSectionText(inner)
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return {
    text,
    align: alignFromAttrs(attrs),
    scope: attrValue(attrs, 'scope'),
    abbr: decodeHtmlEntities(attrValue(attrs, 'abbr')),
    title: decodeHtmlEntities(attrValue(attrs, 'title')),
    ariaLabel: decodeHtmlEntities(attrValue(attrs, 'aria-label')),
    headersAttr: attrValue(attrs, 'headers'),
    id: attrValue(attrs, 'id'),
  };
}

const PLATFORM_CELL = /linux|windows|macos|mac os|darwin|arm64|x64|win32/i;
const SPEEDUP_CELL = /[×x]|speedup|faster/i;

export function inferHarvestTableHeader(index: number, samples: readonly string[]): string {
  if (index === 0) {
    if (samples.some(sample => PLATFORM_CELL.test(sample))) return 'Platform';
    return 'Metric';
  }
  if (samples.some(sample => SPEEDUP_CELL.test(sample))) return 'Speedup';
  return `Col ${index + 1}`;
}

/** Dynamic label from the parsed th form object. Never Open Graph. */
export function harvestTableHeaderLabel(
  cell: HarvestTableCell,
  index: number,
  samples: readonly string[]
): string {
  const fromForm = (cell.text || cell.ariaLabel || cell.abbr || cell.title).trim();
  if (fromForm) return fromForm;
  return inferHarvestTableHeader(index, samples);
}

export function harvestTableColumnSamples(
  rows: readonly (readonly string[])[],
  index: number
): string[] {
  return rows.map(row => row[index] ?? '').filter(text => text && text !== '—');
}

export function formatHarvestTable(
  headers: readonly HarvestTableCell[],
  rows: readonly (readonly string[])[]
): string {
  const labels = headers.map((header, index) =>
    harvestTableHeaderLabel(header, index, harvestTableColumnSamples(rows, index))
  );
  const aligns = headers.map((header, index) => {
    const sample = harvestTableColumnSamples(rows, index)[0] ?? '';
    return cellAlign(sample, header.align);
  });
  return formatMarkdownTable(labels, rows, aligns);
}

function parseTableRow(rowInner: string): HarvestTableCell[] {
  const cells: HarvestTableCell[] = [];
  const cellRe = /<t[hd]\b([^>]*)>([\s\S]*?)<\/t[hd]>/gi;
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRe.exec(rowInner))) {
    const cell = parseTableCell(cellMatch[1] ?? '', cellMatch[2] ?? '');
    const span = Math.max(1, Number.parseInt(attrValue(cellMatch[1] ?? '', 'colspan'), 10) || 1);
    cells.push(cell);
    for (let extra = 1; extra < span; extra += 1) {
      cells.push({ ...cell, text: '', ariaLabel: '', abbr: '', title: '', id: '' });
    }
  }
  return cells;
}

export function formatMarkdownTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  aligns?: readonly MarkdownTableAlign[]
): string {
  if (headers.length === 0) return '';
  const width = headers.length;
  const padRow = (row: readonly string[]): string[] => {
    const next = row.slice(0, width).map(cell => cell.trim());
    while (next.length < width) next.push('');
    return next;
  };
  const body = rows.map(padRow);
  const colAlign: MarkdownTableAlign[] = headers.map((_, index) => {
    const hinted = aligns?.[index];
    if (hinted) return hinted;
    const sample = body.map(row => row[index] ?? '').find(cell => cell.length > 0) ?? '';
    return cellAlign(sample);
  });
  const widths = headers.map((header, index) =>
    Math.max(header.length, 3, ...body.map(row => (row[index] ?? '').length))
  );
  const rule = (align: MarkdownTableAlign, size: number): string => {
    if (align === 'right') return `${'-'.repeat(size - 1)}:`;
    if (align === 'center') return `:${'-'.repeat(Math.max(1, size - 2))}:`;
    return `:${'-'.repeat(size - 1)}`;
  };
  const pad = (text: string, size: number, align: MarkdownTableAlign): string =>
    align === 'right' ? text.padStart(size) : text.padEnd(size);
  const line = (cells: readonly string[], aligns: readonly MarkdownTableAlign[]): string =>
    `| ${cells.map((cell, index) => pad(cell, widths[index]!, aligns[index] ?? 'left')).join(' | ')} |`;
  const headerAlign: MarkdownTableAlign[] = headers.map(() => 'left');
  return [
    line(padRow(headers), headerAlign),
    `| ${colAlign.map((align, index) => rule(align, widths[index]!)).join(' | ')} |`,
    ...body.map(row => line(row, colAlign)),
  ].join('\n');
}

function parseHtmlTable(tableHtml: string): {
  markdown: string;
  caption: string;
  headers: HarvestTableHeader[];
  rows: string[][];
} {
  const captionMatch = /<caption\b[^>]*>([\s\S]*?)<\/caption>/i.exec(tableHtml);
  const caption = captionMatch ? headingSectionText(captionMatch[1] ?? '') : '';
  const thead = /<thead\b[^>]*>([\s\S]*?)<\/thead>/i.exec(tableHtml)?.[1];
  const tbody = /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(tableHtml)?.[1] ?? tableHtml;
  const parseRows = (chunk: string): HarvestTableCell[][] => {
    const rows: HarvestTableCell[][] = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(chunk))) {
      const cells = parseTableRow(rowMatch[1] ?? '');
      if (cells.length > 0) rows.push(cells);
    }
    return rows;
  };
  let headerCells = thead ? parseRows(thead).at(-1) : undefined;
  const bodyRows = parseRows(tbody);
  if (!headerCells) {
    const first = bodyRows[0];
    if (first && /<th\b/i.test(tableHtml)) {
      headerCells = first;
      bodyRows.shift();
    }
  }
  if (!headerCells && bodyRows.length === 0) {
    return { markdown: '', caption, headers: [], rows: [] };
  }
  const width = Math.max(headerCells?.length ?? 0, ...bodyRows.map(row => row.length), 1);
  while ((headerCells?.length ?? 0) < width) {
    headerCells = [
      ...(headerCells ?? []),
      parseTableCell('', ''),
    ];
  }
  const rows = bodyRows.map(row => {
    const texts = row.map(cell => cell.text);
    while (texts.length < width) texts.push('');
    return texts.slice(0, width).map(text => (text.trim() === '' ? '—' : text));
  });
  const headers: HarvestTableHeader[] = (headerCells ?? []).slice(0, width).map((cell, index) => ({
    ...cell,
    label: harvestTableHeaderLabel(cell, index, harvestTableColumnSamples(rows, index)),
  }));
  return {
    markdown: formatHarvestTable(headers, rows),
    caption,
    headers,
    rows,
  };
}

function htmlTableToMarkdown(tableHtml: string): string {
  return parseHtmlTable(tableHtml).markdown;
}

function isFootnoteIdOrClass(id: string, className: string): boolean {
  return /fn|footnote/i.test(id) || /fn|footnote/i.test(className);
}

function collectBlogAssets(
  html: string,
  headings: readonly HeadingHit[]
): Pick<ExtractResult, 'images' | 'links' | 'inlineCodes' | 'tables' | 'footnotes'> {
  const preRanges = collectPreRanges(html);
  const images: BlogImage[] = [];
  const img = /<img\b([^>]*)>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = img.exec(html))) {
    const src = decodeHtmlEntities(attrValue(imgMatch[1] ?? '', 'src'));
    if (!src || src === '/logo.svg' || src.endsWith('/logo.svg')) continue;
    const ancestry = headingAncestry(headings, imgMatch.index);
    images.push({
      headingId: ancestry.leaf.headingId,
      h2Id: ancestry.h2.headingId,
      src,
      alt: decodeHtmlEntities(attrValue(imgMatch[1] ?? '', 'alt')),
      className: attrValue(imgMatch[1] ?? '', 'class'),
      htmlOffset: imgMatch.index,
    });
  }

  const links: BlogLink[] = [];
  const seenHref = new Set<string>();
  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = anchor.exec(html))) {
    if (isInsidePre(aMatch.index, preRanges)) continue;
    const className = attrValue(aMatch[1] ?? '', 'class');
    const tokens = className.split(/\s+/).filter(Boolean);
    if (tokens.includes('anchor') || tokens.includes('skip-link')) continue;
    const href = decodeHtmlEntities(attrValue(aMatch[1] ?? '', 'href'));
    if (!href || href.startsWith('javascript:')) continue;
    const ancestry = headingAncestry(headings, aMatch.index);
    const key = `${ancestry.leaf.headingId}\0${href}`;
    if (seenHref.has(key)) continue;
    seenHref.add(key);
    links.push({
      headingId: ancestry.leaf.headingId,
      h2Id: ancestry.h2.headingId,
      href,
      className,
      title: attrValue(aMatch[1] ?? '', 'title') || null,
      text: headingSectionText(aMatch[2] ?? ''),
      htmlOffset: aMatch.index,
    });
  }

  const inlineCounts = new Map<string, BlogInlineCode>();
  const codeTag = /<code\b([^>]*)>([\s\S]*?)<\/code>/gi;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeTag.exec(html))) {
    if (isInsidePre(codeMatch.index, preRanges)) continue;
    const text = headingSectionText(codeMatch[2] ?? '');
    if (!text) continue;
    const ancestry = headingAncestry(headings, codeMatch.index);
    const key = `${ancestry.leaf.headingId}\0${text}`;
    const existing = inlineCounts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    inlineCounts.set(key, {
      headingId: ancestry.leaf.headingId,
      h2Id: ancestry.h2.headingId,
      text,
      count: 1,
      context: surroundingContext(html, codeMatch.index, codeMatch.index + codeMatch[0]!.length),
    });
  }

  const tables: BlogTable[] = [];
  const tableRe = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRe.exec(html))) {
    if (isInsidePre(tableMatch.index, preRanges)) continue;
    const parsed = parseHtmlTable(tableMatch[0]!);
    if (!parsed.markdown) continue;
    const ancestry = headingAncestry(headings, tableMatch.index);
    tables.push({
      headingId: ancestry.leaf.headingId,
      h2Id: ancestry.h2.headingId,
      markdown: parsed.markdown,
      caption: parsed.caption,
      headers: parsed.headers,
      rows: parsed.rows,
      htmlOffset: tableMatch.index,
    });
  }

  const footnotes: BlogFootnote[] = [];
  const footnoteRe =
    /<(li|aside|section|div)\b([^>]*\b(?:id|class)=[^>]*(?:fn|footnote)[^>]*)>([\s\S]*?)<\/\1>/gi;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = footnoteRe.exec(html))) {
    if (isInsidePre(fnMatch.index, preRanges)) continue;
    const attrs = fnMatch[2] ?? '';
    const id = attrValue(attrs, 'id');
    const className = attrValue(attrs, 'class');
    if (!isFootnoteIdOrClass(id, className)) continue;
    const text = headingSectionText(fnMatch[3] ?? '');
    if (!text) continue;
    const ancestry = headingAncestry(headings, fnMatch.index);
    footnotes.push({
      headingId: ancestry.leaf.headingId,
      h2Id: ancestry.h2.headingId,
      footnoteId: id || className,
      text,
      htmlOffset: fnMatch.index,
    });
  }

  return { images, links, inlineCodes: [...inlineCounts.values()], tables, footnotes };
}

function pushBlock(
  blocks: CodeBlock[],
  ordinals: Map<string, number>,
  headings: readonly HeadingHit[],
  start: number,
  code: string,
  language: string,
  className: CodeBlock['className'],
  classNames: string[]
): void {
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
    language,
    lineCount: code.length === 0 ? 0 : code.split('\n').length,
    htmlOffset: start,
    className,
    classNames,
    status: 'parsed',
    statusLabel: 'parsed',
  });
}

/** Parse `div.CodeBlock` (not `CodeBlockTab`) from Bun blog HTML. */
export function extractCodeBlocks(
  html: string,
  options?: { includeGenericPre?: boolean; baseUrl?: string }
): ExtractResult {
  const divs = divClassLists(html);
  const headings = collectHeadings(html);
  const classStatuses = summarizeCodeBlockClasses(divs.map(div => div.classNames));
  const codeBlockTabCount =
    classStatuses.find(summary => summary.className === 'CodeBlockTab')?.count ?? 0;

  const ordinals = new Map<string, number>();
  const blocks: CodeBlock[] = [];
  const usedPreOffsets = new Set<number>();
  for (const div of divs) {
    if (!div.classNames.includes('CodeBlock')) continue;
    const start = div.htmlOffset;
    const after = html.slice(start);
    const preMatch = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/.exec(after);
    if (!preMatch) continue;
    const preOffset = start + preMatch.index;
    usedPreOffsets.add(preOffset);
    const code = stripShikiPre(preMatch[2]!).trimEnd();
    const codeAttrs = /<code\b([^>]*)>/i.exec(preMatch[2] ?? '')?.[1] ?? '';
    const language = detectCodeLanguage(div.classNames.join(' '), preMatch[1] ?? '', codeAttrs);
    pushBlock(blocks, ordinals, headings, start, code, language, 'CodeBlock', div.classNames);
  }

  if (options?.includeGenericPre) {
    const preRe = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi;
    let preMatch: RegExpExecArray | null;
    while ((preMatch = preRe.exec(html))) {
      if (usedPreOffsets.has(preMatch.index)) continue;
      const inner = preMatch[2] ?? '';
      const code = stripShikiPre(inner).trimEnd();
      if (!code) continue;
      const codeAttrs = /<code\b([^>]*)>/i.exec(inner)?.[1] ?? '';
      const language = detectCodeLanguage(preMatch[1] ?? '', codeAttrs);
      const classNames = (preMatch[1] ?? '').match(/class=(['"])(.*?)\1/i)?.[2]?.split(/\s+/) ?? [
        'pre',
      ];
      pushBlock(blocks, ordinals, headings, preMatch.index, code, language, 'pre', classNames);
    }
  }

  const bySection: Record<string, number> = {};
  for (const b of blocks) bySection[b.section] = (bySection[b.section] ?? 0) + 1;
  const introBlockIds = blocks.filter(b => b.h2Id === INTRO_HEADING_ID).map(b => b.blockId);
  const assets = collectBlogAssets(html, headings);

  return {
    blocks,
    codeBlockCount: blocks.length,
    codeBlockTabCount,
    classPattern: CODE_BLOCK_CLASS_PATTERN,
    classStatuses,
    bySection,
    outline: buildOutline(headings, blocks),
    introBlockIds,
    images: assets.images,
    links: assets.links,
    inlineCodes: assets.inlineCodes,
    tables: assets.tables,
    footnotes: assets.footnotes,
    social: extractSocialMetadataFromHtmlSync(html, options?.baseUrl),
  };
}

/** Typed BunFile boundary for saved Bun blog HTML. */
export async function extractCodeBlocksFromFile(file: Bun.BunFile): Promise<ExtractResult> {
  return extractCodeBlocks(await file.text());
}

/** Live Bun blog heading / permalink / sample classes. */
export const BLOG_HEADING_CLASS = 'anchored' as const;
export const BLOG_ANCHOR_CLASS = 'anchor' as const;
export const BLOG_CHIP_CLASS = 'since' as const;
export const BLOG_CODE_CLASS = 'CodeBlock group/code' as const;

export type BlogMapOptions = {
  sourceUrl: string;
  guideKey?: string;
  config?: Partial<HarvestMapConfig>;
  summaries?: Readonly<Record<string, HarvestAiSummary>>;
};

export function resolveHarvestMapConfig(
  overrides?: Partial<HarvestMapConfig>
): HarvestMapConfig {
  const include = {
    includeToc: overrides?.includeToc ?? DEFAULT_HARVEST_MAP_CONFIG.includeToc,
    includeStats: overrides?.includeStats ?? DEFAULT_HARVEST_MAP_CONFIG.includeStats,
    includeImages: overrides?.includeImages ?? DEFAULT_HARVEST_MAP_CONFIG.includeImages,
    includeLinks: overrides?.includeLinks ?? DEFAULT_HARVEST_MAP_CONFIG.includeLinks,
    includeInlineCode: overrides?.includeInlineCode ?? DEFAULT_HARVEST_MAP_CONFIG.includeInlineCode,
    includeCodeBlocks: overrides?.includeCodeBlocks ?? DEFAULT_HARVEST_MAP_CONFIG.includeCodeBlocks,
    includeRawJson: overrides?.includeRawJson ?? DEFAULT_HARVEST_MAP_CONFIG.includeRawJson,
    includeTables: overrides?.includeTables ?? DEFAULT_HARVEST_MAP_CONFIG.includeTables,
    includeFootnotes: overrides?.includeFootnotes ?? DEFAULT_HARVEST_MAP_CONFIG.includeFootnotes,
    includeSocial: overrides?.includeSocial ?? DEFAULT_HARVEST_MAP_CONFIG.includeSocial,
  };
  return { ...include, ...resolveHarvestAiConfig(overrides) };
}

export type HarvestMapStats = {
  h2: number;
  headings: number;
  blocks: number;
  images: number;
  links: number;
  inlineCodes: number;
  tables: number;
  footnotes: number;
  social: number;
};

export const HARVEST_CLI_CMD = 'bun tools/harvest.ts [--ai] <url> <outdir> [depth]';
export const HARVEST_AI_CMD = 'bun tools/harvest.ts --ai <url> <outdir> [depth]';
export const HARVEST_CONFIG_CMD = 'CONFIG';
export const HARVEST_RUNTIME = 'Bun';

export function harvestRuntimeVersion(): string {
  return Bun.version;
}

export type HarvestTemplateRow = {
  field: string;
  type: string;
  property: string;
  flag: string;
  cmd: string;
  countKey?: keyof HarvestMapStats;
};

/** Harvest template: Field · Type · Property · Flag · Cmd · Runtime · Version · Count. */
export const HARVEST_TEMPLATE_ROWS: readonly HarvestTemplateRow[] = [
  { field: 'Runtime', type: 'string', property: 'Bun', flag: '—', cmd: 'bun --version' },
  { field: 'Version', type: 'string', property: 'Bun.version', flag: '—', cmd: 'bun --version' },
  {
    field: 'Rewriter',
    type: 'HTMLRewriter',
    property: 'HTMLRewriter.transform',
    flag: '—',
    cmd: 'HTMLRewriter',
  },
  { field: 'H2', type: 'HeadingNode[]', property: 'HarvestMapStats.h2', flag: '—', cmd: 'extract', countKey: 'h2' },
  {
    field: 'Headings',
    type: 'HeadingNode[]',
    property: 'HarvestMapStats.headings',
    flag: '—',
    cmd: 'extract',
    countKey: 'headings',
  },
  {
    field: 'Code blocks',
    type: 'CodeBlock[]',
    property: 'CONFIG.includeCodeBlocks',
    flag: 'includeCodeBlocks',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'blocks',
  },
  {
    field: 'Images',
    type: 'BlogImage[]',
    property: 'CONFIG.includeImages',
    flag: 'includeImages',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'images',
  },
  {
    field: 'Links',
    type: 'BlogLink[]',
    property: 'CONFIG.includeLinks',
    flag: 'includeLinks',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'links',
  },
  {
    field: 'Inline code',
    type: 'BlogInlineCode[]',
    property: 'CONFIG.includeInlineCode',
    flag: 'includeInlineCode',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'inlineCodes',
  },
  {
    field: 'Tables',
    type: 'BlogTable[]',
    property: 'CONFIG.includeTables',
    flag: 'includeTables',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'tables',
  },
  {
    field: 'Footnotes',
    type: 'BlogFootnote[]',
    property: 'CONFIG.includeFootnotes',
    flag: 'includeFootnotes',
    cmd: HARVEST_CONFIG_CMD,
    countKey: 'footnotes',
  },
  {
    field: 'Social',
    type: 'SocialMetadata',
    property: 'SocialMetadata.image',
    flag: 'includeSocial',
    cmd: 'HTMLRewriter',
    countKey: 'social',
  },
  { field: 'TOC', type: 'boolean', property: 'CONFIG.includeToc', flag: 'includeToc', cmd: HARVEST_CONFIG_CMD },
  { field: 'Stats', type: 'boolean', property: 'CONFIG.includeStats', flag: 'includeStats', cmd: HARVEST_CONFIG_CMD },
  { field: 'Raw JSON', type: 'json', property: 'CONFIG.includeRawJson', flag: 'includeRawJson', cmd: HARVEST_CONFIG_CMD },
  { field: 'AI', type: 'HarvestAiSummary[]', property: 'CONFIG.enableAI', flag: '--ai', cmd: HARVEST_AI_CMD },
  { field: 'URL', type: 'string', property: 'Bun.argv', flag: '<url>', cmd: HARVEST_CLI_CMD },
  { field: 'Out dir', type: 'string', property: 'Bun.argv', flag: '<outdir>', cmd: HARVEST_CLI_CMD },
  { field: 'Depth', type: 'number', property: 'Bun.argv', flag: '[depth]', cmd: HARVEST_CLI_CMD },
];

function harvestTemplateMeta(): [string, string] {
  return [HARVEST_RUNTIME, harvestRuntimeVersion()];
}

function isHarvestConfigRow(row: HarvestTemplateRow): boolean {
  return (
    row.flag !== '—' ||
    row.property === 'Bun' ||
    row.property.startsWith('Bun.') ||
    row.property.startsWith('HTMLRewriter')
  );
}

export function formatHarvestFlagCmdTable(): string {
  const seen = new Set<string>();
  const rows: string[][] = [];
  for (const row of HARVEST_TEMPLATE_ROWS) {
    if (!isHarvestConfigRow(row)) continue;
    const key = `${row.type}\0${row.property}\0${row.flag}\0${row.cmd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [runtime, version] = harvestTemplateMeta();
    rows.push([row.type, row.property, row.flag, row.cmd, runtime, version]);
  }
  return formatMarkdownTable(['Type', 'Property', 'Flag', 'Cmd', 'Runtime', 'Version'], rows);
}

export function formatHarvestTemplateTable(extracted: ExtractResult): string {
  const stats = harvestMapStats(extracted);
  return formatMarkdownTable(
    ['Field', 'Type', 'Property', 'Flag', 'Cmd', 'Runtime', 'Version', 'Count'],
    HARVEST_TEMPLATE_ROWS.map(row => {
      const [runtime, version] = harvestTemplateMeta();
      return [
        row.field,
        row.type,
        row.property,
        row.flag,
        row.cmd,
        runtime,
        version,
        row.countKey ? String(stats[row.countKey]) : '—',
      ];
    }),
    ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'right']
  );
}

export type LanguageStat = {
  language: string;
  blocks: number;
  lines: number;
  percent: number;
};

export async function summarizeHarvestMap(
  extracted: ExtractResult,
  config: HarvestMapConfig,
  fetchImpl?: HarvestAiFetch
): Promise<Record<string, HarvestAiSummary>> {
  if (!config.enableAI) return {};
  const out: Record<string, HarvestAiSummary> = {};
  for (const node of extracted.outline) {
    const codes = extracted.blocks.filter(block => block.h2Id === node.headingId).map(block => block.code);
    const text = harvestSectionText(node.title, codes);
    try {
      const completion = await requestHarvestAiSummary(text, config, fetchImpl);
      out[node.headingId] = { headingId: node.headingId, ...completion };
    } catch {
      out[node.headingId] = {
        headingId: node.headingId,
        summary: '(ai unavailable)',
        topics: [],
      };
    }
  }
  return out;
}

function summaryFor(
  headingId: string,
  summaries: Readonly<Record<string, HarvestAiSummary>> | undefined
): HarvestAiSummary | undefined {
  return summaries?.[headingId];
}

export function harvestMapStats(extracted: ExtractResult): HarvestMapStats {
  const countNodes = (nodes: readonly HeadingNode[]): number =>
    nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
  return {
    h2: extracted.outline.length,
    headings: countNodes(extracted.outline),
    blocks: extracted.codeBlockCount,
    images: extracted.images.length,
    links: extracted.links.length,
    inlineCodes: extracted.inlineCodes.reduce((sum, row) => sum + row.count, 0),
    tables: extracted.tables.length,
    footnotes: extracted.footnotes.length,
    social: Object.values(extracted.social).filter(value => value != null && value !== '').length,
  };
}

/** `https://bun.com/blog/bun-v1.4#bun-markdown` — official heading hash, not the auto-slug. */
export function blogHeadingHref(sourceUrl: string, headingId: string): string {
  const base = sourceUrl.replace(/#.*$/u, '').replace(/\/$/u, '');
  return `${base}#${headingId}`;
}

/** `blog/bun-v1.4#bun-markdown/1` — harvest locator qualified by the post guide key. */
export function blogGuideBlockId(guideKey: string, blockId: string): string {
  return `${guideKey}#${blockId}`;
}

function renderTitleInner(title: string): string {
  return Bun.markdown
    .render(title, {
      paragraph: children => children,
      strong: children => `<strong>${children}</strong>`,
      emphasis: children => `<em>${children}</em>`,
      codespan: children => `<code>${children}</code>`,
    })
    .trim();
}

function renderChip(kind: 'Shipped' | 'Improved', version: string): string {
  const href = `/blog/release-notes/bun-v${version}`;
  return `<a href="${Bun.escapeHTML(href)}" class="${BLOG_CHIP_CLASS}" title="${kind} in Bun v${Bun.escapeHTML(version)}">v${Bun.escapeHTML(version)}</a>`;
}

function renderChips(node: HeadingNode): string {
  const chips = [
    node.shippedIn ? renderChip('Shipped', node.shippedIn) : '',
    node.improvedIn ? renderChip('Improved', node.improvedIn) : '',
  ].filter(Boolean);
  if (chips.length === 0) return '';
  return `<span class="ml-2">${chips.join('')}</span>`;
}

function renderSample(block: CodeBlock): string {
  const fence = `\`\`\`\n${block.code}\n\`\`\``;
  return Bun.markdown.render(fence, {
    code: () =>
      `<div class="${BLOG_CODE_CLASS}" data-block-id="${Bun.escapeHTML(block.blockId)}" data-hash="${Bun.escapeHTML(block.codeHash)}"><pre><code>${Bun.escapeHTML(block.code)}</code></pre></div>`,
  });
}

function blocksForIds(
  blockIds: readonly string[],
  byBlockId: Map<string, CodeBlock>
): CodeBlock[] {
  return blockIds.flatMap(id => {
    const block = byBlockId.get(id);
    return block ? [block] : [];
  });
}

function assetsForHeading<T extends { headingId: string }>(
  rows: readonly T[],
  headingId: string
): T[] {
  return rows.filter(row => row.headingId === headingId);
}

function renderHeadingNode(
  node: HeadingNode,
  extracted: ExtractResult,
  byBlockId: Map<string, CodeBlock>,
  config: HarvestMapConfig,
  summaries?: Readonly<Record<string, HarvestAiSummary>>
): string {
  const id = Bun.escapeHTML(node.headingId);
  const heading = `<h${node.level} id="${id}" class="${BLOG_HEADING_CLASS}">${renderTitleInner(node.title)}${renderChips(node)}<a href="#${id}" aria-label="Permalink" class="${BLOG_ANCHOR_CLASS}">#</a></h${node.level}>`;
  const ai = summaryFor(node.headingId, summaries);
  const aiHtml = ai
    ? `<p class="harvest-ai">SUMMARY: ${Bun.escapeHTML(ai.summary)}${ai.topics.length ? ` | TOPICS: ${Bun.escapeHTML(ai.topics.join(', '))}` : ''}</p>`
    : '';
  const samples = config.includeCodeBlocks
    ? blocksForIds(node.blockIds, byBlockId).map(renderSample).join('')
    : '';
  const images = config.includeImages
    ? assetsForHeading(extracted.images, node.headingId)
        .map(
          image =>
            `<figure><img src="${Bun.escapeHTML(image.src)}" alt="${Bun.escapeHTML(image.alt)}" class="${Bun.escapeHTML(image.className)}"/></figure>`
        )
        .join('')
    : '';
  const links = config.includeLinks
    ? assetsForHeading(extracted.links, node.headingId)
        .map(
          link =>
            `<a href="${Bun.escapeHTML(link.href)}" class="${Bun.escapeHTML(link.className)}"${link.title ? ` title="${Bun.escapeHTML(link.title)}"` : ''}>${Bun.escapeHTML(link.text || link.href)}</a>`
        )
        .join(' ')
    : '';
  const inline = config.includeInlineCode
    ? assetsForHeading(extracted.inlineCodes, node.headingId)
        .map(row => `<code>${Bun.escapeHTML(row.text)}</code>`)
        .join(' ')
    : '';
  const tables = config.includeTables
    ? assetsForHeading(extracted.tables, node.headingId)
        .map(table =>
          Bun.markdown.html(formatHarvestTable(table.headers, table.rows), { tables: true })
        )
        .join('')
    : '';
  const footnotes = config.includeFootnotes
    ? assetsForHeading(extracted.footnotes, node.headingId)
        .map(
          note =>
            `<aside class="footnote" id="${Bun.escapeHTML(note.footnoteId)}">${Bun.escapeHTML(note.text)}</aside>`
        )
        .join('')
    : '';
  const children = node.children
    .map(child => renderHeadingNode(child, extracted, byBlockId, config, summaries))
    .join('');
  return `${heading}\n${aiHtml}${samples}${tables}${footnotes}${images}${links}${inline}${children}`;
}

function socialEntries(social: SocialMetadata): Array<[string, string]> {
  return (
    [
      ['title', social.title],
      ['description', social.description],
      ['image', social.image],
      ['url', social.url],
      ['siteName', social.siteName],
      ['type', social.type],
    ] as const
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));
}

function renderSocialMarkdown(social: SocialMetadata): string {
  const rows = socialEntries(social);
  if (rows.length === 0) return '';
  let md = `## Social\n\n`;
  for (const [key, value] of rows) {
    if (key === 'image') md += `- image: ![og:image](${value})\n`;
    else md += `- ${key}: ${value}\n`;
  }
  return `${md}\n`;
}

function renderSocialHtml(social: SocialMetadata): string {
  const rows = socialEntries(social);
  if (rows.length === 0) return '';
  const image = social.image
    ? `<img src="${Bun.escapeHTML(social.image)}" alt="${Bun.escapeHTML(social.title ?? 'og:image')}" class="og-image"/>`
    : '';
  const meta = rows
    .filter(([key]) => key !== 'image')
    .map(
      ([key, value]) =>
        `<li><span class="og-key">${Bun.escapeHTML(key)}</span> ${Bun.escapeHTML(value)}</li>`
    )
    .join('');
  return `<aside class="og">${image}<ul>${meta}</ul></aside>\n`;
}

function renderTocHtml(nodes: readonly HeadingNode[], sourceUrl: string): string {
  const items = nodes
    .map(node => {
      const href = Bun.escapeHTML(blogHeadingHref(sourceUrl, node.headingId));
      return `<li><a href="${href}">${renderTitleInner(node.title)}</a></li>`;
    })
    .join('');
  return `<nav class="toc"><ol>${items}</ol></nav>\n`;
}

function renderLanguageStatsMarkdown(blocks: readonly CodeBlock[]): string {
  const rows = harvestLanguageStats(blocks);
  if (rows.length === 0) return '';
  return formatMarkdownTable(
    ['Language', 'Blocks', 'Share', 'Lines'],
    rows.map(row => [row.language, String(row.blocks), `${row.percent}%`, String(row.lines)]),
    ['left', 'right', 'right', 'right']
  );
}

function renderCountStatsMarkdown(extracted: ExtractResult): string {
  return formatHarvestTemplateTable(extracted);
}

function renderStatsHtml(extracted: ExtractResult): string {
  const languages = renderLanguageStatsMarkdown(extracted.blocks);
  const md = [
    formatHarvestFlagCmdTable(),
    languages,
    renderCountStatsMarkdown(extracted),
  ]
    .filter(Boolean)
    .join('\n\n');
  return Bun.markdown.html(md, { tables: true });
}

function harvestRawJson(extracted: ExtractResult, opts: BlogMapOptions): string {
  return `${JSON.stringify(
    {
      sourceUrl: opts.sourceUrl,
      guideKey: opts.guideKey ?? null,
      stats: harvestMapStats(extracted),
      languages: harvestLanguageStats(extracted.blocks),
      outline: extracted.outline,
      introBlockIds: extracted.introBlockIds,
      blocks: extracted.blocks.map(block => ({
        blockId: block.blockId,
        headingId: block.headingId,
        h2Id: block.h2Id,
        codeHash: block.codeHash,
        language: block.language,
        lineCount: block.lineCount,
        classNames: block.classNames,
      })),
      images: extracted.images,
      links: extracted.links,
      inlineCodes: extracted.inlineCodes,
      tables: extracted.tables,
      footnotes: extracted.footnotes,
      social: extracted.social,
      summaries: opts.summaries ?? {},
    },
    null,
    2
  )}\n`;
}

/**
 * Project harvest outline + samples onto the live blog HTML shape:
 * official heading `id`, `class="anchored"`, permalink `href="#id"`,
 * chip `href="/blog/release-notes/bun-v…"`, sample `class="CodeBlock group/code"`.
 * Bun.markdown auto-slugs (`bunmarkdown`) are not used as ids.
 */
export function mapHarvestToBlogHtml(extracted: ExtractResult, opts: BlogMapOptions): string {
  const config = resolveHarvestMapConfig(opts.config);
  const byBlockId = new Map(extracted.blocks.map(block => [block.blockId, block]));
  const parts: string[] = [
    `<!-- mapped from ${Bun.escapeHTML(opts.sourceUrl)} via Bun.markdown -->\n`,
  ];
  if (config.includeSocial) parts.push(renderSocialHtml(extracted.social));
  if (config.includeToc) parts.push(renderTocHtml(extracted.outline, opts.sourceUrl));
  if (config.includeStats) parts.push(renderStatsHtml(extracted));
  const intro = config.includeCodeBlocks
    ? blocksForIds(extracted.introBlockIds, byBlockId).map(renderSample).join('')
    : '';
  parts.push(intro);
  parts.push(
    extracted.outline
      .map(node => renderHeadingNode(node, extracted, byBlockId, config, opts.summaries))
      .join('\n')
  );
  if (config.includeRawJson) {
    parts.push(`<script type="application/json" id="harvest-raw">${Bun.escapeHTML(harvestRawJson(extracted, opts).trimEnd())}</script>\n`);
  }
  return parts.join('');
}

function tocMarkdown(nodes: readonly HeadingNode[], sourceUrl: string, depth = 0): string {
  return nodes
    .map(node => {
      const pad = '  '.repeat(depth);
      const href = blogHeadingHref(sourceUrl, node.headingId);
      return `${pad}- [${node.title}](${href})\n${tocMarkdown(node.children, sourceUrl, depth + 1)}`;
    })
    .join('');
}

function nodeMarkdown(
  node: HeadingNode,
  extracted: ExtractResult,
  opts: BlogMapOptions,
  byBlockId: Map<string, CodeBlock>,
  config: HarvestMapConfig
): string {
  const hashes = '#'.repeat(node.level);
  const href = blogHeadingHref(opts.sourceUrl, node.headingId);
  let md = `${hashes} [${node.title}](${href})\n\n`;
  md += `- id: \`${node.headingId}\`\n`;
  md += `- href: ${href}\n`;
  md += `- class: \`${BLOG_HEADING_CLASS}\`\n`;
  const ai = summaryFor(node.headingId, opts.summaries);
  if (ai) {
    md += `- summary: ${ai.summary}\n`;
    if (ai.topics.length) md += `- topics: ${ai.topics.join(', ')}\n`;
  }
  if (node.shippedIn) md += `- shipped: \`${node.shippedIn}\` · /blog/release-notes/bun-v${node.shippedIn}\n`;
  if (node.improvedIn) {
    md += `- improved: \`${node.improvedIn}\` · /blog/release-notes/bun-v${node.improvedIn}\n`;
  }
  md += '\n';
  if (config.includeImages) {
    for (const image of assetsForHeading(extracted.images, node.headingId)) {
      md += `- image: ![${image.alt}](${image.src}) class: \`${image.className || '(none)'}\`\n`;
    }
  }
  if (config.includeLinks) {
    for (const link of assetsForHeading(extracted.links, node.headingId)) {
      md += `- link: [${link.text || link.href}](${link.href}) class: \`${link.className || '(none)'}\`\n`;
    }
  }
  if (config.includeInlineCode) {
    for (const row of assetsForHeading(extracted.inlineCodes, node.headingId)) {
      md += `- inline: \`${row.text.replace(/`/g, '\\`')}\` × ${row.count}`;
      if (row.context) md += ` — ${row.context.replace(/\n/g, ' ')}`;
      md += '\n';
    }
  }
  if (config.includeTables) {
    for (const table of assetsForHeading(extracted.tables, node.headingId)) {
      if (table.caption) md += `\n*${table.caption}*\n`;
      md += `\n${formatHarvestTable(table.headers, table.rows)}\n`;
    }
  }
  if (config.includeFootnotes) {
    for (const note of assetsForHeading(extracted.footnotes, node.headingId)) {
      md += `- footnote \`${note.footnoteId}\`: ${note.text}\n`;
    }
  }
  if (
    config.includeImages ||
    config.includeLinks ||
    config.includeInlineCode ||
    config.includeTables ||
    config.includeFootnotes
  ) {
    md += '\n';
  }
  const guideKey = opts.guideKey;
  if (config.includeCodeBlocks) {
    for (const block of blocksForIds(node.blockIds, byBlockId)) {
      const locator = guideKey ? blogGuideBlockId(guideKey, block.blockId) : block.blockId;
      md += `- **${locator}**\n`;
      md += `  - path: \`${block.blockId}\`\n`;
      md += `  - language: \`${block.language}\` · ${block.lineCount} lines\n`;
      md += `  - class: \`${block.classNames.join(' ')}\`\n`;
      md += `  - hash: \`${block.codeHash}\`\n\n`;
      const fence = block.language === 'text' ? '' : block.language.toLowerCase().replace(/\s+/g, '');
      md += `\`\`\`${fence}\n${block.code}\n\`\`\`\n\n`;
    }
  }
  for (const child of node.children) {
    md += nodeMarkdown(child, extracted, opts, byBlockId, config);
  }
  return md;
}

/** Markdown map: harvest locators → live blog href / id / class. Render with Bun.markdown.html. */
export function mapHarvestToBlogMarkdown(extracted: ExtractResult, opts: BlogMapOptions): string {
  const config = resolveHarvestMapConfig(opts.config);
  const byBlockId = new Map(extracted.blocks.map(block => [block.blockId, block]));
  let md = `# Harvest → ${opts.sourceUrl}\n\n`;
  md += `Mapped with \`Bun.markdown.html\` / \`Bun.markdown.render\`. Heading ids are the official blog \`id\`s, not markdown auto-slugs.\n\n`;
  if (config.includeStats) {
    const languages = renderLanguageStatsMarkdown(extracted.blocks);
    md += `## Config\n\n${formatHarvestFlagCmdTable()}\n\n`;
    md += `## Stats\n\n`;
    if (languages) md += `${languages}\n\n`;
    md += `${renderCountStatsMarkdown(extracted)}\n\n`;
  }
  if (config.includeSocial) {
    md += renderSocialMarkdown(extracted.social);
  }
  if (config.includeToc) {
    md += `## TOC\n\n${tocMarkdown(extracted.outline, opts.sourceUrl)}\n`;
  }
  if (extracted.introBlockIds.length > 0 && config.includeCodeBlocks) {
    md += `## intro\n\n`;
    for (const block of blocksForIds(extracted.introBlockIds, byBlockId)) {
      const locator = opts.guideKey ? blogGuideBlockId(opts.guideKey, block.blockId) : block.blockId;
      md += `- **${locator}** · class: \`${block.classNames.join(' ')}\`\n\n\`\`\`\n${block.code}\n\`\`\`\n\n`;
    }
  }
  for (const node of extracted.outline) {
    md += nodeMarkdown(node, extracted, opts, byBlockId, config);
  }
  if (config.includeRawJson) {
    md += `## Raw JSON\n\n\`\`\`json\n${harvestRawJson(extracted, opts).trimEnd()}\n\`\`\`\n`;
  }
  return md;
}

export { harvestRawJson };
