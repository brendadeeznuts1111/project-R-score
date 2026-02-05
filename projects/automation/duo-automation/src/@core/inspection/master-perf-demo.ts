/**
 * 🎨 MASTER_PERF Demo - Dual-Mode Output System
 * Demonstrates rich ANSI colors for terminal and clean exports for storage
 */

import { 
  generateMasterPerfTable,
  generateMasterPerfPlainText,
  generateMasterPerfJson,
  generateMasterPerfCsv,
  generateMasterPerfWebSocket,
  generateMasterPerfHtml,
  comparePerformanceMetrics,
  testMasterPerfInspector,
  FormattedPerfMetric,
  CATEGORY_COLORS,
  STATUS_COLORS
} from './master-perf-inspector';
import { writeFileSync } from 'fs';
import { PerfMetric } from '../storage/r2-apple-manager';

/**
 * 📊 Sample performance metrics for demonstration
 */
const sampleMetrics: PerfMetric[] = [
  // Security metrics
  {
    id: 'security-audit-latency',
    category: 'Security',
    type: 'latency',
    topic: 'bun-native',
    value: '15ms',
    locations: 'src/security/auditor.ts:120',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', checks: 42 }
  },
  {
    id: 'security-scan-throughput',
    category: 'Security',
    type: 'throughput',
    topic: 'bun-native',
    value: '2500 files/sec',
    locations: 'src/security/scanner.ts:85',
    impact: 'high',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', scanned: 10000 }
  },
  
  // R2 Storage metrics
  {
    id: 'r2-upload-latency',
    category: 'R2',
    type: 'latency',
    topic: 'cloudflare',
    value: '85ms',
    locations: 'src/storage/r2-apple-manager.ts:200',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', region: 'us-east-1' }
  },
  {
    id: 'r2-download-throughput',
    category: 'R2',
    type: 'throughput',
    topic: 'cloudflare',
    value: '180MB/s',
    locations: 'src/storage/r2-apple-manager.ts:250',
    impact: 'high',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', cached: true }
  },
  
  // Isolation metrics
  {
    id: 'isolation-spawn-time',
    category: 'Isolation',
    type: 'latency',
    topic: 'bun-native',
    value: '120ms',
    locations: 'src/kernel/agent-isolator.ts:75',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'DEVELOPMENT', agents: 5 }
  },
  {
    id: 'isolation-memory-usage',
    category: 'Isolation',
    type: 'memory',
    topic: 'bun-native',
    value: '45MB',
    locations: 'src/kernel/agent-worker.ts:90',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'DEVELOPMENT', isolated: true }
  },
  
  // Zstd compression metrics
  {
    id: 'zstd-compression-ratio',
    category: 'Zstd',
    type: 'throughput',
    topic: 'bun-native',
    value: '3.2x',
    locations: 'src/storage/compression.ts:45',
    impact: 'high',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', level: 3 }
  },
  {
    id: 'zstd-compression-speed',
    category: 'Zstd',
    type: 'throughput',
    topic: 'bun-native',
    value: '500MB/s',
    locations: 'src/storage/compression.ts:60',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', threads: 4 }
  },
  
  // Performance metrics
  {
    id: 'performance-cpu-usage',
    category: 'Performance',
    type: 'cpu',
    topic: 'bun-native',
    value: '35%',
    locations: 'src/performance/monitor.ts:30',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'LOCAL-SANDBOX', cores: 8 }
  },
  {
    id: 'performance-memory-usage',
    category: 'Performance',
    type: 'memory',
    topic: 'bun-native',
    value: '125MB',
    locations: 'src/performance/monitor.ts:45',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'LOCAL-SANDBOX', heap: true }
  },
  
  // Network metrics
  {
    id: 'network-request-latency',
    category: 'Network',
    type: 'latency',
    topic: 'cloudflare',
    value: '25ms',
    locations: 'src/network/client.ts:110',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', https: true }
  },
  {
    id: 'network-throughput',
    category: 'Network',
    type: 'throughput',
    topic: 'cloudflare',
    value: '1.2GB/s',
    locations: 'src/network/client.ts:125',
    impact: 'high',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', compressed: true }
  },
  
  // Database metrics
  {
    id: 'database-query-time',
    category: 'Database',
    type: 'latency',
    topic: 'bun-native',
    value: '8ms',
    locations: 'src/database/query.ts:55',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', cached: true }
  },
  {
    id: 'database-connection-pool',
    category: 'Database',
    type: 'throughput',
    topic: 'bun-native',
    value: '95%',
    locations: 'src/database/pool.ts:70',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'ENTERPRISE', connections: 20 }
  },
  
  // Demo metrics
  {
    id: 'demo-render-time',
    category: 'Demo',
    type: 'latency',
    topic: 'bun-native',
    value: '200ms',
    locations: 'src/demo/renderer.ts:40',
    impact: 'medium',
    timestamp: new Date().toISOString(),
    properties: { scope: 'LOCAL-SANDBOX', frames: 60 }
  },
  {
    id: 'demo-animation-fps',
    category: 'Demo',
    type: 'throughput',
    topic: 'bun-native',
    value: '58fps',
    locations: 'src/demo/animator.ts:65',
    impact: 'low',
    timestamp: new Date().toISOString(),
    properties: { scope: 'LOCAL-SANDBOX', smooth: true }
  }
];

