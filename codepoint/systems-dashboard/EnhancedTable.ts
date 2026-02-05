// EnhancedTable.ts - Ultimate table formatter with Unicode art

import type { HSLColor } from "./types/api.types";

/**
 * Enhanced Bun.inspect.table with Unicode art, HSL colors, and 13-byte optimization
 */
export class EnhancedTable {
  private static readonly RESET = "\x1b[0m";
  private static readonly BYTE_ALIGNMENT = 13; // Core 13-byte philosophy

  // Unicode border styles
  private static readonly BORDER_STYLES = {
    single: {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
      topMiddle: "┬",
      bottomMiddle: "┴",
      middleLeft: "├",
      middleRight: "┤",
      cross: "┼",
    },
    double: {
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      horizontal: "═",
      vertical: "║",
      topMiddle: "╦",
      bottomMiddle: "╩",
      middleLeft: "╠",
      middleRight: "╣",
      cross: "╬",
    },
    rounded: {
      topLeft: "╭",
      topRight: "╮",
      bottomLeft: "╰",
      bottomRight: "╯",
      horizontal: "─",
      vertical: "│",
      topMiddle: "┬",
      bottomMiddle: "┴",
      middleLeft: "├",
      middleRight: "┤",
      cross: "┼",
    },
    bold: {
      topLeft: "┏",
      topRight: "┓",
      bottomLeft: "┗",
      bottomRight: "┛",
      horizontal: "━",
      vertical: "┃",
      topMiddle: "┳",
      bottomMiddle: "┻",
      middleLeft: "┣",
      middleRight: "┫",
      cross: "╋",
    },
    minimal: {
      topLeft: " ",
      topRight: " ",
      bottomLeft: " ",
      bottomRight: " ",
      horizontal: " ",
      vertical: "│",
      topMiddle: " ",
      bottomMiddle: " ",
      middleLeft: " ",
      middleRight: " ",
      cross: " ",
    },
    ascii: {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      horizontal: "-",
      vertical: "|",
      topMiddle: "+",
      bottomMiddle: "+",
      middleLeft: "+",
      middleRight: "+",
      cross: "+",
    },
  } as const;

