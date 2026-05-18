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
} from '../lib/utils/advanced-hsl-system.ts';
import { colorize } from '../lib/utils/color-system.ts';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'demo') {
  demoAdvancedHSL();
} else if (command === 'palette') {
  const baseHue = parseInt(args[1]) || 210;
  const scheme = (args[2] as 'analogous' | 'complementary' | 'triadic' | 'tetradic') || 'analogous';

  console.info(colorize(`🎨 Harmonious Palette: ${scheme.toUpperCase()}`, 'cyan', true));
  console.info(colorize(`Base Hue: ${baseHue}°`, 'gray'));
  console.info();

  const palette = generateHarmoniousPalette(baseHue, 85, 65, scheme);

  palette.forEach((color, i) => {
    const brightness = perceivedBrightness(baseHue, 85, 65);
    console.info(`${i + 1}. ${colorize(color.hex, 'white')} ${color.hsl}`);
    console.info(`   RGB: ${color.rgb} | Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
  });

} else if (command === 'tints') {
  const baseHue = parseInt(args[1]) || 135;
  const baseSaturation = parseInt(args[2]) || 90;
  const baseLightness = parseInt(args[3]) || 60;

  console.info(colorize('🎨 Tints & Shades Generator', 'magenta', true));
  console.info(colorize(`Base: hsl(${baseHue}, ${baseSaturation}%, ${baseLightness}%)`, 'gray'));
  console.info();

  const { tints, shades } = generateTintsAndShades({ h: baseHue, s: baseSaturation, l: baseLightness });

  console.info(colorize('Tints (lighter):', 'cyan'));
  tints.forEach((tint, i) => {
    console.info(`  ${i + 1}. ${tint}`);
  });

  console.info();
  console.info(colorize('Shades (darker):', 'blue'));
  shades.forEach((shade, i) => {
    console.info(`  ${i + 1}. ${shade}`);
  });

} else if (command === 'status') {
  const status = (args[1] as 'success' | 'warning' | 'error' | 'info') || 'success';
  const severity = (args[2] as 'low' | 'medium' | 'high' | 'critical') || 'medium';

  console.info(colorize('📊 Dynamic Status Colors', 'green', true));
  console.info(colorize(`Status: ${status} | Severity: ${severity}`, 'gray'));
  console.info();

  const hslString = getDynamicStatusColor(status, severity, 'dark');
  const hex = Bun.color(hslString, "hex");
  const brightness = perceivedBrightness(
    parseInt(hslString.match(/hsl\((\d+)/)?.[1] || '0'),
    parseInt(hslString.match(/,\s*(\d+)%/)?.[1] || '0'),
    parseInt(hslString.match(/,\s*(\d+)%\)/)?.[1] || '0')
  );

  console.info(`HSL: ${hslString}`);
  console.info(`Hex: ${hex}`);
  console.info(`Perceived Brightness: ${(brightness * 100).toFixed(1)}%`);
  console.info();

  // Show all severities for this status
  console.info(colorize('All Severities:', 'yellow'));
  ['low', 'medium', 'high', 'critical'].forEach(sev => {
    const sevHsl = getDynamicStatusColor(status, sev as any, 'dark');
    const sevHex = Bun.color(sevHsl, "hex");
    console.info(`  ${sev}: ${sevHex} (${sevHsl})`);
  });

} else if (command === 'contrast') {
  const fgHue = parseInt(args[1]) || 0;
  const fgSat = parseInt(args[2]) || 95;
  const fgLight = parseInt(args[3]) || 65;
  const bgHue = parseInt(args[4]) || 210;
  const bgSat = parseInt(args[5]) || 95;
  const bgLight = parseInt(args[6]) || 10;

  console.info(colorize('♿ Contrast Analysis', 'blue', true));
  console.info(colorize('WCAG Compliance Check', 'gray'));
  console.info();

  const fgHsl = { h: fgHue, s: fgSat, l: fgLight };
  const bgHsl = { h: bgHue, s: bgSat, l: bgLight };

  const result = ensureContrast(fgHsl, bgHsl, 'AA');

  console.info(`Foreground: hsl(${fgHue}, ${fgSat}%, ${fgLight}%)`);
  console.info(`Background: hsl(${bgHue}, ${bgSat}%, ${bgLight}%)`);
  console.info(`Contrast Ratio: ${result.ratio.toFixed(2)}:1`);
  console.info(`WCAG AA Compliant: ${result.compliant ? '✅ YES' : '❌ NO'}`);
  console.info(`WCAG AAA Compliant: ${result.ratio >= 7 ? '✅ YES' : '❌ NO'}`);

} else {
  console.info(colorize('🎨 Advanced HSL Palette Generator', 'cyan', true));
  console.info(colorize('Usage:', 'yellow'));
  console.info('  bun run bun-advanced-palette.ts demo              # Full demo');
  console.info('  bun run bun-advanced-palette.ts palette [hue] [scheme]  # Harmonious palette');
  console.info('  bun run bun-advanced-palette.ts tints [h] [s] [l]      # Tints & shades');
  console.info('  bun run bun-advanced-palette.ts status [status] [severity]  # Status colors');
  console.info('  bun run bun-advanced-palette.ts contrast [fg hsl] [bg hsl]  # Contrast check');
  console.info();
  console.info(colorize('Schemes:', 'magenta'), 'analogous, complementary, triadic, tetradic');
  console.info(colorize('Statuses:', 'magenta'), 'success, warning, error, info');
  console.info(colorize('Severities:', 'magenta'), 'low, medium, high, critical');
  console.info();
  console.info(colorize('Examples:', 'gray'));
  console.info('  bun run bun-advanced-palette.ts palette 210 complementary');
  console.info('  bun run bun-advanced-palette.ts tints 135 90 60');
  console.info('  bun run bun-advanced-palette.ts status error critical');
  console.info('  bun run bun-advanced-palette.ts contrast 0 95 65 210 95 10');
}