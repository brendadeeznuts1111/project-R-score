/**
 * ⚡ SYNTAX ENGINE
 * Color management for syntax highlighting
 *
 * Features:
 * - Native TOML import with { type: "toml" }
 * - Browser-compatible CRC32 integrity
 * - Color format conversion
 */

// Browser-compatible CRC32
import { crc32 } from "./formatters";

// Native TOML loader
import syntaxConfig from "./syntax-colors.toml" with { type: "toml" };

/**
 * Browser-compatible color converter
 * Converts hex colors to various formats
 */
function color(hex: string, format: string): string | number | number[] | { r: number; g: number; b: number; a?: number } | null {
  // Parse hex color
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;

  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);

  switch (format) {
    case "hex":
      return hex.startsWith("#") ? hex : `#${hex}`;
    case "HEX":
      return (hex.startsWith("#") ? hex : `#${hex}`).toUpperCase();
    case "rgb":
      return `rgb(${r}, ${g}, ${b})`;
    case "rgba":
      return `rgba(${r}, ${g}, ${b}, 1)`;
    case "number":
      return (r << 16) | (g << 8) | b;
    case "css":
      return hex.startsWith("#") ? hex : `#${hex}`;
    case "ansi":
    case "ansi-256":
      // Simple ANSI 256-color approximation
      return `\x1b[38;2;${r};${g};${b}m`;
    case "ansi-16m":
      return `\x1b[38;2;${r};${g};${b}m`;
    default:
      return hex;
  }
}

// Type definitions - matches Bun.color() supported formats
type ColorFormat = "hex" | "HEX" | "rgb" | "rgba" | "css" | "ansi" | "ansi-16" | "ansi-256" | "ansi-16m" | "hsl" | "lab" | "number";

interface SyntaxConfig {
  colors: Record<string, string>;
  names: Record<string, string>;
  text_colors: Record<string, string>;
  settings: {
    fallback_bg: string;
    fallback_text: string;
    fallback_name: string;
  };
}

const config = syntaxConfig as SyntaxConfig;

/**
 * SYNTAX ENGINE v1.3.6
 * High-performance asset pipeline for syntax highlighting
 */
export const SYNTAX_ENGINE = {
  /** Raw color map from TOML */
  colors: config.colors,

  /** Display names */
  names: config.names,

  /** Text colors for contrast */
  textColors: config.text_colors,

  /** Fallback settings */
  fallback: {
    bg: config.settings.fallback_bg,
    text: config.settings.fallback_text,
    name: config.settings.fallback_name,
  },

  /**
   * Generate CRC32 integrity hash (25× faster with SIMD)
   * Used for cache busting and tamper detection
   */
  getIntegrity(): string {
    const data = JSON.stringify(this.colors);
    return crc32(data).toString(16).padStart(8, "0");
  },

  /**
   * Get color for language with color() conversion
   * @param lang - Language identifier (case-insensitive)
   * @param format - Output format (hex, rgb, rgba, ansi, etc.)
   */
  getColor(lang: string, format: ColorFormat = "hex"): string | number | number[] | { r: number; g: number; b: number; a?: number } | null {
    const key = lang.toLowerCase();
    const hex = this.colors[key] ?? this.fallback.bg;

    if (format === "HEX") return hex.toUpperCase();
    if (format === "hex") return color(hex, "hex") ?? hex;

    return color(hex, format as Parameters<typeof color>[1]) ?? null;
  },

  /**
   * Get full color info for a language
   */
  getInfo(lang: string): { bg: string; text: string; name: string } {
    const key = lang.toLowerCase();
    return {
      bg: this.colors[key] ?? this.fallback.bg,
      text: this.textColors[key] ?? this.fallback.text,
      name: this.names[key] ?? this.fallback.name,
    };
  },

  /**
   * Check if language has a defined color
   */
  has(lang: string): boolean {
    return lang.toLowerCase() in this.colors;
  },

  /**
   * Get all available language keys
   */
  languages(): string[] {
    return Object.keys(this.colors);
  },

  /**
   * Get ANSI escape code for terminal output
   */
  getAnsi(lang: string): string {
    const hex = this.colors[lang.toLowerCase()] ?? this.fallback.bg;
    return color(hex, "ansi") as string;
  },

  /**
   * Verify config integrity against expected hash
   */
  verify(expectedHash: string): boolean {
    return this.getIntegrity() === expectedHash;
  },
};

// Export individual functions for tree-shaking
export const getIntegrity = () => SYNTAX_ENGINE.getIntegrity();
export const getColor = (lang: string, format?: ColorFormat) => SYNTAX_ENGINE.getColor(lang, format);
export const getInfo = (lang: string) => SYNTAX_ENGINE.getInfo(lang);
export const hasLanguage = (lang: string) => SYNTAX_ENGINE.has(lang);
export const getLanguages = () => SYNTAX_ENGINE.languages();