  /**
   * Enhanced version of Bun.inspect.table with Unicode borders and HSL colors
   * Optimized for Bun's JavaScriptCore runtime
   */
  static table(
    tabularData: any[] | Record<string, any>,
    properties?: string[] | readonly string[],
    options?: {
      borderStyle?: keyof typeof EnhancedTable.BORDER_STYLES;
      borderColor?: HSLColor;
      headerColor?: HSLColor;
      rowColors?: HSLColor[] | ((rowIndex: number) => HSLColor);
      align?:
        | "left"
        | "center"
        | "right"
        | Record<string, "left" | "center" | "right">;
      showRowNumbers?: boolean;
      showColumnNumbers?: boolean;
      compact?: boolean;
      maxWidth?: number;
      artStyle?: "none" | "simple" | "detailed" | "block";
      colors?: boolean;
    }
  ): string {
    // Default options
    const opts = {
      borderStyle: "single" as const,
      borderColor: { h: 210, s: 15, l: 50 } as HSLColor,
      headerColor: { h: 200, s: 70, l: 45 } as HSLColor,
      align: "left" as const,
      showRowNumbers: true,
      showColumnNumbers: false,
      compact: false,
      maxWidth: process.stdout.columns || 80,
      artStyle: "none" as const,
      colors: true,
      ...options,
    };

    /**
     * Enhanced HSL to ANSI color conversion using Bun.color()
     * Optimized for JavaScriptCore and Bun's color system
     */
    const hslToAnsi = (color: HSLColor): string => {
      if (!opts.colors) return "";

      try {
        // Use Bun.color() for better color accuracy and terminal compatibility
        const cssColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        const ansiColor = Bun.color(cssColor, "ansi");
        return ansiColor || "\x1b[37m"; // Fallback to white
      } catch {
        // Fallback to simplified HSL to ANSI conversion
        const { h, s, l } = color;
        if (l < 20) return "\x1b[30m"; // Black
        if (l > 80) return "\x1b[37m"; // White
        if (s < 30) return l > 50 ? "\x1b[90m" : "\x1b[37m"; // Gray scale

        // Basic hue mapping
        if (h >= 0 && h < 30) return "\x1b[31m"; // Red
        if (h >= 30 && h < 90) return "\x1b[33m"; // Yellow
        if (h >= 90 && h < 150) return "\x1b[32m"; // Green
        if (h >= 150 && h < 210) return "\x1b[36m"; // Cyan
        if (h >= 210 && h < 270) return "\x1b[34m"; // Blue
        if (h >= 270 && h < 330) return "\x1b[35m"; // Magenta
        return "\x1b[31m"; // Red fallback
      }
    };

    // Get border characters
    const border = this.BORDER_STYLES[opts.borderStyle];
    const borderColor = hslToAnsi(opts.borderColor);
    const headerColor = hslToAnsi(opts.headerColor);

    // Normalize input data
    let rows: any[];
    let columns: string[];

    if (Array.isArray(tabularData)) {
      rows = tabularData;
      if (properties && properties.length > 0) {
        columns = Array.from(properties);
      } else {
        // Get all unique property names
        columns = Array.from(
          new Set(rows.flatMap((row) => Object.keys(row || {})))
        );
      }
    } else {
      // Object with array values
      const keys = Object.keys(tabularData);
      const maxLength = Math.max(
        ...keys.map((k) => (tabularData[k] || []).length)
      );
      rows = Array.from({ length: maxLength }, (_, i) => {
        const row: Record<string, any> = {};
        keys.forEach((key) => {
          row[key] = (tabularData as any)[key][i];
        });
        return row;
      });
      columns =
        properties && properties.length > 0 ? Array.from(properties) : keys;
    }

    // Add row number column if enabled
    if (opts.showRowNumbers) {
      columns = ["#", ...columns];
      rows = rows.map((row, i) => ({ "#": i, ...row }));
    }

    // Calculate column widths using Bun.stringWidth() for Unicode accuracy
    const colWidths: number[] = columns.map(
      (col) => this.getStringWidth(col) + 2
    );

    rows.forEach((row) => {
      columns.forEach((col, colIndex) => {
        const value = row[col];
        const strValue =
          value === undefined
            ? ""
            : value === null
              ? "null"
              : Bun.inspect(value, { colors: false }).split("\n")[0];
        const width = this.getStringWidth(strValue) + 2;
        if (width > colWidths[colIndex]) {
          colWidths[colIndex] = Math.min(
            width,
            Math.floor((opts.maxWidth - 3) / columns.length)
          );
        }
      });
    });

    // Apply 13-byte alignment optimization
    if (this.BYTE_ALIGNMENT > 0) {
      const totalWidth =
        colWidths.reduce((a, b) => a + b, 0) + columns.length + 1;
      const adjustment = totalWidth % this.BYTE_ALIGNMENT;
      if (adjustment > 0) {
        const extra = this.BYTE_ALIGNMENT - adjustment;
        const colIndex = Math.floor(Math.random() * columns.length);
        colWidths[colIndex] += extra;
      }
    }

    // Build table
    let output = "";

    // Top border
    output += borderColor + border.topLeft;
    colWidths.forEach((width, i) => {
      output += border.horizontal.repeat(width);
      if (i < colWidths.length - 1) output += border.topMiddle;
    });
    output += border.topRight + this.RESET + "\n";

    // Header row
    output += borderColor + border.vertical + this.RESET + " ";
    columns.forEach((col, colIndex) => {
      const align =
        typeof opts.align === "string" ? opts.align : opts.align[col] || "left";
      const cell = this.padCell(col, colWidths[colIndex] - 2, align);
      output += headerColor + cell + this.RESET + " ";
      output += borderColor + border.vertical + this.RESET + " ";
    });
    output = output.trimEnd() + "\n";

    // Middle border
    output += borderColor + border.middleLeft;
    colWidths.forEach((width, i) => {
      output += border.horizontal.repeat(width);
      if (i < colWidths.length - 1) output += border.cross;
    });
    output += border.middleRight + this.RESET + "\n";

    // Data rows
    rows.forEach((row, rowIndex) => {
      const rowColor = opts.rowColors
        ? Array.isArray(opts.rowColors)
          ? hslToAnsi(opts.rowColors[rowIndex % opts.rowColors.length])
          : typeof opts.rowColors === "function"
            ? hslToAnsi(opts.rowColors(rowIndex))
            : ""
        : "";

      output += borderColor + border.vertical + this.RESET + " ";

      columns.forEach((col, colIndex) => {
        const value = row[col];
        const strValue =
          value === undefined
            ? ""
            : value === null
              ? "null"
              : Bun.inspect(value, { colors: false }).split("\n")[0];

        const align =
          typeof opts.align === "string"
            ? opts.align
            : opts.align[col] || "left";
        const cell = this.padCell(strValue, colWidths[colIndex] - 2, align);

        output += rowColor + cell + this.RESET + " ";
        output += borderColor + border.vertical + this.RESET + " ";
      });

      output = output.trimEnd() + "\n";
    });

    // Bottom border
    output += borderColor + border.bottomLeft;
    colWidths.forEach((width, i) => {
      output += border.horizontal.repeat(width);
      if (i < colWidths.length - 1) output += border.bottomMiddle;
    });
    output += border.bottomRight + this.RESET + "\n";

    // Add Unicode art if requested
    if (opts.artStyle !== "none") {
      output += this.addUnicodeArt(opts.artStyle, rows.length, columns.length);
    }

    return output;
  }

