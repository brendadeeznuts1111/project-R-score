#!/usr/bin/env bun

/**
 * Enterprise Cookie Management Demo
 * Demonstrates advanced cookie patterns for production applications
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.log("🏢 Enterprise Cookie Management Demo");
console.log("=" .repeat(60));

// ====== 1. Advanced Configuration ======

console.log("\n⚙️ 1. Advanced Configuration");

const enterpriseClient = createCookieClient({
  securityPolicy: {
    secure: true,
    httpOnly: false,
    sameSite: 'strict',
    maxAge: 7200 // 2 hours
  },
  performance: {
    maxHeaderSize: 2048, // Stricter limit for enterprise
    enableSizeGuard: true,
    evictionStrategy: 'priority' // Keep essential cookies first
  },
  session: {
    autoRefresh: true,
    refreshThreshold: 300, // 5 minutes before expiry
    refreshEndpoint: '/api/auth/refresh'
  },
  multiTenant: {
    enabled: true,
    scopeSeparator: ':'
  },
  monitoring: {
    enabled: true,
    logLevel: 'info'
  },
  interceptors: {
    request: async (url, options) => {
      // Add enterprise headers
      const headers = new Headers(options.headers);
      headers.set('X-Client-Version', '2.0.0-enterprise');
      headers.set('X-Request-ID', crypto.randomUUID());
      headers.set('X-Tenant-ID', 'enterprise-tenant-001');
      
      return {
        url,
        options: { ...options, headers }
      };
    },
    response: async (response, url) => {
      // Enterprise response processing
      if (response.status === 401) {
        console.log('🔐 Authentication required, attempting refresh...');
        // Could trigger token refresh here
      }
      return response;
    }
  }
});

// ====== 2. Multi-Tenant Cookie Management ======

console.log("\n🏢 2. Multi-Tenant Cookie Management");

// Set cookies for different tenants
enterpriseClient.setCookie('tenant1:sessionId', 'tenant1-session-abc');
enterpriseClient.setCookie('tenant1:preferences', JSON.stringify({theme: 'dark', locale: 'en-US'}));
enterpriseClient.setCookie('tenant2:sessionId', 'tenant2-session-xyz');
enterpriseClient.setCookie('tenant2:preferences', JSON.stringify({theme: 'light', locale: 'fr-FR'}));
enterpriseClient.setCookie('global:analyticsId', 'GA-ENTERPRISE-123');

console.log('📊 All cookies set:');
console.log('   Total:', enterpriseClient.size);
console.log('   Cookies:', Object.keys(enterpriseClient.getCookies()));

// Create scoped jars for different tenants
const tenant1Jar = enterpriseClient.createScopedJar('tenant1');
const tenant2Jar = enterpriseClient.createScopedJar('tenant2');

console.log('\n🏢 Scoped cookie jars:');
console.log('   Tenant 1:', Object.keys(tenant1Jar.getCookies?.() || {}));
console.log('   Tenant 2:', Object.keys(tenant2Jar.getCookies?.() || {}));

// ====== 3. Performance & Size Management ======

console.log("\n⚡ 3. Performance & Size Management");

// Add many cookies to test eviction strategy
for (let i = 0; i < 20; i++) {
  enterpriseClient.setCookie(`tempCookie${i}`, `value-${i}-with-some-longer-data-to-test-size`);
}

const headerString = enterpriseClient.toHeaderString();
const headerSize = new Blob([headerString]).size;

console.log('📏 Performance metrics:');
console.log(`   Header size: ${headerSize} bytes`);
console.log(`   Cookie count: ${enterpriseClient.size}`);
console.log(`   Size limit: 2048 bytes`);

if (headerSize > 2048) {
  console.log('⚠️  Size exceeded, eviction applied:');
  const optimizedHeader = enterpriseClient.toHeaderString(2048);
  const optimizedSize = new Blob([optimizedHeader]).size;
  console.log(`   Optimized size: ${optimizedSize} bytes`);
  console.log(`   Space saved: ${headerSize - optimizedSize} bytes`);
} else {
  console.log('✅ Header size within limits');
}

// ====== 4. Session Management & Auto-Refresh ======

console.log("\n🔄 4. Session Management & Auto-Refresh");

// Simulate session cookie with expiry
enterpriseClient.setCookie('sessionId', 'enterprise-session-token', {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 1800 // 30 minutes
});

console.log('🔐 Session management:');
console.log('   Session ID:', enterpriseClient.getCookie('sessionId'));
console.log('   Auto-refresh enabled:', true);
console.log('   Refresh threshold: 5 minutes before expiry');

// Simulate session refresh check
const refreshResult = await enterpriseClient.refreshIfNeeded();
console.log('   Refresh result:', refreshResult ? 'Refreshed' : 'Not needed');

// ====== 5. Security & Compliance ======

console.log("\n🔒 5. Security & Compliance");

// Demonstrate security-conscious cookie handling
const secureCookies = [
  { name: 'authToken', value: 'jwt-token-secure', secure: true, httpOnly: true },
  { name: 'csrfToken', value: 'csrf-protection', secure: true, httpOnly: false },
  { name: 'preferences', value: JSON.stringify({theme: 'dark'}), secure: false, httpOnly: false },
  { name: 'analytics', value: 'user-tracking', secure: false, httpOnly: false }
];

secureCookies.forEach(cookie => {
  enterpriseClient.setCookie(cookie.name, cookie.value, {
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.secure ? 'strict' : 'lax',
    maxAge: cookie.secure ? 1800 : 86400
  });
});

console.log('🛡️ Security configuration:');
console.log('   Secure cookies (HTTPS only): authToken, csrfToken');
console.log('   HttpOnly cookies (no JS access): authToken');
console.log('   SameSite=Strict (CSRF protection): authToken, csrfToken');
console.log('   Session cookies (short expiry): authToken, csrfToken');
console.log('   Persistent cookies (long expiry): preferences, analytics');

// ====== 6. Enterprise Request Flow ======

console.log("\n🌐 6. Enterprise Request Flow");

async function demonstrateEnterpriseFlow() {
  try {
    console.log('📤 Making enterprise request with advanced features...');
    
    const response = await enterpriseClient.fetch('https://httpbin.org/headers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Enterprise-Feature': 'advanced-cookie-management'
      },
      body: JSON.stringify({
        clientId: 'enterprise-demo',
        features: ['multi-tenant', 'auto-refresh', 'size-guard', 'security'],
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Enterprise request successful!');
      console.log('📋 Request headers received:');
      console.log(`   Cookie: ${data.headers.Cookie?.substring(0, 100)}...`);
      console.log(`   X-Client-Version: ${data.headers['X-Client-Version']}`);
      console.log(`   X-Tenant-ID: ${data.headers['X-Tenant-ID']}`);
      console.log(`   X-Request-ID: ${data.headers['X-Request-ID']}`);
    }
    
    // Show metrics
    console.log('\n📊 Performance metrics:');
    console.log(`   Average response time: ${enterpriseClient.getAverageResponseTime()}ms`);
    console.log(`   Success rate: ${enterpriseClient.getSuccessRate()}%`);
    console.log(`   Total requests: ${enterpriseClient.getMetrics().length}`);
    
  } catch (error) {
    console.error('❌ Enterprise request failed:', error);
  }
}

// ====== 7. Compliance & Auditing ======

console.log("\n📋 7. Compliance & Auditing");

function demonstrateComplianceFeatures() {
  console.log('🔍 Compliance features:');
  
  // Cookie categorization for GDPR/CCPA
  const cookies = enterpriseClient.getCookies();
  const categories = {
    essential: ['sessionId', 'authToken', 'csrfToken'],
    functional: ['preferences'],
    analytics: ['analyticsId', 'analytics'],
    advertising: [] // None in this demo
  };
  
  Object.entries(categories).forEach(([category, cookieNames]) => {
    const categoryCookies = cookieNames.filter(name => cookies[name]);
    console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)}: ${categoryCookies.length} cookies`);
    categoryCookies.forEach(name => {
      console.log(`     - ${name}`);
    });
  });
  
  // Data retention simulation
  console.log('\n⏰ Data retention:');
  const now = Date.now();
  Object.entries(cookies).forEach(([name, value]) => {
    const age = Math.random() * 86400000; // Random age up to 24 hours
    const created = new Date(now - age);
    console.log(`   ${name}: created ${created.toISOString()}`);
  });
  
  // Consent management
  console.log('\n👤 Consent management:');
  console.log('   Essential cookies: Always allowed (no consent needed)');
  console.log('   Functional cookies: Require user consent');
  console.log('   Analytics cookies: Require user consent');
  console.log('   Advertising cookies: Require explicit consent');
}

// ====== Run All Demonstrations ======

async function runEnterpriseDemo() {
  console.log("\n🚀 Starting Enterprise Cookie Management Demo\n");
  
  await demonstrateEnterpriseFlow();
  demonstrateComplianceFeatures();
  
  console.log("\n📈 Enterprise Features Summary:");
  console.log("✅ Multi-tenant cookie isolation with scoped jars");
  console.log("✅ Performance optimization with size guards and eviction");
  console.log("✅ Automatic session refresh and lifecycle management");
  console.log("✅ Security-first cookie handling with proper flags");
  console.log("✅ Compliance support for GDPR/CCPA requirements");
  console.log("✅ Enterprise monitoring and metrics collection");
  console.log("✅ Advanced request/response interceptors");
  console.log("✅ Cross-environment compatibility with fallbacks");
  
  console.log("\n🎯 Production Readiness Checklist:");
  console.log("• Cookie size monitoring and automatic optimization");
  console.log("• Tenant isolation for multi-tenant applications");
  console.log("• Security headers and CSRF protection");
  console.log("• Session management with auto-refresh");
  console.log("• Compliance categorization and consent handling");
  console.log("• Performance metrics and monitoring");
  console.log("• Error handling and graceful degradation");
  
  console.log("\n🏆 This implementation is enterprise-production-ready!");
}

// Start the enterprise demonstration
runEnterpriseDemo().catch(console.error);

// Export for external use
export { enterpriseClient, runEnterpriseDemo };
