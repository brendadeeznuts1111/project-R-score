#!/usr/bin/env bun
// keepalive-test.ts - Test HTTP Keep-Alive Performance

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testKeepAlive() {
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  console.log('🔗 Testing HTTP Keep-Alive...');
  
  const data = { test: 'keep-alive', timestamp: Date.now() };
  const iterations = 20;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await manager.uploadAppleID(data, `keepalive/test-${i}.json`);
    const time = Date.now() - start;
    times.push(time);
    
    if (i === 0) {
      console.log(`First upload: ${time}ms (cold start)`);
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const warmAvg = times.slice(1).reduce((a, b) => a + b) / (times.length - 1);
  
  console.log(`Average time: ${avgTime.toFixed(1)}ms`);
  console.log(`Warm average: ${warmAvg.toFixed(1)}ms`);
  console.log(`Keep-alive benefit: ${((times[0] - warmAvg) / times[0] * 100).toFixed(1)}%`);
}

testKeepAlive();
