#!/usr/bin/env bun

/**
 * Enhanced Cookie Deletion Demo
 * Demonstrates advanced cookie deletion with domain/path constraints
 * following the Cookie Store API standard
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.log("🗑️  Enhanced Cookie Deletion Demo");
console.log("=" .repeat(60));

// ====== 1. Setup Client with Various Cookies ======

console.log("\n⚙️ 1. Setup Client with Various Cookies");

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
console.log("🍪 Setting up test cookies...");

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

console.log("✅ Cookies set successfully");
console.log(`📊 Total cookies: ${deletionClient.size}`);

// ====== 2. Basic Deletion Methods ======

console.log("\n🗑️ 2. Basic Deletion Methods");

console.log("📋 Available cookies before deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// Simple deletion by name
console.log("\n🔧 Simple deletion by name:");
deletionClient.delete("preferences");
console.log("   ✅ Deleted 'preferences' cookie");

console.log("\n📋 Cookies after simple deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// ====== 3. Domain-Specific Deletion ======

console.log("\n🌐 3. Domain-Specific Deletion");

// Delete cookies from specific subdomain
console.log("🔧 Deleting cookies from 'admin.example.com':");
deletionClient.delete("admin_session", { domain: "admin.example.com" });
console.log("   ✅ Deleted 'admin_session' from admin.example.com");

// Delete cookies from root domain only
console.log("\n🔧 Deleting 'session' from root domain only:");
deletionClient.delete("session", { domain: "example.com" });
console.log("   ✅ Deleted 'session' from example.com");

console.log("\n📋 Cookies after domain-specific deletions:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// ====== 4. Path-Specific Deletion ======

console.log("\n📁 4. Path-Specific Deletion");

// Delete cookie from specific path
console.log("🔧 Deleting 'user_profile' from '/user' path:");
deletionClient.delete("user_profile", { path: "/user" });
console.log("   ✅ Deleted 'user_profile' from /user path");

// Delete cookie from admin path
console.log("\n🔧 Deleting 'admin_settings' from '/admin' path:");
deletionClient.delete("admin_settings", { domain: "example.com", path: "/admin" });
console.log("   ✅ Deleted 'admin_settings' from example.com/admin");

console.log("\n📋 Cookies after path-specific deletions:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// ====== 5. Partitioned Cookie Deletion ======

console.log("\n🔒 5. Partitioned Cookie Deletion");

// Delete partitioned cookie
console.log("🔧 Deleting partitioned cookie:");
deletionClient.delete("tracking_partitioned", { partitioned: true });
console.log("   ✅ Deleted 'tracking_partitioned' (partitioned)");

console.log("\n📋 Cookies after partitioned deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// ====== 6. Options Object Deletion ======

console.log("\n⚙️ 6. Options Object Deletion");

// Add more cookies for demonstration
deletionClient.setCookie("temp_cookie", "temp-value", {
  domain: "example.com",
  path: "/temp"
});

deletionClient.setCookie("debug_cookie", "debug-value", {
  domain: "debug.example.com",
  path: "/debug"
});

console.log("🍪 Added temporary cookies for options deletion demo");

// Delete using options object (first overload)
console.log("\n🔧 Using options object deletion:");
deletionClient.delete({
  name: "temp_cookie",
  domain: "example.com",
  path: "/temp"
});
console.log("   ✅ Deleted using options object format");

console.log("\n📋 Cookies after options object deletion:");
Object.keys(deletionClient.getCookies()).forEach(name => {
  console.log(`   • ${name}`);
});

// ====== 7. Advanced Deletion Scenarios ======

console.log("\n🔬 7. Advanced Deletion Scenarios");

function demonstrateAdvancedScenarios() {
  console.log("🎯 Advanced Cookie Deletion Patterns:");
  
  console.log("\n   1. Selective Cookie Cleanup:");
  console.log("      • Delete only non-essential cookies");
  console.log("      • Preserve authentication cookies");
  console.log("      • Clear analytics and tracking data");
  
  console.log("\n   2. Domain-Based Cleanup:");
  console.log("      • Remove cookies from specific subdomains");
  console.log("      • Clear third-party tracking cookies");
  console.log("      • Preserve first-party essential data");
  
  console.log("\n   3. Path-Based Cleanup:");
  console.log("      • Clear admin panel cookies on logout");
  console.log("      • Remove temporary session data");
  console.log("      • Preserve user preferences");
  
  console.log("\n   4. Privacy-Focused Deletion:");
  console.log("      • Delete partitioned tracking cookies");
  console.log("      • Clear consent and analytics data");
  console.log("      • Maintain essential functionality");
  
  console.log("\n   5. Security Cleanup:");
  console.log("      • Remove session cookies on timeout");
  console.log("      • Clear sensitive authentication data");
  console.log("      • Delete debug and development cookies");
}

// ====== 8. Error Handling and Fallbacks ======

console.log("\n⚠️ 8. Error Handling and Fallbacks");

function demonstrateErrorHandling() {
  console.log("🛡️ Error Handling Features:");
  
  console.log("\n   ✅ Graceful Fallbacks:");
  console.log("      • Map fallback when Bun.CookieMap unavailable");
  console.log("      • Progressive deletion with constraint relaxation");
  console.log("      • Simple deletion as final fallback");
  
  console.log("\n   ✅ Validation:");
  console.log("      • Options object validation");
  console.log("      • Required property checking");
  console.log("      • Type safety with TypeScript");
  
  console.log("\n   ✅ Logging:");
  console.log("      • Debug logging for deletion attempts");
  console.log("      • Warning logs for invalid operations");
  console.log("      • Success/failure tracking");
  
  console.log("\n   ✅ Backward Compatibility:");
  console.log("      • Legacy deleteCookie() method preserved");
  console.log("      • Existing code continues to work");
  console.log("      • Gradual migration path available");
}

// ====== 9. Performance Considerations ======

console.log("\n⚡ 9. Performance Considerations");

function analyzePerformance() {
  console.log("🚀 Performance Analysis:");
  
  console.log("\n   📊 Deletion Efficiency:");
  console.log("      • O(1) deletion for simple cases");
  console.log("      • O(n) for constraint-based deletion");
  console.log("      • Minimal memory overhead");
  
  console.log("\n   🔧 Optimization Strategies:");
  console.log("      • Batch deletion for multiple cookies");
  console.log("      • Constraint caching for repeated operations");
  console.log("      • Lazy evaluation for complex conditions");
  
  console.log("\n   📈 Scalability:");
  console.log("      • Handles large cookie jars efficiently");
  console.log("      • No performance degradation with constraints");
  console.log("      • Memory-efficient deletion operations");
  
  console.log("\n   💡 Best Practices:");
  console.log("      • Use specific constraints when possible");
  console.log("      • Batch similar deletion operations");
  console.log("      • Monitor deletion performance in production");
}

// ====== 10. Real-World Usage Examples ======

console.log("\n🌍 10. Real-World Usage Examples");

function showRealWorldExamples() {
  console.log("🎭 Production Scenarios:");
  
  console.log("\n   🏪 E-commerce Application:");
  console.log("      // Clear shopping cart on checkout completion");
  console.log("      client.delete('cart_items', { path: '/cart' });");
  console.log("      // Preserve user session and preferences");
  
  console.log("\n   🔐 Authentication System:");
  console.log("      // Logout - remove all auth cookies");
  console.log("      client.delete('auth_token', { domain: 'auth.example.com' });");
  console.log("      client.delete('session_id', { path: '/secure' });");
  
  console.log("\n   📊 Analytics Platform:");
  console.log("      // Clear tracking data on consent withdrawal");
  console.log("      client.delete('analytics_id', { partitioned: true });");
  console.log("      client.delete('tracking_data', { domain: 'cdn.example.com' });");
  
  console.log("\n   🌐 Multi-Tenant SaaS:");
  console.log("      // Remove tenant-specific data");
  console.log("      client.delete('tenant_config', { domain: 'tenant123.app.com' });");
  console.log("      // Preserve platform-wide settings");
  
  console.log("\n   📱 Progressive Web App:");
  console.log("      // Clear offline data on storage cleanup");
  console.log("      client.delete('offline_cache', { path: '/offline' });");
  console.log("      // Keep essential user preferences");
}

// ====== Run All Demonstrations ======

async function runEnhancedDeletionDemo() {
  console.log("\n🚀 Starting Enhanced Cookie Deletion Demo\n");
  
  demonstrateAdvancedScenarios();
  demonstrateErrorHandling();
  analyzePerformance();
  showRealWorldExamples();
  
  console.log("\n📈 Enhanced Deletion Summary:");
  console.log("✅ Cookie Store API compliant deletion methods");
  console.log("✅ Domain and path-specific cookie removal");
  console.log("✅ Partitioned cookie deletion support");
  console.log("✅ Multiple method overloads for flexibility");
  console.log("✅ Comprehensive error handling and fallbacks");
  console.log("✅ Performance-optimized deletion operations");
  console.log("✅ Backward compatibility with existing code");
  console.log("✅ Production-ready error handling");
  
  console.log("\n🎯 API Usage Patterns:");
  console.log("• Simple: client.delete('cookieName');");
  console.log("• Constrained: client.delete('cookieName', { domain: '.example.com' });");
  console.log("• Full Options: client.delete({ name: 'cookie', domain: 'example.com', path: '/admin' });");
  console.log("• Partitioned: client.delete('cookie', { partitioned: true });");
  console.log("• Legacy: client.deleteCookie('cookieName', options);");
  
  console.log("\n🏆 This implementation provides the most advanced cookie deletion capabilities!");
  console.log("🗑️  Precision Deletion, Zero Compromise!");
}

// Start the enhanced deletion demonstration
runEnhancedDeletionDemo().catch(console.error);

// Export for external use
export { deletionClient, runEnhancedDeletionDemo };
