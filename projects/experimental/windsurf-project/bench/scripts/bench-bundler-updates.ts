// bench/scripts/bench-bundler-updates.ts
export {};

async function benchmark(name: string, cmd: string[]) {
  const start = Bun.nanoseconds();
  const proc = Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' });
  await proc.exited;
  const end = Bun.nanoseconds();
  return (end - start) / 1e6; // ms
}

console.info('🚀 Bundler Minify Bench (Startup Time)...');

// First, ensure build is fresh
console.info('🏗️ Preparing bundle...');
const buildProc = Bun.spawn(['bun', 'scripts/build-empire-cli.ts'], { stdout: 'ignore' });
await buildProc.exited;

const unbundled = await benchmark('Unbundled E2E', ['bun', 'scripts/e2e-apple-reg.ts', '--scale', '0']);
const bundled = await benchmark('Bundled Minify', ['bun', 'dist/e2e-apple-reg.js', '--scale', '0']);

const speedup = (unbundled / bundled).toFixed(1);

console.info('-------------------------------------------');
console.info(`Unbundled: ${unbundled.toFixed(0)}ms`);
console.info(`Bundled:   ${bundled.toFixed(0)}ms`);
console.info(`Gain:      ${speedup}x Speedup`);
console.info('-------------------------------------------');

if (parseFloat(speedup) >= 5.0) {
  console.info('⚡ Target reached: 5x+ Startup Performance!');
} else {
  console.info('⚠️ Speedup lower than expected.');
}
