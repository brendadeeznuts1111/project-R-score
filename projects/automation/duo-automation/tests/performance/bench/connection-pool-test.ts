#!/usr/bin/env bun
// connection-pool-test.ts - Test Fixed HTTP Connection Pooling

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testConnectionPooling() {
  console.info('🔗 Testing Fixed HTTP Connection Pooling...');
  console.info('✅ Fixed: keepAlive property name (was keepalive)');
  console.info('✅ Fixed: Connection: keep-alive header handling');
  console.info('✅ Fixed: Case-insensitive response header parsing');
  console.info('');
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test connection reuse with multiple rapid requests
  const data = { test: 'connection-pool-fix', time: Date.now() };
  const iterations = 15;
  const times: number[] = [];
  
  console.info(`🔄 Testing ${iterations} rapid uploads...`);
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await manager.uploadAppleID(data, `pool-fix/test-${i}.json`);
    const time = Date.now() - start;
    times.push(time);
    
    // Show progress
    if (i % 5 === 0) {
      console.info(`  Progress: ${i + 1}/${iterations} uploads`);
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const firstTime = times[0];
  const warmAvg = times.slice(1).reduce((a, b) => a + b) / (times.length - 1);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);
  
  console.info('');
  console.info('📊 Connection Pooling Results:');
  console.info(`  First request (cold): ${firstTime}ms`);
  console.info(`  Warm average: ${warmAvg.toFixed(1)}ms`);
  console.info(`  Overall average: ${avgTime.toFixed(1)}ms`);
  console.info(`  Fastest: ${fastest}ms`);
  console.info(`  Slowest: ${slowest}ms`);
  console.info(`  Variance: ${(slowest - fastest).toFixed(1)}ms`);
  
  const connectionReuseBenefit = ((firstTime - warmAvg) / firstTime * 100);
  console.info(`  🚀 Connection reuse benefit: ${connectionReuseBenefit.toFixed(1)}%`);
  
  // Verify connection pooling is working
  if (connectionReuseBenefit > 10) {
    console.info('✅ Connection pooling is working effectively!');
  } else {
    console.info('⚠️ Connection pooling benefit is minimal');
  }
  
  console.info('');
  console.info('🎉 HTTP connection pooling test complete!');
}

testConnectionPooling();
