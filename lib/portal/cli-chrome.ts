// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
/**
 * Small Bun-native CLI chrome for portal tools (doctor, check:snapshots, …).
 * Prefer this over ad-hoc console.log strings so labels align and ANSI is consistent.
 */
const RESET = '\x1b[0m';

function ansi(hex: string, text: string): string {
  const code = Bun.color(hex, 'ansi-16m') || Bun.color(hex, 'ansi') || '';
  return code ? `${code}${text}${RESET}` : text;
}

export const cliTone = {
  ok: (s: string) => ansi('#3fb950', s),
  fail: (s: string) => ansi('#f85149', s),
  warn: (s: string) => ansi('#d29922', s),
  dim: (s: string) => ansi('#8b949e', s),
  accent: (s: string) => ansi('#58a6ff', s),
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
} as const;

/** Pad `s` with spaces so display width is at least `width` (ANSI-aware). */
export function padDisplay(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  const w = Bun.stringWidth(s);
  const n = Math.max(0, width - w);
  const pad = ' '.repeat(n);
  return align === 'right' ? pad + s : s + pad;
}

/** Two-column key/value lines with aligned values. */
export function kvLines(
  pairs: ReadonlyArray<readonly [string, string]>,
  opts: { keyWidth?: number; indent?: string } = {}
): string[] {
  const indent = opts.indent ?? '  ';
  const keyWidth = opts.keyWidth ?? Math.max(4, ...pairs.map(([k]) => Bun.stringWidth(k)));
  return pairs.map(([k, v]) => `${indent}${padDisplay(cliTone.dim(k), keyWidth + 2)} ${v}`);
}

/**
 * Framed block:
 *   ╭ title ──────────── status ╮
 *   │ body…                     │
 *   ╰───────────────────────────╯
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
  const titleW = Bun.stringWidth(Bun.stripANSI(titlePart));
  const statusW = Bun.stringWidth(Bun.stripANSI(statusPart));
  const dash = Math.max(1, topInner - titleW - statusW);
  const top = `╭${titlePart}${'─'.repeat(dash)}${statusPart}╮`;

  const out: string[] = [top];
  for (const raw of bodyLines) {
    const plain = Bun.stripANSI(raw);
    if (Bun.stringWidth(plain) <= topInner - 2) {
      out.push(`│ ${padDisplay(raw, topInner - 2)} │`);
      continue;
    }
    const wrapped = Bun.wrapAnsi(raw, topInner - 2, {
      hard: false,
      wordWrap: true,
      trim: true,
    });
    for (const line of wrapped.split('\n')) {
      out.push(`│ ${padDisplay(line, topInner - 2)} │`);
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
