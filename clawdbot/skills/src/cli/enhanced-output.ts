/**
 * src/cli/enhanced-output.ts
 * Enhanced CLI Output with Table Formatting
 * - Professional table display
 * - Progress bars
 * - Dynamic column widths
 * - Color support
 */

import type { BuildResult } from "../lib/executable-builder";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SkillConfig {
  id: string;
  name: string;
  version: string;
  type: string;
  enabled: boolean;
  priority: "low" | "medium" | "high";
  health: number;
  commands?: Record<string, unknown>;
  lastUsed?: string;
}

interface TableColumn {
  key: string;
  width: number;
  align?: "left" | "right" | "center";
}

interface TableOptions {
  columns?: TableColumn[];
  border?: "none" | "single" | "rounded" | "double";
  padding?: number;
  header?: {
    alignment?: "left" | "center" | "right";
    content?: string;
    style?: "bold" | "normal";
  };
  sort?: (a: any, b: any) => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Box Drawing Characters
// ═══════════════════════════════════════════════════════════════════════════

const BORDERS = {
  none: {
    topLeft: "",
    topRight: "",
    bottomLeft: "",
    bottomRight: "",
    horizontal: "",
    vertical: "",
    leftT: "",
    rightT: "",
    topT: "",
    bottomT: "",
    cross: "",
  },
  single: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    leftT: "├",
    rightT: "┤",
    topT: "┬",
    bottomT: "┴",
    cross: "┼",
  },
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    leftT: "├",
    rightT: "┤",
    topT: "┬",
    bottomT: "┴",
    cross: "┼",
  },
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    leftT: "╠",
    rightT: "╣",
    topT: "╦",
    bottomT: "╩",
    cross: "╬",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EnhancedOutput Class
// ═══════════════════════════════════════════════════════════════════════════

export class EnhancedOutput {
  /**
   * Get visible string width (accounting for ANSI codes and emojis)
   */
  static stringWidth(str: string): number {
    // Use Bun.stringWidth if available, otherwise fallback
    if (typeof Bun !== "undefined" && "stringWidth" in Bun) {
      return (Bun as any).stringWidth(str);
    }

    // Fallback: strip ANSI and count characters
    // eslint-disable-next-line no-control-regex
    const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
    // Rough emoji handling (most emojis are 2 characters wide)
    let width = 0;
    for (const char of stripped) {
      const code = char.codePointAt(0) || 0;
      if (code > 0x1f600 && code < 0x1f650) {
        width += 2; // Emoji
      } else if (code > 0x2600 && code < 0x27bf) {
        width += 2; // Symbols
      } else {
        width += 1;
      }
    }
    return width;
  }

  /**
   * Pad string to exact visual width
   */
  static padString(
    str: string,
    width: number,
    align: "left" | "right" | "center" = "left"
  ): string {
    const currentWidth = this.stringWidth(str);
    const padding = Math.max(0, width - currentWidth);

    if (align === "right") {
      return " ".repeat(padding) + str;
    } else if (align === "center") {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + str + " ".repeat(rightPad);
    }
    return str + " ".repeat(padding);
  }

