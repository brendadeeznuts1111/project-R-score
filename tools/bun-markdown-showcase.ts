// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#bun-markdown-react — Bun.markdown.react
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/markdown#options — parser Options
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/blog/bun-v1.3.11 — listItem meta + sliceAnsi ship notes
// @see https://bun.com/blog/bun-v1.3.12#render-markdown-in-the-terminal-with-bun-file-md — bun ./file.md + AnsiTheme
/**
 * Bun.markdown docs examples showcase — 1:1 with https://bun.com/docs/runtime/markdown
 *
 *   bun run showcase:markdown
 *   bun run showcase:markdown -- --cli-only
 *   bun run showcase:markdown -- --html-only
 *   bun run showcase:markdown -- --open
 *   bun run showcase:markdown -- --list
 *   bun run showcase:markdown -- --id=ansi-light --cli-only
 *
 * Zero-VM file preview (not this script): `bun ./path/to/file.md`
 */
import { sliceAnsi } from 'bun';
import {
  MARKDOWN_PRESET_DESIGN,
  MARKDOWN_PRESET_PORTAL,
  MARKDOWN_PRESET_README,
  MARKDOWN_PRESET_SECURE,
  markdownHtml,
} from '../lib/markdown/options.ts';

const DOCS_BASE = 'https://bun.com/docs/runtime/markdown';
const BLOG_LISTITEM_META =
  'https://bun.com/blog/bun-v1.3.11#bunmarkdownrender-now-passes-richer-metadata-to-listitem-and-list-callbacks';
export const SHOWCASE_HTML_PATH = 'artifacts/bun-markdown-showcase.html';

/** listItem meta shape (Bun ≥ 1.3.11) — always passed; optional fields stay undefined. */
export const LIST_ITEM_META_CATALOG = [
  {
    property: 'index',
    type: 'number',
    description: '0-based position within the parent list',
  },
  {
    property: 'depth',
    type: 'number',
    description: 'Nesting level of the parent list (0 = top-level)',
  },
  {
    property: 'ordered',
    type: 'boolean',
    description: 'Whether the parent list is ordered',
  },
  {
    property: 'start',
    type: 'number | undefined',
    description: 'Start number of the parent list (only when ordered)',
  },
  {
    property: 'checked',
    type: 'boolean | undefined',
    description: 'Task list state (only for - [x] / - [ ] items)',
  },
] as const;

/** list callback meta (Bun ≥ 1.3.11 adds depth). */
export const LIST_META_CATALOG = [
  {
    property: 'ordered',
    type: 'boolean',
    description: 'Whether this list is ordered',
  },
  {
    property: 'depth',
    type: 'number',
    description: 'Nesting level (0 = top-level)',
  },
  {
    property: 'start',
    type: 'number | undefined',
    description: 'Start number when ordered',
  },
] as const;

export const LIST_ITEM_META_BREAKING =
  'Breaking (1.3.11): listItem always receives meta (previously only for task items). ' +
  'start/checked are undefined when N/A — fixed shape for monomorphic IC (~0.7ns).';

const BLOG_ANSI_FILE_MD =
  'https://bun.com/blog/bun-v1.3.12#render-markdown-in-the-terminal-with-bun-file-md';

/** AnsiTheme knobs for Bun.markdown.ansi / `bun ./file.md`. */
export const ANSI_THEME_CATALOG = [
  {
    property: 'colors',
    type: 'boolean',
    default: 'true',
    description: 'Plain vs ANSI escape codes',
  },
  {
    property: 'hyperlinks',
    type: 'boolean',
    default: 'false',
    description: 'Clickable OSC 8 links',
  },
  {
    property: 'columns',
    type: 'number',
    default: '80',
    description: 'Wrap width',
  },
  {
    property: 'kittyGraphics',
    type: 'boolean',
    default: 'false',
    description: 'Inline images (Kitty / WezTerm / Ghostty)',
  },
  {
    property: 'light',
    type: 'boolean',
    default: 'unset',
    description: 'Light terminal palette',
  },
] as const;

export type ExampleKind = 'html' | 'render' | 'react' | 'ansi' | 'preset';

export type ExampleResult = {
  kind: ExampleKind;
  /** Terminal-friendly text (ANSI, plaintext, inspect). */
  text: string;
  /** Trusted HTML fragment for the browser pane (when applicable). */
  html?: string;
};

export type MarkdownExample = {
  id: string; // brand-ok — showcase catalog key (not a domain Id)
  title: string;
  api: string;
  docsAnchor: string;
  md: string;
  callNote: string;
  run: () => ExampleResult | Promise<ExampleResult>;
};

function docsUrl(anchor: string): string {
  return `${DOCS_BASE}#${anchor}`;
}

/** Minimal roman numerals for the nested-list docs example. */
function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let x = n;
  let out = '';
  for (const [v, s] of map) {
    while (x >= v) {
      out += s;
      x -= v;
    }
  }
  return out;
}

type ReactLikeProps = {
  children?: ReactLikeNode;
  [key: string]: ReactLikeNode | string | number | boolean | undefined;
};

type ReactLike = {
  type?: string | ((props: ReactLikeProps) => ReactLikeNode);
  props?: ReactLikeProps;
};

