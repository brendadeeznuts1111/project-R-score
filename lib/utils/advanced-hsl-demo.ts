// lib/utils/advanced-hsl-demo.ts — Advanced HSL color theory demo

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
} from './advanced-hsl-colors';

const RESET = '\x1b[0m';

function printSection(title: string): void {
  console.info(`\n${'═'.repeat(80)}`);
  console.info(`  ${title}`);
  console.info('═'.repeat(80));
}

function printColor(hsl: { h: number; s: number; l: number }, label: string): void {
  const hex = Bun.color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hex');
  const ansi = Bun.color(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'ansi');
  console.info(
    `  ${ansi}███${RESET} ${label.padEnd(25)} ${hex} hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  );
}

function main(): void {
  console.info('\n🎨 Advanced HSL Color Theory Demo\n');
  console.info('Demonstrating perceptually-aware color manipulation with Bun.color()\n');

  // 1. Harmonious Palettes
  printSection('1. Harmonious Palettes via Hue Offsets');
  const baseHue = 210; // Blue
  console.info(`\nBase Hue: ${baseHue}° (Blue)`);

  const palette = generateHarmoniousPalette(baseHue, 85, 65);
  console.info('\nPrimary:', palette.primary);
  console.info('Analogous (±30°):', palette.analogous.join(', '));
  console.info('Complementary (180°):', palette.complementary);
  console.info('Triadic (120° apart):', palette.triadic.join(', '));
  console.info('\nTints (5 steps):', palette.tints.slice(0, 3).join(', '), '...');
  console.info('Shades (5 steps):', palette.shades.slice(0, 3).join(', '), '...');

  // 2. Status Colors with Perceptual Adjustment
  printSection('2. Dynamic Status Coloring (Perceptual Adjustment)');
  const statuses: Array<'success' | 'warning' | 'error' | 'info'> = [
    'success',
    'warning',
    'error',
    'info',
  ];

  statuses.forEach(status => {
    const hsl = getStatusColor(status, 65, 'medium');
    const ansi = getStatusAnsi(status, 65, 'medium');
    console.info(`\n${status.toUpperCase()}:`);
    printColor(hsl, `Base (H: ${STATUS_HUES[status]}°)`);

    // Show severity variants
    ['low', 'medium', 'high'].forEach(severity => {
      const variant = getStatusColor(status, 65, severity as any);
      printColor(variant, `  ${severity} severity`);
    });
  });

  // 3. Perceptual Brightness Compensation
  printSection('3. Perceptual Brightness Adjustment (HSL Non-Uniformity)');
  const testColors = [
    { h: 0, s: 100, l: 50 }, // Pure red at 50%
    { h: 0, s: 100, l: 25 }, // Dark red (should look muted)
    { h: 0, s: 100, l: 75 }, // Light red (should look muted)
  ];

  testColors.forEach(color => {
    const brightness = perceivedBrightness(color);
    const adjusted = adjustToPerceivedBrightness(color, 0.5); // Target 50% brightness
    console.info(`\nOriginal:`);
    printColor(color, `L=${color.l}%`);
    console.info(`  Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
    console.info(`\nAdjusted (target 50%):`);
    printColor(adjusted, `L=${adjusted.l}%`);
    console.info(`  Perceived Brightness: ${(perceivedBrightness(adjusted) * 100).toFixed(1)}%`);
  });

  // 4. Accessibility Contrast Checking
  printSection('4. WCAG Accessibility Contrast Checking');
  const foreground = { h: 0, s: 100, l: 50 }; // Red
  const background = { h: 0, s: 0, l: 95 }; // Light gray

  const contrast = checkContrast(foreground, background);
  console.info('\nForeground:');
  printColor(foreground, 'Red text');
  console.info('\nBackground:');
  printColor(background, 'Light gray');
  console.info(`\nContrast Ratio: ${contrast.ratio.toFixed(2)}:1`);
  console.info(`WCAG AA: ${contrast.wcagAA ? '✅ Pass' : '❌ Fail'} (≥4.5:1)`);
  console.info(`WCAG AAA: ${contrast.wcagAAA ? '✅ Pass' : '❌ Fail'} (≥7:1)`);

  // Find accessible foreground
  const accessible = findAccessibleForeground(background, 0);
  const accessibleContrast = checkContrast(accessible, background);
  console.info('\nAccessible Foreground (for red hue):');
  printColor(accessible, 'Found');
  console.info(`Contrast Ratio: ${accessibleContrast.ratio.toFixed(2)}:1`);

  // 5. HSL Sweet Spots
  printSection('5. HSL Sweet Spots (Maximum Visual Impact)');
  Object.entries(HSL_SWEET_SPOTS).forEach(([name, ranges]) => {
    const exampleH = Math.floor((ranges.h[0] + ranges.h[1]) / 2);
    const exampleS = Math.floor((ranges.s[0] + ranges.s[1]) / 2);
    const exampleL = Math.floor((ranges.l[0] + ranges.l[1]) / 2);
    const exampleHSL = { h: exampleH, s: exampleS, l: exampleL };

    console.info(`\n${name.toUpperCase()}:`);
    console.info(
      `  Range: H ${ranges.h[0]}-${ranges.h[1]}°, S ${ranges.s[0]}-${ranges.s[1]}%, L ${ranges.l[0]}-${ranges.l[1]}%`
    );
    printColor(exampleHSL, 'Example');
  });

  // 6. OKLCH Conversion (Perceptually Uniform)
  printSection('6. OKLCH Conversion (Perceptually Uniform)');
  const hslColor = { h: 210, s: 90, l: 60 };
  const oklch = hslToOKLCH(hslColor);
  const backToHSL = oklchToHSL(oklch);

  console.info('\nHSL → OKLCH → HSL:');
  printColor(hslColor, 'Original HSL');
  console.info(
    `  OKLCH: L=${(oklch.l * 100).toFixed(1)}%, C=${(oklch.c * 100).toFixed(1)}%, H=${oklch.h.toFixed(1)}°`
  );
  printColor(backToHSL, 'Converted back');

  // 7. Complete Palette Generation
  printSection('7. Complete Palette Generation');
  const completePalette = generatePalette({ h: 210, s: 90, l: 60 });
  console.info('\nBase Color:');
  printColor(completePalette.base, 'Primary');
  console.info('\nAccessibility:');
  console.info(
    `  Foreground: ${Bun.color(`hsl(${completePalette.accessible.foreground.h}, ${completePalette.accessible.foreground.s}%, ${completePalette.accessible.foreground.l}%)`, 'hex')}`
  );
  console.info(
    `  Background: ${Bun.color(`hsl(${completePalette.accessible.background.h}, ${completePalette.accessible.background.s}%, ${completePalette.accessible.background.l}%)`, 'hex')}`
  );
  console.info(`  Contrast Ratio: ${completePalette.accessible.ratio.toFixed(2)}:1`);

  console.info('\n' + '═'.repeat(80));
  console.info('\n✨ Demo complete! Ready to go vivid? 🎨🚀\n');
}

if (import.meta.main) {
  main();
}
