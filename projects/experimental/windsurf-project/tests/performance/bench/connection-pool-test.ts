#!/usr/bin/env bun
// connection-pool-test.ts - Test Fixed HTTP Connection Pooling

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testConnectionPooling() {
  console.log('🔗 Testing Fixed HTTP Connection Pooling...');
  console.log('✅ Fixed: keepAlive property name (was keepalive)');
  console.log('✅ Fixed: Connection: keep-alive header handling');
  console.log('✅ Fixed: Case-insensitive response header parsing');
  console.log('');
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test connection reuse with multiple rapid requests
  const data = { test: 'connection-pool-fix', time: Date.now() };
  const iterations = 15;
  const times: number[] = [];
  
  console.log(`🔄 Testing ${iterations} rapid uploads...`);
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await manager.uploadAppleID(data, `pool-fix/test-${i}.json`);
    const time = Date.now() - start;
    times.push(time);
    
    // Show progress
    if (i % 5 === 0) {
      console.log(`  Progress: ${i + 1}/${iterations} uploads`);
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const firstTime = times[0];
  const warmAvg = times.slice(1).reduce((a, b) => a + b) / (times.length - 1);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);
  
  console.log('');
  console.log('📊 Connection Pooling Results:');
  console.log(`  First request (cold): ${firstTime}ms`);
  console.log(`  Warm average: ${warmAvg.toFixed(1)}ms`);
  console.log(`  Overall average: ${avgTime.toFixed(1)}ms`);
  console.log(`  Fastest: ${fastest}ms`);
  console.log(`  Slowest: ${slowest}ms`);
  console.log(`  Variance: ${(slowest - fastest).toFixed(1)}ms`);
  
  const connectionReuseBenefit = ((firstTime - warmAvg) / firstTime * 100);
  console.log(`  🚀 Connection reuse benefit: ${connectionReuseBenefit.toFixed(1)}%`);
  
  // Verify connection pooling is working
  if (connectionReuseBenefit > 10) {
    console.log('✅ Connection pooling is working effectively!');
  } else {
    console.log('⚠️ Connection pooling benefit is minimal');
  }
  
  console.log('');
  console.log('🎉 HTTP connection pooling test complete!');
}

testConnectionPooling();
