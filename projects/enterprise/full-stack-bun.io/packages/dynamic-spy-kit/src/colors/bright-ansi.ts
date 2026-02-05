/**
 * @dynamic-spy/kit - Deep ANSI Color System
 *
 * Bright ANSI 256 Palette + True Color Support
 * Zero-copy binary integration with Bun.color()
 */

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface ArbColor {
  code: number;                      // ANSI 256 code (0-255)
  ansi: string;                      // Foreground escape: "\x1b[38;5;82m"
  ansiBg: string;                    // Background escape: "\x1b[48;5;82m"
  rgb: readonly [number, number, number];  // [R, G, B] 0-255
  hex: string;                       // "#5fff00"
  packed: number;                    // 24-bit RGB for binary protocol
}

export interface ColorStyle {
  fg?: ArbColor;
  bg?: ArbColor;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  blink?: boolean;
  reverse?: boolean;
  hidden?: boolean;
  strike?: boolean;
}

// ============================================================================
// 2. ANSI ESCAPE HELPERS
// ============================================================================

export const ESC = '\x1b[';
export const RESET = '\x1b[0m';

// Style codes
export const STYLE = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  RAPID_BLINK: '\x1b[6m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  STRIKE: '\x1b[9m',
} as const;

// 256-color mode
export const fg256 = (n: number): string => `\x1b[38;5;${n}m`;
export const bg256 = (n: number): string => `\x1b[48;5;${n}m`;

// True color (24-bit RGB)
export const fgRGB = (r: number, g: number, b: number): string =>
  `\x1b[38;2;${r};${g};${b}m`;
export const bgRGB = (r: number, g: number, b: number): string =>
  `\x1b[48;2;${r};${g};${b}m`;

// Cursor control
export const CURSOR = {
  UP: (n = 1) => `\x1b[${n}A`,
  DOWN: (n = 1) => `\x1b[${n}B`,
  RIGHT: (n = 1) => `\x1b[${n}C`,
  LEFT: (n = 1) => `\x1b[${n}D`,
  POS: (row: number, col: number) => `\x1b[${row};${col}H`,
  SAVE: '\x1b[s',
  RESTORE: '\x1b[u',
  HIDE: '\x1b[?25l',
  SHOW: '\x1b[?25h',
} as const;

// Screen control
export const SCREEN = {
  CLEAR: '\x1b[2J',
  CLEAR_LINE: '\x1b[2K',
  CLEAR_TO_END: '\x1b[0J',
  CLEAR_TO_START: '\x1b[1J',
} as const;

// ============================================================================
// 3. COLOR FACTORY
// ============================================================================

function makeColor(code: number, rgb: readonly [number, number, number], hex: string): ArbColor {
  return {
    code,
    ansi: fg256(code),
    ansiBg: bg256(code),
    rgb,
    hex,
    packed: (rgb[0] << 16) | (rgb[1] << 8) | rgb[2],
  };
}

function makeColorFromRGB(code: number, r: number, g: number, b: number): ArbColor {
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  return makeColor(code, [r, g, b] as const, hex);
}

// ============================================================================
// 4. BRIGHT COLORS (90-97) - High Visibility
// ============================================================================

export const BRIGHT = {
  BLACK:   makeColorFromRGB(90, 128, 128, 128),
  RED:     makeColorFromRGB(91, 255, 85, 85),
  GREEN:   makeColorFromRGB(92, 85, 255, 85),
  YELLOW:  makeColorFromRGB(93, 255, 255, 85),
  BLUE:    makeColorFromRGB(94, 85, 85, 255),
  MAGENTA: makeColorFromRGB(95, 255, 85, 255),
  CYAN:    makeColorFromRGB(96, 85, 255, 255),
  WHITE:   makeColorFromRGB(97, 255, 255, 255),
} as const;

// ============================================================================
// 5. STANDARD COLORS (30-37)
// ============================================================================

export const STANDARD = {
  BLACK:   makeColorFromRGB(0, 0, 0, 0),
  RED:     makeColorFromRGB(1, 205, 49, 49),
  GREEN:   makeColorFromRGB(2, 13, 188, 121),
  YELLOW:  makeColorFromRGB(3, 229, 229, 16),
  BLUE:    makeColorFromRGB(4, 36, 114, 200),
  MAGENTA: makeColorFromRGB(5, 188, 63, 188),
  CYAN:    makeColorFromRGB(6, 17, 168, 205),
  WHITE:   makeColorFromRGB(7, 229, 229, 229),
} as const;

