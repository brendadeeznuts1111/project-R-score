// lib/utils/color-palette-cli.ts — Color palette generator CLI

import {
  generatePalette,
  generateHarmoniousPalette,
  parseHSL,
  formatHSL,
  hslToHex,
  hslToAnsi,
  checkContrast,
  HSL_SWEET_SPOTS,
} from './advanced-hsl-colors';

const RESET = '\x1b[0m';

function printColorSwatch(hsl: { h: number; s: number; l: number }, label: string): void {
  const hex = hslToHex(hsl);
  const ansi = hslToAnsi(hsl);
  const css = formatHSL(hsl);

  console.log(`  ${ansi}███${RESET} ${label.padEnd(20)} ${hex.padEnd(8)} ${css}`);
}

function printPalette(palette: ReturnType<typeof generatePalette>): void {
  console.log('\n🎨 Generated Color Palette\n');
  console.log('═'.repeat(80));

  console.log('\n📌 Base Color:');
  printColorSwatch(palette.base, 'Primary');

  if (palette.palette.analogous.length > 0) {
    console.log('\n🎯 Analogous Colors (±30°):');
    palette.palette.analogous.forEach((hex, i) => {
      try {
        const hslStr = Bun.color(hex, 'hsl');
        if (hslStr && typeof hslStr === 'string') {
          const hsl = parseHSL(hslStr);
          printColorSwatch(hsl, `Analogous ${i + 1}`);
        } else {
          console.log(`  ${hex}`);
        }
      } catch {
        console.log(`  ${hex}`);
      }
    });
  }

  if (palette.palette.complementary) {
    console.log('\n🔄 Complementary Color (180°):');
    try {
      const hslStr = Bun.color(palette.palette.complementary, 'hsl');
      if (hslStr && typeof hslStr === 'string') {
        const hsl = parseHSL(hslStr);
        printColorSwatch(hsl, 'Complementary');
      } else {
        console.log(`  ${palette.palette.complementary}`);
      }
    } catch {
      console.log(`  ${palette.palette.complementary}`);
    }
  }

  if (palette.palette.triadic.length > 0) {
    console.log('\n🔺 Triadic Colors (120° apart):');
    palette.palette.triadic.forEach((hex, i) => {
      try {
        const hslStr = Bun.color(hex, 'hsl');
        if (hslStr && typeof hslStr === 'string') {
          const hsl = parseHSL(hslStr);
          printColorSwatch(hsl, `Triadic ${i + 1}`);
        } else {
          console.log(`  ${hex}`);
        }
      } catch {
        console.log(`  ${hex}`);
      }
    });
  }

  if (palette.palette.tints.length > 0) {
    console.log('\n✨ Tints (Lighter):');
    palette.palette.tints.forEach((hex, i) => {
      try {
        const hslStr = Bun.color(hex, 'hsl');
        if (hslStr && typeof hslStr === 'string') {
          const hsl = parseHSL(hslStr);
          printColorSwatch(hsl, `Tint ${i + 1}`);
        } else {
          console.log(`  ${hex}`);
        }
      } catch {
        console.log(`  ${hex}`);
      }
    });
  }

  if (palette.palette.shades.length > 0) {
    console.log('\n🌑 Shades (Darker):');
    palette.palette.shades.forEach((hex, i) => {
      try {
        const hslStr = Bun.color(hex, 'hsl');
        if (hslStr && typeof hslStr === 'string') {
          const hsl = parseHSL(hslStr);
          printColorSwatch(hsl, `Shade ${i + 1}`);
        } else {
          console.log(`  ${hex}`);
        }
      } catch {
        console.log(`  ${hex}`);
      }
    });
  }

  console.log('\n♿ Accessibility:');
  const contrast = checkContrast(palette.accessible.foreground, palette.accessible.background);
  const statusColor = contrast.wcagAAA ? 'success' : contrast.wcagAA ? 'warning' : 'error';
  const statusEmoji = contrast.wcagAAA ? '✅' : contrast.wcagAA ? '⚠️' : '❌';

  console.log(`  ${statusEmoji} Contrast Ratio: ${contrast.ratio.toFixed(2)}:1`);
  console.log(`  WCAG AA: ${contrast.wcagAA ? '✅' : '❌'} (≥4.5:1)`);
  console.log(`  WCAG AAA: ${contrast.wcagAAA ? '✅' : '❌'} (≥7:1)`);

  console.log('\n  Accessible Foreground:');
  printColorSwatch(palette.accessible.foreground, 'Foreground');
  printColorSwatch(palette.accessible.background, 'Background');

  console.log('\n' + '═'.repeat(80));
}

