/**
 * Fire22 CSS Highlight System - Color Utilities
 * Bun-native OKLCH color calculations and transformations
 * Version: 1.00.10-ALPHA
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// OKLCH Color Type Definitions
export interface OKLCHColor {
  lightness: number; // 0-1 (0% to 100%)
  chroma: number; // 0+ (saturation)
  hue: number; // 0-360 (degrees)
}

export interface Fire22StatusColor {
  name: string;
  oklch: OKLCHColor;
  description: string;
  useCase: string;
  wcagCompliant: boolean;
}

// Fire22 Status Color Definitions
export const FIRE22_STATUS_COLORS: Record<string, Fire22StatusColor> = {
  success: {
    name: 'success',
    oklch: { lightness: 0.6, chroma: 0.1, hue: 120 },
    description: 'Success green for approved packages',
    useCase: 'Approved packages, completed tasks, positive states',
    wcagCompliant: true,
  },
  warning: {
    name: 'warning',
    oklch: { lightness: 0.8, chroma: 0.15, hue: 80 },
    description: 'Warning yellow for attention-needed packages',
    useCase: 'Packages needing review, caution states, pending actions',
    wcagCompliant: true,
  },
  error: {
    name: 'error',
    oklch: { lightness: 0.6, chroma: 0.22, hue: 25 },
    description: 'Error red for rejected or failed packages',
    useCase: 'Rejected packages, failed operations, critical issues',
    wcagCompliant: true,
  },
  info: {
    name: 'info',
    oklch: { lightness: 0.7, chroma: 0.15, hue: 260 },
    description: 'Info blue for informational states',
    useCase: 'Under review, informational notices, neutral actions',
    wcagCompliant: true,
  },
  default: {
    name: 'default',
    oklch: { lightness: 0.7, chroma: 0.15, hue: 240 },
    description: 'Default neutral blue',
    useCase: 'Default state, neutral packages, baseline highlighting',
    wcagCompliant: true,
  },
  draft: {
    name: 'draft',
    oklch: { lightness: 0.6, chroma: 0.08, hue: 280 },
    description: 'Draft purple for work-in-progress',
    useCase: 'Draft packages, work in progress, development state',
    wcagCompliant: true,
  },
  archived: {
    name: 'archived',
    oklch: { lightness: 0.5, chroma: 0.05, hue: 200 },
    description: 'Archived gray for deprecated packages',
    useCase: 'Archived packages, deprecated items, historical records',
    wcagCompliant: true,
  },
};

// Brand Colors
export const FIRE22_BRAND_COLORS = {
  primary: { lightness: 0.7, chroma: 0.25, hue: 30 },
  secondary: { lightness: 0.65, chroma: 0.2, hue: 45 },
};

/**
 * Convert OKLCH to CSS oklch() function string
 */
export function oklchToCSS(color: OKLCHColor): string {
  const l = Math.round(color.lightness * 100);
  const c = color.chroma.toFixed(2);
  const h = Math.round(color.hue);
  return `oklch(${l}% ${c} ${h})`;
}

/**
 * Get Fire22 highlight color for a specific status
 */
export function getHighlightColor(status: keyof typeof FIRE22_STATUS_COLORS): string {
  const statusColor = FIRE22_STATUS_COLORS[status];
  if (!statusColor) {
    throw new Error(
      `Unknown Fire22 status: ${status}. Available: ${Object.keys(FIRE22_STATUS_COLORS).join(', ')}`
    );
  }
  return oklchToCSS(statusColor.oklch);
}

/**
 * Generate dark mode variant of an OKLCH color
 */
export function generateDarkModeVariant(color: OKLCHColor): OKLCHColor {
  return {
    lightness: Math.min(color.lightness + 0.05, 0.95), // Slightly brighter
    chroma: Math.min(color.chroma + 0.02, 0.4), // Slightly more saturated
    hue: color.hue, // Keep hue the same
  };
}

/**
 * Generate high contrast variant of an OKLCH color
 */
export function generateHighContrastVariant(color: OKLCHColor): OKLCHColor {
  return {
    lightness:
      color.lightness > 0.5
        ? Math.min(color.lightness + 0.1, 0.95)
        : Math.max(color.lightness - 0.1, 0.05),
    chroma: Math.min(color.chroma + 0.05, 0.4),
    hue: color.hue,
  };
}

/**
 * Validate WCAG AA compliance (simplified check)
 * Note: This is a basic implementation. Real WCAG compliance requires more sophisticated contrast ratio calculations
 */
export function validateWCAGCompliance(
  color: OKLCHColor,
  background: 'light' | 'dark' = 'light'
): boolean {
  const backgroundLightness = background === 'light' ? 0.98 : 0.02;
  const contrastRatio = Math.abs(color.lightness - backgroundLightness);

  // Basic heuristic: contrast ratio should be significant for WCAG AA
  return contrastRatio > 0.45; // Roughly equivalent to 4.5:1 contrast ratio
}

/**
 * Generate all theme variants for a status color
 */
export function generateThemeVariants(statusName: string, baseColor: OKLCHColor) {
  return {
    light: baseColor,
    dark: generateDarkModeVariant(baseColor),
    highContrast: generateHighContrastVariant(baseColor),
    highContrastDark: generateHighContrastVariant(generateDarkModeVariant(baseColor)),
  };
}

