// @see https://core.telegram.org/bots/api#inputrichmessage — Bot API 10.1 InputRichMessage
// @see https://core.telegram.org/bots/api#inputrichblock — Bot API 10.1 InputRichBlock union
// @see https://core.telegram.org/bots/api#sendrichmessage
// @see https://core.telegram.org/type/RichText — MTProto RichText (client TL; not Bot API wire)
// @see https://core.telegram.org/constructor/textConcat — MTProto textConcat
/**
 * InputRichMessage helpers — extended HTML *and* typed `blocks` RichText trees
 * for `sendRichMessage` / `editMessageText`.
 *
 * ## Bot API vs MTProto RichText
 *
 * Bot API 10.1 added `InputRichMessage.blocks`, a typed `InputRichBlock[]`
 * tree whose inline text fields are a Bot API `RichText` union. That union is
 * a **desk-subset** mirror of the MTProto `RichText` TL union
 * ([RichText constructors](https://core.telegram.org/type/RichText)) — bots now
 * serialize an actual `RichText` shape on the wire (not just extended HTML).
 * The mapping between the two:
 *
 * | MTProto RichText | Bot API `RichText` | Helper |
 * |------------------|---------------------|--------|
 * | `textPlain` | `string` | (plain string literal) |
 * | `textBold` | `{ type: "bold", text: RichText }` | `rtBold` |
 * | `textItalic` | `{ type: "italic", text: RichText }` | `rtItalic` |
 * | `textMarked` | `{ type: "marked", text: RichText }` | `rtMarked` |
 * | `textUrl` | `{ type: "url", text: RichText, url: string }` | `rtUrl` |
 * | `textConcat` | `RichText[]` | `rtConcat` |
 *
 * Factory seat desks and ops templates historically used **Bot API extended
 * HTML** inside `InputRichMessage.html`; those helpers (`richBold`,
 * `richTableHtml`, etc.) still work unchanged. The `blocks` / `RichText`
 * helpers below are additive and let callers build a typed
 * `InputRichBlock[]` tree, or render that tree down to the same extended
 * HTML via `serializeRichBlocksToHtml` / `serializeRichTextToHtml`.
 *
 * | MTProto (block-level) | Bot API `InputRichBlock` | Helper |
 * |------------------------|----------------------------|--------|
 * | heading | `{ type: "heading", text, size }` | `blockHeading` |
 * | paragraph | `{ type: "paragraph", text }` | `blockParagraph` |
 * | divider | `{ type: "divider" }` | `blockDivider` |
 * | table (client) | `{ type: "table", cells, ... }` | `blockTable` · `richTableHtml` |
 * | collapsible | `{ type: "details", summary, blocks }` | `blockDetails` · `richDetails` |
 * | list / checklist | `{ type: "list", items }` | `blockChecklist` · `richChecklist` |
 * | footer | `{ type: "footer", text }` | (build `InputRichBlock` literal) |
 *
 * Inline keyboards stay in `reply_markup` — table cells are display-only.
 */
import { escapeHtml } from './templates/escape.ts';

/** Wire shape for Telegram Bot API InputRichMessage (Bot API 10.1). */
export type InputRichMessage = {
  /** Typed RichText block tree — Bot API 10.1 `InputRichMessage.blocks`. */
  blocks?: InputRichBlock[];
  html?: string;
  markdown?: string;
  skip_entity_detection?: boolean;
  is_rtl?: boolean;
};

// ---------------------------------------------------------------------------
// RichText — Bot API 10.1 desk-subset union (mirrors MTProto RichText TL).
// ---------------------------------------------------------------------------

/** MTProto `textBold` equivalent — Bot API RichText node. */
export type RichTextBold = { type: 'bold'; text: RichText };
/** MTProto `textItalic` equivalent — Bot API RichText node. */
export type RichTextItalic = { type: 'italic'; text: RichText };
/** MTProto `textMarked` equivalent — Bot API RichText node (highlight). */
export type RichTextMarked = { type: 'marked'; text: RichText };
/** MTProto `textUrl` equivalent — Bot API RichText node. */
export type RichTextUrl = { type: 'url'; text: RichText; url: string };

