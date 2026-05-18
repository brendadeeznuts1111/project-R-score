/**
 * @dynamic-spy/kit - Arb Color Semantics
 *
 * Semantic color mappings for arbitrage visualization
 * Edge thresholds, sportsbook types, status indicators
 */

import {
  type ArbColor,
  BRIGHT,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  BLUES,
  MAGENTAS,
  GRAYS,
  STYLE,
  RESET,
  fg256,
  bg256,
  fgRGB,
  bgRGB,
  toArbColor,
  style,
  applyStyle,
} from './bright-ansi';

// ============================================================================
// 1. EDGE THRESHOLD COLORS
// ============================================================================

export const EDGE = {
  // High profit (>3%) - Bright attention-grabbing green
  PROFIT_HIGH: GREENS.BRIGHT,      // 82: #5fff00

  // Medium profit (1-3%) - Solid green
  PROFIT_MED: GREENS.EMERALD,      // 41: #00d75f

  // Low profit (0-1%) - Yellow caution
  PROFIT_LOW: YELLOWS.GOLD,        // 227: #ffff5f

  // Break-even (±0.5%) - Neutral gray
  BREAK_EVEN: GRAYS.GRAY_12,       // 244: #808080

  // Small loss (0 to -1%) - Orange warning
  LOSS_SMALL: YELLOWS.ORANGE,      // 208: #ff8700

  // Medium loss (-1 to -3%) - Red
  LOSS_MED: REDS.CORAL,            // 203: #ff5f87

  // Large loss (< -3%) - Bright red alert
  LOSS_HIGH: REDS.BRIGHT,          // 196: #ff0000

  // Steam move detected - Magenta highlight
  STEAM: MAGENTAS.BRIGHT,          // 201: #ff00ff

  // CLV positive - Cyan
  CLV_POSITIVE: CYANS.ELECTRIC,    // 45: #00d7ff

  // Stale/expired - Dim gray
  STALE: GRAYS.GRAY_6,             // 238: #444444
} as const;

// ============================================================================
// 2. SPORTSBOOK TYPE COLORS
// ============================================================================

export const BOOK = {
  // Sharp books (low vig, fast limits) - Cyan tones
  SHARP: {
    PRIMARY: CYANS.BRIGHT,         // 51: #00ffff
    SECONDARY: CYANS.AQUA,         // 87: #5fffff
    BADGE: CYANS.TEAL,             // 30: #008787
  },

  // Square books (high vig, slow) - Orange tones
  SQUARE: {
    PRIMARY: YELLOWS.ORANGE,       // 208: #ff8700
    SECONDARY: YELLOWS.TANGERINE,  // 214: #ffaf00
    BADGE: YELLOWS.MUSTARD,        // 136: #af8700
  },

  // Exchanges (Betfair, etc) - Blue tones
  EXCHANGE: {
    PRIMARY: BLUES.BRIGHT,         // 33: #0087ff
    SECONDARY: BLUES.AZURE,        // 75: #5f87ff
    BADGE: BLUES.COBALT,           // 21: #0000ff
  },

  // Asian books (Pinnacle, SBO) - Purple tones
  ASIAN: {
    PRIMARY: MAGENTAS.VIOLET,      // 129: #af00ff
    SECONDARY: MAGENTAS.ORCHID,    // 170: #d75fff
    BADGE: MAGENTAS.PURPLE,        // 93: #8700ff
  },

  // Offshore/crypto books - Green tones
  OFFSHORE: {
    PRIMARY: GREENS.MINT,          // 48: #00ff87
    SECONDARY: GREENS.SEA,         // 34: #00af5f
    BADGE: GREENS.FOREST,          // 28: #008700
  },
} as const;

// ============================================================================
// 3. STATUS INDICATOR COLORS
// ============================================================================

