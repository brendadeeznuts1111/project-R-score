/**
 * Structured logging for URLPattern observability.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export class Logger {
  private enabled: boolean;
  private minLevel: LogLevel;

  constructor(enabled = true, minLevel: LogLevel = "info") {
    this.enabled = enabled;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message: `[URLPattern] ${message}`,
      context,
      timestamp: Date.now(),
    };

    switch (level) {
      case "debug":
        console.debug(entry.message, context || "");
        break;
      case "info":
        console.info(entry.message, context || "");
        break;
      case "warn":
        console.warn(entry.message, context || "");
        break;
      case "error":
        console.error(entry.message, context || "");
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("error", message, context);
  }
}

export const logger = new Logger(
  process.env.NODE_ENV !== "production",
  (process.env.LOG_LEVEL as LogLevel) || "info"
);
