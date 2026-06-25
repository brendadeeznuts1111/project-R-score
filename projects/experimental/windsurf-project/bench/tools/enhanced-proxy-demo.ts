#!/usr/bin/env bun
// enhanced-proxy-demo.ts - Enhanced Proxy & Connection Pool Demo

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testEnhancedFeatures() {
  console.info('🔗 Testing Enhanced Proxy & Connection Features...');
  
  // Check proxy configuration
  if (Bun.env.PROXY_URL) {
    console.info(`📡 Proxy: ${Bun.env.PROXY_URL}`);
    console.info(`🔐 Auth: ${config.getSecret('proxy').authToken ? 'Configured' : 'None'}`);
  } else {
    console.info('📡 Proxy: Not configured (direct connection)');
  }
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test connection reuse with multiple rapid requests
  console.info('\n🔄 Testing connection reuse...');
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
  
  console.info(`⚡ Average: ${avgTime.toFixed(1)}ms`);
  console.info(`🚀 Fastest: ${fastest}ms`);
  console.info(`🐌 Slowest: ${slowest}ms`);
  console.info(`📊 Variance: ${(slowest - fastest).toFixed(1)}ms`);
  
  // Test proxy headers if configured
  if (Bun.env.PROXY_URL) {
    console.info('\n🌐 Testing proxy headers...');
    try {
      const proxyData = { proxy: 'test', headers: Date.now() };
      await manager.uploadAppleID(proxyData, `enhanced/proxy-${Date.now()}.json`);
      console.info('✅ Proxy connection successful');
    } catch (error: any) {
      console.info(`❌ Proxy failed: ${error.message}`);
    }
  }
  
  console.info('\n🎉 Enhanced features test complete!');
}

testEnhancedFeatures();
