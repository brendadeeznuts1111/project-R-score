// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options table
// @see https://bun.com/docs/runtime/markdown#autolinks — autolinks true | { url, www, email }
// @see https://bun.com/docs/runtime/markdown#heading-ids — headings true | { ids, autolink }
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/blog/bun-v1.3.8#bun-markdown-built-in-markdown-parser — ship note (flat headingIds obsolete)
/**
 * Bun.markdown.Options SSOT — defaults + named presets for HTML rendering.
 *
 * Bun-local only (no Workers/Pages edge). Prefer presets over ad-hoc option
 * objects so portal / factory / tools stay aligned with bun-types.
 *
 * Docs table (defaults): tables · strikethrough · tasklists = true; all other
 * flags false unless set. Blog-era `headingIds` / `autolinkHeadings` are not
 * options — use `headings`.
 */

/** Re-export for consumers that want the type without importing from `bun`. */
export type MarkdownHtmlOptions = Bun.markdown.Options;

/**
 * Documented defaults from https://bun.com/docs/runtime/markdown#options.
 * GFM triad on; security / heading / wiki / math off.
 */
export const MARKDOWN_OPTIONS_DEFAULTS = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: false,
  headings: false,
  hardSoftBreaks: false,
  wikiLinks: false,
  underline: false,
  latexMath: false,
  collapseWhitespace: false,
  permissiveAtxHeaders: false,
  noIndentedCodeBlocks: false,
  noHtmlBlocks: false,
  noHtmlSpans: false,
  tagFilter: false,
} as const satisfies Required<
  Pick<
    Bun.markdown.Options,
    | 'tables'
    | 'strikethrough'
    | 'tasklists'
    | 'hardSoftBreaks'
    | 'wikiLinks'
    | 'underline'
    | 'latexMath'
    | 'collapseWhitespace'
    | 'permissiveAtxHeaders'
    | 'noIndentedCodeBlocks'
    | 'noHtmlBlocks'
    | 'noHtmlSpans'
    | 'tagFilter'
  >
> & {
  autolinks: false;
  headings: false;
};

/**
 * Human-readable option catalog (matches docs table order).
 * Used by tests and operator notes — not passed to Bun directly.
 */
export const MARKDOWN_OPTION_CATALOG = [
  { option: 'tables', default: true, description: 'GFM tables' },
  { option: 'strikethrough', default: true, description: 'GFM strikethrough (~~text~~)' },
  { option: 'tasklists', default: true, description: 'GFM task lists (- [x] item)' },
  {
    option: 'autolinks',
    default: false,
    description: 'Autolinks: true | { url?, www?, email? }',
  },
  {
    option: 'headings',
    default: false,
    description: 'Heading IDs/autolinks: true | { ids?, autolink? }',
  },
  { option: 'hardSoftBreaks', default: false, description: 'Soft line breaks as hard breaks' },
  { option: 'wikiLinks', default: false, description: 'Enable [[wiki links]]' },
  {
    option: 'underline',
    default: false,
    description: '__text__ renders as <u> instead of <strong>',
  },
  {
    option: 'latexMath',
    default: false,
    description: 'Enable $inline$ and $$display$$ math',
  },
  { option: 'collapseWhitespace', default: false, description: 'Collapse whitespace in text' },
  {
    option: 'permissiveAtxHeaders',
    default: false,
    description: 'ATX headers without space after #',
  },
  {
    option: 'noIndentedCodeBlocks',
    default: false,
    description: 'Disable indented code blocks',
  },
  { option: 'noHtmlBlocks', default: false, description: 'Disable HTML blocks' },
  { option: 'noHtmlSpans', default: false, description: 'Disable inline HTML' },
  {
    option: 'tagFilter',
    default: false,
    description: 'GFM tag filter for disallowed HTML tags',
  },
] as const;

/** Portal / skill HTML: GFM + autolinks + heading anchors + tag filter. */
export const MARKDOWN_PRESET_PORTAL = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  tagFilter: true,
  autolinks: true,
  headings: true, // ids + in-heading autolinks
} as const satisfies Bun.markdown.Options;

/** README / registry desk HTML: heading anchors + URL/www autolinks + tag filter. */
export const MARKDOWN_PRESET_README = {
  headings: true,
  autolinks: { url: true, www: true },
  tagFilter: true,
} as const satisfies Bun.markdown.Options;

/**
 * Secure-ish HTML for untrusted notes: tag filter + no raw HTML blocks/spans.
 * Keep GFM triad; no wiki/math.
 */
export const MARKDOWN_PRESET_SECURE = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  tagFilter: true,
  noHtmlBlocks: true,
  noHtmlSpans: true,
  autolinks: { url: true },
  headings: { ids: true }, // ids only (no nested <a> in heading)
} as const satisfies Bun.markdown.Options;

/** Design notes: wiki links + math + heading ids (no autolink wrapper). */
export const MARKDOWN_PRESET_DESIGN = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  wikiLinks: true,
  latexMath: true,
  headings: { ids: true },
  autolinks: true,
  tagFilter: true,
} as const satisfies Bun.markdown.Options;

/** Merge overrides onto a base preset (shallow). */
export function mergeMarkdownOptions(
  base: Bun.markdown.Options,
  overrides?: Bun.markdown.Options
): Bun.markdown.Options {
  if (!overrides) return { ...base };
  return { ...base, ...overrides };
}

/** HTML render with a preset. */
export function markdownHtml(
  markdown: string,
  options: Bun.markdown.Options = MARKDOWN_PRESET_README
): string {
  return Bun.markdown.html(markdown, options);
}
