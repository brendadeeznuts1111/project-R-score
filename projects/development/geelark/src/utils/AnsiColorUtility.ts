/**
 * ANSI Color Utility - Simplified color support for Terminal Output
 * Replaces 150+ lines of custom Proxy-based implementation with simple, efficient color functions
 * 
 * @__PURE__
 */

// Standard ANSI color codes
const ANSI_CODES = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  underline: "\x1b[4m",
};

/**
 * Apply color to text using ANSI codes
 * @param text - Text to colorize
 * @param color - Color name from ANSI_CODES
 * @returns Colored text
 */
export const colorize = (text: string, color: keyof typeof ANSI_CODES): string => {
  const code = ANSI_CODES[color];
  return `${code}${text}${ANSI_CODES.reset}`;
};

/**
 * Apply bold formatting to colored text
 * @param text - Text to format
 * @param color - Color name from ANSI_CODES
 * @returns Bold colored text
 */
export const bold = (text: string, color: keyof typeof ANSI_CODES): string => {
  const code = ANSI_CODES[color];
  return `${ANSI_CODES.bright}${code}${text}${ANSI_CODES.reset}`;
};

/**
 * Apply hex color (limited support, converts to ANSI RGB)
 * @param text - Text to colorize
 * @param hex - Hex color code (e.g., "#FF5733")
 * @returns Text with hex color applied
 */
export const hexColor = (text: string, hex: string): string => {
  const hexCode = hex.replace("#", "");
  const r = parseInt(hexCode.substring(0, 2), 16);
  const g = parseInt(hexCode.substring(2, 4), 16);
  const b = parseInt(hexCode.substring(4, 6), 16);
  return `\x1b[38;2;${r};${g};${b}m${text}${ANSI_CODES.reset}`;
};

/**
 * Shorthand color functions for common colors
 */
export const chalk = {
  reset: (text: string) => colorize(text, 'reset'),
  dim: (text: string) => colorize(text, 'dim'),
  red: (text: string) => colorize(text, 'red'),
  green: (text: string) => colorize(text, 'green'),
  yellow: (text: string) => colorize(text, 'yellow'),
  blue: (text: string) => colorize(text, 'blue'),
  magenta: (text: string) => colorize(text, 'magenta'),
  cyan: (text: string) => colorize(text, 'cyan'),
  white: (text: string) => colorize(text, 'white'),
  gray: (text: string) => colorize(text, 'gray'),
  underline: (text: string) => `${ANSI_CODES.underline}${text}${ANSI_CODES.reset}`,
  hex: hexColor,
  bold: {
    red: (text: string) => bold(text, 'red'),
    green: (text: string) => bold(text, 'green'),
    yellow: (text: string) => bold(text, 'yellow'),
    blue: (text: string) => bold(text, 'blue'),
    white: (text: string) => bold(text, 'white'),
    cyan: (text: string) => bold(text, 'cyan'),
    gray: (text: string) => bold(text, 'gray'),
    magenta: (text: string) => bold(text, 'magenta'),
    underline: (text: string) => `${ANSI_CODES.bright}${ANSI_CODES.underline}${text}${ANSI_CODES.reset}`,
  },
};
