/**
 * Standardized Date/Time Utilities
 *
 * This module provides centralized date/time handling with consistent
 * timezone management, formatting, and validation across the entire codebase.
 *
 * Standards:
 * - All internal storage uses UTC ISO strings
 * - All UI display uses user's local timezone
 * - All timestamps are in milliseconds for calculations
 * - All file naming uses UTC with safe characters
 * - Integrates with Bun's TZ environment variable
 */

// Standard timezone configuration
export const TIMEZONE_CONFIG = {
  // Default timezone for all operations
  DEFAULT_TIMEZONE: "UTC",

  // Display timezone (user's local timezone)
  DISPLAY_TIMEZONE: "local",

  // Bun process timezone (from process.env.TZ)
  BUN_TIMEZONE: typeof process !== "undefined" ? process.env?.TZ : undefined,

  // Supported timezone identifiers
  SUPPORTED_TIMEZONES: [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney"
  ] as const,

  // Date format standards
  DATE_FORMATS: {
    // ISO 8601 for storage and APIs
    ISO: "YYYY-MM-DDTHH:mm:ss.sssZ",

    // Display formats
    DISPLAY_DATE: "MMM DD, YYYY",
    DISPLAY_DATETIME: "MMM DD, YYYY HH:mm",
    DISPLAY_DATETIME_SHORT: "MM/DD/YYYY HH:mm",
    DISPLAY_TIME: "HH:mm:ss",
    DISPLAY_TIME_SHORT: "HH:mm",

    // File naming formats (URL-safe)
    FILE_TIMESTAMP: "YYYY-MM-DD_HH-mm-ss",
    FILE_DATETIME: "YYYYMMDD-HHMMss",

    // Logging formats
    LOG_DATETIME: "YYYY-MM-DD HH:mm:ss.SSS",
    LOG_DATE: "YYYY-MM-DD"
  } as const
} as const;

/**
 * Standardized Date class that extends native Date with timezone awareness
 */
export class StandardDate {
  private date: Date;
  private timezone: string;

  constructor(input?: string | number | Date, timezone: string = TIMEZONE_CONFIG.DEFAULT_TIMEZONE) {
    this.timezone = timezone;

    if (!input) {
      this.date = new Date();
    } else if (typeof input === "string") {
      // Parse ISO strings or timestamp strings
      this.date = new Date(input);
    } else if (typeof input === "number") {
      // Handle milliseconds since epoch
      this.date = new Date(input);
    } else {
      this.date = new Date(input);
    }

    // Validate the date
    if (isNaN(this.date.getTime())) {
      throw new Error(`Invalid date input: ${input}`);
    }
  }

  /**
   * Get the underlying Date object
   */
  toDate(): Date {
    return this.date;
  }

  /**
   * Get timezone-aware timestamp in UTC (ISO string)
   */
  toUTC(): string {
    return this.date.toISOString();
  }

  /**
   * Get local timezone timestamp
   */
  toLocal(): string {
    return this.date.toLocaleString();
  }

  /**
   * Get timestamp in milliseconds
   */
  getTime(): number {
    return this.date.getTime();
  }

  /**
   * Get Unix timestamp (seconds)
   */
  getUnixTime(): number {
    return Math.floor(this.date.getTime() / 1000);
  }

  /**
   * Format date according to predefined formats
   */
  format(format: keyof typeof TIMEZONE_CONFIG.DATE_FORMATS): string {
    switch (format) {
      case "ISO":
        return this.toUTC();

      case "DISPLAY_DATE":
        return this.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

      case "DISPLAY_DATETIME":
        return this.date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

      case "DISPLAY_DATETIME_SHORT":
        return this.date.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

      case "DISPLAY_TIME":
        return this.date.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

      case "DISPLAY_TIME_SHORT":
        return this.date.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        });

      case "FILE_TIMESTAMP":
        return this.date.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

      case "FILE_DATETIME":
        return this.date
          .toISOString()
          .replace(/[:.]/g, "")
          .replace("T", "-")
          .replace("Z", "")
          .slice(0, 15);

      case "LOG_DATETIME":
        return this.date.toISOString().replace("T", " ").replace("Z", "").slice(0, 23);

      case "LOG_DATE":
        return this.date.toISOString().slice(0, 10);

