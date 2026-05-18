#!/usr/bin/env bun

/**
 * ♿ WCAG Contrast Checker - HSL Edition
 *
 * Advanced contrast analysis using perceptual brightness calculations
 * for HSL colors with automatic compliance checking.
 */

import { ensureContrast, autoAdjustContrast, perceivedBrightness } from '../lib/utils/advanced-hsl-system.ts';
import { colorize } from '../lib/utils/color-system.ts';

interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  aaCompliant: boolean;
  aaaCompliant: boolean;
  level: 'FAIL' | 'AA' | 'AAA';
}

function analyzeContrast(
  fgHsl: { h: number; s: number; l: number },
  bgHsl: { h: number; s: number; l: number }
): ContrastResult {
  const result = ensureContrast(fgHsl, bgHsl, 'AAA');

  return {
    foreground: `hsl(${fgHsl.h}, ${fgHsl.s}%, ${fgHsl.l}%)`,
    background: `hsl(${bgHsl.h}, ${bgHsl.s}%, ${bgHsl.l}%)`,
    ratio: result.ratio,
    aaCompliant: result.ratio >= 4.5,
    aaaCompliant: result.ratio >= 7,
    level: result.ratio >= 7 ? 'AAA' : result.ratio >= 4.5 ? 'AA' : 'FAIL'
  };
}

function generateComplianceReport(results: ContrastResult[]): void {
  console.info(colorize('♿ WCAG CONTRAST COMPLIANCE REPORT', 'blue', true));
  console.info(colorize('═'.repeat(50), 'gray'));
  console.info();

  let passCount = 0;
  let aaCount = 0;
  let aaaCount = 0;

  results.forEach((result, i) => {
    const statusIcon = result.level === 'AAA' ? '✅' :
                      result.level === 'AA' ? '🟡' : '❌';
    const statusColor = result.level === 'AAA' ? 'green' :
                        result.level === 'AA' ? 'yellow' : 'red';

    console.info(colorize(`${i + 1}. ${statusIcon} ${result.level}`, statusColor, true));
    console.info(`   FG: ${result.foreground}`);
    console.info(`   BG: ${result.background}`);
    console.info(`   Ratio: ${result.ratio.toFixed(2)}:1`);
    console.info(`   AA: ${result.aaCompliant ? '✅' : '❌'} | AAA: ${result.aaaCompliant ? '✅' : '❌'}`);
    console.info();

    if (result.level !== 'FAIL') passCount++;
    if (result.aaCompliant) aaCount++;
    if (result.aaaCompliant) aaaCount++;
  });

  console.info(colorize('📊 SUMMARY', 'cyan', true));
  console.info(`Total Combinations: ${results.length}`);
  console.info(`AA Compliant: ${aaCount}/${results.length} (${((aaCount/results.length)*100).toFixed(1)}%)`);
  console.info(`AAA Compliant: ${aaaCount}/${results.length} (${((aaaCount/results.length)*100).toFixed(1)}%)`);
  console.info(`Overall Pass Rate: ${passCount}/${results.length} (${((passCount/results.length)*100).toFixed(1)}%)`);
}