export const STATUS = {
  // Live/active - Bright white with optional pulse
  LIVE: BRIGHT.WHITE,              // 97: #ffffff

  // Pending - Yellow
  PENDING: BRIGHT.YELLOW,          // 93: #ffff55

  // Confirmed - Bright green
  CONFIRMED: BRIGHT.GREEN,         // 92: #55ff55

  // Error - Bright red
  ERROR: BRIGHT.RED,               // 91: #ff5555

  // Warning - Orange
  WARNING: YELLOWS.ORANGE,         // 208: #ff8700

  // Info - Bright cyan
  INFO: BRIGHT.CYAN,               // 96: #55ffff

  // Debug - Dim magenta
  DEBUG: MAGENTAS.PLUM,            // 96: #875f87

  // Stale - Dim gray
  STALE: GRAYS.GRAY_8,             // 240: #585858

  // Expired - Strikethrough red (apply STYLE.STRIKE)
  EXPIRED: REDS.DARK,              // 52: #5f0000

  // Processing - Blue blink
  PROCESSING: BLUES.SKY,           // 39: #00afff

  // Success - Green
  SUCCESS: GREENS.BRIGHT,          // 82: #5fff00

  // Failure - Red
  FAILURE: REDS.BRIGHT,            // 196: #ff0000
} as const;

// ============================================================================
// 4. SEMANTIC COLOR FUNCTIONS
// ============================================================================

/**
 * Get color for edge percentage
 * @param edge - Edge as decimal (0.02 = 2%)
 */
export function edgeColor(edge: number): ArbColor {
  if (edge >= 0.03) return EDGE.PROFIT_HIGH;
  if (edge >= 0.01) return EDGE.PROFIT_MED;
  if (edge >= 0) return EDGE.PROFIT_LOW;
  if (edge >= -0.01) return EDGE.LOSS_SMALL;
  if (edge >= -0.03) return EDGE.LOSS_MED;
  return EDGE.LOSS_HIGH;
}

/**
 * Get color for sportsbook by type
 */
export function bookColor(type: 'sharp' | 'square' | 'exchange' | 'asian' | 'offshore'): ArbColor {
  switch (type) {
    case 'sharp': return BOOK.SHARP.PRIMARY;
    case 'square': return BOOK.SQUARE.PRIMARY;
    case 'exchange': return BOOK.EXCHANGE.PRIMARY;
    case 'asian': return BOOK.ASIAN.PRIMARY;
    case 'offshore': return BOOK.OFFSHORE.PRIMARY;
  }
}

/**
 * Get color for latency (lower is better)
 * @param ms - Latency in milliseconds
 */
export function latencyColor(ms: number): ArbColor {
  if (ms < 50) return GREENS.BRIGHT;
  if (ms < 100) return GREENS.EMERALD;
  if (ms < 200) return YELLOWS.GOLD;
  if (ms < 500) return YELLOWS.ORANGE;
  if (ms < 1000) return REDS.CORAL;
  return REDS.BRIGHT;
}

/**
 * Get color for confidence level (0-1)
 */
export function confidenceColor(confidence: number): ArbColor {
  if (confidence >= 0.9) return GREENS.BRIGHT;
  if (confidence >= 0.7) return GREENS.EMERALD;
  if (confidence >= 0.5) return YELLOWS.GOLD;
  if (confidence >= 0.3) return YELLOWS.ORANGE;
  return REDS.BRIGHT;
}

/**
 * Get color for volume (normalized 0-1)
 */
export function volumeColor(volume: number): ArbColor {
  if (volume >= 0.8) return BLUES.BRIGHT;
  if (volume >= 0.6) return BLUES.AZURE;
  if (volume >= 0.4) return CYANS.BRIGHT;
  if (volume >= 0.2) return CYANS.SKY;
  return GRAYS.GRAY_10;
}

// ============================================================================
// 5. FORMATTED OUTPUT HELPERS
// ============================================================================

/**
 * Format edge percentage with color
 */
export function formatEdge(edge: number, width = 7): string {
  const color = edgeColor(edge);
  const sign = edge >= 0 ? '+' : '';
  const pct = (edge * 100).toFixed(2);
  const text = `${sign}${pct}%`.padStart(width);
  return color.ansi + text + RESET;
}

/**
 * Format money amount with color
 */
export function formatMoney(amount: number, currency = '$'): string {
  const color = amount >= 0 ? GREENS.BRIGHT : REDS.BRIGHT;
  const sign = amount >= 0 ? '+' : '';
  const formatted = `${sign}${currency}${Math.abs(amount).toFixed(2)}`;
  return color.ansi + formatted + RESET;
}

/**
 * Format odds with book-type color
 */
