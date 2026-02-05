import { color } from "bun";
// Import TOML using Bun's native import attributes
import config from "./syntax-colors.toml" with { type: "toml" };

const { colors, names, text_colors, settings } = config as {
  colors: Record<string, string>;
  names: Record<string, string>;
  text_colors: Record<string, string>;
  settings: {
    fallback_bg: string;
    fallback_text: string;
    fallback_name: string;
  };
};

export type BunColorFormat =
  | "css"
  | "ansi"
  | "ansi-16"
  | "ansi-256"
  | "ansi-16m"
  | "number"
  | "rgb"
  | "rgba"
  | "hsl"
  | "hex"
  | "HEX"
  | "{rgb}"
  | "{rgba}"
  | "[rgb]"
  | "[rgba]";

export type BunColorMap = {
  css: string;
  ansi: string;
  "ansi-16": string;
  "ansi-256": string;
  "ansi-16m": string;
  number: number;
  rgb: string;
  rgba: string;
  hsl: string;
  hex: string;
  HEX: string;
  "{rgb}": { r: number; g: number; b: number };
  "{rgba}": { r: number; g: number; b: number; a: number };
  "[rgb]": [number, number, number];
  "[rgba]": [number, number, number, number];
};

export interface SyntaxColorInfo {
  bg: string;
  text: string;
  name: string;
}

/**
 * Get syntax color info for a language
 */
export function getSyntaxColorInfo(lang: string): SyntaxColorInfo {
  const normalized = lang.toLowerCase();
  return {
    bg: colors[normalized] ?? settings.fallback_bg,
    text: text_colors[normalized] ?? settings.fallback_text,
    name: names[normalized] ?? settings.fallback_name,
  };
}

/**
 * Resolves a language color from the TOML config and formats it via Bun.color
 */
export function getSyntaxColor<T extends BunColorFormat>(
  lang: string,
  format: T = "hex" as T,
): BunColorMap[T] | null {
  const normalized = lang.toLowerCase();
  const input = colors[normalized] ?? settings.fallback_bg;

  const result = color(input, format as Parameters<typeof color>[1]);

  if (result === null) {
    // Return fallback for number format
    if (format === "number") {
      return color(settings.fallback_bg, "number") as BunColorMap[T];
    }
    return null;
  }

  return result as BunColorMap[T];
}

/**
 * Get ANSI escape code for terminal coloring
 */
export function getSyntaxAnsi(lang: string): string {
  const normalized = lang.toLowerCase();
  const input = colors[normalized] ?? settings.fallback_bg;
  return color(input, "ansi") ?? "";
}

/**
 * Check if a language has a defined color
 */
export function hasLanguageColor(lang: string): boolean {
  return lang.toLowerCase() in colors;
}

/**
 * Get all available language keys
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(colors);
}

/**
 * Get color as CSS-friendly format
 */
export function getSyntaxColorCSS(lang: string): string {
  const normalized = lang.toLowerCase();
  const input = colors[normalized] ?? settings.fallback_bg;
  return color(input, "css") ?? input;
}

/**
 * Log with syntax-colored prefix
 */
export function logWithSyntaxColor(lang: string, message: string): void {
  const ansiColor = getSyntaxAnsi(lang);
  const reset = "\x1b[0m";
  const info = getSyntaxColorInfo(lang);
  console.log(`${ansiColor}[${info.name}]${reset} ${message}`);
}

// Re-export the raw config for direct access
export { colors, names, text_colors, settings };
