/**
 * DuoPlus Color Utilities - Bun Native Color API Integration
 *
 * Provides comprehensive color management with HSL, hex, and color channel support
 * for the DuoPlus Scoping Matrix system.
 */

import { BUN_INSPECT_CUSTOM } from "../../types/symbols.ts";

// ============================================================================
// Color Type Definitions
// ============================================================================

/**
 * Supported color spaces and formats
 */
export type ColorSpace = "hsl" | "rgb" | "hex" | "hsv" | "lab" | "lch";

/**
 * HSL color representation
 */
export interface HSLColor {
  readonly h: number; // Hue (0-360)
  readonly s: number; // Saturation (0-100)
  readonly l: number; // Lightness (0-100)
  readonly a?: number; // Alpha (0-1), optional
}

/**
 * RGB color representation
 */
export interface RGBColor {
  readonly r: number; // Red (0-255)
  readonly g: number; // Green (0-255)
  readonly b: number; // Blue (0-255)
  readonly a?: number; // Alpha (0-1), optional
}

/**
 * Color channel values for different representations
 */
export interface ColorChannels {
  readonly hsl: HSLColor;
  readonly rgb: RGBColor;
  readonly hex: string;
  readonly name?: string; // Human-readable name
  readonly category?: string; // Color category (primary, secondary, etc.)
}

/**
 * Color rule definition for scoping matrix
 */
export interface ColorRule {
  readonly scope: string; // Scope identifier
  readonly feature: string; // Feature name
  readonly state: "enabled" | "disabled" | "limited" | "conditional";
  readonly color: ColorChannels;
  readonly contrast?: {
    readonly fg: string; // Foreground color for text
    readonly bg: string; // Background color
    readonly ratio: number; // Contrast ratio
  };
}

// ============================================================================
// Core Color Constants
// ============================================================================

/**
 * DuoPlus brand color palette
 */
export const DUOPLUS_COLORS = {
  // Primary brand colors
  primary: {
    hsl: { h: 220, s: 89, l: 56 },
    rgb: { r: 59, g: 130, b: 246 },
    hex: "#3b82f6",
    name: "DuoPlus Blue",
    category: "primary"
  },

  // Status colors
  success: {
    hsl: { h: 142, s: 76, l: 36 },
    rgb: { r: 34, g: 197, b: 94 },
    hex: "#22c55e",
    name: "Success Green",
    category: "status"
  },

  warning: {
    hsl: { h: 38, s: 92, l: 50 },
    rgb: { r: 245, g: 158, b: 11 },
    hex: "#f59e0b",
    name: "Warning Amber",
    category: "status"
  },

  error: {
    hsl: { h: 0, s: 84, l: 60 },
    rgb: { r: 220, g: 38, b: 38 },
    hex: "#dc2626",
    name: "Error Red",
    category: "status"
  },

  info: {
    hsl: { h: 199, s: 89, l: 48 },
    rgb: { r: 14, g: 165, b: 233 },
    hex: "#0ea5e9",
    name: "Info Blue",
    category: "status"
  },

  // Scope-specific colors
  enterprise: {
    hsl: { h: 220, s: 89, l: 56 },
    rgb: { r: 59, g: 130, b: 246 },
    hex: "#3b82f6",
    name: "Enterprise Blue",
    category: "scope"
  },

  development: {
    hsl: { h: 142, s: 76, l: 36 },
    rgb: { r: 34, g: 197, b: 94 },
    hex: "#22c55e",
    name: "Development Green",
    category: "scope"
  },

  personal: {
    hsl: { h: 38, s: 92, l: 50 },
    rgb: { r: 245, g: 158, b: 11 },
    hex: "#f59e0b",
    name: "Personal Amber",
    category: "scope"
  },

  public: {
    hsl: { h: 0, s: 84, l: 60 },
    rgb: { r: 220, g: 38, b: 38 },
    hex: "#dc2626",
    name: "Public Red",
    category: "scope"
  },

  // Platform colors
  windows: {
    hsl: { h: 212, s: 100, l: 48 },
    rgb: { r: 0, g: 120, b: 212 },
    hex: "#0078d4",
    name: "Windows Blue",
    category: "platform"
  },

  macos: {
    hsl: { h: 0, s: 0, l: 0 },
    rgb: { r: 0, g: 0, b: 0 },
    hex: "#000000",
    name: "macOS Black",
    category: "platform"
  },

  linux: {
    hsl: { h: 45, s: 100, l: 76 },
    rgb: { r: 252, g: 186, b: 36 },
    hex: "#fcca24",
    name: "Linux Gold",
    category: "platform"
  },

  android: {
    hsl: { h: 122, s: 39, l: 49 },
    rgb: { r: 76, g: 175, b: 80 },
    hex: "#4caf50",
    name: "Android Green",
    category: "platform"
  },

  ios: {
    hsl: { h: 0, s: 0, l: 27 },
    rgb: { r: 142, g: 142, b: 147 },
    hex: "#8e8e93",
    name: "iOS Gray",
    category: "platform"
  }
} as const;

