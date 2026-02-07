// lib/utils/advanced-hsl-colors.ts — Advanced HSL color theory utilities

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface OKLCH {
  l: number; // 0-1 (lightness)
  c: number; // 0-0.4 (chroma)
  h: number; // 0-360 (hue)
}

export interface ColorPalette {
  primary: string;
  analogous: string[];
  complementary: string;
  triadic: string[];
  tints: string[];
  shades: string[];
}

export interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  level: 'fail' | 'AA' | 'AAA';
}

export interface StatusColorConfig {
  success: HSL;
  warning: HSL;
  error: HSL;
  info: HSL;
}

// ═══════════════════════════════════════════════════════════════
// HSL SWEET SPOTS (Maximum Visual Impact)
// ═══════════════════════════════════════════════════════════════

export const HSL_SWEET_SPOTS = {
  success: { h: [120, 150], s: [80, 100], l: [55, 70] },
  warning: { h: [30, 50], s: [90, 100], l: [60, 75] },
  error: { h: [0, 15], s: [85, 100], l: [50, 65] }, // Also 345-360
  info: { h: [200, 240], s: [70, 90], l: [60, 75] },
  background: { h: [200, 220], s: [20, 40], l: [90, 97] },
} as const;

// ═══════════════════════════════════════════════════════════════
// STATUS HUE MAPPINGS (Perceptual Adjustment)
// ═══════════════════════════════════════════════════════════════

export const STATUS_HUES: Record<string, number> = {
  success: 135, // Vivid green (shifted from 120 for better visibility)
  warning: 38, // Amber/orange
  error: 0, // Pure red
  info: 210, // Blue
};

// ═══════════════════════════════════════════════════════════════
// CORE HSL UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Parse HSL string or object to HSL object
 * Supports both CSS format (hsl(120, 50%, 50%)) and Bun.color format (hsl(120, 0.5, 0.5))
 */
export function parseHSL(input: string | HSL): HSL {
  if (typeof input === 'object') return input;

  // Try CSS format first: hsl(120, 50%, 50%)
  let match = input.match(/hsl\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\s*\)/i);
  if (match) {
    return {
      h: Math.round(parseFloat(match[1])),
      s: Math.round(parseFloat(match[2])),
      l: Math.round(parseFloat(match[3])),
    };
  }

  // Try Bun.color format: hsl(120, 0.5, 0.5) - decimal saturation/lightness
  match = input.match(/hsl\(\s*(\d+(?:\.\d+)?),\s*([\d.]+),\s*([\d.]+)\s*\)/i);
  if (match) {
    return {
      h: Math.round(parseFloat(match[1])),
      s: Math.round(parseFloat(match[2]) * 100),
      l: Math.round(parseFloat(match[3]) * 100),
    };
  }

  throw new Error(`Invalid HSL format: ${input}`);
}

/**
 * Format HSL object to CSS string
 */
