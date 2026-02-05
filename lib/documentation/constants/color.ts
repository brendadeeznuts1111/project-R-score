/**
 * 🎨 Bun.color Documentation Constants
 * 
 * URL: https://bun.sh/docs/runtime/color
 * API: Bun.color(input, outputFormat?)
 * 
 * Format colors as CSS, ANSI, numbers, hex strings, and more
 * @version Bun 1.0+
 */

// ============================================================================
// OUTPUT FORMATS
// ============================================================================

export const COLOR_OUTPUT_FORMATS = {
  // Terminal formats
  ANSI: 'ansi' as const,
  ANSI_16: 'ansi-16' as const,
  ANSI_256: 'ansi-256' as const,
  ANSI_16M: 'ansi-16m' as const,
  
  // CSS formats
  CSS: 'css' as const,
  RGB: 'rgb' as const,
  RGBA: 'rgba' as const,
  HSL: 'hsl' as const,
  HEX: 'hex' as const,
  HEX_UPPERCASE: 'HEX' as const,
  
  // Object/array formats
  RGB_OBJECT: '{rgb}' as const,
  RGBA_OBJECT: '{rgba}' as const,
  RGB_ARRAY: '[rgb]' as const,
  RGBA_ARRAY: '[rgba]' as const,
  
  // Database-friendly
  NUMBER: 'number' as const,
} as const;

export type ColorOutputFormat = typeof COLOR_OUTPUT_FORMATS[keyof typeof COLOR_OUTPUT_FORMATS];

// ============================================================================
// DOCUMENTATION URLS
// ============================================================================

export const COLOR_DOCUMENTATION_URLS = {
  MAIN: '/docs/runtime/color',
  
  // Sections
  FLEXIBLE_INPUT: '/docs/runtime/color#flexible-input',
  FORMAT_CSS: '/docs/runtime/color#format-colors-as-css',
  FORMAT_ANSI: '/docs/runtime/color#format-colors-as-ansi-for-terminals',
  FORMAT_NUMBERS: '/docs/runtime/color#format-colors-as-numbers',
  FORMAT_HEX: '/docs/runtime/color#format-colors-as-hex-strings',
  GET_CHANNELS: '/docs/runtime/color#get-the-red-green-blue-and-alpha-channels',
  BUNDLE_TIME: '/docs/runtime/color#bundle-time-client-side-color-formatting',
} as const;

// ============================================================================
// EXAMPLES
// ============================================================================

export const COLOR_EXAMPLES = {
  // Number format (database-friendly)
  NUMBER: {
    description: 'Convert any color input to a number for database storage',
    code: `Bun.color("red", "number");           // 16711680
Bun.color(0xff0000, "number");         // 16711680
Bun.color({ r: 255, g: 0, b: 0 }, "number"); // 16711680
Bun.color([255, 0, 0], "number");      // 16711680
Bun.color("rgb(255, 0, 0)", "number"); // 16711680
Bun.color("hsl(0, 100%, 50%)", "number"); // 16711680`,
  },
  
  // Terminal colors (auto-detects color depth)
  ANSI: {
    description: 'Format colors for terminal output. Auto-detects color depth (ansi-16m, ansi-256, ansi-16) based on environment. Returns empty string if stdout does not support ANSI colors.',
    code: `Bun.color("red", "ansi");      // "\\u001b[38;2;255;0;0m" (24-bit)
Bun.color("#00ff00", "ansi-256"); // "\\u001b[38;5;46m" (256 color)
Bun.color("blue", "ansi-16");     // "\\u001b[38;5;4m" (16 color)
// Returns "" if terminal doesn't support colors
// Returns null if input fails to parse`,
  },
  
  // CSS formats
  CSS: {
    description: 'Normalize to CSS color names',
    code: `Bun.color("#ff0000", "css"); // "red"
Bun.color(0xff0000, "css");      // "red"
Bun.color("rgb(255,0,0)", "css");  // "red"`,
  },
  
  // Object extraction
  OBJECTS: {
    description: 'Extract RGB/RGBA components',
    code: `Bun.color("red", "{rgb}");        // { r: 255, g: 0, b: 0 }
Bun.color("rgba(255,0,0,0.5)", "{rgba}"); // { r: 255, g: 0, b: 0, a: 0.5 }
Bun.color("red", "[rgb]");         // [255, 0, 0]
Bun.color("red", "[rgba]");        // [255, 0, 0, 255]`,
  },
} as const;