type ReactLikeNode = string | number | boolean | null | undefined | ReactLike | ReactLikeNode[];

function isReactLike(v: object): v is ReactLike {
  return 'type' in v && 'props' in v;
}

/** Walk Bun.markdown.react trees without requiring react-dom at the root. */
export function serializeReactLike(node: ReactLikeNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(serializeReactLike).join('');
  if (typeof node !== 'object' || !isReactLike(node)) return '';

  const { type, props = {} } = node;
  const { children, ...rest } = props;
  if (typeof type === 'function') {
    // Component override — invoke with props (docs showcase overrides are sync).
    try {
      return serializeReactLike(type(props));
    } catch {
      return serializeReactLike(children);
    }
  }
  if (typeof type !== 'string') return serializeReactLike(children);

  if (type === 'Fragment' || type === '') return serializeReactLike(children);

  const attrs = Object.entries(rest)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => {
      if (v === true) return ` ${k}`;
      return ` ${k}="${Bun.escapeHTML(String(v))}"`;
    })
    .join('');

  const voidTags = new Set(['img', 'br', 'hr', 'input']);
  if (voidTags.has(type)) return `<${type}${attrs}>`;
  return `<${type}${attrs}>${serializeReactLike(children)}</${type}>`;
}

async function tryRenderToString(el: ReactLikeNode): Promise<string | null> {
  try {
    const mod = await import('react-dom/server');
    const renderToString = (mod as { renderToString?: (n: ReactLikeNode) => string })
      .renderToString;
    if (typeof renderToString !== 'function') return null;
    return renderToString(el);
  } catch {
    return null;
  }
}

function htmlResult(html: string): ExampleResult {
  return { kind: 'html', text: html.trimEnd(), html };
}

function textResult(kind: ExampleKind, text: string, html?: string): ExampleResult {
  return { kind, text: text.trimEnd(), html };
}

const PRESET_SAMPLE = `# Sample

See https://bun.com and [[wiki-target]] and $E=mc^2$.

| Col | Val |
|-----|-----|
| A | ~~old~~ **new** |

- [x] done
- [ ] todo

<script>alert(1)</script>
`;

