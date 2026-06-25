/**
 * Structured Logging Utility
 *
 * Provides consistent log formatting across the application.
 * Supports both text (development) and JSON (production) output formats.
 *
 * All log entries include:
 *   - ISO timestamp
 *   - Log level (DEBUG, INFO, WARN, ERROR)
 *   - Component name
 *   - Message + optional metadata
 *
 * Environment variables:
 *   LOG_FORMAT=json|text  (default: text in dev, json in prod)
 *   LOG_LEVEL=debug|info|warn|error  (default: info)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFormat = "text" | "json";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LOG_FORMAT: LogFormat =
  (process.env.LOG_FORMAT as LogFormat) ||
  (process.env.NODE_ENV === "production" ? "json" : "text");

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function formatText(entry: LogEntry): string {
  const meta = entry.metadata
    ? Object.entries(entry.metadata)
        .map(([k, v]) => {
          if (typeof v === "object") return `${k}=${JSON.stringify(v)}`;
          return `${k}=${v}`;
        })
        .join(" ")
    : "";

  if (meta) {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}  ${meta}`;
  }
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}`;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level.toUpperCase(),
    component: entry.component,
    message: entry.message,
    ...(entry.metadata ? entry.metadata : {}),
  });
}

function writeLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const output = LOG_FORMAT === "json" ? formatJson(entry) : formatText(entry);

  switch (entry.level) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a component-scoped logger.
 * All logs from this logger will include the component name.
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) =>
      writeLog({ timestamp: new Date().toISOString(), level: "debug", component, message, metadata }),
    info: (message: string, metadata?: Record<string, unknown>) =>
      writeLog({ timestamp: new Date().toISOString(), level: "info", component, message, metadata }),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      writeLog({ timestamp: new Date().toISOString(), level: "warn", component, message, metadata }),
    error: (message: string, metadata?: Record<string, unknown>) =>
      writeLog({ timestamp: new Date().toISOString(), level: "error", component, message, metadata }),
  };
}

/** Global logger for core system events */
export const logger = createLogger("System");

/** Shorthand log functions for convenience */
export const logDebug = (component: string, message: string, meta?: Record<string, unknown>) =>
  createLogger(component).debug(message, meta);
export const logInfo = (component: string, message: string, meta?: Record<string, unknown>) =>
  createLogger(component).info(message, meta);
export const logWarn = (component: string, message: string, meta?: Record<string, unknown>) =>
  createLogger(component).warn(message, meta);
export const logError = (component: string, message: string, meta?: Record<string, unknown>) =>
  createLogger(component).error(message, meta);
