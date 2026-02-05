// lib/polish/core/runtime.ts - Runtime detection and capability checking
// ═══════════════════════════════════════════════════════════════════════════════

import type { RuntimeEnvironment, RuntimeCapabilities } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Detection
// ─────────────────────────────────────────────────────────────────────────────

const detectEnvironment = (): RuntimeEnvironment => {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof document !== "undefined") return "browser";
  if (typeof process !== "undefined" && process.versions?.node) return "node";
  return "unknown";
};

const detectCapabilities = (): RuntimeCapabilities => {
  const env = detectEnvironment();

  return {
    isBun: env === "bun",
    isBrowser: env === "browser",
    isNode: env === "node",
    supportsTTY: env === "bun" || env === "node"
      ? (process?.stdout?.isTTY ?? false)
      : false,
    supportsHaptic: env === "browser" && "vibrate" in navigator,
    supportsAudio: env === "browser" && typeof AudioContext !== "undefined",
    supportsColors: env === "bun" || env === "node"
      ? (process?.stdout?.isTTY ?? false) && !process?.env?.NO_COLOR
      : false,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Runtime Object
// ─────────────────────────────────────────────────────────────────────────────

export const Runtime = {
  environment: detectEnvironment(),
  ...detectCapabilities(),

  // Convenience methods
  isCLI(): boolean {
    return this.isBun || this.isNode;
  },

  canAnimate(): boolean {
    return this.isCLI() ? this.supportsTTY : this.isBrowser;
  },

  getTerminalWidth(): number {
    if (this.isBun && typeof Bun !== "undefined") {
      return process?.stdout?.columns ?? 80;
    }
    if (this.isNode) {
      return process?.stdout?.columns ?? 80;
    }
    return 80;
  },

  // For cross-runtime sleep
  async sleep(ms: number): Promise<void> {
    if (this.isBun && typeof Bun !== "undefined") {
      await Bun.sleep(ms);
    } else {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  },

  // Cross-runtime string width
  stringWidth(str: string): number {
    if (this.isBun && typeof Bun !== "undefined") {
      return Bun.stringWidth(str);
    }
    // Fallback: count graphemes (approximate)
    return [...str].length;
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ANSI Color Utilities
// ─────────────────────────────────────────────────────────────────────────────

export const ANSI = {
  // Reset
  reset: "\x1b[0m",

  // Styles
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",

  // Cursor control
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
  cursorUp: (n = 1) => `\x1b[${n}A`,
  cursorDown: (n = 1) => `\x1b[${n}B`,
  cursorForward: (n = 1) => `\x1b[${n}C`,
  cursorBack: (n = 1) => `\x1b[${n}D`,
  cursorTo: (x: number) => `\x1b[${x}G`,

  // Helper to wrap text with color
  color(text: string, colorCode: string): string {
    if (!Runtime.supportsColors) return text;
    return `${colorCode}${text}${this.reset}`;
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Color Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  success: (text: string) => ANSI.color(text, ANSI.green),
  error: (text: string) => ANSI.color(text, ANSI.red),
  warning: (text: string) => ANSI.color(text, ANSI.yellow),
  info: (text: string) => ANSI.color(text, ANSI.cyan),
  dim: (text: string) => ANSI.color(text, ANSI.dim),
  bold: (text: string) => ANSI.color(text, ANSI.bold),
  highlight: (text: string) => ANSI.color(text, `${ANSI.bold}${ANSI.cyan}`),
} as const;
