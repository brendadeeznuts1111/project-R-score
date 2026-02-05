#!/usr/bin/env bun

/**
 * Cookie Header Writing Demo
 * Demonstrates various ways to write cookies to headers using Bun.CookieMap
 */

import { createCookieClient } from "../src/api/authenticated-client";

// Type guard for Bun availability
declare const Bun: any | undefined;

console.log("🍪 Cookie Header Writing Demo");
console.log("=" .repeat(50));

// ====== 1. Basic Cookie Header Writing ======

console.log("\n📝 1. Basic Cookie Header Writing");

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
console.log("\n📋 Cookie Header Formats:");

// Method 1: Simple header string for outgoing requests
const cookieHeaderString = client.toHeaderString();
console.log("🔗 Cookie Header String:");
console.log(`   ${cookieHeaderString}`);

// Method 2: Individual Set-Cookie headers for server responses
const setCookieHeaders = client.getSetCookieHeaders();
console.log("\n📤 Set-Cookie Headers (for server responses):");
setCookieHeaders.forEach((header, index) => {
  console.log(`   ${index + 1}. ${header}`);
});

// Method 3: Raw cookie object
console.log("\n🍪 Raw Cookie Objects:");
console.log(`   Session: ${client.getCookie("sessionId")}`);
console.log(`   Preferences: ${client.getCookie("userPreferences")}`);
console.log(`   Analytics: ${client.getCookie("analyticsId")}`);

// ====== 2. Request Headers Demo ======

console.log("\n🌐 2. Request Headers Demo");

async function demonstrateRequestHeaders() {
  try {
    console.log("📤 Making request with automatic cookie headers...");
    
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
      console.log("✅ Request headers sent:");
      console.log(`   Cookie: ${data.headers.Cookie || "(none)"}`);
      console.log(`   User-Agent: ${data.headers["User-Agent"]}`);
    }
    
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

// ====== 3. Response Headers Demo ======

console.log("\n📥 3. Response Headers Demo");

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
  console.log("📤 Creating server response with Set-Cookie headers...");
  
  const response = createServerResponse();
  const setCookieHeaders = response.headers.getSetCookie();
  
  console.log("✅ Set-Cookie headers in response:");
  setCookieHeaders.forEach((header, index) => {
    console.log(`   ${index + 1}. ${header}`);
  });
  
  // Show how the client would process these headers
  console.log("\n🔄 Simulating client processing of Set-Cookie headers...");
  
  // In a real scenario, the client would automatically parse and store these
  // cookies when receiving the response
  console.log("   (Client would automatically store these cookies)");
}

// ====== 4. Advanced Cookie Header Patterns ======

console.log("\n🔧 4. Advanced Cookie Header Patterns");

function demonstrateAdvancedPatterns() {
  console.log("📋 Advanced cookie header operations:");
  
  // Pattern 1: Conditional cookie headers
  const conditionalHeaders = new Headers();
  if (client.hasCookie("sessionId")) {
    conditionalHeaders.set("Cookie", `sessionId=${client.getCookie("sessionId")}`);
  }
  if (client.hasCookie("userPreferences")) {
    const existing = conditionalHeaders.get("Cookie") || "";
    conditionalHeaders.set("Cookie", `${existing}; userPreferences=${client.getCookie("userPreferences")}`);
  }
  console.log(`   Conditional: ${conditionalHeaders.get("Cookie")}`);
  
  // Pattern 2: Scoped cookie headers (API vs UI)
  const apiHeaders = new Headers();
  apiHeaders.set("Cookie", client.toHeaderString()); // All cookies for API
  
  const uiHeaders = new Headers();
  // Only non-sensitive cookies for UI
  uiHeaders.set("Cookie", [
    `userPreferences=${client.getCookie("userPreferences")}`,
    `analyticsId=${client.getCookie("analyticsId")}`
  ].join("; "));
  
  console.log(`   API Headers: ${apiHeaders.get("Cookie")}`);
  console.log(`   UI Headers: ${uiHeaders.get("Cookie")}`);
  
  // Pattern 3: Cookie filtering by domain/path
  const allCookies = client.getCookies();
  const filteredCookies = Object.entries(allCookies)
    .filter(([name, value]) => name !== "analyticsId") // Exclude analytics
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  console.log(`   Filtered: ${filteredCookies}`);
}