export function formatOdds(
  odds: number,
  bookType: 'sharp' | 'square' | 'exchange' | 'asian' | 'offshore' = 'square'
): string {
  const color = bookColor(bookType);
  return color.ansi + odds.toFixed(2) + RESET;
}

/**
 * Format latency with color
 */
export function formatLatency(ms: number): string {
  const color = latencyColor(ms);
  const text = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  return color.ansi + text + RESET;
}

/**
 * Format status badge
 */
export function formatStatus(
  status: 'live' | 'pending' | 'confirmed' | 'error' | 'stale' | 'expired'
): string {
  const statusMap: Record<string, { color: ArbColor; label: string; style?: string }> = {
    live: { color: STATUS.LIVE, label: 'LIVE', style: STYLE.BOLD },
    pending: { color: STATUS.PENDING, label: 'PENDING' },
    confirmed: { color: STATUS.CONFIRMED, label: 'CONFIRMED', style: STYLE.BOLD },
    error: { color: STATUS.ERROR, label: 'ERROR', style: STYLE.BOLD },
    stale: { color: STATUS.STALE, label: 'STALE', style: STYLE.DIM },
    expired: { color: STATUS.EXPIRED, label: 'EXPIRED', style: STYLE.STRIKE },
  };

  const s = statusMap[status];
  return (s.style ?? '') + s.color.ansi + s.label + RESET;
}

/**
 * Format steam indicator
 */
export function formatSteam(isSteam: boolean): string {
  if (!isSteam) return GRAYS.GRAY_8.ansi + '○' + RESET;
  return STYLE.BOLD + EDGE.STEAM.ansi + '◉ STEAM' + RESET;
}

/**
 * Format sportsbook name with type coloring
 */
export function formatBook(
  name: string,
  type: 'sharp' | 'square' | 'exchange' | 'asian' | 'offshore'
): string {
  const colors = BOOK[type.toUpperCase() as keyof typeof BOOK];
  return colors.PRIMARY.ansi + name + RESET;
}

// ============================================================================
// 6. COMPARISON ARROWS
// ============================================================================

export const ARROWS = {
  UP: GREENS.BRIGHT.ansi + '▲' + RESET,
  DOWN: REDS.BRIGHT.ansi + '▼' + RESET,
  FLAT: GRAYS.GRAY_12.ansi + '─' + RESET,
  RIGHT: GRAYS.GRAY_12.ansi + '→' + RESET,
  DOUBLE_RIGHT: BRIGHT.WHITE.ansi + '»' + RESET,
} as const;

/**
 * Get arrow for price movement
 */
export function movementArrow(current: number, previous: number): string {
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return ARROWS.FLAT;
  return diff > 0 ? ARROWS.UP : ARROWS.DOWN;
}

// ============================================================================
// 7. BOX DRAWING CHARACTERS (with colors)
// ============================================================================

export const BOX = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
  DOUBLE_HORIZONTAL: '═',
  DOUBLE_VERTICAL: '║',
} as const;

/**
 * Create a colored horizontal line
 */
export function hline(width: number, color: ArbColor = GRAYS.GRAY_10): string {
  return color.ansi + BOX.HORIZONTAL.repeat(width) + RESET;
}

/**
 * Create a colored box around text
 */
export function box(text: string, color: ArbColor = GRAYS.GRAY_12): string {
  const stripped = Bun.stripANSI(text);
  const textWidth = Bun.stringWidth(stripped);
  const c = color.ansi;

  return [
    c + BOX.TOP_LEFT + BOX.HORIZONTAL.repeat(textWidth + 2) + BOX.TOP_RIGHT + RESET,
    c + BOX.VERTICAL + RESET + ' ' + text + ' ' + c + BOX.VERTICAL + RESET,
    c + BOX.BOTTOM_LEFT + BOX.HORIZONTAL.repeat(textWidth + 2) + BOX.BOTTOM_RIGHT + RESET,
  ].join('\n');
}

// ============================================================================
// 8. SPARKLINE BLOCKS
// ============================================================================

