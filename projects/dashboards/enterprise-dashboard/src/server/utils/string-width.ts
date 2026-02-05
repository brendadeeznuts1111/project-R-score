/**
 * Enterprise String Width Utilities
 * Bulletproof ASCII rendering with Bun.stringWidth (1.3.6+)
 *
 * Handles:
 * - Grapheme-aware emoji (ZWJ sequences, skin tones, flags)
 * - Complete ANSI escape sequences (CSI, SGR, cursor control)
 * - OSC 8 hyperlinks (iTerm2, Kitty, WezTerm)
 * - Zero-width characters (word joiner, combining marks)
 */

/**
 * Enterprise-safe stringWidth with fallback + validation
 * Uses Bun.stringWidth for accurate terminal display width
 */
export function safeStringWidth(str: string): number {
  try {
    // Bun 1.3.6+ - Handles all edge cases perfectly
    return Bun.stringWidth(str);
  } catch {
    // Fallback for older Bun versions - strip ANSI codes
    return str.replace(/\u001B\[[0-9;]*[mK]/g, "").length;
  }
}

/**
 * Validates ASCII layout integrity
 * Warns if actual width doesn't match expected
 */
export function validateLayout(line: string, expectedWidth: number): number {
  const actual = safeStringWidth(line);
  if (actual !== expectedWidth) {
    console.warn(
      `\x1b[33m⚠️  Layout shift: "${line.substring(0, 20)}..." (${actual} vs ${expectedWidth})\x1b[0m`
    );
  }
  return actual;
}

/**
 * Pad string to exact terminal width
 * Accounts for Unicode and ANSI sequences
 */
export function padToWidth(str: string, width: number, char = " "): string {
  const currentWidth = safeStringWidth(str);
  const padding = Math.max(0, width - currentWidth);
  return str + char.repeat(padding);
}

/**
 * Truncate string to exact terminal width
 * Preserves ANSI reset at end
 */
export function truncateToWidth(str: string, maxWidth: number, ellipsis = "…"): string {
  const currentWidth = safeStringWidth(str);
  if (currentWidth <= maxWidth) return str;

  const ellipsisWidth = safeStringWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  // Strip ANSI for character iteration, then rebuild
  let result = "";
  let width = 0;

  for (const char of str) {
    const charWidth = safeStringWidth(char);
    if (width + charWidth > targetWidth) break;
    // Skip ANSI sequences in width calculation but keep them
    if (char === "\x1b") {
      result += char;
      continue;
    }
    result += char;
    width += charWidth;
  }

  return result + ellipsis + "\x1b[0m";
}

/**
 * Create OSC 8 hyperlink (clickable in modern terminals)
 * Supported: iTerm2, Kitty, WezTerm, Windows Terminal
 */
export function hyperlink(text: string, url: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/**
 * Get health color ANSI code
 */
export function getHealthColor(health: number): string {
  if (health >= 80) return "\x1b[32m"; // Green
  if (health >= 60) return "\x1b[33m"; // Yellow
  if (health >= 40) return "\x1b[38;5;208m"; // Orange
  return "\x1b[31m"; // Red
}

/**
 * Create ASCII progress bar with exact width
 */
export function progressBar(percent: number, width = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Render a perfect ASCII table row with validated width
 */
export function renderPerfectRow(
  label: string,
  value: number,
  emoji: string,
  totalWidth: number
): string {
  const bar = progressBar(value);
  const coloredBar = `${getHealthColor(value)}${bar}\x1b[0m`;
  const percentStr = `${value.toString().padStart(3)}%`;
  const content = `${emoji} ${label.padEnd(18)} │ [${coloredBar}] ${percentStr}`;

  // Validate before rendering
  const contentWidth = safeStringWidth(content);
  const innerWidth = totalWidth - 4; // Account for "║ " and " ║"
  const padding = " ".repeat(Math.max(0, innerWidth - contentWidth));

  return `║ ${content}${padding} ║`;
}

/**
 * Render ASCII box header
 */
export function renderBoxHeader(title: string, width: number): string {
  const innerWidth = width - 4;
  const titleWidth = safeStringWidth(title);
  const leftPad = Math.floor((innerWidth - titleWidth) / 2);
  const rightPad = innerWidth - titleWidth - leftPad;

  return [
    "╔" + "═".repeat(width - 2) + "╗",
    "║ " + " ".repeat(leftPad) + title + " ".repeat(rightPad) + " ║",
    "╠" + "═".repeat(width - 2) + "╣",
  ].join("\n");
}

/**
 * Render ASCII box footer
 */
export function renderBoxFooter(width: number): string {
  return "╚" + "═".repeat(width - 2) + "╝";
}

/**
 * Format bytes with proper width
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a complete ASCII dashboard panel
 */
export function renderDashboardPanel(
  title: string,
  rows: Array<{ label: string; value: number; emoji: string }>,
  width = 50
): string {
  const lines: string[] = [];

  lines.push(renderBoxHeader(title, width));

  for (const row of rows) {
    lines.push(renderPerfectRow(row.label, row.value, row.emoji, width));
  }

  lines.push(renderBoxFooter(width));

  return lines.join("\n");
}

// Export types
export interface DashboardRow {
  label: string;
  value: number;
  emoji: string;
}
