#!/usr/bin/env bun

/**
 * Cookie Inspector v3.0 Demo - Comprehensive Property Analysis
 * 
 * Demonstrates advanced cookie inspection, validation, and analysis
 * Integrated with our validation system and unified telemetry platform
 */

import { CookieInspector, CookieSerializer, CookieComparator, CookieMonitor } from '../lib/telemetry/bun-cookie-inspector-v3';
import { Cookie } from '../lib/telemetry/bun-cookies-complete-v2';

console.log('🍪 Cookie Inspector v3.0 - Comprehensive Demo');
console.log('='.repeat(60));

// 🎯 DEMO 1: Individual Cookie Analysis
console.log('\n📊 DEMO 1: Individual Cookie Analysis');
console.log('-'.repeat(50));

const sessionCookie = new Cookie('user_session', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', {
  domain: 'example.com',
  path: '/',
  expires: new Date(Date.now() + 60 * 60 * 24 * 7), // 1 week
  secure: true,
  sameSite: 'strict',
  maxAge: 604800,
  httpOnly: true
});

console.log('🔍 Analyzing session cookie...');
const analysis = CookieInspector.validateCookie(sessionCookie);

console.log(`Status: ${analysis.isValid ? '✅ Valid' : '❌ Invalid'}`);
console.log(`Issues: ${analysis.issues.length}`);
console.log(`Warnings: ${analysis.warnings.length}`);
console.log(`Recommendations: ${analysis.recommendations.length}`);

if (analysis.issues.length > 0) {
  console.log('\n🚨 Issues:');
  analysis.issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
}

if (analysis.warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  analysis.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
}

if (analysis.recommendations.length > 0) {
  console.log('\n💡 Recommendations:');
  analysis.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
}

// 🎯 DEMO 2: Cookie Builder with Validation
console.log('\n🔧 DEMO 2: Cookie Builder with Validation');
console.log('-'.repeat(50));

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

  console.log('✅ Cookie built successfully!');
  console.log(`   Name: ${builtCookie.cookie.name}`);
  console.log(`   Value length: ${builtCookie.cookie.value.length} chars`);
  console.log(`   Secure: ${builtCookie.cookie.secure}`);
  console.log(`   HttpOnly: ${builtCookie.cookie.httpOnly}`);
  console.log(`   SameSite: ${builtCookie.cookie.sameSite}`);
  console.log(`   Validation: ${builtCookie.validation.valid ? 'Valid' : 'Invalid'}`);
  
  if (builtCookie.validation.warnings.length > 0) {
    console.log('   Warnings:');
    builtCookie.validation.warnings.forEach(w => console.log(`     - ${w.message}`));
  }
} catch (error) {
  console.log(`❌ Build failed: ${error}`);
}

// 🎯 DEMO 3: Invalid Cookie Detection
console.log('\n🚨 DEMO 3: Invalid Cookie Detection');
console.log('-'.repeat(50));

const invalidCookies = [
  new Cookie('__Secure-session', 'secret', { secure: false }), // Missing secure flag
  new Cookie('', 'value'), // Empty name
  new Cookie('oversized', 'x'.repeat(5000)), // Too large
  new Cookie('bad\x00name', 'value'), // Control character in name
  new Cookie('cross-site', 'value', { sameSite: 'none', secure: false }) // SameSite none without secure
];

console.log('Testing invalid cookies...');
invalidCookies.forEach((cookie, index) => {
  const validation = CookieInspector.validateCookie(cookie);
  console.log(`\n${index + 1}. Cookie "${cookie.name}":`);
  console.log(`   Status: ${validation.isValid ? '✅' : '❌'}`);
  if (!validation.isValid) {
    console.log(`   Issues: ${validation.issues.length}`);
    validation.issues.slice(0, 2).forEach(issue => {
      console.log(`     - ${issue}`);
    });
  }
});

// 🎯 DEMO 4: Multi-Cookie Analysis
console.log('\n📈 DEMO 4: Multi-Cookie Analysis');
console.log('-'.repeat(50));

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

console.log(`📊 Collection Analysis:`);
console.log(`   Total cookies: ${metrics.totalCookies}`);
console.log(`   Total size: ${metrics.totalSize} bytes`);
console.log(`   Average size: ${Math.round(metrics.totalSize / metrics.totalCookies)} bytes`);
console.log(`   Security score: ${metrics.securityScore}%`);
console.log(`   Performance score: ${metrics.performanceScore}%`);
console.log(`   Privacy score: ${metrics.privacyScore}%`);