  /**
   * Create a 13-byte optimized table with custom display
   * Enhanced with byte sorting capabilities
   */
  static table13(
    data: any[],
    options?: {
      showBits?: boolean;
      showHex?: boolean;
      compress?: boolean;
      visual?: boolean;
      sortBy?: "index" | "hex" | "bits" | "value" | "bytes";
      sortOrder?: "asc" | "desc";
    }
  ): string {
    const rows = data.map((item, i) => {
      const byteView = new Uint8Array(13);
      const view = new DataView(byteView.buffer);

      // Pack into 13 bytes
      if (typeof item === "number") {
        view.setUint8(0, 1); // Type: number
        view.setFloat64(1, item);
      } else if (typeof item === "string") {
        view.setUint8(0, 2); // Type: string
        const encoder = new TextEncoder();
        const bytes = encoder.encode(item.substring(0, 12));
        byteView.set(bytes, 1);
      } else if (typeof item === "boolean") {
        view.setUint8(0, 3); // Type: boolean
        view.setUint8(1, item ? 1 : 0);
      }

      const hex = Array.from(byteView)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const bits = Array.from(byteView)
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" ");

      const visual = Array.from(byteView)
        .map((b) => {
          if (b === 0) return "░";
          if (b < 64) return "▒";
          if (b < 128) return "▓";
          if (b < 192) return "█";
          return "█";
        })
        .join("");

      return {
        Index: i,
        Value: Bun.inspect(item, { colors: false }).substring(0, 20),
        Hex: `0x${hex}`,
        Bits: bits,
        Visual: visual,
        Bytes: Array.from(byteView), // Store raw bytes for sorting
        OriginalValue: item,
      };
    });

    // Sort by bytes if requested
    if (options?.sortBy) {
      const sortBy = options.sortBy;
      const sortOrder = options.sortOrder || "asc";

      rows.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "index":
            comparison = a.Index - b.Index;
            break;
          case "hex":
            comparison = a.Hex.localeCompare(b.Hex);
            break;
          case "bits":
            comparison = a.Bits.localeCompare(b.Bits);
            break;
          case "value":
            comparison = a.Value.localeCompare(b.Value);
            break;
          case "bytes":
            // Compare byte arrays lexicographically
            for (let i = 0; i < 13; i++) {
              if (a.Bytes[i] !== b.Bytes[i]) {
                comparison = a.Bytes[i] - b.Bytes[i];
                break;
              }
            }
            break;
        }

