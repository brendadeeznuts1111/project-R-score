/**
 * 🎨 Terminal Color Quantization Utility
 *
 * tmux-style RGB to 256-color palette conversion for maximum terminal compatibility.
 * Useful when Bun.color("ansi") auto-detection isn't sufficient.
 *
 * Based on tmux colour.c implementation:
 * https://github.com/tmux/tmux/blob/dae2868d1227b95fd076fb4a5efa6256c7245943/colour.c#L44-L55
 *
 * xterm 256-color palette:
 * - 6x6x6 color cube: indices 16-231
 * - 24 grey levels: indices 232-255
 * - 16 standard colors: indices 0-15
 *
 * @version 1.0
 */

/**
 * 6x6x6 color cube levels (not evenly spread for darker colors)
 * Matches xterm's color cube: 0x0, 0x5f, 0x87, 0xaf, 0xd7, 0xff
 */
const COLOR_CUBE_LEVELS = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];

/**
 * Map RGB value to 6-cube index (0-5)
 * tmux colour_to_6cube() logic
 */
function rgbTo6Cube(v: number): number {
  if (v < 48) return 0;
  if (v < 114) return 1;
  return Math.floor((v - 35) / 40);
}

/**
 * Calculate squared distance between two RGB colors
 * tmux colour_dist_sq() logic
 */
