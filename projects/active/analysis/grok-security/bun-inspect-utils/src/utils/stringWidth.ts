/**
 * [UTILITY][STRINGWIDTH][LAYOUT]{BUN-API}
 * Bun.stringWidth() wrapper and utilities
 *
 * Bun 1.3.5+ Unicode Improvements:
 * - Flag emoji:         🇺🇸 → 2 (was 1)
 * - Emoji + skin tone:  👋🏽 → 2 (was 4)
 * - ZWJ family:         👨‍👩‍👧 → 2 (was 8)
 * - Word joiner:        \u2060 → 0 (was 1)
 * - ANSI codes:         Ignored by default
 */

import type { WidthResult } from "../types";

/**
 * String width measurement wrapper
 * @deprecated Use Bun.stringWidth directly - kept for backward compatibility
 */
export const stringWidth = Bun.stringWidth;

/**
 * Detect ANSI escape codes in string
 * [UTILITY][STRINGWIDTH][HELPER][#REF:hasAnsiCodes]{BUN-NATIVE}
 */
function hasAnsiCodes(str: string): boolean {
  return /\x1b\[[0-9;]*m/.test(str);
}

/**
 * Detect emoji in string
 * [UTILITY][STRINGWIDTH][HELPER][#REF:hasEmoji]{BUN-NATIVE}
 */
function hasEmojiCharacters(str: string): boolean {
  return /\p{Emoji}/u.test(str);
}

/**
 * Get detailed string width metrics
 * [UTILITY][STRINGWIDTH][METHOD][#REF:stringWidthDetailed]{BUN-NATIVE}
 */
export function stringWidthDetailed(
  str: string,
  options?: { countAnsiEscapeCodes?: boolean }
): WidthResult {
  return {
    width: Bun.stringWidth(str, options),
    length: str.length,
    hasAnsi: hasAnsiCodes(str),
    hasEmoji: hasEmojiCharacters(str),
  };
}

/**
 * Apply width-based transformation to string
 * [UTILITY][STRINGWIDTH][HELPER][#REF:applyWidthTransform]{BUN-NATIVE}
 */
function applyWidthTransform(
  str: string,
  targetWidth: number,
  transform: (str: string, padding: number, padChar: string) => string,
  padChar: string = " "
): string {
  const currentWidth = Bun.stringWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return transform(str, padding, padChar);
}

/**
 * Pad string to width
 * [UTILITY][STRINGWIDTH][METHOD][#REF:padToWidth]{BUN-NATIVE}
 */
export function padToWidth(
  str: string,
  width: number,
  padChar: string = " "
): string {
  return applyWidthTransform(
    str,
    width,
    (s, p) => s + padChar.repeat(p),
    padChar
  );
}

/**
 * Truncate string to width
 * [UTILITY][STRINGWIDTH][METHOD][#REF:truncateToWidth]{BUN-NATIVE}
 */
export function truncateToWidth(
  str: string,
  maxWidth: number,
  suffix: string = "…"
): string {
  if (Bun.stringWidth(str) <= maxWidth) return str;

  let result = "";
  let width = 0;
  const suffixWidth = Bun.stringWidth(suffix);

  for (const char of str) {
    const charWidth = Bun.stringWidth(char);
    if (width + charWidth + suffixWidth > maxWidth) break;
    result += char;
    width += charWidth;
  }

  return result + suffix;
}

/**
 * Center string within width
 * [UTILITY][STRINGWIDTH][METHOD][#REF:centerToWidth]{BUN-NATIVE}
 */
export function centerToWidth(
  str: string,
  width: number,
  padChar: string = " "
): string {
  const currentWidth = Bun.stringWidth(str);
  const totalPadding = Math.max(0, width - currentWidth);
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  return padChar.repeat(leftPadding) + str + padChar.repeat(rightPadding);
}

/**
 * Align columns by width
 * [UTILITY][STRINGWIDTH][METHOD][#REF:alignColumns]{BUN-NATIVE}
 */
export function alignColumns(
  rows: string[][],
  align: "left" | "right" | "center" = "left"
): string[] {
  if (rows.length === 0) return [];

  // Calculate column widths
  const columnWidths = new Array(rows[0].length).fill(0);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      columnWidths[i] = Math.max(columnWidths[i], Bun.stringWidth(row[i]));
    }
  }

  // Align rows
  return rows.map((row) =>
    row
      .map((cell, i) => {
        const width = columnWidths[i];
        if (align === "left") return padToWidth(cell, width);
        if (align === "right") return padToWidth(cell, width).padStart(width);
        return centerToWidth(cell, width);
      })
      .join(" ")
  );
}
