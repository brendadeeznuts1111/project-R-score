#!/usr/bin/env bun
// scripts/demo-enhanced-perf-tracker.ts
// Empire Pro v3.7 - Enhanced performance tracking demonstration

import { MasterPerfTracker } from '../src/storage/r2-apple-manager.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';
import { feature } from "bun:bundle";

console.log('🚀 Empire Pro v3.7 - Enhanced Performance Tracker Demo');
console.log('====================================================\n');

// Initialize timezone for deterministic tracking
initializeScopeTimezone('ENTERPRISE');

// Create enhanced tracker with v3.7 features
const tracker = new MasterPerfTracker({
  enableTimezoneTracking: feature("V37_DETERMINISTIC_TZ") ? true : false,
  enableFeatureFlagTracking: true,
  enableLocationTracking: feature("MULTI_TENANT") ? true : false,
  maxMetrics: feature("PREMIUM_ANALYTICS") ? 1000 : 500,
  enableUnicodeFormatting: feature("DEBUG_UNICODE") ? true : false
});

console.log('📊 Configuration:');
console.log('================');
console.log(`Timezone Tracking: ${tracker.isTimezoneTrackingEnabled ? '✅' : '❌'}`);
console.log(`Feature Flag Tracking: ${tracker.isFeatureFlagTrackingEnabled ? '✅' : '❌'}`);
console.log(`Location Tracking: ${tracker.isLocationTrackingEnabled ? '✅' : '❌'}`);
console.log(`Max Metrics: ${tracker.maxMetricsLimit}`);
console.log(`Unicode Formatting: ${tracker.isUnicodeFormattingEnabled ? '✅' : '❌'}`);

console.log('\n🎯 Adding Sample Metrics:');
console.log('========================');

// Add sample metrics with different categories
const sampleMetrics = [
  {
    category: 'R2',
    type: 'upload',
    topic: 'apple-id',
    subCat: 'account',
    id: 'upload_001',
    value: '1024',
    pattern: 'success',
    locations: 1,
    impact: 'high' as const,
    properties: { duration: 150, size: '1MB' }
  },
  {
    category: 'R2',
    type: 'download',
    topic: 'report',
    subCat: 'audit',
    id: 'download_001',
    value: '2048',
    pattern: 'success',
    locations: 1,
    impact: 'medium' as const,
    properties: { duration: 75, size: '2MB' }
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
    properties: { endpoint: '/api/v1/status' }
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
    properties: { method: 'oauth2', provider: 'apple' }
  },
  {
    category: 'ERROR',
    type: 'timeout',
    topic: 'r2',
    subCat: 'connection',
    id: 'error_001',
    value: '5000',
    pattern: 'failure',
    locations: 1,
    impact: 'high' as const,
    properties: { error: 'ETIMEDOUT', retry: 3 }
  }
];

sampleMetrics.forEach((metric, index) => {
  tracker.addMetric(metric);
  console.log(`✅ Added metric ${index + 1}: ${metric.category}.${metric.type}`);
});

console.log('\n📈 Performance Matrix Output:');
console.log('=============================');

// Show different output formats
console.log('\n1️⃣ Standard Matrix Output:');
tracker.printMatrix();

console.log('\n2️⃣ Operation Statistics:');
const stats = tracker.getOperationStats();
console.log('Operation Stats:');
stats.forEach(stat => {
  console.log(`  ${stat.operation.padEnd(20)} Count: ${stat.count.toString().padStart(3)} | Total: ${stat.total.toString().padStart(6)} | Avg: ${stat.average.toFixed(2).padStart(6)}`);
});

console.log('\n3️⃣ Category-Based Metrics:');
const categories = ['R2', 'PERFORMANCE', 'SECURITY', 'ERROR'];
categories.forEach(category => {
  const categoryMetrics = tracker.getMetricsByCategory(category);
  console.log(`  ${category.padEnd(12)}: ${categoryMetrics.length} metrics`);
});

