/**
 * ⚡ STREAMING LOG DOMINION
 * Bun 1.3.1+ FileHandle.readLines() for backpressure-aware iteration
 *
 * Features:
 * - Zero-copy line-by-line streaming
 * - Memory efficient (no full file load)
 * - ANSI color support for log levels
 */

import { open, type FileHandle } from "node:fs/promises";

type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

const ANSI = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

const LOG_COLORS: Record<LogLevel, string> = {
  ERROR: ANSI.red,
  WARN: ANSI.yellow,
  INFO: ANSI.blue,
  DEBUG: ANSI.gray,
};

/**
 * Stream log file line-by-line with optional filtering
 */
export async function streamLogs(
  path: string,
  options: {
    filter?: LogLevel[];
    onLine?: (line: string, level?: LogLevel) => void;
    colorize?: boolean;
  } = {}
): Promise<void> {
  const { filter, onLine, colorize = true } = options;
  let file: FileHandle | null = null;

  try {
    file = await open(path);

    for await (const line of file.readLines({ encoding: "utf8" })) {
      // Detect log level
      const level = detectLogLevel(line);

      // Filter if specified
      if (filter && level && !filter.includes(level)) {
        continue;
      }

      // Custom handler or default output
      if (onLine) {
        onLine(line, level);
      } else {
        const output = colorize && level ? `${LOG_COLORS[level]}${line}${ANSI.reset}` : line;
        process.stdout.write(output + "\n");
      }
    }
  } finally {
    await file?.close();
  }
}

/**
 * Stream only errors from log file
 */
export async function streamErrors(path: string): Promise<string[]> {
  const errors: string[] = [];

  await streamLogs(path, {
    filter: ["ERROR"],
    onLine: (line) => errors.push(line),
  });

  return errors;
}

/**
 * Tail last N lines of a log file (memory efficient)
 */
export async function tailLogs(path: string, lines: number = 50): Promise<string[]> {
  const buffer: string[] = [];
  let file: FileHandle | null = null;

  try {
    file = await open(path);

    for await (const line of file.readLines({ encoding: "utf8" })) {
      buffer.push(line);
      if (buffer.length > lines) {
        buffer.shift();
      }
    }
  } finally {
    await file?.close();
  }

  return buffer;
}

/**
 * Count log entries by level
 */
export async function countLogLevels(path: string): Promise<Record<LogLevel, number>> {
  const counts: Record<LogLevel, number> = {
    ERROR: 0,
    WARN: 0,
    INFO: 0,
    DEBUG: 0,
  };

  let file: FileHandle | null = null;

  try {
    file = await open(path);

    for await (const line of file.readLines({ encoding: "utf8" })) {
      const level = detectLogLevel(line);
      if (level) {
        counts[level]++;
      }
    }
  } finally {
    await file?.close();
  }

  return counts;
}

/**
 * Detect log level from line content
 */
function detectLogLevel(line: string): LogLevel | undefined {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("[ERR]")) return "ERROR";
  if (upper.includes("WARN") || upper.includes("[WRN]")) return "WARN";
  if (upper.includes("INFO") || upper.includes("[INF]")) return "INFO";
  if (upper.includes("DEBUG") || upper.includes("[DBG]")) return "DEBUG";
  return undefined;
}

/**
 * Watch log file for new entries (live tail)
 * Uses polling since Bun.file doesn't have a watch method
 */
export async function watchLogs(
  path: string,
  onLine: (line: string, level?: LogLevel) => void
): Promise<() => void> {
  const stat = await Bun.file(path).stat();
  let lastSize = stat?.size ?? 0;

  const check = async () => {
    const currentSize = (await Bun.file(path).stat()).size;
    if (currentSize > lastSize) {
      // Read new content
      const file = Bun.file(path);
      const content = await file.text();
      const newContent = content.slice(lastSize);
      const newLines = newContent.split("\n").filter(Boolean);

      for (const line of newLines) {
        onLine(line, detectLogLevel(line));
      }

      lastSize = currentSize;
    }
  };

  // Poll for changes
  const interval = setInterval(check, 1000);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
}