// ============================================================================
// 6. EXTENDED 256 PALETTE - Curated for Arb Visualization
// ============================================================================

export const GREENS = {
  LIME:      makeColorFromRGB(46, 0, 255, 0),
  BRIGHT:    makeColorFromRGB(82, 95, 255, 0),
  SPRING:    makeColorFromRGB(118, 135, 255, 0),
  CHARTREUSE: makeColorFromRGB(154, 175, 255, 0),
  PALE:      makeColorFromRGB(190, 215, 255, 0),
  DARK:      makeColorFromRGB(22, 0, 95, 0),
  FOREST:    makeColorFromRGB(28, 0, 135, 0),
  SEA:       makeColorFromRGB(34, 0, 175, 95),
  MINT:      makeColorFromRGB(48, 0, 255, 135),
  EMERALD:   makeColorFromRGB(41, 0, 215, 95),
} as const;

export const REDS = {
  BRIGHT:    makeColorFromRGB(196, 255, 0, 0),
  SCARLET:   makeColorFromRGB(197, 255, 0, 95),
  CRIMSON:   makeColorFromRGB(198, 255, 0, 135),
  ROSE:      makeColorFromRGB(199, 255, 0, 175),
  PINK:      makeColorFromRGB(200, 255, 0, 215),
  DARK:      makeColorFromRGB(52, 95, 0, 0),
  MAROON:    makeColorFromRGB(88, 135, 0, 0),
  CORAL:     makeColorFromRGB(203, 255, 95, 135),
  SALMON:    makeColorFromRGB(210, 255, 135, 175),
  BRICK:     makeColorFromRGB(124, 175, 0, 0),
} as const;

export const YELLOWS = {
  BRIGHT:    makeColorFromRGB(226, 255, 255, 0),
  GOLD:      makeColorFromRGB(227, 255, 255, 95),
  LEMON:     makeColorFromRGB(228, 255, 255, 135),
  CREAM:     makeColorFromRGB(229, 255, 255, 175),
  IVORY:     makeColorFromRGB(230, 255, 255, 215),
  AMBER:     makeColorFromRGB(220, 255, 215, 0),
  ORANGE:    makeColorFromRGB(208, 255, 135, 0),
  TANGERINE: makeColorFromRGB(214, 255, 175, 0),
  HONEY:     makeColorFromRGB(178, 215, 175, 0),
  MUSTARD:   makeColorFromRGB(136, 175, 135, 0),
} as const;

export const CYANS = {
  BRIGHT:    makeColorFromRGB(51, 0, 255, 255),
  AQUA:      makeColorFromRGB(87, 95, 255, 255),
  SKY:       makeColorFromRGB(123, 135, 255, 255),
  POWDER:    makeColorFromRGB(159, 175, 255, 255),
  ICE:       makeColorFromRGB(195, 215, 255, 255),
  TEAL:      makeColorFromRGB(30, 0, 135, 135),
  TURQUOISE: makeColorFromRGB(44, 0, 215, 175),
  OCEAN:     makeColorFromRGB(37, 0, 175, 215),
  STEEL:     makeColorFromRGB(67, 95, 175, 175),
  ELECTRIC:  makeColorFromRGB(45, 0, 215, 255),
} as const;

export const BLUES = {
  BRIGHT:    makeColorFromRGB(33, 0, 135, 255),
  ROYAL:     makeColorFromRGB(27, 0, 95, 255),
  NAVY:      makeColorFromRGB(17, 0, 0, 175),
  COBALT:    makeColorFromRGB(21, 0, 0, 255),
  SKY:       makeColorFromRGB(39, 0, 175, 255),
  AZURE:     makeColorFromRGB(75, 95, 135, 255),
  SLATE:     makeColorFromRGB(61, 95, 95, 175),
  STEEL:     makeColorFromRGB(67, 95, 175, 175),
  MIDNIGHT:  makeColorFromRGB(18, 0, 0, 215),
  INDIGO:    makeColorFromRGB(54, 95, 0, 175),
} as const;

