#!/usr/bin/env bun
// scripts/demo-enhanced-matrix-string.ts
// Empire Pro v3.7 - Enhanced getMatrixString() demonstration

import { MasterPerfTracker } from '../src/storage/r2-apple-manager.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

console.info('🚀 Empire Pro v3.7 - Enhanced getMatrixString() Demo');
console.info('===================================================\n');

// Initialize timezone for deterministic tracking
initializeScopeTimezone('ENTERPRISE');

// Create enhanced tracker with v3.7 features
const tracker = new MasterPerfTracker({
  enableTimezoneTracking: true,
  enableFeatureFlagTracking: true,
  enableLocationTracking: true,
  enableUnicodeFormatting: false // Use enhanced text format
});

console.info('📊 Adding Sample Metrics for Enhanced Matrix Display...\n');

// Add sample metrics with different timestamps and properties
const sampleMetrics = [
  {
    category: 'R2',
    type: 'upload',
    topic: 'apple-id',
    subCat: 'account',
    id: 'up_001',
    value: '1024',
    pattern: 'success',
    locations: 1,
    impact: 'high' as const,
    properties: { duration: 150, size: '1MB', region: 'us-east-1' }
  },
  {
    category: 'R2',
    type: 'download',
    topic: 'report',
    subCat: 'audit',
    id: 'down_001',
    value: '2048',
    pattern: 'success',
    locations: 1,
    impact: 'medium' as const,
    properties: { duration: 75, size: '2MB', region: 'us-east-1' }
  },
  {
    category: 'PERFORMANCE',
    type: 'response_time',
    topic: 'api',
    subCat: 'gateway',
    id: 'perf_001',
    value: '45',
    pattern: 'optimal',
    locations: 1,
    impact: 'low' as const,
    properties: { endpoint: '/api/v1/status', latency: 45 }
  },
  {
    category: 'SECURITY',
    type: 'auth',
    topic: 'apple-id',
    subCat: 'verification',
    id: 'auth_001',
    value: '1',
    pattern: 'success',
    locations: 1,
    impact: 'high' as const,
    properties: { method: 'oauth2', provider: 'apple', verified: true }
  },
  {
    category: 'ERROR',
    type: 'timeout',
    topic: 'r2',
    subCat: 'connection',
    id: 'err_001',
    value: '5000',
    pattern: 'failure',
    locations: 1,
    impact: 'high' as const,
    properties: { error: 'ETIMEDOUT', retry: 3, timeout: 5000 }
  }
];

// Add metrics with slight delays to show timestamp differences
sampleMetrics.forEach((metric, index) => {
  tracker.addMetric(metric);
  // Small delay to ensure different timestamps
  const start = Date.now();
  while (Date.now() - start < 10) { /* wait */ }
});

console.info('✅ Added 5 sample metrics with timestamps and properties\n');

// Display the enhanced matrix string
console.info('🎯 Enhanced getMatrixString() Output:');
console.info('=====================================');

const matrixString = tracker.getMatrixString();
console.info(matrixString);

console.info('\n🔍 Enhancement Highlights:');
console.info('========================');

const highlights = [
  '✅ v3.7 Enhanced header with timezone and feature flag info',
  '✅ Timestamp column for temporal analysis',
  '✅ Timezone awareness for global deployments',
  '✅ Feature flag tracking for conditional behavior',
  '✅ Duration tracking for performance analysis',
  '✅ Smart sorting by timestamp and impact priority',
  '✅ Summary statistics with impact distribution',
  '✅ Color-coded impact indicators (🔴🟡🟢)',
  '✅ Average duration calculation',
  '✅ Category breakdown for operational insights'
];

highlights.forEach(highlight => console.info(`  ${highlight}`));

console.info('\n📊 Comparison with Legacy Format:');
console.info('==================================');
console.info('Legacy: Basic table with 10 columns');
console.info('Enhanced: Rich table with metadata, sorting, and statistics');
console.info('');
console.info('Legacy: Static format without context');
console.info('Enhanced: Dynamic format with timezone and feature awareness');
console.info('');
console.info('Legacy: No sorting or analysis');
console.info('Enhanced: Smart sorting + comprehensive statistics');

console.info('\n🎯 Usage Examples:');
console.info('================');
console.info('// Get enhanced matrix string');
console.info('const matrixString = tracker.getMatrixString();');
console.info('');
console.info('// Log to console or write to file');
console.info('console.info(matrixString);');
console.info('await Bun.write("performance-report.txt", matrixString);');
console.info('');
console.info('// Include in audit reports');
console.info('const auditReport = `Performance Metrics:\\n${matrixString}`;');

console.info('\n✅ Enhanced getMatrixString() Demo Completed!');
console.info('🚀 Empire Pro v3.7 - Enterprise-grade performance reporting!');