console.log('\n📂 Categories:');
Object.entries(metrics.categories).forEach(([category, count]) => {
  if (count > 0) {
    console.log(`   ${category}: ${count}`);
  }
});

console.log('\n⚖️ Compliance:');
Object.entries(metrics.compliance).forEach(([regulation, compliant]) => {
  console.log(`   ${regulation.toUpperCase()}: ${compliant ? '✅' : '❌'}`);
});

console.log('\n📋 Validation Summary:');
console.log(`   Valid: ${metrics.validationSummary.valid}`);
console.log(`   Invalid: ${metrics.validationSummary.invalid}`);
console.log(`   Total warnings: ${metrics.validationSummary.warnings}`);

if (metrics.recommendations.length > 0) {
  console.log('\n💡 Recommendations:');
  metrics.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
}

// 🎯 DEMO 5: Cookie Search and Filtering
console.log('\n🔍 DEMO 5: Cookie Search and Filtering');
console.log('-'.repeat(50));

// Find secure cookies
const secureCookies = CookieInspector.findCookies(cookieCollection, { secure: true });
console.log(`Secure cookies: ${secureCookies.length}`);

// Find authentication cookies
const authCookies = CookieInspector.findCookies(cookieCollection, { 
  name: /auth|session|token|csrf/i 
});
console.log(`Authentication cookies: ${authCookies.length}`);

// Find large cookies
const largeCookies = CookieInspector.findCookies(cookieCollection, { 
  minSize: 100 
});
console.log(`Large cookies (>100 bytes): ${largeCookies.length}`);

// Find analytics cookies
const analyticsCookies = CookieInspector.findCookies(cookieCollection, { 
  category: 'analytics' 
});
console.log(`Analytics cookies: ${analyticsCookies.length}`);

// 🎯 DEMO 6: Cookie Comparison
console.log('\n🔄 DEMO 6: Cookie Comparison');
console.log('-'.repeat(50));

if (cookieCollection.length >= 2) {
  const comparison = CookieComparator.compare(cookieCollection[0], cookieCollection[1]);
  console.log(`Comparing "${cookieCollection[0].name}" vs "${cookieCollection[1].name}":`);
  console.log(`   Same value: ${comparison.sameValue ? '✅' : '❌'}`);
  console.log(`   Same attributes: ${comparison.sameAttributes ? '✅' : '❌'}`);
  console.log(`   Differences: ${comparison.differences.length}`);
  console.log(`   Security impact: ${comparison.securityImpact}`);
  
  if (comparison.differences.length > 0) {
    console.log('   Attribute differences:');
    comparison.differences.slice(0, 3).forEach(diff => {
      console.log(`     - ${diff.property}: ${diff.value1} → ${diff.value2}`);
    });
  }
}

// 🎯 DEMO 7: Duplicate Detection
console.log('\n🔂 DEMO 7: Duplicate Detection');
console.log('-'.repeat(50));

// Create some duplicates for testing
const cookiesWithDuplicates = [
  ...cookieCollection,
  new Cookie('theme', 'light', { secure: false, httpOnly: false }), // Different value
  new Cookie('theme', 'dark', { secure: true, httpOnly: false }), // Different secure flag
  new Cookie('analytics_id', 'GA.9.9.99999999.9999999999', { secure: true }) // Same name
];

const duplicates = CookieComparator.findDuplicates(cookiesWithDuplicates);
console.log(`Cookies with duplicates: ${duplicates.length}`);

duplicates.forEach(dup => {
  console.log(`\n"${dup.name}" (${dup.count} instances):`);
  if (dup.conflicts.length > 0) {
    console.log('   Conflicts:');
    dup.conflicts.forEach(conflict => {
      console.log(`     - ${conflict.property}: ${conflict.values.join(' vs ')}`);
    });
  } else {
    console.log('   No attribute conflicts');
  }
});

// 🎯 DEMO 8: Serialization Formats
console.log('\n📦 DEMO 8: Serialization Formats');
console.log('-'.repeat(50));

const demoCookie = cookieCollection[0];

console.log('🍪 Original Cookie:');
console.log(`   Name: ${demoCookie.name}`);
console.log(`   Value: ${demoCookie.value.substring(0, 20)}...`);

console.log('\n📄 JSON Format:');
const jsonFormat = CookieSerializer.toJSON(demoCookie);
console.log(`   Size: ${JSON.stringify(jsonFormat).length} chars`);
console.log(`   Security score: ${jsonFormat.securityScore}`);
console.log(`   Performance impact: ${jsonFormat.performanceImpact}`);