export const MARKDOWN_DOC_EXAMPLES: readonly MarkdownExample[] = [
  // ── Bun.markdown.html ─────────────────────────────────────────────
  {
    id: 'html-basic',
    title: 'Basic HTML',
    api: 'Bun.markdown.html',
    docsAnchor: 'bun-markdown-html',
    md: '# Hello **world**',
    callNote: 'Bun.markdown.html(md)',
    run: () => htmlResult(Bun.markdown.html('# Hello **world**')),
  },
  {
    id: 'html-gfm',
    title: 'GFM tables / strikethrough / task lists',
    api: 'Bun.markdown.html',
    docsAnchor: 'bun-markdown-html',
    md: `
| Feature      | Status |
|-------------|--------|
| Tables       | ~~done~~ |
| Strikethrough| ~~done~~ |
| Task lists   | done |

- [x] done
- [ ] todo
`,
    callNote: 'Bun.markdown.html(md) — GFM triad on by default',
    run: () => {
      const md = `
| Feature      | Status |
|-------------|--------|
| Tables       | ~~done~~ |
| Strikethrough| ~~done~~ |
| Task lists   | done |

- [x] done
- [ ] todo
`;
      return htmlResult(Bun.markdown.html(md));
    },
  },
  {
    id: 'html-options',
    title: 'Parser options object',
    api: 'Bun.markdown.html',
    docsAnchor: 'options',
    md: 'some markdown with https://example.com',
    callNote: 'Bun.markdown.html(md, { tables, strikethrough, tasklists, tagFilter, autolinks })',
    run: () =>
      htmlResult(
        Bun.markdown.html('some markdown with https://example.com\n\n<script>x</script>', {
          tables: true,
          strikethrough: true,
          tasklists: true,
          tagFilter: true,
          autolinks: true,
        })
      ),
  },
  {
    id: 'html-autolinks-all',
    title: 'Autolinks (all)',
    api: 'Bun.markdown.html',
    docsAnchor: 'autolinks',
    md: 'Visit www.example.com',
    callNote: 'Bun.markdown.html(md, { autolinks: true })',
    run: () => htmlResult(Bun.markdown.html('Visit www.example.com', { autolinks: true })),
  },
  {
    id: 'html-autolinks-granular',
    title: 'Autolinks (url + www)',
    api: 'Bun.markdown.html',
    docsAnchor: 'autolinks',
    md: 'Visit www.example.com',
    callNote: 'Bun.markdown.html(md, { autolinks: { url: true, www: true } })',
    run: () =>
      htmlResult(
        Bun.markdown.html('Visit www.example.com', {
          autolinks: { url: true, www: true },
        })
      ),
  },
  {
    id: 'html-headings-true',
    title: 'Heading IDs + autolink wrap',
    api: 'Bun.markdown.html',
    docsAnchor: 'heading-ids',
    md: '## Hello World',
    callNote: 'Bun.markdown.html(md, { headings: true })',
    run: () => htmlResult(Bun.markdown.html('## Hello World', { headings: true })),
  },
  {
    id: 'html-headings-ids',
    title: 'Heading IDs only',
    api: 'Bun.markdown.html',
    docsAnchor: 'heading-ids',
    md: '## Hello World',
    callNote: 'Bun.markdown.html(md, { headings: { ids: true } })',
    run: () => htmlResult(Bun.markdown.html('## Hello World', { headings: { ids: true } })),
  },
  {
    id: 'html-wiki-math',
    title: 'wikiLinks + latexMath',
    api: 'Bun.markdown.html',
    docsAnchor: 'options',
    md: 'See [[Target]] and $E=mc^2$',
    callNote: 'Bun.markdown.html(md, { wikiLinks: true, latexMath: true }) — off by default',
    run: () =>
      htmlResult(
        Bun.markdown.html('See [[Target]] and $E=mc^2$', {
          wikiLinks: true,
          latexMath: true,
        })
      ),
  },
  {
    id: 'html-parser-flags',
    title: 'permissiveAtx + noHtmlSpans + noIndentedCodeBlocks',
    api: 'Bun.markdown.html',
    docsAnchor: 'options',
    md: '#NoSpace\n\na <b>raw</b>\n\n    indented-code\n\npara',
    callNote: 'Bun.markdown.html(md, { permissiveAtxHeaders, noHtmlSpans, noIndentedCodeBlocks })',
    run: () => {
      const md = '#NoSpace\n\na <b>raw</b>\n\n    indented-code\n\npara';
      const withFlags = Bun.markdown.html(md, {
        permissiveAtxHeaders: true,
        noHtmlSpans: true,
        noIndentedCodeBlocks: true,
      });
      const baseline = Bun.markdown.html(md);
      return textResult(
        'html',
        [`--- flags on ---\n${withFlags}`, `--- defaults ---\n${baseline}`].join('\n'),
        withFlags
      );
    },
  },

  // ── Bun.markdown.render ───────────────────────────────────────────
  {
    id: 'render-custom',
    title: 'Custom heading / strong / paragraph',
    api: 'Bun.markdown.render',
    docsAnchor: 'bun-markdown-render',
    md: '# Hello **world**',
    callNote: 'Bun.markdown.render(md, { heading, strong, paragraph })',
    run: () => {
      const result = Bun.markdown.render('# Hello **world**', {
        heading: (children, { level }) => `<h${level} class="title">${children}</h${level}>`,
        strong: children => `<b>${children}</b>`,
        paragraph: children => `<p>${children}</p>`,
      });
      return textResult('render', result, result);
    },
  },
  {
    id: 'render-classes',
    title: 'Custom HTML with classes',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '# Title\n\nHello **world**',
    callNote: 'heading / paragraph / strong with CSS classes',
    run: () => {
      const result = Bun.markdown.render('# Title\n\nHello **world**', {
        heading: (children, { level }) =>
          `<h${level} class="heading heading-${level}">${children}</h${level}>`,
        paragraph: children => `<p class="body">${children}</p>`,
        strong: children => `<strong class="bold">${children}</strong>`,
      });
      return textResult('render', result, result);
    },
  },
  {
    id: 'render-plaintext',
    title: 'Strip formatting → plaintext',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '# Hello **world**',
    callNote: 'callbacks return children only',
    run: () => {
      const plaintext = Bun.markdown.render('# Hello **world**', {
        heading: children => children,
        paragraph: children => children,
        strong: children => children,
        emphasis: children => children,
        link: children => children,
        image: () => '',
        code: children => children,
        codespan: children => children,
      });
      return textResult('render', plaintext);
    },
  },
  {
    id: 'render-omit-images',
    title: 'Omit images (null callback)',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '# Title\n\n![logo](img.png)\n\nHello',
    callNote: 'image: () => null',
    run: () => {
      const result = Bun.markdown.render('# Title\n\n![logo](img.png)\n\nHello', {
        image: () => null,
        heading: children => children,
        paragraph: children => children + '\n',
      });
      return textResult('render', result);
    },
  },
  {
    id: 'render-ansi-callbacks',
    title: 'ANSI via render callbacks',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '# Hello\n\nThis is **bold** and *italic*',
    callNote: 'custom ANSI escape sequences in callbacks',
    run: () => {
      const ansi = Bun.markdown.render('# Hello\n\nThis is **bold** and *italic*', {
        heading: (children, { level: _level }) => `\x1b[1;4m${children}\x1b[0m\n`,
        paragraph: children => children + '\n',
        strong: children => `\x1b[1m${children}\x1b[22m`,
        emphasis: children => `\x1b[3m${children}\x1b[23m`,
      });
      return textResult('ansi', ansi);
    },
  },
  {
    id: 'render-nested-lists',
    title: 'Nested list numbering (blog 1.3.11)',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '1. first\n   1. sub-a\n   2. sub-b\n2. second',
    callNote: 'listItem meta: index, depth, ordered, start — no regex post-process',
    run: () => {
      // Exact Bun v1.3.11 blog example (depth>0 → a. b. c.)
      const result = Bun.markdown.render('1. first\n   1. sub-a\n   2. sub-b\n2. second', {
        listItem: (children, { index, depth, ordered, start }) => {
          const n = (start ?? 1) + index;
          const marker = !ordered ? '-' : depth === 0 ? `${n}.` : `${String.fromCharCode(96 + n)}.`;
          return '  '.repeat(depth) + marker + ' ' + children.trimEnd() + '\n';
        },
        list: children => '\n' + children,
      });
      return textResult('render', result);
    },
  },
  {
    id: 'render-nested-lists-roman',
    title: 'Nested lists with roman depth≥2',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: '1. first\n   1. sub-a\n      1. deep-i\n      2. deep-ii\n   2. sub-b\n2. second',
    callNote: 'depth 0 → 1. ; depth 1 → a. ; depth ≥2 → i. (docs extended)',
    run: () => {
      const md = '1. first\n   1. sub-a\n      1. deep-i\n      2. deep-ii\n   2. sub-b\n2. second';
      const result = Bun.markdown.render(md, {
        listItem: (children, { index, depth, ordered, start }) => {
          const n = (start ?? 1) + index;
          const marker = !ordered
            ? '-'
            : depth === 0
              ? `${n}.`
              : depth === 1
                ? `${String.fromCharCode(96 + n)}.`
                : `${toRoman(n)}.`;
          return '  '.repeat(depth) + marker + ' ' + children.trimEnd() + '\n';
        },
        list: (children, { depth }) => `\n<!-- list depth=${depth} -->\n` + children,
      });
      return textResult('render', result);
    },
  },
  {
    id: 'render-listitem-meta',
    title: 'listItem meta shape (always passed)',
    api: 'Bun.markdown.render',
    docsAnchor: 'list-item-meta',
    md: '1. alpha\n   1. nested\n2. beta\n\n- [x] done\n- [ ] todo',
    callNote: LIST_ITEM_META_BREAKING,
    run: () => {
      const md = '1. alpha\n   1. nested\n2. beta\n\n- [x] done\n- [ ] todo';
      const rows: string[] = [];
      Bun.markdown.render(md, {
        listItem: (children, meta) => {
          rows.push(`${JSON.stringify(meta)} → ${JSON.stringify(children.trim())}`);
          return children;
        },
        list: (children, meta) => {
          rows.push(`list ${JSON.stringify(meta)}`);
          return children;
        },
      });
      const table = [
        '| Property | Type | Description |',
        '| --- | --- | --- |',
        ...LIST_ITEM_META_CATALOG.map(
          r => `| \`${r.property}\` | \`${r.type}\` | ${r.description} |`
        ),
        '',
        LIST_ITEM_META_BREAKING,
        '',
        `[blog](${BLOG_LISTITEM_META})`,
        '',
        '### Live probes',
        ...rows.map(r => `- \`${r}\``),
      ].join('\n');
      const html = Bun.markdown.html(table, { tables: true, autolinks: true });
      return textResult('render', rows.join('\n'), html);
    },
  },
  {
    id: 'render-code-lang',
    title: 'Code block language meta',
    api: 'Bun.markdown.render',
    docsAnchor: 'examples',
    md: "```js\nconsole.log('hi')\n```",
    callNote: 'code: (children, meta) => … meta.language',
    run: () => {
      const result = Bun.markdown.render("```js\nconsole.log('hi')\n```", {
        code: (children, meta) => {
          const lang = meta?.language ?? '';
          return `<pre><code class="language-${lang}">${children}</code></pre>`;
        },
      });
      return textResult('render', result, result);
    },
  },
  {
    id: 'render-parser-options',
    title: 'Parser options (3rd arg)',
    api: 'Bun.markdown.render',
    docsAnchor: 'parser-options',
    md: 'Visit www.example.com',
    callNote: 'Bun.markdown.render(md, callbacks, { autolinks: true })',
    run: () => {
      const result = Bun.markdown.render(
        'Visit www.example.com',
        {
          link: (children, { href }) => `[${children}](${href})`,
          paragraph: children => children,
        },
        { autolinks: true }
      );
      return textResult('render', result);
    },
  },

  // ── Bun.markdown.react ────────────────────────────────────────────
  {
    id: 'react-inspect',
    title: 'React element tree',
    api: 'Bun.markdown.react',
    docsAnchor: 'bun-markdown-react',
    md: '# Hello **world**',
    callNote: 'Bun.markdown.react(md) → inspect tree',
    run: () => {
      const el = Bun.markdown.react('# Hello **world**');
      const html = serializeReactLike(el);
      return textResult('react', Bun.inspect(el, { colors: false, depth: 6 }), html);
    },
  },
  {
    id: 'react-to-string',
    title: 'React → HTML string',
    api: 'Bun.markdown.react',
    docsAnchor: 'server-side-rendering',
    md: '# Hello **world**',
    callNote: 'renderToString when react-dom present; else serializeReactLike',
    run: () => {
      const el = Bun.markdown.react('# Hello **world**');
      // Sync path for catalog tests; async open uses tryRenderToString in main.
      const html = serializeReactLike(el);
      return textResult('react', html, html);
    },
  },
  {
    id: 'react-overrides',
    title: 'Component overrides',
    api: 'Bun.markdown.react',
    docsAnchor: 'component-overrides',
    md: '## Hello World\n\n[Bun](https://bun.com)\n\n```js\nconsole.log(1)\n```',
    callNote: 'overrides keyed by tag: pre, a, h2 + headings.ids',
    run: () => {
      function Code({ language, children }: { language?: string; children?: unknown }) {
        return {
          type: 'pre',
          props: {
            'data-language': language ?? '',
            children: { type: 'code', props: { children } },
          },
        };
      }
      function Link({
        href,
        title,
        children,
      }: {
        href: string;
        title?: string;
        children?: unknown;
      }) {
        return {
          type: 'a',
          props: {
            href,
            title,
            target: '_blank',
            rel: 'noopener noreferrer',
            children,
          },
        };
      }
      function Heading({
        id,
        children,
      }: {
        id?: string; // brand-ok — markdown heading slug from Bun.markdown.react
        children?: ReactLikeNode;
      }) {
        return {
          type: 'h2',
          props: {
            id,
            children: { type: 'a', props: { href: `#${id ?? ''}`, children } },
          },
        };
      }
      const content = '## Hello World\n\n[Bun](https://bun.com)\n\n```js\nconsole.log(1)\n```';
      const el = Bun.markdown.react(
        content,
        {
          pre: Code as never,
          a: Link as never,
          h2: Heading as never,
        },
        { headings: { ids: true } }
      );
      const html = serializeReactLike(el);
      return textResult('react', html, html);
    },
  },
  {
    id: 'react-version-18',
    title: 'reactVersion: 18',
    api: 'Bun.markdown.react',
    docsAnchor: 'react-18-and-older',
    md: '# Hello',
    callNote: 'Bun.markdown.react(md, undefined, { reactVersion: 18 })',
    run: () => {
      const el = Bun.markdown.react('# Hello', undefined, { reactVersion: 18 });
      const html = serializeReactLike(el);
      const typeofSym =
        typeof el === 'object' && el !== null && '$$typeof' in el
          ? String((el as { $$typeof: symbol }).$$typeof)
          : '?';
      return textResult('react', `$$typeof=${typeofSym}\n${html}`, html);
    },
  },
  {
    id: 'react-parser-options',
    title: 'React + parser options',
    api: 'Bun.markdown.react',
    docsAnchor: 'parser-options-1',
    md: '## Hello World\n\nVisit www.example.com',
    callNote: 'Bun.markdown.react(md, undefined, { headings: { ids: true }, autolinks: true })',
    run: () => {
      const el = Bun.markdown.react('## Hello World\n\nVisit www.example.com', undefined, {
        headings: { ids: true },
        autolinks: true,
      });
      const html = serializeReactLike(el);
      return textResult('react', html, html);
    },
  },

  // ── Bun.markdown.ansi (+ bun ./file.md) ───────────────────────────
  {
    id: 'ansi-default',
    title: 'ANSI default (blog sample)',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: '# Hello\n\n**bold** and *italic*\n',
    callNote: 'Bun.markdown.ansi(md) — same renderer as `bun ./file.md` (zero VM for files)',
    run: () => textResult('ansi', Bun.markdown.ansi('# Hello\n\n**bold** and *italic*\n')),
  },
  {
    id: 'ansi-plain',
    title: 'Plain text (colors: false)',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: '# Hello',
    callNote: 'Bun.markdown.ansi(md, { colors: false }) — no escape codes',
    run: () => {
      const plain = Bun.markdown.ansi('# Hello', { colors: false });
      return textResult('ansi', [`hasEsc=${/\x1b\[/.test(plain)}`, '', plain].join('\n'));
    },
  },
  {
    id: 'ansi-light',
    title: 'Light terminal palette',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: '# Hello\n\n**bold** and [docs](https://bun.sh)',
    callNote: 'Bun.markdown.ansi(md, { light: true, hyperlinks: true })',
    run: () =>
      textResult(
        'ansi',
        Bun.markdown.ansi('# Hello\n\n**bold** and [docs](https://bun.sh)', {
          light: true,
          hyperlinks: true,
        })
      ),
  },
  {
    id: 'ansi-hyperlinks',
    title: 'Clickable hyperlinks (OSC 8)',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: '[docs](https://bun.sh)',
    callNote: 'Bun.markdown.ansi(md, { hyperlinks: true })',
    run: () =>
      textResult('ansi', Bun.markdown.ansi('[docs](https://bun.sh)', { hyperlinks: true })),
  },
  {
    id: 'ansi-columns',
    title: 'Custom wrap width (columns)',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: 'This is a fairly long paragraph that should wrap when columns is small enough to force line breaks in the ANSI renderer.',
    callNote: 'Bun.markdown.ansi(md, { columns: 40 })',
    run: () => {
      const longText =
        'This is a fairly long paragraph that should wrap when columns is small enough to force line breaks in the ANSI renderer.';
      const wrapped = Bun.markdown.ansi(longText, { columns: 40 });
      const lines = wrapped.split('\n');
      return textResult(
        'ansi',
        [
          `lines=${lines.length}`,
          `maxLineWidth=${Math.max(...lines.map(l => Bun.stringWidth(l)))}`,
          '',
          wrapped,
        ].join('\n')
      );
    },
  },
  {
    id: 'ansi-kitty',
    title: 'Kitty Graphics Protocol images',
    api: 'Bun.markdown.ansi',
    docsAnchor: 'ansi-terminal-output',
    md: '![alt](./package.json)',
    callNote:
      'Bun.markdown.ansi(md, { kittyGraphics: true }) — Kitty / WezTerm / Ghostty; others see fallback',
    run: () => {
      const withImg = Bun.markdown.ansi('![alt](./package.json)', {
        kittyGraphics: true,
      });
      return textResult(
        'ansi',
        [
          `bytes=${withImg.length}`,
          `hasEsc=${/\x1b/.test(withImg)}`,
          `strip=${JSON.stringify(Bun.stripANSI(withImg).slice(0, 80))}`,
          '',
          withImg,
        ].join('\n')
      );
    },
  },
  {
    id: 'ansi-file-md',
    title: 'bun ./file.md parity (programmatic)',
    api: 'Bun.markdown.ansi + Bun.file',
    docsAnchor: 'ansi-terminal-output',
    md: '(reads AGENTS.md head — equivalent to `bun ./AGENTS.md` body render)',
    callNote: `Zero-VM CLI: bun ./file.md · blog ${BLOG_ANSI_FILE_MD}`,
    run: async () => {
      // Programmatic twin of `bun ./file.md` (CLI path skips JS VM startup).
      const path = 'AGENTS.md';
      const md = (await Bun.file(path).text()).slice(0, 600);
      const out = Bun.markdown.ansi(`${md}\n\n…`, {
        columns: 88,
        hyperlinks: true,
      });
      return textResult(
        'ansi',
        [`file=${path}`, `chars=${md.length}+`, `cli=bun ./${path}`, '', out].join('\n')
      );
    },
  },
  {
    id: 'ansi-slice',
    title: 'ANSI + Bun.sliceAnsi truncate',
    api: 'Bun.markdown.ansi + Bun.sliceAnsi',
    docsAnchor: 'ansi-terminal-output',
    md: '## Title\n\n- **one** item that is quite long for a narrow column',
    callNote:
      'After ansi: Bun.stringWidth + Bun.sliceAnsi(s, 0, cols, "…") — visual columns, codes intact',
    run: () => {
      const ansi = Bun.markdown.ansi(
        '## Title\n\n- **one** item that is quite long for a narrow column',
        { columns: 80, hyperlinks: true }
      );
      const oneLine = ansi.replace(/\n/g, ' · ');
      const cols = 28;
      const truncated = sliceAnsi(oneLine, 0, cols, '…');
      const report = [
        `full width=${Bun.stringWidth(oneLine)}`,
        `slice(0,${cols},"…") width=${Bun.stringWidth(truncated)}`,
        `stripANSI=${JSON.stringify(Bun.stripANSI(truncated))}`,
        '',
        truncated,
      ].join('\n');
      return textResult('ansi', report);
    },
  },

  // ── Harness presets appendix ──────────────────────────────────────
  {
    id: 'preset-portal',
    title: 'Harness preset: PORTAL',
    api: 'markdownHtml + MARKDOWN_PRESET_PORTAL',
    docsAnchor: 'options',
    md: PRESET_SAMPLE,
    callNote: 'lib/markdown/options.ts — MARKDOWN_PRESET_PORTAL',
    run: () => htmlResult(markdownHtml(PRESET_SAMPLE, MARKDOWN_PRESET_PORTAL)),
  },
  {
    id: 'preset-readme',
    title: 'Harness preset: README',
    api: 'markdownHtml + MARKDOWN_PRESET_README',
    docsAnchor: 'options',
    md: PRESET_SAMPLE,
    callNote: 'lib/markdown/options.ts — MARKDOWN_PRESET_README',
    run: () => htmlResult(markdownHtml(PRESET_SAMPLE, MARKDOWN_PRESET_README)),
  },
  {
    id: 'preset-secure',
    title: 'Harness preset: SECURE',
    api: 'markdownHtml + MARKDOWN_PRESET_SECURE',
    docsAnchor: 'options',
    md: PRESET_SAMPLE,
    callNote: 'lib/markdown/options.ts — MARKDOWN_PRESET_SECURE',
    run: () => htmlResult(markdownHtml(PRESET_SAMPLE, MARKDOWN_PRESET_SECURE)),
  },
  {
    id: 'preset-design',
    title: 'Harness preset: DESIGN',
    api: 'markdownHtml + MARKDOWN_PRESET_DESIGN',
    docsAnchor: 'options',
    md: PRESET_SAMPLE,
    callNote: 'lib/markdown/options.ts — MARKDOWN_PRESET_DESIGN',
    run: () => htmlResult(markdownHtml(PRESET_SAMPLE, MARKDOWN_PRESET_DESIGN)),
  },
];

