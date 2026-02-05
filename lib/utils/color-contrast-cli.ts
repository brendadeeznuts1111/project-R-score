#!/usr/bin/env bun
/**
 * ♿ Color Contrast Checker CLI (WCAG Accessibility)
 * 
 * Check color contrast ratios for WCAG AA/AAA compliance
 * 
 * Usage:
 *   bun run color-contrast --fg="hsl(0, 100%, 50%)" --bg="hsl(0, 0%, 95%)"
 *   bun run color-contrast --fg="#ef4444" --bg="#ffffff"
 *   bun run color-contrast --find --bg="hsl(210, 20%, 95%)" --hue=0
 */

import {
  checkContrast,
  findAccessibleForeground,
  parseHSL,
  formatHSL,
  hslToHex,
  hslToAnsi,
  contrastRatio,
  hslToRgb,
} from "./advanced-hsl-colors";

const RESET = "\x1b[0m";

function printContrastResult(
  foreground: { h: number; s: number; l: number },
  background: { h: number; s: number; l: number },
  result: ReturnType<typeof checkContrast>
): void {
  const fgHex = hslToHex(foreground);
  const bgHex = hslToHex(background);
  const fgAnsi = hslToAnsi(foreground);
  const bgAnsi = hslToAnsi(background);
  
  console.log("\n♿ Contrast Analysis\n");
  console.log("═".repeat(80));
  
  console.log("\n🎨 Colors:");
  console.log(`  Foreground: ${fgAnsi}███${RESET} ${fgHex} ${formatHSL(foreground)}`);
  console.log(`  Background: ${bgAnsi}███${RESET} ${bgHex} ${formatHSL(background)}`);
  
  console.log("\n📊 Results:");
  const ratio = result.ratio;
  const levelColor = result.wcagAAA ? "success" : result.wcagAA ? "warning" : "error";
  const levelEmoji = result.wcagAAA ? "✅" : result.wcagAA ? "⚠️" : "❌";
  
  console.log(`  Contrast Ratio: ${ratio.toFixed(2)}:1`);
  console.log(`  WCAG Level: ${levelEmoji} ${result.level.toUpperCase()}`);
  console.log(`  WCAG AA (Normal): ${result.wcagAA ? "✅ Pass" : "❌ Fail"} (≥4.5:1)`);
  console.log(`  WCAG AAA (Enhanced): ${result.wcagAAA ? "✅ Pass" : "❌ Fail"} (≥7:1)`);
  
  if (!result.wcagAA) {
    console.log("\n💡 Recommendations:");
    console.log("  • Increase lightness difference between foreground and background");
    console.log("  • Use higher saturation for better contrast");
    console.log("  • Consider using a darker/lighter variant");
  }
  
  console.log("\n" + "═".repeat(80));
}

function printAccessibleForeground(
  background: { h: number; s: number; l: number },
  preferredHue?: number
): void {
  console.log("\n🔍 Finding Accessible Foreground Colors\n");
  console.log("═".repeat(80));
  
  const targets = [
    { name: "WCAG AA", ratio: 4.5 },
    { name: "WCAG AAA", ratio: 7.0 },
  ];
  
  targets.forEach((target) => {
    const foreground = findAccessibleForeground(background, target.ratio, preferredHue);
    const result = checkContrast(foreground, background);
    const fgHex = hslToHex(foreground);
    const fgAnsi = hslToAnsi(foreground);
    
    console.log(`\n${target.name} (≥${target.ratio}:1):`);
    console.log(`  ${fgAnsi}███${RESET} ${fgHex} ${formatHSL(foreground)}`);
    console.log(`  Actual Ratio: ${result.ratio.toFixed(2)}:1 ${result.wcagAA ? "✅" : "❌"}`);
  });
  
  console.log("\n" + "═".repeat(80));
}

