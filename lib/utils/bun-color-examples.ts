// @see https://bun.com/docs/runtime/color — Bun.color
// lib/utils/bun-color-examples.ts — Bun.color() API examples

import { hslToHex, hslToAnsi, parseHSL, formatHSL, generatePalette } from './advanced-hsl-colors';

const RESET = '\x1b[0m';

function printSection(title: string): void {
  console.info(`\n${'═'.repeat(80)}`);
  console.info(`  ${title}`);
  console.info('═'.repeat(80));
}

function main(): void {
  console.info('\n🎨 Bun.color() Official API Examples\n');
  console.info('Demonstrating all formats with advanced HSL utilities\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. CSS Format (Most Compact Representation)
  // ═══════════════════════════════════════════════════════════════
  printSection('1. CSS Format (Most Compact)');

  console.info('\nBun.color("red", "css"):', Bun.color('red', 'css'));
  console.info('Bun.color(0xff0000, "css"):', Bun.color(0xff0000, 'css'));
  console.info('Bun.color("#f00", "css"):', Bun.color('#f00', 'css'));
  console.info('Bun.color("rgb(255, 0, 0)", "css"):', Bun.color('rgb(255, 0, 0)', 'css'));
  console.info('Bun.color("hsl(0, 100%, 50%)", "css"):', Bun.color('hsl(0, 100%, 50%)', 'css'));
  console.info(
    'Bun.color({ r: 255, g: 0, b: 0 }, "css"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'css')
  );
  console.info('Bun.color([255, 0, 0], "css"):', Bun.color([255, 0, 0], 'css'));

  // ═══════════════════════════════════════════════════════════════
  // 2. ANSI Formats (Terminal Colors)
  // ═══════════════════════════════════════════════════════════════
  printSection('2. ANSI Formats (Terminal Colors)');

  const hsl = { h: 210, s: 90, l: 60 };
  const hslStr = formatHSL(hsl);

  console.info(`\nInput: ${hslStr}`);
  console.info(`\nansi (auto-detect): ${Bun.color(hslStr, 'ansi')}███${RESET}`);
  console.info(`ansi-16m (24-bit): ${Bun.color(hslStr, 'ansi-16m')}███${RESET}`);
  console.info(`ansi-256 (256 colors): ${Bun.color(hslStr, 'ansi-256')}███${RESET}`);
  console.info(`ansi-16 (16 colors): ${Bun.color(hslStr, 'ansi-16')}███${RESET}`);

  // ═══════════════════════════════════════════════════════════════
  // 3. Number Format (Database-Friendly)
  // ═══════════════════════════════════════════════════════════════
  printSection('3. Number Format (24-bit)');

  console.info('\nBun.color("red", "number"):', Bun.color('red', 'number'));
  console.info('Bun.color(0xff0000, "number"):', Bun.color(0xff0000, 'number'));
  console.info(
    'Bun.color("hsl(210, 90%, 60%)", "number"):',
    Bun.color('hsl(210, 90%, 60%)', 'number')
  );
  console.info(
    'Bun.color({ r: 255, g: 0, b: 0 }, "number"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'number')
  );
  console.info('Bun.color([255, 0, 0], "number"):', Bun.color([255, 0, 0], 'number'));

  // ═══════════════════════════════════════════════════════════════
  // 4. RGB/RGBA Object Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('4. RGB/RGBA Object Formats');

  const rgbObj = Bun.color('hsl(210, 90%, 60%)', '{rgb}');
  const rgbaObj = Bun.color('hsl(210, 90%, 60%)', '{rgba}');

  console.info('\nBun.color("hsl(210, 90%, 60%)", "{rgb}"):', rgbObj);
  console.info('Bun.color("hsl(210, 90%, 60%)", "{rgba}"):', rgbaObj);
  console.info('\nType check:');
  console.info('  rgbObj is object:', typeof rgbObj === 'object' && rgbObj !== null);
  console.info('  Has r, g, b:', rgbObj && 'r' in rgbObj && 'g' in rgbObj && 'b' in rgbObj);
  console.info('  rgbaObj has alpha:', rgbaObj && 'a' in rgbaObj);

  // ═══════════════════════════════════════════════════════════════
  // 5. RGB/RGBA Array Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('5. RGB/RGBA Array Formats');

  const rgbArr = Bun.color('hsl(210, 90%, 60%)', '[rgb]');
  const rgbaArr = Bun.color('hsl(210, 90%, 60%)', '[rgba]');

  console.info('\nBun.color("hsl(210, 90%, 60%)", "[rgb]"):', rgbArr);
  console.info('Bun.color("hsl(210, 90%, 60%)", "[rgba]"):', rgbaArr);
  console.info('\nType check:');
  console.info('  rgbArr is array:', Array.isArray(rgbArr));
  console.info('  Length:', rgbArr?.length);
  console.info('  rgbaArr length:', rgbaArr?.length);

  // ═══════════════════════════════════════════════════════════════
  // 6. Hex Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('6. Hex Formats');

  console.info('\nBun.color("hsl(210, 90%, 60%)", "hex"):', Bun.color('hsl(210, 90%, 60%)', 'hex'));
  console.info('Bun.color("hsl(210, 90%, 60%)", "HEX"):', Bun.color('hsl(210, 90%, 60%)', 'HEX'));
  console.info(
    'Bun.color({ r: 255, g: 0, b: 0 }, "hex"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'hex')
  );
  console.info('Bun.color([255, 0, 0], "hex"):', Bun.color([255, 0, 0], 'hex'));

  // ═══════════════════════════════════════════════════════════════
  // 7. HSL Format (String)
  // ═══════════════════════════════════════════════════════════════
  printSection('7. HSL Format (String)');

  console.info('\nBun.color("red", "hsl"):', Bun.color('red', 'hsl'));
  console.info('Bun.color(0xff0000, "hsl"):', Bun.color(0xff0000, 'hsl'));
  console.info('Bun.color("#3b82f6", "hsl"):', Bun.color('#3b82f6', 'hsl'));
  console.info(
    'Bun.color({ r: 59, g: 130, b: 246 }, "hsl"):',
    Bun.color({ r: 59, g: 130, b: 246 }, 'hsl')
  );

  // Parse HSL string back to object
  const hslFromBun = Bun.color('#3b82f6', 'hsl');
  if (hslFromBun && typeof hslFromBun === 'string') {
    try {
      const parsed = parseHSL(hslFromBun);
      console.info('\nParsed HSL object:', parsed);
    } catch (e) {
      console.info('\nParse error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. RGB/RGBA String Formats
  // ═══════════════════════════════════════════════════════════════
  printSection('8. RGB/RGBA String Formats');

  console.info('\nBun.color("red", "rgb"):', Bun.color('red', 'rgb'));
  console.info('Bun.color("red", "rgba"):', Bun.color('red', 'rgba'));
  console.info(
    'Bun.color({ r: 255, g: 0, b: 0 }, "rgb"):',
    Bun.color({ r: 255, g: 0, b: 0 }, 'rgb')
  );
  console.info(
    'Bun.color({ r: 255, g: 0, b: 0, a: 0.5 }, "rgba"):',
    Bun.color({ r: 255, g: 0, b: 0, a: 0.5 }, 'rgba')
  );

  // ═══════════════════════════════════════════════════════════════
  // 9. Integration with Advanced HSL Utilities
  // ═══════════════════════════════════════════════════════════════
  printSection('9. Integration with Advanced HSL Utilities');

  const baseHSL = { h: 210, s: 90, l: 60 };
  const palette = generatePalette(baseHSL);

  console.info('\nGenerated Palette from HSL:', formatHSL(baseHSL));
  console.info('Primary (hex):', palette.hex);
  console.info('Primary (ansi):', `${palette.ansi}███${RESET}`);

  // Convert palette colors using Bun.color()
  console.info('\nPalette colors in different formats:');
  palette.palette.analogous.slice(0, 2).forEach((hex, i) => {
    console.info(`\nAnalogous ${i + 1} (${hex}):`);
    console.info('  CSS:', Bun.color(hex, 'css'));
    console.info('  RGB:', Bun.color(hex, 'rgb'));
    console.info('  HSL:', Bun.color(hex, 'hsl'));
    console.info('  Number:', Bun.color(hex, 'number'));
    console.info('  ANSI:', `${Bun.color(hex, 'ansi')}███${RESET}`);
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

  console.info('\nAll inputs convert to same hex:');
  inputs.forEach((input, i) => {
    const hex = Bun.color(input as any, 'hex');
    const type =
      typeof input === 'object' ? (Array.isArray(input) ? 'array' : 'object') : typeof input;
    console.info(`  ${i + 1}. ${type.padEnd(10)} → ${hex}`);
  });

  console.info('\n' + '═'.repeat(80));
  console.info('\n✨ All Bun.color() formats demonstrated!\n');
}

if (import.meta.main) {
  main();
}