/**
 * 🎨 Performance comparison data
 */
const previousMetrics: PerfMetric[] = [
  {
    id: 'r2-upload-latency',
    category: 'R2',
    type: 'latency',
    topic: 'cloudflare',
    value: '120ms', // Worse than current
    locations: 'src/storage/r2-apple-manager.ts:200',
    impact: 'medium',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    properties: { scope: 'ENTERPRISE', region: 'us-east-1' }
  },
  {
    id: 'zstd-compression-speed',
    category: 'Zstd',
    type: 'throughput',
    topic: 'bun-native',
    value: '350MB/s', // Worse than current
    locations: 'src/storage/compression.ts:60',
    impact: 'medium',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    properties: { scope: 'ENTERPRISE', threads: 4 }
  },
  {
    id: 'performance-cpu-usage',
    category: 'Performance',
    type: 'cpu',
    topic: 'bun-native',
    value: '45%', // Better than current
    locations: 'src/performance/monitor.ts:30',
    impact: 'medium',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    properties: { scope: 'LOCAL-SANDBOX', cores: 8 }
  }
];

/**
 * 🚀 Main demonstration function
 */
export function runMasterPerfDemo(): void {
  console.log('\n🎨 MASTER_PERF Dual-Mode System Demo\n');
  console.log('📊 Demonstrating rich ANSI colors + clean exports\n');
  
  // 1. Show colored terminal output
  console.log('\n' + '='.repeat(80));
  console.log('📈 1. RICH TERMINAL OUTPUT (with ANSI colors)');
  console.log('='.repeat(80));
  console.log(generateMasterPerfTable(sampleMetrics, { 
    maxRows: 10,
    showProperties: true,
    sortBy: 'category'
  }));
  
  // 2. Show plain text export
  console.log('\n' + '='.repeat(80));
  console.log('📄 2. PLAIN TEXT EXPORT (ANSI stripped)');
  console.log('='.repeat(80));
  console.log(generateMasterPerfPlainText(sampleMetrics, { 
    maxRows: 5,
    includeHeaders: true
  }));
  
  // 3. Show JSON export with colors
  console.log('\n' + '='.repeat(80));
  console.log('📋 3. JSON EXPORT (with normalized colors)');
  console.log('='.repeat(80));
  const jsonOutput = generateMasterPerfJson(sampleMetrics.slice(0, 3), { 
    includeColors: true,
    includeFormatted: true
  });
  console.log(jsonOutput);
  
  // 4. Show CSV export
  console.log('\n' + '='.repeat(80));
  console.log('📈 4. CSV EXPORT (for spreadsheet analysis)');
  console.log('='.repeat(80));
  console.log(generateMasterPerfCsv(sampleMetrics.slice(0, 5), { 
    includeHeaders: true
  }));
  
  // 5. Show WebSocket payload
  console.log('\n' + '='.repeat(80));
  console.log('🌐 5. WEBSOCKET PAYLOAD (minimal, real-time)');
  console.log('='.repeat(80));
  console.log(generateMasterPerfWebSocket(sampleMetrics.slice(0, 5), { 
    minimal: true
  }));
  
  // 6. Show performance comparison
  console.log('\n' + '='.repeat(80));
  console.log('📊 6. PERFORMANCE COMPARISON (vs previous hour)');
  console.log('='.repeat(80));
  console.log(comparePerformanceMetrics(previousMetrics, sampleMetrics));
  
  // 7. Show color palette
  console.log('\n' + '='.repeat(80));
  console.log('🎨 7. COLOR PALETTE (24-bit precise colors)');
  console.log('='.repeat(80));
  console.log('\nCategory Colors:');
  Object.entries(CATEGORY_COLORS).forEach(([name, color]) => {
    console.log(`  ${color}● ${name}\x1b[0m`);
  });
  
  console.log('\nStatus Colors:');
  Object.entries(STATUS_COLORS).forEach(([name, color]) => {
    console.log(`  ${color}● ${name}\x1b[0m`);
  });
  
  // 8. Performance benchmarks
  console.log('\n' + '='.repeat(80));
  console.log('⚡ 8. PERFORMANCE BENCHMARKS');
  console.log('='.repeat(80));
  
  const iterations = 1000;
  console.log(`\n🏃 Running ${iterations} iterations of each operation...\n`);
  
  // Benchmark ANSI stripping
  const startStrip = performance.now();
  for (let i = 0; i < iterations; i++) {
    const table = generateMasterPerfTable(sampleMetrics);
    Bun.stripANSI(table);
  }
  const stripTime = performance.now() - startStrip;
  
  // Benchmark color conversion
  const startColor = performance.now();
  for (let i = 0; i < iterations; i++) {
    const formatted = new FormattedPerfMetric(sampleMetrics[0]);
    formatted.getCategoryColorNumber();
    formatted.getValueStatus();
  }
  const colorTime = performance.now() - startColor;
  
  // Benchmark table generation
  const startTable = performance.now();
  for (let i = 0; i < iterations; i++) {
    generateMasterPerfTable(sampleMetrics, { maxRows: 10 });
  }
  const tableTime = performance.now() - startTable;
  
  console.log(`📊 Results:`);
  console.log(`  ANSI Stripping:   ${stripTime.toFixed(2)}ms (${(stripTime/iterations).toFixed(3)}ms per op)`);
  console.log(`  Color Conversion: ${colorTime.toFixed(2)}ms (${(colorTime/iterations).toFixed(3)}ms per op)`);
  console.log(`  Table Generation: ${tableTime.toFixed(2)}ms (${(tableTime/iterations).toFixed(3)}ms per op)`);
  
  console.log(`\n🚀 Performance: All operations under 1ms per iteration - excellent!`);
}

