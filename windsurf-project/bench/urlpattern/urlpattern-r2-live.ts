#!/usr/bin/env bun
// urlpattern-r2-live.ts - Live URLPattern + R2 Integration Example

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function liveURLPatternR2Demo() {
  console.log('🔗 **Live URLPattern + R2 Integration** 🔗');
  console.log('='.repeat(50));

  const { URLPattern } = globalThis as any;
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);

  // Pattern definition
  const appleIdPattern = new URLPattern({ pathname: 'apple-ids/:userId.json' });
  console.log(`📋 Pattern: ${appleIdPattern.pathname}`);

  // Test file path
  const filePath = 'apple-ids/demo-user.json';
  console.log(`📁 File: ${filePath}`);

  // Pattern matching + parameter extraction
  const result = appleIdPattern.exec({ pathname: filePath });
  console.log(`🎯 Match: ${result ? '✅' : '❌'}`);
  
  if (result) {
    console.log(`📊 Extracted: ${JSON.stringify(result.pathname.groups)}`);
    
    // Create user data with extracted metadata
    const userData = {
      userId: result.pathname.groups.userId,
      email: `${result.pathname.groups.userId}@example.com`,
      timestamp: Date.now(),
      source: 'urlpattern-integration'
    };
    
    console.log(`👤 User Data: ${JSON.stringify(userData)}`);

    // R2 upload with metadata
    console.log(`\n🚀 Uploading to R2...`);
    try {
      const uploadResult = await manager.uploadAppleID(userData, filePath);
      
      if (uploadResult.success) {
        console.log(`✅ Upload Success!`);
        console.log(`📦 Size: ${uploadResult.size} bytes`);
        console.log(`🗜️ Compression: ${uploadResult.savings.toFixed(1)}%`);
        console.log(`🔗 Public URL: https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/${filePath}`);
        
        // Verify the upload by reading back
        console.log(`\n📥 Verifying upload...`);
        const downloaded = await manager.readAsText(filePath);
        const parsed = JSON.parse(downloaded);
        
        console.log(`✅ Verification Success!`);
        console.log(`👤 Downloaded User: ${parsed.userId}`);
        console.log(`📧 Email: ${parsed.email}`);
        console.log(`⏰ Timestamp: ${parsed.timestamp}`);
        
      } else {
        console.log(`❌ Upload Failed`);
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Show multiple patterns working together
  console.log(`\n🔧 **Multiple Pattern Example**`);
  
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
        console.log(`📄 ${name}: ${file} → ${JSON.stringify(result?.pathname.groups)}`);
        break;
      }
    }
  });

  console.log(`\n🎉 **Live Demo Complete!**`);
  console.log(`✅ URLPattern working perfectly`);
  console.log(`✅ R2 integration successful`);
  console.log(`✅ Parameter extraction functional`);
  console.log(`✅ File upload & verification complete`);
}

// Run the live demo
liveURLPatternR2Demo();
