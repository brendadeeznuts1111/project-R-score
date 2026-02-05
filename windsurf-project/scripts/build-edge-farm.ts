#!/usr/bin/env bun
// scripts/build-edge-farm.ts - Bundle Farm CLI for Edge (Target: Browser)
export {};

console.log('🌐 Building Edge Farm Bundle (Cloudflare Workers Target)...');

const result = await Bun.build({
  entrypoints: ['./scripts/e2e-apple-reg.ts'],
  outdir: './dist/edge',
  target: 'browser', // Crucial for CF Workers
  format: 'esm',
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true
  },
  // @ts-ignore
  env: 'PUBLIC_*',
  // Externalize things not available in Workers
  external: ['puppeteer', 'stream', 'node:fs', 'fs'],
  packages: 'bundle',
});

if (!result.success) {
  console.error('❌ Edge Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log('🏰 Edge Farm Bundle Created: dist/edge/e2e-apple-reg.js');
const file = Bun.file('./dist/edge/e2e-apple-reg.js');
console.log(`📦 Final Edge Size: ${(file.size / 1024).toFixed(1)}KB`);
console.log('💡 Note: This bundle requires a Worker shim to handle I/O and Puppeteer fallbacks.');
