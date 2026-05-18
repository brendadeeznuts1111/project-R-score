#!/usr/bin/env bun

/**
 * Enhanced Cookie Deletion Demo
 * Demonstrates advanced cookie deletion with domain/path constraints
 * following the Cookie Store API standard
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.info("🗑️  Enhanced Cookie Deletion Demo");
console.info("=" .repeat(60));

// ====== 1. Setup Client with Various Cookies ======

console.info("\n⚙️ 1. Setup Client with Various Cookies");

const deletionClient = createCookieClient({
  securityPolicy: {
    secure: true,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 3600
  },
  monitoring: {
    enabled: true,
    logLevel: 'debug'
  }
});

// Set cookies with different domains and paths
console.info("🍪 Setting up test cookies...");

// Root domain cookies
deletionClient.setCookie("session", "root-session-123", {
  domain: "example.com",
  path: "/",
  secure: true,
  httpOnly: true
});

deletionClient.setCookie("preferences", "root-prefs", {
  domain: "example.com",
  path: "/",
  secure: true
});

// Subdomain cookies
deletionClient.setCookie("admin_session", "admin-session-456", {
  domain: "admin.example.com",
  path: "/",
  secure: true,
  httpOnly: true
});

deletionClient.setCookie("analytics", "analytics-data", {
  domain: "cdn.example.com",
  path: "/",
  secure: true
});

// Path-specific cookies
deletionClient.setCookie("user_profile", "profile-data", {
  domain: "example.com",
  path: "/user",
  secure: true
});

deletionClient.setCookie("admin_settings", "admin-config", {
  domain: "example.com",
  path: "/admin",
  secure: true,
  httpOnly: true
});

// Partitioned cookies
deletionClient.setPartitionedCookie("tracking_partitioned", "track-data", {
  domain: "example.com",
  path: "/",
  secure: true
});

console.info("✅ Cookies set successfully");
console.info(`📊 Total cookies: ${deletionClient.size}`);

// ====== 2. Basic Deletion Methods ======

console.info("\n🗑️ 2. Basic Deletion Methods");

console.info("📋 Available cookies before deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// Simple deletion by name
console.info("\n🔧 Simple deletion by name:");
deletionClient.delete("preferences");
console.info("   ✅ Deleted 'preferences' cookie");

console.info("\n📋 Cookies after simple deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// ====== 3. Domain-Specific Deletion ======

console.info("\n🌐 3. Domain-Specific Deletion");

// Delete cookies from specific subdomain
console.info("🔧 Deleting cookies from 'admin.example.com':");
deletionClient.delete("admin_session", { domain: "admin.example.com" });
console.info("   ✅ Deleted 'admin_session' from admin.example.com");

// Delete cookies from root domain only
console.info("\n🔧 Deleting 'session' from root domain only:");
deletionClient.delete("session", { domain: "example.com" });
console.info("   ✅ Deleted 'session' from example.com");

console.info("\n📋 Cookies after domain-specific deletions:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// ====== 4. Path-Specific Deletion ======

console.info("\n📁 4. Path-Specific Deletion");

// Delete cookie from specific path
console.info("🔧 Deleting 'user_profile' from '/user' path:");
deletionClient.delete("user_profile", { path: "/user" });
console.info("   ✅ Deleted 'user_profile' from /user path");

// Delete cookie from admin path
console.info("\n🔧 Deleting 'admin_settings' from '/admin' path:");
deletionClient.delete("admin_settings", { domain: "example.com", path: "/admin" });
console.info("   ✅ Deleted 'admin_settings' from example.com/admin");

console.info("\n📋 Cookies after path-specific deletions:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// ====== 5. Partitioned Cookie Deletion ======

console.info("\n🔒 5. Partitioned Cookie Deletion");

// Delete partitioned cookie
console.info("🔧 Deleting partitioned cookie:");
deletionClient.delete("tracking_partitioned", { partitioned: true });
console.info("   ✅ Deleted 'tracking_partitioned' (partitioned)");

console.info("\n📋 Cookies after partitioned deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// ====== 6. Options Object Deletion ======

console.info("\n⚙️ 6. Options Object Deletion");

// Add more cookies for demonstration
deletionClient.setCookie("temp_cookie", "temp-value", {
  domain: "example.com",
  path: "/temp"
});

deletionClient.setCookie("debug_cookie", "debug-value", {
  domain: "debug.example.com",
  path: "/debug"
});

console.info("🍪 Added temporary cookies for options deletion demo");

// Delete using options object (first overload)
console.info("\n🔧 Using options object deletion:");
deletionClient.delete({
  name: "temp_cookie",
  domain: "example.com",
  path: "/temp"
});
console.info("   ✅ Deleted using options object format");

console.info("\n📋 Cookies after options object deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.info(`   • ${name}`);
});

// ====== 7. Advanced Deletion Scenarios ======

console.info("\n🔬 7. Advanced Deletion Scenarios");

function demonstrateAdvancedScenarios() {
  console.info("🎯 Advanced Cookie Deletion Patterns:");
  
  console.info("\n   1. Selective Cookie Cleanup:");
  console.info("      • Delete only non-essential cookies");
  console.info("      • Preserve authentication cookies");
  console.info("      • Clear analytics and tracking data");
  
  console.info("\n   2. Domain-Based Cleanup:");
  console.info("      • Remove cookies from specific subdomains");
  console.info("      • Clear third-party tracking cookies");
  console.info("      • Preserve first-party essential data");
  
  console.info("\n   3. Path-Based Cleanup:");
  console.info("      • Clear admin panel cookies on logout");
  console.info("      • Remove temporary session data");
  console.info("      • Preserve user preferences");
  
  console.info("\n   4. Privacy-Focused Deletion:");
  console.info("      • Delete partitioned tracking cookies");
  console.info("      • Clear consent and analytics data");
  console.info("      • Maintain essential functionality");
  
  console.info("\n   5. Security Cleanup:");
  console.info("      • Remove session cookies on timeout");
  console.info("      • Clear sensitive authentication data");
  console.info("      • Delete debug and development cookies");
}

// ====== 8. Error Handling and Fallbacks ======

console.info("\n⚠️ 8. Error Handling and Fallbacks");

function demonstrateErrorHandling() {
  console.info("🛡️ Error Handling Features:");
  
  console.info("\n   ✅ Graceful Fallbacks:");
  console.info("      • Map fallback when Bun.CookieMap unavailable");
  console.info("      • Progressive deletion with constraint relaxation");
  console.info("      • Simple deletion as final fallback");
  
  console.info("\n   ✅ Validation:");
  console.info("      • Options object validation");
  console.info("      • Required property checking");
  console.info("      • Type safety with TypeScript");
  
  console.info("\n   ✅ Logging:");
  console.info("      • Debug logging for deletion attempts");
  console.info("      • Warning logs for invalid operations");
  console.info("      • Success/failure tracking");
  
  console.info("\n   ✅ Backward Compatibility:");
  console.info("      • Legacy deleteCookie() method preserved");
  console.info("      • Existing code continues to work");
  console.info("      • Gradual migration path available");
}

// ====== 9. Performance Considerations ======

console.info("\n⚡ 9. Performance Considerations");

function analyzePerformance() {
  console.info("🚀 Performance Analysis:");
  
  console.info("\n   📊 Deletion Efficiency:");
  console.info("      • O(1) deletion for simple cases");
  console.info("      • O(n) for constraint-based deletion");
  console.info("      • Minimal memory overhead");
  
  console.info("\n   🔧 Optimization Strategies:");
  console.info("      • Batch deletion for multiple cookies");
  console.info("      • Constraint caching for repeated operations");
  console.info("      • Lazy evaluation for complex conditions");
  
  console.info("\n   📈 Scalability:");
  console.info("      • Handles large cookie jars efficiently");
  console.info("      • No performance degradation with constraints");
  console.info("      • Memory-efficient deletion operations");
  
  console.info("\n   💡 Best Practices:");
  console.info("      • Use specific constraints when possible");
  console.info("      • Batch similar deletion operations");
  console.info("      • Monitor deletion performance in production");
}

// ====== 10. Real-World Usage Examples ======

console.info("\n🌍 10. Real-World Usage Examples");

function showRealWorldExamples() {
  console.info("🎭 Production Scenarios:");
  
  console.info("\n   🏪 E-commerce Application:");
  console.info("      // Clear shopping cart on checkout completion");
  console.info("      client.delete('cart_items', { path: '/cart' });");
  console.info("      // Preserve user session and preferences");
  
  console.info("\n   🔐 Authentication System:");
  console.info("      // Logout - remove all auth cookies");
  console.info("      client.delete('auth_token', { domain: 'auth.example.com' });");
  console.info("      client.delete('session_id', { path: '/secure' });");
  
  console.info("\n   📊 Analytics Platform:");
  console.info("      // Clear tracking data on consent withdrawal");
  console.info("      client.delete('analytics_id', { partitioned: true });");
  console.info("      client.delete('tracking_data', { domain: 'cdn.example.com' });");
  
  console.info("\n   🌐 Multi-Tenant SaaS:");
  console.info("      // Remove tenant-specific data");
  console.info("      client.delete('tenant_config', { domain: 'tenant123.app.com' });");
  console.info("      // Preserve platform-wide settings");
  
  console.info("\n   📱 Progressive Web App:");
  console.info("      // Clear offline data on storage cleanup");
  console.info("      client.delete('offline_cache', { path: '/offline' });");
  console.info("      // Keep essential user preferences");
}

// ====== Run All Demonstrations ======

async function runEnhancedDeletionDemo() {
  console.info("\n🚀 Starting Enhanced Cookie Deletion Demo\n");
  
  demonstrateAdvancedScenarios();
  demonstrateErrorHandling();
  analyzePerformance();
  showRealWorldExamples();
  
  console.info("\n📈 Enhanced Deletion Summary:");
  console.info("✅ Cookie Store API compliant deletion methods");
  console.info("✅ Domain and path-specific cookie removal");
  console.info("✅ Partitioned cookie deletion support");
  console.info("✅ Multiple method overloads for flexibility");
  console.info("✅ Comprehensive error handling and fallbacks");
  console.info("✅ Performance-optimized deletion operations");
  console.info("✅ Backward compatibility with existing code");
  console.info("✅ Production-ready error handling");
  
  console.info("\n🎯 API Usage Patterns:");
  console.info("• Simple: client.delete('cookieName');");
  console.info("• Constrained: client.delete('cookieName', { domain: '.example.com' });");
  console.info("• Full Options: client.delete({ name: 'cookie', domain: 'example.com', path: '/admin' });");
  console.info("• Partitioned: client.delete('cookie', { partitioned: true });");
  console.info("• Legacy: client.deleteCookie('cookieName', options);");
  
  console.info("\n🏆 This implementation provides the most advanced cookie deletion capabilities!");
  console.info("🗑️  Precision Deletion, Zero Compromise!");
}

// Start the enhanced deletion demonstration
runEnhancedDeletionDemo().catch(console.error);

// Export for external use
export { deletionClient, runEnhancedDeletionDemo };
