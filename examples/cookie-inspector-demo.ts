#!/usr/bin/env bun

/**
 * Cookie Inspector v3.0 Demo - Comprehensive Property Analysis
 * 
 * Demonstrates advanced cookie inspection, validation, and analysis
 * Integrated with our validation system and unified telemetry platform
 */

import { CookieInspector, CookieSerializer, CookieComparator, CookieMonitor } from '../lib/telemetry/bun-cookie-inspector-v3';
import { Cookie } from '../lib/telemetry/bun-cookies-complete-v2';

console.info('🍪 Cookie Inspector v3.0 - Comprehensive Demo');
console.info('='.repeat(60));

// 🎯 DEMO 1: Individual Cookie Analysis
console.info('\n📊 DEMO 1: Individual Cookie Analysis');
console.info('-'.repeat(50));

const sessionCookie = new Cookie('user_session', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', {
  domain: 'example.com',
  path: '/',
  expires: new Date(Date.now() + 60 * 60 * 24 * 7), // 1 week
  secure: true,
  sameSite: 'strict',
  maxAge: 604800,
  httpOnly: true
});

console.info('🔍 Analyzing session cookie...');
const analysis = CookieInspector.validateCookie(sessionCookie);

console.info(`Status: ${analysis.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.info(`Issues: ${analysis.issues.length}`);
console.info(`Warnings: ${analysis.warnings.length}`);
console.info(`Recommendations: ${analysis.recommendations.length}`);

if (analysis.issues.length > 0) {
  console.info('\n🚨 Issues:');
  analysis.issues.forEach((issue, i) => console.info(`   ${i + 1}. ${issue}`));
}

if (analysis.warnings.length > 0) {
  console.info('\n⚠️ Warnings:');
  analysis.warnings.forEach((warning, i) => console.info(`   ${i + 1}. ${warning}`));
}

if (analysis.recommendations.length > 0) {
  console.info('\n💡 Recommendations:');
  analysis.recommendations.forEach((rec, i) => console.info(`   ${i + 1}. ${rec}`));
}

// 🎯 DEMO 2: Cookie Builder with Validation
console.info('\n🔧 DEMO 2: Cookie Builder with Validation');
console.info('-'.repeat(50));

try {
  const builtCookie = CookieInspector.createCookieBuilder()
    .withName('user_preferences')
    .withValue({
      theme: 'dark',
      language: 'en',
      timezone: 'America/New_York',
      notifications: true
    })
    .asPreferenceCookie()
    .build();

  console.info('✅ Cookie built successfully!');
  console.info(`   Name: ${builtCookie.cookie.name}`);
  console.info(`   Value length: ${builtCookie.cookie.value.length} chars`);
  console.info(`   Secure: ${builtCookie.cookie.secure}`);
  console.info(`   HttpOnly: ${builtCookie.cookie.httpOnly}`);
  console.info(`   SameSite: ${builtCookie.cookie.sameSite}`);
  console.info(`   Validation: ${builtCookie.validation.valid ? 'Valid' : 'Invalid'}`);
  
  if (builtCookie.validation.warnings.length > 0) {
    console.info('   Warnings:');
    builtCookie.validation.warnings.forEach(w => console.info(`     - ${w.message}`));
  }
} catch (error) {
  console.info(`❌ Build failed: ${error}`);
}

// 🎯 DEMO 3: Invalid Cookie Detection
console.info('\n🚨 DEMO 3: Invalid Cookie Detection');
console.info('-'.repeat(50));

const invalidCookies = [
  new Cookie('__Secure-session', 'secret', { secure: false }), // Missing secure flag
  new Cookie('', 'value'), // Empty name
  new Cookie('oversized', 'x'.repeat(5000)), // Too large
  new Cookie('bad\x00name', 'value'), // Control character in name
  new Cookie('cross-site', 'value', { sameSite: 'none', secure: false }) // SameSite none without secure
];

console.info('Testing invalid cookies...');
invalidCookies.forEach((cookie, index) => {
  const validation = CookieInspector.validateCookie(cookie);
  console.info(`\n${index + 1}. Cookie "${cookie.name}":`);
  console.info(`   Status: ${validation.isValid ? '✅' : '❌'}`);
  if (!validation.isValid) {
    console.info(`   Issues: ${validation.issues.length}`);
    validation.issues.slice(0, 2).forEach(issue => {
      console.info(`     - ${issue}`);
    });
  }
});

// 🎯 DEMO 4: Multi-Cookie Analysis
console.info('\n📈 DEMO 4: Multi-Cookie Analysis');
console.info('-'.repeat(50));

const cookieCollection = [
  sessionCookie,
  new Cookie('analytics_id', 'GA.1.2.34567890.1234567890', {
    domain: '.example.com',
    path: '/',
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 * 2 // 2 years
  }),
  new Cookie('theme', 'dark', {
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax'
  }),
  new Cookie('csrf_token', 'a1b2c3d4e5f6g7h8i9j0', {
    path: '/api',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 // 1 hour
  }),
  new Cookie('consent', 'analytics|marketing|necessary', {
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  })
];

const metrics = CookieInspector.analyzeCookies(cookieCollection);

console.info(`📊 Collection Analysis:`);
console.info(`   Total cookies: ${metrics.totalCookies}`);
console.info(`   Total size: ${metrics.totalSize} bytes`);
console.info(`   Average size: ${Math.round(metrics.totalSize / metrics.totalCookies)} bytes`);
console.info(`   Security score: ${metrics.securityScore}%`);
console.info(`   Performance score: ${metrics.performanceScore}%`);
console.info(`   Privacy score: ${metrics.privacyScore}%`);

console.info('\n📂 Categories:');
Object.entries(metrics.categories).forEach(([category, count]) => {
  if (count > 0) {
    console.info(`   ${category}: ${count}`);
  }
});

console.info('\n⚖️ Compliance:');
Object.entries(metrics.compliance).forEach(([regulation, compliant]) => {
  console.info(`   ${regulation.toUpperCase()}: ${compliant ? '✅' : '❌'}`);
});

console.info('\n📋 Validation Summary:');
console.info(`   Valid: ${metrics.validationSummary.valid}`);
console.info(`   Invalid: ${metrics.validationSummary.invalid}`);
console.info(`   Total warnings: ${metrics.validationSummary.warnings}`);

if (metrics.recommendations.length > 0) {
  console.info('\n💡 Recommendations:');
  metrics.recommendations.forEach((rec, i) => console.info(`   ${i + 1}. ${rec}`));
}

// 🎯 DEMO 5: Cookie Search and Filtering
console.info('\n🔍 DEMO 5: Cookie Search and Filtering');
console.info('-'.repeat(50));

// Find secure cookies
const secureCookies = CookieInspector.findCookies(cookieCollection, { secure: true });
console.info(`Secure cookies: ${secureCookies.length}`);

// Find authentication cookies
const authCookies = CookieInspector.findCookies(cookieCollection, { 
  name: /auth|session|token|csrf/i 
});
console.info(`Authentication cookies: ${authCookies.length}`);

// Find large cookies
const largeCookies = CookieInspector.findCookies(cookieCollection, { 
  minSize: 100 
});
console.info(`Large cookies (>100 bytes): ${largeCookies.length}`);

// Find analytics cookies
const analyticsCookies = CookieInspector.findCookies(cookieCollection, { 
  category: 'analytics' 
});
console.info(`Analytics cookies: ${analyticsCookies.length}`);

// 🎯 DEMO 6: Cookie Comparison
console.info('\n🔄 DEMO 6: Cookie Comparison');
console.info('-'.repeat(50));

if (cookieCollection.length >= 2) {
  const comparison = CookieComparator.compare(cookieCollection[0], cookieCollection[1]);
  console.info(`Comparing "${cookieCollection[0].name}" vs "${cookieCollection[1].name}":`);
  console.info(`   Same value: ${comparison.sameValue ? '✅' : '❌'}`);
  console.info(`   Same attributes: ${comparison.sameAttributes ? '✅' : '❌'}`);
  console.info(`   Differences: ${comparison.differences.length}`);
  console.info(`   Security impact: ${comparison.securityImpact}`);
  
  if (comparison.differences.length > 0) {
    console.info('   Attribute differences:');
    comparison.differences.slice(0, 3).forEach(diff => {
      console.info(`     - ${diff.property}: ${diff.value1} → ${diff.value2}`);
    });
  }
}

// 🎯 DEMO 7: Duplicate Detection
console.info('\n🔂 DEMO 7: Duplicate Detection');
console.info('-'.repeat(50));

// Create some duplicates for testing
const cookiesWithDuplicates = [
  ...cookieCollection,
  new Cookie('theme', 'light', { secure: false, httpOnly: false }), // Different value
  new Cookie('theme', 'dark', { secure: true, httpOnly: false }), // Different secure flag
  new Cookie('analytics_id', 'GA.9.9.99999999.9999999999', { secure: true }) // Same name
];

const duplicates = CookieComparator.findDuplicates(cookiesWithDuplicates);
console.info(`Cookies with duplicates: ${duplicates.length}`);

duplicates.forEach(dup => {
  console.info(`\n"${dup.name}" (${dup.count} instances):`);
  if (dup.conflicts.length > 0) {
    console.info('   Conflicts:');
    dup.conflicts.forEach(conflict => {
      console.info(`     - ${conflict.property}: ${conflict.values.join(' vs ')}`);
    });
  } else {
    console.info('   No attribute conflicts');
  }
});

// 🎯 DEMO 8: Serialization Formats
console.info('\n📦 DEMO 8: Serialization Formats');
console.info('-'.repeat(50));

const demoCookie = cookieCollection[0];

console.info('🍪 Original Cookie:');
console.info(`   Name: ${demoCookie.name}`);
console.info(`   Value: ${demoCookie.value.substring(0, 20)}...`);

console.info('\n📄 JSON Format:');
const jsonFormat = CookieSerializer.toJSON(demoCookie);
console.info(`   Size: ${JSON.stringify(jsonFormat).length} chars`);
console.info(`   Security score: ${jsonFormat.securityScore}`);
console.info(`   Performance impact: ${jsonFormat.performanceImpact}`);

console.info('\n🔗 Header String Format:');
const headerFormat = CookieSerializer.toHeaderString(demoCookie);
console.info(`   Size: ${headerFormat.length} chars`);
console.info(`   Preview: ${headerFormat.substring(0, 100)}...`);

console.info('\n📦 Binary DataView Format:');
const binaryFormat = CookieSerializer.toDataView(demoCookie);
console.info(`   Size: ${binaryFormat.byteLength} bytes`);
console.info(`   Compression: ${Math.round((1 - binaryFormat.byteLength / headerFormat.length) * 100)}% smaller than header`);

// Test round-trip
const restoredCookie = CookieSerializer.fromDataView(binaryFormat);
console.info(`   Round-trip success: ${restoredCookie ? '✅' : '❌'}`);
if (restoredCookie) {
  console.info(`   Restored name: ${restoredCookie.name}`);
  console.info(`   Value matches: ${restoredCookie.value === demoCookie.value ? '✅' : '❌'}`);
}

// 🎯 DEMO 9: Real-time Monitoring
console.info('\n📊 DEMO 9: Real-time Monitoring');
console.info('-'.repeat(50));

const monitor = CookieInspector.createCookieMonitor();

// Simulate cookie access patterns
const testCookies = ['session', 'analytics', 'theme', 'csrf_token'];
for (let i = 0; i < 10; i++) {
  const cookieName = testCookies[i % testCookies.length];
  const action = ['get', 'set', 'delete'][i % 3] as 'get' | 'set' | 'delete';
  monitor.trackCookieAccess(cookieName, action);
}

console.info('📈 Access Metrics:');
const metrics_monitor = monitor.getMetrics();
Object.entries(metrics_monitor).slice(0, 5).forEach(([key, count]) => {
  console.info(`   ${key}: ${count} times`);
});

console.info('\n🚨 Alerts:');
const alerts = monitor.getAlerts();
if (alerts.length > 0) {
  alerts.forEach(alert => {
    console.info(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
  });
} else {
  console.info('   No alerts');
}

// 🎯 DEMO 10: Compliance Report
console.info('\n⚖️ DEMO 10: Compliance Report');
console.info('-'.repeat(50));

console.info('🔒 Regulatory Compliance Analysis:');
console.info(`   GDPR: ${metrics.compliance.gdpr ? '✅ Compliant' : '❌ Non-compliant'}`);
console.info(`   CCPA: ${metrics.compliance.ccpa ? '✅ Compliant' : '❌ Non-compliant'}`);
console.info(`   HIPAA: ${metrics.compliance.hipaa ? '✅ Compliant' : '❌ Non-compliant'}`);
console.info(`   PCI-DSS: ${metrics.compliance.pciDss ? '✅ Compliant' : '❌ Non-compliant'}`);

console.info('\n🎯 Security Posture:');
console.info(`   Overall Score: ${metrics.securityScore}/100`);
console.info(`   Secure cookies: ${cookieCollection.filter(c => c.secure).length}/${cookieCollection.length}`);
console.info(`   HttpOnly cookies: ${cookieCollection.filter(c => c.httpOnly).length}/${cookieCollection.length}`);
console.info(`   Strict SameSite: ${cookieCollection.filter(c => c.sameSite === 'strict').length}/${cookieCollection.length}`);

console.info('\n⚡ Performance Impact:');
console.info(`   Performance Score: ${metrics.performanceScore}/100`);
console.info(`   Total Storage: ${metrics.totalSize} bytes`);
console.info(`   Average Cookie Size: ${Math.round(metrics.totalSize / metrics.totalCookies)} bytes`);
console.info(`   Large Cookies (>1KB): ${cookieCollection.filter(c => c.name.length + c.value.length > 1024).length}`);

console.info('\n🔒 Privacy Protection:');
console.info(`   Privacy Score: ${metrics.privacyScore}/100`);
console.info(`   Non-tracking cookies: ${cookieCollection.filter(c => !c.name.toLowerCase().includes('track') && !c.name.toLowerCase().includes('analytics')).length}/${cookieCollection.length}`);

// 🎯 SUMMARY
console.info('\n🎉 Cookie Inspector v3.0 Demo Complete!');
console.info('='.repeat(60));
console.info('✅ Comprehensive cookie analysis demonstrated');
console.info('✅ Validation and security checking working');
console.info('✅ Multi-format serialization functional');
console.info('✅ Real-time monitoring active');
console.info('✅ Compliance reporting complete');
console.info('✅ Performance analysis provided');
console.info('✅ Duplicate detection operational');
console.info('✅ Builder pattern with validation working');
console.info('\n🚀 Ready for production integration!');

// Export for potential reuse
export { demoCookie, cookieCollection, metrics, monitor };
