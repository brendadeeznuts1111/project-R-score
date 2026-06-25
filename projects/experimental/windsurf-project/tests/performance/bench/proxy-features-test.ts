#!/usr/bin/env bun
// proxy-features-test.ts - Test Enhanced Proxy Features

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testProxyFeatures() {
  console.info('🌐 Testing Enhanced Proxy Features...');
  
  // Check proxy environment variables
  console.info('📡 Proxy Configuration:');
  console.info(`  URL: ${Bun.env.PROXY_URL || 'Not configured'}`);
  console.info(`  Auth: ${config.getSecret('proxy').authToken ? 'Configured' : 'None'}`);
  console.info(`  Custom: ${Bun.env.PROXY_CUSTOM_HEADERS || 'None'}`);
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test upload with proxy configuration
  console.info('\n📤 Testing upload with proxy support...');
  const testData = {
    test: 'enhanced-proxy',
    timestamp: Date.now(),
    proxy: Bun.env.PROXY_URL ? 'enabled' : 'direct'
  };
  
  try {
    const result = await manager.uploadAppleID(testData, `proxy/test-${Date.now()}.json`);
    
    if (result.success) {
      const savings = result.originalSize ? (1 - result.size / result.originalSize) * 100 : 0;
      console.info('✅ Upload successful');
      console.info(`📊 Size: ${result.size} bytes`);
      console.info(`🗜️ Compression: ${savings.toFixed(1)}%`);
      console.info(`🔗 URL: https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/${result.key}`);
      
      // Test download to verify round-trip
      const downloaded = await manager.readAsText(result.key);
      const parsed = JSON.parse(downloaded);
      
      console.info('📥 Download verification:', parsed.test === 'enhanced-proxy' ? '✅' : '❌');
      
    } else {
      console.info('❌ Upload failed');
    }
  } catch (error: any) {
    console.info(`❌ Error: ${error.message}`);
  }
  
  console.info('\n🎉 Enhanced proxy features test complete!');
}

testProxyFeatures();
