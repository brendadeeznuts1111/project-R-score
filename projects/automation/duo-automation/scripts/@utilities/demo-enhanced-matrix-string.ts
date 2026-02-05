#!/usr/bin/env bun
// scripts/demo-enhanced-matrix-string.ts
// Empire Pro v3.7 - Enhanced getMatrixString() demonstration

import { MasterPerfTracker } from '../src/storage/r2-apple-manager.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

console.log('🚀 Empire Pro v3.7 - Enhanced getMatrixString() Demo');
console.log('===================================================\n');

// Initialize timezone for deterministic tracking
initializeScopeTimezone('ENTERPRISE');

// Create enhanced tracker with v3.7 features
const tracker = new MasterPerfTracker({
  enableTimezoneTracking: true,
  enableFeatureFlagTracking: true,
  enableLocationTracking: true,
  enableUnicodeFormatting: false // Use enhanced text format
});

console.log('📊 Adding Sample Metrics for Enhanced Matrix Display...\n');

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

console.log('✅ Added 5 sample metrics with timestamps and properties\n');

// Display the enhanced matrix string
console.log('🎯 Enhanced getMatrixString() Output:');
console.log('=====================================');

const matrixString = tracker.getMatrixString();
console.log(matrixString);

console.log('\n🔍 Enhancement Highlights:');
console.log('========================');

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

highlights.forEach(highlight => console.log(`  ${highlight}`));

console.log('\n📊 Comparison with Legacy Format:');
console.log('==================================');
console.log('Legacy: Basic table with 10 columns');
console.log('Enhanced: Rich table with metadata, sorting, and statistics');
console.log('');
console.log('Legacy: Static format without context');
console.log('Enhanced: Dynamic format with timezone and feature awareness');
console.log('');
console.log('Legacy: No sorting or analysis');
console.log('Enhanced: Smart sorting + comprehensive statistics');

console.log('\n🎯 Usage Examples:');
console.log('================');
console.log('// Get enhanced matrix string');
console.log('const matrixString = tracker.getMatrixString();');
console.log('');
console.log('// Log to console or write to file');
console.log('console.log(matrixString);');
console.log('await Bun.write("performance-report.txt", matrixString);');
console.log('');
console.log('// Include in audit reports');
console.log('const auditReport = `Performance Metrics:\\n${matrixString}`;');

console.log('\n✅ Enhanced getMatrixString() Demo Completed!');
console.log('🚀 Empire Pro v3.7 - Enterprise-grade performance reporting!');
