/**
 * Badge Color Generator using Bun.color()
 * Generates CSS-compatible color values for dashboard badges
 * 
 * This file can be used with Bun macros to generate colors at build time
 */

// Badge color definitions using various input formats
export const badgeColors = {
  // Version badge - Blue
  version: {
    css: Bun.color("#3b82f6", "css"),           // Blue-500
    hex: Bun.color("#3b82f6", "hex"),           // Lowercase hex
    HEX: Bun.color("#3b82f6", "HEX"),           // Uppercase hex
    rgb: Bun.color("#3b82f6", "rgb"),           // RGB string
    rgba: Bun.color("#3b82f6", "rgba"),         // RGBA string
    number: Bun.color("#3b82f6", "number"),     // Number format
    rgbaObj: Bun.color("#3b82f6", "{rgba}"),    // RGBA object
    rgbaArr: Bun.color("#3b82f6", "[rgba]"),    // RGBA array
  },
  
  // Cookie badge - Yellow
  cookie: {
    css: Bun.color("#eab308", "css"),           // Yellow-500
    hex: Bun.color("#eab308", "hex"),
    HEX: Bun.color("#eab308", "HEX"),
    rgb: Bun.color("#eab308", "rgb"),
    rgba: Bun.color("#eab308", "rgba"),
    number: Bun.color("#eab308", "number"),
    rgbaObj: Bun.color("#eab308", "{rgba}"),
    rgbaArr: Bun.color("#eab308", "[rgba]"),
  },
  
  // Demo badge - Purple
  demo: {
    css: Bun.color("#9333ea", "css"),           // Purple-600
    hex: Bun.color("#9333ea", "hex"),
    HEX: Bun.color("#9333ea", "HEX"),
    rgb: Bun.color("#9333ea", "rgb"),
    rgba: Bun.color("#9333ea", "rgba"),
    number: Bun.color("#9333ea", "number"),
    rgbaObj: Bun.color("#9333ea", "{rgba}"),
    rgbaArr: Bun.color("#9333ea", "[rgba]"),
  },
  
  // Connected status - Green
  connected: {
    css: Bun.color("#22c55e", "css"),          // Green-500
    hex: Bun.color("#22c55e", "hex"),
    HEX: Bun.color("#22c55e", "HEX"),
    rgb: Bun.color("#22c55e", "rgb"),
    rgba: Bun.color("#22c55e", "rgba"),
    number: Bun.color("#22c55e", "number"),
    rgbaObj: Bun.color("#22c55e", "{rgba}"),
    rgbaArr: Bun.color("#22c55e", "[rgba]"),
  },
};

// Export CSS-ready color values
export const badgeColorsCSS = {
  version: badgeColors.version.css,
  cookie: badgeColors.cookie.css,
  demo: badgeColors.demo.css,
  connected: badgeColors.connected.css,
};

// Example usage:
// import { badgeColorsCSS } from './badge-colors.ts';
// element.style.backgroundColor = badgeColorsCSS.version;
