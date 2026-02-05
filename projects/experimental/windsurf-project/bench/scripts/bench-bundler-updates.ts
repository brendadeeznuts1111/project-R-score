// bench/scripts/bench-bundler-updates.ts
export {};

async function benchmark(name: string, cmd: string[]) {
  const start = Bun.nanoseconds();
  const proc = Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' });
  await proc.exited;
  const end = Bun.nanoseconds();
  return (end - start) / 1e6; // ms
}

console.log('🚀 Bundler Minify Bench (Startup Time)...');

// First, ensure build is fresh
console.log('🏗️ Preparing bundle...');
const buildProc = Bun.spawn(['bun', 'scripts/build-empire-cli.ts'], { stdout: 'ignore' });
await buildProc.exited;

const unbundled = await benchmark('Unbundled E2E', ['bun', 'scripts/e2e-apple-reg.ts', '--scale', '0']);
const bundled = await benchmark('Bundled Minify', ['bun', 'dist/e2e-apple-reg.js', '--scale', '0']);

const speedup = (unbundled / bundled).toFixed(1);

console.log('-------------------------------------------');
console.log(`Unbundled: ${unbundled.toFixed(0)}ms`);
console.log(`Bundled:   ${bundled.toFixed(0)}ms`);
console.log(`Gain:      ${speedup}x Speedup`);
console.log('-------------------------------------------');

if (parseFloat(speedup) >= 5.0) {
  console.log('⚡ Target reached: 5x+ Startup Performance!');
} else {
  console.log('⚠️ Speedup lower than expected.');
}
