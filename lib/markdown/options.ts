// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options table
// @see https://bun.com/reference/bun/markdown#bun.markdown.Options — Bun.markdown.Options types
// @see https://bun.com/docs/runtime/markdown#autolinks — autolinks true | { url, www, email }
// @see https://bun.com/docs/runtime/markdown#heading-ids — headings true | { ids, autolink }
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#nested-list-numbering — nested list numbering
// @see https://bun.com/docs/runtime/markdown#list-item-meta — listItem metadata
// @see https://bun.com/reference/bun/markdown/ListMeta — Bun.markdown.ListMeta
// @see https://bun.com/reference/bun/markdown/ListItemMeta — Bun.markdown.ListItemMeta
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

export type BunMarkdownCrossReference = {
  surface: string;
  role: string;
  guide: `https://bun.com/${string}`;
  reference: `https://bun.com/reference/${string}`;
  released: `v1.${number}.${number} · ${number}-${number}-${number}` | 'release-unknown';
  releaseRef: `https://bun.com/blog/${string}` | 'release-unknown';
  latestUpdate:
    | `${'changed' | 'fixed'} v1.${number}.${number} · ${number}-${number}-${number}`
    | 'none-recorded';
  updateRef: `https://bun.com/blog/${string}` | 'none-recorded';
};

/**
 * Exact upstream links for the Markdown pipeline and the Bun APIs supporting it.
 * Introduction versions remain unknown unless backed by an official dated post.
 */
export const BUN_MARKDOWN_CROSS_REFERENCES = [
  {
    surface: 'Bun.markdown.html',
    role: 'HTML projection',
    guide: 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
    reference: 'https://bun.com/reference/bun/markdown/html',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'none-recorded',
    updateRef: 'none-recorded',
  },
  {
    surface: 'Bun.markdown.render',
    role: 'callback projection',
    guide: 'https://bun.com/docs/runtime/markdown#bun-markdown-render',
    reference: 'https://bun.com/reference/bun/markdown/render',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'changed v1.3.11 · 2026-03-18',
    updateRef: 'https://bun.com/blog/bun-v1.3.11',
  },
  {
    surface: 'Bun.markdown.react',
    role: 'React projection',
    guide: 'https://bun.com/docs/runtime/markdown#bun-markdown-react',
    reference: 'https://bun.com/reference/bun/markdown/react',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'changed v1.3.9 · 2026-02-08',
    updateRef: 'https://bun.com/blog/bun-v1.3.9',
  },
  {
    surface: 'Bun.markdown.ansi',
    role: 'terminal projection',
    guide: 'https://bun.com/docs/runtime/markdown#ansi-terminal-output',
    reference: 'https://bun.com/reference/bun/markdown/ansi',
    released: 'v1.3.12 · 2026-04-09',
    releaseRef: 'https://bun.com/blog/bun-v1.3.12',
    latestUpdate: 'fixed v1.3.14 · 2026-05-13',
    updateRef: 'https://bun.com/blog/bun-v1.3.14',
  },
  {
    surface: 'Bun.markdown.Options',
    role: 'parser configuration',
    guide: 'https://bun.com/docs/runtime/markdown#options',
    reference: 'https://bun.com/reference/bun/markdown/Options',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'none-recorded',
    updateRef: 'none-recorded',
  },
  {
    surface: 'Bun.markdown.ListMeta',
    role: 'nested list container metadata',
    guide: 'https://bun.com/docs/runtime/markdown#nested-list-numbering',
    reference: 'https://bun.com/reference/bun/markdown/ListMeta',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'none-recorded',
    updateRef: 'none-recorded',
  },
  {
    surface: 'Bun.markdown.ListItemMeta',
    role: 'nested item index/depth/start/task metadata',
    guide: 'https://bun.com/docs/runtime/markdown#list-item-meta',
    reference: 'https://bun.com/reference/bun/markdown/ListItemMeta',
    released: 'v1.3.8 · 2026-01-29',
    releaseRef: 'https://bun.com/blog/bun-v1.3.8',
    latestUpdate: 'none-recorded',
    updateRef: 'none-recorded',
  },
  {
    surface: 'Bun.markdown.AnsiTheme',
    role: 'terminal configuration',
    guide: 'https://bun.com/docs/runtime/markdown#ansi-terminal-output',
    reference: 'https://bun.com/reference/bun/markdown/AnsiTheme',
    released: 'v1.3.12 · 2026-04-09',
    releaseRef: 'https://bun.com/blog/bun-v1.3.12',
    latestUpdate: 'none-recorded',
    updateRef: 'none-recorded',
  },
  {
    surface: 'Bun.Glob.match',
    role: 'CodeBlock class matching',
    guide: 'https://bun.com/docs/runtime/glob#quickstart',
    reference: 'https://bun.com/reference/bun/Glob/match',
    released: 'release-unknown',
    releaseRef: 'release-unknown',
    latestUpdate: 'fixed v1.3.14 · 2026-05-13',
    updateRef: 'https://bun.com/blog/bun-v1.3.14',
  },
  {
    surface: 'Bun.file',
    role: 'lazy saved-HTML input',
    guide: 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
    reference: 'https://bun.com/reference/bun/file',
    released: 'release-unknown',
    releaseRef: 'release-unknown',
    latestUpdate: 'fixed v1.3.14 · 2026-05-13',
    updateRef: 'https://bun.com/blog/bun-v1.3.14',
  },
  {
    surface: 'Bun.write',
    role: 'artifact output',
    guide: 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
    reference: 'https://bun.com/reference/bun/write',
    released: 'release-unknown',
    releaseRef: 'release-unknown',
    latestUpdate: 'fixed v1.3.12 · 2026-04-09',
    updateRef: 'https://bun.com/blog/bun-v1.3.12',
  },
  {
    surface: 'Bun.inspect.table',
    role: 'property-scoped status tables',
    guide: 'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
    reference: 'https://bun.com/reference/bun/inspect/table',
    released: 'release-unknown',
    releaseRef: 'release-unknown',
    latestUpdate: 'changed v1.2.0 · 2025-01-22',
    updateRef: 'https://bun.com/blog/bun-v1.2',
  },
  {
    surface: 'Bun.stringWidth',
    role: 'terminal-safe preview width',
    guide: 'https://bun.com/docs/runtime/utils#bun-stringwidth',
    reference: 'https://bun.com/reference/bun/stringWidth',
    released: 'release-unknown',
    releaseRef: 'release-unknown',
    latestUpdate: 'changed v1.3.12 · 2026-04-09',
    updateRef: 'https://bun.com/blog/bun-v1.3.12',
  },
  {
    surface: 'Bun.color',
    role: 'related ANSI color-depth selection',
    guide: 'https://bun.com/docs/runtime/color',
    reference: 'https://bun.com/reference/bun/color',
    released: 'v1.1.30 · 2024-10-08',
    releaseRef: 'https://bun.com/blog/bun-v1.1.30',
    latestUpdate: 'changed v1.2.0 · 2025-01-22',
    updateRef: 'https://bun.com/blog/bun-v1.2',
  },
] as const satisfies readonly BunMarkdownCrossReference[];