// ============================================================================
// Color Utility Functions
// ============================================================================

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const { h, s, l, a } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGBColor): HSLColor {
  const { r, g, b, a } = rgb;
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = diff / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / diff) % 6;
        break;
      case gNorm:
        h = (bNorm - rNorm) / diff + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / diff + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGBColor): string {
  const { r, g, b, a } = rgb;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  if (a !== undefined && a < 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): RGBColor {
  const cleanHex = hex.replace('#', '');
  const isShort = cleanHex.length === 3;
  const isAlpha = cleanHex.length === 8 || (isShort && cleanHex.length === 4);

  const expand = (s: string) => s.length === 1 ? s + s : s;
  const fullHex = isShort ? cleanHex.split('').map(expand).join('') : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  const a = isAlpha ? parseInt(fullHex.slice(6, 8), 16) / 255 : undefined;

  return { r, g, b, a };
}

/**
 * Create complete color channels from any input
 */
export function createColorChannels(input: string | RGBColor | HSLColor): ColorChannels {
  let rgb: RGBColor;
  let hsl: HSLColor;
  let hex: string;

  if (typeof input === 'string') {
    // Assume hex input
    hex = input.startsWith('#') ? input : `#${input}`;
    rgb = hexToRgb(hex);
    hsl = rgbToHsl(rgb);
  } else if ('r' in input) {
    // RGB input
    rgb = input;
    hsl = rgbToHsl(rgb);
    hex = rgbToHex(rgb);
  } else {
    // HSL input
    hsl = input;
    rgb = hslToRgb(hsl);
    hex = rgbToHex(rgb);
  }

  return { hsl, rgb, hex };
}

/**
 * Calculate color contrast ratio (WCAG)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Calculate relative luminance
 */
function getLuminance(rgb: RGBColor): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Generate color variations
 */
export function generateColorVariations(baseColor: ColorChannels, variations: number = 5): ColorChannels[] {
  const { hsl } = baseColor;
  const variationsArray: ColorChannels[] = [];

  for (let i = 0; i < variations; i++) {
    const lightness = Math.max(10, Math.min(90, hsl.l + (i - Math.floor(variations / 2)) * 10));
    const newHsl: HSLColor = { ...hsl, l: lightness };
    variationsArray.push(createColorChannels(newHsl));
  }

  return variationsArray;
}

// ============================================================================
// Scoping Matrix Color Rules
// ============================================================================

/**
 * Color rules for scoping matrix visualization
 */
export const SCOPING_MATRIX_COLOR_RULES: ColorRule[] = [
  // Scope status colors
  {
    scope: "ENTERPRISE",
    feature: "status",
    state: "enabled",
    color: DUOPLUS_COLORS.enterprise,
    contrast: {
      fg: "#ffffff",
      bg: DUOPLUS_COLORS.enterprise.hex,
      ratio: 8.2
    }
  },
  {
    scope: "DEVELOPMENT",
    feature: "status",
    state: "enabled",
    color: DUOPLUS_COLORS.development,
    contrast: {
      fg: "#ffffff",
      bg: DUOPLUS_COLORS.development.hex,
      ratio: 6.8
    }
  },
  {
    scope: "PERSONAL",
    feature: "status",
    state: "limited",
    color: DUOPLUS_COLORS.personal,
    contrast: {
      fg: "#000000",
      bg: DUOPLUS_COLORS.personal.hex,
      ratio: 4.2
    }
  },
  {
    scope: "PUBLIC",
    feature: "status",
    state: "disabled",
    color: DUOPLUS_COLORS.public,
    contrast: {
      fg: "#ffffff",
      bg: DUOPLUS_COLORS.public.hex,
      ratio: 5.9
    }
  },

  // Feature availability colors
  {
    scope: "*",
    feature: "enabled",
    state: "enabled",
    color: DUOPLUS_COLORS.success,
    contrast: {
      fg: "#ffffff",
      bg: DUOPLUS_COLORS.success.hex,
      ratio: 6.8
    }
  },
  {
    scope: "*",
    feature: "disabled",
    state: "disabled",
    color: DUOPLUS_COLORS.error,
    contrast: {
      fg: "#ffffff",
      bg: DUOPLUS_COLORS.error.hex,
      ratio: 5.9
    }
  },
  {
    scope: "*",
    feature: "limited",
    state: "limited",
    color: DUOPLUS_COLORS.warning,
    contrast: {
      fg: "#000000",
      bg: DUOPLUS_COLORS.warning.hex,
      ratio: 4.2
    }
  },

  // Platform colors
  {
    scope: "*",
    feature: "windows",
    state: "enabled",
    color: DUOPLUS_COLORS.windows
  },
  {
    scope: "*",
    feature: "macos",
    state: "enabled",
    color: DUOPLUS_COLORS.macos
  },
  {
    scope: "*",
    feature: "linux",
    state: "enabled",
    color: DUOPLUS_COLORS.linux
  }
];

// ============================================================================
// Bun Color API Integration
// ============================================================================

/**
 * Bun color utilities with enhanced functionality
 */
export class BunColorAPI {
  /**
   * Create a Bun color from HSL values
   */
  static fromHSL(h: number, s: number, l: number, a: number = 1): any {
    // This would use Bun.color() when available
    // For now, return a color object that can be used with Bun's color API
    return {
      hsl: { h, s, l, a },
      toString: () => `hsl(${h}, ${s}%, ${l}%)`,
      toHex: () => rgbToHex(hslToRgb({ h, s, l, a })),
      channels: createColorChannels({ h, s, l, a })
    };
  }

  /**
   * Create a Bun color from hex string
   */
  static fromHex(hex: string): any {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb);

    return {
      hex,
      rgb,
      hsl,
      toString: () => hex,
      toHSL: () => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      channels: createColorChannels(hex)
    };
  }

  /**
   * Create a Bun color from RGB values
   */
  static fromRGB(r: number, g: number, b: number, a: number = 1): any {
    const hex = rgbToHex({ r, g, b, a });
    const hsl = rgbToHsl({ r, g, b, a });

    return {
      rgb: { r, g, b, a },
      hex,
      hsl,
      toString: () => hex,
      toHSL: () => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      channels: createColorChannels({ r, g, b, a })
    };
  }

  /**
   * Mix two colors
   */
  static mix(color1: string, color2: string, weight: number = 0.5): any {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const mixed: RGBColor = {
      r: Math.round(rgb1.r * (1 - weight) + rgb2.r * weight),
      g: Math.round(rgb1.g * (1 - weight) + rgb2.g * weight),
      b: Math.round(rgb1.b * (1 - weight) + rgb2.b * weight),
      a: rgb1.a !== undefined && rgb2.a !== undefined
        ? rgb1.a * (1 - weight) + rgb2.a * weight
        : undefined
    };

    return BunColorAPI.fromRGB(mixed.r, mixed.g, mixed.b, mixed.a);
  }

  /**
   * Lighten a color
   */
  static lighten(color: string, amount: number = 0.1): any {
    const hsl = rgbToHsl(hexToRgb(color));
    const newLightness = Math.min(100, hsl.l + amount * 100);
    return BunColorAPI.fromHSL(hsl.h, hsl.s, newLightness, hsl.a);
  }

  /**
   * Darken a color
   */
  static darken(color: string, amount: number = 0.1): any {
    const hsl = rgbToHsl(hexToRgb(color));
    const newLightness = Math.max(0, hsl.l - amount * 100);
    return BunColorAPI.fromHSL(hsl.h, hsl.s, newLightness, hsl.a);
  }
}