function demoContrastScenarios(): void {
  console.info(colorize('🧪 CONTRAST ANALYSIS DEMO', 'magenta', true));
  console.info();

  // Common UI scenarios
  const scenarios = [
    // Status colors on light backgrounds
    { name: 'Success on White', fg: { h: 135, s: 95, l: 35 }, bg: { h: 0, s: 0, l: 100 } },
    { name: 'Error on White', fg: { h: 0, s: 95, l: 45 }, bg: { h: 0, s: 0, l: 100 } },
    { name: 'Info on Light Gray', fg: { h: 210, s: 95, l: 35 }, bg: { h: 0, s: 0, l: 96 } },

    // Light text on dark backgrounds
    { name: 'Light Gray on Dark Blue', fg: { h: 0, s: 0, l: 85 }, bg: { h: 210, s: 95, l: 15 } },
    { name: 'White on Black', fg: { h: 0, s: 0, l: 100 }, bg: { h: 0, s: 0, l: 0 } },

    // Problematic combinations (intentionally poor contrast)
    { name: 'Red on Green (BAD)', fg: { h: 0, s: 95, l: 50 }, bg: { h: 120, s: 95, l: 40 } },
    { name: 'Yellow on White (OK)', fg: { h: 60, s: 95, l: 50 }, bg: { h: 0, s: 0, l: 100 } },
  ];

  const results = scenarios.map(scenario => {
    const result = analyzeContrast(scenario.fg, scenario.bg);
    return {
      ...result,
      name: scenario.name
    };
  });

  results.forEach(result => {
    const statusIcon = result.level === 'AAA' ? '✅' :
                      result.level === 'AA' ? '🟡' : '❌';
    const statusColor = result.level === 'AAA' ? 'green' :
                        result.level === 'AA' ? 'yellow' : 'red';

    console.info(`${statusIcon} ${colorize(result.name, statusColor)}: ${result.ratio.toFixed(2)}:1`);
  });

  console.info();
  console.info(colorize('🔧 AUTO-ADJUSTMENT DEMO', 'cyan', true));
  console.info();

  // Show auto-adjustment for poor contrast
  const poorContrast = { fg: { h: 0, s: 95, l: 50 }, bg: { h: 120, s: 95, l: 40 } };
  const originalResult = analyzeContrast(poorContrast.fg, poorContrast.bg);
  const adjustedFg = autoAdjustContrast(poorContrast.fg, poorContrast.bg, 4.5);
  const adjustedResult = analyzeContrast(adjustedFg, poorContrast.bg);

  console.info('Original (poor contrast):');
  console.info(`  FG: hsl(${poorContrast.fg.h}, ${poorContrast.fg.s}%, ${poorContrast.fg.l}%)`);
  console.info(`  BG: hsl(${poorContrast.bg.h}, ${poorContrast.bg.s}%, ${poorContrast.bg.l}%)`);
  console.info(`  Ratio: ${originalResult.ratio.toFixed(2)}:1 ❌ FAIL`);
  console.info();

  console.info('Auto-adjusted for AA compliance:');
  console.info(`  FG: hsl(${adjustedFg.h}, ${adjustedFg.s}%, ${adjustedFg.l}%)`);
  console.info(`  BG: hsl(${poorContrast.bg.h}, ${poorContrast.bg.s}%, ${poorContrast.bg.l}%)`);
  console.info(`  Ratio: ${adjustedResult.ratio.toFixed(2)}:1 ${adjustedResult.level === 'AA' || adjustedResult.level === 'AAA' ? '✅ PASS' : '❌ FAIL'}`);
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'check') {
  // Manual contrast check: bun run bun-contrast-checker.ts check fgH fgS fgL bgH bgS bgL
  const fgH = parseInt(args[1]) || 0;
  const fgS = parseInt(args[2]) || 95;
  const fgL = parseInt(args[3]) || 65;
  const bgH = parseInt(args[4]) || 210;
  const bgS = parseInt(args[5]) || 95;
  const bgL = parseInt(args[6]) || 10;

  const result = analyzeContrast({ h: fgH, s: fgS, l: fgL }, { h: bgH, s: bgS, l: bgL });

  console.info(colorize('♿ MANUAL CONTRAST CHECK', 'blue', true));
  console.info();
  console.info(`Foreground: hsl(${fgH}, ${fgS}%, ${fgL}%)`);
  console.info(`Background: hsl(${bgH}, ${bgS}%, ${bgL}%)`);
  console.info(`Contrast Ratio: ${result.ratio.toFixed(2)}:1`);
  console.info(`WCAG AA: ${result.aaCompliant ? '✅ PASS' : '❌ FAIL'}`);
  console.info(`WCAG AAA: ${result.aaaCompliant ? '✅ PASS' : '❌ FAIL'}`);
  console.info(`Overall: ${colorize(result.level, result.level === 'AAA' ? 'green' : result.level === 'AA' ? 'yellow' : 'red')}`);

} else if (command === 'demo') {
  demoContrastScenarios();

} else if (command === 'report') {
  // Generate report for common UI color combinations
  const commonCombos = [
    // Light backgrounds
    { fg: { h: 0, s: 95, l: 35 }, bg: { h: 0, s: 0, l: 100 } },     // Error on white
    { fg: { h: 135, s: 95, l: 35 }, bg: { h: 0, s: 0, l: 100 } },  // Success on white
    { fg: { h: 45, s: 95, l: 40 }, bg: { h: 0, s: 0, l: 100 } },   // Warning on white
    { fg: { h: 210, s: 95, l: 35 }, bg: { h: 0, s: 0, l: 100 } },  // Info on white

    // Dark backgrounds
    { fg: { h: 0, s: 0, l: 90 }, bg: { h: 0, s: 95, l: 20 } },     // Light text on dark red
    { fg: { h: 0, s: 0, l: 85 }, bg: { h: 210, s: 95, l: 15 } },  // Light text on dark blue
    { fg: { h: 0, s: 0, l: 95 }, bg: { h: 0, s: 0, l: 10 } },     // White on dark gray
  ];

  generateComplianceReport(commonCombos.map(combo => analyzeContrast(combo.fg, combo.bg)));

} else {
  console.info(colorize('♿ WCAG Contrast Checker - HSL Edition', 'cyan', true));
  console.info(colorize('Usage:', 'yellow'));
  console.info('  bun run bun-contrast-checker.ts demo              # Interactive demo');
  console.info('  bun run bun-contrast-checker.ts check [fgH fgS fgL bgH bgS bgL]  # Manual check');
  console.info('  bun run bun-contrast-checker.ts report            # Full compliance report');
  console.info();
  console.info(colorize('Examples:', 'gray'));
  console.info('  bun run bun-contrast-checker.ts check 0 95 65 210 95 10    # Red on dark blue');
  console.info('  bun run bun-contrast-checker.ts check 135 95 35 0 0 100    # Green on white');
  console.info();
  console.info(colorize('HSL Parameters:', 'magenta'));
  console.info('  fgH/fgS/fgL = Foreground Hue(0-360), Saturation(0-100), Lightness(0-100)');
  console.info('  bgH/bgS/bgL = Background Hue(0-360), Saturation(0-100), Lightness(0-100)');
}