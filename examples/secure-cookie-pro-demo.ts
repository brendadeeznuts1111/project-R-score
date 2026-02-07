#!/usr/bin/env bun

/**
 * SecureCookiePro Demo - Enterprise-Grade Security Practices
 * 
 * Demonstrates production-ready cookie security patterns
 * with comprehensive validation and audit capabilities
 */

import { SecureCookiePro, CookieInspector } from '../lib/telemetry/bun-cookie-inspector-v3';
import { Cookie } from '../lib/telemetry/bun-cookies-complete-v2';

console.log('🔐 SecureCookiePro - Enterprise Security Demo');
console.log('='.repeat(60));

// 🎯 DEMO 1: Create Secure Session Cookie
console.log('\n🛡️ DEMO 1: Create Unbreakable Session Cookie');
console.log('-'.repeat(50));

const sessionCookie = SecureCookiePro.createUnbreakableSession('user-12345');
console.log('✅ Session cookie created:');
console.log(`   Name: ${sessionCookie.name}`);
console.log(`   Value: ${sessionCookie.value.substring(0, 8)}... (UUID)`);
console.log(`   Secure: ${sessionCookie.secure}`);
console.log(`   HttpOnly: ${sessionCookie.httpOnly}`);
console.log(`   SameSite: ${sessionCookie.sameSite}`);
console.log(`   Path: ${sessionCookie.path}`);
console.log(`   MaxAge: ${sessionCookie.maxAge} seconds (${sessionCookie.maxAge! / 60} minutes)`);

// Validate the session cookie
const sessionValidation = SecureCookiePro.validateSecurity(sessionCookie);
console.log(`   Security Status: ${sessionValidation.isSecure ? '✅ Secure' : '❌ Insecure'}`);
if (sessionValidation.recommendations.length > 0) {
  console.log('   Recommendations:');
  sessionValidation.recommendations.forEach(rec => console.log(`     - ${rec}`));
}

// 🎯 DEMO 2: Session Refresh Pattern
console.log('\n🔄 DEMO 2: Session Refresh Pattern');
console.log('-'.repeat(50));

// Simulate an older session with 10 minutes remaining
const oldSession = new Cookie('__Host-session', crypto.randomUUID(), {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 600 // 10 minutes remaining
});

console.log('📅 Original session (10 minutes remaining):');
console.log(`   MaxAge: ${oldSession.maxAge} seconds`);

const refreshedSession = SecureCookiePro.refreshSession(oldSession);
console.log('🔄 Refreshed session:');
console.log(`   MaxAge: ${refreshedSession.maxAge} seconds`);
console.log(`   Extension: ${refreshedSession.maxAge! - oldSession.maxAge!} seconds`);
console.log(`   Total session time: ${Math.min(900, 3600)} seconds maximum`);

// 🎯 DEMO 3: Create Multiple Secure Cookies
console.log('\n🔐 DEMO 3: Create Multiple Secure Cookies');
console.log('-'.repeat(50));

const secureCookies = [
  SecureCookiePro.createUnbreakableSession('user-12345'),
  SecureCookiePro.createSecureAuth('jwt-token-abc123', 'user-12345'),
  SecureCookiePro.createCSRFToken(),
  SecureCookiePro.createAnalyticsCookie('ga-session-xyz'),
  SecureCookiePro.createPreferenceCookie({ theme: 'dark', language: 'en' })
];

