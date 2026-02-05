/**
 * Bun.color Integration for Sports Betting Fractal Visualization
 * Maps fractal dimensions to color schemes for real-time edge detection
 */

// Note: Bun.color with macro imports only works at build time
// For runtime usage, we'll use manual color conversion
// This maintains the same API but without macro dependencies

// Extended glyph colors with sports betting semantics
export const glyphColors = {
  structuralDrift: "#FF5733",    // ▵⟂當您在 CRITICAL (FD 1.2-1.9: Odds drift in correlated props, e.g., player injury chains)
  dependencyGuard: "#C70039",     // ⥂⟂(▵⟜⟳) HIGH (FD 1.0-1.5: Team dependency on key players)
  phaseLocked: "#900C3F",         // ⟳⟲⟜(▵⊗ƨ) CRITICAL (FD 1.5-2.3: Phase-locked volatility, e.g., momentum swings)
  couplingGuard: "#581845",       // (▵⊗ƨ)⟂⟳ HIGH (FD >2.0: Coupled events like weather-team correlations)
  rollbackTrigger: "#FFC300"      // ⊟ MAXIMUM (FD <0.5: Stable halts, e.g., arbitrage locks)
};

// Chaos theory thresholds for FD interpretation
export const FD_THRESHOLDS = {
  ULTRA_STABLE: 0.5,      // Arbitrage opportunities
  SMOOTH_TREND: 1.2,      // Predictable patterns
  BROWNIAN: 1.5,          // Random walk
  PERSISTENT: 1.9,        // Momentum trends
  HIGH_CHAOS: 2.3,        // Volatility clusters
  BLACK_SWAN: 2.7         // Extreme events
};

/**
 * Simplified fractal dimension computation using Hurst exponent approximation
 * In production, use full R/S analysis or box-counting methods
 */
export function computeFD(timeSeriesData: number[]): number {
  if (timeSeriesData.length < 10) return 1.0;
  
  // Calculate Hurst exponent using simplified R/S analysis
  const n = timeSeriesData.length;
  const mean = timeSeriesData.reduce((a, b) => a + b, 0) / n;
  
  // Calculate cumulative deviations
  const cumulative = [0];
  for (let i = 0; i < n; i++) {
    cumulative.push(cumulative[i] + (timeSeriesData[i] - mean));
  }
  
  // Calculate range
  const R = Math.max(...cumulative) - Math.min(...cumulative);
  
  // Calculate standard deviation
  const variance = timeSeriesData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const S = Math.sqrt(variance);
  
  // Hurst exponent approximation
  const H = R / (S * Math.sqrt(n));
  
  // FD = 2 - H (for time series)
  let fd = 2 - Math.min(Math.max(H, 0.5), 1.5);
  
  // Add some randomness for simulation (remove in production)
  fd = fd + (Math.random() - 0.5) * 0.3;
  
  return Math.min(Math.max(fd, 0.3), 3.0);
}

/**
 * Dynamic FD-to-color mapping with interpolation
 * Uses manual color parsing (Bun.color macro not available at runtime)
 */
export function fdToColor(fd: number, baseColor: string = glyphColors.phaseLocked): string {
  // Manual color parsing for runtime compatibility
  const rgbaObj = parseColor(baseColor);
  if (!rgbaObj) {
    return "#808080"; // Fallback to gray
  }
  
  // Determine FD regime and apply transformations
  let r = rgbaObj.r;
  let g = rgbaObj.g;
  let b = rgbaObj.b;
  let a = rgbaObj.a ?? 255;
  
  if (fd > FD_THRESHOLDS.BLACK_SWAN) {
    // Chaotic black swan - intense red
    r = 255;
    g = 0;
    b = 0;
    a = 255;
  } else if (fd > FD_THRESHOLDS.HIGH_CHAOS) {
    // High volatility - orange-red
    const intensity = (fd - FD_THRESHOLDS.HIGH_CHAOS) / (FD_THRESHOLDS.BLACK_SWAN - FD_THRESHOLDS.HIGH_CHAOS);
    r = 255;
    g = Math.floor(80 * (1 - intensity));
    b = 0;
    a = Math.floor(200 + 55 * intensity);
  } else if (fd > FD_THRESHOLDS.PERSISTENT) {
    // Persistent trends - orange
    const intensity = (fd - FD_THRESHOLDS.PERSISTENT) / (FD_THRESHOLDS.HIGH_CHAOS - FD_THRESHOLDS.PERSISTENT);
    r = 255;
    g = Math.floor(150 + 105 * intensity);
    b = 0;
    a = 180;
  } else if (fd > FD_THRESHOLDS.BROWNIAN) {
    // Brownian motion - yellow
    r = 255;
    g = 200;
    b = 0;
    a = 150;
  } else if (fd > FD_THRESHOLDS.SMOOTH_TREND) {
    // Smooth trends - green
    r = 0;
    g = 200;
    b = 50;
    a = 120;
  } else if (fd > FD_THRESHOLDS.ULTRA_STABLE) {
    // Stable - blue
    r = 0;
    g = 100;
    b = 255;
    a = 100;
  } else {
    // Ultra-stable arbitrage - bright yellow
    r = 255;
    g = 255;
    b = 0;
    a = 255;
  }
  
  // Convert back to hex
  return rgbToHex(r, g, b);
}

