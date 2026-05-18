import { randomUUID, createHash } from "crypto";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  traceId: string;
  userIdHash?: string;
  meta?: Record<string, any>;
}

export interface LoggerConfig {
  logDir?: string;
  logFile?: string;
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableStructured?: boolean;
  maxLogSize?: number;
}

class NebulaLogger {
  private static config: LoggerConfig = {
    minLevel: "info",
    enableConsole: true,
    enableFile: true,
    enableStructured: false,
    maxLogSize: 10 * 1024 * 1024, // 10MB
  };

  static {
    this.config.logDir = Bun.env.LOG_DIR || `${process.cwd()}/logs`;
    this.config.logFile = Bun.env.LOG_FILE || `${this.config.logDir}/nebula.log`;
  }

  static configure(config: Partial<LoggerConfig>): void {
    NebulaLogger.config = { ...NebulaLogger.config, ...config };
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(NebulaLogger.config.minLevel!);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private static async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const logDir = NebulaLogger.config.logDir!;
      const logFile = NebulaLogger.config.logFile!;
      
      // Ensure log directory exists
      if (!Bun.file(logDir).exists()) {
        await Bun.write(logDir, "", { createPath: true });
      }

      // Check for log rotation
      const file = Bun.file(logFile);
      if (file.size > NebulaLogger.config.maxLogSize!) {
        await NebulaLogger.rotateLogs(logDir, logFile);
      }

      // Write log entry
      const logLine = NebulaLogger.config.enableStructured 
        ? JSON.stringify(entry, null, 2) + "\n"
        : JSON.stringify(entry) + "\n";
      
      // Use Bun.write with BunFile
      await Bun.write(Bun.file(logFile), logLine);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private static async rotateLogs(logDir: string, logFile: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotatedFile = `${logFile}.${timestamp}`;
      const existingContent = await Bun.file(logFile).text();
      await Bun.write(Bun.file(rotatedFile), existingContent);
      await Bun.write(Bun.file(logFile), "");
    } catch (error) {
      console.error("Failed to rotate logs:", error);
    }
  }

  private static formatMessage(message: string): string {
    return gdprMask(message);
  }

  static async log(
    component: string,
    level: LogLevel,
    message: string,
    meta?: { userId?: string; [k: string]: any }
  ): Promise<LogEntry> {
    if (!NebulaLogger.shouldLog(level)) {
      return NebulaLogger.createEmptyEntry(component, level, message, meta);
    }

    const maskedMessage = NebulaLogger.formatMessage(message);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message: maskedMessage,
      traceId: randomUUID(),
      userIdHash: meta?.userId
        ? createHash("sha256").update(meta.userId).digest("hex")
        : undefined,
      meta: meta ? { ...meta, userId: undefined } : undefined,
    };

    // Console output
    if (NebulaLogger.config.enableConsole) {
      console[level](NebulaLogger.config.enableStructured ? JSON.stringify(entry, null, 2) : JSON.stringify(entry));
    }

    // File output
    if (NebulaLogger.config.enableFile) {
      await NebulaLogger.writeToFile(entry);
    }

    return entry;
  }

  private static createEmptyEntry(
    component: string,
    level: LogLevel,
    message: string,
    meta?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      traceId: randomUUID(),
      meta: meta ? { ...meta, userId: undefined } : undefined,
    };
  }

  static async info(component: string, message: string, meta?: any) {
    return NebulaLogger.log(component, "info", message, meta);
  }

  static async warn(component: string, message: string, meta?: any) {
    return NebulaLogger.log(component, "warn", message, meta);
  }

  static async error(component: string, message: string, meta?: any) {
    return NebulaLogger.log(component, "error", message, meta);
  }
}

function gdprMask(message: string): string {
  return message.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL_MASKED]"
  );
}

export const logger = {
  log: NebulaLogger.log,
  info: NebulaLogger.info,
  warn: NebulaLogger.warn,
  error: NebulaLogger.error,
  configure: NebulaLogger.configure,
};
