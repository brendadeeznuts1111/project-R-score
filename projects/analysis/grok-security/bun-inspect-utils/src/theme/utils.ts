/**
 * [THEME][UTILS][META:{VERSION:1.0.0}][#REF:theme-system,utilities]{BUN-NATIVE}
 * Theme utility functions for manipulation, accessibility, and export/import
 * Based on infrastructure/theme-aware-guide.md specifications
 */

import type { ThemeProfile, ThemeColors } from "./types";

/**
 * Parse a hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 */
export function meetsWCAGContrast(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Validate theme accessibility
 */
export function validateThemeAccessibility(theme: ThemeProfile): {
  isValid: boolean;
  issues: string[];
  contrastRatios: Record<string, number>;
} {
  const issues: string[] = [];
  const contrastRatios: Record<string, number> = {};

  // Check text on background
  const textOnBg = getContrastRatio(theme.colors.text, theme.colors.background);
  contrastRatios["text-on-background"] = textOnBg;
  if (textOnBg < 4.5) {
    issues.push(`Text on background contrast (${textOnBg.toFixed(2)}) is below WCAG AA (4.5)`);
  }

  // Check text on surface
  const textOnSurface = getContrastRatio(theme.colors.text, theme.colors.surface);
  contrastRatios["text-on-surface"] = textOnSurface;
  if (textOnSurface < 4.5) {
    issues.push(`Text on surface contrast (${textOnSurface.toFixed(2)}) is below WCAG AA (4.5)`);
  }

  // Check primary on background
  const primaryOnBg = getContrastRatio(theme.colors.primary, theme.colors.background);
  contrastRatios["primary-on-background"] = primaryOnBg;

  return {
    isValid: issues.length === 0,
    issues,
    contrastRatios,
  };
}

/**
 * Merge two themes (base + overrides)
 */
export function mergeThemes(
  base: ThemeProfile,
  overrides: Partial<ThemeProfile>
): ThemeProfile {
  return {
    ...base,
    ...overrides,
    colors: {
      ...base.colors,
      ...(overrides.colors ?? {}),
    },
    typography: {
      ...base.typography,
      ...(overrides.typography ?? {}),
    },
    borderRadius: {
      ...base.borderRadius,
      ...(overrides.borderRadius ?? {}),
    },
    shadows: {
      ...base.shadows,
      ...(overrides.shadows ?? {}),
    },
  };
}

/**
 * Clone a theme with a new ID
 */
export function cloneTheme(
  theme: ThemeProfile,
  newId: string,
  newName?: string
): ThemeProfile {
  return {
    ...theme,
    id: newId,
    name: newName ?? `${theme.name} (Copy)`,
    category: "custom",
  };
}

/**
 * Export theme to JSON string
 */
export function exportThemeToJSON(theme: ThemeProfile): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * Import theme from JSON string
 */
export function importThemeFromJSON(json: string): ThemeProfile {
  const parsed = JSON.parse(json);
  if (!parsed.id || !parsed.name || !parsed.colors) {
    throw new Error("Invalid theme JSON: missing required fields");
  }
  return parsed as ThemeProfile;
}

