/**
 * @fileoverview Enhanced Console Logger for HyperBun MLGS
 * @description Structured console logging with log levels
 * @module logging/console-enhanced
 * @version 7.0.0.0.0.0.0
 */

export enum ConsoleLogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARNING = 3,
  ERROR = 4,
  CRITICAL = 5,
}

class ConsoleEnhanced {
  private level: ConsoleLogLevel = ConsoleLogLevel.INFO

  constructor() {
    const envLevel = process.env.CONSOLE_LEVEL?.toUpperCase()
    if (envLevel && envLevel in ConsoleLogLevel) {
      this.level = ConsoleLogLevel[envLevel as keyof typeof ConsoleLogLevel]
    }
  }

  private formatMessage(level: string, code: string, message: string): string {
    const timestamp = new Date().toISOString()
    const levelEmoji =
      {
        DEBUG: "🔍",
        INFO: "ℹ️",
        SUCCESS: "✅",
        WARNING: "⚠️",
        ERROR: "❌",
        CRITICAL: "🚨",
      }[level] || "📝"

    const codeStr = code ? `[${code}]` : ""
    return `${timestamp} ${levelEmoji} ${level} ${codeStr} ${message}`
  }

  debug(code: string, message: string, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.DEBUG) {
      console.debug(this.formatMessage("DEBUG", code, message), ...args)
    }
  }

  info(code: string, message: string, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.INFO) {
      console.info(this.formatMessage("INFO", code, message), ...args)
    }
  }

  success(code: string, message: string, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.SUCCESS) {
      console.log(this.formatMessage("SUCCESS", code, message), ...args)
    }
  }

  warning(code: string, message: string, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.WARNING) {
      console.warn(this.formatMessage("WARNING", code, message), ...args)
    }
  }

  error(code: string, message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.ERROR) {
      const errorData =
        error instanceof Error ? { message: error.message, stack: error.stack } : error
      console.error(this.formatMessage("ERROR", code, message), errorData, ...args)
    }
  }

  critical(code: string, message: string, ...args: any[]): void {
    if (this.level <= ConsoleLogLevel.CRITICAL) {
      console.error(this.formatMessage("CRITICAL", code, message), ...args)
    }
  }

  setLevel(level: ConsoleLogLevel): void {
    this.level = level
  }

  getLevel(): ConsoleLogLevel {
    return this.level
  }
}

export const consoleEnhanced = new ConsoleEnhanced()
export type { ConsoleEnhanced }
