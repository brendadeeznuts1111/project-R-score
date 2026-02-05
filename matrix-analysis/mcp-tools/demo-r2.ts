#!/usr/bin/env bun
// mcp-tools/demo-r2.ts - R2 storage demonstration and testing

import { R2ViolationLogger, ViolationLogEntry, WidthViolation } from './r2-storage.js';
import { broadcastViolation } from './sse-alerts.js';

console.log('🚀 Tier-1380 R2 Storage Demo - Persistent Violation Logs');
console.log('=' .repeat(60));

// Mock R2 configuration for demonstration
const mockConfig = {
  accountId: 'demo-account-id',
  accessKeyId: 'demo-access-key',
  secretAccessKey: 'demo-secret-key',
  bucket: 'tier1380-violations',
  region: 'auto'
};

// Initialize R2 logger
let r2Logger: R2ViolationLogger | null = null;

try {
  r2Logger = new R2ViolationLogger(mockConfig);
  console.log('✅ R2 logger initialized (demo mode)');
} catch (error) {
  console.error('❌ Failed to initialize R2 logger:', error);
}

// Create sample violation data
function createSampleViolation(id: number): WidthViolation {
  return {
    timestamp: Date.now() - (id * 1000), // Staggered timestamps
    tenant: `tenant-${id % 3 === 0 ? 'acme' : id % 3 === 1 ? 'beta' : 'gamma'}`,
    file: `src/components/Component${id}.tsx`,
    line: 20 + (id % 50),
    column: 90 + (id % 30),
    severity: id % 4 === 0 ? 'critical' : 'warning',
    preview: `const longVariableName${id} = 'this line exceeds the 89 character limit for demonstration purposes';`,
    sha256: `demo-hash-${id}`
  };
}

// Demo 1: Single violation upload
async function demoSingleUpload() {
  console.log('\n📦 Demo 1: Single Violation Upload');
  console.log('-'.repeat(40));

  if (!r2Logger) {
    console.log('⚠️ Skipping single upload demo (no R2 logger)');
    return;
  }

  const violation = createSampleViolation(1);
  const logEntry: ViolationLogEntry = {
    id: crypto.randomUUID(),
    timestamp: violation.timestamp,
    violation,
    metadata: {
      userAgent: 'Tier-1380 Demo/1.0',
      ip: '127.0.0.1',
      sessionId: 'demo-session-001',
      region: 'us-east-1'
    }
  };

  console.log(`📤 Uploading violation: ${violation.file}:${violation.line} (${violation.column}c)`);
  
  const result = await r2Logger.uploadViolationLog(logEntry);
  
  if (result.success) {
    console.log(`✅ Upload successful: ${result.url}`);
  } else {
    console.log(`❌ Upload failed: ${result.error}`);
  }
}

// Demo 2: Batch upload with streaming
async function demoBatchUpload() {
  console.log('\n📦 Demo 2: Batch Upload (Streaming)');
  console.log('-'.repeat(40));

  if (!r2Logger) {
    console.log('⚠️ Skipping batch upload demo (no R2 logger)');
    return;
  }

  const violations: ViolationLogEntry[] = [];
  
  for (let i = 2; i <= 12; i++) {
    const violation = createSampleViolation(i);
    violations.push({
      id: crypto.randomUUID(),
      timestamp: violation.timestamp,
      violation,
      metadata: {
        userAgent: 'Tier-1380 Batch Demo/1.0',
        sessionId: 'demo-session-batch',
        region: 'us-east-1'
      }
    });
  }

  console.log(`📤 Uploading ${violations.length} violations in batches...`);
  
  const result = await r2Logger.streamViolations(violations);
  
  if (result.success) {
    console.log(`✅ Batch upload successful: ${result.uploaded} violations uploaded`);
  } else {
    console.log(`❌ Batch upload failed: ${result.error}`);
    console.log(`📊 Partial upload: ${result.uploaded} violations uploaded`);
  }
}

// Demo 3: Query violations from R2
async function demoQueryViolations() {
  console.log('\n📦 Demo 3: Query Violations from R2');
  console.log('-'.repeat(40));

  if (!r2Logger) {
    console.log('⚠️ Skipping query demo (no R2 logger)');
    return;
  }

  console.log('🔍 Querying violations for tenant: acme');
  
  const result = await r2Logger.queryViolations({
    tenant: 'acme',
    severity: 'critical',
    limit: 10
  });

  if (result.error) {
    console.log(`❌ Query failed: ${result.error}`);
  } else {
    console.log(`✅ Query successful: ${result.violations.length} violations found`);
    
    result.violations.slice(0, 3).forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.violation.file}:${entry.violation.line} (${entry.violation.column}c)`);
    });
    
    if (result.violations.length > 3) {
      console.log(`  ... and ${result.violations.length - 3} more`);
    }
  }
}

// Demo 4: Get violation statistics
async function demoGetStats() {
  console.log('\n📦 Demo 4: Violation Statistics');
  console.log('-'.repeat(40));

  if (!r2Logger) {
    console.log('⚠️ Skipping stats demo (no R2 logger)');
    return;
  }

  console.log('📊 Getting statistics for the last 7 days...');
  
  const stats = await r2Logger.getViolationStats(undefined, 7);

  if (stats.error) {
    console.log(`❌ Stats failed: ${stats.error}`);
  } else {
    console.log(`✅ Statistics retrieved:`);
    console.log(`  Total violations: ${stats.total}`);
    console.log(`  Critical: ${stats.critical}`);
    console.log(`  Warning: ${stats.warning}`);
    console.log(`  Top files:`);
    
    stats.topFiles.slice(0, 5).forEach((file, index) => {
      console.log(`    ${index + 1}. ${file.file} (${file.count} violations)`);
    });
  }
}

// Demo 5: Integration with SSE system
async function demoSSEIntegration() {
  console.log('\n📦 Demo 5: SSE System Integration');
  console.log('-'.repeat(40));

  console.log('🚨 Triggering violation through SSE system (with R2 storage)...');
  
  // This will use the updated broadcastViolation function that includes R2 storage
  const testViolation: WidthViolation = {
    timestamp: Date.now(),
    tenant: 'integration-demo',
    file: 'src/integration/TestComponent.tsx',
    line: 99,
    column: 125,
    severity: 'critical',
    preview: 'const integrationTestViolation = "this demonstrates R2 integration with SSE alerts";',
    sha256: 'integration-demo-hash'
  };

  await broadcastViolation(testViolation);
  
  console.log('✅ SSE integration demo completed');
  console.log('💡 Check the console output above for R2 storage results');
}

// Main demo execution
async function runDemo() {
  console.log('🎯 Running R2 Storage Demos...\n');

  await demoSingleUpload();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await demoBatchUpload();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await demoQueryViolations();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await demoGetStats();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await demoSSEIntegration();

  console.log('\n🎉 R2 Storage Demo Complete!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Set up real R2 credentials in .env file');
  console.log('  2. Run: bun run r2-demo to test with real storage');
  console.log('  3. Start SSE server: bun run sse');
  console.log('  4. Monitor violations with R2 persistence enabled');
  
  console.log('\n🔐 Production Notes:');
  console.log('  • R2 provides 99.999% durability');
  console.log('  • Automatic lifecycle policies for old violations');
  console.log('  • Global CDN distribution for fast access');
  console.log('  • Cost-effective storage at ~$0.015/GB/month');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the demo
runDemo().catch(console.error);
