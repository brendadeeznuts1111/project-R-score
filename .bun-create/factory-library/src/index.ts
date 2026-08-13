/** A minimal Bun-native library entry point. Replace this API with your domain API. */

// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color auto terminal format

/** Bun terminal formats keyed by caller intent rather than escape-code spelling. */
export const TERMINAL_COLOR_FORMATS = {
  auto: 'ansi',
  '16': 'ansi-16',
  '256': 'ansi-256',
  truecolor: 'ansi-16m',
} as const;

export type TerminalColorDepth = keyof typeof TERMINAL_COLOR_FORMATS;
export type TerminalColorFormat = (typeof TERMINAL_COLOR_FORMATS)[TerminalColorDepth];

/** Bun's environment-sensitive terminal format: 16, 256, true color, or plain output. */
export const AUTO_TERMINAL_COLOR_FORMAT = TERMINAL_COLOR_FORMATS.auto;

/** SGR reset appended only when Bun produced a terminal color opener. */
export const ANSI_RESET = '\x1b[0m';

let callCount = 0;

/** Returns a friendly greeting and increments the internal call counter. */
export function hello(name?: string): string {
  callCount++;
  return `Hello, ${name ?? 'world'}!`;
}

/** Returns the number of times `hello()` has been called. */
export function getCallCount(): number {
  return callCount;
}

/** Resets the call counter to zero (used in test fixtures). */
export function resetCallCount(): void {
  callCount = 0;
}

/** Resolve a caller-facing depth to Bun.color's terminal output format. */
export function terminalColorFormat(depth: TerminalColorDepth = 'auto'): TerminalColorFormat {
  return TERMINAL_COLOR_FORMATS[depth];
}

/** Return only the Bun.color opener, or an empty string when parsing/output is unavailable. */
export function terminalColorOpen(
  color: Bun.ColorInput,
  depth: TerminalColorDepth = 'auto'
): string {
  return Bun.color(color, terminalColorFormat(depth)) ?? '';
}

/**
 * Format text for a terminal. `auto` delegates capability detection to Bun's
 * `"ansi"` format; fixed depths are explicit serialization contracts.
 */
export function formatTerminal(
  text: string,
  color: Bun.ColorInput,
  depth: TerminalColorDepth = 'auto'
): string {
  const open = terminalColorOpen(color, depth);
  return open ? `${open}${text}${ANSI_RESET}` : text;
}

/** Small semantic palette for scripts; replace or extend it with domain-owned colors. */
export const COLOR_PRESETS = {
  green: '#00cc66',
  red: '#ff4444',
  yellow: '#ffaa00',
  brand: '#7dd3c0',
} as const;

/** Stable brand representations for manifests and other non-terminal consumers. */
export const brandHex = COLOR_PRESETS.brand;
export const brandRgb = Bun.color(brandHex, '{rgb}');

/** Semantic auto-terminal helpers backed by the same Bun.color pipeline. */
export const colors = {
  green: (text: string) => formatTerminal(text, COLOR_PRESETS.green),
  red: (text: string) => formatTerminal(text, COLOR_PRESETS.red),
  yellow: (text: string) => formatTerminal(text, COLOR_PRESETS.yellow),
  brand: (text: string) => formatTerminal(text, COLOR_PRESETS.brand),
} as const;
