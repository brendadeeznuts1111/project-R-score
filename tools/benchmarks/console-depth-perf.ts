// benchmarks/console-depth-perf.ts — Bun-native vs naive JS width/truncate
//
// Validates the performance premise of lib/console-depth.ts: Bun.stringWidth
// (SIMD, native) and Bun.sliceAnsi vs the naive JS approaches they replace.
// Scaled cases mirror Bun's official stringWidth benchmark so numbers diff
// directly: https://bun.com/docs/runtime/utils#bun-stringwidth

console.info('🚀 Console Depth Performance Benchmarks\n');
console.info('Bun v' + Bun.version + '\n');

const ITERATIONS = 100_000;
const ascii = 'hello world this is a typical log line with some text';
const ansiLine = '\x1b[31merror\x1b[0m: request \x1b[1mfailed\x1b[0m for \x1b[36muser@example.com\x1b[0m';
const unicodeLine = 'status: ✅ deployed 한국어 世界 😀🔥 to prod';

// Size-scaled inputs matching Bun's published benchmark sizes
const SCALES = [5, 50, 500, 5_000, 25_000] as const;
const scaledAscii = SCALES.map(n => 'a'.repeat(n));
const scaledAnsiEmoji = SCALES.map(n => {
  const body = '\x1b[31m' + 'a😀'.repeat(Math.ceil(n / 3)) + '\x1b[0m';
  return body.slice(0, n);
});

function bench(name: string, fn: () => void, iterations = ITERATIONS): number {
  fn(); // warmup
  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const ns = Bun.nanoseconds() - start;
  const nsPerIter = ns / iterations;
  const display =
    nsPerIter < 1_000 ? `${nsPerIter.toFixed(1)} ns/iter` : `${(nsPerIter / 1_000).toFixed(2)} µs/iter`;
  console.info(`  ${name.padEnd(48)} ${display.padStart(12)}`);
  return nsPerIter;
}

// Naive JS width: strip ANSI with regex, count code points (wrong for wide
// chars/graphemes — included as the baseline Bun.stringWidth replaces)
const ANSI_RE = /\x1b\[[^m]*m/g;
function naiveWidth(s: string): number {
  return [...s.replace(ANSI_RE, '')].length;
}

function naiveTruncate(s: string, n: number): string {
  return s.slice(0, n);
}

console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Bun.stringWidth — size scaling (diff vs official bench)');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
for (let i = 0; i < SCALES.length; i++) {
  bench(`${SCALES[i].toLocaleString()} chars ascii`, () => void Bun.stringWidth(scaledAscii[i]));
}
for (let i = 0; i < SCALES.length; i++) {
  bench(`${SCALES[i].toLocaleString()} chars ansi+emoji`, () =>
    void Bun.stringWidth(scaledAnsiEmoji[i])
  );
}

console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Width measurement — naive JS vs Bun native');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
bench('naive ASCII (regex strip + code points)', () => void naiveWidth(ascii));
bench('Bun.stringWidth ASCII (native SIMD)', () => void Bun.stringWidth(ascii));
bench('naive ANSI (regex strip + code points)', () => void naiveWidth(ansiLine));
bench('Bun.stringWidth ANSI (native, ANSI-aware)', () => void Bun.stringWidth(ansiLine));
bench('naive unicode (regex strip + code points)', () => void naiveWidth(unicodeLine));
bench('Bun.stringWidth unicode (grapheme-aware)', () => void Bun.stringWidth(unicodeLine));

console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Truncate to 20 cols (ANSI-colored line)');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
bench('naive string.slice (breaks ANSI/graphemes)', () => void naiveTruncate(ansiLine, 20));
bench('Bun.sliceAnsi (native, safe)', () => void Bun.sliceAnsi(ansiLine, 0, 20));

console.info('\n✅ Benchmarks complete');
