/**
 * [INSPECT][CUSTOM][UTILITY]{BUN-API}
 * [Bun.inspect.custom] symbol helpers and patterns
 */

import type { CustomInspectable } from "../types";

/**
 * ANSI color codes for dark-mode-first formatting
 * [INSPECT][CUSTOM][COLORS]{BUN-NATIVE}
 */
export const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
} as const;

/**
 * Create a custom inspect symbol
 * [INSPECT][CUSTOM][METHOD][#REF:createCustomInspect]{BUN-NATIVE}
 */
export function createCustomInspect(
  formatter: () => unknown
): CustomInspectable {
  return {
    [Symbol.for("Bun.inspect.custom")]: formatter,
  };
}

/**
 * Format with dark-mode colors
 * [INSPECT][CUSTOM][METHOD][#REF:formatDarkMode]{BUN-NATIVE}
 */
export function formatDarkMode(
  text: string,
  color: keyof typeof COLORS = "cyan"
): string {
  if (!Bun.isTTY) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Format with conditional TTY support
 * [INSPECT][CUSTOM][METHOD][#REF:formatConditional]{BUN-NATIVE}
 */
export function formatConditional(
  text: string,
  coloredVersion: string
): string {
  return Bun.isTTY ? coloredVersion : text;
}

/**
 * Mask sensitive data in inspection
 * [INSPECT][CUSTOM][METHOD][#REF:maskSensitive]{BUN-NATIVE}
 */
export function maskSensitive(
  value: unknown,
  sensitiveKeys: string[] = ["password", "token", "secret", "apiKey"]
): unknown {
  if (typeof value !== "object" || value === null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item, sensitiveKeys));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, cellValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (
      sensitiveKeys.some((sensitiveKey) =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )
    ) {
      masked[key] = "***MASKED***";
    } else {
      masked[key] = maskSensitive(cellValue, sensitiveKeys);
    }
  }
  return masked;
}

/**
 * Create a class with custom inspection
 * [INSPECT][CUSTOM][CLASS][#REF:CustomInspectClass]{BUN-NATIVE}
 */
export class CustomInspectClass {
  constructor(protected displayName: string) {}

  [Symbol.for("Bun.inspect.custom")](): string {
    const colored = formatDarkMode(this.displayName, "cyan");
    return formatConditional(this.displayName, colored);
  }
}

/**
 * Create a user-friendly class inspector
 * [INSPECT][CUSTOM][CLASS][#REF:UserInspector]{BUN-NATIVE}
 */
export class UserInspector extends CustomInspectClass {
  constructor(
    public name: string,
    public email: string,
    public role: string
  ) {
    super(`User<${name}>`);
  }

  [Symbol.for("Bun.inspect.custom")](): string {
    const label = `👤 ${this.name}`;
    const colored = formatDarkMode(label, "magenta");
    return formatConditional(label, colored);
  }
}
