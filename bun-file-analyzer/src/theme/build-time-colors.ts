import { color } from "bun" with { type: "macro" };

// Define semantic palette using HSL (designer-friendly) - WCAG AA compliant
const PALETTE = {
  primary: "hsl(210, 90%, 45%)",   // Darker blue for better contrast
  success: "hsl(145, 70%, 30%)",   // Much darker green
  warning: "hsl(25, 85%, 40%)",    // Darker amber
  error: "hsl(0, 75%, 45%)",       // Darker red
  info: "hsl(195, 85%, 35%)",      // Darker cyan
  
  // Semantic colors for specific use cases
  brand: "hsl(220, 85%, 50%)",     // Darker brand blue
  accent: "hsl(280, 70%, 50%)",    // Darker purple accent
  neutral: "hsl(210, 20%, 40%)",   // Darker gray neutral
  
  // Financial theme colors - high contrast
  profit: "hsl(145, 80%, 25%)",    // Much darker green for profit
  loss: "hsl(0, 75%, 40%)",        // Darker red for loss
  neutral: "hsl(45, 70%, 45%)",    // Darker gold for neutral
  
  // Background colors
  background: "hsl(0, 0%, 100%)",  // White
  surface: "hsl(210, 30%, 98%)",   // Light gray surface
  border: "hsl(210, 25%, 85%)",    // Darker border for contrast
  
  // Text colors - optimized for readability
  textPrimary: "hsl(210, 30%, 10%)",   // Very dark text
  textSecondary: "hsl(210, 25%, 35%)", // Medium text with good contrast
  textMuted: "hsl(210, 25%, 45%)",     // Darker muted text for AA compliance
  
  // Status colors - high contrast versions
  online: "hsl(145, 70%, 30%)",     // Darker green for online
  offline: "hsl(0, 0%, 45%)",       // Darker gray for offline
  pending: "hsl(45, 85%, 35%)",     // Darker yellow for pending compliance
} as const;

// Generate all formats at build time
export const THEME = {
  // CSS-ready hex strings (lowercase for consistency)
  hex: {
    primary: color(PALETTE.primary, "hex"),
    success: color(PALETTE.success, "hex"),
    warning: color(PALETTE.warning, "hex"),
    error: color(PALETTE.error, "hex"),
    info: color(PALETTE.info, "hex"),
    brand: color(PALETTE.brand, "hex"),
    accent: color(PALETTE.accent, "hex"),
    neutral: color(PALETTE.neutral, "hex"),
    profit: color(PALETTE.profit, "hex"),
    loss: color(PALETTE.loss, "hex"),
    background: color(PALETTE.background, "hex"),
    surface: color(PALETTE.surface, "hex"),
    border: color(PALETTE.border, "hex"),
    textPrimary: color(PALETTE.textPrimary, "hex"),
    textSecondary: color(PALETTE.textSecondary, "hex"),
    textMuted: color(PALETTE.textMuted, "hex"),
    online: color(PALETTE.online, "hex"),
    offline: color(PALETTE.offline, "hex"),
    pending: color(PALETTE.pending, "hex"),
  },

  // RGB arrays for canvas/WebGL
  rgb: {
    primary: color(PALETTE.primary, "[rgb]"),
    success: color(PALETTE.success, "[rgb]"),
    warning: color(PALETTE.warning, "[rgb]"),
    error: color(PALETTE.error, "[rgb]"),
    info: color(PALETTE.info, "[rgb]"),
    brand: color(PALETTE.brand, "[rgb]"),
    accent: color(PALETTE.accent, "[rgb]"),
    neutral: color(PALETTE.neutral, "[rgb]"),
    profit: color(PALETTE.profit, "[rgb]"),
    loss: color(PALETTE.loss, "[rgb]"),
    background: color(PALETTE.background, "[rgb]"),
    surface: color(PALETTE.surface, "[rgb]"),
    border: color(PALETTE.border, "[rgb]"),
    textPrimary: color(PALETTE.textPrimary, "[rgb]"),
    textSecondary: color(PALETTE.textSecondary, "[rgb]"),
    textMuted: color(PALETTE.textMuted, "[rgb]"),
    online: color(PALETTE.online, "[rgb]"),
    offline: color(PALETTE.offline, "[rgb]"),
    pending: color(PALETTE.pending, "[rgb]"),
  },

  // CSS color names (for logs/UI labels)
  css: {
    primary: color(PALETTE.primary, "css"),
    success: color(PALETTE.success, "css"),
    warning: color(PALETTE.warning, "css"),
    error: color(PALETTE.error, "css"),
    info: color(PALETTE.info, "css"),
    brand: color(PALETTE.brand, "css"),
    accent: color(PALETTE.accent, "css"),
    neutral: color(PALETTE.neutral, "css"),
    profit: color(PALETTE.profit, "css"),
    loss: color(PALETTE.loss, "css"),
    background: color(PALETTE.background, "css"),
    surface: color(PALETTE.surface, "css"),
    border: color(PALETTE.border, "css"),
    textPrimary: color(PALETTE.textPrimary, "css"),
    textSecondary: color(PALETTE.textSecondary, "css"),
    textMuted: color(PALETTE.textMuted, "css"),
    online: color(PALETTE.online, "css"),
    offline: color(PALETTE.offline, "css"),
    pending: color(PALETTE.pending, "css"),
  },
} as const;

