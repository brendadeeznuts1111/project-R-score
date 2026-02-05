#!/usr/bin/env bun
// scripts/demo-feature-flags.ts
// Empire Pro v3.7 - Feature flag demonstration

import { feature } from "bun:bundle";
import { UnicodeSecurityDashboard } from '../security/unicode-dashboard.ts';
import { AuditExporter } from '../utils/audit-exporter.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

console.log('🚀 Empire Pro v3.7 - Feature Flag Integration Demo\n');

// Show current feature flag configuration
console.log('📋 Current Feature Flag Configuration:');
console.log('='.repeat(50));

console.log(`  ${feature("ENTERPRISE_SECURITY") ? '✅' : '❌'} ENTERPRISE_SECURITY      ${getFeatureDescription("ENTERPRISE_SECURITY")}`);
console.log(`  ${feature("DEVELOPMENT_TOOLS") ? '✅' : '❌'} DEVELOPMENT_TOOLS      ${getFeatureDescription("DEVELOPMENT_TOOLS")}`);
console.log(`  ${feature("DEBUG_UNICODE") ? '✅' : '❌'} DEBUG_UNICODE           ${getFeatureDescription("DEBUG_UNICODE")}`);
console.log(`  ${feature("PREMIUM_ANALYTICS") ? '✅' : '❌'} PREMIUM_ANALYTICS      ${getFeatureDescription("PREMIUM_ANALYTICS")}`);
console.log(`  ${feature("ADVANCED_DASHBOARD") ? '✅' : '❌'} ADVANCED_DASHBOARD    ${getFeatureDescription("ADVANCED_DASHBOARD")}`);
console.log(`  ${feature("AUDIT_EXPORT") ? '✅' : '❌'} AUDIT_EXPORT            ${getFeatureDescription("AUDIT_EXPORT")}`);
console.log(`  ${feature("REAL_TIME_UPDATES") ? '✅' : '❌'} REAL_TIME_UPDATES      ${getFeatureDescription("REAL_TIME_UPDATES")}`);
console.log(`  ${feature("MULTI_TENANT") ? '✅' : '❌'} MULTI_TENANT           ${getFeatureDescription("MULTI_TENANT")}`);

console.log('\n🔒 Security Dashboard - Feature Flag Integration:');
console.log('='.repeat(60));

// Test enterprise features
if (feature("ENTERPRISE_SECURITY")) {
  console.log('🏛️ ENTERPRISE SECURITY MODE ENABLED');
  initializeScopeTimezone('ENTERPRISE');
  
  const enterpriseDashboard = new UnicodeSecurityDashboard();
  const enterpriseOutput = enterpriseDashboard.generateDashboard();
  
  console.log(enterpriseOutput);
  
  // Test audit export
  if (feature("AUDIT_EXPORT")) {
    console.log('\n📋 AUDIT EXPORT DEMO:');
    console.log('='.repeat(30));
    
    const exporter = new AuditExporter();
    
    // Demo filename generation
    const testDomains = ['apple.factory-wager.com', 'google.com', 'microsoft.com'];
    testDomains.forEach(domain => {
      const filename = exporter.generateFilename(domain);
      console.log(`  📄 ${domain} → ${filename}`);
    });
    
    console.log('\n✅ Audit export functionality available');
  }
}

// Test development features
if (feature("DEVELOPMENT_TOOLS")) {
  console.log('🧪 DEVELOPMENT TOOLS MODE ENABLED');
  initializeScopeTimezone('DEVELOPMENT');
  
  const devDashboard = new UnicodeSecurityDashboard();
  const devOutput = devDashboard.generateDashboard();
  
  console.log(devOutput);
}

// Test debug features
if (feature("DEBUG_UNICODE")) {
  console.log('\n🔍 DEBUG UNICODE MODE:');
  console.log('='.repeat(30));
  
  console.log('⚠️ Zero-width character highlighting enabled');
  console.log('📏 Enhanced Bun.stringWidth() measurements active');
  console.log('🎯 Unicode debugging tools available');
  
  // Demo zero-width character detection
  const testStrings = [
    'hello\u200Bworld',  // zero-width space
    'test\u200Dcompound', // zero-width joiner
    'normal string'
  ];
  
  console.log('\n📏 Width Measurements:');
  testStrings.forEach(str => {
    const width = Bun.stringWidth(str);
    const visible = str.replace(/[\u200B-\u200D\uFEFF]/g, 'Ⓩ');
    console.log(`  "${visible}" → ${width} chars wide`);
  });
}

// Test premium analytics
if (feature("PREMIUM_ANALYTICS")) {
  console.log('\n📊 PREMIUM ANALYTICS DEMO:');
  console.log('='.repeat(30));
  
  console.log('✅ Advanced sorting algorithms active');
  console.log('✅ Multi-dimensional data analysis');
  console.log('✅ Deep path access enabled');
  console.log('✅ Custom comparators available');
  
  // Demo enhanced table capabilities
  const sampleData = [
    { user: { name: 'Alice', score: 95 }, department: 'Engineering' },
    { user: { name: 'Bob', score: 87 }, department: 'Marketing' },
    { user: { name: 'Carol', score: 98 }, department: 'Engineering' }
  ];
  
  console.log('\n📈 Sample Analytics Data:');
  console.log('Top performers by department and score');
  // Would use enhanced table formatter here
}

console.log('\n🎯 Bundle Optimization Summary:');
console.log('='.repeat(40));

console.log('📦 Enterprise Build:');
console.log('  ✅ ENTERPRISE_SECURITY');
console.log('  ✅ PREMIUM_ANALYTICS');
console.log('  ✅ AUDIT_EXPORT');
console.log('  ❌ DEVELOPMENT_TOOLS (excluded)');
console.log('  ❌ DEBUG_UNICODE (excluded)');
console.log('  📏 Smallest bundle size');

console.log('\n🧪 Development Build:');
console.log('  ✅ DEVELOPMENT_TOOLS');
console.log('  ✅ DEBUG_UNICODE');
console.log('  ✅ PREMIUM_ANALYTICS');
console.log('  ❌ ENTERPRISE_SECURITY (excluded)');
console.log('  ❌ AUDIT_EXPORT (excluded)');
console.log('  📏 Debug features included');

console.log('\n🚀 Build Commands:');
console.log('='.repeat(20));
console.log('bun run build:enterprise  # Production build');
console.log('bun run build:development # Development build');
console.log('bun test --feature=ENTERPRISE_SECURITY tests/feature-flags.test.ts');
console.log('bun test --feature=DEVELOPMENT_TOOLS tests/feature-flags.test.ts');

console.log('\n✅ Feature Flag Integration Demo Completed!');
console.log('🎯 Empire Pro v3.7 - Optimized for every deployment target!');

function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    'ENTERPRISE_SECURITY': 'Full compliance & audit features',
    'DEVELOPMENT_TOOLS': 'Mock data & debug overlays',
    'DEBUG_UNICODE': 'Zero-width char highlighting',
    'PREMIUM_ANALYTICS': 'Advanced matrix sorting',
    'ADVANCED_DASHBOARD': 'Enhanced dashboard features',
    'AUDIT_EXPORT': 'S3 audit log export',
    'REAL_TIME_UPDATES': 'Live dashboard refresh',
    'MULTI_TENANT': 'Multi-tenant support'
  };
  return descriptions[feature] || 'Unknown feature';
}