      default:
        return this.toUTC();
    }
  }

  /**
   * Add time to the date
   */
  add(
    amount: number,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days"
  ): StandardDate {
    const milliseconds = {
      milliseconds: amount,
      seconds: amount * 1000,
      minutes: amount * 60 * 1000,
      hours: amount * 60 * 60 * 1000,
      days: amount * 24 * 60 * 60 * 1000
    }[unit];

    return new StandardDate(this.date.getTime() + milliseconds, this.timezone);
  }

  /**
   * Subtract time from the date
   */
  subtract(
    amount: number,
    unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days"
  ): StandardDate {
    return this.add(-amount, unit);
  }

  /**
   * Check if the date is before another date
   */
  isBefore(other: StandardDate | Date | string): boolean {
    const otherDate = other instanceof StandardDate ? other : new StandardDate(other);
    return this.date.getTime() < otherDate.getTime();
  }

  /**
   * Check if the date is after another date
   */
  isAfter(other: StandardDate | Date | string): boolean {
    const otherDate = other instanceof StandardDate ? other : new StandardDate(other);
    return this.date.getTime() > otherDate.getTime();
  }

  /**
   * Get relative time description
   */
  getRelativeTime(): string {
    const now = new StandardDate();
    const diffMs = now.getTime() - this.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffSeconds > 0) {
      return `${diffSeconds} second${diffSeconds > 1 ? "s" : ""} ago`;
    } else {
      return "just now";
    }
  }

  /**
   * Clone the date
   */
  clone(): StandardDate {
    return new StandardDate(this.date, this.timezone);
  }
}

/**
 * Utility functions for common date operations
 */
export const DateUtils = {
  /**
   * Create a new standardized date
   */
  now(timezone?: string): StandardDate {
    return new StandardDate(undefined, timezone);
  },

  /**
   * Create a standardized date from input
   */
  from(input: string | number | Date, timezone?: string): StandardDate {
    return new StandardDate(input, timezone);
  },

  /**
   * Get current timestamp in milliseconds
   */
  timestamp(): number {
    return Date.now();
  },

  /**
   * Get current Unix timestamp (seconds)
   */
  unixTime(): number {
    return Math.floor(Date.now() / 1000);
  },

  /**
   * Create a file-safe timestamp
   */
  fileTimestamp(): string {
    return new StandardDate().format("FILE_TIMESTAMP");
  },

  /**
   * Create a compact file timestamp
   */
  fileDateTime(): string {
    return new StandardDate().format("FILE_DATETIME");
  },

  /**
   * Create a log timestamp
   */
  logTimestamp(): string {
    return new StandardDate().format("LOG_DATETIME");
  },

  /**
   * Parse and validate a date string
   */
  parse(dateString: string): StandardDate | null {
    try {
      return new StandardDate(dateString);
    } catch {
      return null;
    }
  },

  /**
   * Check if a string is a valid ISO date
   */
  isValidISO(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes("T") && dateString.includes("Z");
  },

  /**
   * Convert milliseconds to human readable duration
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Get timezone offset for display
   */
  getTimezoneOffset(): string {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? "+" : "-";
    return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  },

  /**
   * Convert between timezones
   */
  convertTimezone(date: StandardDate, targetTimezone: string): StandardDate {
    // For now, we'll use the native Date object's timezone handling
    // In a real implementation, you might use a library like moment-timezone
    return new StandardDate(date.toDate(), targetTimezone);
  },

  /**
   * Get current Bun timezone setting
   */
  getBunTimezone(): string | undefined {
    return typeof process !== "undefined" ? process.env?.TZ : undefined;
  },

  /**
   * Set Bun timezone (affects entire process)
   */
  setBunTimezone(timezone: string): void {
    if (typeof process !== "undefined" && process.env) {
      process.env.TZ = timezone;
    }
  },

  /**
   * Get effective timezone for display
   */
  getEffectiveTimezone(): string {
    // Priority: Bun TZ > Display Timezone > Default
    return (
      this.getBunTimezone() || TIMEZONE_CONFIG.DISPLAY_TIMEZONE || TIMEZONE_CONFIG.DEFAULT_TIMEZONE
    );
  },

  /**
   * Check if timezone is supported
   */
  isTimezoneSupported(timezone: string): boolean {
    return (TIMEZONE_CONFIG.SUPPORTED_TIMEZONES as readonly string[]).includes(timezone);
  },

  /**
   * Get timezone offset string for current timezone
   */
  getCurrentTimezoneOffset(): string {
    const effectiveTz = this.getEffectiveTimezone();
    if (effectiveTz === "UTC") {
      return "UTC+00:00";
    }

    // Get offset from current Date
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? "+" : "-";
    return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
};

/**
 * Performance timing utilities
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = DateUtils.timestamp();
  }

  /**
   * Stop the timer and return duration
   */
  stop(): number {
    this.endTime = DateUtils.timestamp();
    return this.getDuration();
  }

  /**
   * Get current duration
   */
  getDuration(): number {
    const end = this.endTime || DateUtils.timestamp();
    return end - this.startTime;
  }

  /**
   * Get formatted duration
   */
  getFormattedDuration(): string {
    return DateUtils.formatDuration(this.getDuration());
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.endTime === undefined;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = DateUtils.timestamp();
    this.endTime = undefined;
  }
}

/**
 * Default export for convenience
 */
export default {
  StandardDate,
  DateUtils,
  PerformanceTimer,
  TIMEZONE_CONFIG
};
