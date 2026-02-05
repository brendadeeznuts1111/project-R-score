#!/usr/bin/env bun

/**
 * 🎨 Color Utilities
 *
 * Comprehensive color format conversion and manipulation utilities
 * Supports RGBA, HEX, HSL, and CSS color formats
 *
 * @version 1.0.0
 */

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSLAColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface ColorFormats {
  rgba: RGBAColor;
  hex: string;
  hexWithAlpha: string;
  css: string;
  cssRgba: string;
  hsl: HSLAColor;
  cssHsla: string;
}

/**
 * 🎨 Color Converter Class
 */
export class ColorConverter {
  /**
   * Convert RGBA object to various formats
   */
  static fromRGBA(rgba: RGBAColor): ColorFormats {
    const { r, g, b, a } = rgba;

    // Ensure values are in valid ranges
    const validR = Math.max(0, Math.min(255, Math.round(r)));
    const validG = Math.max(0, Math.min(255, Math.round(g)));
    const validB = Math.max(0, Math.min(255, Math.round(b)));
    const validA = Math.max(0, Math.min(1, a));

    // Convert to HEX
    const hex = `#${validR.toString(16).padStart(2, '0')}${validG.toString(16).padStart(2, '0')}${validB.toString(16).padStart(2, '0')}`;
    const alphaHex = Math.round(validA * 255)
      .toString(16)
      .padStart(2, '0');
    const hexWithAlpha = `${hex}${alphaHex}`;

    // Convert to HSL
    const hsl = this.rgbToHsl(validR, validG, validB);
    const hsla: HSLAColor = { ...hsl, a: validA };

    // CSS formats
    const css = validA === 1 ? hex : `rgba(${validR}, ${validG}, ${validB}, ${validA})`;
    const cssRgba = `rgba(${validR}, ${validG}, ${validB}, ${validA})`;
    const cssHsla = `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${validA})`;

    return {
      rgba: { r: validR, g: validG, b: validB, a: validA },
      hex,
      hexWithAlpha,
      css,
      cssRgba,
      hsl: hsla,
      cssHsla,
    };
  }

  /**
   * Parse various color formats to RGBA
   */
  static parseColor(color: string | RGBAColor): RGBAColor {
    if (typeof color === 'object') {
      return color;
    }

    // Remove whitespace
    const cleanColor = color.trim();

    // HEX format
    if (cleanColor.startsWith('#')) {
      return this.hexToRgba(cleanColor);
    }

    // RGB/RGBA format
    if (cleanColor.startsWith('rgb')) {
      return this.cssRgbaToRgba(cleanColor);
    }

    // HSL/HSLA format
    if (cleanColor.startsWith('hsl')) {
      return this.cssHslaToRgba(cleanColor);
    }

    // Default fallback
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Convert HEX to RGBA
   */
  private static hexToRgba(hex: string): RGBAColor {
    const cleanHex = hex.replace('#', '');

    if (cleanHex.length === 3) {
      // Short hex: #RGB
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return { r, g, b, a: 1 };
    } else if (cleanHex.length === 6) {
      // Standard hex: #RRGGBB
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    } else if (cleanHex.length === 8) {
      // Hex with alpha: #RRGGBBAA
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      const a = parseInt(cleanHex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Convert CSS RGBA to RGBA object
   */
  private static cssRgbaToRgba(css: string): RGBAColor {
    const match = css.match(/rgba?\(([^)]+)\)/);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };

    const values = match[1].split(',').map(v => parseFloat(v.trim()));
    return {
      r: values[0] || 0,
      g: values[1] || 0,
      b: values[2] || 0,
      a: values[3] !== undefined ? values[3] : 1,
    };
  }

  /**
   * Convert CSS HSLA to RGBA object
   */
  private static cssHslaToRgba(css: string): RGBAColor {
    const match = css.match(/hsla?\(([^)]+)\)/);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };

    const values = match[1].split(',').map(v => parseFloat(v.trim()));
    const h = values[0] || 0;
    const s = (values[1] || 0) / 100;
    const l = (values[2] || 0) / 100;
    const a = values[3] !== undefined ? values[3] : 1;

    const rgb = this.hslToRgb(h, s, l);
    return { ...rgb, a };
  }

  /**
   * Convert RGB to HSL
   */
  private static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;

