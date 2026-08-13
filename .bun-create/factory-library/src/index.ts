/** A minimal Bun-native library entry point. Replace this API with your domain API. */

// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color auto terminal format

/** Bun's environment-sensitive terminal format: 16, 256, true color, or plain output. */
export const AUTO_TERMINAL_COLOR_FORMAT = 'ansi' as const;

const ANSI_RESET = '\x1b[0m';

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

/**
 * Format text for the active terminal with Bun.color's `"ansi"` auto-detection.
 * Invalid colors and non-color output streams degrade to the original text.
 */
export function formatTerminal(text: string, color: Bun.ColorInput): string {
  const open = Bun.color(color, AUTO_TERMINAL_COLOR_FORMAT) ?? '';
  return open ? `${open}${text}${ANSI_RESET}` : text;
}
