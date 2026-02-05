#!/usr/bin/env bun
// demo-v37-custom-inspector.ts - MASTER_PERF v3.7 with Custom Inspector Demo
import { BunR2AppleManager, reportPerfMatrix } from './src/storage/r2-apple-manager.ts';
import { PerfMetric, enhancePerfMetric } from './types/perf-metric.ts';

console.log('🚀 MASTER_PERF v3.7 Custom Inspector Demo');
console.log('==========================================\n');

async function demonstrateV37() {
  // Initialize R2 Manager
  const r2Manager = new BunR2AppleManager(
    undefined, // presignedUrls
    'demo-bucket-v37', // bucket
    'v37-scope' // scope
  );

  // Add comprehensive metrics with rich properties
  const demoMetrics: PerfMetric[] = [
    {
      category: 'Security',
      type: 'validation',
      topic: 'R2 Hardening',
      subCat: 'Path Validation',
      id: 'STRICT',
      value: 'Zero traversal',
      pattern: 'security_pattern',
      locations: 'r2-apple-manager.ts',
      impact: 'Storage security',
      properties: {
        traversal: 'blocked',
        scope: 'enforced',
        validation: 'strict',
        checksum: 'sha256',
        timestamp: new Date().toISOString()
      }
    },
    {
      category: 'Isolation',
      type: 'performance',
      topic: 'Agent Scaling',
      subCat: 'Performance',
      id: '50 @ 19.6ms',
      value: 'sub-ms deploy',
      pattern: 'scaling_pattern',
      locations: 'scale-agent-test.ts',
      impact: 'High-density deployment',
      properties: {
        agents: '50',
        deployTime: '19.6ms',
        isolation: 'hard',
        memoryPerAgent: '128MB',
        cpuUtilization: '87%'
      }
    },
    {
      category: 'R2',
      type: 'performance',
      topic: 'Upload Performance',
      subCat: 'Throughput',
      id: '9.2 KB/s',
      value: 'High-perf I/O',
      pattern: 'throughput_pattern',
      locations: 'bench-r2-real.ts',
      impact: 'Prod bulk operations',
      properties: {
        uploadKBps: '9.2',
        downloadKBps: '15.8',
        p99: '45ms',
        p95: '32ms',
        compression: 'zstd',
        cacheHit: 'true'
      }
    },
    {
      category: 'Zstd',
      type: 'performance',
      topic: 'Compression',
      subCat: 'Optimization',
      id: '73.4%',
      value: 'Size reduction',
      pattern: 'compression_ratio',
      locations: 'r2-apple-manager.ts',
      impact: 'Storage efficiency',
      properties: {
        originalSize: '1024KB',
        compressedSize: '272KB',
        ratio: '73.4%',
        level: '3',
        timeMs: '12.3'
      }
    }
  ];

  // Add metrics to the manager
  demoMetrics.forEach(metric => {
    r2Manager.addPerformanceMetric(metric);
  });

  console.log('📊 Enhanced MASTER_PERF Matrix (v3.7 Custom Inspector):');
  console.log('========================================================');
  
  // Use the new custom inspector format
  r2Manager.printMasterPerfMatrix();

  console.log('\n\n🎨 Comparison: Legacy vs Custom Inspector');
  console.log('==========================================');
  
  console.log('\n--- Legacy Format (Manual String Manipulation) ---');
  const legacyMetrics = r2Manager.getMasterPerfMetrics();
  console.log(r2Manager.getMasterPerfMatrixString());

  console.log('\n--- v3.7 Custom Inspector (Bun.inspect.table) ---');
  reportPerfMatrix(legacyMetrics);

  console.log('\n\n🔍 Direct Bun.inspect.table with Custom Inspector:');
  console.log('==================================================');
  
  // Show the raw power of custom inspector
  const enhanced = legacyMetrics.map(m => enhancePerfMetric(m));
  console.log(
    Bun.inspect.table(enhanced, {
      colors: true,
      compact: false
    })
  );

  console.log('\n\n✅ v3.7 Custom Inspector Benefits:');
  console.log('===================================');
  console.log('• Zero string manipulation in business logic');
  console.log('• Automatic property truncation for table display');
  console.log('• Full color support and formatting');
  console.log('• Backward compatible with existing code');
  console.log('• Type-safe with TypeScript support');
  console.log('• Configurable truncation length');

  console.log('\n🚀 Integration Complete!');
  console.log('The MASTER_PERF system now uses Bun.inspect.custom for perfect formatting.');
}

// Run demonstration
demonstrateV37().catch(console.error);