/**
 * Extract RGBA array for zero-copy Canvas rendering
 */
export function getRGBAArray(colorHex: string): [number, number, number, number] {
  const rgba = parseColor(colorHex);
  if (!rgba) return [128, 128, 128, 255]; // Fallback gray
  return [rgba.r, rgba.g, rgba.b, rgba.a ?? 255];
}

/**
 * Get ANSI color code for terminal dashboards
 */
export function getANSIColor(colorHex: string): string {
  const rgba = parseColor(colorHex);
  if (!rgba) return "";
  
  // Convert RGB to ANSI color code
  return rgbToAnsi(rgba.r, rgba.g, rgba.b);
}

/**
 * Normalize color input to prevent visual spoofing attacks
 */
export function normalizeColor(input: string): string {
  try {
    // Parse and re-serialize to ensure consistency
    const parsed = parseColor(input);
    if (!parsed) return "#808080";
    return rgbToHex(parsed.r, parsed.g, parsed.b).toUpperCase();
  } catch (error) {
    // Fallback to neutral gray
    return "#808080";
  }
}

/**
 * Generate color gradient for FD range visualization
 */
export function generateFDGradient(startFD: number, endFD: number, steps: number = 10): string[] {
  const colors: string[] = [];
  const step = (endFD - startFD) / steps;
  
  for (let i = 0; i <= steps; i++) {
    const fd = startFD + (step * i);
    colors.push(fdToColor(fd));
  }
  
  return colors;
}

/**
 * Calculate color intensity based on FD severity
 */
export function calculateIntensity(fd: number): number {
  if (fd < FD_THRESHOLDS.ULTRA_STABLE) return 0.2;
  if (fd < FD_THRESHOLDS.SMOOTH_TREND) return 0.4;
  if (fd < FD_THRESHOLDS.BROWNIAN) return 0.6;
  if (fd < FD_THRESHOLDS.PERSISTENT) return 0.75;
  if (fd < FD_THRESHOLDS.HIGH_CHAOS) return 0.9;
  return 1.0;
}

// Helper functions for color conversion (replacing Bun.color)

/**
 * Parse color string to RGBA object
 */
function parseColor(colorStr: string): { r: number; g: number; b: number; a?: number } | null {
  if (!colorStr || typeof colorStr !== "string") return null;
  
  // Handle hex colors
  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      // #RGB
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 255 };
    } else if (hex.length === 6) {
      // #RRGGBB
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 255 };
    } else if (hex.length === 8) {
      // #RRGGBBAA
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16);
      return { r, g, b, a };
    }
  }
  
  // Handle rgb/rgba
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? Math.round(parseFloat(rgbMatch[4]) * 255) : 255
    };
  }
  
  return null;
}

/**
 * Convert RGB to hex string (uppercase for consistency)
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGB to ANSI escape code
 */
function rgbToAnsi(r: number, g: number, b: number): string {
  // Approximate to nearest 24-bit ANSI color
  const r6 = Math.round(r / 51);
  const g6 = Math.round(g / 51);
  const b6 = Math.round(b / 51);
  
  // 216 colors (6x6x6 cube)
  const ansiIndex = 16 + (36 * r6) + (6 * g6) + b6;
  return `\u001b[38;5;${ansiIndex}m`;
}
