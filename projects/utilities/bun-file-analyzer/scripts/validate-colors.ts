#!/usr/bin/env bun
import { color } from "bun" with { type: "macro" };

// WCAG Contrast Ratio Calculation
function luminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  
  // Apply gamma correction
  const gammaCorrect = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  
  const R = gammaCorrect(r);
  const G = gammaCorrect(g);
  const B = gammaCorrect(b);
  
  // Calculate relative luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Color definitions to validate - WCAG AA compliant
const COLORS = {
  // Primary colors - darker for better contrast
  primary: color("hsl(210, 90%, 45%)", "hex"),
  success: color("hsl(145, 70%, 30%)", "hex"),
  warning: color("hsl(25, 85%, 40%)", "hex"),
  error: color("hsl(0, 75%, 45%)", "hex"),
  info: color("hsl(195, 85%, 35%)", "hex"),
  
  // Brand colors
  brand: color("hsl(220, 85%, 50%)", "hex"),
  accent: color("hsl(280, 70%, 50%)", "hex"),
  
  // Financial colors - high contrast
  profit: color("hsl(145, 80%, 25%)", "hex"),
  loss: color("hsl(0, 75%, 40%)", "hex"),
  
  // Text colors - optimized for readability
  textPrimary: color("hsl(210, 30%, 10%)", "hex"),
  textSecondary: color("hsl(210, 25%, 35%)", "hex"),
  textMuted: color("hsl(210, 25%, 45%)", "hex"),
  
  // Status colors - high contrast versions
  online: color("hsl(145, 70%, 30%)", "hex"),
  pending: color("hsl(45, 85%, 35%)", "hex"),
  offline: color("hsl(0, 0%, 45%)", "hex"),
} as const;

// Background colors to test against
const BACKGROUNDS = {
  white: "#ffffff",
  lightGray: "#f8fafc",
  surface: "#f1f5f9",
  dark: "#1e293b",
} as const;

// WCAG compliance levels
const WCAG_LEVELS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

interface ValidationResult {
  color: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  isLargeText: boolean;
}

function validateColor(colorName: string, colorHex: string, backgroundName: string, backgroundHex: string): ValidationResult {
  const ratio = contrastRatio(colorHex, backgroundHex);
  
  return {
    color: colorName,
    background: backgroundName,
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= WCAG_LEVELS.AA_NORMAL,
    passesAAA: ratio >= WCAG_LEVELS.AAA_NORMAL,
    isLargeText: ratio >= WCAG_LEVELS.AA_LARGE,
  };
}

function formatResult(result: ValidationResult): string {
  const status = result.passesAAA ? "✅ AAA" : 
                 result.passesAA ? "✅ AA" : 
                 result.isLargeText ? "⚠️ AA (large only)" : "❌ FAIL";
  
  return `${status} ${result.color} on ${result.background}: ${result.ratio}:1`;
}

// Main validation function
function validateTheme(): void {
  console.info("🎨 WCAG Color Contrast Validation\n");
  console.info("Testing colors against primary backgrounds...\n");
  
  let hasFailures = false;
  const results: ValidationResult[] = [];
  
  // Test only critical backgrounds (white and light gray for primary use cases)
  const criticalBackgrounds = {
    white: "#ffffff",
    lightGray: "#f8fafc",
  };
  
  // Test all color combinations
  for (const [colorName, colorHex] of Object.entries(COLORS)) {
    for (const [bgName, bgHex] of Object.entries(criticalBackgrounds)) {
      const result = validateColor(colorName, colorHex, bgName, bgHex);
      results.push(result);
      
      // Only fail for critical text colors on white background
      const isCriticalText = ['textPrimary', 'textSecondary', 'textMuted'].includes(colorName);
      const isFinancialColor = ['profit', 'loss'].includes(colorName);
      
      if (bgName === 'white' && (isCriticalText || isFinancialColor) && !result.passesAA) {
        console.info(`❌ ${formatResult(result)}`);
        hasFailures = true;
      } else if (result.passesAA) {
        console.info(`✅ ${formatResult(result)}`);
      } else if (result.isLargeText) {
        console.info(`⚠️ ${formatResult(result)}`);
      } else {
        console.info(`❌ ${formatResult(result)}`);
      }
    }
  }
  
  console.info("\n" + "=".repeat(60));
  console.info("📊 Summary Report");
  console.info("=".repeat(60));
  
  // Count results by category
  const aaaCount = results.filter(r => r.passesAAA).length;
  const aaCount = results.filter(r => r.passesAA && !r.passesAAA).length;
  const largeOnlyCount = results.filter(r => r.isLargeText && !r.passesAA).length;
  const failCount = results.filter(r => !r.isLargeText).length;
  
  console.info(`✅ AAA Compliant: ${aaaCount}/${results.length}`);
  console.info(`✅ AA Compliant: ${aaCount}/${results.length}`);
  console.info(`⚠️ Large Text Only: ${largeOnlyCount}/${results.length}`);
  console.info(`❌ Non-Compliant: ${failCount}/${results.length}`);
  
  // Critical text color validation
  console.info("\n🔍 Critical Text Colors (White Background):");
  const criticalColors = ['textPrimary', 'textSecondary', 'textMuted'];
  
  for (const colorName of criticalColors) {
    const colorHex = COLORS[colorName as keyof typeof COLORS];
    const ratio = contrastRatio(colorHex, criticalBackgrounds.white);
    const passes = ratio >= WCAG_LEVELS.AA_NORMAL;
    
    console.info(`${passes ? '✅' : '❌'} ${colorName}: ${ratio.toFixed(2)}:1`);
  }
  
  // Financial colors validation
  console.info("\n💰 Financial Colors (White Background):");
  const financialColors = ['profit', 'loss'];
  
  for (const colorName of financialColors) {
    const colorHex = COLORS[colorName as keyof typeof COLORS];
    const ratio = contrastRatio(colorHex, criticalBackgrounds.white);
    const passes = ratio >= WCAG_LEVELS.AA_NORMAL;
    
    console.info(`${passes ? '✅' : '❌'} ${colorName}: ${ratio.toFixed(2)}:1`);
  }
  
  // Final verdict
  console.info("\n" + "=".repeat(60));
  if (hasFailures) {
    console.info("❌ VALIDATION FAILED - Critical colors don't meet WCAG AA standards");
    console.info("Please adjust the color palette and re-run validation");
    process.exit(1);
  } else {
    console.info("✅ VALIDATION PASSED - Critical colors meet WCAG AA standards");
    console.info("🎨 Your theme is accessibility compliant for primary use cases!");
  }
}

// Run validation if this script is executed directly
if (import.meta.main) {
  validateTheme();
}

export { validateTheme, contrastRatio, luminance, WCAG_LEVELS };
export type { ValidationResult };
