#!/usr/bin/env bun

/**
 * 🎨 MAX PERFORMANCE Color System
 *
 * High-contrast, cached color system using HSL for maximum visual impact
 * across all FactoryWager daily routine scripts.
 */

import { color } from 'bun';

// ──────────────────────────────────────────────────────────────────────────────
// STATUS GLYPHS + MAX-PERF COLOR CACHE
// ──────────────────────────────────────────────────────────────────────────────
const COLOR_CACHE = new Map<string, string>();

export type ColorStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'cyan'
  | 'magenta'
  | 'gray'
  | 'white'
  | 'yellow'
  | 'blue'
  | 'green'
  | 'red';

const getBaseHue = (status: ColorStatus): number => {
  const baseHues = {
    success: 135, // vivid green
    warning: 45, // vivid orange
    error: 0, // vivid red
    info: 210, // vivid blue
    cyan: 180, // cyan
    magenta: 300, // magenta
    gray: 0, // gray (will be desaturated)
    white: 0, // white (will be light)
    yellow: 60, // yellow
    blue: 220, // blue
    green: 135, // green
    red: 0, // red
  };
  return baseHues[status] || 0;
};

const getColorConfig = (
  status: ColorStatus
): { hue: number; saturation: number; lightness: number } => {
  switch (status) {
    case 'success':
    case 'green':
      return { hue: 135, saturation: 95, lightness: 65 };
    case 'warning':
    case 'yellow':
      return { hue: 45, saturation: 95, lightness: 65 };
    case 'error':
    case 'red':
      return { hue: 0, saturation: 95, lightness: 65 };
    case 'info':
    case 'blue':
    case 'cyan':
      return { hue: 210, saturation: 95, lightness: 65 };
    case 'magenta':
      return { hue: 300, saturation: 95, lightness: 65 };
    case 'gray':
      return { hue: 0, saturation: 0, lightness: 50 };
    case 'white':
      return { hue: 0, saturation: 0, lightness: 90 };
    default:
      return { hue: 210, saturation: 95, lightness: 65 };
  }
};

export const colorize = (
  text: string,
  status: ColorStatus,
  bold: boolean = false,
  hueShift: number = 0
): string => {
  const cacheKey = `${status}-${bold}-${hueShift}`;
  if (COLOR_CACHE.has(cacheKey)) {
    const ansi = COLOR_CACHE.get(cacheKey)!;
    return `${ansi}${text}\x1b[0m`;
  }

  const config = getColorConfig(status);
  const hue = (config.hue + hueShift) % 360;
  const hslString = `hsl(${hue}, ${config.saturation}%, ${config.lightness}%)`;

  let ansi = color(hslString, 'ansi') || '';
  if (bold) ansi = `\x1b[1m${ansi}`;

  COLOR_CACHE.set(cacheKey, ansi);
  return `${ansi}${text}\x1b[0m`;
};

// ──────────────────────────────────────────────────────────────────────────────
// QUICK COLOR HELPERS (optimized for daily scripts)
// ──────────────────────────────────────────────────────────────────────────────
export const c = {
  success: (text: string) => colorize(text, 'success'),
  warning: (text: string) => colorize(text, 'warning'),
  error: (text: string) => colorize(text, 'error'),
  info: (text: string) => colorize(text, 'info'),
  cyan: (text: string) => colorize(text, 'cyan'),
  magenta: (text: string) => colorize(text, 'magenta'),
  gray: (text: string) => colorize(text, 'gray'),
  white: (text: string) => colorize(text, 'white'),
  yellow: (text: string) => colorize(text, 'yellow'),
  blue: (text: string) => colorize(text, 'blue'),
  green: (text: string) => colorize(text, 'green'),
  red: (text: string) => colorize(text, 'red'),

  // Bold variants
  bold: {
    success: (text: string) => colorize(text, 'success', true),
    warning: (text: string) => colorize(text, 'warning', true),
    error: (text: string) => colorize(text, 'error', true),
    info: (text: string) => colorize(text, 'info', true),
    cyan: (text: string) => colorize(text, 'cyan', true),
    magenta: (text: string) => colorize(text, 'magenta', true),
    gray: (text: string) => colorize(text, 'gray', true),
    white: (text: string) => colorize(text, 'white', true),
    yellow: (text: string) => colorize(text, 'yellow', true),
    blue: (text: string) => colorize(text, 'blue', true),
    green: (text: string) => colorize(text, 'green', true),
    red: (text: string) => colorize(text, 'red', true),
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// PROFILE-SPECIFIC COLOR THEMES
// ──────────────────────────────────────────────────────────────────────────────
export const getProfileTheme = (profile: string): { hueShift: number; name: string } => {
  const themes = {
    production: { hueShift: 135, name: 'Production Green' },
    staging: { hueShift: 45, name: 'Staging Orange' },
    development: { hueShift: 210, name: 'Dev Blue' },
    local: { hueShift: 180, name: 'Local Cyan' },
  };
  return themes[profile as keyof typeof themes] || themes.local;
};

// ──────────────────────────────────────────────────────────────────────────────
// STATUS GLYPHS
// ──────────────────────────────────────────────────────────────────────────────
export const glyphs = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  processing: '⏳',
  rocket: '🚀',
  gear: '⚙️',
  chart: '📊',
  shield: '🔐',
  brain: '🧠',
  lightning: '⚡',
  fire: '🔥',
  check: '✓',
  cross: '✗',
  triangle: '▵',
  diamond: '◆',
};