function colorDistanceSquared(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Convert RGB to xterm 256-color palette index (16-255)
 *
 * Algorithm:
 * 1. Map RGB to nearest point in 6x6x6 color cube
 * 2. Find nearest grey (average of RGB)
 * 3. Return whichever (color cube index OR grey index) is closer
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns 256-color palette index (16-255)
 */
export function rgbTo256(r: number, g: number, b: number): number {
  // Clamp values to valid range
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Map to 6x6x6 cube indices
  const qr = rgbTo6Cube(r);
  const qg = rgbTo6Cube(g);
  const qb = rgbTo6Cube(b);

  const cr = COLOR_CUBE_LEVELS[qr];
  const cg = COLOR_CUBE_LEVELS[qg];
  const cb = COLOR_CUBE_LEVELS[qb];

  // Exact match in color cube
  if (cr === r && cg === g && cb === b) {
    return 16 + 36 * qr + 6 * qg + qb;
  }

  // Find nearest grey (average of RGB)
  const greyAvg = Math.floor((r + g + b) / 3);
  let greyIdx: number;
  if (greyAvg > 238) {
    greyIdx = 23;
  } else {
    greyIdx = Math.floor((greyAvg - 3) / 10);
  }
  const grey = 8 + 10 * greyIdx;

  // Calculate distances
  const colorDist = colorDistanceSquared(cr, cg, cb, r, g, b);
  const greyDist = colorDistanceSquared(grey, grey, grey, r, g, b);

  // Return whichever is closer
  if (greyDist < colorDist) {
    return 232 + greyIdx; // Grey index (232-255)
  } else {
    return 16 + 36 * qr + 6 * qg + qb; // Color cube index (16-231)
  }
}

/**
 * Convert RGB to 256-color ANSI escape code
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns ANSI escape code string
 */
export function rgbToAnsi256(r: number, g: number, b: number): string {
  const idx = rgbTo256(r, g, b);
  return `\x1b[38;5;${idx}m`; // Foreground 256-color
}

/**
 * Convert RGB to background 256-color ANSI escape code
 */
export function rgbToAnsi256Bg(r: number, g: number, b: number): string {
  const idx = rgbTo256(r, g, b);
  return `\x1b[48;5;${idx}m`; // Background 256-color
}

/**
 * Get 256-color palette information
 */
export function get256ColorInfo(idx: number): {
  type: 'standard' | 'cube' | 'grey';
  rgb?: [number, number, number];
  description: string;
} {
  if (idx < 0 || idx > 255) {
    return { type: 'standard', description: 'invalid' };
  }

  if (idx < 16) {
    const standardColors = [
      'black',
      'maroon',
      'green',
      'olive',
      'navy',
      'purple',
      'teal',
      'silver',
      'grey',
      'red',
      'lime',
      'yellow',
      'blue',
      'fuchsia',
      'aqua',
      'white',
    ];
    return {
      type: 'standard',
      description: standardColors[idx] || 'unknown',
    };
  }

  if (idx < 232) {
    // 6x6x6 color cube
    const cubeIdx = idx - 16;
    const r = Math.floor(cubeIdx / 36) % 6;
    const g = Math.floor(cubeIdx / 6) % 6;
    const b = cubeIdx % 6;

    return {
      type: 'cube',
      rgb: [COLOR_CUBE_LEVELS[r], COLOR_CUBE_LEVELS[g], COLOR_CUBE_LEVELS[b]],
      description: `cube(${r},${g},${b}) = rgb(${COLOR_CUBE_LEVELS[r]},${COLOR_CUBE_LEVELS[g]},${COLOR_CUBE_LEVELS[b]})`,
    };
  }

  // Grey scale (232-255)
  const greyIdx = idx - 232;
  const grey = 8 + 10 * greyIdx;

  return {
    type: 'grey',
    rgb: [grey, grey, grey],
    description: `grey(${greyIdx}) = rgb(${grey},${grey},${grey})`,
  };
}

/**
 * Convert any color input to 256-color ANSI (for maximum compatibility)
 * Falls back to Bun.color() with "ansi-256" if available
 */
export function toAnsi256(colorInput: any): string | null {
  // Try Bun.color first if available and supports ansi-256
  // Note: Bun.color returns "" if terminal doesn't support colors, null on parse error
  try {
    const bunResult = Bun.color(colorInput, 'ansi-256');
    if (bunResult && bunResult.length > 0) return bunResult;
    // If bunResult is "", terminal doesn't support colors, fall through to manual
  } catch {
    // Fall through to manual conversion
  }

  // Parse color input manually
  let r: number, g: number, b: number;
  let parsed = false;

  if (typeof colorInput === 'string') {
    // Try to parse hex
    if (colorInput.startsWith('#')) {
      const hex = colorInput.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else {
        return null;
      }
    } else if (colorInput.startsWith('rgb')) {
      // Parse rgb(r,g,b) or rgba(r,g,b,a)
      const match = colorInput.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    } else {
      // CSS color names - use Bun.color fallback
      const num = Bun.color(colorInput, 'number');
      if (num === null) return null;
      r = (num >> 16) & 0xff;
      g = (num >> 8) & 0xff;
      b = num & 0xff;
    }
  } else if (typeof colorInput === 'number') {
    r = (colorInput >> 16) & 0xff;
    g = (colorInput >> 8) & 0xff;
    b = colorInput & 0xff;
  } else if (Array.isArray(colorInput) && colorInput.length >= 3) {
    r = colorInput[0];
    g = colorInput[1];
    b = colorInput[2];
  } else if (typeof colorInput === 'object' && 'r' in colorInput) {
    r = colorInput.r;
    g = colorInput.g;
    b = colorInput.b;
  } else {
    return null;
  }

  return rgbToAnsi256(r, g, b);
}

// ============================================================================
// CLI Demo
// ============================================================================

if (import.meta.main) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Terminal Color Quantization Utility v1.0                 ║
║  tmux-style RGB → 256-color conversion                  ║
╚═══════════════════════════════════════════════════════════╝
`);

  // Demo conversions
  const testColors = [
    { name: 'Pure Red', r: 255, g: 0, b: 0 },
    { name: 'Pure Green', r: 0, g: 255, b: 0 },
    { name: 'Pure Blue', r: 0, g: 0, b: 255 },
    { name: 'White', r: 255, g: 255, b: 255 },
    { name: 'Mid Grey', r: 128, g: 128, b: 128 },
    { name: 'Orange', r: 255, g: 165, b: 0 },
  ];

  console.log('RGB to 256-color conversions:');
  console.log('='.repeat(50));

  for (const { name, r, g, b } of testColors) {
    const idx = rgbTo256(r, g, b);
    const ansi = rgbToAnsi256(r, g, b);
    const info = get256ColorInfo(idx);

    console.log(
      `${name.padEnd(12)} rgb(${r},${g},${b}) → idx ${idx.toString().padStart(3)} ${info.type.padEnd(7)} ${info.description}`
    );
    console.log(`             ANSI: ${JSON.stringify(ansi)}`);
    console.log();
  }

  // Test color palette info
  console.log('256-color palette structure:');
  console.log('='.repeat(50));
  console.log('0-15:    Standard colors');
  console.log('16-231:  6x6x6 color cube');
  console.log('232-255: 24 grey levels');
  console.log();

  // Demo toAnsi256 with various inputs
  console.log('Universal color input conversion:');
  console.log('='.repeat(50));
  const inputs = ['#ff0000', 'rgb(255, 0, 0)', 0xff0000, [255, 0, 0], { r: 255, g: 0, b: 0 }];

  for (const input of inputs) {
    const result = toAnsi256(input);
    console.log(`${JSON.stringify(input).padEnd(25)} → ${result}`);
  }

  console.log();
  console.log('✅ All conversions complete');
}

export default {
  rgbTo256,
  rgbToAnsi256,
  rgbToAnsi256Bg,
  get256ColorInfo,
  toAnsi256,
  COLOR_CUBE_LEVELS,
};