export const MAGENTAS = {
  BRIGHT:    makeColorFromRGB(201, 255, 0, 255),
  HOT_PINK:  makeColorFromRGB(206, 255, 95, 215),
  FUCHSIA:   makeColorFromRGB(165, 215, 0, 255),
  ORCHID:    makeColorFromRGB(170, 215, 95, 255),
  VIOLET:    makeColorFromRGB(129, 175, 0, 255),
  PURPLE:    makeColorFromRGB(93, 135, 0, 255),
  PLUM:      makeColorFromRGB(96, 135, 95, 175),
  LAVENDER:  makeColorFromRGB(183, 215, 175, 255),
  GRAPE:     makeColorFromRGB(128, 175, 0, 215),
  BERRY:     makeColorFromRGB(162, 215, 0, 175),
} as const;

export const GRAYS = {
  GRAY_0:    makeColorFromRGB(232, 8, 8, 8),
  GRAY_1:    makeColorFromRGB(233, 18, 18, 18),
  GRAY_2:    makeColorFromRGB(234, 28, 28, 28),
  GRAY_3:    makeColorFromRGB(235, 38, 38, 38),
  GRAY_4:    makeColorFromRGB(236, 48, 48, 48),
  GRAY_5:    makeColorFromRGB(237, 58, 58, 58),
  GRAY_6:    makeColorFromRGB(238, 68, 68, 68),
  GRAY_7:    makeColorFromRGB(239, 78, 78, 78),
  GRAY_8:    makeColorFromRGB(240, 88, 88, 88),
  GRAY_9:    makeColorFromRGB(241, 98, 98, 98),
  GRAY_10:   makeColorFromRGB(242, 108, 108, 108),
  GRAY_11:   makeColorFromRGB(243, 118, 118, 118),
  GRAY_12:   makeColorFromRGB(244, 128, 128, 128),
  GRAY_13:   makeColorFromRGB(245, 138, 138, 138),
  GRAY_14:   makeColorFromRGB(246, 148, 148, 148),
  GRAY_15:   makeColorFromRGB(247, 158, 158, 158),
  GRAY_16:   makeColorFromRGB(248, 168, 168, 168),
  GRAY_17:   makeColorFromRGB(249, 178, 178, 178),
  GRAY_18:   makeColorFromRGB(250, 188, 188, 188),
  GRAY_19:   makeColorFromRGB(251, 198, 198, 198),
  GRAY_20:   makeColorFromRGB(252, 208, 208, 208),
  GRAY_21:   makeColorFromRGB(253, 218, 218, 218),
  GRAY_22:   makeColorFromRGB(254, 228, 228, 228),
  GRAY_23:   makeColorFromRGB(255, 238, 238, 238),
} as const;

// ============================================================================
// 7. COMPLETE 256-COLOR LOOKUP TABLE
// ============================================================================

const PALETTE_256: ArbColor[] = [];

// Standard colors (0-15)
const standardRGB: readonly [number, number, number][] = [
  [0, 0, 0], [205, 49, 49], [13, 188, 121], [229, 229, 16],
  [36, 114, 200], [188, 63, 188], [17, 168, 205], [229, 229, 229],
  [128, 128, 128], [255, 85, 85], [85, 255, 85], [255, 255, 85],
  [85, 85, 255], [255, 85, 255], [85, 255, 255], [255, 255, 255],
];

for (let i = 0; i < 16; i++) {
  PALETTE_256[i] = makeColor(i, standardRGB[i],
    `#${standardRGB[i][0].toString(16).padStart(2, '0')}${standardRGB[i][1].toString(16).padStart(2, '0')}${standardRGB[i][2].toString(16).padStart(2, '0')}`);
}

// 216-color cube (16-231)
const CUBE_STEPS = [0, 95, 135, 175, 215, 255];
for (let r = 0; r < 6; r++) {
  for (let g = 0; g < 6; g++) {
    for (let b = 0; b < 6; b++) {
      const code = 16 + (36 * r) + (6 * g) + b;
      PALETTE_256[code] = makeColorFromRGB(code, CUBE_STEPS[r], CUBE_STEPS[g], CUBE_STEPS[b]);
    }
  }
}

// Grayscale (232-255)
for (let i = 0; i < 24; i++) {
  const gray = 8 + (i * 10);
  PALETTE_256[232 + i] = makeColorFromRGB(232 + i, gray, gray, gray);
}

export { PALETTE_256 };