export async function runExample(ex: MarkdownExample): Promise<ExampleResult> {
  return ex.run();
}

export async function runAllExamples(): Promise<
  { example: MarkdownExample; result: ExampleResult }[]
> {
  return Promise.all(
    MARKDOWN_DOC_EXAMPLES.map(async example => ({
      example,
      result: await runExample(example),
    }))
  );
}

function formatMetaCatalogMd(): string {
  const itemRows = LIST_ITEM_META_CATALOG.map(
    r => `| \`${r.property}\` | \`${r.type}\` | ${r.description} |`
  ).join('\n');
  const listRows = LIST_META_CATALOG.map(
    r => `| \`${r.property}\` | \`${r.type}\` | ${r.description} |`
  ).join('\n');
  const ansiRows = ANSI_THEME_CATALOG.map(
    r => `| \`${r.property}\` | \`${r.type}\` | ${r.default} | ${r.description} |`
  ).join('\n');
  return [
    '### listItem meta (always passed ≥1.3.11)',
    '',
    '| Property | Type | Description |',
    '| --- | --- | --- |',
    itemRows,
    '',
    '### list meta',
    '',
    '| Property | Type | Description |',
    '| --- | --- | --- |',
    listRows,
    '',
    LIST_ITEM_META_BREAKING,
    '',
    `[blog](${BLOG_LISTITEM_META})`,
    '',
    '### AnsiTheme (`Bun.markdown.ansi` / `bun ./file.md`)',
    '',
    '| Option | Type | Default | Description |',
    '| --- | --- | --- | --- |',
    ansiRows,
    '',
    'File path form skips the JS VM: `bun ./docs/portal-foundation.md`',
    '',
    `[blog](${BLOG_ANSI_FILE_MD})`,
  ].join('\n');
}