  /**
   * Generate a formatted table from data
   */
  static table(data: Record<string, any>[], options: TableOptions = {}): string {
    if (data.length === 0) return "";

    const borderStyle = options.border || "single";
    const border = BORDERS[borderStyle];
    const padding = options.padding ?? 1;

    // Apply sorting if provided
    if (options.sort) {
      data = [...data].sort(options.sort);
    }

    // Get all keys from data
    const allKeys = [...new Set(data.flatMap((row) => Object.keys(row)))];

    // Build columns config
    const columns: TableColumn[] =
      options.columns ||
      allKeys.map((key) => ({
        key,
        width: Math.max(
          key.length,
          ...data.map((row) => this.stringWidth(String(row[key] ?? "")))
        ),
        align: "left" as const,
      }));

    const lines: string[] = [];
    const pad = " ".repeat(padding);

    // Calculate total width
    const contentWidth = columns.reduce(
      (sum, col) => sum + col.width + padding * 2,
      0
    );
    const totalWidth =
      contentWidth + columns.length + 1; // +1 for borders

    // Header title
    if (options.header?.content && borderStyle !== "none") {
      const headerWidth = totalWidth - 2;
      const headerContent = this.padString(
        options.header.content,
        headerWidth,
        options.header.alignment || "center"
      );
      const headerLine =
        options.header.style === "bold"
          ? `\x1b[1m${headerContent}\x1b[0m`
          : headerContent;

      lines.push(
        border.topLeft + border.horizontal.repeat(headerWidth) + border.topRight
      );
      lines.push(border.vertical + headerLine + border.vertical);
      lines.push(
        border.leftT +
          columns
            .map((col) => border.horizontal.repeat(col.width + padding * 2))
            .join(border.topT) +
          border.rightT
      );
    } else if (borderStyle !== "none") {
      // Top border
      lines.push(
        border.topLeft +
          columns
            .map((col) => border.horizontal.repeat(col.width + padding * 2))
            .join(border.topT) +
          border.topRight
      );
    }

    // Column headers
    const headerRow = columns
      .map((col) => pad + this.padString(col.key, col.width, "left") + pad)
      .join(borderStyle !== "none" ? border.vertical : " ");

    if (borderStyle !== "none") {
      lines.push(border.vertical + `\x1b[1m${headerRow}\x1b[0m` + border.vertical);
      // Header separator
      lines.push(
        border.leftT +
          columns
            .map((col) => border.horizontal.repeat(col.width + padding * 2))
            .join(border.cross) +
          border.rightT
      );
    } else {
      lines.push(`\x1b[1m${headerRow}\x1b[0m`);
      lines.push(
        columns.map((col) => "─".repeat(col.width + padding * 2)).join(" ")
      );
    }

    // Data rows
    for (const row of data) {
      const rowContent = columns
        .map((col) => {
          const value = String(row[col.key] ?? "");
          return pad + this.padString(value, col.width, col.align) + pad;
        })
        .join(borderStyle !== "none" ? border.vertical : " ");

      if (borderStyle !== "none") {
        lines.push(border.vertical + rowContent + border.vertical);
      } else {
        lines.push(rowContent);
      }
    }

    // Bottom border
    if (borderStyle !== "none") {
      lines.push(
        border.bottomLeft +
          columns
            .map((col) => border.horizontal.repeat(col.width + padding * 2))
            .join(border.bottomT) +
          border.bottomRight
      );
    }

    return lines.join("\n");
  }

  /**
   * Display build results in a formatted table
   */
  static displayBuildResults(results: BuildResult[]): void {
    const tableData = results.map((result, index) => ({
      "#": index + 1,
      Skill: result.metadata.skill?.name || "Unknown",
      Version: result.metadata.skill?.version || "1.0.0",
      Target: this.formatTarget(result.metadata.target),
      Status: result.success ? "\x1b[32m✓ Success\x1b[0m" : "\x1b[31m✗ Failed\x1b[0m",
      Size: this.formatBytes(result.size),
      Time: `${((result.stats?.buildTime || 0) / 1000).toFixed(2)}s`,
      Checksum: (result.metadata.checksum || "").slice(0, 8),
    }));

    console.log(
      this.table(tableData, {
        columns: [
          { key: "#", width: 3, align: "right" },
          { key: "Skill", width: 18 },
          { key: "Version", width: 8 },
          { key: "Target", width: 14 },
          { key: "Status", width: 12 },
          { key: "Size", width: 10, align: "right" },
          { key: "Time", width: 8, align: "right" },
          { key: "Checksum", width: 10 },
        ],
        border: "rounded",
        header: {
          alignment: "center",
          content: " BUILD RESULTS ",
          style: "bold",
        },
      })
    );
  }

  /**
   * Display skills in a formatted table
   */
  static displaySkillTable(skills: SkillConfig[]): void {
    const tableData = skills.map((skill) => ({
      Name: skill.name,
      ID: skill.id,
      Version: skill.version,
      Type: skill.type,
      Status: skill.enabled
        ? "\x1b[32m✓ Enabled\x1b[0m"
        : "\x1b[90m○ Disabled\x1b[0m",
      Priority: skill.priority,
      Health: this.formatHealth(skill.health),
      Commands: Object.keys(skill.commands || {}).length,
      "Last Used": skill.lastUsed
        ? new Date(skill.lastUsed).toLocaleDateString()
        : "Never",
    }));

    console.log(
      this.table(tableData, {
        columns: [
          { key: "Name", width: 20 },
          { key: "ID", width: 15 },
          { key: "Version", width: 8 },
          { key: "Type", width: 10 },
          { key: "Status", width: 12 },
          { key: "Priority", width: 8 },
          { key: "Health", width: 10 },
          { key: "Commands", width: 8, align: "right" },
          { key: "Last Used", width: 12 },
        ],
        border: "single",
        header: {
          alignment: "center",
          content: " SKILLS OVERVIEW ",
          style: "bold",
        },
      })
    );

    // Summary statistics
    const enabled = skills.filter((s) => s.enabled).length;
    const avgHealth =
      skills.reduce((sum, s) => sum + (s.health || 100), 0) / skills.length;

    console.log("\n\x1b[1m Summary:\x1b[0m");
    console.log(`  Total: ${skills.length}  |  Enabled: ${enabled}  |  Disabled: ${skills.length - enabled}  |  Avg Health: ${avgHealth.toFixed(1)}%`);
  }