// ============================================================================
// Naming Convention Rules
// ============================================================================

/**
 * TypeScript/JavaScript naming convention rules
 */
export interface NamingConventionRules {
  readonly functions: "camelCase";
  readonly methods: "camelCase";
  readonly variables: "camelCase";
  readonly constants: "SCREAMING_SNAKE_CASE" | "PascalCase";
  readonly classes: "PascalCase";
  readonly interfaces: "PascalCase";
  readonly types: "PascalCase";
  readonly enums: "PascalCase";
  readonly files: "kebab-case" | "camelCase" | "PascalCase";
  readonly directories: "kebab-case";
  readonly privateMembers: "camelCase" | "_camelCase" | "#camelCase";
  readonly protectedMembers: "camelCase" | "_camelCase";
  readonly publicMembers: "camelCase";
}

/**
 * DuoPlus naming convention standards
 */
export const DUOPLUS_NAMING_RULES: NamingConventionRules = {
  functions: "camelCase",
  methods: "camelCase",
  variables: "camelCase",
  constants: "SCREAMING_SNAKE_CASE",
  classes: "PascalCase",
  interfaces: "PascalCase",
  types: "PascalCase",
  enums: "PascalCase",
  files: "kebab-case",
  directories: "kebab-case",
  privateMembers: "_camelCase",
  protectedMembers: "_camelCase",
  publicMembers: "camelCase"
};

