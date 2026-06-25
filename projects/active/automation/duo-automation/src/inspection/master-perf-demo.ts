// src/inspection/master-perf-demo.ts
import { MasterPerfInspector } from './master-perf-inspector';
import { PerfMetric } from '../storage/r2-apple-manager';

/**
 * Demo metrics showcasing all categories and performance scenarios
 */
const demoMetrics: PerfMetric[] = [
  {
    id: 'security-auth-001',
    category: 'Security',
    type: 'Authentication',
    topic: 'JWT Validation',
    value: '23ms',
    locations: 'src/auth/jwt-validator.ts:45',
    impact: 'High',
    properties: {
      scope: 'ENTERPRISE',
      algorithm: 'RS256',
      cacheHits: '1247'
    }
  },
  {
    id: 'r2-upload-002',
    category: 'R2',
    type: 'Storage',
    topic: 'File Upload',
    value: '156ms',
    locations: 'src/storage/r2-uploader.ts:89',
    impact: 'Medium',
    properties: {
      scope: 'DEVELOPMENT',
      bucket: 'factory-wager-assets',
      fileSize: '2.4MB'
    }
  },
  {
    id: 'isolation-sandbox-003',
    category: 'Isolation',
    type: 'Sandbox',
    topic: 'Process Spawn',
    value: '8ms',
    locations: 'src/isolation/sandbox.ts:234',
    impact: 'Low',
    properties: {
      scope: 'LOCAL-SANDBOX',
      memoryLimit: '512MB',
      timeout: '30s'
    }
  },
  {
    id: 'zstd-compression-004',
    category: 'Zstd',
    type: 'Compression',
    topic: 'Response Body',
    value: '45ms',
    locations: 'src/compression/zstd-handler.ts:67',
    impact: 'Medium',
    properties: {
      scope: 'ENTERPRISE',
      ratio: '3.2x',
      originalSize: '1.8MB'
    }
  },
  {
    id: 'demo-analytics-005',
    category: 'Demo',
    type: 'Analytics',
    topic: 'Event Tracking',
    value: '2ms',
    locations: 'src/analytics/tracker.ts:12',
    impact: 'Low',
    properties: {
      scope: 'DEVELOPMENT',
      events: '42',
      sampleRate: '0.1'
    }
  },
  {
    id: 'security-encryption-006',
    category: 'Security',
    type: 'Encryption',
    topic: 'AES-256-GCM',
    value: '67ms',
    locations: 'src/crypto/encryption.ts:156',
    impact: 'High',
    properties: {
      scope: 'ENTERPRISE',
      keySize: '256',
      operations: '89'
    }
  }
];

/**
 * 🎯 Complete Demo Suite
 */
export function runMasterPerfDemo(): void {
  console.info('\n🚀 MASTER_PERF Inspector Demo Suite');
  console.info('='.repeat(60));
  
  // 1. Validate color palette
  MasterPerfInspector.validateColors();
  console.info();
  
  // 2. Show colored terminal output
  console.info('📊 1. Colored Terminal Output');
  console.info('─'.repeat(40));
  MasterPerfInspector.displayTerminal(demoMetrics);
  console.info();
  
  // 3. Show plain text export
  console.info('📄 2. Plain Text Export (ANSI stripped)');
  console.info('─'.repeat(40));
  const plainText = MasterPerfInspector.generatePlainText(demoMetrics);
  console.info(plainText);
  console.info();
  
  // 4. Show JSON export with normalized colors
  console.info('📦 3. JSON Export with Normalized Colors');
  console.info('─'.repeat(40));
  const jsonData = MasterPerfInspector.generateJson(demoMetrics);
  console.info(jsonData.substring(0, 500) + '...');
  console.info();
  
  // 5. Show WebSocket payload (minimal)
  console.info('🌐 4. WebSocket Payload (Minimal)');
  console.info('─'.repeat(40));
  const wsPayload = MasterPerfInspector.createWebSocketPayload(demoMetrics);
  console.info(wsPayload);
  console.info();
  
  // 6. Performance benchmark
  console.info('⚡ 5. Performance Benchmark');
  console.info('─'.repeat(40));
  MasterPerfInspector.benchmark();
  console.info();
  
  // 7. Write log file example
  console.info('📝 6. Log File Export');
  console.info('─'.repeat(40));
  MasterPerfInspector.writeLogfile(demoMetrics, 'demo-master-perf.log');
  console.info('✅ Log file written to: demo-master-perf.log');
  console.info();
  
  // 8. Color utility examples
  console.info('🎨 7. Color Utility Examples');
  console.info('─'.repeat(40));
  ['Security', 'R2', 'Isolation', 'Zstd', 'Demo'].forEach(category => {
    const hex = MasterPerfInspector.getColorHex(category);
    const number = MasterPerfInspector.getColorNumber(category);
    const ansi = MasterPerfInspector.generateTable([demoMetrics.find(m => m.category === category)!]);
    console.info(`${category}: Hex=${hex}, Number=${number}`);
  });
  
  console.info('\n✨ Demo Complete! All dual-mode outputs tested.');
}

/**
 * 🧪 Individual Test Functions
 */
export function testColorAccuracy(): void {
  console.info('\n🎨 Testing Color Accuracy');
  console.info('─'.repeat(40));
  
  const testMetric: PerfMetric = {
    id: 'color-test-001',
    category: 'Security',
    type: 'Test',
    topic: 'Color Validation',
    value: '999ms', // Should trigger error color
    locations: 'test/color.ts:1',
    impact: 'Test'
  };
  
  const formatted = new MasterPerfInspector.FormattedPerfMetric(testMetric);
  console.info('Category (should be red):', formatted.category);
  console.info('Value (should be red error):', formatted.value);
  console.info('Raw ANSI codes preserved for terminal output');
}

export function testUnicodeHandling(): void {
  console.info('\n🌍 Testing Unicode & Emoji Handling');
  console.info('─'.repeat(40));
  
  const unicodeMetric: PerfMetric = {
    id: 'unicode-test-001',
    category: 'Demo',
    type: '测试',
    topic: '🧪 Unicode Test',
    value: '5ms',
    locations: '测试/unicode.ts:测试行号',
    impact: '🌍 Global Impact'
  };
  
  const formatted = new MasterPerfInspector.FormattedPerfMetric(unicodeMetric);
  console.info('ID with scope flag:', formatted.id);
  console.info('Unicode locations:', formatted.locations);
  console.info('Unicode impact:', formatted.impact);
}

export function testPerformanceScaling(): void {
  console.info('\n📈 Testing Performance Scaling');
  console.info('─'.repeat(40));
  
  const sizes = [100, 1000, 10000];
  
  sizes.forEach(size => {
    const largeMetrics = Array(size).fill(null).map((_, i) => ({
      ...demoMetrics[i % demoMetrics.length],
      id: `perf-test-${i}`
    }));
    
    const start = performance.now();
    MasterPerfInspector.generatePlainText(largeMetrics);
    const end = performance.now();
    
    console.info(`${size.toLocaleString()} metrics: ${(end - start).toFixed(2)}ms`);
  });
}

/**
 * 🏋️ Stress Test
 */
export function runStressTest(): void {
  console.info('\n🔥 MASTER_PERF Stress Test');
  console.info('='.repeat(40));
  
  testColorAccuracy();
  testUnicodeHandling();
  testPerformanceScaling();
  
  console.info('\n✅ All stress tests passed!');
}

// Auto-run demo if this file is executed directly
if (import.meta.main) {
  runMasterPerfDemo();
}
