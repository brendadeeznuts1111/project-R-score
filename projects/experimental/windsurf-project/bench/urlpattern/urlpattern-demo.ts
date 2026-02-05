#!/usr/bin/env bun
// urlpattern-demo.ts - URLPattern API Demo with R2

import { config } from 'dotenv';
config({ path: './.env' });

// Type declaration for URLPattern API
declare class URLPattern {
  constructor(init: string | URLPatternInit);
  test(input: string | URLPatternInput): boolean;
  exec(input: string | URLPatternInput): URLPatternResult | null;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly hasRegExpGroups: boolean;
}

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

interface URLPatternInput {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
}

interface URLPatternResult {
  inputs: [string];
  pathname: {
    input: string;
    groups: Record<string, string | undefined>;
  };
}

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

class R2URLPatternManager {
  private manager: BunR2AppleManager;
  
  // Define URL patterns for different R2 operations
  private patterns = {
    // Pattern for Apple ID files: apple-ids/{id}.json
    appleId: new URLPattern({ pathname: '/apple-ids/:id.json' }),
    
    // Pattern for reports: reports/{type}/{date}.json
    reports: new URLPattern({ pathname: '/reports/:type/:date.json' }),
    
    // Pattern for cache: cache/{category}/{key}.json
    cache: new URLPattern({ pathname: '/cache/:category/:key.json' }),
    
    // Pattern for multi-region: multi-region/:region/:id.json
    multiRegion: new URLPattern({ pathname: '/multi-region/:region/:id.json' }),
    
    // Pattern for load balancer: load-balancer/:endpoint/:id.json
    loadBalancer: new URLPattern({ pathname: '/load-balancer/:endpoint/:id.json' })
  };

  constructor() {
    this.manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  }

  /**
   * Test URLPattern matching
   */
  testURLPatterns() {
    console.log('🔍 Testing URLPattern API...');
    console.log('');

    // Test cases
    const testUrls = [
      'apple-ids/user123.json',
      'reports/performance/2026-01-12.json',
      'cache/user/session-abc123.json',
      'multi-region/us-east/file456.json',
      'load-balancer/primary/upload789.json',
      'invalid/path/file.txt'
    ];

    testUrls.forEach(url => {
      console.log(`📄 Testing: ${url}`);
      let foundMatch = false;
      
      // Test each pattern
      Object.entries(this.patterns).forEach(([name, pattern]) => {
        const matches = pattern.test({ pathname: url });
        
        if (matches) {
          foundMatch = true;
          const exec = pattern.exec({ pathname: url });
          console.log(`  ✅ ${name}: ${JSON.stringify(exec?.pathname.groups)}`);
        }
      });
      
      if (!foundMatch) {
        console.log(`  ❌ No pattern match`);
      }
      
      console.log('');
    });

    // Test pattern properties
    console.log('🏗️ Pattern Properties:');
    const appleIdPattern = this.patterns.appleId;
    console.log(`  Protocol: ${appleIdPattern.protocol}`);
    console.log(`  Username: ${appleIdPattern.username}`);
    console.log(`  Password: ${appleIdPattern.password}`);
    console.log(`  Hostname: ${appleIdPattern.hostname}`);
    console.log(`  Port: ${appleIdPattern.port}`);
    console.log(`  Pathname: ${appleIdPattern.pathname}`);
    console.log(`  Search: ${appleIdPattern.search}`);
    console.log(`  Hash: ${appleIdPattern.hash}`);
    console.log(`  Has RegExp Groups: ${appleIdPattern.hasRegExpGroups}`);
    console.log('');
  }

  /**
   * Use URLPattern for R2 operations
   */
  async demonstrateR2Integration() {
    console.log('🚀 URLPattern + R2 Integration Demo');
    console.log('');

    // Create test data for different patterns
    const testData = [
      { url: 'apple-ids/demo-user.json', data: { user: 'demo', timestamp: Date.now() } },
      { url: 'reports/performance/2026-01-12.json', data: { type: 'performance', date: '2026-01-12' } },
      { url: 'cache/session/abc123.json', data: { session: 'abc123', active: true } }
    ];

    for (const { url, data } of testData) {
      // Match URL to determine operation type
      let matchedPattern: string | null = null;
      let extracted: any = null;

      for (const [name, pattern] of Object.entries(this.patterns)) {
        if (pattern.test({ pathname: url })) {
          matchedPattern = name;
          extracted = pattern.exec({ pathname: url });
          break;
        }
      }

      if (matchedPattern && extracted) {
        console.log(`📤 Uploading to ${matchedPattern}:`);
        console.log(`  URL: ${url}`);
        console.log(`  Groups: ${JSON.stringify(extracted.pathname.groups)}`);
        
        try {
          const result = await this.manager.uploadAppleID(data, url);
          if (result.success) {
            console.log(`  ✅ Success: ${result.size} bytes (${result.savings.toFixed(1)}% compressed)`);
            console.log(`  🔗 Public: https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/${url}`);
          }
        } catch (error: any) {
          console.log(`  ❌ Failed: ${error.message}`);
        }
        console.log('');
      }
    }
  }

  /**
   * Demonstrate pattern-based file retrieval
   */
  async demonstratePatternRetrieval() {
    console.log('📥 Pattern-based File Retrieval');
    console.log('');

    // Find all Apple ID files using pattern
    const appleIdPattern = this.patterns.appleId;
    console.log('🔍 Searching for Apple ID files...');
    
    // Simulate pattern-based search (would use list operations in real implementation)
    const sampleFiles = [
      'apple-ids/demo-user.json',
      'reports/performance/2026-01-12.json',
      'cache/session/abc123.json'
    ];

    sampleFiles.forEach(async (file) => {
      if (appleIdPattern.test({ pathname: file })) {
        const result = appleIdPattern.exec({ pathname: file });
        console.log(`  📄 Found Apple ID: ${result?.pathname.groups.id}`);
        
        try {
          const content = await this.manager.readAsText(file);
          const parsed = JSON.parse(content);
          console.log(`    👤 User: ${parsed.user || 'N/A'}`);
          console.log(`    ⏰ Time: ${parsed.timestamp || 'N/A'}`);
        } catch {
          console.log(`    ❌ Could not read file`);
        }
      }
    });
  }
}

async function runURLPatternDemo() {
  const urlPatternManager = new R2URLPatternManager();
  
  // Test URLPattern features
  urlPatternManager.testURLPatterns();
  
  // Demonstrate R2 integration
  await urlPatternManager.demonstrateR2Integration();
  
  // Show pattern-based retrieval
  await urlPatternManager.demonstratePatternRetrieval();
  
  console.log('🎉 URLPattern + R2 Demo Complete!');
}

// Run the demo
if (Bun.main === import.meta.path) {
  runURLPatternDemo();
}

export { R2URLPatternManager };