    if (diff === 0) {
      return { h: 0, s: 0, l: l * 100 };
    }

    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * Convert HSL to RGB
   */
  private static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return { r, g, b };
  }

  /**
   * Create color variations
   */
  static createVariations(rgba: RGBAColor): {
    lighter: RGBAColor;
    darker: RGBAColor;
    transparent: RGBAColor;
    opaque: RGBAColor;
  } {
    const hsl = this.rgbToHsl(rgba.r, rgba.g, rgba.b);

    // Lighter version (increase lightness)
    const lighterHsl = { ...hsl, l: Math.min(100, hsl.l + 20) };
    const lighterRgb = this.hslToRgb(lighterHsl.h, lighterHsl.s / 100, lighterHsl.l / 100);

    // Darker version (decrease lightness)
    const darkerHsl = { ...hsl, l: Math.max(0, hsl.l - 20) };
    const darkerRgb = this.hslToRgb(darkerHsl.h, darkerHsl.s / 100, darkerHsl.l / 100);

    return {
      lighter: { ...lighterRgb, a: rgba.a },
      darker: { ...darkerRgb, a: rgba.a },
      transparent: { ...rgba, a: rgba.a * 0.5 },
      opaque: { ...rgba, a: 1 },
    };
  }
}

/**
 * 🎨 Quick utility functions
 */
export const colorUtils = {
  /**
   * Convert RGBA object to CSS string
   */
  rgbaToCSS: (rgba: RGBAColor): string => {
    const formats = ColorConverter.fromRGBA(rgba);
    return formats.css;
  },

  /**
   * Parse any color format to RGBA
   */
  parseToRGBA: (color: string | RGBAColor): RGBAColor => {
    return ColorConverter.parseColor(color);
  },

  /**
   * Get all format variations of a color
   */
  getAllFormats: (color: string | RGBAColor): ColorFormats => {
    const rgba = ColorConverter.parseColor(color);
    return ColorConverter.fromRGBA(rgba);
  },

  /**
   * Create color palette from base color
   */
  createPalette: (baseColor: string | RGBAColor) => {
    const rgba = ColorConverter.parseColor(baseColor);
    const variations = ColorConverter.createVariations(rgba);
    const formats = ColorConverter.fromRGBA(rgba);

    return {
      base: formats,
      variations: {
        lighter: ColorConverter.fromRGBA(variations.lighter),
        darker: ColorConverter.fromRGBA(variations.darker),
        transparent: ColorConverter.fromRGBA(variations.transparent),
        opaque: ColorConverter.fromRGBA(variations.opaque),
      },
    };
  },
};

/**
 * Parse color string with multiple RGBA values
 */
export const parseColorString = (colorString: string): RGBAColor[] => {
  // Split by semicolon for multiple colors
  const colorParts = colorString.split(';').filter(part => part.trim());

  return colorParts.map(part => {
    const values = part
      .trim()
      .split(/\s+/)
      .map(v => parseFloat(v));

    if (values.length === 4) {
      // Assume values are in 0-1 range, convert to 0-255 for RGB
      return {
        r: Math.round(values[0] * 255),
        g: Math.round(values[1] * 255),
        b: Math.round(values[2] * 255),
        a: values[3],
      };
    }

    // Fallback to black if parsing fails
    return { r: 0, g: 0, b: 0, a: 1 };
  });
};

/**
 * Convert color array to CSS gradient
 */
export const createGradient = (colors: RGBAColor[], direction: string = 'to right'): string => {
  const colorStops = colors.map((color, index) => {
    const formats = ColorConverter.fromRGBA(color);
    const position = colors.length > 1 ? ` ${(index / (colors.length - 1)) * 100}%` : '';
    return `${formats.cssRgba}${position}`;
  });

  return `linear-gradient(${direction}, ${colorStops.join(', ')})`;
};

// Example usage for your color: { r: 255, g: 99, b: 71, a: 1 }
if (import.meta.main) {
  // Original example
  const exampleColor: RGBAColor = { r: 255, g: 99, b: 71, a: 1 };

  console.log('🎨 Color Conversion Demo');
  console.log('Input:', exampleColor);

  const formats = ColorConverter.fromRGBA(exampleColor);
  console.log('\n📊 All Formats:');
  console.table(formats);

  // New: Parse your color string
  const colorString = '0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1';
  console.log('\n🌈 Parsing Color String:', colorString);

  const parsedColors = parseColorString(colorString);
  console.log('\n📊 Parsed Colors:');
  console.table(parsedColors);

  // Show what this color looks like
  const firstColor = parsedColors[0];
  if (firstColor) {
    const colorFormats = ColorConverter.fromRGBA(firstColor);
    console.log('\n🎨 First Color Analysis:');
    console.table(colorFormats);

    // Create gradient
    const gradient = createGradient(parsedColors);
    console.log('\n🌈 CSS Gradient:');
    console.log(gradient);
  }
}
