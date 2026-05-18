#!/usr/bin/env bun

/**
 * Cookie Header Writing Demo
 * Demonstrates various ways to write cookies to headers using Bun.CookieMap
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.info("🍪 Cookie Header Writing Demo");
console.info("=" .repeat(50));

// ====== 1. Basic Cookie Header Writing ======

console.info("\n📝 1. Basic Cookie Header Writing");

// Create cookie client with proper Request object
const client = createCookieClient({
  securityPolicy: {
    secure: true, // For HTTPS
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 3600 // 1 hour
  }
});

// Set some cookies
client.setCookie("sessionId", "abc123def456", {
  domain: "api.example.com",
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "strict"
});

client.setCookie("userPreferences", JSON.stringify({
  theme: "dark",
  language: "en",
  notifications: true
}), {
  domain: "api.example.com",
  path: "/",
  maxAge: 86400 // 24 hours
});

client.setCookie("analyticsId", "GA-XYZ-789", {
  domain: ".example.com", // Subdomain wildcard
  path: "/",
  secure: false // Can be sent over HTTP
});

// Demonstrate different ways to get cookie headers
console.info("\n📋 Cookie Header Formats:");

// Method 1: Simple header string for outgoing requests
const cookieHeaderString = client.toHeaderString();
console.info("🔗 Cookie Header String:");
console.info(`   ${cookieHeaderString}`);

// Method 2: Individual Set-Cookie headers for server responses
const setCookieHeaders = client.getSetCookieHeaders();
console.info("\n📤 Set-Cookie Headers (for server responses):");
setCookieHeaders.forEach((header, index) => {
  console.info(`   ${index + 1}. ${header}`);
});

// Method 3: Raw cookie object
console.info("\n🍪 Raw Cookie Objects:");
console.info(`   Session: ${client.getCookie("sessionId")}`);
console.info(`   Preferences: ${client.getCookie("userPreferences")}`);
console.info(`   Analytics: ${client.getCookie("analyticsId")}`);

// ====== 2. Request Headers Demo ======

console.info("\n🌐 2. Request Headers Demo");

async function demonstrateRequestHeaders() {
  try {
    console.info("📤 Making request with automatic cookie headers...");
    
    // The client automatically adds cookies to the Cookie header
    const response = await client.fetch("https://httpbin.org/headers", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Cookie-Demo/1.0"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.info("✅ Request headers sent:");
      console.info(`   Cookie: ${data.headers.Cookie || "(none)"}`);
      console.info(`   User-Agent: ${data.headers["User-Agent"]}`);
    }
    
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

// ====== 3. Response Headers Demo ======

console.info("\n📥 3. Response Headers Demo");

// Simulate server response with Set-Cookie headers
function createServerResponse(): Response {
  const response = new Response(JSON.stringify({
    success: true,
    message: "Login successful",
    user: { id: 123, name: "Demo User" }
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Set multiple cookies in response
      "Set-Cookie": [
        "auth-token=jwt-token-xyz; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict; Secure",
        "user-session=ses-abc-123; Path=/; Max-Age=86400; SameSite=Lax",
        "theme=dark; Path=/; Max-Age=604800" // 7 days
      ]
    }
  });
  
  return response;
}

function demonstrateResponseHeaders() {
  console.info("📤 Creating server response with Set-Cookie headers...");
  
  const response = createServerResponse();
  const setCookieHeaders = response.headers.getSetCookie();
  
  console.info("✅ Set-Cookie headers in response:");
  setCookieHeaders.forEach((header, index) => {
    console.info(`   ${index + 1}. ${header}`);
  });
  
  // Show how the client would process these headers
  console.info("\n🔄 Simulating client processing of Set-Cookie headers...");
  
  // In a real scenario, the client would automatically parse and store these
  // cookies when receiving the response
  console.info("   (Client would automatically store these cookies)");
}

// ====== 4. Advanced Cookie Header Patterns ======

console.info("\n🔧 4. Advanced Cookie Header Patterns");

function demonstrateAdvancedPatterns() {
  console.info("📋 Advanced cookie header operations:");
  
  // Pattern 1: Conditional cookie headers
  const conditionalHeaders = new Headers();
  if (client.hasCookie("sessionId")) {
    conditionalHeaders.set("Cookie", `sessionId=${client.getCookie("sessionId")}`);
  }
  if (client.hasCookie("userPreferences")) {
    const existing = conditionalHeaders.get("Cookie") || "";
    conditionalHeaders.set("Cookie", `${existing}; userPreferences=${client.getCookie("userPreferences")}`);
  }
  console.info(`   Conditional: ${conditionalHeaders.get("Cookie")}`);
  
  // Pattern 2: Scoped cookie headers (API vs UI)
  const apiHeaders = new Headers();
  apiHeaders.set("Cookie", client.toHeaderString()); // All cookies for API
  
  const uiHeaders = new Headers();
  // Only non-sensitive cookies for UI
  uiHeaders.set("Cookie", [
    `userPreferences=${client.getCookie("userPreferences")}`,
    `analyticsId=${client.getCookie("analyticsId")}`
  ].join("; "));
  
  console.info(`   API Headers: ${apiHeaders.get("Cookie")}`);
  console.info(`   UI Headers: ${uiHeaders.get("Cookie")}`);
  
  // Pattern 3: Cookie filtering by domain/path
  const allCookies = client.getCookies();
  const filteredCookies = Object.entries(allCookies)
    .filter(([name, value]) => name !== "analyticsId") // Exclude analytics
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  console.info(`   Filtered: ${filteredCookies}`);
}

// ====== 5. Security Considerations ======

console.info("\n🔒 5. Security Considerations");

function demonstrateSecurityPatterns() {
  console.info("🛡️ Security best practices for cookie headers:");
  
  // 1. Secure flag for HTTPS
  console.info("   ✅ Secure cookies only sent over HTTPS");
  
  // 2. HttpOnly prevents XSS
  console.info("   ✅ HttpOnly cookies inaccessible to JavaScript");
  
  // 3. SameSite prevents CSRF
  console.info("   ✅ SameSite=Strict prevents cross-site requests");
  
  // 4. Domain scoping
  console.info("   ✅ Domain-specific cookies limit exposure");
  
  // 5. Path scoping
  console.info("   ✅ Path-specific cookies limit scope");
  
  // 6. Expiration
  console.info("   ✅ MaxAge/Expires prevent persistent sessions");
  
  // Demonstrate secure cookie creation
  const secureCookie = {
    name: "secureSession",
    value: "encrypted-token",
    options: {
      secure: true,      // HTTPS only
      httpOnly: true,    // No JavaScript access
      sameSite: "strict", // Prevent CSRF
      domain: "api.example.com",
      path: "/api",
      maxAge: 1800       // 30 minutes
    }
  };
  
  console.info(`   🔐 Example: ${secureCookie.name} with security flags`);
}

// ====== 6. Performance Optimization ======

console.info("\n⚡ 6. Performance Optimization");

function demonstratePerformancePatterns() {
  console.info("🚀 Performance tips for cookie headers:");
  
  // 1. Minimize cookie size
  console.info("   📦 Keep cookie values small (<4KB per header)");
  
  // 2. Limit cookie count
  console.info("   🔢 Limit to essential cookies (<50 per domain)");
  
  // 3. Use appropriate domains
  console.info("   🌐 Use specific domains to reduce transmission");
  
  // 4. Compress when possible
  console.info("   🗜️ Compress JSON values in cookies");
  
  // 5. Cache cookie headers
  console.info("   💾 Cache generated headers for repeated requests");
  
  // Demonstrate cookie size analysis
  const headerString = client.toHeaderString();
  const headerSize = new Blob([headerString]).size;
  console.info(`   📊 Current header size: ${headerSize} bytes`);
  console.info(`   📊 Cookie count: ${client.size}`);
  
  if (headerSize > 4096) {
    console.info("   ⚠️  Warning: Header exceeds 4KB recommendation");
  } else {
    console.info("   ✅ Header size within recommended limits");
  }
}

// ====== Run All Demonstrations ======

async function runCookieHeaderDemo() {
  console.info("\n🎬 Starting Cookie Header Writing Demo\n");
  
  // Run all demonstrations
  await demonstrateRequestHeaders();
  demonstrateResponseHeaders();
  demonstrateAdvancedPatterns();
  demonstrateSecurityPatterns();
  demonstratePerformancePatterns();
  
  console.info("\n📈 Summary of Cookie Header Writing:");
  console.info("✅ Automatic cookie header generation for requests");
  console.info("✅ Set-Cookie header generation for responses");
  console.info("✅ Flexible cookie filtering and scoping");
  console.info("✅ Security-conscious cookie handling");
  console.info("✅ Performance-optimized header generation");
  console.info("✅ Cross-environment compatibility");
  
  console.info("\n🎯 Key Takeaways:");
  console.info("• Bun.CookieMap handles cookie-to-header conversion automatically");
  console.info("• Use toHeaderString() for request headers");
  console.info("• Use getSetCookieHeaders() for response headers");
  console.info("• Apply security flags based on cookie sensitivity");
  console.info("• Monitor header size to avoid performance issues");
}

// Start the demonstration
runCookieHeaderDemo().catch(console.error);

// Export for external use
export { client, runCookieHeaderDemo };
