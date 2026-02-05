// utils/UnicodeInspector.ts

import type { HSLColor } from "../types/api.types";
import { hslToAnsi } from "./ColorCoder";

export class UnicodeInspector {
  private readonly reset = "\x1b[0m";
  private readonly borderColor = hslToAnsi(210, 15, 50);

  createDoubleBox(width: number, height: number, color?: HSLColor): string {
    const c = color ? hslToAnsi(color.h, color.s, color.l) : this.borderColor;
    const top = `${c}╔${"═".repeat(width - 2)}╗${this.reset}\n`;
    const middle = `${c}║${" ".repeat(width - 2)}║${this.reset}\n`;
    const bottom = `${c}╚${"═".repeat(width - 2)}╝${this.reset}\n`;
    return top + middle.repeat(height - 2) + bottom;
  }

  createStatusPanel(
    title: string,
    items: Array<{
      label: string;
      value: string;
      status: "success" | "warning" | "error" | "info";
    }>,
    color?: HSLColor
  ): string {
    const panelColor = color
      ? hslToAnsi(color.h, color.s, color.l)
      : this.borderColor;
    const statusToHSL = {
      success: { h: 120, s: 70, l: 45 },
      warning: { h: 45, s: 80, l: 55 },
      error: { h: 0, s: 75, l: 50 },
      info: { h: 200, s: 70, l: 50 },
    };

    const maxLabelLen = Math.max(...items.map((i) => i.label.length));
    const maxValueLen = Math.max(...items.map((i) => i.value.length));
    const width = maxLabelLen + maxValueLen + 7;

    let output =
      panelColor + "┌" + "─".repeat(width - 2) + "┐" + this.reset + "\n";
    const titlePadded = title
      .padStart((width + title.length) / 2)
      .padEnd(width - 2);
    output +=
      panelColor +
      "│" +
      this.reset +
      titlePadded +
      panelColor +
      "│" +
      this.reset +
      "\n";
    output +=
      panelColor + "├" + "─".repeat(width - 2) + "┤" + this.reset + "\n";

    items.forEach((item) => {
      const statusColor = hslToAnsi(
        statusToHSL[item.status].h,
        statusToHSL[item.status].s,
        statusToHSL[item.status].l
      );
      const label = item.label.padEnd(maxLabelLen);
      const value = statusColor + item.value.padStart(maxValueLen) + this.reset;
      output +=
        panelColor +
        "│" +
        this.reset +
        ` ${label}: ${value} ` +
        panelColor +
        "│" +
        this.reset +
        "\n";
    });

    output +=
      panelColor + "└" + "─".repeat(width - 2) + "┘" + this.reset + "\n";
    return output;
  }

  createMatrixTable(
    headers: string[],
    rows: string[][],
    options?: {
      borderColor?: HSLColor;
      headerColor?: HSLColor;
      rowColors?: HSLColor[];
      align?: ("left" | "center" | "right")[];
    }
  ): string {
    const borderC = options?.borderColor
      ? hslToAnsi(
          options.borderColor.h,
          options.borderColor.s,
          options.borderColor.l
        )
      : this.borderColor;
    const headerC = options?.headerColor
      ? hslToAnsi(
          options.headerColor.h,
          options.headerColor.s,
          options.headerColor.l
        )
      : hslToAnsi(210, 70, 45);

    const colWidths = this.calculateColumnWidths(headers, rows);
    const align = options?.align || new Array(headers.length).fill("left");

    let output =
      borderC +
      "┌" +
      colWidths.map((w) => "─".repeat(w)).join("┬") +
      "┐" +
      this.reset +
      "\n";
    const headerRow = headers
      .map((h, i) => this.padCell(h, colWidths[i], align[i], headerC))
      .join("│");
    output += borderC + "│" + headerRow + "│" + this.reset + "\n";
    output +=
      borderC +
      "├" +
      colWidths.map((w) => "─".repeat(w)).join("┼") +
      "┤" +
      this.reset +
      "\n";

    rows.forEach((row, rowIdx) => {
      const rowColor = options?.rowColors?.[rowIdx]
        ? hslToAnsi(
            options.rowColors[rowIdx].h,
            options.rowColors[rowIdx].s,
            options.rowColors[rowIdx].l
          )
        : "";
      const rowCells = row
        .map((cell, colIdx) =>
          this.padCell(cell, colWidths[colIdx], align[colIdx], rowColor)
        )
        .join("│");
      output += borderC + "│" + rowCells + "│" + this.reset + "\n";
    });

    output +=
      borderC +
      "└" +
      colWidths.map((w) => "─".repeat(w)).join("┴") +
      "┘" +
      this.reset +
      "\n";
    return output;
  }

  createTree(
    items: Array<{ name: string; children?: typeof items; value?: string }>,
    color?: HSLColor
  ): string {
    const c = color ? hslToAnsi(color.h, color.s, color.l) : this.borderColor;

    const buildTree = (
      nodes: typeof items,
      prefix = "",
      isLast = true
    ): string => {
      let output = "";
      nodes.forEach((node, index) => {
        const isLastNode = index === nodes.length - 1;
        const currentPrefix = prefix + (isLastNode ? "└── " : "├── ");
        const nextPrefix = prefix + (isLastNode ? "    " : "│   ");
        output += `${c}${currentPrefix}${this.reset}${node.name}${node.value ? ` ${c}(${node.value})${this.reset}` : ""}\n`;
        if (node.children && node.children.length > 0) {
          output += buildTree(node.children, nextPrefix, isLastNode);
        }
      });
      return output;
    };

    return buildTree(items);
  }

  createProgressBar(
    current: number,
    total: number,
    width: number = 30,
    color?: HSLColor
  ): string {
    const c = color
      ? hslToAnsi(color.h, color.s, color.l)
      : hslToAnsi(120, 70, 45);
    const percentage = total > 0 ? current / total : 0;
    const filled = Math.floor(width * percentage);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percent = `${Math.round(percentage * 100)}%`.padStart(4);
    return `${c}${bar}${this.reset} ${percent}`;
  }

  private calculateColumnWidths(headers: string[], rows: string[][]): number[] {
    const widths = headers.map((h) => this.getStringWidth(h));
    rows.forEach((row) => {
      row.forEach((cell, idx) => {
        widths[idx] = Math.max(widths[idx], this.getStringWidth(cell));
      });
    });
    return widths.map((w) => w + 2);
  }

  private getStringWidth(str: string): number {
    return Bun.stringWidth(str);
  }

  private padCell(
    content: string,
    width: number,
    align: "left" | "center" | "right",
    color: string
  ): string {
    const contentWidth = this.getStringWidth(content);
    const diff = width - contentWidth;

    if (diff <= 0) {
      return color + content + this.reset;
    }

    if (align === "right") {
      return " ".repeat(diff) + color + content + this.reset;
    } else if (align === "center") {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return (
        " ".repeat(left) + color + content + this.reset + " ".repeat(right)
      );
    } else {
      return " " + color + content + this.reset + " ".repeat(diff - 1);
    }
  }
}