/**
 * Bot API 10.1 `RichText` union — desk subset.
 *
 * `RichText[]` is the Bot API encoding of MTProto `textConcat` (see
 * `rtConcat`); a bare `string` is the `textPlain` equivalent.
 */
export type RichText =
  string | RichText[] | RichTextBold | RichTextItalic | RichTextMarked | RichTextUrl;

// ---------------------------------------------------------------------------
// InputRichBlock — Bot API 10.1 desk-subset union.
// ---------------------------------------------------------------------------

export type InputRichBlockHeading = {
  type: 'heading';
  text: RichText;
  /** Heading level 1-6, mirrors HTML `<h1>`-`<h6>`. */
  size: 1 | 2 | 3 | 4 | 5 | 6;
};

export type InputRichBlockParagraph = {
  type: 'paragraph';
  text: RichText;
};

export type InputRichBlockDivider = {
  type: 'divider';
};

export type RichTableCellBlock = {
  text?: RichText;
  is_header?: true;
  align?: 'left' | 'center' | 'right';
};

export type InputRichBlockTable = {
  type: 'table';
  cells: RichTableCellBlock[][];
  is_bordered?: boolean;
  is_striped?: boolean;
  caption?: string;
};

export type InputRichBlockDetails = {
  type: 'details';
  summary: RichText;
  blocks: InputRichBlock[];
  is_open?: boolean;
};

export type RichListItem = {
  label?: string;
  blocks: InputRichBlock[];
  has_checkbox?: true;
  is_checked?: true;
};

export type InputRichBlockList = {
  type: 'list';
  items: RichListItem[];
};

export type InputRichBlockFooter = {
  type: 'footer';
  text: RichText;
};

/** Bot API 10.1 `InputRichBlock` union — desk subset. */
export type InputRichBlock =
  | InputRichBlockHeading
  | InputRichBlockParagraph
  | InputRichBlockDivider
  | InputRichBlockTable
  | InputRichBlockDetails
  | InputRichBlockList
  | InputRichBlockFooter;

export function buildInputRichMessageHtml(
  html: string,
  opts?: { skipEntityDetection?: boolean; isRtl?: boolean }
): InputRichMessage {
  return {
    html,
    skip_entity_detection: opts?.skipEntityDetection ?? false,
    ...(opts?.isRtl ? { is_rtl: true } : {}),
  };
}

export type RichTableCell = {
  content: string;
  /** Plain cell text — escaped; not MTProto RichText nodes. */
  header?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Wraps the escaped content in `<b>`/`<i>`/marked tags. */
  emphasis?: 'bold' | 'italic' | 'marked';
};

export type RichTableRow = RichTableCell[];

/**
 * Wraps already-escaped HTML in the emphasis tags Telegram rich HTML
 * accepts. `marked` has no dedicated Telegram entity, so it renders as
 * bold+underline (`<u><b>…</b></u>`) — the closest equivalent to a
 * highlight/mark that Bot API extended HTML supports.
 */
function wrapEmphasisHtml(escaped: string, emphasis?: RichTableCell['emphasis']): string {
  switch (emphasis) {
    case 'bold':
      return `<b>${escaped}</b>`;
    case 'italic':
      return `<i>${escaped}</i>`;
    case 'marked':
      return `<u><b>${escaped}</b></u>`;
    default:
      return escaped;
  }
}