secureCookies.forEach((cookie, index) => {
  const validation = SecureCookiePro.validateSecurity(cookie);
  console.log(`\n${index + 1}. ${cookie.name}:`);
  console.log(`   Type: ${getCookieType(cookie.name)}`);
  console.log(`   Security: ${validation.isSecure ? '✅' : '❌'}`);
  console.log(`   HttpOnly: ${cookie.httpOnly ? '🔒' : '📖'}`);
  console.log(`   SameSite: ${cookie.sameSite}`);
  console.log(`   MaxAge: ${cookie.maxAge ? formatDuration(cookie.maxAge) : 'Session'}`);
  
  if (validation.issues.length > 0) {
    console.log('   ❌ Issues:');
    validation.issues.forEach(issue => console.log(`     - ${issue}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.log('   💡 Recommendations:');
    validation.recommendations.slice(0, 2).forEach(rec => console.log(`     - ${rec}`));
  }
});

// 🎯 DEMO 4: Security Audit
console.log('\n🚨 DEMO 4: Comprehensive Security Audit');
console.log('-'.repeat(50));

const audit = SecureCookiePro.auditCookies(secureCookies);
console.log('📊 Security Audit Results:');
console.log(`   Total Cookies: ${audit.totalCookies}`);
console.log(`   Secure Cookies: ${audit.secureCookies}`);
console.log(`   Insecure Cookies: ${audit.insecureCookies}`);
console.log(`   Compliance Score: ${audit.complianceScore}%`);

if (audit.criticalIssues.length > 0) {
  console.log('\n🚨 Critical Issues:');
  audit.criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
} else {
  console.log('\n✅ No Critical Issues Found');
}

if (audit.recommendations.length > 0) {
  console.log('\n💡 Security Recommendations:');
  audit.recommendations.forEach(rec => console.log(`   💡 ${rec}`));
}

// 🎯 DEMO 5: Compare with Insecure Cookies
console.log('\n⚠️ DEMO 5: Insecure Cookie Detection');
console.log('-'.repeat(50));

const insecureCookies = [
  // Insecure session (missing httpOnly)
  new Cookie('session', 'insecure-value', {
    secure: true,
    sameSite: 'lax',
    maxAge: 3600
  }),
  
  // Insecure auth (missing secure)
  new Cookie('auth_token', 'secret-token', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1800
  }),
  
  // Invalid __Host- cookie (has domain)
  new Cookie('__Host-invalid', 'value', {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    domain: 'example.com', // ❌ Breaks __Host- protection
    maxAge: 900
  }),
  
  // Analytics without secure flag
  new Cookie('_ga_tracking', 'ga-id', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 * 2 // 2 years - too long for GDPR
  })
];

console.log('🔍 Analyzing Insecure Cookies:');
insecureCookies.forEach((cookie, index) => {
  const validation = SecureCookiePro.validateSecurity(cookie);
  console.log(`\n${index + 1}. ${cookie.name}:`);
  console.log(`   Status: ${validation.isSecure ? '✅ Secure' : '❌ Insecure'}`);
  
  if (validation.issues.length > 0) {
    console.log('   🚨 Issues:');
    validation.issues.forEach(issue => console.log(`     - ${issue}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.log('   💡 Recommendations:');
    validation.recommendations.forEach(rec => console.log(`     - ${rec}`));
  }
});

// 🎯 DEMO 6: Full Security Report
console.log('\n📋 DEMO 6: Full Security Report');
console.log('-'.repeat(50));

const allCookies = [...secureCookies, ...insecureCookies];
const fullAudit = SecureCookiePro.auditCookies(allCookies);

console.log('🔐 ENTERPRISE SECURITY REPORT');
console.log('='.repeat(40));
console.log(`📊 Total Cookies Analyzed: ${fullAudit.totalCookies}`);
console.log(`✅ Secure Cookies: ${fullAudit.secureCookies} (${Math.round(fullAudit.secureCookies / fullAudit.totalCookies * 100)}%)`);
console.log(`❌ Insecure Cookies: ${fullAudit.insecureCookies} (${Math.round(fullAudit.insecureCookies / fullAudit.totalCookies * 100)}%)`);
console.log(`🎯 Overall Compliance Score: ${fullAudit.complianceScore}%`);

// Security Grade
let securityGrade = 'A';
if (fullAudit.complianceScore < 80) securityGrade = 'B';
if (fullAudit.complianceScore < 70) securityGrade = 'C';
if (fullAudit.complianceScore < 60) securityGrade = 'D';
if (fullAudit.complianceScore < 50) securityGrade = 'F';

console.log(`🏆 Security Grade: ${securityGrade}`);

if (fullAudit.criticalIssues.length > 0) {
  console.log('\n🚨 CRITICAL SECURITY ISSUES:');
  fullAudit.criticalIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
}

if (fullAudit.recommendations.length > 0) {
  console.log('\n💡 SECURITY RECOMMENDATIONS:');
  fullAudit.recommendations.slice(0, 5).forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
  
  if (fullAudit.recommendations.length > 5) {
    console.log(`   ... and ${fullAudit.recommendations.length - 5} more recommendations`);
  }
}

// 🎯 DEMO 7: Integration with Cookie Inspector
console.log('\n🔗 DEMO 7: Integration with Cookie Inspector');
console.log('-'.repeat(50));

const inspectorAnalysis = CookieInspector.analyzeCookies(secureCookies);
console.log('📊 Cookie Inspector Analysis:');
console.log(`   Total Cookies: ${inspectorAnalysis.totalCookies}`);
console.log(`   Security Score: ${inspectorAnalysis.securityScore}%`);
console.log(`   Performance Score: ${inspectorAnalysis.performanceScore}%`);
console.log(`   Privacy Score: ${inspectorAnalysis.privacyScore}%`);

console.log('\n📂 Cookie Categories:');
Object.entries(inspectorAnalysis.categories).forEach(([category, count]) => {
  if (count > 0) {
    console.log(`   ${category}: ${count}`);
  }
});

// 🎯 SUMMARY
console.log('\n🎉 SecureCookiePro Demo Complete!');
console.log('='.repeat(60));
console.log('✅ Enterprise-grade security patterns demonstrated');
console.log('✅ Session management with refresh patterns');
console.log('✅ Multiple cookie types with proper security');
console.log('✅ Comprehensive security audit system');
console.log('✅ Insecure cookie detection and reporting');
console.log('✅ Integration with Cookie Inspector');
console.log('✅ Production-ready security recommendations');

console.log('\n🚀 Ready for enterprise deployment!');

// Helper functions
function getCookieType(name: string): string {
  if (name.includes('session')) return 'Session Cookie';
  if (name.includes('auth')) return 'Authentication Cookie';
  if (name.includes('csrf')) return 'CSRF Protection';
  if (name.includes('analytics') || name.startsWith('_ga')) return 'Analytics Cookie';
  if (name.includes('pref')) return 'Preference Cookie';
  return 'General Cookie';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Export for potential reuse
export { sessionCookie, secureCookies, audit, fullAudit };
