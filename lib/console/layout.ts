// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
/**
 * Visible-column layout over Bun.stringWidth / sliceAnsi.
 * Never use s.length for TTY column math.
 */
import { sliceAnsi, stringWidth } from 'bun';

type NarrowOpts = { ambiguousIsNarrow?: boolean };

/** Terminal columns (fallback 80). Bun.stdout has no `.columns` on all surfaces. */
export function termWidth(): number {
  return process.stdout.columns ?? 80;
}

/** Alias of Bun.stringWidth — emoji / ANSI / CJK safe. */
export function displayWidth(s: string, options?: NarrowOpts): number {
  return stringWidth(s, options);
}

/**
 * Pad end by visible columns (ANSI/emoji safe).
 */
export function padEndWidth(text: string, width: number, fill = ' ', options?: NarrowOpts): string {
  const missing = width - stringWidth(text, options);
  return missing > 0 ? text + fill.repeat(missing) : text;
}

export function padStartWidth(
  text: string,
  width: number,
  fill = ' ',
  options?: NarrowOpts
): string {
  const missing = width - stringWidth(text, options);
  return missing > 0 ? fill.repeat(missing) + text : text;
}

export function padCenterWidth(
  text: string,
  width: number,
  fill = ' ',
  options?: NarrowOpts
): string {
  const missing = width - stringWidth(text, options);
  if (missing <= 0) return text;
  const left = Math.floor(missing / 2);
  return fill.repeat(left) + text + fill.repeat(missing - left);
}

/** Pad so visible width is exactly `width` (ANSI/emoji-safe). */
export function padDisplay(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  return align === 'right' ? padStartWidth(s, width) : padEndWidth(s, width);
}

/**
 * Truncate to visible columns without breaking ANSI / graphemes.
 */
export function truncateWidth(
  text: string,
  width: number,
  options?: NarrowOpts & { ellipsis?: string }
): string {
  const { ellipsis, ...sw } = options ?? {};
  if (stringWidth(text, sw) <= width) return text;
  return ellipsis !== undefined
    ? sliceAnsi(text, 0, width, { ellipsis, ...sw })
    : sliceAnsi(text, 0, width, sw);
}

/** Truncate to max visible columns, appending "…" when needed. */
export function truncateDisplay(s: string, max: number): string {
  if (max <= 0) return '';
  if (max === 1) return '…';
  return truncateWidth(s, max, { ellipsis: '…' });
}

/**
 * Truncate-then-pad to an exact column width.
 */
export function fitVisible(
  text: string,
  cols: number,
  opts?: {
    ellipsis?: string;
    align?: 'left' | 'right' | 'center';
    fill?: string;
    ambiguousIsNarrow?: boolean;
  }
): string {
  const sw =
    opts?.ambiguousIsNarrow === undefined
      ? undefined
      : { ambiguousIsNarrow: opts.ambiguousIsNarrow };
  const fill = opts?.fill ?? ' ';
  const clipped =
    stringWidth(text, sw) > cols
      ? sliceAnsi(text, 0, cols, { ellipsis: opts?.ellipsis ?? '…', ...sw })
      : text;
  switch (opts?.align ?? 'left') {
    case 'right':
      return padStartWidth(clipped, cols, fill, sw);
    case 'center':
      return padCenterWidth(clipped, cols, fill, sw);
    default:
      return padEndWidth(clipped, cols, fill, sw);
  }
}
