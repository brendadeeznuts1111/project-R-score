/**
 * src/lib/cli-utils.ts
 * CLI Utility Functions
 * - Argument parsing
 * - User prompts
 * - Table formatting
 */

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Simple argument parser for CLI tools
 */
export function parseArgs(args: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "_");
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--") && !nextArg.startsWith("-")) {
        result[key] = nextArg;
        i++; // Skip next arg
      } else {
        result[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      // Short flag
      const key = arg.slice(1);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("-")) {
        result[key] = nextArg;
        i++;
      } else {
        result[key] = true;
      }
    }
  }

  return result;
}

/**
 * Get positional arguments (non-flag arguments)
 */
export function getPositionals(args: string[]): string[] {
  const positionals: string[] = [];
  let skipNext = false;

  for (let i = 0; i < args.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const arg = args[i];
    if (arg.startsWith("-")) {
      // Check if next arg is a value for this flag
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("-")) {
        skipNext = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return positionals;
}

// =============================================================================
// User Prompts
// =============================================================================

/**
 * Prompt for confirmation (y/N)
 */
export async function confirmPrompt(message: string): Promise<boolean> {
  // Auto-confirm in CI mode
  if (process.env.CI) return true;

  const { stdin, stdout } = process;

  return new Promise((resolve) => {
    stdout.write(message + " (y/N) ");

    // Read a single line
    let input = "";
    stdin.setEncoding("utf8");
    stdin.resume();

    const onData = (chunk: string) => {
      input += chunk;
      if (input.includes("\n")) {
        stdin.removeListener("data", onData);
        stdin.pause();
        const response = input.trim().toLowerCase();
        resolve(response === "y" || response === "yes");
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Prompt for text input
 */
export async function textPrompt(message: string, defaultValue?: string): Promise<string> {
  const { stdin, stdout } = process;

  const prompt = defaultValue ? `${message} [${defaultValue}]: ` : `${message}: `;

  return new Promise((resolve) => {
    stdout.write(prompt);

    let input = "";
    stdin.setEncoding("utf8");
    stdin.resume();

    const onData = (chunk: string) => {
      input += chunk;
      if (input.includes("\n")) {
        stdin.removeListener("data", onData);
        stdin.pause();
        const response = input.trim();
        resolve(response || defaultValue || "");
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Prompt for selection from list
 */
export async function selectPrompt(
  message: string,
  options: string[],
  defaultIndex: number = 0
): Promise<string> {
  const { stdout } = process;

  stdout.write(`${message}\n`);
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? ">" : " ";
    stdout.write(`  ${marker} ${i + 1}. ${opt}\n`);
  });

  const response = await textPrompt("Enter number", String(defaultIndex + 1));
  const index = parseInt(response, 10) - 1;

  if (index >= 0 && index < options.length) {
    return options[index];
  }
  return options[defaultIndex];
}

// =============================================================================
// Table Formatting
// =============================================================================

export interface TableColumn {
  key: string;
  header?: string;
  width?: number;
  align?: "left" | "right" | "center";
}

export interface TableOptions {
  columns: TableColumn[];
  border?: "none" | "simple" | "rounded";
  padding?: number;
}

/**
 * Format data as a table
 */
export function formatTable(data: Record<string, any>[], options: TableOptions): string {
  const { columns, border = "simple", padding = 1 } = options;

  // Calculate column widths
  const widths = columns.map((col) => {
    const header = col.header || col.key;
    const maxDataWidth = Math.max(
      ...data.map((row) => String(row[col.key] || "").length)
    );
    return col.width || Math.max(header.length, maxDataWidth);
  });

  // Build rows
  const pad = " ".repeat(padding);
  const lines: string[] = [];

  // Border characters
  const borders = {
    none: { h: "", v: "", tl: "", tr: "", bl: "", br: "", t: "", b: "", l: "", r: "", x: "" },
    simple: { h: "-", v: "|", tl: "+", tr: "+", bl: "+", br: "+", t: "+", b: "+", l: "+", r: "+", x: "+" },
    rounded: { h: "─", v: "│", tl: "╭", tr: "╮", bl: "╰", br: "╯", t: "┬", b: "┴", l: "├", r: "┤", x: "┼" },
  };
  const b = borders[border];

  // Helper to create horizontal line
  const hLine = (left: string, mid: string, right: string) => {
    if (border === "none") return "";
    return left + widths.map((w) => b.h.repeat(w + padding * 2)).join(mid) + right;
  };

  // Helper to format cell
  const formatCell = (value: string, width: number, align: "left" | "right" | "center" = "left") => {
    const str = String(value).slice(0, width);
    const space = width - str.length;
    if (align === "right") return " ".repeat(space) + str;
    if (align === "center") {
      const left = Math.floor(space / 2);
      return " ".repeat(left) + str + " ".repeat(space - left);
    }
    return str + " ".repeat(space);
  };

  // Top border
  if (border !== "none") {
    lines.push(hLine(b.tl, b.t, b.tr));
  }

  // Header row
  const headerCells = columns.map((col, i) => {
    const header = col.header || col.key;
    return pad + formatCell(header, widths[i], col.align) + pad;
  });
  if (border !== "none") {
    lines.push(b.v + headerCells.join(b.v) + b.v);
    lines.push(hLine(b.l, b.x, b.r));
  } else {
    lines.push(headerCells.join("  "));
  }

  // Data rows
  for (const row of data) {
    const cells = columns.map((col, i) => {
      const value = String(row[col.key] || "");
      return pad + formatCell(value, widths[i], col.align) + pad;
    });
    if (border !== "none") {
      lines.push(b.v + cells.join(b.v) + b.v);
    } else {
      lines.push(cells.join("  "));
    }
  }

  // Bottom border
  if (border !== "none") {
    lines.push(hLine(b.bl, b.b, b.br));
  }

  return lines.join("\n");
}

// =============================================================================
// Progress Indicators
// =============================================================================

/**
 * Create a simple progress bar
 */
export function progressBar(current: number, total: number, width: number = 40): string {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percent.toFixed(0)}%`;
}

/**
 * Create a spinner instance
 */
export function createSpinner(message: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      timer = setInterval(() => {
        process.stdout.write(`\r${frames[frameIndex]} ${message}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },
    stop(finalMessage?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      process.stdout.write(`\r${" ".repeat(message.length + 3)}\r`);
      if (finalMessage) {
        console.log(finalMessage);
      }
    },
    succeed(msg?: string) {
      this.stop(`✓ ${msg || message}`);
    },
    fail(msg?: string) {
      this.stop(`✗ ${msg || message}`);
    },
  };
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

// =============================================================================
// ANSI Colors (for terminals that support them)
// =============================================================================

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

/**
 * Apply color to string
 */
export function colorize(text: string, color: keyof typeof colors): string {
  // Disable colors in CI or when NO_COLOR is set
  if (process.env.NO_COLOR || process.env.CI) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

export default {
  parseArgs,
  getPositionals,
  confirmPrompt,
  textPrompt,
  selectPrompt,
  formatTable,
  progressBar,
  createSpinner,
  formatBytes,
  formatDuration,
  truncate,
  colorize,
  colors,
};
