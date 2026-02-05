#!/usr/bin/env bun

/**
 * 🎨 ADVANCED HSL Color Theory & Perceptual Utilities
 *
 * Building on the base color system with perceptual uniformity,
 * harmonious palettes, and advanced HSL manipulation techniques.
 */

import { color } from 'bun';
import { colorize } from './color-system.ts';

// ──────────────────────────────────────────────────────────────────────────────
// PERCEPTUAL UNIFORMITY & ADVANCED HSL MATH
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Approximate perceived brightness (luminance) for HSL colors
 * Based on W3C relative luminance formula with HSL adjustments
 */
export function perceivedBrightness(h: number, s: number, l: number): number {
  // Convert HSL to approximate RGB values
  const sNorm = s / 100;
  const lNorm = l / 100;

  // HSL to RGB conversion (simplified)
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = m, g = m, b = m;

  if (0 <= h && h < 60) { r += c; g += x; b += 0; }
  else if (60 <= h && h < 120) { r += x; g += c; b += 0; }
  else if (120 <= h && h < 180) { r += 0; g += c; b += x; }
  else if (180 <= h && h < 240) { r += 0; g += x; b += c; }
  else if (240 <= h && h < 300) { r += x; g += 0; b += c; }
  else if (300 <= h && h < 360) { r += c; g += 0; b += x; }

  // W3C relative luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return Math.min(1, Math.max(0, lum));
}

/**
 * Generate harmonious color palettes using hue offsets
 */
export function generateHarmoniousPalette(
  baseHue: number,
  baseSaturation: number = 85,
  baseLightness: number = 65,
  scheme: 'analogous' | 'complementary' | 'triadic' | 'tetradic' = 'analogous'
): Array<{ hsl: string; hex: string; rgb: string }> {
  const offsets = {
    analogous: [0, 30, -30, 15, -15],          // adjacent hues
    complementary: [0, 180, 15, -15, 195],     // opposite + variants
    triadic: [0, 120, 240, 15, -15],           // 120° apart
    tetradic: [0, 90, 180, 270, 15]            // square
  };

  return offsets[scheme].map(hueOffset => {
    const hue = (baseHue + hueOffset) % 360;
    const hsl = `hsl(${hue}, ${baseSaturation}%, ${baseLightness}%)`;
    return {
      hsl,
      hex: color(hsl, "hex") || "#000000",
      rgb: color(hsl, "rgb") || "rgb(0,0,0)"
    };
  });
}

/**
 * Generate tints and shades with perceptual uniformity
 */
export function generateTintsAndShades(
  baseHsl: { h: number; s: number; l: number },
  steps: number = 5
): { tints: string[]; shades: string[] } {
  const tints: string[] = [];
  const shades: string[] = [];

  // Tints: increase lightness, decrease saturation slightly
  for (let i = 1; i <= steps; i++) {
    const lightness = Math.min(95, baseHsl.l + (i * 6));
    const saturation = Math.max(20, baseHsl.s - (i * 8));
    const hsl = `hsl(${baseHsl.h}, ${saturation}%, ${lightness}%)`;
    tints.push(color(hsl, "hex") || "#ffffff");
  }

  // Shades: decrease lightness, maintain saturation
  for (let i = 1; i <= steps; i++) {
    const lightness = Math.max(8, baseHsl.l - (i * 8));
    const saturation = Math.min(100, baseHsl.s + (i * 2));
    const hsl = `hsl(${baseHsl.h}, ${saturation}%, ${lightness}%)`;
    shades.push(color(hsl, "hex") || "#000000");
  }

  return { tints, shades };
}

// ──────────────────────────────────────────────────────────────────────────────
// DYNAMIC STATUS COLORING WITH PERCEPTUAL ADJUSTMENT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Advanced status coloring with perceptual uniformity and severity levels
 */
export function getDynamicStatusColor(
  status: 'success' | 'warning' | 'error' | 'info',
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context: 'light' | 'dark' = 'dark'
): string {
  const baseHues = {
    success: 135,   // green
    warning: 45,    // amber
    error: 0,       // red
    info: 210       // blue
  };

  const severityMultipliers = {
    low: { saturation: 0.7, lightness: 1.1 },
    medium: { saturation: 1.0, lightness: 1.0 },
    high: { saturation: 1.2, lightness: 0.9 },
    critical: { saturation: 1.4, lightness: 0.8 }
  };

  const contextAdjustments = {
    light: { lightness: 1.2, saturation: 0.9 },
    dark: { lightness: 1.0, saturation: 1.0 }
  };

  const baseHue = baseHues[status];
  const severityMult = severityMultipliers[severity];
  const contextAdj = contextAdjustments[context];

  // Calculate final values with perceptual compensation
  const saturation = Math.min(100, 85 * severityMult.saturation * contextAdj.saturation);
  const lightness = Math.min(85, Math.max(35, 65 * severityMult.lightness * contextAdj.lightness));

  // Add slight hue shift for severity (more extreme colors)
  const hueShift = (severity === 'critical') ? 5 : (severity === 'high') ? 3 : 0;
  const finalHue = (baseHue + hueShift) % 360;

  return `hsl(${finalHue}, ${saturation}%, ${lightness}%)`;
}

/**
 * WCAG contrast-compliant color combinations
 */
