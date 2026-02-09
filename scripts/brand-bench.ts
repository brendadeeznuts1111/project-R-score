import { generatePalette } from '../lib/utils/advanced-hsl-colors';

function bench(name: string, fn: () => void, n: number): { name: string; opsPerSec: number; ms: number } {
  const warmup = Math.min(20_000, Math.floor(n / 10));
  for (let i = 0; i < warmup; i++) fn();
  const start = Bun.nanoseconds();
  for (let i = 0; i < n; i++) fn();
  const end = Bun.nanoseconds();
  const ms = Number(end - start) / 1e6;
  const opsPerSec = n / (ms / 1000);
  return { name, opsPerSec, ms };
}

function print(result: { name: string; opsPerSec: number; ms: number }): void {
  console.log(`${result.name}: ${result.opsPerSec.toFixed(0)} ops/sec (${result.ms.toFixed(1)} ms)`);
}

function main(): void {
  const seed = 210;
  const hsl = `hsl(${seed}, 90%, 60%)`;
  const md = `# Brand Seed ${seed}\n\n- primary\n- contrast\n\nUse deterministic defaults.`;

  const results = [
    bench('brand.generatePalette', () => {
      generatePalette({ h: seed, s: 90, l: 60 });
    }, 200_000),
    bench('brand.Bun.color(hex)', () => {
      Bun.color(hsl, 'hex');
    }, 400_000),
    bench('brand.Bun.color(ansi)', () => {
      Bun.color(hsl, 'ansi');
    }, 400_000),
    bench('brand.Bun.markdown.render', () => {
      Bun.markdown.render(md);
    }, 120_000),
    bench('brand.Bun.markdown.react', () => {
      Bun.markdown.react(md);
    }, 120_000),
  ];

  for (const r of results) print(r);

  const best = results.reduce((a, b) => (a.opsPerSec > b.opsPerSec ? a : b));
  console.log(`best: ${best.name}`);
}

if (import.meta.main) {
  main();
}
