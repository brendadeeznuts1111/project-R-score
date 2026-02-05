#!/usr/bin/env bun
/**
 * 🎨 Advanced HSL Color Theory Demo
 * 
 * Demonstrates all advanced HSL techniques with Bun.color()
 */

import {
  generatePalette,
  generateHarmoniousPalette,
  getStatusAnsi,
  getStatusColor,
  checkContrast,
  findAccessibleForeground,
  perceivedBrightness,
  adjustToPerceivedBrightness,
  hslToOKLCH,
  oklchToHSL,
  HSL_SWEET_SPOTS,
  STATUS_HUES,
} from "./advanced-hsl-colors";

const RESET = "\x1b[0m";

function printSection(title: string): void {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(80));
}

function printColor(hsl: { h: number; s: number; l: number }, label: string): void {
  const hex = Bun.color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, "hex");
  const ansi = Bun.color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, "ansi");
  console.log(`  ${ansi}███${RESET} ${label.padEnd(25)} ${hex} hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
}

function main(): void {
  console.log("\n🎨 Advanced HSL Color Theory Demo\n");
  console.log("Demonstrating perceptually-aware color manipulation with Bun.color()\n");
  
  // 1. Harmonious Palettes
  printSection("1. Harmonious Palettes via Hue Offsets");
  const baseHue = 210; // Blue
  console.log(`\nBase Hue: ${baseHue}° (Blue)`);
  
  const palette = generateHarmoniousPalette(baseHue, 85, 65);
  console.log("\nPrimary:", palette.primary);
  console.log("Analogous (±30°):", palette.analogous.join(", "));
  console.log("Complementary (180°):", palette.complementary);
  console.log("Triadic (120° apart):", palette.triadic.join(", "));
  console.log("\nTints (5 steps):", palette.tints.slice(0, 3).join(", "), "...");
  console.log("Shades (5 steps):", palette.shades.slice(0, 3).join(", "), "...");
  
  // 2. Status Colors with Perceptual Adjustment
  printSection("2. Dynamic Status Coloring (Perceptual Adjustment)");
  const statuses: Array<"success" | "warning" | "error" | "info"> = [
    "success",
    "warning",
    "error",
    "info",
  ];
  
  statuses.forEach((status) => {
    const hsl = getStatusColor(status, 65, "medium");
    const ansi = getStatusAnsi(status, 65, "medium");
    console.log(`\n${status.toUpperCase()}:`);
    printColor(hsl, `Base (H: ${STATUS_HUES[status]}°)`);
    
    // Show severity variants
    ["low", "medium", "high"].forEach((severity) => {
      const variant = getStatusColor(status, 65, severity as any);
      printColor(variant, `  ${severity} severity`);
    });
  });
  
  // 3. Perceptual Brightness Compensation
  printSection("3. Perceptual Brightness Adjustment (HSL Non-Uniformity)");
  const testColors = [
    { h: 0, s: 100, l: 50 },   // Pure red at 50%
    { h: 0, s: 100, l: 25 },   // Dark red (should look muted)
    { h: 0, s: 100, l: 75 },   // Light red (should look muted)
  ];
  
  testColors.forEach((color) => {
    const brightness = perceivedBrightness(color);
    const adjusted = adjustToPerceivedBrightness(color, 0.5); // Target 50% brightness
    console.log(`\nOriginal:`);
    printColor(color, `L=${color.l}%`);
    console.log(`  Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
    console.log(`\nAdjusted (target 50%):`);
    printColor(adjusted, `L=${adjusted.l}%`);
    console.log(`  Perceived Brightness: ${(perceivedBrightness(adjusted) * 100).toFixed(1)}%`);
  });
  
  // 4. Accessibility Contrast Checking
  printSection("4. WCAG Accessibility Contrast Checking");
  const foreground = { h: 0, s: 100, l: 50 }; // Red
  const background = { h: 0, s: 0, l: 95 };   // Light gray
  
  const contrast = checkContrast(foreground, background);
  console.log("\nForeground:");
  printColor(foreground, "Red text");
  console.log("\nBackground:");
  printColor(background, "Light gray");
  console.log(`\nContrast Ratio: ${contrast.ratio.toFixed(2)}:1`);
  console.log(`WCAG AA: ${contrast.wcagAA ? "✅ Pass" : "❌ Fail"} (≥4.5:1)`);
  console.log(`WCAG AAA: ${contrast.wcagAAA ? "✅ Pass" : "❌ Fail"} (≥7:1)`);
  
  // Find accessible foreground
  const accessible = findAccessibleForeground(background, 0);
  const accessibleContrast = checkContrast(accessible, background);
  console.log("\nAccessible Foreground (for red hue):");
  printColor(accessible, "Found");
  console.log(`Contrast Ratio: ${accessibleContrast.ratio.toFixed(2)}:1`);
  
  // 5. HSL Sweet Spots
  printSection("5. HSL Sweet Spots (Maximum Visual Impact)");
  Object.entries(HSL_SWEET_SPOTS).forEach(([name, ranges]) => {
    const exampleH = Math.floor((ranges.h[0] + ranges.h[1]) / 2);
    const exampleS = Math.floor((ranges.s[0] + ranges.s[1]) / 2);
    const exampleL = Math.floor((ranges.l[0] + ranges.l[1]) / 2);
    const exampleHSL = { h: exampleH, s: exampleS, l: exampleL };
    
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Range: H ${ranges.h[0]}-${ranges.h[1]}°, S ${ranges.s[0]}-${ranges.s[1]}%, L ${ranges.l[0]}-${ranges.l[1]}%`);
    printColor(exampleHSL, "Example");
  });
  
  // 6. OKLCH Conversion (Perceptually Uniform)
  printSection("6. OKLCH Conversion (Perceptually Uniform)");
  const hslColor = { h: 210, s: 90, l: 60 };
  const oklch = hslToOKLCH(hslColor);
  const backToHSL = oklchToHSL(oklch);
  
  console.log("\nHSL → OKLCH → HSL:");
  printColor(hslColor, "Original HSL");
  console.log(`  OKLCH: L=${(oklch.l * 100).toFixed(1)}%, C=${(oklch.c * 100).toFixed(1)}%, H=${oklch.h.toFixed(1)}°`);
  printColor(backToHSL, "Converted back");
  
  // 7. Complete Palette Generation
  printSection("7. Complete Palette Generation");
  const completePalette = generatePalette({ h: 210, s: 90, l: 60 });
  console.log("\nBase Color:");
  printColor(completePalette.base, "Primary");
  console.log("\nAccessibility:");
  console.log(`  Foreground: ${Bun.color(`hsl(${completePalette.accessible.foreground.h}, ${completePalette.accessible.foreground.s}%, ${completePalette.accessible.foreground.l}%)`, "hex")}`);
  console.log(`  Background: ${Bun.color(`hsl(${completePalette.accessible.background.h}, ${completePalette.accessible.background.s}%, ${completePalette.accessible.background.l}%)`, "hex")}`);
  console.log(`  Contrast Ratio: ${completePalette.accessible.ratio.toFixed(2)}:1`);
  
  console.log("\n" + "═".repeat(80));
  console.log("\n✨ Demo complete! Ready to go vivid? 🎨🚀\n");
}

if (import.meta.main) {
  main();
}