        return sortOrder === "desc" ? -comparison : comparison;
      });
    }

    return this.table(
      rows,
      options?.visual
        ? ["Index", "Value", "Visual", "Hex"]
        : ["Index", "Value", "Hex", "Bits"],
      {
        borderStyle: "double",
        borderColor: { h: 280, s: 60, l: 45 },
        headerColor: { h: 120, s: 70, l: 45 },
        compact: options?.compress,
        artStyle: "simple",
      }
    );
  }

  /**
   * Create a color-coded performance matrix
   */
  static performanceMatrix(
    metrics: Array<{
      operation: string;
      time: string;
      ops: string;
      status: string;
    }>,
    thresholds?: {
      warning?: number; // milliseconds
      critical?: number; // milliseconds
    }
  ): string {
    const defaultThresholds = { warning: 100, critical: 500 };
    const thresh = { ...defaultThresholds, ...thresholds };

    const coloredRows = metrics.map((metric) => {
      const timeMs = parseFloat(metric.time.replace(/[^0-9.]/g, ""));
      const statusColor = metric.status.includes("✅")
        ? { h: 120, s: 80, l: 50 } // Green
        : metric.status.includes("⚠️")
          ? { h: 45, s: 80, l: 55 } // Yellow
          : metric.status.includes("❌")
            ? { h: 0, s: 80, l: 50 } // Red
            : { h: 200, s: 60, l: 50 }; // Blue

      const timeColor =
        timeMs > thresh.critical
          ? { h: 0, s: 80, l: 50 } // Red
          : timeMs > thresh.warning
            ? { h: 45, s: 80, l: 55 } // Yellow
            : { h: 120, s: 80, l: 50 }; // Green

      return {
        ...metric,
        _timeColor: timeColor,
        _statusColor: statusColor,
      };
    });

    return this.table(coloredRows, ["operation", "time", "ops", "status"], {
      borderStyle: "rounded",
      headerColor: { h: 210, s: 70, l: 45 },
      rowColors: coloredRows.map((r) => r._timeColor),
      align: {
        operation: "left",
        time: "right",
        ops: "right",
        status: "center",
      },
      compact: true,
      artStyle: "detailed",
    });
  }

  /**
   * Create a tree structure table
   */
  static treeTable(
    items: Array<{
      name: string;
      type: string;
      size: string;
      children?: any[];
      level?: number;
    }>,
    options?: {
      showIcons?: boolean;
      indentSize?: number;
      colorByType?: boolean;
    }
  ): string {
    const opts = {
      showIcons: true,
      indentSize: 2,
      colorByType: true,
      ...options,
    };

    const flattenTree = (nodes: typeof items, level = 0): any[] => {
      const result: any[] = [];

      nodes.forEach((node) => {
        const indent = " ".repeat(level * opts.indentSize);
        const icon = opts.showIcons
          ? node.type === "folder"
            ? "📁 "
            : node.type === "file"
              ? "📄 "
              : node.type === "config"
                ? "⚙️ "
                : "📌 "
          : "";

        result.push({
          Name: indent + icon + node.name,
          Type: node.type,
          Size: node.size || "-",
          _level: level,
          _hasChildren: !!node.children?.length,
        });

        if (node.children) {
          result.push(...flattenTree(node.children, level + 1));
        }
      });

      return result;
    };

    const flatItems = flattenTree(items);

    const typeToColor: Record<string, HSLColor> = {
      folder: { h: 45, s: 80, l: 55 },
      file: { h: 200, s: 70, l: 50 },
      config: { h: 280, s: 60, l: 45 },
      default: { h: 120, s: 40, l: 50 },
    };

    const rowColors = flatItems.map(
      (item) =>
        typeToColor[item.Type as keyof typeof typeToColor] ||
        typeToColor.default
    );

    return this.table(flatItems, ["Name", "Type", "Size"], {
      borderStyle: "minimal",
      headerColor: { h: 210, s: 20, l: 50 },
      rowColors,
      align: { Name: "left", Type: "center", Size: "right" },
      showRowNumbers: false,
    });
  }

  /**
   * Create a progress bar table for multiple items
   */
  static progressTable(
    items: Array<{
      name: string;
      current: number;
      total: number;
      status?: "pending" | "running" | "completed" | "failed";
    }>,
    options?: {
      showPercentage?: boolean;
      showBar?: boolean;
      width?: number;
    }
  ): string {
    const opts = { showPercentage: true, showBar: true, width: 20, ...options };

    const rows = items.map((item) => {
      const percentage = item.total > 0 ? (item.current / item.total) * 100 : 0;
      const bar = opts.showBar
        ? this.createProgressBar(percentage, opts.width)
        : "";
      const pct = opts.showPercentage ? `${percentage.toFixed(1)}%` : "";

      const statusIcon =
        item.status === "completed"
          ? "✅"
          : item.status === "running"
            ? "⏳"
            : item.status === "failed"
              ? "❌"
              : "⏸️";

      return {
        Name: item.name,
        Progress: bar,
        Current: item.current,
        Total: item.total,
        Percentage: pct,
        Status: statusIcon,
      };
    });

    const statusToColor = (status: string): HSLColor => {
      return status.includes("✅")
        ? { h: 120, s: 80, l: 50 }
        : status.includes("❌")
          ? { h: 0, s: 80, l: 50 }
          : status.includes("⏳")
            ? { h: 45, s: 80, l: 55 }
            : { h: 210, s: 40, l: 50 };
    };

    const rowColors = rows.map((row) => statusToColor(row.Status));

    return this.table(
      rows,
      ["Name", "Progress", "Current", "Total", "Percentage", "Status"],
      {
        borderStyle: "single",
        headerColor: { h: 200, s: 70, l: 45 },
        rowColors,
        align: {
          Name: "left",
          Progress: "left",
          Current: "right",
          Total: "right",
          Percentage: "right",
          Status: "center",
        },
        compact: true,
      }
    );
  }

  /**
   * Extend Bun.inspect with enhanced table capabilities
   * This method patches Bun.inspect.table to use EnhancedTable
   */
  static patchBunInspect(): void {
    const originalTable = Bun.inspect.table;

    // Store original for potential restoration
    (EnhancedTable as any)._originalTable = originalTable;

    // Create patched version
    const patchedTable = function (
      tabularData: any,
      propertiesOrOptions?: any,
      options?: any
    ): string {
      // Handle different Bun.inspect.table overloads
      let properties: string[] | undefined;
      let opts: any = {};

      if (Array.isArray(propertiesOrOptions)) {
        properties = propertiesOrOptions;
        opts = options || {};
      } else if (
        typeof propertiesOrOptions === "object" &&
        propertiesOrOptions !== null
      ) {
        properties = undefined;
        opts = propertiesOrOptions;
      }

      // If enhanced options are provided, use EnhancedTable
      if (
        opts &&
        (opts.borderStyle ||
          opts.borderColor ||
          opts.headerColor ||
          opts.rowColors ||
          opts.artStyle ||
          opts.showRowNumbers !== undefined)
      ) {
        return EnhancedTable.table(tabularData, properties, opts);
      }

      // Otherwise, fall back to original implementation
      return originalTable(tabularData, propertiesOrOptions, options);
    };

    Bun.inspect.table = patchedTable as any;
  }

  /**
   * Restore original Bun.inspect.table
   */
  static restoreBunInspect(): void {
    if ((EnhancedTable as any)._originalTable) {
      Bun.inspect.table = (EnhancedTable as any)._originalTable;
      delete (EnhancedTable as any)._originalTable;
    }
  }

  // Helper methods optimized for Bun and JavaScriptCore

  /**
   * Get string width using Bun.stringWidth() for accurate Unicode handling
   * STRATEGIC RECOMMENDATION: Leverage Bun.stringWidth()
   */
  private static getStringWidth(str: string): number {
    return Bun.stringWidth(str);
  }

  /**
   * Pad cell content with proper Unicode support
   */
  private static padCell(
    content: string,
    width: number,
    align: "left" | "center" | "right"
  ): string {
    const contentWidth = this.getStringWidth(content);
    const padding = width - contentWidth;

    if (padding <= 0) return content;

    switch (align) {
      case "right":
        return " ".repeat(padding) + content;
      case "center":
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return " ".repeat(left) + content + " ".repeat(right);
      default: // left
        return content + " ".repeat(padding);
    }
  }

  /**
   * Create progress bar with Unicode block characters
   */
  private static createProgressBar(percentage: number, width: number): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;

    const blocks = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
    const fullBlocks = Math.floor(filled);
    const partialIndex = Math.floor(
      (filled - fullBlocks) * (blocks.length - 1)
    );

    let bar = "█".repeat(fullBlocks);
    if (fullBlocks < width) {
      bar += blocks[partialIndex] || " ";
      bar += "░".repeat(Math.max(0, empty - 1));
    }

    return bar.substring(0, width);
  }

  /**
   * Add Unicode art with lazy loading for better performance
   * STRATEGIC RECOMMENDATION: Follow Lazy Loading Pattern
   */
  private static addUnicodeArt(
    style: "simple" | "detailed" | "block",
    rows: number,
    cols: number
  ): string {
    // Lazy initialization of art templates
    if (!this._artTemplates) {
      this._artTemplates = {
        simple: `
        📊 Table Summary:
        ┌──────────────┐
        │ Rows: ${rows.toString().padEnd(6)} │
        │ Cols: ${cols.toString().padEnd(6)} │
        └──────────────┘
      `,
        detailed: `
        ╔══════════════════════════════╗
        ║       📋 TABLE REPORT        ║
        ╠══════════════════════════════╣
        ║ Rows: ${rows.toString().padEnd(8)} Columns: ${cols.toString().padEnd(8)} ║
        ║ Memory: ${(rows * cols * 13).toString().padEnd(6)} bytes (13-byte aligned) ║
        ╚══════════════════════════════╝
      `,
        block: `
        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        ░░      TABLE VISUALIZATION        ░░
        ░░  Rows: █${"█".repeat(Math.min(rows, 10))}${"░".repeat(Math.max(0, 10 - rows))}  ░░
        ░░  Cols: █${"█".repeat(Math.min(cols, 10))}${"░".repeat(Math.max(0, 10 - cols))}  ░░
        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
      `,
      };
    }

    return this._artTemplates[style];
  }

  // Lazy-loaded art templates cache
  private static _artTemplates: Record<string, string> | null = null;
}

