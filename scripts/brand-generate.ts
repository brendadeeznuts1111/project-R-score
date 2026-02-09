import { generatePalette } from '../lib/utils/advanced-hsl-colors';

type OutputFormat = 'json' | 'css';

function parseArgs(argv: string[]): { seed: number; saturation: number; lightness: number; format: OutputFormat } {
  let seed = 210;
  let saturation = 90;
  let lightness = 60;
  let format: OutputFormat = 'json';

  for (const arg of argv) {
    if (arg.startsWith('--seed=')) {
      seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--saturation=')) {
      saturation = Number(arg.slice('--saturation='.length));
    } else if (arg.startsWith('--lightness=')) {
      lightness = Number(arg.slice('--lightness='.length));
    } else if (arg.startsWith('--format=')) {
      const next = arg.slice('--format='.length);
      if (next === 'json' || next === 'css') format = next;
    }
  }

  if (!Number.isFinite(seed) || seed < 0 || seed > 360) {
    throw new Error('seed must be a number between 0 and 360');
  }
  if (!Number.isFinite(saturation) || saturation < 0 || saturation > 100) {
    throw new Error('saturation must be a number between 0 and 100');
  }
  if (!Number.isFinite(lightness) || lightness < 0 || lightness > 100) {
    throw new Error('lightness must be a number between 0 and 100');
  }

  return { seed, saturation, lightness, format };
}

function toCssVars(palette: ReturnType<typeof generatePalette>, seed: number): string {
  const rows = [
    `--brand-seed: ${seed};`,
    `--brand-primary: ${palette.palette.primary};`,
    `--brand-analogous-1: ${palette.palette.analogous[0] ?? palette.palette.primary};`,
    `--brand-analogous-2: ${palette.palette.analogous[1] ?? palette.palette.primary};`,
    `--brand-complementary: ${palette.palette.complementary};`,
    `--brand-triadic-1: ${palette.palette.triadic[0] ?? palette.palette.primary};`,
    `--brand-triadic-2: ${palette.palette.triadic[1] ?? palette.palette.primary};`,
    `--brand-bg: ${Bun.color(`hsl(${seed}, 10%, 95%)`, 'hex')};`,
    `--brand-fg: ${palette.accessible.foreground ? Bun.color(`hsl(${palette.accessible.foreground.h}, ${palette.accessible.foreground.s}%, ${palette.accessible.foreground.l}%)`, 'hex') : '#000000'};`,
  ];

  return [':root {', ...rows.map(r => `  ${r}`), '}'].join('\n');
}

function main(): void {
  const { seed, saturation, lightness, format } = parseArgs(process.argv.slice(2));
  const palette = generatePalette({ h: seed, s: saturation, l: lightness });

  if (format === 'css') {
    console.log(toCssVars(palette, seed));
    return;
  }

  console.log(
    JSON.stringify(
      {
        seed,
        base: { h: seed, s: saturation, l: lightness },
        primary: palette.palette.primary,
        palette: palette.palette,
        accessibleContrast: Number(palette.accessible.ratio.toFixed(2)),
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main();
}
