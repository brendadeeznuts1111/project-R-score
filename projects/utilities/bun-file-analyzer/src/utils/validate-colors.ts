import { Palette } from "./utils/colors";

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 255) / 255;
  const g = ((rgb >> 8) & 255) / 255;
  const b = (rgb & 255) / 255;
  const [rL, gL, bL] = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

console.log("Color Contrast Validation\n" + "=".repeat(40));

let allValid = true;
for (const [layer, colors] of Object.entries(Palette)) {
  const ratio = getContrastRatio(colors.primary, "#ffffff");
  const valid = ratio >= 4.5;
  console.log(`${layer}: ${ratio.toFixed(2)}:1 ${valid ? "✓ PASS" : "✗ FAIL"} (WCAG AA: 4.5:1)`);
  if (!valid) allValid = false;
}

console.log("\n" + (allValid ? "All colors pass WCAG AA contrast requirements!" : "Some colors fail contrast requirements."));