export function formatHSL(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

/**
 * Convert HSL to RGB (for contrast calculations)
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Get ANSI color code using Bun.color()
 */
export function hslToAnsi(hsl: HSL, format: 'ansi' | 'ansi-256' | 'ansi-16m' = 'ansi'): string {
  const css = formatHSL(hsl);
  return Bun.color(css, format) || '';
}

/**
 * Get hex color using Bun.color()
 */
export function hslToHex(hsl: HSL): string {
  const css = formatHSL(hsl);
  return Bun.color(css, 'hex') || '#000000';
}

// ═══════════════════════════════════════════════════════════════
// PERCEPTUAL BRIGHTNESS (Compensate for HSL Non-Uniformity)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate perceived brightness (W3C relative luminance approximation)
 * Accounts for HSL perceptual non-uniformity
 */
export function perceivedBrightness(hsl: HSL): number {
  const rgb = hslToRgb(hsl);

  // W3C relative luminance formula (simplified)
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Adjust lightness to achieve target perceived brightness
 * Compensates for HSL non-uniformity at extremes
 */
export function adjustToPerceivedBrightness(
  hsl: HSL,
  targetBrightness: number,
  maxIterations = 10
): HSL {
  let current = { ...hsl };

  for (let i = 0; i < maxIterations; i++) {
    const brightness = perceivedBrightness(current);
    const diff = targetBrightness - brightness;

    if (Math.abs(diff) < 0.01) break;

    // Adjust lightness (with saturation compensation at extremes)
    const adjustment = diff * 100;
    current.l = Math.max(0, Math.min(100, current.l + adjustment));

    // Reduce saturation near extremes for better visibility
    if (current.l < 20 || current.l > 80) {
      current.s = Math.max(50, current.s * 0.95);
    }
  }

  return current;
}

// ═══════════════════════════════════════════════════════════════
// HARMONIOUS PALETTE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate harmonious palette via hue offsets
 */
export function generateHarmoniousPalette(
  baseHue: number,
  saturation = 85,
  lightness = 65
): ColorPalette {
  const primary = { h: baseHue, s: saturation, l: lightness };

  // Analogous (adjacent colors, ±30°)
  const analogous = [
    { ...primary, h: (baseHue + 30) % 360 },
    { ...primary, h: (baseHue - 30 + 360) % 360 },
  ];

  // Complementary (opposite, 180°)
  const complementary = {
    ...primary,
    h: (baseHue + 180) % 360,
  };

  // Triadic (120° apart)
  const triadic = [
    { ...primary, h: (baseHue + 120) % 360 },
    { ...primary, h: (baseHue + 240) % 360 },
  ];

  // Tints (lighter)
  const tints = Array.from({ length: 5 }, (_, i) => ({
    ...primary,
    l: Math.min(100, lightness + (i + 1) * 8),
  }));

  // Shades (darker)
  const shades = Array.from({ length: 5 }, (_, i) => ({
    ...primary,
    l: Math.max(0, lightness - (i + 1) * 8),
  }));

  return {
    primary: hslToHex(primary),
    analogous: analogous.map(hslToHex),
    complementary: hslToHex(complementary),
    triadic: triadic.map(hslToHex),
    tints: tints.map(hslToHex),
    shades: shades.map(hslToHex),
  };
}

// ═══════════════════════════════════════════════════════════════
// OKLCH CONVERSION HELPERS (Perceptually Uniform)
// ═══════════════════════════════════════════════════════════════

/**
 * Convert RGB to linear RGB (gamma correction)
 */
function linearizeRGB(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to OKLab (simplified OKLCH conversion)
 * Full OKLCH requires complex matrix math; this is a practical approximation
 */
export function rgbToOKLCH(rgb: RGB): OKLCH {
  // Normalize RGB
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(linearizeRGB);

  // Simplified OKLab conversion (approximation)
  // Full implementation would use 3x3 matrix multiplication
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // Convert to OKLCH
  const C = Math.sqrt(a * a + b_ * b_);
  const H = Math.atan2(b_, a) * (180 / Math.PI);
  const hue = H < 0 ? H + 360 : H;

  return {
    l: Math.max(0, Math.min(1, L)),
    c: Math.max(0, Math.min(0.4, C)),
    h: hue,
  };
}

/**
 * Convert HSL to OKLCH (via RGB)
 */
export function hslToOKLCH(hsl: HSL): OKLCH {
  return rgbToOKLCH(hslToRgb(hsl));
}

/**
 * Convert OKLCH back to HSL (approximation)
 * Note: This is lossy; OKLCH has wider gamut than HSL
 */
export function oklchToHSL(oklch: OKLCH): HSL {
  // Simplified conversion (full implementation requires matrix math)
  // This approximation works for most practical cases
  const l = oklch.l * 100;
  const s = Math.min(100, oklch.c * 250); // Scale chroma to saturation
  const h = oklch.h;

  return { h, s, l };
}

// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY CONTRAST CHECKING (WCAG)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate relative luminance (WCAG formula)
 */
function relativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function contrastRatio(color1: HSL, color2: HSL): number {
  const l1 = relativeLuminance(hslToRgb(color1));
  const l2 = relativeLuminance(hslToRgb(color2));

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG contrast compliance
 */
export function checkContrast(foreground: HSL, background: HSL): ContrastResult {
  const ratio = contrastRatio(foreground, background);

  const wcagAA = ratio >= 4.5; // Normal text
  const wcagAAA = ratio >= 7; // Enhanced contrast

  let level: 'fail' | 'AA' | 'AAA';
  if (ratio >= 7) level = 'AAA';
  else if (ratio >= 4.5) level = 'AA';
  else level = 'fail';

  return { ratio, wcagAA, wcagAAA, level };
}

/**
 * Find accessible foreground color for given background
 */
export function findAccessibleForeground(
  background: HSL,
  targetRatio = 4.5,
  preferredHue?: number
): HSL {
  const preferred = preferredHue ?? background.h;

  // Try different lightness values
  for (let l = 20; l <= 80; l += 5) {
    const candidate: HSL = { h: preferred, s: 90, l };
    const ratio = contrastRatio(candidate, background);

    if (ratio >= targetRatio) {
      return candidate;
    }
  }

  // Fallback: high contrast
  return { h: preferred, s: 100, l: background.l > 50 ? 10 : 90 };
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC STATUS COLORING (For Status Matrix)
// ═══════════════════════════════════════════════════════════════

/**
 * Get status color with perceptual adjustment
 */
export function getStatusColor(
  status: 'success' | 'warning' | 'error' | 'info',
  baseLightness = 65,
  severity?: 'low' | 'medium' | 'high'
): HSL {
  const hue = STATUS_HUES[status];
  let saturation = 95;
  let lightness = baseLightness;

  // Adjust for severity
  if (severity === 'high') {
    saturation = 100;
    lightness = status === 'error' ? 55 : 60;
  } else if (severity === 'low') {
    saturation = 75;
    lightness = 70;
  }

  return { h: hue, s: saturation, l: lightness };
}

/**
 * Get status ANSI color code
 */
export function getStatusAnsi(
  status: 'success' | 'warning' | 'error' | 'info',
  baseLightness = 65,
  severity?: 'low' | 'medium' | 'high',
  format: 'ansi' | 'ansi-256' | 'ansi-16m' = 'ansi'
): string {
  const hsl = getStatusColor(status, baseLightness, severity);
  return hslToAnsi(hsl, format);
}

/**
 * Generate status color configuration with dynamic severity
 */
export function generateStatusConfig(baseLightness = 65): StatusColorConfig {
  return {
    success: getStatusColor('success', baseLightness, 'medium'),
    warning: getStatusColor('warning', baseLightness, 'medium'),
    error: getStatusColor('error', baseLightness, 'high'),
    info: getStatusColor('info', baseLightness, 'low'),
  };
}

// ═══════════════════════════════════════════════════════════════
// PALETTE GENERATOR (CLI Tool)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate complete color palette from base color
 */
export function generatePalette(
  baseColor: string | HSL,
  options: {
    includeTints?: boolean;
    includeShades?: boolean;
    includeHarmonies?: boolean;
    tintSteps?: number;
    shadeSteps?: number;
  } = {}
): {
  base: HSL;
  hex: string;
  ansi: string;
  palette: ColorPalette;
  accessible: {
    foreground: HSL;
    background: HSL;
    ratio: number;
  };
} {
  const hsl = typeof baseColor === 'string' ? parseHSL(baseColor) : baseColor;
  const hex = hslToHex(hsl);
  const ansi = hslToAnsi(hsl);

  const {
    includeTints = true,
    includeShades = true,
    includeHarmonies = true,
    tintSteps = 5,
    shadeSteps = 5,
  } = options;

  let palette: ColorPalette;

  if (includeHarmonies) {
    palette = generateHarmoniousPalette(hsl.h, hsl.s, hsl.l);
  } else {
    palette = {
      primary: hex,
      analogous: [],
      complementary: hex,
      triadic: [],
      tints: includeTints
        ? Array.from({ length: tintSteps }, (_, i) =>
            hslToHex({ ...hsl, l: Math.min(100, hsl.l + (i + 1) * 8) })
          )
        : [],
      shades: includeShades
        ? Array.from({ length: shadeSteps }, (_, i) =>
            hslToHex({ ...hsl, l: Math.max(0, hsl.l - (i + 1) * 8) })
          )
        : [],
    };
  }

  // Find accessible foreground
  const background = { ...hsl, l: 95, s: 10 }; // Light background
  const foreground = findAccessibleForeground(background, 4.5, hsl.h);
  const ratio = contrastRatio(foreground, background);

  return {
    base: hsl,
    hex,
    ansi,
    palette,
    accessible: {
      foreground,
      background,
      ratio,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  parseHSL,
  formatHSL,
  hslToRgb,
  hslToAnsi,
  hslToHex,
  perceivedBrightness,
  adjustToPerceivedBrightness,
  generateHarmoniousPalette,
  rgbToOKLCH,
  hslToOKLCH,
  oklchToHSL,
  contrastRatio,
  checkContrast,
  findAccessibleForeground,
  getStatusColor,
  getStatusAnsi,
  generateStatusConfig,
  generatePalette,
  HSL_SWEET_SPOTS,
  STATUS_HUES,
};
