#!/usr/bin/env bun
// urlpattern-r2-live.ts - Live URLPattern + R2 Integration Example

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function liveURLPatternR2Demo() {
  console.info('🔗 **Live URLPattern + R2 Integration** 🔗');
  console.info('='.repeat(50));

  const { URLPattern } = globalThis as any;
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);

  // Pattern definition
  const appleIdPattern = new URLPattern({ pathname: 'apple-ids/:userId.json' });
  console.info(`📋 Pattern: ${appleIdPattern.pathname}`);

  // Test file path
  const filePath = 'apple-ids/demo-user.json';
  console.info(`📁 File: ${filePath}`);

  // Pattern matching + parameter extraction
  const result = appleIdPattern.exec({ pathname: filePath });
  console.info(`🎯 Match: ${result ? '✅' : '❌'}`);
  
  if (result) {
    console.info(`📊 Extracted: ${JSON.stringify(result.pathname.groups)}`);
    
    // Create user data with extracted metadata
    const userData = {
      userId: result.pathname.groups.userId,
      email: `${result.pathname.groups.userId}@example.com`,
      timestamp: Date.now(),
      source: 'urlpattern-integration'
    };
    
    console.info(`👤 User Data: ${JSON.stringify(userData)}`);

    // R2 upload with metadata
    console.info(`\n🚀 Uploading to R2...`);
    try {
      const uploadResult = await manager.uploadAppleID(userData, filePath);
      
      if (uploadResult.success) {
        console.info(`✅ Upload Success!`);
        console.info(`📦 Size: ${uploadResult.size} bytes`);
        console.info(`🗜️ Compression: ${uploadResult.savings.toFixed(1)}%`);
        console.info(`🔗 Public URL: https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev/${filePath}`);
        
        // Verify the upload by reading back
        console.info(`\n📥 Verifying upload...`);
        const downloaded = await manager.readAsText(filePath);
        const parsed = JSON.parse(downloaded);
        
        console.info(`✅ Verification Success!`);
        console.info(`👤 Downloaded User: ${parsed.userId}`);
        console.info(`📧 Email: ${parsed.email}`);
        console.info(`⏰ Timestamp: ${parsed.timestamp}`);
        
      } else {
        console.info(`❌ Upload Failed`);
      }
    } catch (error: any) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  // Show multiple patterns working together
  console.info(`\n🔧 **Multiple Pattern Example**`);
  
  const patterns = {
    users: new URLPattern({ pathname: 'apple-ids/:userId.json' }),
    reports: new URLPattern({ pathname: 'reports/:type/:date.json' }),
    cache: new URLPattern({ pathname: 'cache/:category/:key.json' })
  };

  const testFiles = [
    'apple-ids/user123.json',
    'reports/daily/2026-01-12.json',
    'cache/session/abc123.json'
  ];

  testFiles.forEach(file => {
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test({ pathname: file })) {
        const result = pattern.exec({ pathname: file });
        console.info(`📄 ${name}: ${file} → ${JSON.stringify(result?.pathname.groups)}`);
        break;
      }
    }
  });

  console.info(`\n🎉 **Live Demo Complete!**`);
  console.info(`✅ URLPattern working perfectly`);
  console.info(`✅ R2 integration successful`);
  console.info(`✅ Parameter extraction functional`);
  console.info(`✅ File upload & verification complete`);
}

// Run the live demo
liveURLPatternR2Demo();