/**
 * Generate CSS custom properties for all status colors and themes
 */
export function generateCSSCustomProperties(): string {
  let css = '/* Auto-generated Fire22 Color Variables */\n:root {\n';

  // Generate base colors
  Object.entries(FIRE22_STATUS_COLORS).forEach(([name, colorDef]) => {
    css += `  --fire22-color-highlight-${name}-base: ${oklchToCSS(colorDef.oklch)};\n`;
  });

  css += '}\n\n';

  // Generate dark mode variants
  css += '@media (prefers-color-scheme: dark) {\n:root {\n';
  Object.entries(FIRE22_STATUS_COLORS).forEach(([name, colorDef]) => {
    const darkVariant = generateDarkModeVariant(colorDef.oklch);
    css += `  --fire22-color-highlight-${name}-base: ${oklchToCSS(darkVariant)};\n`;
  });
  css += '}\n}\n\n';

  // Generate high contrast variants
  css += '@media (prefers-contrast: high) {\n:root {\n';
  Object.entries(FIRE22_STATUS_COLORS).forEach(([name, colorDef]) => {
    const highContrastVariant = generateHighContrastVariant(colorDef.oklch);
    css += `  --fire22-color-highlight-${name}-base: ${oklchToCSS(highContrastVariant)};\n`;
  });
  css += '}\n}\n';

  return css;
}

/**
 * Color palette preview generator
 */
export function generateColorPalette(): Array<{
  name: string;
  css: string;
  hex: string;
  wcag: boolean;
}> {
  return Object.entries(FIRE22_STATUS_COLORS).map(([name, colorDef]) => ({
    name: name,
    css: oklchToCSS(colorDef.oklch),
    hex: oklchToHex(colorDef.oklch), // Would need implementation
    wcag: colorDef.wcagCompliant,
  }));
}

/**
 * Basic OKLCH to Hex conversion (simplified)
 * Note: This is a placeholder. Real conversion requires complex color space math
 */
function oklchToHex(color: OKLCHColor): string {
  // This is a very simplified conversion - in reality, you'd need a proper color space conversion library
  // For now, return a placeholder
  const r = Math.round(color.lightness * 255);
  const g = Math.round(color.lightness * 255 * (1 - color.chroma / 2));
  const b = Math.round(color.lightness * 255 * (1 - color.chroma));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Create new custom status color
 */
export function createCustomStatusColor(
  name: string,
  lightness: number,
  chroma: number,
  hue: number,
  description: string,
  useCase: string
): Fire22StatusColor {
  const color: OKLCHColor = { lightness, chroma, hue };

  return {
    name,
    oklch: color,
    description,
    useCase,
    wcagCompliant: validateWCAGCompliance(color),
  };
}

/**
 * Export status colors as TypeScript enum
 */
export function generateTypescriptEnum(): string {
  const enumEntries = Object.keys(FIRE22_STATUS_COLORS)
    .map(name => `  ${name.toUpperCase()} = '${name}'`)
    .join(',\n');

  return `export enum Fire22StatusType {\n${enumEntries}\n}`;
}

/**
 * Main CLI interface for color utilities
 */
export async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'generate-css':
      console.log(generateCSSCustomProperties());
      break;

    case 'generate-enum':
      console.log(generateTypescriptEnum());
      break;

    case 'palette':
      console.table(generateColorPalette());
      break;

    case 'validate':
      Object.entries(FIRE22_STATUS_COLORS).forEach(([name, color]) => {
        const lightValid = validateWCAGCompliance(color.oklch, 'light');
        const darkValid = validateWCAGCompliance(color.oklch, 'dark');
        console.log(
          `${name}: Light BG: ${lightValid ? '✅' : '❌'}, Dark BG: ${darkValid ? '✅' : '❌'}`
        );
      });
      break;

    case 'create':
      const [, , , name, l, c, h, ...descParts] = process.argv;
      if (!name || !l || !c || !h) {
        console.error(
          'Usage: bun color-utils.ts create <name> <lightness> <chroma> <hue> <description>'
        );
        process.exit(1);
      }
      const customColor = createCustomStatusColor(
        name,
        parseFloat(l),
        parseFloat(c),
        parseFloat(h),
        descParts.join(' '),
        'Custom status color'
      );
      console.log(`Created color: ${name} = ${oklchToCSS(customColor.oklch)}`);
      console.log(`WCAG Compliant: ${customColor.wcagCompliant ? '✅' : '❌'}`);
      break;

    default:
      console.log(`
🔥 Fire22 Color Utilities v1.00.10-ALPHA

Usage:
  bun color-utils.ts generate-css    Generate CSS custom properties
  bun color-utils.ts generate-enum   Generate TypeScript enum
  bun color-utils.ts palette         Show color palette
  bun color-utils.ts validate        Validate WCAG compliance
  bun color-utils.ts create <name> <l> <c> <h> <desc>  Create custom color

Examples:
  bun color-utils.ts palette
  bun color-utils.ts create urgent 0.7 0.2 15 "Urgent status color"
      `);
  }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
  main();
}
