/**
 * Bun Color API Integration
 *
 * Bun provides a `Bun.color` function for terminal color output and
 * `Bun.enableANSIColors` for controlling ANSI color support.
 */

// Color API Examples - Optimized for Bun's native color system
export function demonstrateBunColor() {
  // Leverage Bun.color() for format conversions (not terminal output)
  console.log("🎨 Bun Color API (Format Conversions):");

  // Convert between color formats
  const redHex = Bun.color("red", "hex"); // "#ff0000"
  const greenRgb = Bun.color("#00ff00", "rgb"); // "rgb(0, 255, 0)"
  const blueHsl = Bun.color([0, 0, 255], "hsl"); // "hsl(240, 1, 0.5)"

  console.log(`Red to hex: ${redHex}`);
  console.log(`Green to RGB: ${greenRgb}`);
  console.log(`Blue to HSL: ${blueHsl}`);

  // ANSI color codes for terminal use
  console.log("\n🖥️ ANSI Color Codes:");
  console.log(`Red ANSI: ${Bun.color("red", "ansi")}`); // "31"
  console.log(`Green ANSI: ${Bun.color("#00ff00", "ansi_256")}`); // "46"

  // ANSI Colors setting check
  console.log(`\n🔧 ANSI Colors enabled: ${Bun.enableANSIColors}`);
}

// Advanced color utilities - Integrated with Bun's color system
export class BunColorFormatter {
  // Cache ANSI codes for performance (computed once)
  private static readonly ansiCodes = {
    success: Bun.color("green", "ansi"),    // "32"
    error: Bun.color("red", "ansi"),        // "31"
    warning: Bun.color("yellow", "ansi"),   // "33"
    info: Bun.color("blue", "ansi"),        // "34"
    reset: "0"
  } as const;

  // ANSI escape sequence templates
  private static readonly colors = {
    red: `\x1b[${this.ansiCodes.error}m`,
    green: `\x1b[${this.ansiCodes.success}m`,
    yellow: `\x1b[${this.ansiCodes.warning}m`,
    blue: `\x1b[${this.ansiCodes.info}m`,
    reset: `\x1b[${this.ansiCodes.reset}m`
  };

  static success(text: string): string {
    return `${this.colors.green}✅ ${text}${this.colors.reset}`;
  }

  static error(text: string): string {
    return `${this.colors.red}❌ ${text}${this.colors.reset}`;
  }

  static warning(text: string): string {
    return `${this.colors.yellow}⚠️  ${text}${this.colors.reset}`;
  }

  static info(text: string): string {
    return `${this.colors.blue}ℹ️  ${text}${this.colors.reset}`;
  }

  static rgb(r: number, g: number, b: number, text: string): string {
    // Use Bun.color() for ANSI 256 conversion
    const ansi256 = Bun.color([r, g, b], "ansi_256");
    return `\x1b[38;5;${ansi256}m${text}${this.colors.reset}`;
  }

  static hex(color: string, text: string): string {
    // Use Bun.color() for hex to ANSI conversion
    const ansi256 = Bun.color(color, "ansi_256");
    return `\x1b[38;5;${ansi256}m${text}${this.colors.reset}`;
  }

  // Utility: Get raw ANSI code for custom formatting
  static getAnsiCode(color: string): string {
    return Bun.color(color, "ansi");
  }

  // Utility: Check if ANSI colors are supported
  static get supportsColor(): boolean {
    return Bun.enableANSIColors;
  }
}
