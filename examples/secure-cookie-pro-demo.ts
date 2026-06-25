#!/usr/bin/env bun

/**
 * SecureCookiePro Demo - Enterprise-Grade Security Practices
 * 
 * Demonstrates production-ready cookie security patterns
 * with comprehensive validation and audit capabilities
 */

import { SecureCookiePro, CookieInspector } from '../lib/telemetry/bun-cookie-inspector-v3';
import { Cookie } from '../lib/telemetry/bun-cookies-complete-v2';

console.info('🔐 SecureCookiePro - Enterprise Security Demo');
console.info('='.repeat(60));

// 🎯 DEMO 1: Create Secure Session Cookie
console.info('\n🛡️ DEMO 1: Create Unbreakable Session Cookie');
console.info('-'.repeat(50));

const sessionCookie = SecureCookiePro.createUnbreakableSession('user-12345');
console.info('✅ Session cookie created:');
console.info(`   Name: ${sessionCookie.name}`);
console.info(`   Value: ${sessionCookie.value.substring(0, 8)}... (UUID)`);
console.info(`   Secure: ${sessionCookie.secure}`);
console.info(`   HttpOnly: ${sessionCookie.httpOnly}`);
console.info(`   SameSite: ${sessionCookie.sameSite}`);
console.info(`   Path: ${sessionCookie.path}`);
console.info(`   MaxAge: ${sessionCookie.maxAge} seconds (${sessionCookie.maxAge! / 60} minutes)`);

// Validate the session cookie
const sessionValidation = SecureCookiePro.validateSecurity(sessionCookie);
console.info(`   Security Status: ${sessionValidation.isSecure ? '✅ Secure' : '❌ Insecure'}`);
if (sessionValidation.recommendations.length > 0) {
  console.info('   Recommendations:');
  sessionValidation.recommendations.forEach(rec => console.info(`     - ${rec}`));
}

// 🎯 DEMO 2: Session Refresh Pattern
console.info('\n🔄 DEMO 2: Session Refresh Pattern');
console.info('-'.repeat(50));

// Simulate an older session with 10 minutes remaining
const oldSession = new Cookie('__Host-session', crypto.randomUUID(), {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 600 // 10 minutes remaining
});

console.info('📅 Original session (10 minutes remaining):');
console.info(`   MaxAge: ${oldSession.maxAge} seconds`);

const refreshedSession = SecureCookiePro.refreshSession(oldSession);
console.info('🔄 Refreshed session:');
console.info(`   MaxAge: ${refreshedSession.maxAge} seconds`);
console.info(`   Extension: ${refreshedSession.maxAge! - oldSession.maxAge!} seconds`);
console.info(`   Total session time: ${Math.min(900, 3600)} seconds maximum`);

// 🎯 DEMO 3: Create Multiple Secure Cookies
console.info('\n🔐 DEMO 3: Create Multiple Secure Cookies');
console.info('-'.repeat(50));

const secureCookies = [
  SecureCookiePro.createUnbreakableSession('user-12345'),
  SecureCookiePro.createSecureAuth('jwt-token-abc123', 'user-12345'),
  SecureCookiePro.createCSRFToken(),
  SecureCookiePro.createAnalyticsCookie('ga-session-xyz'),
  SecureCookiePro.createPreferenceCookie({ theme: 'dark', language: 'en' })
];

