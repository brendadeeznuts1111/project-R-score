// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
/**
 * Bun.markdown mode chooser + type loci (agent SSOT).
 * Types: packages/bun-types/bun.d.ts → `namespace markdown` (unstable API).
 *
 * @see https://bun.com/docs/runtime/markdown#bun-markdown-html
 * @see https://bun.com/reference/bun/markdown
 * @see https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun.d.ts
 */
import { bunDocs, bunReference } from '../lib/docs/bun-site-url.ts';
import { formatCliTable, toolTableVersion } from './cli-table.ts';

/** Shared input for html | ansi | render | react. */
export const MARKDOWN_INPUT = 'string | ArrayBufferLike | TypedArray | DataView' as const;

export type MarkdownModeId = 'html' | 'ansi' | 'render' | 'react';

export type MarkdownMode = {
  id: MarkdownModeId;
  /** Bun.markdown.<id> */
  api: `Bun.markdown.${MarkdownModeId}`;
  goal: string;
  /** Primary options / callbacks type name in bun.d.ts */
  keyTypes: string;
  docs: string;
  /** Default harness preference */
  harness: 'cli' | 'custom-string' | 'web' | 'react';
};

/** Mode chooser — pick one call shape. */
export const MARKDOWN_MODES: readonly MarkdownMode[] = [
  {
    id: 'html',
    api: 'Bun.markdown.html',
    goal: 'Default HTML (GFM)',
    keyTypes: 'Options',
    docs: bunDocs('runtime/markdown', 'bun-markdown-html'),
    harness: 'web',
  },
  {
    id: 'ansi',
    api: 'Bun.markdown.ansi',
    goal: 'Terminal / CLI',
    keyTypes: 'AnsiTheme',
    docs: bunDocs('runtime/markdown', 'ansi-terminal-output'),
    harness: 'cli',
  },
  {
    id: 'render',
    api: 'Bun.markdown.render',
    goal: 'Custom string map',
    keyTypes: 'RenderCallbacks + metas',
    docs: bunDocs('runtime/markdown', 'bun-markdown-render'),
    harness: 'custom-string',
  },
  {
    id: 'react',
    api: 'Bun.markdown.react',
    goal: 'React tree',
    keyTypes: 'ComponentOverrides + props',
    docs: bunDocs('runtime/markdown', 'bun-markdown-react'),
    harness: 'react',
  },
] as const;

/** Type / docs loci for the namespace. */
export const MARKDOWN_LOCI = {
  /** Generated API reference (mirrors bun.d.ts) */
  reference: bunReference('bun/markdown'),
  /** Runtime guide */
  docs: bunDocs('runtime/markdown'),
  /** Upstream types in oven-sh/bun */
  bunTypes: 'https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun.d.ts',
  /** Parser Options (html / render / react) */
  options: bunDocs('runtime/markdown', 'options'),
  /** AnsiTheme */
  ansiTheme: bunDocs('runtime/markdown', 'ansi-terminal-output'),
  /** RenderCallbacks */
  render: bunDocs('runtime/markdown', 'bun-markdown-render'),
  /** ComponentOverrides */
  reactOverrides: bunDocs('runtime/markdown', 'component-overrides'),
} as const;

/**
 * Docs mark Bun.markdown unstable — pin Bun + @types/bun together;
 * re-check Options / AnsiTheme on upgrades.
 */
export const MARKDOWN_STABILITY = 'unstable' as const;

export const MARKDOWN_HARNESS_NOTE = [
  'Prefer markdown.ansi for CLI help/docs.',
  'Prefer markdown.render when you need custom element → string mapping.',
  'Prefer markdown.html / markdown.react for web.',
  'After ansi: measure/truncate with Bun.stringWidth / Bun.sliceAnsi / Bun.stripANSI.',
].join(' ');

/** Compact table for CLI / status tips. */
export function formatMarkdownModeChooser(): string {
  const bun = toolTableVersion();
  const body = formatCliTable(
    MARKDOWN_MODES.map(m => ({
      goal: m.goal,
      call: m.api,
      attrs: m.keyTypes,
      harness: m.harness,
    })),
    [
      { key: 'goal', header: 'GOAL', maxWidth: 20 },
      { key: 'call', header: 'CALL', maxWidth: 22 },
      { key: 'attrs', header: 'ATTRS', maxWidth: 28 },
      { key: 'harness', header: 'HARNESS', maxWidth: 14 },
    ],
    {
      indent: '  ',
      bun,
      cols: ['goal', 'call', 'attrs', 'harness'],
    }
  );
  return (
    [
      'Bun.markdown modes (unstable — types in bun.d.ts namespace markdown)',
      '',
      body.trimEnd(),
      '',
      formatCliTable(
        [
          { key: 'types', attrs: 'reference', value: MARKDOWN_LOCI.reference },
          { key: 'guide', attrs: 'docs', value: MARKDOWN_LOCI.docs },
          { key: 'stability', attrs: MARKDOWN_STABILITY, value: MARKDOWN_HARNESS_NOTE },
        ],
        [
          { key: 'key', header: 'KEY', maxWidth: 10 },
          { key: 'attrs', header: 'ATTRS', maxWidth: 14 },
          { key: 'value', header: 'VALUE', maxWidth: 56 },
        ],
        {
          indent: '  ',
          bun: false, // BUN already on modes table
          cols: ['key', 'attrs', 'value'],
        }
      ).trimEnd(),
      '',
    ].join('\n') + '\n'
  );
}

if (import.meta.main) {
  console.info(formatMarkdownModeChooser().trimEnd());
}
