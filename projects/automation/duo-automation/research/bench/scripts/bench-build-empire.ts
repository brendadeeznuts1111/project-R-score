// bench/scripts/bench-build-empire.ts
export {};

async function benchmark(name: string, fn: () => Promise<void>) {
  const start = Bun.nanoseconds();
  await fn();
  const end = Bun.nanoseconds();
  const durationNs = end - start;
  return {
    name,
    avg: durationNs / 1e6, // milliseconds
  };
}

console.info('🚀 Starting Empire Build Bench...');

const buildBench = await benchmark('Empire Build', async () => {
    await Bun.build({
        entrypoints: ['./scripts/e2e-apple-reg.ts'],
        outdir: './dist-bench',
        target: 'bun',
        minify: true,
        packages: 'bundle',
        external: ['puppeteer', 'stream']
    });
});

console.info(`✅ Empire Build: ${buildBench.avg.toFixed(0)}ms (Tree-shake enabled)`);

if (buildBench.avg < 3000) {
    console.info('⚡ Build speed optimized (Sub-3s bundle).');
} else {
    console.info('⚠️ Build slower than expected.');
}
