// @see https://bun.com/docs/runtime/console — enableANSIColors surface
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/environment-variables#configuring-bun — NO_COLOR / FORCE_COLOR
/**
 * ANSI gate + swatch helpers. Single SSOT for harness color decisions.
 * Prefer `shouldColor()` over ad-hoc isTTY / NO_COLOR checks.
 */
import { color as bunColor } from 'bun';

const ANSI_RESET = '\x1b[0m';

/**
 * ANSI gate — `Bun.enableANSIColors` (startup env/TTY, or explicit assignment).
 * Not mid-process env mutation; never `import { enableANSIColors }` (frozen snapshot).
 */
export function shouldColor(): boolean {
  return Bun.enableANSIColors;
}

/**
 * Colorize via Bun.color `"ansi"` when `shouldColor()`.
 * @param swatch CSS color, hex, or named — Bun.color flexible input
 */
export function colorize(text: string, swatch: string): string {
  if (!shouldColor()) return text;
  const code = bunColor(swatch, 'ansi') || '';
  return code ? `${code}${text}${ANSI_RESET}` : text;
}

/**
 * Semantic TTY tones (GitHub-ish palette). Gated by `shouldColor()`.
 * Prefer over raw SGR codes in tools / portal doctor chrome.
 */
export const tones = {
  ok: (s: string) => colorize(s, '#3fb950'),
  fail: (s: string) => colorize(s, '#f85149'),
  warn: (s: string) => colorize(s, '#d29922'),
  dim: (s: string) => colorize(s, '#8b949e'),
  accent: (s: string) => colorize(s, '#58a6ff'),
  bold: (s: string) => (shouldColor() ? `\x1b[1m${s}${ANSI_RESET}` : s),
} as const;

/** @deprecated Use `tones` — alias kept for portal/cli-chrome import paths. */
export const cliTone = tones;
