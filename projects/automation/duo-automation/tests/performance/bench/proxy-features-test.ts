#!/usr/bin/env bun
// proxy-features-test.ts - Test Enhanced Proxy Features

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function testProxyFeatures() {
  console.log('🌐 Testing Enhanced Proxy Features...');
  
  // Check proxy environment variables
  console.log('📡 Proxy Configuration:');
  console.log(`  URL: ${Bun.env.PROXY_URL || 'Not configured'}`);
  console.log(`  Auth: ${Bun.env.PROXY_AUTH_TOKEN ? 'Configured' : 'None'}`);
  console.log(`  Custom: ${Bun.env.PROXY_CUSTOM_HEADERS || 'None'}`);
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  
  // Test upload with proxy configuration
  console.log('\n📤 Testing upload with proxy support...');
  const testData = {
    test: 'enhanced-proxy',
    timestamp: Date.now(),
    proxy: Bun.env.PROXY_URL ? 'enabled' : 'direct'
  };
  
  try {
    const result = await manager.uploadAppleID(testData, `proxy/test-${Date.now()}.json`);
    
    if (result.success) {
      const savings = result.originalSize ? (1 - result.size / result.originalSize) * 100 : 0;
      console.log('✅ Upload successful');
      console.log(`📊 Size: ${result.size} bytes`);
      console.log(`🗜️ Compression: ${savings.toFixed(1)}%`);
      console.log(`🔗 URL: https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev/${result.key}`);
      
      // Test download to verify round-trip
      const downloaded = await manager.readAsText(result.key);
      const parsed = JSON.parse(downloaded);
      
      console.log('📥 Download verification:', parsed.test === 'enhanced-proxy' ? '✅' : '❌');
      
    } else {
      console.log('❌ Upload failed');
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n🎉 Enhanced proxy features test complete!');
}

testProxyFeatures();