  /**
   * Display dependency tree
   */
  static displayDependencyTree(
    dependencies: Record<string, string>
  ): void {
    const tree = Object.entries(dependencies).map(([dep, version]) => ({
      Dependency: dep,
      Version: version,
      Status: this.checkDependencyStatus(version),
    }));

    console.log(
      this.table(tree, {
        columns: [
          { key: "Dependency", width: 30 },
          { key: "Version", width: 15 },
          { key: "Status", width: 18 },
        ],
        border: "rounded",
        sort: (a, b) => a.Dependency.localeCompare(b.Dependency),
      })
    );
  }

  /**
   * Display a progress bar
   */
  static displayProgressBar(
    current: number,
    total: number,
    label: string = "",
    width: number = 40
  ): void {
    const percentage = Math.min(100, (current / total) * 100);
    const filled = Math.floor((width * percentage) / 100);
    const empty = width - filled;

    const bar = "\x1b[32m█\x1b[0m".repeat(filled) + "\x1b[90m░\x1b[0m".repeat(empty);
    const percentageText = `${percentage.toFixed(1)}%`.padStart(6);

    const labelWidth = this.stringWidth(label);
    const paddedLabel = this.padString(label, Math.max(20, labelWidth));

    process.stdout.write(
      `\r${paddedLabel} [${bar}] ${percentageText} (${current}/${total})`
    );

    if (current >= total) {
      process.stdout.write("\n");
    }
  }

  /**
   * Display a spinner with message
   */
  static createSpinner(message: string): {
    update: (msg: string) => void;
    stop: (finalMsg?: string) => void;
  } {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frameIndex = 0;
    let currentMessage = message;

    const interval = setInterval(() => {
      process.stdout.write(`\r\x1b[36m${frames[frameIndex]}\x1b[0m ${currentMessage}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);

    return {
      update: (msg: string) => {
        currentMessage = msg;
      },
      stop: (finalMsg?: string) => {
        clearInterval(interval);
        process.stdout.write(
          `\r\x1b[32m✓\x1b[0m ${finalMsg || currentMessage}\n`
        );
      },
    };
  }

  /**
   * Format health percentage with color
   */
  static formatHealth(health: number): string {
    if (health >= 90) return `\x1b[32m${health}%\x1b[0m`;
    if (health >= 70) return `\x1b[33m${health}%\x1b[0m`;
    if (health >= 50) return `\x1b[38;5;208m${health}%\x1b[0m`;
    return `\x1b[31m${health}%\x1b[0m`;
  }

  /**
   * Format bytes to human-readable size
   */
  static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format build target for display
   */
  private static formatTarget(target: string): string {
    if (!target) return "default";
    return target
      .replace("bun-", "")
      .replace("-x64", " x64")
      .replace("-arm64", " arm64");
  }

  /**
   * Check dependency status based on version string
   */
  private static checkDependencyStatus(version: string): string {
    if (version.includes("beta") || version.includes("alpha")) {
      return "\x1b[33m⚠ Pre-release\x1b[0m";
    }
    if (version.includes("rc")) {
      return "\x1b[33m🚧 RC\x1b[0m";
    }
    if (version.startsWith("0.")) {
      return "\x1b[33m○ Dev\x1b[0m";
    }
    return "\x1b[32m✓ Stable\x1b[0m";
  }

  /**
   * Print a section header
   */
  static printHeader(title: string, width: number = 60): void {
    const line = "═".repeat(width);
    const paddedTitle = this.padString(` ${title} `, width - 2, "center");
    console.log(`\n╔${line}╗`);
    console.log(`║${paddedTitle}║`);
    console.log(`╚${line}╝\n`);
  }

  /**
   * Print a success message
   */
  static success(message: string): void {
    console.log(`\x1b[32m✓\x1b[0m ${message}`);
  }

  /**
   * Print an error message
   */
  static error(message: string): void {
    console.log(`\x1b[31m✗\x1b[0m ${message}`);
  }

  /**
   * Print a warning message
   */
  static warn(message: string): void {
    console.log(`\x1b[33m⚠\x1b[0m ${message}`);
  }

  /**
   * Print an info message
   */
  static info(message: string): void {
    console.log(`\x1b[36mℹ\x1b[0m ${message}`);
  }
}

export default EnhancedOutput;
