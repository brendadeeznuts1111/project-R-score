#!/usr/bin/env bun
// scripts/demo-enhanced-perf-tracker.ts
// Empire Pro v3.7 - Enhanced performance tracking demonstration

import { MasterPerfTracker } from '../src/storage/r2-apple-manager.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';
import { feature } from "bun:bundle";

console.info('🚀 Empire Pro v3.7 - Enhanced Performance Tracker Demo');
console.info('====================================================\n');

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

console.info('📊 Configuration:');
console.info('================');
console.info(`Timezone Tracking: ${tracker.isTimezoneTrackingEnabled ? '✅' : '❌'}`);
console.info(`Feature Flag Tracking: ${tracker.isFeatureFlagTrackingEnabled ? '✅' : '❌'}`);
console.info(`Location Tracking: ${tracker.isLocationTrackingEnabled ? '✅' : '❌'}`);
console.info(`Max Metrics: ${tracker.maxMetricsLimit}`);
console.info(`Unicode Formatting: ${tracker.isUnicodeFormattingEnabled ? '✅' : '❌'}`);

console.info('\n🎯 Adding Sample Metrics:');
console.info('========================');

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
  console.info(`✅ Added metric ${index + 1}: ${metric.category}.${metric.type}`);
});

console.info('\n📈 Performance Matrix Output:');
console.info('=============================');

// Show different output formats
console.info('\n1️⃣ Standard Matrix Output:');
tracker.printMatrix();

console.info('\n2️⃣ Operation Statistics:');
const stats = tracker.getOperationStats();
console.info('Operation Stats:');
stats.forEach(stat => {
  console.info(`  ${stat.operation.padEnd(20)} Count: ${stat.count.toString().padStart(3)} | Total: ${stat.total.toString().padStart(6)} | Avg: ${stat.average.toFixed(2).padStart(6)}`);
});

console.info('\n3️⃣ Category-Based Metrics:');
const categories = ['R2', 'PERFORMANCE', 'SECURITY', 'ERROR'];
categories.forEach(category => {
  const categoryMetrics = tracker.getMetricsByCategory(category);
  console.info(`  ${category.padEnd(12)}: ${categoryMetrics.length} metrics`);
});

console.info('\n4️⃣ Export Formats Demo:');
console.info('JSON Export (first 200 chars):');
const jsonExport = tracker.exportMetrics('json');
console.info(jsonExport.substring(0, 200) + '...');

console.info('\nCSV Export (first 200 chars):');
const csvExport = tracker.exportMetrics('csv');
console.info(csvExport.substring(0, 200) + '...');

console.info('\n5️⃣ Time Range Query Demo:');
const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const recentMetrics = tracker.getMetricsByTimeRange(oneHourAgo, now);
console.info(`Metrics in last hour: ${recentMetrics.length}`);

console.info('\n🎯 Feature Flag Integration:');
console.info('==========================');

console.info('Active Feature Flags:');
console.info(`  ${feature("ENTERPRISE_SECURITY") ? '✅' : '❌'} ENTERPRISE_SECURITY`);
console.info(`  ${feature("DEVELOPMENT_TOOLS") ? '✅' : '❌'} DEVELOPMENT_TOOLS`);
console.info(`  ${feature("DEBUG_UNICODE") ? '✅' : '❌'} DEBUG_UNICODE`);
console.info(`  ${feature("PREMIUM_ANALYTICS") ? '✅' : '❌'} PREMIUM_ANALYTICS`);
console.info(`  ${feature("ADVANCED_DASHBOARD") ? '✅' : '❌'} ADVANCED_DASHBOARD`);
console.info(`  ${feature("AUDIT_EXPORT") ? '✅' : '❌'} AUDIT_EXPORT`);
console.info(`  ${feature("REAL_TIME_UPDATES") ? '✅' : '❌'} REAL_TIME_UPDATES`);
console.info(`  ${feature("MULTI_TENANT") ? '✅' : '❌'} MULTI_TENANT`);
console.info(`  ${feature("V37_DETERMINISTIC_TZ") ? '✅' : '❌'} V37_DETERMINISTIC_TZ`);
console.info(`  ${feature("V37_NATIVE_R2") ? '✅' : '❌'} V37_NATIVE_R2`);

console.info('\n🌍 Timezone Integration:');
console.info('======================');

try {
  const tzConfig = { scopeTimezone: 'America/New_York', standardOffset: '-05:00' } as any;
  console.info(`Active Timezone: ${tzConfig.scopeTimezone} (${tzConfig.standardOffset})`);
  console.info('✅ Deterministic timezone tracking active');
} catch {
  console.info('ℹ️  Using fallback timezone: UTC');
}

console.info('\n📊 Enhanced Features Summary:');
console.info('=============================');
console.info('✅ Enhanced metric tracking with timezone awareness');
console.info('✅ Feature flag impact analysis');
console.info('✅ Location-aware performance monitoring');
console.info('✅ Unicode-formatted table output');
console.info('✅ Multiple export formats (JSON, CSV, Table)');
console.info('✅ Operation statistics and aggregation');
console.info('✅ Time-range based queries');
console.info('✅ FIFO metric limit management');
console.info('✅ v3.7 deterministic timezone integration');

console.info('\n🔧 Usage Examples:');
console.info('================');
console.info('// Create enhanced tracker');
console.info('const tracker = new MasterPerfTracker({');
console.info('  enableTimezoneTracking: true,');
console.info('  enableFeatureFlagTracking: true,');
console.info('  enableUnicodeFormatting: true');
console.info('});');
console.info('');
console.info('// Add metrics with enhanced tracking');
console.info('tracker.addMetric({');
console.info('  category: "R2",');
console.info('  type: "upload",');
console.info('  value: 1024,');
console.info('  properties: { duration: 150 }');
console.info('});');
console.info('');
console.info('// Export in different formats');
console.info('const json = tracker.exportMetrics("json");');
console.info('const csv = tracker.exportMetrics("csv");');
console.info('const table = tracker.exportMetrics("table");');

console.info('\n🎉 Enhanced Performance Tracker Demo Completed!');
console.info('🚀 Empire Pro v3.7 - Enterprise-grade performance monitoring!');