/** Canonical task-oriented Bun guide landing; `/docs/guides.md` is obsolete. */
export const BUN_GUIDES_INDEX = 'https://bun.com/guides' as const;

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

export type MarkdownListLineageSegment = {
  kind: 'ordered' | 'unordered';
  index: number;
  number: number | null;
  depth: number;
  start?: number;
  checked?: boolean;
};

export type MarkdownNestedListItem = {
  /** Hierarchical decimal path for ordered items, for example `1.2.2`. */
  path: string | null;
  /** Root-qualified identity that remains unambiguous across mixed list kinds. */
  key: string;
  rootIndex: number;
  /** Self-contained ancestry for flat consumers. */
  lineage: readonly MarkdownListLineageSegment[];
  /** Display marker: hierarchical path, task state, or `-`. */
  marker: string;
  text: string;
  /** Exact metadata supplied by Bun's containing list callback. */
  listMeta: Readonly<Bun.markdown.ListMeta>;
  /** Exact metadata supplied by Bun's listItem callback. */
  meta: Readonly<Bun.markdown.ListItemMeta>;
  children: readonly MarkdownNestedListItem[];
};

export type MarkdownNestedListProjection = {
  text: string;
  items: readonly MarkdownNestedListItem[];
  flat: readonly MarkdownNestedListItem[];
};

export const MARKDOWN_NESTED_LIST_TABLE_PROPERTIES = [
  'path',
  'key',
  'marker',
  'text',
  'depth',
  'index',
  'ordered',
  'start',
  'checked',
] as const;

export type MarkdownNestedListRow = {
  path: string | null;
  key: string;
  marker: string;
  text: string;
  depth: number;
  index: number;
  ordered: boolean;
  start: number | null;
  checked: boolean | null;
};

type CapturedList = {
  meta: Readonly<Bun.markdown.ListMeta>;
  itemIds: number[];
};

type CapturedListItem = {
  meta: Readonly<Bun.markdown.ListItemMeta>;
  text: string;
  listIds: number[];
};

const LIST_TOKEN_PREFIX = '@@FW_MARKDOWN_LIST_';
const LIST_TOKEN = /@@FW_MARKDOWN_LIST_(\d+)@@/g;
const ITEM_TOKEN = /@@FW_MARKDOWN_ITEM_(\d+)@@/g;

