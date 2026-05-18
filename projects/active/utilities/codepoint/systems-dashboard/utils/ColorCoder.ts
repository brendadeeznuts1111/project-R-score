// utils/ColorCoder.ts

/**
 * Convert HSL color to ANSI escape sequence
 */
export function hslToAnsi(h: number, s: number, l: number): string {
  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  // Convert RGB to 256-color ANSI
  if (r === g && g === b) {
    const gray = Math.round((r / 255) * 23);
    return `\x1b[38;5;${16 + gray}m`;
  }

  const r6 = Math.round((r / 255) * 5);
  const g6 = Math.round((g / 255) * 5);
  const b6 = Math.round((b / 255) * 5);

  return `\x1b[38;5;${16 + 36 * r6 + 6 * g6 + b6}m`;
}

/**
 * Status color mappings
 */
export const StatusColors = {
  success: { h: 120, s: 70, l: 45 },
  warning: { h: 45, s: 80, l: 55 },
  error: { h: 0, s: 75, l: 50 },
  info: { h: 200, s: 70, l: 50 },
  primary: { h: 210, s: 70, l: 45 },
  secondary: { h: 280, s: 60, l: 50 },
} as const;