// Custom inspect implementation for 13-byte objects
class Config13Byte {
  public version: number;
  public registryHash: number;
  public featureFlags: number;
  public terminalMode: number;
  public rows: number;
  public cols: number;

  constructor(
    version: number,
    registryHash: number,
    featureFlags: number,
    terminalMode: number,
    rows: number,
    cols: number
  ) {
    this.version = version;
    this.registryHash = registryHash;
    this.featureFlags = featureFlags;
    this.terminalMode = terminalMode;
    this.rows = rows;
    this.cols = cols;
  }

  [Bun.inspect.custom]() {
    return EnhancedTable.table(
      [
        {
          Field: "Version",
          Value: `v${this.version}`,
          Hex: `0x${this.version.toString(16).padStart(2, "0")}`,
          Bits: this.version.toString(2).padStart(8, "0"),
        },
        {
          Field: "Registry Hash",
          Value: `${this.registryHash}`,
          Hex: `0x${this.registryHash.toString(16).padStart(8, "0")}`,
          Bits: this.registryHash.toString(2).padStart(32, "0"),
        },
        {
          Field: "Feature Flags",
          Value: `${this.featureFlags}`,
          Hex: `0x${this.featureFlags.toString(16).padStart(2, "0")}`,
          Bits: this.featureFlags.toString(2).padStart(8, "0"),
        },
        {
          Field: "Terminal Mode",
          Value: `Mode ${this.terminalMode}`,
          Hex: `0x${this.terminalMode.toString(16).padStart(2, "0")}`,
          Bits: this.terminalMode.toString(2).padStart(8, "0"),
        },
        {
          Field: "Display",
          Value: `${this.rows}×${this.cols}`,
          Hex: `0x${this.rows.toString(16).padStart(2, "0")}${this.cols.toString(16).padStart(4, "0")}`,
          Bits: `${this.rows.toString(2).padStart(8, "0")} ${this.cols.toString(2).padStart(16, "0")}`,
        },
      ],
      undefined,
      {
        borderStyle: "double",
        borderColor: { h: 120, s: 70, l: 45 },
        headerColor: { h: 210, s: 70, l: 45 },
        align: { Field: "left", Value: "center", Hex: "center", Bits: "left" },
        showRowNumbers: false,
        artStyle: "detailed",
      }
    );
  }
}
