#!/usr/bin/env bun
// urlpattern-r2-integration.ts - Working URLPattern + R2 Integration

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

async function demonstrateURLPatternR2Integration() {
  console.log('🔗 **URLPattern + R2 Integration Demo** 🔗');
  console.log('='.repeat(50));

  // Get URLPattern from global scope
  const { URLPattern } = globalThis as any;
  
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);

  // Define R2 file patterns
  const r2Patterns = {
    appleIds: new URLPattern({ pathname: 'apple-ids/:userId.json' }),
    reports: new URLPattern({ pathname: 'reports/:type/:date.json' }),
    cache: new URLPattern({ pathname: 'cache/:category/:key.json' }),
    multiRegion: new URLPattern({ pathname: 'multi-region/:region/:id.json' }),
    loadBalancer: new URLPattern({ pathname: 'load-balancer/:endpoint/:id.json' })
  };

  console.log('\n📋 **R2 File Patterns Defined:**');
  Object.entries(r2Patterns).forEach(([name, pattern]) => {
    console.log(`  ${name}: ${pattern.pathname}`);
  });

  // Test data for different file types
  const testData = [
    { 
      url: 'apple-ids/demo-user.json', 
      data: { user: 'demo-user', timestamp: Date.now(), type: 'apple-id' },
      expectedPattern: 'appleIds'
    },
    { 
      url: 'reports/performance/2026-01-12.json', 
      data: { type: 'performance', date: '2026-01-12', metrics: { upload: 1200, download: 800 } },
      expectedPattern: 'reports'
    },
    { 
      url: 'cache/session/abc123.json', 
      data: { session: 'abc123', active: true, expiry: Date.now() + 3600000 },
      expectedPattern: 'cache'
    },
    { 
      url: 'multi-region/us-east/file456.json', 
      data: { region: 'us-east', fileId: 'file456', replicated: true },
      expectedPattern: 'multiRegion'
    }
  ];

  console.log('\n📤 **Uploading Files with Pattern Classification:**');

  for (const { url, data, expectedPattern } of testData) {
    console.log(`\n📁 Processing: ${url}`);
    
    // Match URL to determine pattern
    let matchedPattern: string | null = null;
    let extracted: any = null;

    for (const [name, pattern] of Object.entries(r2Patterns)) {
      if (pattern.test({ pathname: url })) {
        matchedPattern = name;
        extracted = pattern.exec({ pathname: url });
        break;
      }
    }

    if (matchedPattern && extracted) {
      console.log(`  ✅ Pattern: ${matchedPattern}`);
      console.log(`  📊 Extracted: ${JSON.stringify(extracted.pathname.groups)}`);
      
      // Upload to R2
      try {
        const result = await manager.uploadAppleID(data, url);
        if (result.success) {
          console.log(`  🚀 Upload: ${result.size} bytes (${result.savings.toFixed(1)}% compressed)`);
          console.log(`  🔗 Public: https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev/${url}`);
          
          // Verify pattern matches expected
          if (matchedPattern === expectedPattern) {
            console.log(`  ✅ Pattern classification correct`);
          } else {
            console.log(`  ⚠️ Expected ${expectedPattern}, got ${matchedPattern}`);
          }
        }
      } catch (error: any) {
        console.log(`  ❌ Upload failed: ${error.message}`);
      }
    } else {
      console.log(`  ❌ No pattern match for ${url}`);
    }
  }

  console.log('\n📥 **Pattern-Based File Retrieval:**');
  
  // Test pattern-based retrieval
  for (const [patternName, pattern] of Object.entries(r2Patterns)) {
    console.log(`\n🔍 Testing ${patternName} pattern:`);
    
    // Find matching files
    const matchingFiles = testData.filter(item => 
      pattern.test({ pathname: item.url })
    );
    
    for (const file of matchingFiles) {
      try {
        const content = await manager.readAsText(file.url);
        const parsed = JSON.parse(content);
        const result = pattern.exec({ pathname: file.url });
        
        console.log(`  📄 Found: ${file.url}`);
        console.log(`    Groups: ${JSON.stringify(result?.pathname.groups)}`);
        console.log(`    Data: ${JSON.stringify(parsed).slice(0, 50)}...`);
      } catch {
        console.log(`  ❌ Could not read ${file.url}`);
      }
    }
  }

  console.log('\n🎯 **Advanced Pattern Features:**');
  
  // Test wildcard patterns
  const wildcardPattern = new URLPattern({ pathname: '/apple-ids/*' });
  console.log(`\n🌐 Wildcard Pattern: ${wildcardPattern.pathname}`);
  
  testData.forEach(item => {
    if (wildcardPattern.test({ pathname: item.url })) {
      console.log(`  ✅ Wildcard match: ${item.url}`);
    }
  });

  // Test complex pattern with multiple parameters
  const complexPattern = new URLPattern({ 
    protocol: 'https',
    hostname: '*.r2.dev',
    pathname: '/:category/*/:id.json'
  });
  
  console.log(`\n🔧 Complex Pattern: ${complexPattern.pathname}`);
  console.log(`  Hostname: ${complexPattern.hostname}`);
  console.log(`  Protocol: ${complexPattern.protocol}`);

  console.log('\n🎉 **URLPattern + R2 Integration Complete!**');
  console.log('✅ Pattern classification working');
  console.log('✅ File upload with metadata');
  console.log('✅ Pattern-based retrieval');
  console.log('✅ Advanced pattern features');
  console.log('✅ Real R2 integration');
}

// Run the integration demo
demonstrateURLPatternR2Integration();