/** Native rich table: `<table bordered striped>`. Cells are HTML-escaped. */
export function richTableHtml(
  rows: RichTableRow[],
  opts?: { caption?: string; bordered?: boolean; striped?: boolean }
): string {
  if (!rows.length) return '<p>(empty table)</p>';
  const attrs = [
    opts?.bordered !== false ? 'bordered' : '',
    opts?.striped !== false ? 'striped' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const attrStr = attrs ? ` ${attrs}` : '';
  const body = rows
    .map(row => {
      const cells = row
        .map(cell => {
          const tag = cell.header ? 'th' : 'td';
          const align = cell.align && cell.align !== 'left' ? ` align="${cell.align}"` : '';
          const content = wrapEmphasisHtml(escapeHtml(cell.content), cell.emphasis);
          return `<${tag}${align}>${content}</${tag}>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const caption = opts?.caption?.trim() ? `<caption>${escapeHtml(opts.caption)}</caption>` : '';
  return `<table${attrStr}>${caption}${body}</table>`;
}

/** Inline bold span — MTProto `textBold` equivalent. */
export function richBold(text: string): string {
  return `<b>${escapeHtml(text)}</b>`;
}

/** Inline italic span — MTProto `textItalic` equivalent. */
export function richItalic(text: string): string {
  return `<i>${escapeHtml(text)}</i>`;
}

/** Collapsible block — `<details>` with optional open. */
export function richDetails(summary: string, contentHtml: string, open = false): string {
  const openAttr = open ? ' open' : '';
  return `<details${openAttr}><summary>${escapeHtml(summary)}</summary>${contentHtml}</details>`;
}

const SAFE_LINK_PROTOCOLS = ['http://', 'https://', 'tg://'];

/** Horizontal rule — MTProto block-level divider equivalent. */
export function richDivider(): string {
  return '<hr/>';
}

/** Checklist rendered as a `<ul>` with ☑/☐ markers. */
export function richChecklist(items: { done: boolean; label: string }[]): string {
  const lis = items
    .map(item => `<li>${item.done ? '☑' : '☐'} ${escapeHtml(item.label)}</li>`)
    .join('');
  return `<ul>${lis}</ul>`;
}

// ---------------------------------------------------------------------------
// RichText builders — Bot API 10.1 `blocks` tree (MTProto RichText mirror).
// ---------------------------------------------------------------------------

/** MTProto `textBold` equivalent. */
export function rtBold(text: RichText): RichTextBold {
  return { type: 'bold', text };
}

/** MTProto `textItalic` equivalent. */
export function rtItalic(text: RichText): RichTextItalic {
  return { type: 'italic', text };
}

/** MTProto `textMarked` equivalent (highlight). */
export function rtMarked(text: RichText): RichTextMarked {
  return { type: 'marked', text };
}

/** MTProto `textUrl` equivalent. */
export function rtUrl(label: RichText, url: string): RichTextUrl {
  return { type: 'url', text: label, url };
}

/** MTProto `textConcat` equivalent — Bot API encodes concatenation as `RichText[]`. */
export function rtConcat(...parts: RichText[]): RichText[] {
  return parts;
}

// ---------------------------------------------------------------------------
// InputRichBlock builders.
// ---------------------------------------------------------------------------

export function blockHeading(
  text: RichText,
  size: 1 | 2 | 3 | 4 | 5 | 6 = 2
): InputRichBlockHeading {
  return { type: 'heading', text, size };
}

export function blockParagraph(text: RichText): InputRichBlockParagraph {
  return { type: 'paragraph', text };
}

export function blockDivider(): InputRichBlockDivider {
  return { type: 'divider' };
}

export function blockTable(
  cells: RichTableCellBlock[][],
  opts?: { isBordered?: boolean; isStriped?: boolean; caption?: string }
): InputRichBlockTable {
  return {
    type: 'table',
    cells,
    ...(opts?.isBordered !== undefined ? { is_bordered: opts.isBordered } : {}),
    ...(opts?.isStriped !== undefined ? { is_striped: opts.isStriped } : {}),
    ...(opts?.caption ? { caption: opts.caption } : {}),
  };
}

export function blockDetails(
  summary: RichText,
  blocks: InputRichBlock[],
  open = false
): InputRichBlockDetails {
  return { type: 'details', summary, blocks, ...(open ? { is_open: true } : {}) };
}

/** Checklist block — each item is a single-line list entry with a checkbox. */
export function blockChecklist(
  items: { done: boolean; label: string | RichText }[]
): InputRichBlockList {
  return {
    type: 'list',
    items: items.map(item => ({
      blocks: [blockParagraph(item.label)],
      has_checkbox: true,
      ...(item.done ? { is_checked: true } : {}),
    })),
  };
}

/** Wraps a block tree into an `InputRichMessage.blocks` payload. */
export function buildInputRichMessageBlocks(
  blocks: InputRichBlock[],
  opts?: { skipEntityDetection?: boolean; isRtl?: boolean }
): InputRichMessage {
  return {
    blocks,
    skip_entity_detection: opts?.skipEntityDetection ?? false,
    ...(opts?.isRtl ? { is_rtl: true } : {}),
  };
}

// ---------------------------------------------------------------------------
// Serialization — RichText / InputRichBlock trees down to extended HTML.
// ---------------------------------------------------------------------------

/**
 * Renders a `RichText` node to Bot API extended HTML. Arrays (`textConcat`)
 * join with no separator; `marked` uses `<u><b>…</b></u>` (see
 * `wrapEmphasisHtml`) since Telegram has no dedicated "marked" entity.
 */
export function serializeRichTextToHtml(text: RichText): string {
  if (typeof text === 'string') return escapeHtml(text);
  if (Array.isArray(text)) return text.map(serializeRichTextToHtml).join('');
  switch (text.type) {
    case 'bold':
      return `<b>${serializeRichTextToHtml(text.text)}</b>`;
    case 'italic':
      return `<i>${serializeRichTextToHtml(text.text)}</i>`;
    case 'marked':
      return `<u><b>${serializeRichTextToHtml(text.text)}</b></u>`;
    case 'url': {
      const inner = serializeRichTextToHtml(text.text);
      const isSafe = SAFE_LINK_PROTOCOLS.some(proto => text.url.toLowerCase().startsWith(proto));
      return isSafe ? `<a href="${escapeHtml(text.url)}">${inner}</a>` : inner;
    }
    default:
      return '';
  }
}

function serializeRichBlockToHtml(block: InputRichBlock): string {
  switch (block.type) {
    case 'heading':
      return `<h${block.size}>${serializeRichTextToHtml(block.text)}</h${block.size}>`;
    case 'paragraph':
      return `<p>${serializeRichTextToHtml(block.text)}</p>`;
    case 'divider':
      return richDivider();
    case 'table': {
      const attrs = [
        block.is_bordered !== false ? 'bordered' : '',
        block.is_striped !== false ? 'striped' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const attrStr = attrs ? ` ${attrs}` : '';
      const body = block.cells
        .map(row => {
          const cells = row
            .map(cell => {
              const tag = cell.is_header ? 'th' : 'td';
              const align = cell.align && cell.align !== 'left' ? ` align="${cell.align}"` : '';
              const content = cell.text ? serializeRichTextToHtml(cell.text) : '';
              return `<${tag}${align}>${content}</${tag}>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      const caption = block.caption?.trim()
        ? `<caption>${escapeHtml(block.caption)}</caption>`
        : '';
      return `<table${attrStr}>${caption}${body}</table>`;
    }
    case 'details': {
      const openAttr = block.is_open ? ' open' : '';
      return `<details${openAttr}><summary>${serializeRichTextToHtml(
        block.summary
      )}</summary>${serializeRichBlocksToHtml(block.blocks)}</details>`;
    }
    case 'list': {
      const lis = block.items
        .map(item => {
          const marker = item.has_checkbox ? (item.is_checked ? '☑ ' : '☐ ') : '';
          const label = item.label ? escapeHtml(item.label) : '';
          const inner = serializeRichBlocksToHtml(item.blocks);
          return `<li>${marker}${label}${inner}</li>`;
        })
        .join('');
      return `<ul>${lis}</ul>`;
    }
    case 'footer':
      return `<p>${serializeRichTextToHtml(block.text)}</p>`;
    default:
      return '';
  }
}

/** Renders an `InputRichBlock[]` tree to Bot API extended HTML. */
export function serializeRichBlocksToHtml(blocks: InputRichBlock[]): string {
  return blocks.map(serializeRichBlockToHtml).join('');
}

/** True when Bot API rejects sendRichMessage (older servers / disabled feature). */
export function isRichMessageUnsupported(result: {
  ok: boolean;
  description?: string;
  errorCode?: number;
}): boolean {
  if (result.ok) return false;
  const d = (result.description ?? '').toLowerCase();
  return (
    result.errorCode === 404 ||
    d.includes('method') ||
    d.includes('rich_message') ||
    d.includes('not found') ||
    d.includes('blocks')
  );
}
