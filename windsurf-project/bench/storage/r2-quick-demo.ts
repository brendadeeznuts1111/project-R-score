#!/usr/bin/env bun
// r2-quick-demo.ts - Quick R2 Integration Demo

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function quickDemo() {
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Upload test data
  const data = { test: 'R2 integration', time: Date.now() };
  const result = await manager.uploadAppleID(data, `quick-${Date.now()}.json`);
  
  console.log('Upload:', result.success ? '✅' : '❌');
  
  if (result.success) {
    // Download and verify
    const content = await manager.readAsText(result.key);
    const parsed = JSON.parse(content);
    
    console.log('Download:', parsed.test === 'R2 integration' ? '✅' : '❌');
    console.log('Compression:', result.savings.toFixed(1) + '%');
    console.log('URL:', `https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/${result.key}`);
  }
}

quickDemo();