// ====== 5. Security Considerations ======

console.log("\n🔒 5. Security Considerations");

function demonstrateSecurityPatterns() {
  console.log("🛡️ Security best practices for cookie headers:");
  
  // 1. Secure flag for HTTPS
  console.log("   ✅ Secure cookies only sent over HTTPS");
  
  // 2. HttpOnly prevents XSS
  console.log("   ✅ HttpOnly cookies inaccessible to JavaScript");
  
  // 3. SameSite prevents CSRF
  console.log("   ✅ SameSite=Strict prevents cross-site requests");
  
  // 4. Domain scoping
  console.log("   ✅ Domain-specific cookies limit exposure");
  
  // 5. Path scoping
  console.log("   ✅ Path-specific cookies limit scope");
  
  // 6. Expiration
  console.log("   ✅ MaxAge/Expires prevent persistent sessions");
  
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
  
  console.log(`   🔐 Example: ${secureCookie.name} with security flags`);
}

// ====== 6. Performance Optimization ======

console.log("\n⚡ 6. Performance Optimization");

function demonstratePerformancePatterns() {
  console.log("🚀 Performance tips for cookie headers:");
  
  // 1. Minimize cookie size
  console.log("   📦 Keep cookie values small (<4KB per header)");
  
  // 2. Limit cookie count
  console.log("   🔢 Limit to essential cookies (<50 per domain)");
  
  // 3. Use appropriate domains
  console.log("   🌐 Use specific domains to reduce transmission");
  
  // 4. Compress when possible
  console.log("   🗜️ Compress JSON values in cookies");
  
  // 5. Cache cookie headers
  console.log("   💾 Cache generated headers for repeated requests");
  
  // Demonstrate cookie size analysis
  const headerString = client.toHeaderString();
  const headerSize = new Blob([headerString]).size;
  console.log(`   📊 Current header size: ${headerSize} bytes`);
  console.log(`   📊 Cookie count: ${client.size}`);
  
  if (headerSize > 4096) {
    console.log("   ⚠️  Warning: Header exceeds 4KB recommendation");
  } else {
    console.log("   ✅ Header size within recommended limits");
  }
}

// ====== Run All Demonstrations ======

async function runCookieHeaderDemo() {
  console.log("\n🎬 Starting Cookie Header Writing Demo\n");
  
  // Run all demonstrations
  await demonstrateRequestHeaders();
  demonstrateResponseHeaders();
  demonstrateAdvancedPatterns();
  demonstrateSecurityPatterns();
  demonstratePerformancePatterns();
  
  console.log("\n📈 Summary of Cookie Header Writing:");
  console.log("✅ Automatic cookie header generation for requests");
  console.log("✅ Set-Cookie header generation for responses");
  console.log("✅ Flexible cookie filtering and scoping");
  console.log("✅ Security-conscious cookie handling");
  console.log("✅ Performance-optimized header generation");
  console.log("✅ Cross-environment compatibility");
  
  console.log("\n🎯 Key Takeaways:");
  console.log("• Bun.CookieMap handles cookie-to-header conversion automatically");
  console.log("• Use toHeaderString() for request headers");
  console.log("• Use getSetCookieHeaders() for response headers");
  console.log("• Apply security flags based on cookie sensitivity");
  console.log("• Monitor header size to avoid performance issues");
}

// Start the demonstration
runCookieHeaderDemo().catch(console.error);

// Export for external use
export { client, runCookieHeaderDemo };