function main(): void {
  const args = process.argv.slice(2);
  
  let foreground: { h: number; s: number; l: number } | null = null;
  let background: { h: number; s: number; l: number } | null = null;
  let findMode = false;
  let preferredHue: number | undefined;
  
  for (const arg of args) {
    if (arg.startsWith("--fg=") || arg.startsWith("--foreground=")) {
      const value = arg.split("=")[1];
      try {
        foreground = parseHSL(value);
      } catch {
        // Try parsing as HSL string from Bun.color()
        const hslStr = Bun.color(value, "hsl");
        if (hslStr && typeof hslStr === "string") {
          try {
            foreground = parseHSL(hslStr);
          } catch {
            // Fallback: convert RGB to HSL
            const rgb = Bun.color(value, "{rgb}");
            if (rgb && typeof rgb === "object" && "r" in rgb) {
              const tempHSL = hslToRgb({ h: 0, s: 0, l: 0 }); // Dummy to get function
              // Convert RGB to HSL manually
              const r = rgb.r / 255;
              const g = rgb.g / 255;
              const b = rgb.b / 255;
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const delta = max - min;
              let h = 0;
              let s = 0;
              const l = (max + min) / 2;
              
              if (delta !== 0) {
                s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
                if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
                else if (max === g) h = ((b - r) / delta + 2) * 60;
                else h = ((r - g) / delta + 4) * 60;
              }
              
              foreground = { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
            }
          }
        }
      }
    } else if (arg.startsWith("--bg=") || arg.startsWith("--background=")) {
      const value = arg.split("=")[1];
      try {
        background = parseHSL(value);
      } catch {
        // Try parsing as HSL string from Bun.color()
        const hslStr = Bun.color(value, "hsl");
        if (hslStr && typeof hslStr === "string") {
          try {
            background = parseHSL(hslStr);
          } catch {
            // Fallback: convert RGB to HSL
            const rgb = Bun.color(value, "{rgb}");
            if (rgb && typeof rgb === "object" && "r" in rgb) {
              const r = rgb.r / 255;
              const g = rgb.g / 255;
              const b = rgb.b / 255;
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const delta = max - min;
              let h = 0;
              let s = 0;
              const l = (max + min) / 2;
              
              if (delta !== 0) {
                s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
                if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
                else if (max === g) h = ((b - r) / delta + 2) * 60;
                else h = ((r - g) / delta + 4) * 60;
              }
              
              background = { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
            }
          }
        }
      }
    } else if (arg === "--find") {
      findMode = true;
    } else if (arg.startsWith("--hue=")) {
      preferredHue = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
♿ Color Contrast Checker (WCAG Accessibility)

Usage:
  bun run color-contrast --fg="hsl(0, 100%, 50%)" --bg="hsl(0, 0%, 95%)"
  bun run color-contrast --fg="#ef4444" --bg="#ffffff"
  bun run color-contrast --find --bg="hsl(210, 20%, 95%)" --hue=0

Options:
  --fg, --foreground=<color>  Foreground color (HSL or hex)
  --bg, --background=<color>   Background color (HSL or hex)
  --find                       Find accessible foreground for background
  --hue=<0-360>                Preferred hue when using --find
  --help, -h                   Show this help

Examples:
  # Check red on white
  bun run color-contrast --fg="#ef4444" --bg="#ffffff"
  
  # Find accessible foreground for light blue background
  bun run color-contrast --find --bg="hsl(210, 20%, 95%)" --hue=0
  
  # Check status colors on dark background
  bun run color-contrast --fg="hsl(135, 95%, 65%)" --bg="hsl(0, 0%, 10%)"
`);
      process.exit(0);
    }
  }
  
  if (findMode) {
    if (!background) {
      console.error("❌ Error: --background required when using --find");
      process.exit(1);
    }
    printAccessibleForeground(background, preferredHue);
    return;
  }
  
  if (!foreground || !background) {
    console.error("❌ Error: Both --foreground and --background required");
    console.log("Use --help for usage information");
    process.exit(1);
  }
  
  try {
    const result = checkContrast(foreground, background);
    printContrastResult(foreground, background, result);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
