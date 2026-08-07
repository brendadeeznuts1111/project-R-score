// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
/**
 * CLI chrome: kv lines, column tables, frames, indexed cards.
 * Layout primitives live in `./layout.ts`; tones in `./color.ts`.
 */
import { wrapAnsi } from 'bun';
import { tones } from './color.ts';
import { displayWidth, padDisplay, truncateDisplay } from './layout.ts';

/** Two-column key/value lines with stringWidth-aligned keys. */
export function kvLines(
  pairs: ReadonlyArray<readonly [string, string]>,
  opts: { keyWidth?: number; indent?: string } = {}
): string[] {
  const indent = opts.indent ?? '  ';
  const keyWidth = opts.keyWidth ?? Math.max(4, ...pairs.map(([k]) => displayWidth(k)));
  return pairs.map(([k, v]) => `${indent}${padDisplay(tones.dim(k), keyWidth + 2)} ${v}`);
}

/**
 * Fixed-column table using Bun.stringWidth.
 */
export function columnTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  opts: { maxWidths?: number[]; gap?: number } = {}
): string[] {
  const gap = opts.gap ?? 2;
  const gapStr = ' '.repeat(gap);
  const colCount = headers.length;
  const maxW =
    opts.maxWidths ??
    headers.map((_, i) => {
      let m = displayWidth(headers[i]!);
      for (const row of rows) {
        m = Math.max(m, displayWidth(String(row[i] ?? '')));
      }
      return Math.min(m, i === 0 ? 28 : 16);
    });

  const fmt = (cells: readonly string[], head: boolean) =>
    cells
      .slice(0, colCount)
      .map((c, i) => {
        const t = truncateDisplay(String(c ?? ''), maxW[i]!);
        const cell = head ? tones.dim(t) : t;
        return padDisplay(cell, maxW[i]!);
      })
      .join(gapStr);

  const out = [fmt(headers, true)];
  const rule = maxW.map(w => '─'.repeat(w)).join(gapStr);
  out.push(tones.dim(rule));
  for (const row of rows) out.push(fmt(row, false));
  return out;
}

/**
 * Framed block (box-drawing + stringWidth padding).
 */
export function frameBlock(
  title: string,
  status: string | null,
  bodyLines: string[],
  opts: { width?: number; ok?: boolean } = {}
): string {
  const width = Math.min(Math.max(opts.width ?? 72, 48), 100);
  const ok = opts.ok;
  const statusText =
    status == null
      ? ''
      : ok === true
        ? tones.ok(status)
        : ok === false
          ? tones.fail(status)
          : tones.warn(status);

  const topInner = width - 2;
  const titlePart = ` ${tones.accent(title)} `;
  const statusPart = statusText ? ` ${statusText} ` : '';
  const titleW = displayWidth(titlePart);
  const statusW = displayWidth(statusPart);
  const dash = Math.max(1, topInner - titleW - statusW);
  const top = `╭${titlePart}${'─'.repeat(dash)}${statusPart}╮`;

  const out: string[] = [top];
  const inner = topInner - 2;
  for (const raw of bodyLines) {
    if (displayWidth(raw) <= inner) {
      out.push(`│ ${padDisplay(raw, inner)} │`);
      continue;
    }
    const wrapped = wrapAnsi(raw, inner, {
      hard: false,
      wordWrap: true,
      trim: false,
    });
    for (const line of wrapped.split('\n')) {
      out.push(`│ ${padDisplay(line, inner)} │`);
    }
  }
  out.push(`╰${'─'.repeat(topInner)}╯`);
  return out.join('\n');
}

export function msFromNs(ns: number): string {
  const ms = ns / 1e6;
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** One indexed card — title + full-text key/value fields (wrap, never truncate). */
export type IndexedCard = {
  /** Index number (1-based) shown as `#N`. */
  index: number;
  /** Card heading (property or concept). */
  title: string;
  /** Optional one-line subtitle (plane · brand). */
  subtitle?: string;
  /** Field rows — values are wrapped, not ellipsis-truncated. */
  fields: ReadonlyArray<readonly [string, string]>;
};

/**
 * Section with index + full cards. Prefer this over wide inspect.table for
 * long default/fallback prose (chat and narrow TTYs truncate mid-word).
 */
export function formatIndexedCards(
  section: string,
  blurb: string,
  cards: readonly IndexedCard[],
  opts: { width?: number; indexOnly?: boolean } = {}
): string {
  const width = Math.min(Math.max(opts.width ?? 72, 48), 100);
  const keyW = 10;
  const lines: string[] = [];

  lines.push(tones.accent(`\n${section}`) + (blurb ? tones.dim(`  ${blurb}`) : ''));
  lines.push(tones.dim('INDEX'));
  for (const c of cards) {
    const sub = c.subtitle ? tones.dim(`  ${c.subtitle}`) : '';
    lines.push(`  ${tones.accent(`#${c.index}`)}  ${c.title}${sub}`);
  }
  if (opts.indexOnly) return lines.join('\n');

  for (const c of cards) {
    lines.push('');
    const head = `${tones.accent(`#${c.index}`)}  ${tones.bold(c.title)}`;
    lines.push(head);
    if (c.subtitle) lines.push(tones.dim(`     ${c.subtitle}`));
    for (const [k, v] of c.fields) {
      if (!v) continue;
      const label = padDisplay(tones.dim(k), keyW);
      const wrapCols = Math.max(24, width - keyW - 6);
      const wrapped = wrapAnsi(v, wrapCols, { hard: false, wordWrap: true, trim: false });
      const [first, ...rest] = wrapped.split('\n');
      lines.push(`     ${label}  ${first ?? ''}`);
      for (const cont of rest) {
        lines.push(`     ${padDisplay('', keyW)}  ${cont}`);
      }
    }
  }
  return lines.join('\n');
}