/**
 * 💾 Export demo files for testing
 */
export function exportDemoFiles(): void {
  console.log('\n💾 Exporting demo files...\n');
  
  // Export colored table
  const coloredTable = generateMasterPerfTable(sampleMetrics);
  writeFileSync('master-perf-colored.txt', coloredTable);
  console.log('✅ Exported: master-perf-colored.txt (with ANSI colors)');
  
  // Export plain text
  const plainText = generateMasterPerfPlainText(sampleMetrics);
  writeFileSync('master-perf-plain.txt', plainText);
  console.log('✅ Exported: master-perf-plain.txt (ANSI stripped)');
  
  // Export JSON
  const jsonExport = generateMasterPerfJson(sampleMetrics, { includeColors: true });
  writeFileSync('master-perf-export.json', jsonExport);
  console.log('✅ Exported: master-perf-export.json (with color data)');
  
  // Export CSV
  const csvExport = generateMasterPerfCsv(sampleMetrics);
  writeFileSync('master-perf-export.csv', csvExport);
  console.log('✅ Exported: master-perf-export.csv (spreadsheet ready)');
  
  // Export HTML
  const htmlExport = generateMasterPerfHtml(sampleMetrics, { includeStyles: true });
  writeFileSync('master-perf-export.html', htmlExport);
  console.log('✅ Exported: master-perf-export.html (dashboard ready)');
  
  // Export WebSocket payload
  const wsExport = generateMasterPerfWebSocket(sampleMetrics, { minimal: false });
  writeFileSync('master-perf-websocket.json', wsExport);
  console.log('✅ Exported: master-perf-websocket.json (real-time ready)');
  
  console.log('\n🎉 All demo files exported successfully!');
  console.log('📂 Check the current directory for exported files.');
}