/**
 * Validate naming convention
 */
export function validateNamingConvention(
  name: string,
  type: keyof NamingConventionRules,
  convention: NamingConventionRules = DUOPLUS_NAMING_RULES
): boolean {
  const expectedConvention = convention[type];

  switch (expectedConvention) {
    case "camelCase":
      return /^[a-z][a-zA-Z0-9]*$/.test(name);
    case "PascalCase":
      return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    case "SCREAMING_SNAKE_CASE":
      return /^[A-Z][A-Z0-9_]*$/.test(name);
    case "kebab-case":
      return /^[a-z][a-z0-9-]*$/.test(name);
    case "_camelCase":
      return /^_[a-z][a-zA-Z0-9]*$/.test(name);
    default:
      return true; // Unknown convention, allow
  }
}

// ============================================================================
// Custom Inspection
// ============================================================================

Object.defineProperty(SCOPING_MATRIX_COLOR_RULES, BUN_INSPECT_CUSTOM, {
  value(depth: number, options: any, inspect: Function) {
    const summary = {
      "[COLOR:v2.1]": {
        totalRules: SCOPING_MATRIX_COLOR_RULES.length,
        categories: [...new Set(SCOPING_MATRIX_COLOR_RULES.map(r => r.color.category))],
        scopes: [...new Set(SCOPING_MATRIX_COLOR_RULES.map(r => r.scope))],
        states: [...new Set(SCOPING_MATRIX_COLOR_RULES.map(r => r.state))],
        colorSpaces: ["hsl", "rgb", "hex"],
        namingRules: DUOPLUS_NAMING_RULES
      },
    };

    if (depth > 0) {
      summary["[COLOR:v2.1]"].rules = SCOPING_MATRIX_COLOR_RULES.slice(0, 5).map(rule => ({
        scope: rule.scope,
        feature: rule.feature,
        state: rule.state,
        hex: rule.color.hex,
        name: rule.color.name
      }));
    }

    return summary;
  },
  writable: false,
});

// ============================================================================
// Exports
// ============================================================================

export {
  type ColorSpace,
  type HSLColor,
  type RGBColor,
  type ColorChannels,
  type ColorRule,
  type NamingConventionRules
};