// ============================================================================
// INPUT FORMATS SUPPORTED
// ============================================================================

export const COLOR_INPUT_FORMATS = [
  'Standard CSS color names (e.g., "red", "blue")',
  'Hex numbers (e.g., 0xff0000)',
  'Hex strings (e.g., "#f00", "#ff0000")',
  'RGB strings (e.g., "rgb(255, 0, 0)")',
  'RGBA strings (e.g., "rgba(255, 0, 0, 1)")',
  'HSL strings (e.g., "hsl(0, 100%, 50%)")',
  'HSLA strings (e.g., "hsla(0, 100%, 50%, 1)")',
  'RGB objects (e.g., { r: 255, g: 0, b: 0 })',
  'RGBA objects (e.g., { r: 255, g: 0, b: 0, a: 1 })',
  'RGB arrays (e.g., [255, 0, 0])',
  'RGBA arrays (e.g., [255, 0, 0, 255])',
  'LAB strings (e.g., "lab(50% 50% 50%)")',
] as const;

// ============================================================================
// USE CASES
// ============================================================================

export const COLOR_USE_CASES = {
  DATABASE: {
    format: 'number',
    description: 'Most database-friendly format for color persistence',
    example: 'Bun.color("red", "number") // 16711680',
  },
  TERMINAL: {
    format: 'ansi',
    description: 'Colorful logging beyond 16 basic colors',
    example: 'Bun.color("red", "ansi") // "\\x1b[38;2;255;0;0m"',
  },
  CSS_INJECTION: {
    format: 'css',
    description: 'Format colors for CSS injection into HTML',
    example: 'Bun.color("#f00", "css") // "red"',
  },
  COMPONENT_EXTRACTION: {
    format: '{rgb}',
    description: 'Get r, g, b, a color components as JavaScript objects',
    example: 'Bun.color("red", "{rgb}") // { r: 255, g: 0, b: 0 }',
  },
} as const;

// ============================================================================
// URL BUILDER
// ============================================================================

export class ColorDocumentationURLBuilder {
  private static readonly BASE_URL = 'https://bun.sh';
  
  /**
   * Build color documentation URL
   */
  static buildURL(section?: string): string {
    const path = section 
      ? `/docs/runtime/color${section}`
      : '/docs/runtime/color';
    return new URL(path, this.BASE_URL).toString();
  }
  
  /**
   * Build URL with text fragment
   */
  static buildWithFragment(fragment: string): string {
    const url = new URL('/docs/runtime/color', this.BASE_URL);
    url.hash = `:~:text=${encodeURIComponent(fragment)}`;
    return url.toString();
  }
  
  /**
   * Get all color documentation URLs
   */
  static getAllURLs(): Record<string, string> {
    return {
      main: this.buildURL(),
      flexibleInput: this.buildURL('#flexible-input'),
      formatCSS: this.buildURL('#format-colors-as-css'),
      formatANSI: this.buildURL('#format-colors-as-ansi-for-terminals'),
      formatNumbers: this.buildURL('#format-colors-as-numbers'),
      formatHex: this.buildURL('#format-colors-as-hex-strings'),
      getChannels: this.buildURL('#get-the-red-green-blue-and-alpha-channels'),
      bundleTime: this.buildURL('#bundle-time-client-side-color-formatting'),
    };
  }
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Bun.color() Documentation v1.0                           ║
║  API: Bun.color(input, outputFormat?)                     ║
╚═══════════════════════════════════════════════════════════╝

Output Formats:
${Object.entries(COLOR_OUTPUT_FORMATS).map(([k, v]) => `  ${k.padEnd(15)} "${v}"`).join('\n')}

Examples:
${COLOR_EXAMPLES.NUMBER.code}

All URLs:
${Object.entries(ColorDocumentationURLBuilder.getAllURLs()).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
`);
}

export default {
  COLOR_OUTPUT_FORMATS,
  COLOR_DOCUMENTATION_URLS,
  COLOR_EXAMPLES,
  COLOR_INPUT_FORMATS,
  COLOR_USE_CASES,
  ColorDocumentationURLBuilder,
};