// ============================================================================
// 8. BUN.COLOR() INTEGRATION
// ============================================================================

/**
 * Convert any color input to ArbColor using Bun.color()
 */
export function toArbColor(input: string | number | { r: number; g: number; b: number }): ArbColor | null {
  const rgba = Bun.color(input, "[rgba]");
  if (!rgba) return null;

  const [r, g, b] = rgba;
  const packed = Bun.color(input, "number") ?? ((r << 16) | (g << 8) | b);
  const hex = Bun.color(input, "hex") ?? `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  // Find closest 256-color match
  const code = findClosest256(r, g, b);

  return {
    code,
    ansi: fg256(code),
    ansiBg: bg256(code),
    rgb: [r, g, b] as const,
    hex,
    packed,
  };
}

/**
 * Find closest ANSI 256 color code for RGB values
 */
function findClosest256(r: number, g: number, b: number): number {
  // Check grayscale first
  if (r === g && g === b) {
    if (r < 4) return 16;  // black
    if (r > 248) return 231;  // white
    return Math.round((r - 8) / 10) + 232;
  }

  // Map to 6x6x6 cube
  const ri = r < 48 ? 0 : r < 115 ? 1 : Math.min(5, Math.floor((r - 35) / 40));
  const gi = g < 48 ? 0 : g < 115 ? 1 : Math.min(5, Math.floor((g - 35) / 40));
  const bi = b < 48 ? 0 : b < 115 ? 1 : Math.min(5, Math.floor((b - 35) / 40));

  return 16 + (36 * ri) + (6 * gi) + bi;
}

// ============================================================================
// 9. STYLE COMPOSER
// ============================================================================

/**
 * Compose multiple styles into a single ANSI escape sequence
 */
export function style(text: string, ...styles: (ArbColor | keyof typeof STYLE)[]): string {
  const codes: string[] = [];

  for (const s of styles) {
    if (typeof s === 'string') {
      codes.push(STYLE[s]);
    } else {
      codes.push(s.ansi);
    }
  }

  return codes.join('') + text + RESET;
}

/**
 * Apply full style object to text
 */
export function applyStyle(text: string, styleObj: ColorStyle): string {
  const parts: string[] = [];

  if (styleObj.bold) parts.push(STYLE.BOLD);
  if (styleObj.dim) parts.push(STYLE.DIM);
  if (styleObj.italic) parts.push(STYLE.ITALIC);
  if (styleObj.underline) parts.push(STYLE.UNDERLINE);
  if (styleObj.blink) parts.push(STYLE.BLINK);
  if (styleObj.reverse) parts.push(STYLE.REVERSE);
  if (styleObj.hidden) parts.push(STYLE.HIDDEN);
  if (styleObj.strike) parts.push(STYLE.STRIKE);
  if (styleObj.fg) parts.push(styleObj.fg.ansi);
  if (styleObj.bg) parts.push(styleObj.bg.ansiBg);

  return parts.join('') + text + RESET;
}

// ============================================================================
// 10. UTILITY FUNCTIONS
// ============================================================================

/**
 * Strip all ANSI escape codes from string (uses Bun.stripANSI)
 */
export function strip(text: string): string {
  return Bun.stripANSI(text);
}

/**
 * Get visible width of string (uses Bun.stringWidth)
 */
export function width(text: string): number {
  return Bun.stringWidth(text);
}

/**
 * Pad string to target width, accounting for ANSI codes
 */
export function pad(text: string, targetWidth: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const currentWidth = width(text);
  const padding = Math.max(0, targetWidth - currentWidth);

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center':
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Truncate string to max width, preserving ANSI codes
 */
export function truncate(text: string, maxWidth: number, suffix = '...'): string {
  if (width(text) <= maxWidth) return text;

  const stripped = strip(text);
  const suffixWidth = width(suffix);
  const targetWidth = maxWidth - suffixWidth;

  let result = '';
  let currentWidth = 0;

  for (const char of stripped) {
    const charWidth = Bun.stringWidth(char);
    if (currentWidth + charWidth > targetWidth) break;
    result += char;
    currentWidth += charWidth;
  }

  return result + suffix;
}

// ============================================================================
// 11. COMBINED COLORS OBJECT
// ============================================================================

export const COLORS = {
  BRIGHT,
  STANDARD,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  BLUES,
  MAGENTAS,
  GRAYS,
} as const;
