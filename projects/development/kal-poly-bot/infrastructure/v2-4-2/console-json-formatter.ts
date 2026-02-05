import "./types.d.ts";
// infrastructure/v2-4-2/console-json-formatter.ts
// Component #47: Console JSON Formatter (%j Specifier Support)

import { feature } from "bun:bundle";

// Export interfaces for type safety
export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
}

// Structured logging for MCP audit trails
export class ConsoleJSONFormatter {
  // LOG_LEVELS needs to be public for the getLogLevel method
  static readonly LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  } as const;

  private static currentLogLevel = this.LOG_LEVELS.INFO;
  private static logBuffer: LogEntry[] = [];
  private static maxBufferSize = 1000;

  // Zero-cost when CONSOLE_JSON is disabled
  static formatLog(format: string, ...args: unknown[]): string {
    if (!feature("CONSOLE_JSON")) {
      // Legacy console.log behavior
      return this.legacyFormat(format, ...args);
    }

    // Parse %j specifiers and structured formatting
    let result = format;
    const formattedArgs: any[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Handle %j specifier for JSON serialization
      const jsonIndex = result.indexOf("%j");
      if (jsonIndex !== -1) {
        const jsonValue = this.safeJsonStringify(arg);
        result = result.replace("%j", jsonValue);
        continue;
      }

      // Handle other format specifiers
      const specifierMatch = result.match(/%([sdifjoc%])/);
      if (specifierMatch) {
        const specifier = specifierMatch[1];
        let formattedValue: string;

        switch (specifier) {
          case "s":
            formattedValue = String(arg);
            break;
          case "d":
          case "i":
            formattedValue = Math.floor(Number(arg)).toString();
            break;
          case "f":
            formattedValue = Number(arg).toString();
            break;
          case "o":
            formattedValue = this.safeJsonStringify(arg, 2);
            break;
          case "c":
            // CSS styling (not supported in JSON mode)
            formattedValue = String(arg);
            break;
          case "%":
            formattedValue = "%";
            break;
          default:
            formattedValue = String(arg);
        }

        result = result.replace(`%${specifier}`, formattedValue);
      } else {
        formattedArgs.push(arg);
      }
    }

    return result;
  }

  // Safe JSON stringification with circular reference handling
  private static safeJsonStringify(obj: unknown, indent?: number): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return "[Circular]";
            }
            seen.add(value);
          }
          return value;
        },
        indent
      );
    } catch (error: unknown) {
      return `[Serialization Error: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  // Legacy format for when CONSOLE_JSON is disabled
  private static legacyFormat(format: string, ...args: unknown[]): string {
    // Basic util.format-like implementation
    let result = format;
    for (const arg of args) {
      result = result.replace(/%[sdifjoc%]/, String(arg));
    }
    return result;
  }

  // Integrates with Component #11: Atomic-Integrity-Log
  static logAudit(
    event: string,
    data: Record<string, unknown>,
    level: keyof typeof ConsoleJSONFormatter.LOG_LEVELS = "INFO"
  ): void {
    if (!feature("CONSOLE_JSON")) return;

    const logLevel = this.LOG_LEVELS[level];
    if (logLevel > this.currentLogLevel) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data,
      component: this.detectComponent(data),
      traceId: this.generateTraceId(),
    };

    // Add to buffer for batch processing
    this.addToBuffer(logEntry);

    // Output structured log
    console.log(
      "%j %s %j",
      {
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        traceId: logEntry.traceId,
      },
      "AUDIT",
      {
        event: logEntry.event,
        data: logEntry.data,
        component: logEntry.component,
      }
    );
  }

  // MCP endpoint monitoring
  static logEndpointAccess(
    method: string,
    url: string,
    statusCode: number,
    responseTime?: number,
    userAgent?: string
  ): void {
    this.logAudit(
      "endpoint_access",
      {
        method,
        url,
        statusCode,
        responseTime,
        userAgent,
        timestamp: Date.now(),
      },
      "INFO"
    );
  }

  // Performance monitoring
  static logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.logAudit(
      "performance",
      {
        operation,
        duration,
        metadata,
        performanceLevel:
          duration < 100 ? "FAST" : duration < 500 ? "NORMAL" : "SLOW",
      },
      duration > 500 ? "WARN" : "INFO"
    );
  }

  // Security event logging
  static logSecurity(
    event: string,
    details: Record<string, unknown>,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ): void {
    const level =
      severity === "CRITICAL" ? "ERROR" : severity === "HIGH" ? "WARN" : "INFO";

    this.logAudit(
      "security",
      {
        securityEvent: event,
        severity,
        details,
        timestamp: Date.now(),
      },
      level
    );
  }

  // Error logging with stack traces
  static logError(error: Error, context?: Record<string, unknown>): void {
    this.logAudit(
      "error",
      {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        timestamp: Date.now(),
      },
      "ERROR"
    );
  }

  // Component detection for audit trails
  private static detectComponent(data: Record<string, unknown>): number {
    if (data.component) return data.component;
    if (data.url?.includes("mcp")) return 41;
    if (data.operation?.includes("timer")) return 43;
    if (data.operation?.includes("proxy")) return 44;
    if (data.operation?.includes("connection")) return 45;
    if (data.operation?.includes("build")) return 46;
    if (data.operation?.includes("database")) return 48;
    if (data.securityEvent) return 49;
    if (data.compatibility) return 50;
    return 0; // Unknown component
  }

  // Generate trace ID for request tracking
  private static generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Buffer management for batch processing
  private static addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  // Flush buffered logs to external system
  static flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    const batch = [...this.logBuffer];
    this.logBuffer = [];

    // Send batch to audit system (Component #11)
    if (feature("INFRASTRUCTURE_HEALTH_CHECKS")) {
      fetch("https://api.buncatalog.com/v1/audit/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: batch,
          component: 47,
          timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(5000),
      }).catch((error) => {
        console.debug("Failed to flush log buffer:", error);
        // Re-add failed logs to buffer for retry
        this.logBuffer.unshift(...batch);
      });
    }
  }

  // Log audit events for compliance
  static logAudit(level: string, event: unknown, data: unknown): void {
    if (!feature("CONSOLE_JSON")) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: String(event),
      context: data as Record<string, unknown>,
      metadata: {
        component: this.detectComponent(data),
        traceId: this.generateTraceId(),
      },
    };

    // Add to buffer for batch processing
    this.addToBuffer(logEntry);

    // Output structured log
    console.log(
      "%j %s %j",
      {
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        traceId: logEntry.metadata?.traceId,
      },
      "AUDIT",
      {
        event: logEntry.message,
        data: logEntry.context,
        component: logEntry.metadata?.component,
      }
    );
  }

  // Set up periodic flush
  static {
    if (feature("CONSOLE_JSON")) {
      setInterval(() => this.flushBuffer(), 30000); // Flush every 30 seconds
    }
  }

  // Create custom logger with context
  static createLogger(context: Record<string, unknown>): Logger {
    return {
      info: (message: string, data?: unknown) =>
        this.logAudit("info", { message, data, ...context }, "INFO"),
      warn: (message: string, data?: unknown) =>
        this.logAudit("warn", { message, data, ...context }, "WARN"),
      error: (message: string, error?: Error | unknown) => {
        if (error instanceof Error) {
          this.logError(error, { message, ...context });
        } else {
          this.logAudit("error", { message, error, ...context }, "ERROR");
        }
      },
      debug: (message: string, data?: unknown) =>
        this.logAudit("debug", { message, data, ...context }, "DEBUG"),
      trace: (message: string, data?: unknown) =>
        this.logAudit("trace", { message, data, ...context }, "TRACE"),
    };
  }
}

// Zero-cost console patch
if (feature("CONSOLE_JSON")) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (format: string, ...args: unknown[]) => {
    originalLog(ConsoleJSONFormatter.formatLog(format, ...args));
  };

  console.error = (format: string, ...args: unknown[]) => {
    originalError(ConsoleJSONFormatter.formatLog(format, ...args));
  };

  console.warn = (format: string, ...args: unknown[]) => {
    originalWarn(ConsoleJSONFormatter.formatLog(format, ...args));
  };

  console.info = (format: string, ...args: unknown[]) => {
    originalInfo(ConsoleJSONFormatter.formatLog(format, ...args));
  };

  console.debug = (format: string, ...args: unknown[]) => {
    originalDebug(ConsoleJSONFormatter.formatLog(format, ...args));
  };
}

// Zero-cost exports
export const {
  formatLog,
  logAudit,
  logEndpointAccess,
  logPerformance,
  logSecurity,
  logError,
  createLogger,
  setLogLevel,
  getLogLevel,
  configureBuffer,
  flushBuffer,
} = feature("CONSOLE_JSON")
  ? ConsoleJSONFormatter
  : {
      formatLog: (format: string, ...args: unknown[]) => format,
      logAudit: () => {},
      logEndpointAccess: () => {},
      logPerformance: () => {},
      logSecurity: () => {},
      logError: () => {},
      createLogger: (context: Record<string, unknown>) => ({
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
      }),
      setLogLevel: () => {},
      getLogLevel: () => "INFO",
      configureBuffer: () => {},
      flushBuffer: async () => {},
    };

export default ConsoleJSONFormatter;