async function runCli(rows: { example: MarkdownExample; result: ExampleResult }[]): Promise<void> {
  const filtered = rows.length < MARKDOWN_DOC_EXAMPLES.length;
  const body = filtered
    ? `# Bun.markdown docs showcase\n\n${rows.length}/${MARKDOWN_DOC_EXAMPLES.length} examples · ${DOCS_BASE}`
    : `# Bun.markdown docs showcase\n\n${rows.length}/${MARKDOWN_DOC_EXAMPLES.length} examples · ${DOCS_BASE}\n\n${formatMetaCatalogMd()}`;
  const banner = Bun.markdown.ansi(body, { columns: 88, hyperlinks: true });
  process.stdout.write(banner + '\n\n');

  for (const { example, result } of rows) {
    const head = Bun.markdown.ansi(
      `## ${example.id} — ${example.title}\n\n\`${example.api}\` · [docs](${docsUrl(example.docsAnchor)})\n\n_${example.callNote}_`,
      { columns: 88, hyperlinks: true }
    );
    process.stdout.write(head + '\n');
    process.stdout.write('--- markdown ---\n');
    process.stdout.write(example.md.trimEnd() + '\n');
    process.stdout.write(`--- ${result.kind} ---\n`);
    process.stdout.write(result.text + '\n\n');
  }
}

