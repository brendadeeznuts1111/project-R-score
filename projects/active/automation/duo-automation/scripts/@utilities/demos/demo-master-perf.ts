#!/usr/bin/env bun
// demo-master-perf.ts - Demonstration of MASTER_PERF Matrix Integration
import { BunR2AppleManager, MasterPerfTracker, type PerfMetric } from './src/storage/r2-apple-manager.ts';

console.info('🚀 MASTER_PERF Matrix Integration Demo');
console.info('=====================================\n');

async function demonstrateMasterPerf() {
  // Initialize R2 Manager with performance tracking
  const r2Manager = new BunR2AppleManager(
    undefined, // presignedUrls
    'demo-bucket', // bucket
    'demo-scope' // scope
  );

  console.info('📊 Initial MASTER_PERF Matrix:');
  r2Manager.printMasterPerfMatrix();

  // Simulate some operations to generate metrics
  console.info('\n🔄 Performing operations to generate metrics...');
  
  try {
    // Simulate upload performance
    const uploadData = {
      id: 'demo-apple-id',
      email: 'demo@example.com',
      timestamp: new Date().toISOString(),
      metadata: { source: 'master-perf-demo' }
    };

    // Add custom performance metrics
    r2Manager.addPerformanceMetric({
      category: 'Demo',
      type: 'benchmark',
      topic: 'Test Operation',
      subCat: 'Validation',
      id: 'demo-001',
      value: 'SUCCESS',
      pattern: 'test_pattern',
      locations: 'demo-master-perf.ts',
      impact: 'Demo validation',
      properties: { demo: 'true', performance: 'tracked' }
    });

    // Add isolation metrics (matching your dashboard)
    r2Manager.addPerformanceMetric({
      category: 'Isolation',
      type: 'performance',
      topic: 'Agent Scaling',
      subCat: 'Performance',
      id: '50 @ 19.6ms',
      value: 'sub-ms deploy',
      pattern: 'scaling_pattern',
      locations: 'scale-agent-test.ts',
      impact: 'High-density deployment',
      properties: { agents: '50', deployTime: '19.6ms', isolation: 'hard' }
    });

    // Add security metrics
    r2Manager.addPerformanceMetric({
      category: 'Security',
      type: 'validation',
      topic: 'R2 Hardening',
      subCat: 'Path Validation',
      id: 'STRICT',
      value: 'Zero traversal',
      pattern: 'security_pattern',
      locations: 'r2-apple-manager.ts',
      impact: 'Storage security',
      properties: { traversal: 'blocked', scope: 'enforced', validation: 'strict' }
    });

    console.info('✅ Operations completed successfully!');
    
  } catch (error) {
    console.info('⚠️ Demo operations failed (expected in demo environment):', error instanceof Error ? error.message : String(error));
  }

  // Display final MASTER_PERF matrix
  console.info('\n📊 Final MASTER_PERF Matrix:');
  r2Manager.printMasterPerfMatrix();

  // Show operation metrics
  console.info('\n📈 Operation Performance Summary:');
  const operationMetrics = r2Manager.getOperationMetrics();
  Object.entries(operationMetrics).forEach(([operation, duration]) => {
    console.info(`  • ${operation}: ${duration.toFixed(2)}ms`);
  });

  // Export metrics for dashboard integration
  console.info('\n🔗 Dashboard Integration Ready:');
  const metrics = r2Manager.getMasterPerfMetrics();
  console.info(`  • Total metrics: ${metrics.length}`);
  console.info(`  • Categories: ${[...new Set(metrics.map(m => m.category))].join(', ')}`);
  console.info(`  • Export format: JSON/Console/String`);

  // Show string format for WebSocket streaming
  console.info('\n📡 WebSocket Stream Format:');
  console.info(r2Manager.getMasterPerfMatrixString());

  console.info('\n✅ MASTER_PERF Integration Demo Complete!');
  console.info('\nNext steps:');
  console.info('1. Integrate with infrastructure dashboard server');
  console.info('2. Stream metrics via WebSocket (1-second intervals)');
  console.info('3. Display in real-time dashboard UI');
  console.info('4. Export to reports/setup-results.json for CI/CD');
}

// Run demonstration
demonstrateMasterPerf().catch(console.error);
