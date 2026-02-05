/**
 * Enhanced string width calculation using Bun's improved stringWidth
 * Supports: Zero-width chars, ANSI sequences, emoji, RTL text
 */

import { feature } from "bun:bundle";

export class TerminalWidth {
  // Flag emoji width (🇺🇸 is 2 columns)
  static getFlagWidth(countryCode: string): number {
    const flag = this.countryCodeToFlag(countryCode);
    return Bun.stringWidth(flag); // Now correctly returns 2
  }

  // Skin-tone emoji width (👋🏽 is 2 columns)
  static getEmojiWithSkinTone(baseEmoji: string, skinTone: string): number {
    const emoji = `${baseEmoji}${skinTone}`;
    return Bun.stringWidth(emoji); // Correctly handles skin tone modifiers
  }

  // ZWJ sequence width (👨‍👩‍👧 is 2 columns)
  static getZWJSequence(parts: string[]): number {
    const sequence = parts.join("\u200D"); // Zero-width joiner
    return Bun.stringWidth(sequence); // Correctly measures as single grapheme
  }

  // ANSI-colored text width
  static getColoredText(text: string, color: string): number {
    const colored = `\x1b[${color}m${text}\x1b[0m`;
    return Bun.stringWidth(colored); // ANSI sequences excluded from width
  }