function printSweetSpots(): void {
  console.log('\n📊 HSL Sweet Spots (Maximum Visual Impact)\n');
  console.log('═'.repeat(80));

  Object.entries(HSL_SWEET_SPOTS).forEach(([name, ranges]) => {
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Hue: ${ranges.h[0]}° - ${ranges.h[1]}°`);
    console.log(`  Saturation: ${ranges.s[0]}% - ${ranges.s[1]}%`);
    console.log(`  Lightness: ${ranges.l[0]}% - ${ranges.l[1]}%`);

    // Show example
    const exampleH = Math.floor((ranges.h[0] + ranges.h[1]) / 2);
    const exampleS = Math.floor((ranges.s[0] + ranges.s[1]) / 2);
    const exampleL = Math.floor((ranges.l[0] + ranges.l[1]) / 2);
    const exampleHSL = { h: exampleH, s: exampleS, l: exampleL };
    printColorSwatch(exampleHSL, 'Example');
  });

  console.log('\n' + '═'.repeat(80));
}

function main(): void {
  const args = process.argv.slice(2);

  // Parse arguments
  let baseColor: string | { h: number; s: number; l: number } | null = null;
  let showSweetSpots = false;
  let harmonies = true;
  let tints = true;
  let shades = true;

  for (const arg of args) {
    if (arg === '--sweet-spots' || arg === '-s') {
      showSweetSpots = true;
    } else if (arg.startsWith('--hue=')) {
      const h = parseInt(arg.split('=')[1], 10);
      const s = args.find(a => a.startsWith('--saturation='))?.split('=')[1] || '85';
      const l = args.find(a => a.startsWith('--lightness='))?.split('=')[1] || '65';
      baseColor = { h, s: parseInt(s, 10), l: parseInt(l, 10) };
    } else if (arg.startsWith('--color=') || arg.startsWith('--base=')) {
      baseColor = arg.split('=')[1];
    } else if (arg === '--no-harmonies') {
      harmonies = false;
    } else if (arg === '--no-tints') {
      tints = false;
    } else if (arg === '--no-shades') {
      shades = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
🎨 Color Palette Generator

Usage:
  bun run color-palette --hue=210 --saturation=85 --lightness=65
  bun run color-palette --color="#3b82f6"
  bun run color-palette --base="hsl(210, 85%, 65%)"
  bun run color-palette --sweet-spots

Options:
  --hue=<0-360>           Base hue (0-360)
  --saturation=<0-100>    Saturation percentage
  --lightness=<0-100>      Lightness percentage
  --color=<hex>           Base color as hex (#3b82f6)
  --base=<hsl>            Base color as HSL (hsl(210, 85%, 65%))
  --sweet-spots, -s       Show HSL sweet spots reference
  --no-harmonies          Skip harmonious colors
  --no-tints              Skip lighter tints
  --no-shades             Skip darker shades
  --help, -h              Show this help
`);
      process.exit(0);
    }
  }

  if (showSweetSpots) {
    printSweetSpots();
    return;
  }

  if (!baseColor) {
    // Default: FactoryWager blue
    baseColor = { h: 210, s: 90, l: 60 };
  }

  try {
    const palette = generatePalette(baseColor, {
      includeHarmonies: harmonies,
      includeTints: tints,
      includeShades: shades,
    });

    printPalette(palette);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