export function buildShowcaseHtml(
  rows: { example: MarkdownExample; result: ExampleResult }[]
): string {
  const sections = rows
    .map(({ example, result }) => {
      const outPane =
        result.html != null
          ? `<div class="md-out">${result.html}</div>`
          : `<pre class="text-out">${Bun.escapeHTML(result.text)}</pre>`;
      return `<section class="ex" id="${Bun.escapeHTML(example.id)}">
  <header>
    <h2><code>${Bun.escapeHTML(example.id)}</code> ${Bun.escapeHTML(example.title)}</h2>
    <p class="meta"><code>${Bun.escapeHTML(example.api)}</code> ·
      <a href="${docsUrl(example.docsAnchor)}">docs#${Bun.escapeHTML(example.docsAnchor)}</a></p>
    <p class="call">${Bun.escapeHTML(example.callNote)}</p>
  </header>
  <div class="grid">
    <div>
      <h3>Markdown</h3>
      <pre>${Bun.escapeHTML(example.md.trim())}</pre>
    </div>
    <div>
      <h3>Output (${Bun.escapeHTML(result.kind)})</h3>
      ${outPane}
      ${
        result.html != null
          ? `<details><summary>HTML source</summary><pre>${Bun.escapeHTML(result.html)}</pre></details>`
          : ''
      }
    </div>
  </div>
</section>`;
    })
    .join('\n');

  const toc = rows
    .map(
      ({ example }) =>
        `<li><a href="#${Bun.escapeHTML(example.id)}"><code>${Bun.escapeHTML(example.id)}</code></a> ${Bun.escapeHTML(example.title)}</li>`
    )
    .join('\n');

  const metaRefHtml = Bun.markdown.html(formatMetaCatalogMd(), {
    tables: true,
    autolinks: true,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Bun.markdown docs showcase</title>
  <style>
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --dim: #8b949e; --accent: #58a6ff; --code: #79c0ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: ui-sans-serif, system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5;
    }
    header.page {
      padding: 28px 24px 16px; border-bottom: 1px solid var(--border);
      background: radial-gradient(ellipse 80% 60% at 20% 0%, #1f6feb33, transparent);
    }
    header.page h1 { margin: 0 0 8px; font-size: 1.6rem; }
    header.page p { margin: 0; color: var(--dim); }
    header.page a { color: var(--accent); }
    nav { padding: 16px 24px; border-bottom: 1px solid var(--border); }
    nav ol { margin: 0; padding-left: 1.2rem; columns: 2; gap: 24px; }
    nav li { margin: 2px 0; font-size: 0.9rem; }
    nav a { color: var(--accent); text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    .ex {
      margin: 24px; padding: 20px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 8px;
    }
    .ex h2 { margin: 0 0 6px; font-size: 1.15rem; }
    .ex h2 code { color: var(--code); font-size: 0.95em; }
    .meta, .call { margin: 0 0 4px; color: var(--dim); font-size: 0.9rem; }
    .meta a { color: var(--accent); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } nav ol { columns: 1; } }
    h3 { margin: 0 0 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dim); }
    pre {
      margin: 0; padding: 12px; background: #0d1117; border: 1px solid var(--border);
      border-radius: 6px; overflow: auto; font-size: 0.85rem; white-space: pre-wrap;
    }
    .md-out {
      padding: 12px; background: #0d1117; border: 1px solid var(--border);
      border-radius: 6px; overflow: auto;
    }
    .md-out table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    .md-out th, .md-out td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
    .md-out a { color: var(--accent); }
    .md-out code { font-family: ui-monospace, monospace; font-size: 0.9em; }
    .md-out .task-list-item { list-style: none; }
    .text-out { color: #c9d1d9; }
    details { margin-top: 8px; color: var(--dim); font-size: 0.85rem; }
    details pre { margin-top: 6px; max-height: 220px; }
  </style>
</head>
<body>
  <header class="page">
    <h1>Bun.markdown docs showcase</h1>
    <p>${rows.length} examples · source
      <a href="${DOCS_BASE}">${DOCS_BASE}</a> ·
      <a href="${BLOG_LISTITEM_META}">listItem meta (blog 1.3.11)</a> ·
      generated locally (not a Pages bake)</p>
  </header>
  <section class="ex meta-ref" id="listitem-meta-ref">
    <header><h2>Reference — listItem / list meta · AnsiTheme</h2></header>
    <div class="md-out">${metaRefHtml}</div>
  </section>
  <nav>
    <ol>
      ${toc}
    </ol>
  </nav>
  <main>
    ${sections}
  </main>
</body>
</html>
`;
}

export async function writeShowcaseHtml(
  rows: { example: MarkdownExample; result: ExampleResult }[],
  path = SHOWCASE_HTML_PATH
): Promise<string> {
  // Prefer renderToString for react-to-string when react-dom is available.
  // Bun.write creates parent dirs (artifacts/).
  const enriched = await Promise.all(
    rows.map(async row => {
      if (row.example.id !== 'react-to-string') return row;
      const el = Bun.markdown.react(row.example.md) as ReactLikeNode;
      const ssr = await tryRenderToString(el);
      if (ssr == null) return row;
      return {
        example: row.example,
        result: textResult('react', `renderToString:\n${ssr}`, ssr),
      };
    })
  );
  const html = buildShowcaseHtml(enriched);
  await Bun.write(path, html);
  return path;
}

function openPath(path: string): void {
  const abs = `${process.cwd()}/${path}`;
  const opener =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  Bun.spawn([opener, abs], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' });
}

export function parseShowcaseArgs(argv: string[]): {
  cliOnly: boolean;
  htmlOnly: boolean;
  open: boolean;
  list: boolean;
  ids: string[];
} {
  const ids: string[] = [];
  for (const a of argv) {
    if (a.startsWith('--id=')) ids.push(a.slice('--id='.length));
    else if (a.startsWith('--only=')) ids.push(a.slice('--only='.length));
  }
  // bare --id foo
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--id' || argv[i] === '--only') && argv[i + 1]) {
      ids.push(argv[i + 1]!);
    }
  }
  return {
    cliOnly: argv.includes('--cli-only'),
    htmlOnly: argv.includes('--html-only'),
    open: argv.includes('--open') || argv.includes('-o'),
    list: argv.includes('--list'),
    ids: [...new Set(ids.filter(Boolean))],
  };
}

export function filterExamples(ids: string[]): readonly MarkdownExample[] {
  if (!ids.length) return MARKDOWN_DOC_EXAMPLES;
  const set = new Set(ids);
  const hit = MARKDOWN_DOC_EXAMPLES.filter(e => set.has(e.id));
  if (!hit.length) {
    throw new Error(
      `No examples match --id=${ids.join(',')}. Use --list. Known: ${MARKDOWN_DOC_EXAMPLES.map(e => e.id).join(', ')}`
    );
  }
  return hit;
}

async function main(): Promise<void> {
  const flags = parseShowcaseArgs(process.argv.slice(2));

  if (flags.list) {
    for (const e of MARKDOWN_DOC_EXAMPLES) {
      console.log(`${e.id}\t${e.api}\t${e.title}`);
    }
    return;
  }

  const catalog = filterExamples(flags.ids);
  const rows = await Promise.all(
    catalog.map(async example => ({
      example,
      result: await runExample(example),
    }))
  );

  if (!flags.htmlOnly) await runCli(rows);

  if (!flags.cliOnly) {
    const path = await writeShowcaseHtml(rows);
    console.info(`\nWrote ${path}`);
    if (flags.open) openPath(path);
  }
}

if (import.meta.main) {
  await main();
}