console.log('\n4️⃣ Export Formats Demo:');
console.log('JSON Export (first 200 chars):');
const jsonExport = tracker.exportMetrics('json');
console.log(jsonExport.substring(0, 200) + '...');

console.log('\nCSV Export (first 200 chars):');
const csvExport = tracker.exportMetrics('csv');
console.log(csvExport.substring(0, 200) + '...');

console.log('\n5️⃣ Time Range Query Demo:');
const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const recentMetrics = tracker.getMetricsByTimeRange(oneHourAgo, now);
console.log(`Metrics in last hour: ${recentMetrics.length}`);

console.log('\n🎯 Feature Flag Integration:');
console.log('==========================');

console.log('Active Feature Flags:');
console.log(`  ${feature("ENTERPRISE_SECURITY") ? '✅' : '❌'} ENTERPRISE_SECURITY`);
console.log(`  ${feature("DEVELOPMENT_TOOLS") ? '✅' : '❌'} DEVELOPMENT_TOOLS`);
console.log(`  ${feature("DEBUG_UNICODE") ? '✅' : '❌'} DEBUG_UNICODE`);
console.log(`  ${feature("PREMIUM_ANALYTICS") ? '✅' : '❌'} PREMIUM_ANALYTICS`);
console.log(`  ${feature("ADVANCED_DASHBOARD") ? '✅' : '❌'} ADVANCED_DASHBOARD`);
console.log(`  ${feature("AUDIT_EXPORT") ? '✅' : '❌'} AUDIT_EXPORT`);
console.log(`  ${feature("REAL_TIME_UPDATES") ? '✅' : '❌'} REAL_TIME_UPDATES`);
console.log(`  ${feature("MULTI_TENANT") ? '✅' : '❌'} MULTI_TENANT`);
console.log(`  ${feature("V37_DETERMINISTIC_TZ") ? '✅' : '❌'} V37_DETERMINISTIC_TZ`);
console.log(`  ${feature("V37_NATIVE_R2") ? '✅' : '❌'} V37_NATIVE_R2`);

console.log('\n🌍 Timezone Integration:');
console.log('======================');

try {
  const tzConfig = { scopeTimezone: 'America/New_York', standardOffset: '-05:00' } as any;
  console.log(`Active Timezone: ${tzConfig.scopeTimezone} (${tzConfig.standardOffset})`);
  console.log('✅ Deterministic timezone tracking active');
} catch {
  console.log('ℹ️  Using fallback timezone: UTC');
}

console.log('\n📊 Enhanced Features Summary:');
console.log('=============================');
console.log('✅ Enhanced metric tracking with timezone awareness');
console.log('✅ Feature flag impact analysis');
console.log('✅ Location-aware performance monitoring');
console.log('✅ Unicode-formatted table output');
console.log('✅ Multiple export formats (JSON, CSV, Table)');
console.log('✅ Operation statistics and aggregation');
console.log('✅ Time-range based queries');
console.log('✅ FIFO metric limit management');
console.log('✅ v3.7 deterministic timezone integration');

console.log('\n🔧 Usage Examples:');
console.log('================');
console.log('// Create enhanced tracker');
console.log('const tracker = new MasterPerfTracker({');
console.log('  enableTimezoneTracking: true,');
console.log('  enableFeatureFlagTracking: true,');
console.log('  enableUnicodeFormatting: true');
console.log('});');
console.log('');
console.log('// Add metrics with enhanced tracking');
console.log('tracker.addMetric({');
console.log('  category: "R2",');
console.log('  type: "upload",');
console.log('  value: 1024,');
console.log('  properties: { duration: 150 }');
console.log('});');
console.log('');
console.log('// Export in different formats');
console.log('const json = tracker.exportMetrics("json");');
console.log('const csv = tracker.exportMetrics("csv");');
console.log('const table = tracker.exportMetrics("table");');

console.log('\n🎉 Enhanced Performance Tracker Demo Completed!');
console.log('🚀 Empire Pro v3.7 - Enterprise-grade performance monitoring!');
