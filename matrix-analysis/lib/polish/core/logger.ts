// lib/polish/core/logger.ts - Unified logging with polish
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, colors, ANSI } from "./runtime.ts";
import type { ErrorSeverity } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Log Level Icons
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
  critical: "⚡",
  debug: "⚙",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Logger Class
// ─────────────────────────────────────────────────────────────────────────────

export interface LoggerOptions {
  prefix?: string;
  showTimestamp?: boolean;
  debug?: boolean;
}

export class Logger {
  private prefix: string;
  private showTimestamp: boolean;
  private debugEnabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ?? "";
    this.showTimestamp = options.showTimestamp ?? false;
    this.debugEnabled = options.debug ?? false;
  }

  private formatMessage(
    level: ErrorSeverity | "success" | "debug",
    message: string
  ): string {
    const parts: string[] = [];

    if (this.showTimestamp) {
      const ts = new Date().toISOString().slice(11, 23);
      parts.push(colors.dim(`[${ts}]`));
    }

    if (this.prefix) {
      parts.push(colors.dim(`[${this.prefix}]`));
    }

    const icon = ICONS[level] ?? ICONS.info;
    const colorFn = this.getColorFn(level);
    parts.push(colorFn(`${icon} ${message}`));

    return parts.join(" ");
  }

  private getColorFn(level: ErrorSeverity | "success" | "debug") {
    switch (level) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "error":
      case "critical":
        return colors.error;
      case "debug":
        return colors.dim;
      default:
        return colors.info;
    }
  }

  info(message: string): void {
    console.log(this.formatMessage("info", message));
  }

  success(message: string): void {
    console.log(this.formatMessage("success", message));
  }

  warning(message: string): void {
    console.warn(this.formatMessage("warning", message));
  }

  error(message: string): void {
    console.error(this.formatMessage("error", message));
  }

  critical(message: string): void {
    console.error(this.formatMessage("critical", message));
  }

  debug(message: string): void {
    if (this.debugEnabled) {
      console.log(this.formatMessage("debug", message));
    }
  }

  // Log with context object
  withContext(
    level: ErrorSeverity,
    message: string,
    context: Record<string, unknown>
  ): void {
    const formatted = this.formatMessage(level, message);
    const contextStr = colors.dim(
      `\n  ${JSON.stringify(context, null, 2).replace(/\n/g, "\n  ")}`
    );
    console.log(formatted + contextStr);
  }

  // Boxed message for important notices
  box(message: string, title?: string): void {
    const width = Math.min(Runtime.getTerminalWidth() - 4, 60);
    const lines = this.wrapText(message, width - 4);

    const top = `╭${"─".repeat(width - 2)}╮`;
    const bottom = `╰${"─".repeat(width - 2)}╯`;

    console.log(colors.info(top));

    if (title) {
      const titlePadded = ` ${title} `.padStart(
        (width - 2 + title.length + 2) / 2
      ).padEnd(width - 2);
      console.log(colors.info(`│${colors.bold(titlePadded)}│`));
      console.log(colors.info(`├${"─".repeat(width - 2)}┤`));
    }

    for (const line of lines) {
      const padded = ` ${line}`.padEnd(width - 2);
      console.log(colors.info(`│${padded}│`));
    }

    console.log(colors.info(bottom));
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Logger Instance
// ─────────────────────────────────────────────────────────────────────────────

export const logger = new Logger();
