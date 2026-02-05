#!/usr/bin/env bun
// scripts/e2e-apple-reg.ts
// Primary entrypoint for the Empire Farm CLI

import { streamFarm } from '../utils/readable-blob-farm';
import { puppeteerInlineScreenshot } from '../utils/puppeteer-readable';

const args = Bun.argv.slice(2);
const scale = parseInt(args[args.indexOf('--scale') + 1]) || 1;
const team = args[args.indexOf('--team') + 1] || 'default';

console.log(`🏰 Empire Farm CLI [Team: ${team}]`);
console.log(`🚀 Scaling to ${scale} registrations...`);

// Inlined via Bun.build env: "PUBLIC_*"
// @ts-ignore
const publicR2 = process.env.PUBLIC_R2_URL || 'https://default.r2.dev';
// @ts-ignore
const publicDash = process.env.PUBLIC_DASHBOARD_URL || 'https://dash.duoplus.ai';

console.log(`🌐 Public R2: ${publicR2}`);
console.log(`📱 Dashboard: ${publicDash}`);

async function runFarm() {
  const start = Bun.nanoseconds();
  
  if (scale > 0) {
    console.log(`🌊 Starting Stream Farm: ${scale}x1MB...`);
    await streamFarm(scale, 1);
  }

  // Example screenshot if requested
  if (args.includes('--screenshot')) {
    const url = 'https://appleid.apple.com';
    const key = `screenshots/cli-${team}-${Date.now()}.png`;
    await puppeteerInlineScreenshot(url, key);
  }

  const durationMs = (Bun.nanoseconds() - start) / 1e6;
  console.log(`\n✅ Farm Complete in ${durationMs.toFixed(0)}ms (Scalable)`);
}

runFarm().catch(console.error);