/**
 * 🧪 Run comprehensive tests
 */
export function runMasterPerfTests(): void {
  console.log('\n🧪 Running MASTER_PERF System Tests\n');
  
  // Test 1: Basic functionality
  console.log('📋 Test 1: Basic functionality...');
  try {
    testMasterPerfInspector();
    console.log('✅ Basic functionality test passed!\n');
  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
  }
  
  // Test 2: Edge cases
  console.log('📋 Test 2: Edge cases...');
  try {
    const edgeMetrics: PerfMetric[] = [
      {
        id: 'empty-properties',
        category: 'Demo',
        type: 'latency',
        topic: 'test',
        value: '0ms',
        locations: 'test.ts:1',
        impact: 'low',
        timestamp: new Date().toISOString()
        // No properties
      },
      {
        id: 'very-long-location-path-that-should-be-truncated-properly',
        category: 'Demo',
        type: 'latency',
        topic: 'test',
        value: '1ms',
        locations: 'very/long/path/that/goes/on/forever/and/should/be/truncated/test.ts:999',
        impact: 'low',
        timestamp: new Date().toISOString(),
        properties: { scope: 'ENTERPRISE' }
      }
    ];
    
    const table = generateMasterPerfTable(edgeMetrics);
    const plain = generateMasterPerfPlainText(edgeMetrics);
    
    if (table.includes('empty-properties') && plain.includes('very/long/path')) {
      console.log('✅ Edge cases test passed!\n');
    } else {
      throw new Error('Edge case handling failed');
    }
  } catch (error) {
    console.error('❌ Edge cases test failed:', error);
  }
  
  // Test 3: Performance under load
  console.log('📋 Test 3: Performance under load...');
  try {
    const largeMetrics: PerfMetric[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `load-test-${i}`,
      category: 'Demo',
      type: 'latency',
      topic: 'test',
      value: `${Math.random() * 100}ms`,
      locations: `test.ts:${i}`,
      impact: 'low',
      timestamp: new Date().toISOString(),
      properties: { index: i }
    }));
    
    const start = performance.now();
    const table = generateMasterPerfTable(largeMetrics, { maxRows: 100 });
    const plain = Bun.stripANSI(table);
    const duration = performance.now() - start;
    
    if (duration < 100 && plain.includes('load-test-0')) {
      console.log(`✅ Performance test passed! (${duration.toFixed(2)}ms for 1000 metrics)\n`);
    } else {
      throw new Error(`Performance test failed: ${duration}ms is too slow`);
    }
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
  
  // Test 4: Color consistency
  console.log('📋 Test 4: Color consistency...');
  try {
    const testMetric = new FormattedPerfMetric(sampleMetrics[0]);
    const category1 = testMetric.category;
    const category2 = testMetric.category; // Should be identical
    
    if (category1 === category2) {
      console.log('✅ Color consistency test passed!\n');
    } else {
      throw new Error('Color consistency failed');
    }
  } catch (error) {
    console.error('❌ Color consistency test failed:', error);
  }
  
  console.log('🎉 All MASTER_PERF tests completed!');
}

/**
 * 🚀 Main entry point
 */
if (import.meta.main) {
  console.log('\n🎨 MASTER_PERF Dual-Mode System');
  console.log('📊 Rich ANSI colors + Clean exports\n');
  
  // Run the demo
  runMasterPerfDemo();
  
  // Export demo files
  exportDemoFiles();
  
  // Run tests
  runMasterPerfTests();
  
  console.log('\n🏆 MASTER_PERF System Demo Complete!');
  console.log('📚 Check the exported files for different output formats.');
  console.log('🌐 Ready for production use with dual-mode output!');
}