secureCookies.forEach((cookie, index) => {
  const validation = SecureCookiePro.validateSecurity(cookie);
  console.info(`\n${index + 1}. ${cookie.name}:`);
  console.info(`   Type: ${getCookieType(cookie.name)}`);
  console.info(`   Security: ${validation.isSecure ? '✅' : '❌'}`);
  console.info(`   HttpOnly: ${cookie.httpOnly ? '🔒' : '📖'}`);
  console.info(`   SameSite: ${cookie.sameSite}`);
  console.info(`   MaxAge: ${cookie.maxAge ? formatDuration(cookie.maxAge) : 'Session'}`);
  
  if (validation.issues.length > 0) {
    console.info('   ❌ Issues:');
    validation.issues.forEach(issue => console.info(`     - ${issue}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.info('   💡 Recommendations:');
    validation.recommendations.slice(0, 2).forEach(rec => console.info(`     - ${rec}`));
  }
});

// 🎯 DEMO 4: Security Audit
console.info('\n🚨 DEMO 4: Comprehensive Security Audit');
console.info('-'.repeat(50));

const audit = SecureCookiePro.auditCookies(secureCookies);
console.info('📊 Security Audit Results:');
console.info(`   Total Cookies: ${audit.totalCookies}`);
console.info(`   Secure Cookies: ${audit.secureCookies}`);
console.info(`   Insecure Cookies: ${audit.insecureCookies}`);
console.info(`   Compliance Score: ${audit.complianceScore}%`);

if (audit.criticalIssues.length > 0) {
  console.info('\n🚨 Critical Issues:');
  audit.criticalIssues.forEach(issue => console.info(`   ❌ ${issue}`));
} else {
  console.info('\n✅ No Critical Issues Found');
}

if (audit.recommendations.length > 0) {
  console.info('\n💡 Security Recommendations:');
  audit.recommendations.forEach(rec => console.info(`   💡 ${rec}`));
}

// 🎯 DEMO 5: Compare with Insecure Cookies
console.info('\n⚠️ DEMO 5: Insecure Cookie Detection');
console.info('-'.repeat(50));

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

console.info('🔍 Analyzing Insecure Cookies:');
insecureCookies.forEach((cookie, index) => {
  const validation = SecureCookiePro.validateSecurity(cookie);
  console.info(`\n${index + 1}. ${cookie.name}:`);
  console.info(`   Status: ${validation.isSecure ? '✅ Secure' : '❌ Insecure'}`);
  
  if (validation.issues.length > 0) {
    console.info('   🚨 Issues:');
    validation.issues.forEach(issue => console.info(`     - ${issue}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.info('   💡 Recommendations:');
    validation.recommendations.forEach(rec => console.info(`     - ${rec}`));
  }
});

// 🎯 DEMO 6: Full Security Report
console.info('\n📋 DEMO 6: Full Security Report');
console.info('-'.repeat(50));

const allCookies = [...secureCookies, ...insecureCookies];
const fullAudit = SecureCookiePro.auditCookies(allCookies);

console.info('🔐 ENTERPRISE SECURITY REPORT');
console.info('='.repeat(40));
console.info(`📊 Total Cookies Analyzed: ${fullAudit.totalCookies}`);
console.info(`✅ Secure Cookies: ${fullAudit.secureCookies} (${Math.round(fullAudit.secureCookies / fullAudit.totalCookies * 100)}%)`);
console.info(`❌ Insecure Cookies: ${fullAudit.insecureCookies} (${Math.round(fullAudit.insecureCookies / fullAudit.totalCookies * 100)}%)`);
console.info(`🎯 Overall Compliance Score: ${fullAudit.complianceScore}%`);

// Security Grade
let securityGrade = 'A';
if (fullAudit.complianceScore < 80) securityGrade = 'B';
if (fullAudit.complianceScore < 70) securityGrade = 'C';
if (fullAudit.complianceScore < 60) securityGrade = 'D';
if (fullAudit.complianceScore < 50) securityGrade = 'F';

console.info(`🏆 Security Grade: ${securityGrade}`);

if (fullAudit.criticalIssues.length > 0) {
  console.info('\n🚨 CRITICAL SECURITY ISSUES:');
  fullAudit.criticalIssues.forEach((issue, i) => {
    console.info(`   ${i + 1}. ${issue}`);
  });
}

if (fullAudit.recommendations.length > 0) {
  console.info('\n💡 SECURITY RECOMMENDATIONS:');
  fullAudit.recommendations.slice(0, 5).forEach((rec, i) => {
    console.info(`   ${i + 1}. ${rec}`);
  });
  
  if (fullAudit.recommendations.length > 5) {
    console.info(`   ... and ${fullAudit.recommendations.length - 5} more recommendations`);
  }
}

// 🎯 DEMO 7: Integration with Cookie Inspector
console.info('\n🔗 DEMO 7: Integration with Cookie Inspector');
console.info('-'.repeat(50));

const inspectorAnalysis = CookieInspector.analyzeCookies(secureCookies);
console.info('📊 Cookie Inspector Analysis:');
console.info(`   Total Cookies: ${inspectorAnalysis.totalCookies}`);
console.info(`   Security Score: ${inspectorAnalysis.securityScore}%`);
console.info(`   Performance Score: ${inspectorAnalysis.performanceScore}%`);
console.info(`   Privacy Score: ${inspectorAnalysis.privacyScore}%`);

console.info('\n📂 Cookie Categories:');
Object.entries(inspectorAnalysis.categories).forEach(([category, count]) => {
  if (count > 0) {
    console.info(`   ${category}: ${count}`);
  }
});

// 🎯 SUMMARY
console.info('\n🎉 SecureCookiePro Demo Complete!');
console.info('='.repeat(60));
console.info('✅ Enterprise-grade security patterns demonstrated');
console.info('✅ Session management with refresh patterns');
console.info('✅ Multiple cookie types with proper security');
console.info('✅ Comprehensive security audit system');
console.info('✅ Insecure cookie detection and reporting');
console.info('✅ Integration with Cookie Inspector');
console.info('✅ Production-ready security recommendations');

console.info('\n🚀 Ready for enterprise deployment!');

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
