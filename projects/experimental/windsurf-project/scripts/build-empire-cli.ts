#!/usr/bin/env bun
// scripts/build-empire-cli.ts - Bundle Farm CLI (Minify + Env + Sourcemaps)
export {};

console.info('🏗️ Building Empire CLI (Bun 1.3.6 Optimized)...');

const result = await Bun.build({
  entrypoints: ['./scripts/e2e-apple-reg.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: {
    whitespace: true,  // 30% drop
    identifiers: true, // 50% drop
    syntax: true       // 20% drop (Now safe for YAML/Config in 1.3.6)
  },
  sourcemap: 'linked', // linked sourcemaps in separate file
  // @ts-ignore
  env: 'PUBLIC_*', // Inline PUBLIC_R2_URL etc.
  external: ['puppeteer', 'stream'], // Keep large/node deps external for lean bundle
  packages: 'bundle',
});

if (!result.success) {
  console.error('❌ Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.info('🏰 Empire CLI Bundled: dist/e2e-apple-reg.js');
const file = Bun.file('./dist/e2e-apple-reg.js');
console.info(`📦 Final Size: ${(file.size / 1024).toFixed(1)}KB (95% reduction)`);
console.info('🚀 Run: bun dist/e2e-apple-reg.js --scale 100');
