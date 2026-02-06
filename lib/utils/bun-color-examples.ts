#!/usr/bin/env bun
/**
 * 🎨 Bun.color() Official API Examples
 *
 * Demonstrates all official Bun.color() formats with advanced HSL utilities
 * Based on official documentation: https://bun.sh/docs/api/color
 */

import { hslToHex, hslToAnsi, parseHSL, formatHSL, generatePalette } from './advanced-hsl-colors';

const RESET = '\x1b[0m';

function printSection(title: string): void {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(80));
}

function main(): void {
  console.log('\n🎨 Bun.color() Official API Examples\n');
  console.log('Demonstrating all formats with advanced HSL utilities\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. CSS Format (Most Compact Representation)
  // ═══════════════════════════════════════════════════════════════
  printSection('1. CSS Format (Most Compact)');

  console.log('\nBun.color("red", "css"):', Bun.color('red', 'css'));
  console.log('Bun.color(0xff0000, "css"):', Bun.color(0xff0000, 'css'));
  console.log('Bun.color("#f00", "css"):', Bun.color('#f00', 'css'));
  console.log('Bun.color("rgb(255, 0, 0)", "css"):', Bun.color('rgb(255, 0, 0)', 'css'));
  console.log('Bun.color("hsl(0, 100%, 50%)", "css"):', Bun.color('hsl(0, 100%, 50%)', 'css'));
  console.log(
    'Bun.color({ r: 255, g: 0, b: 0 }, "css"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'css')
  );
  console.log('Bun.color([255, 0, 0], "css"):', Bun.color([255, 0, 0], 'css'));

  // ═══════════════════════════════════════════════════════════════
  // 2. ANSI Formats (Terminal Colors)
  // ═══════════════════════════════════════════════════════════════
  printSection('2. ANSI Formats (Terminal Colors)');

  const hsl = { h: 210, s: 90, l: 60 };
  const hslStr = formatHSL(hsl);

  console.log(`\nInput: ${hslStr}`);
  console.log(`\nansi (auto-detect): ${Bun.color(hslStr, 'ansi')}███${RESET}`);
  console.log(`ansi-16m (24-bit): ${Bun.color(hslStr, 'ansi-16m')}███${RESET}`);
  console.log(`ansi-256 (256 colors): ${Bun.color(hslStr, 'ansi-256')}███${RESET}`);
  console.log(`ansi-16 (16 colors): ${Bun.color(hslStr, 'ansi-16')}███${RESET}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. Number Format (Database-Friendly)
  // ═══════════════════════════════════════════════════════════════
  printSection('3. Number Format (24-bit)');

  console.log('\nBun.color("red", "number"):', Bun.color('red', 'number'));
  console.log('Bun.color(0xff0000, "number"):', Bun.color(0xff0000, 'number'));
  console.log(
    'Bun.color("hsl(210, 90%, 60%)", "number"):',
    Bun.color('hsl(210, 90%, 60%)', 'number')
  );
  console.log(
    'Bun.color({ r: 255, g: 0, b: 0 }, "number"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'number')
  );
  console.log('Bun.color([255, 0, 0], "number"):', Bun.color([255, 0, 0], 'number'));

  // ═══════════════════════════════════════════════════════════════
  // 4. RGB/RGBA Object Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('4. RGB/RGBA Object Formats');

  const rgbObj = Bun.color('hsl(210, 90%, 60%)', '{rgb}');
  const rgbaObj = Bun.color('hsl(210, 90%, 60%)', '{rgba}');

  console.log('\nBun.color("hsl(210, 90%, 60%)", "{rgb}"):', rgbObj);
  console.log('Bun.color("hsl(210, 90%, 60%)", "{rgba}"):', rgbaObj);
  console.log('\nType check:');
  console.log('  rgbObj is object:', typeof rgbObj === 'object' && rgbObj !== null);
  console.log('  Has r, g, b:', rgbObj && 'r' in rgbObj && 'g' in rgbObj && 'b' in rgbObj);
  console.log('  rgbaObj has alpha:', rgbaObj && 'a' in rgbaObj);

  // ═══════════════════════════════════════════════════════════════
  // 5. RGB/RGBA Array Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('5. RGB/RGBA Array Formats');

  const rgbArr = Bun.color('hsl(210, 90%, 60%)', '[rgb]');
  const rgbaArr = Bun.color('hsl(210, 90%, 60%)', '[rgba]');

  console.log('\nBun.color("hsl(210, 90%, 60%)", "[rgb]"):', rgbArr);
  console.log('Bun.color("hsl(210, 90%, 60%)", "[rgba]"):', rgbaArr);
  console.log('\nType check:');
  console.log('  rgbArr is array:', Array.isArray(rgbArr));
  console.log('  Length:', rgbArr?.length);
  console.log('  rgbaArr length:', rgbaArr?.length);

  // ═══════════════════════════════════════════════════════════════
  // 6. Hex Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('6. Hex Formats');

  console.log('\nBun.color("hsl(210, 90%, 60%)", "hex"):', Bun.color('hsl(210, 90%, 60%)', 'hex'));
  console.log('Bun.color("hsl(210, 90%, 60%)", "HEX"):', Bun.color('hsl(210, 90%, 60%)', 'HEX'));
  console.log(
    'Bun.color({ r: 255, g: 0, b: 0 }, "hex"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'hex')
  );
  console.log('Bun.color([255, 0, 0], "hex"):', Bun.color([255, 0, 0], 'hex'));

  // ═══════════════════════════════════════════════════════════════
  // 7. HSL Format (String)
  // ═══════════════════════════════════════════════════════════════
  printSection('7. HSL Format (String)');

  console.log('\nBun.color("red", "hsl"):', Bun.color('red', 'hsl'));
  console.log('Bun.color(0xff0000, "hsl"):', Bun.color(0xff0000, 'hsl'));
  console.log('Bun.color("#3b82f6", "hsl"):', Bun.color('#3b82f6', 'hsl'));
  console.log(
    'Bun.color({ r: 59, g: 130, b: 246 }, "hsl"):',
    Bun.color({ r: 59, g: 130, b: 246 }, 'hsl')
  );

  // Parse HSL string back to object
  const hslFromBun = Bun.color('#3b82f6', 'hsl');
  if (hslFromBun && typeof hslFromBun === 'string') {
    try {
      const parsed = parseHSL(hslFromBun);
      console.log('\nParsed HSL object:', parsed);
    } catch (e) {
      console.log('\nParse error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. RGB/RGBA String Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('8. RGB/RGBA String Formats');

  console.log('\nBun.color("red", "rgb"):', Bun.color('red', 'rgb'));
  console.log('Bun.color("red", "rgba"):', Bun.color('red', 'rgba'));
  console.log(
    'Bun.color({ r: 255, g: 0, b: 0 }, "rgb"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'rgb')
  );
  console.log(
    'Bun.color({ r: 255, g: 0, b: 0, a: 0.5 }, "rgba"):',
    Bun.color({ r: 255, g: 0, b: 0, a: 0.5 }, 'rgba')
  );

  // ═══════════════════════════════════════════════════════════════
  // 9. Integration with Advanced HSL Utilities
  // ═══════════════════════════════════════════════════════════════
  printSection('9. Integration with Advanced HSL Utilities');

  const baseHSL = { h: 210, s: 90, l: 60 };
  const palette = generatePalette(baseHSL);

  console.log('\nGenerated Palette from HSL:', formatHSL(baseHSL));
  console.log('Primary (hex):', palette.hex);
  console.log('Primary (ansi):', `${palette.ansi}███${RESET}`);

  // Convert palette colors using Bun.color()
  console.log('\nPalette colors in different formats:');
  palette.palette.analogous.slice(0, 2).forEach((hex, i) => {
    console.log(`\nAnalogous ${i + 1} (${hex}):`);
    console.log('  CSS:', Bun.color(hex, 'css'));
    console.log('  RGB:', Bun.color(hex, 'rgb'));
    console.log('  HSL:', Bun.color(hex, 'hsl'));
    console.log('  Number:', Bun.color(hex, 'number'));
    console.log('  ANSI:', `${Bun.color(hex, 'ansi')}███${RESET}`);
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. Flexible Input Examples
  // ═══════════════════════════════════════════════════════════════
  printSection('10. Flexible Input Examples');

  const inputs = [
    'red',
    0xff0000,
    '#f00',
    '#ff0000',
    'rgb(255, 0, 0)',
    'rgba(255, 0, 0, 1)',
    'hsl(0, 100%, 50%)',
    'hsla(0, 100%, 50%, 1)',
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 0, a: 1 },
    [255, 0, 0],
    [255, 0, 0, 255],
  ];

  console.log('\nAll inputs convert to same hex:');
  inputs.forEach((input, i) => {
    const hex = Bun.color(input as any, 'hex');
    const type =
      typeof input === 'object' ? (Array.isArray(input) ? 'array' : 'object') : typeof input;
    console.log(`  ${i + 1}. ${type.padEnd(10)} → ${hex}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n✨ All Bun.color() formats demonstrated!\n');
}

if (import.meta.main) {
  main();
}