  // Hyperlink width (OSC sequences excluded)
  static getHyperlink(text: string, url: string): number {
    const link = `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
    return Bun.stringWidth(link); // Only text width counted
  }

  // Format dashboard cells with proper width
  static formatCell(content: string, width: number): string {
    const contentWidth = Bun.stringWidth(content);

    if (contentWidth === width) {
      return content;
    } else if (contentWidth < width) {
      // Pad with spaces
      return content + " ".repeat(width - contentWidth);
    } else {
      // Truncate with ellipsis
      return this.truncateWithEllipsis(content, width);
    }
  }

  // Create a progress bar with emoji
  static createProgressBar(
    value: number,
    max: number,
    width: number = 20
  ): string {
    const percentage = value / max;
    const filled = Math.round(percentage * width);
    const empty = width - filled;

    // Use emoji that are correctly measured as 2 columns
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const label = ` ${Math.round(percentage * 100)}%`;

    return bar + label;
  }

  // Create a table with proper column alignment
  static createTable(
    headers: string[],
    rows: string[][],
    columnWidths?: number[]
  ): string[] {
    if (!columnWidths) {
      // Calculate maximum width for each column
      columnWidths = headers.map((header, i) => {
        const headerWidth = Bun.stringWidth(header);
        const maxRowWidth = Math.max(...rows.map(row => Bun.stringWidth(row[i] || "")));
        return Math.max(headerWidth, maxRowWidth);
      });
    }

    const lines: string[] = [];

    // Header
    const headerLine = headers
      .map((h, i) => this.formatCell(h, columnWidths![i]))
      .join(" │ ");
    lines.push(headerLine);
    lines.push("─".repeat(Bun.stringWidth(headerLine)));

    // Rows
    for (const row of rows) {
      const rowLine = row
        .map((cell, i) => this.formatCell(cell, columnWidths![i]))
        .join(" │ ");
      lines.push(rowLine);
    }

    return lines;
  }

  // Handle RTL text mixing
  static formatMixedDirectionText(ltrText: string, rtlText: string): string {
    // Use Unicode directionality markers
    return `\u200E${ltrText}\u200F${rtlText}\u200E`;
  }

  // Create a status line with proper alignment
  static createStatusLine(
    left: string,
    center: string,
    right: string,
    totalWidth: number
  ): string {
    const leftWidth = Bun.stringWidth(left);
    const centerWidth = Bun.stringWidth(center);
    const rightWidth = Bun.stringWidth(right);

    const leftPadding = Math.floor((totalWidth - centerWidth) / 2) - leftWidth;
    const rightPadding = totalWidth - leftWidth - centerWidth - rightWidth - leftPadding;

    return left + " ".repeat(Math.max(0, leftPadding)) +
           center + " ".repeat(Math.max(0, rightPadding)) +
           right;
  }

  // Format a list with proper indentation
  static formatList(items: string[], indent: number = 0): string[] {
    const indentStr = " ".repeat(indent);
    return items.map(item => {
      const prefix = item.includes("✅") || item.includes("❌") ? "" : "• ";
      return indentStr + prefix + item;
    });
  }

  // Create a dashboard header with proper centering
  static createDashboard(title: string, subtitle?: string): string[] {
    const titleWidth = Bun.stringWidth(title);
    const subtitleWidth = subtitle ? Bun.stringWidth(subtitle) : 0;
    const maxTitleWidth = Math.max(titleWidth, subtitleWidth);

    const border = "═".repeat(maxTitleWidth + 4);
    const titleLine = `║ ${title}${" ".repeat(maxTitleWidth - titleWidth)} ║`;
    const subtitleLine = subtitle
      ? `║ ${subtitle}${" ".repeat(maxTitleWidth - subtitleWidth)} ║`
      : "";

    const result = [`╔${border}╗`, titleLine];
    if (subtitleLine) result.push(subtitleLine);
    result.push(`╚${border}╝`);

    return result;
  }

  // Advanced Unicode test cases
  static testUnicodeHandling(): void {
    if (!feature("ENV_DEVELOPMENT")) return;

    console.log("🧪 Testing Bun.stringWidth improvements:");
    console.log("─".repeat(50));

    const testCases = [
      { text: "🇺🇸", expected: 2, description: "Flag emoji" },
      { text: "👋🏽", expected: 2, description: "Emoji with skin tone" },
      { text: "👨‍👩‍👧", expected: 2, description: "ZWJ family sequence" },
      { text: "\u2060", expected: 0, description: "Word joiner" },
      { text: "\x1b[32mOK\x1b[0m", expected: 2, description: "ANSI colored text" },
      { text: "กำ", expected: 1, description: "Thai combining marks" },
      { text: "★\uFE0E", expected: 1, description: "Text variation selector" },
      { text: "🔗[link](url)", expected: 9, description: "Markdown link" },
      { text: "a\u0301", expected: 1, description: "Combining acute accent" },
      { text: "\u200Fالعربية", expected: 6, description: "RTL text with marker" },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
      const width = Bun.stringWidth(test.text);
      const pass = width === test.expected;
      const icon = pass ? "✅" : "❌";
      console.log(`${icon} ${test.description.padEnd(25)}: ${width} (expected ${test.expected})`);

      if (pass) passed++;
      else failed++;
    }

    console.log("─".repeat(50));
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);

    // Test table formatting
    console.log("\n📋 Table Formatting Test:");
    const table = this.createTable(
      ["Name", "Status", "Progress"],
      [
        ["🇺🇸 USA", "✅ Active", "████████░░ 80%"],
        ["👨‍👩‍👧 Family", "⏳ Pending", "████░░░░░░ 40%"],
        ["กำ ไทย", "❌ Error", "░░░░░░░░░░ 0%"],
      ]
    );
    table.forEach(line => console.log(line));
  }

  // Create a feature status dashboard
  static createFeatureDashboard(features: Record<string, boolean>): string[] {
    const lines: string[] = [];

    lines.push(...this.createDashboard("Feature Flag Status", "Compile-time elimination analysis"));
    lines.push("");

    const featureList = Object.entries(features).map(([name, enabled]) => {
      const icon = enabled ? "✅" : "❌";
      const status = enabled ? "INCLUDED" : "ELIMINATED";
      return `${icon} ${name.padEnd(25)}: ${status}`;
    });

    lines.push(...this.formatList(featureList, 2));
    lines.push("");

    const included = Object.values(features).filter(Boolean).length;
    const total = Object.keys(features).length;
    const percentage = Math.round((included / total) * 100);

    lines.push(...this.createProgressBar(included, total, 30));
    lines.push(`📊 ${included}/${total} features enabled (${percentage}%)`);

    return lines;
  }

  private static countryCodeToFlag(countryCode: string): string {
    // Convert "US" to 🇺🇸
    const base = 127397; // Regional Indicator Symbol Letter A - 0x1F1E6
    return String.fromCodePoint(
      base + countryCode.charCodeAt(0),
      base + countryCode.charCodeAt(1)
    );
  }

  // Public wrapper for truncateWithEllipsis
  static truncateText(text: string, maxWidth: number): string {
    return this.truncateWithEllipsis(text, maxWidth);
  }

  private static truncateWithEllipsis(text: string, maxWidth: number): string {
    const ellipsis = "…";
    const ellipsisWidth = Bun.stringWidth(ellipsis);

    let currentWidth = 0;
    let result = "";

    for (const char of text) {
      const charWidth = Bun.stringWidth(char);
      if (currentWidth + charWidth + ellipsisWidth > maxWidth) {
        return result + ellipsis;
      }
      result += char;
      currentWidth += charWidth;
    }

    return result;
  }
}

// Example usage with complex Unicode
export function testStringWidth(): void {
  if (!feature("ENV_DEVELOPMENT")) return;

  TerminalWidth.testUnicodeHandling();
}

// Export utility functions for external use
export const StringUtils = {
  // Safe string width calculation
  getWidth: (text: string) => Bun.stringWidth(text),

  // Truncate text to fit width
  truncate: (text: string, maxWidth: number) =>
    TerminalWidth.truncateText(text, maxWidth),

  // Pad text to exact width
  pad: (text: string, width: number) =>
    TerminalWidth.formatCell(text, width),

  // Check if text fits in width
  fits: (text: string, width: number) =>
    Bun.stringWidth(text) <= width,
};
