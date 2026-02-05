#!/usr/bin/env bun

/**
 * 🎨 Advanced HSL Palette Generator & Color Theory Demo
 *
 * Interactive palette generator using advanced HSL techniques
 * for perceptually uniform, harmonious color schemes.
 */

import {
  generateHarmoniousPalette,
  generateTintsAndShades,
  getDynamicStatusColor,
  perceivedBrightness,
  ensureContrast,
  demoAdvancedHSL
} from './lib/utils/advanced-hsl-system.ts';
import { colorize } from './lib/utils/color-system.ts';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'demo') {
  demoAdvancedHSL();
} else if (command === 'palette') {
  const baseHue = parseInt(args[1]) || 210;
  const scheme = (args[2] as 'analogous' | 'complementary' | 'triadic' | 'tetradic') || 'analogous';

  console.log(colorize(`🎨 Harmonious Palette: ${scheme.toUpperCase()}`, 'cyan', true));
  console.log(colorize(`Base Hue: ${baseHue}°`, 'gray'));
  console.log();

  const palette = generateHarmoniousPalette(baseHue, 85, 65, scheme);

  palette.forEach((color, i) => {
    const brightness = perceivedBrightness(baseHue, 85, 65);
    console.log(`${i + 1}. ${colorize(color.hex, 'white')} ${color.hsl}`);
    console.log(`   RGB: ${color.rgb} | Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
  });

} else if (command === 'tints') {
  const baseHue = parseInt(args[1]) || 135;
  const baseSaturation = parseInt(args[2]) || 90;
  const baseLightness = parseInt(args[3]) || 60;

  console.log(colorize('🎨 Tints & Shades Generator', 'magenta', true));
  console.log(colorize(`Base: hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`, 'gray'));
  console.log();

  const { tints, shades } = generateTintsAndShades({ h: baseHue, s: baseSaturation, l: baseLightness });

  console.log(colorize('Tints (lighter):', 'cyan'));
  tints.forEach((tint, i) => {
    console.log(`  ${i + 1}. ${tint}`);
  });

  console.log();
  console.log(colorize('Shades (darker):', 'blue'));
  shades.forEach((shade, i) => {
    console.log(`  ${i + 1}. ${shade}`);
  });

} else if (command === 'status') {
  const status = (args[1] as 'success' | 'warning' | 'error' | 'info') || 'success';
  const severity = (args[2] as 'low' | 'medium' | 'high' | 'critical') || 'medium';

  console.log(colorize('📊 Dynamic Status Colors', 'green', true));
  console.log(colorize(`Status: ${status} | Severity: ${severity}`, 'gray'));
  console.log();

  const hslString = getDynamicStatusColor(status, severity, 'dark');
  const hex = Bun.color(hslString, "hex");
  const brightness = perceivedBrightness(
    parseInt(hslString.match(/hsl\((\d+)/)?.[1] || '0'),
    parseInt(hslString.match(/,\s*(\d+)%/)?.[1] || '0'),
    parseInt(hslString.match(/,\s*(\d+)%\)/)?.[1] || '0')
  );

  console.log(`HSL: ${hslString}`);
  console.log(`Hex: ${hex}`);
  console.log(`Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
  console.log();

  // Show all severities for this status
  console.log(colorize('All Severities:', 'yellow'));
  ['low', 'medium', 'high', 'critical'].forEach(sev => {
    const sevHsl = getDynamicStatusColor(status, sev as any, 'dark');
    const sevHex = Bun.color(sevHsl, "hex");
    console.log(`  ${sev}: ${sevHex} (${sevHsl})`);
  });

} else if (command === 'contrast') {
  const fgHue = parseInt(args[1]) || 0;
  const fgSat = parseInt(args[2]) || 95;
  const fgLight = parseInt(args[3]) || 65;
  const bgHue = parseInt(args[4]) || 210;
  const bgSat = parseInt(args[5]) || 95;
  const bgLight = parseInt(args[6]) || 10;

  console.log(colorize('♿ Contrast Analysis', 'blue', true));
  console.log(colorize('WCAG Compliance Check', 'gray'));
  console.log();

  const fgHsl = { h: fgHue, s: fgSat, l: fgLight };
  const bgHsl = { h: bgHue, s: bgSat, l: bgLight };

  const result = ensureContrast(fgHsl, bgHsl, 'AA');

  console.log(`Foreground: hsl(${fgHue}, ${fgSat}%, ${fgLight}%)`);
  console.log(`Background: hsl(${bgHue}, ${bgSat}%, ${bgLight}%)`);
  console.log(`Contrast Ratio: ${result.ratio.toFixed(2)}:1`);
  console.log(`WCAG AA Compliant: ${result.compliant ? '✅ YES' : '❌ NO'}`);
  console.log(`WCAG AAA Compliant: ${result.ratio >= 7 ? '✅ YES' : '❌ NO'}`);

} else {
  console.log(colorize('🎨 Advanced HSL Palette Generator', 'cyan', true));
  console.log(colorize('Usage:', 'yellow'));
  console.log('  bun run bun-advanced-palette.ts demo              # Full demo');
  console.log('  bun run bun-advanced-palette.ts palette [hue] [scheme]  # Harmonious palette');
  console.log('  bun run bun-advanced-palette.ts tints [h] [s] [l]      # Tints & shades');
  console.log('  bun run bun-advanced-palette.ts status [status] [severity]  # Status colors');
  console.log('  bun run bun-advanced-palette.ts contrast [fg hsl] [bg hsl]  # Contrast check');
  console.log();
  console.log(colorize('Schemes:', 'magenta'), 'analogous, complementary, triadic, tetradic');
  console.log(colorize('Statuses:', 'magenta'), 'success, warning, error, info');
  console.log(colorize('Severities:', 'magenta'), 'low, medium, high, critical');
  console.log();
  console.log(colorize('Examples:', 'gray'));
  console.log('  bun run bun-advanced-palette.ts palette 210 complementary');
  console.log('  bun run bun-advanced-palette.ts tints 135 90 60');
  console.log('  bun run bun-advanced-palette.ts status error critical');
  console.log('  bun run bun-advanced-palette.ts contrast 0 95 65 210 95 10');
}