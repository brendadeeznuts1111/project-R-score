// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/environment-variables#configuring-bun — NO_COLOR / FORCE_COLOR
/**
 * Bun-native CLI chrome: layout via Bun.stringWidth / wrapAnsi / stripANSI;
 * color via Bun.color gated by shouldColor() (console-depth SSOT).
 *
 * Never emit ANSI when piped, CI, or NO_COLOR — same contract as logDepth/colorize.
 */
import { shouldColor } from '../console-depth.ts';

const RESET = '\x1b[0m';

/**
 * Color text with Bun.color when TTY allows it.
 * Uses "ansi" first (docs: auto-detects terminal depth, returns "" when none).
 * @see https://bun.com/docs/runtime/color
 */
function ansi(hex: string, text: string): string {
  if (!shouldColor()) return text;
  const code = Bun.color(hex, 'ansi') || Bun.color(hex, 'ansi-256') || '';
  return code ? `${code}${text}${RESET}` : text;
}

export const cliTone = {
  ok: (s: string) => ansi('#3fb950', s),
  fail: (s: string) => ansi('#f85149', s),
  warn: (s: string) => ansi('#d29922', s),
  dim: (s: string) => ansi('#8b949e', s),
  accent: (s: string) => ansi('#58a6ff', s),
  bold: (s: string) => (shouldColor() ? `\x1b[1m${s}${RESET}` : s),
} as const;

/**
 * Terminal column width. Bun.stringWidth ignores ANSI by default and handles
 * emoji / wide Unicode — use this, never s.length, for layout.
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
export function displayWidth(s: string): number {
  return Bun.stringWidth(s);
}

/** Pad so visible width is exactly `width` (ANSI/emoji-safe). */
export function padDisplay(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  const w = displayWidth(s);
  const n = Math.max(0, width - w);
  const pad = ' '.repeat(n);
  return align === 'right' ? pad + s : s + pad;
}

/**
 * Truncate to max visible columns, appending "…" when needed.
 * @see https://bun.com/docs/runtime/utils#bun-stripansi
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
export function truncateDisplay(s: string, max: number): string {
  if (max <= 0) return '';
  if (displayWidth(s) <= max) return s;
  if (max === 1) return '…';
  const plain = Bun.stripANSI(s);
  let out = '';
  for (const ch of plain) {
    if (displayWidth(out + ch + '…') > max) break;
    out += ch;
  }
  return `${out}…`;
}

/** Two-column key/value lines with stringWidth-aligned keys. */
export function kvLines(
  pairs: ReadonlyArray<readonly [string, string]>,
  opts: { keyWidth?: number; indent?: string } = {}
): string[] {
  const indent = opts.indent ?? '  ';
  const keyWidth = opts.keyWidth ?? Math.max(4, ...pairs.map(([k]) => displayWidth(k)));
  return pairs.map(([k, v]) => `${indent}${padDisplay(cliTone.dim(k), keyWidth + 2)} ${v}`);
}

/**
 * Fixed-column table using Bun.stringWidth.
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
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
        const cell = head ? cliTone.dim(t) : t;
        return padDisplay(cell, maxW[i]!);
      })
      .join(gapStr);

  const out = [fmt(headers, true)];
  const rule = maxW.map(w => '─'.repeat(w)).join(gapStr);
  out.push(cliTone.dim(rule));
  for (const row of rows) out.push(fmt(row, false));
  return out;
}

/**
 * Framed block (box-drawing + stringWidth padding).
 * @see https://bun.com/docs/runtime/utils#bun-wrapansi
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
        ? cliTone.ok(status)
        : ok === false
          ? cliTone.fail(status)
          : cliTone.warn(status);

  const topInner = width - 2;
  const titlePart = ` ${cliTone.accent(title)} `;
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
    // trim:false keeps intentional leading indent (e.g. doctor continuation lines)
    const wrapped = Bun.wrapAnsi(raw, inner, {
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
