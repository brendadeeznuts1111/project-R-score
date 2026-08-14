// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options table
// @see https://bun.com/reference/bun/markdown#bun.markdown.Options — Bun.markdown.Options types
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
  /** GFM extras (Bun 1.3.8+): [[wiki links]] + inline LaTeX. */
  wikiLinks: true,
  latexMath: true,
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

/** Named parser policies for CLIs and other configuration boundaries. */
export const MARKDOWN_PRESETS = {
  readme: MARKDOWN_PRESET_README,
  portal: MARKDOWN_PRESET_PORTAL,
  secure: MARKDOWN_PRESET_SECURE,
  design: MARKDOWN_PRESET_DESIGN,
} as const satisfies Record<string, Bun.markdown.Options>;

export type MarkdownPresetName = keyof typeof MARKDOWN_PRESETS;

export const MARKDOWN_PRESET_NAMES = Object.freeze(
  Object.keys(MARKDOWN_PRESETS) as MarkdownPresetName[]
);

export const MARKDOWN_BOOLEAN_OPTION_NAMES = [
  'tables',
  'strikethrough',
  'tasklists',
  'hardSoftBreaks',
  'wikiLinks',
  'underline',
  'latexMath',
  'collapseWhitespace',
  'permissiveAtxHeaders',
  'noIndentedCodeBlocks',
  'noHtmlBlocks',
  'noHtmlSpans',
  'tagFilter',
] as const satisfies readonly (keyof Bun.markdown.Options)[];

export type MarkdownBooleanOptionName = (typeof MARKDOWN_BOOLEAN_OPTION_NAMES)[number];

function parseMarkdownBoolean(name: string, value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid Markdown option ${name}=${JSON.stringify(value)}; expected true|false`);
}

function parseAutolinks(value: string): Bun.markdown.Options['autolinks'] {
  if (value === 'true' || value === 'all') return true;
  if (value === 'false' || value === 'none') return false;
  const modes = value.split('+');
  const allowed = ['url', 'www', 'email'] as const;
  if (
    modes.length === 0 ||
    new Set(modes).size !== modes.length ||
    modes.some(mode => !allowed.some(candidate => candidate === mode))
  ) {
    throw new Error(
      `Invalid Markdown option autolinks=${JSON.stringify(value)}; expected true|false|all|none or url+www+email`
    );
  }
  return Object.fromEntries(modes.map(mode => [mode, true])) as Exclude<
    Bun.markdown.Options['autolinks'],
    boolean | undefined
  >;
}

function parseHeadings(value: string): Bun.markdown.Options['headings'] {
  if (value === 'true' || value === 'all' || value === 'linked') return true;
  if (value === 'false' || value === 'none') return false;
  if (value === 'ids') return { ids: true };
  if (value === 'autolink') return { autolink: true };
  throw new Error(
    `Invalid Markdown option headings=${JSON.stringify(value)}; expected true|false|all|none|linked|ids|autolink`
  );
}

/**
 * Parse comma-separated, exact Bun.markdown.Options overrides.
 *
 * Boolean fields use `name=true|false`; structured fields use
 * `headings=ids|linked|none` and `autolinks=url+www+email|all|none`.
 * Unknown and duplicate fields fail closed.
 */
export function parseMarkdownOptionOverrides(spec?: string): Bun.markdown.Options {
  if (spec == null || spec.trim() === '') return {};
  const overrides: Bun.markdown.Options = {};
  const seen = new Set<string>();

  for (const rawEntry of spec.split(',')) {
    const entry = rawEntry.trim();
    const separator = entry.indexOf('=');
    if (separator < 1 || separator === entry.length - 1) {
      throw new Error(
        `Invalid Markdown option entry ${JSON.stringify(entry)}; expected name=value`
      );
    }
    const name = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (seen.has(name)) throw new Error(`Duplicate Markdown option ${JSON.stringify(name)}`);
    seen.add(name);

    if (name === 'autolinks') {
      overrides.autolinks = parseAutolinks(value);
      continue;
    }
    if (name === 'headings') {
      overrides.headings = parseHeadings(value);
      continue;
    }
    if (MARKDOWN_BOOLEAN_OPTION_NAMES.some(candidate => candidate === name)) {
      overrides[name as MarkdownBooleanOptionName] = parseMarkdownBoolean(name, value);
      continue;
    }
    throw new Error(
      `Unknown Markdown option ${JSON.stringify(name)}; expected ${[
        ...MARKDOWN_BOOLEAN_OPTION_NAMES,
        'autolinks',
        'headings',
      ].join('|')}`
    );
  }

  return overrides;
}

/** Parse a named preset at a CLI/configuration boundary. */
export function resolveMarkdownPreset(name = 'readme'): {
  name: MarkdownPresetName;
  options: Bun.markdown.Options;
} {
  if (!MARKDOWN_PRESET_NAMES.some(candidate => candidate === name)) {
    throw new Error(
      `Invalid Markdown preset ${JSON.stringify(name)}; expected ${MARKDOWN_PRESET_NAMES.join('|')}`
    );
  }
  const presetName = name as MarkdownPresetName;
  return { name: presetName, options: { ...MARKDOWN_PRESETS[presetName] } };
}

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