function tokenIds(text: string, pattern: RegExp): number[] {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].map(match => Number(match[1]));
}

/**
 * Project nested Markdown lists into hierarchical paths and exact Bun metadata.
 *
 * Bun invokes nested callbacks inside-out. Internal tokens retain that tree
 * boundary until the root callback completes, then this function emits a
 * stable parent-first tree, flat rows, and outline text.
 */
export function markdownNestedList(
  markdown: string,
  options: Bun.markdown.Options = MARKDOWN_OPTIONS_DEFAULTS
): MarkdownNestedListProjection {
  if (markdown.includes(LIST_TOKEN_PREFIX) || markdown.includes('@@FW_MARKDOWN_ITEM_')) {
    throw new Error('Markdown input contains a reserved nested-list projection token');
  }

  const lists: CapturedList[] = [];
  const items: CapturedListItem[] = [];
  const rendered = Bun.markdown.render(
    markdown,
    {
      list(children, meta) {
        const id = lists.length;
        lists.push({ meta: { ...meta }, itemIds: tokenIds(children, ITEM_TOKEN) });
        return `${LIST_TOKEN_PREFIX}${id}@@`;
      },
      listItem(children, meta) {
        const id = items.length;
        items.push({
          meta: { ...meta },
          text: children.replaceAll(LIST_TOKEN, '').trim(),
          listIds: tokenIds(children, LIST_TOKEN),
        });
        return `@@FW_MARKDOWN_ITEM_${id}@@`;
      },
    },
    options
  );

  const flat: MarkdownNestedListItem[] = [];
  const lines: string[] = [];

  function projectList(
    listId: number,
    parentLineage: readonly MarkdownListLineageSegment[],
    rootIndex: number
  ): MarkdownNestedListItem[] {
    const list = lists[listId];
    if (!list) throw new Error(`Missing captured Markdown list ${listId}`);

    return list.itemIds.map(itemId => {
      const item = items[itemId];
      if (!item) throw new Error(`Missing captured Markdown list item ${itemId}`);
      const number = (item.meta.start ?? 1) + item.meta.index;
      const segment: MarkdownListLineageSegment = {
        kind: item.meta.ordered ? 'ordered' : 'unordered',
        index: item.meta.index,
        number: item.meta.ordered ? number : null,
        depth: item.meta.depth,
        ...(item.meta.start === undefined ? {} : { start: item.meta.start }),
        ...(item.meta.checked === undefined ? {} : { checked: item.meta.checked }),
      };
      const lineage = [...parentLineage, segment];
      const allOrdered = lineage.every(entry => entry.kind === 'ordered');
      const path = allOrdered ? lineage.map(entry => entry.number).join('.') : null;
      const key = `r${rootIndex + 1}:${lineage
        .map(entry => (entry.kind === 'ordered' ? `o${entry.number}` : `u${entry.index + 1}`))
        .join('.')}`;
      const marker =
        item.meta.checked === undefined
          ? item.meta.ordered
            ? (path ?? String(number))
            : '-'
          : item.meta.checked
            ? '[x]'
            : '[ ]';
      const children: MarkdownNestedListItem[] = [];
      const projected: MarkdownNestedListItem = {
        path,
        key,
        rootIndex,
        lineage,
        marker,
        text: item.text,
        listMeta: list.meta,
        meta: item.meta,
        children,
      };
      flat.push(projected);
      lines.push(`${'  '.repeat(item.meta.depth)}${marker} ${item.text}`.trimEnd());
      children.push(...item.listIds.flatMap(childId => projectList(childId, lineage, rootIndex)));
      return projected;
    });
  }

  const rootIds = tokenIds(rendered, LIST_TOKEN);
  const projectedItems = rootIds.flatMap((listId, rootIndex) => projectList(listId, [], rootIndex));

  return {
    text: lines.join('\n'),
    items: projectedItems,
    flat,
  };
}

/** Property-scoped flat rows suitable for the shared Bun.inspect.table facade. */
export function markdownNestedListRows(
  source: string | MarkdownNestedListProjection,
  options: Bun.markdown.Options = MARKDOWN_OPTIONS_DEFAULTS
): readonly MarkdownNestedListRow[] {
  const projection = typeof source === 'string' ? markdownNestedList(source, options) : source;
  return projection.flat.map(item => ({
    path: item.path,
    key: item.key,
    marker: item.marker,
    text: item.text,
    depth: item.meta.depth,
    index: item.meta.index,
    ordered: item.meta.ordered,
    start: item.meta.start ?? null,
    checked: item.meta.checked ?? null,
  }));
}