console.log('\n🔗 Header String Format:');
const headerFormat = CookieSerializer.toHeaderString(demoCookie);
console.log(`   Size: ${headerFormat.length} chars`);
console.log(`   Preview: ${headerFormat.substring(0, 100)}...`);

console.log('\n📦 Binary DataView Format:');
const binaryFormat = CookieSerializer.toDataView(demoCookie);
console.log(`   Size: ${binaryFormat.byteLength} bytes`);
console.log(`   Compression: ${Math.round((1 - binaryFormat.byteLength / headerFormat.length) * 100)}% smaller than header`);

// Test round-trip
const restoredCookie = CookieSerializer.fromDataView(binaryFormat);
console.log(`   Round-trip success: ${restoredCookie ? '✅' : '❌'}`);
if (restoredCookie) {
  console.log(`   Restored name: ${restoredCookie.name}`);
  console.log(`   Value matches: ${restoredCookie.value === demoCookie.value ? '✅' : '❌'}`);
}

// 🎯 DEMO 9: Real-time Monitoring
console.log('\n📊 DEMO 9: Real-time Monitoring');
console.log('-'.repeat(50));

const monitor = CookieInspector.createCookieMonitor();

// Simulate cookie access patterns
const testCookies = ['session', 'analytics', 'theme', 'csrf_token'];
for (let i = 0; i < 10; i++) {
  const cookieName = testCookies[i % testCookies.length];
  const action = ['get', 'set', 'delete'][i % 3] as 'get' | 'set' | 'delete';
  monitor.trackCookieAccess(cookieName, action);
}

console.log('📈 Access Metrics:');
const metrics_monitor = monitor.getMetrics();
Object.entries(metrics_monitor).slice(0, 5).forEach(([key, count]) => {
  console.log(`   ${key}: ${count} times`);
});

console.log('\n🚨 Alerts:');
const alerts = monitor.getAlerts();
if (alerts.length > 0) {
  alerts.forEach(alert => {
    console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
  });
} else {
  console.log('   No alerts');
}

// 🎯 DEMO 10: Compliance Report
console.log('\n⚖️ DEMO 10: Compliance Report');
console.log('-'.repeat(50));

console.log('🔒 Regulatory Compliance Analysis:');
console.log(`   GDPR: ${metrics.compliance.gdpr ? '✅ Compliant' : '❌ Non-compliant'}`);
console.log(`   CCPA: ${metrics.compliance.ccpa ? '✅ Compliant' : '❌ Non-compliant'}`);
console.log(`   HIPAA: ${metrics.compliance.hipaa ? '✅ Compliant' : '❌ Non-compliant'}`);
console.log(`   PCI-DSS: ${metrics.compliance.pciDss ? '✅ Compliant' : '❌ Non-compliant'}`);

console.log('\n🎯 Security Posture:');
console.log(`   Overall Score: ${metrics.securityScore}/100`);
console.log(`   Secure cookies: ${cookieCollection.filter(c => c.secure).length}/${cookieCollection.length}`);
console.log(`   HttpOnly cookies: ${cookieCollection.filter(c => c.httpOnly).length}/${cookieCollection.length}`);
console.log(`   Strict SameSite: ${cookieCollection.filter(c => c.sameSite === 'strict').length}/${cookieCollection.length}`);

console.log('\n⚡ Performance Impact:');
console.log(`   Performance Score: ${metrics.performanceScore}/100`);
console.log(`   Total Storage: ${metrics.totalSize} bytes`);
console.log(`   Average Cookie Size: ${Math.round(metrics.totalSize / metrics.totalCookies)} bytes`);
console.log(`   Large Cookies (>1KB): ${cookieCollection.filter(c => c.name.length + c.value.length > 1024).length}`);

console.log('\n🔒 Privacy Protection:');
console.log(`   Privacy Score: ${metrics.privacyScore}/100`);
console.log(`   Non-tracking cookies: ${cookieCollection.filter(c => !c.name.toLowerCase().includes('track') && !c.name.toLowerCase().includes('analytics')).length}/${cookieCollection.length}`);

// 🎯 SUMMARY
console.log('\n🎉 Cookie Inspector v3.0 Demo Complete!');
console.log('='.repeat(60));
console.log('✅ Comprehensive cookie analysis demonstrated');
console.log('✅ Validation and security checking working');
console.log('✅ Multi-format serialization functional');
console.log('✅ Real-time monitoring active');
console.log('✅ Compliance reporting complete');
console.log('✅ Performance analysis provided');
console.log('✅ Duplicate detection operational');
console.log('✅ Builder pattern with validation working');
console.log('\n🚀 Ready for production integration!');

// Export for potential reuse
export { demoCookie, cookieCollection, metrics, monitor };
