#!/usr/bin/env bun
// enhanced-proxy-demo.ts - Enhanced Proxy & Connection Pool Demo

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testEnhancedFeatures() {
  console.log('🔗 Testing Enhanced Proxy & Connection Features...');
  
  // Check proxy configuration
  if (Bun.env.PROXY_URL) {
    console.log(`📡 Proxy: ${Bun.env.PROXY_URL}`);
    console.log(`🔐 Auth: ${Bun.env.PROXY_AUTH_TOKEN ? 'Configured' : 'None'}`);
  } else {
    console.log('📡 Proxy: Not configured (direct connection)');
  }
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test connection reuse with multiple rapid requests
  console.log('\n🔄 Testing connection reuse...');
  const data = { test: 'enhanced-connections', time: Date.now() };
  const times: number[] = [];
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await manager.uploadAppleID(data, `enhanced/conn-${i}.json`);
    times.push(Date.now() - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);
  
  console.log(`⚡ Average: ${avgTime.toFixed(1)}ms`);
  console.log(`🚀 Fastest: ${fastest}ms`);
  console.log(`🐌 Slowest: ${slowest}ms`);
  console.log(`📊 Variance: ${(slowest - fastest).toFixed(1)}ms`);
  
  // Test proxy headers if configured
  if (Bun.env.PROXY_URL) {
    console.log('\n🌐 Testing proxy headers...');
    try {
      const proxyData = { proxy: 'test', headers: Date.now() };
      await manager.uploadAppleID(proxyData, `enhanced/proxy-${Date.now()}.json`);
      console.log('✅ Proxy connection successful');
    } catch (error: any) {
      console.log(`❌ Proxy failed: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Enhanced features test complete!');
}

testEnhancedFeatures();