export const BLOCKS = {
  EMPTY: ' ',
  ONE_EIGHTH: '▁',
  ONE_QUARTER: '▂',
  THREE_EIGHTHS: '▃',
  HALF: '▄',
  FIVE_EIGHTHS: '▅',
  THREE_QUARTERS: '▆',
  SEVEN_EIGHTHS: '▇',
  FULL: '█',
} as const;

const BLOCK_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Create a mini sparkline from values
 */
export function sparkline(
  values: number[],
  color: ArbColor = GREENS.BRIGHT
): string {
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chars = values.map(v => {
    const normalized = (v - min) / range;
    const index = Math.round(normalized * 8);
    return BLOCK_CHARS[index];
  });

  return color.ansi + chars.join('') + RESET;
}

/**
 * Create a colored progress bar
 */
export function progressBar(
  progress: number,
  width: number,
  filledColor: ArbColor = GREENS.BRIGHT,
  emptyColor: ArbColor = GRAYS.GRAY_4
): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;

  return (
    filledColor.ansi + BLOCKS.FULL.repeat(filled) +
    emptyColor.ansi + BLOCKS.EMPTY.repeat(empty) + RESET
  );
}

// ============================================================================
// 9. BINARY PROTOCOL COLOR ENCODING
// ============================================================================

/**
 * Color flags byte structure:
 * Bit 0: isProfit
 * Bit 1: isSteam
 * Bit 2: isLive
 * Bit 3: isSharp
 * Bit 4-7: intensity (0-15)
 */
export interface ColorFlags {
  isProfit: boolean;
  isSteam: boolean;
  isLive: boolean;
  isSharp: boolean;
  intensity: number; // 0-15
}

export function encodeColorFlags(flags: ColorFlags): number {
  let byte = 0;
  if (flags.isProfit) byte |= 0b00000001;
  if (flags.isSteam) byte |= 0b00000010;
  if (flags.isLive) byte |= 0b00000100;
  if (flags.isSharp) byte |= 0b00001000;
  byte |= (flags.intensity & 0x0F) << 4;
  return byte;
}

export function decodeColorFlags(byte: number): ColorFlags {
  return {
    isProfit: !!(byte & 0b00000001),
    isSteam: !!(byte & 0b00000010),
    isLive: !!(byte & 0b00000100),
    isSharp: !!(byte & 0b00001000),
    intensity: (byte >> 4) & 0x0F,
  };
}

/**
 * Pack ArbColor into 4 bytes (RGB + flags)
 */
export function packColorToBytes(
  color: ArbColor,
  flags: ColorFlags
): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = color.rgb[0];
  bytes[1] = color.rgb[1];
  bytes[2] = color.rgb[2];
  bytes[3] = encodeColorFlags(flags);
  return bytes;
}

/**
 * Unpack 4 bytes to ArbColor and flags
 */
export function unpackColorFromBytes(
  bytes: Uint8Array
): { color: ArbColor; flags: ColorFlags } {
  const r = bytes[0];
  const g = bytes[1];
  const b = bytes[2];
  const flags = decodeColorFlags(bytes[3]);

  // Create ArbColor from RGB
  const color = toArbColor({ r, g, b }) ?? {
    code: 0,
    ansi: fgRGB(r, g, b),
    ansiBg: bgRGB(r, g, b),
    rgb: [r, g, b] as const,
    hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
    packed: (r << 16) | (g << 8) | b,
  };

  return { color, flags };
}

/**
 * DataView helpers for market struct color field
 */
export const ColorDataView = {
  get(view: DataView, offset: number): { color: ArbColor; flags: ColorFlags } {
    const bytes = new Uint8Array(4);
    bytes[0] = view.getUint8(offset);
    bytes[1] = view.getUint8(offset + 1);
    bytes[2] = view.getUint8(offset + 2);
    bytes[3] = view.getUint8(offset + 3);
    return unpackColorFromBytes(bytes);
  },

  set(view: DataView, offset: number, color: ArbColor, flags: ColorFlags): void {
    view.setUint8(offset, color.rgb[0]);
    view.setUint8(offset + 1, color.rgb[1]);
    view.setUint8(offset + 2, color.rgb[2]);
    view.setUint8(offset + 3, encodeColorFlags(flags));
  },
};

// ============================================================================
// 10. EXPORTS - Types re-exported from this module
// ============================================================================

export type { ArbColor } from './bright-ansi';