// Export individual constants for tree-shaking
export const PRIMARY_HEX = color(PALETTE.primary, "hex");
export const SUCCESS_HEX = color(PALETTE.success, "hex");
export const WARNING_HEX = color(PALETTE.warning, "hex");
export const ERROR_HEX = color(PALETTE.error, "hex");
export const INFO_HEX = color(PALETTE.info, "hex");

export const BRAND_HEX = color(PALETTE.brand, "hex");
export const ACCENT_HEX = color(PALETTE.accent, "hex");
export const NEUTRAL_HEX = color(PALETTE.neutral, "hex");

export const PROFIT_HEX = color(PALETTE.profit, "hex");
export const LOSS_HEX = color(PALETTE.loss, "hex");

export const BACKGROUND_HEX = color(PALETTE.background, "hex");
export const SURFACE_HEX = color(PALETTE.surface, "hex");
export const BORDER_HEX = color(PALETTE.border, "hex");

export const TEXT_PRIMARY_HEX = color(PALETTE.textPrimary, "hex");
export const TEXT_SECONDARY_HEX = color(PALETTE.textSecondary, "hex");
export const TEXT_MUTED_HEX = color(PALETTE.textMuted, "hex");

// RGB arrays for performance-critical operations
export const PRIMARY_RGB = color(PALETTE.primary, "[rgb]");
export const SUCCESS_RGB = color(PALETTE.success, "[rgb]");
export const ERROR_RGB = color(PALETTE.error, "[rgb]");
export const PROFIT_RGB = color(PALETTE.profit, "rgb");
export const LOSS_RGB = color(PALETTE.loss, "rgb]");

// Export the original palette for reference
export const PALETTE_CONSTANTS = PALETTE;

// Type definitions for theme usage
export type ColorName = keyof typeof PALETTE;
export type ColorFormat = 'hex' | 'rgb' | 'css';

// Helper type for theme values
export type ThemeColors = typeof THEME.hex;
export type ThemeRgbColors = typeof THEME.rgb;

// CSS custom properties generator
export const CSS_CUSTOM_PROPERTIES = `
:root {
  /* Primary Colors */
  --color-primary: ${THEME.hex.primary};
  --color-success: ${THEME.hex.success};
  --color-warning: ${THEME.hex.warning};
  --color-error: ${THEME.hex.error};
  --color-info: ${THEME.hex.info};
  
  /* Brand Colors */
  --color-brand: ${THEME.hex.brand};
  --color-accent: ${THEME.hex.accent};
  --color-neutral: ${THEME.hex.neutral};
  
  /* Financial Colors */
  --color-profit: ${THEME.hex.profit};
  --color-loss: ${THEME.hex.loss};
  
  /* Surface Colors */
  --color-background: ${THEME.hex.background};
  --color-surface: ${THEME.hex.surface};
  --color-border: ${THEME.hex.border};
  
  /* Text Colors */
  --color-text-primary: ${THEME.hex.textPrimary};
  --color-text-secondary: ${THEME.hex.textSecondary};
  --color-text-muted: ${THEME.hex.textMuted};
  
  /* Status Colors */
  --color-online: ${THEME.hex.online};
  --color-offline: ${THEME.hex.offline};
  --color-pending: ${THEME.hex.pending};
}
` as const;
