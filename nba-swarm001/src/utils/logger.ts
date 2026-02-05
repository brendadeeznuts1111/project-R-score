/**
 * Structured logging utility
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableFileOutput: boolean;
  filePath?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private config: LoggerConfig;
  private fileHandle: FileSystemWritableFileStream | null = null;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.initializeFileOutput();
  }

  private async initializeFileOutput() {
    if (this.config.enableFileOutput && this.config.filePath) {
      try {
        const file = Bun.file(this.config.filePath);
        this.fileHandle = await file.writable();
      } catch (error) {
        console.warn("Failed to initialize file output:", error);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    let message = `[${timestamp}] ${level} ${entry.message}`;

    if (entry.context) {
      message += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      message += `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
    }

    return message;
  }

  private async writeLog(entry: LogEntry) {
    const message = this.formatMessage(entry);

    // Console output
    switch (entry.level) {
      case "debug":
        console.debug(message);
        break;
      case "info":
        console.info(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;
    }

    // File output
    if (this.fileHandle && this.config.enableFileOutput) {
      try {
        await this.fileHandle.write(new TextEncoder().encode(message + "\n"));
      } catch (error) {
        console.warn("Failed to write to log file:", error);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog("debug")) {
      this.writeLog({
        level: "debug",
        message,
        timestamp: Date.now(),
        context,
      });
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog("info")) {
      this.writeLog({
        level: "info",
        message,
        timestamp: Date.now(),
        context,
      });
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (this.shouldLog("warn")) {
      this.writeLog({
        level: "warn",
        message,
        timestamp: Date.now(),
        context,
      });
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    if (this.shouldLog("error")) {
      this.writeLog({
        level: "error",
        message,
        timestamp: Date.now(),
        context,
        error,
      });
    }
  }

  performance(operation: string, durationNs: number, context?: Record<string, unknown>) {
    const durationMs = durationNs / 1_000_000;
    this.debug(`Performance: ${operation} took ${durationMs.toFixed(3)}ms`, {
      ...context,
      durationNs,
      durationMs,
    });
  }

  async close() {
    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = null;
    }
  }
}

// Default logger instance
let defaultLogger: Logger | null = null;

export function getLogger(config?: LoggerConfig): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(
      config || {
        level: "info",
        enableFileOutput: false,
      }
    );
  }
  return defaultLogger;
}

export function setLogger(logger: Logger) {
  defaultLogger = logger;
}