export function ensureContrast(
  foregroundHsl: { h: number; s: number; l: number },
  backgroundHsl: { h: number; s: number; l: number },
  level: 'AA' | 'AAA' = 'AA'
): { fg: string; bg: string; ratio: number; compliant: boolean } {
  const fgLum = perceivedBrightness(foregroundHsl.h, foregroundHsl.s, foregroundHsl.l);
  const bgLum = perceivedBrightness(backgroundHsl.h, backgroundHsl.s, backgroundHsl.l);

  const contrast = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
  const requiredRatio = level === 'AAA' ? 7 : 4.5;

  return {
    fg: `hsl(${foregroundHsl.h}, ${foregroundHsl.s}%, ${foregroundHsl.l}%)`,
    bg: `hsl(${backgroundHsl.h}, ${backgroundHsl.s}%, ${backgroundHsl.l}%)`,
    ratio: contrast,
    compliant: contrast >= requiredRatio
  };
}

/**
 * Auto-adjust foreground color for optimal contrast
 */
export function autoAdjustContrast(
  foregroundHsl: { h: number; s: number; l: number },
  backgroundHsl: { h: number; s: number; l: number },
  targetRatio: number = 4.5
): { h: number; s: number; l: number } {
  const bgLum = perceivedBrightness(backgroundHsl.h, backgroundHsl.s, backgroundHsl.l);
  const bgIsDark = bgLum < 0.5;

  // Start with foreground lightness
  let adjustedL = foregroundHsl.l;

  // Adjust lightness to achieve target contrast
  const maxIterations = 20;
  for (let i = 0; i < maxIterations; i++) {
    const currentLum = perceivedBrightness(foregroundHsl.h, foregroundHsl.s, adjustedL);
    const contrast = (Math.max(currentLum, bgLum) + 0.05) / (Math.min(currentLum, bgLum) + 0.05);

    if (Math.abs(contrast - targetRatio) < 0.1) break;

    // Adjust lightness based on background
    if (contrast < targetRatio) {
      adjustedL = bgIsDark ? Math.min(95, adjustedL + 2) : Math.max(5, adjustedL - 2);
    } else {
      adjustedL = bgIsDark ? Math.max(5, adjustedL - 2) : Math.min(95, adjustedL + 2);
    }
  }

  return { h: foregroundHsl.h, s: foregroundHsl.s, l: adjustedL };
}

// ──────────────────────────────────────────────────────────────────────────────
// ENHANCED COLORIZE FUNCTIONS WITH ADVANCED FEATURES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Advanced colorize with perceptual uniformity and auto-contrast
 */
export function advancedColorize(
  text: string,
  status: 'success' | 'warning' | 'error' | 'info',
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  options: {
    bold?: boolean;
    ensureContrast?: boolean;
    backgroundHsl?: { h: number; s: number; l: number };
  } = {}
): string {
  const hslString = getDynamicStatusColor(status, severity, 'dark');

  if (options.ensureContrast && options.backgroundHsl) {
    const hslMatch = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const fgHsl = {
        h: parseInt(hslMatch[1]),
        s: parseInt(hslMatch[2]),
        l: parseInt(hslMatch[3])
      };

      const adjustedFg = autoAdjustContrast(fgHsl, options.backgroundHsl);
      const adjustedHsl = `hsl(${adjustedFg.h}, ${adjustedFg.s}%, ${adjustedFg.l}%)`;
      const ansi = color(adjustedHsl, "ansi") || "";
      return `${options.bold ? '\x1b[1m' : ''}${ansi}${text}\x1b[0m`;
    }
  }

  const ansi = color(hslString, "ansi") || "";
  return `${options.bold ? '\x1b[1m' : ''}${ansi}${text}\x1b[0m`;
}

// ──────────────────────────────────────────────────────────────────────────────
// DEMO & TESTING FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

export function demoAdvancedHSL(): void {
  console.log(colorize('🎨 ADVANCED HSL COLOR THEORY DEMO', 'cyan', true));
  console.log(colorize('═'.repeat(50), 'gray'));
  console.log();

  // Harmonious palette demo
  console.log(colorize('🎯 Harmonious Palettes:', 'yellow', true));
  const baseHue = 210; // blue
  const palette = generateHarmoniousPalette(baseHue, 85, 65, 'analogous');

  palette.forEach((color, i) => {
    console.log(`${i + 1}. ${color.hex} (${color.hsl})`);
  });
  console.log();

  // Tints and shades demo
  console.log(colorize('🎨 Tints & Shades:', 'magenta', true));
  const baseColor = { h: 135, s: 90, l: 60 }; // green
  const { tints, shades } = generateTintsAndShades(baseColor);

  console.log('Tints:', tints.join(' '));
  console.log('Shades:', shades.join(' '));
  console.log();

  // Dynamic status coloring
  console.log(colorize('📊 Dynamic Status Colors:', 'green', true));
  const statuses: Array<'success' | 'warning' | 'error' | 'info'> = ['success', 'warning', 'error', 'info'];
  const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

  statuses.forEach(status => {
    console.log(`${status.toUpperCase()}:`);
    severities.forEach(severity => {
      const hsl = getDynamicStatusColor(status, severity);
      const hex = color(hsl, "hex");
      console.log(`  ${severity}: ${hex} (${hsl})`);
    });
    console.log();
  });

  // Perceptual brightness demo
  console.log(colorize('💡 Perceptual Brightness:', 'blue', true));
  const testColors = [
    { h: 0, s: 100, l: 50 },   // pure red
    { h: 0, s: 100, l: 25 },   // dark red
    { h: 0, s: 100, l: 75 },   // light red
    { h: 60, s: 100, l: 50 },  // pure yellow
    { h: 240, s: 100, l: 50 }, // pure blue
  ];

  testColors.forEach(color => {
    const brightness = perceivedBrightness(color.h, color.s, color.l);
    const hsl = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    const hex = Bun.color(hsl, "hex");
    console.log(`${hex}: Brightness = ${(brightness * 100).toFixed(1)}%`);
  });
}