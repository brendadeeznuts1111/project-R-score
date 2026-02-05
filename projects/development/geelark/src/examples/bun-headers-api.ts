#!/usr/bin/env bun

/**
 * Bun Headers API Comprehensive Demo
 * Demonstrates all Headers interface capabilities including:
 * - Header creation and manipulation
 * - Different initialization types
 * - Iteration and serialization
 * - Special header handling (Set-Cookie)
 */

// Main execution function to handle async operations
async function runHeadersAPIDemo() {
  console.log("📋 Bun Headers API Comprehensive Demo");
  console.log("=====================================\n");

  // Example 1: Headers creation with different initialization types
  console.log("🏗️ Example 1: Headers creation types");
  try {
    console.log("📝 Creating Headers with different initialization...");

    // Type 1: Empty constructor
    const headers1 = new Headers();
    console.log("✅ Empty Headers created, count:", headers1.count);

    // Type 2: Record<string, string> initialization
    const headers2 = new Headers({
      "Content-Type": "application/json",
      "Authorization": "Bearer token123",
      "User-Agent": "Bun-Demo/1.0"
    });
    console.log("✅ Headers from Record created, count:", headers2.count);

    // Type 3: string[][] initialization
    const headers3 = new Headers([
      ["Accept", "application/json"],
      ["X-Custom-Header", "custom-value"],
      ["Cache-Control", "no-cache"]
    ]);
    console.log("✅ Headers from Array created, count:", headers3.count);

    // Type 4: Copy from existing Headers
    const headers4 = new Headers(headers2);
    console.log("✅ Headers copied from existing, count:", headers4.count);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: Basic header operations
  console.log("🔧 Example 2: Basic header operations");
  try {
    console.log("📝 Demonstrating header operations...");

    const headers = new Headers();

    // Append headers
    headers.append("Content-Type", "application/json");
    headers.append("X-Request-ID", "req-123");
    console.log("✅ After append - Count:", headers.count);

    // Set header (overwrites existing)
    headers.set("Content-Type", "text/plain");
    console.log("✅ After set - Content-Type:", headers.get("Content-Type"));

    // Get header
    const contentType = headers.get("Content-Type");
    console.log("✅ Get Content-Type:", contentType);

    // Has header
    const hasAuth = headers.has("Authorization");
    console.log("✅ Has Authorization:", hasAuth);

    // Delete header
    headers.delete("X-Request-ID");
    console.log("✅ After delete - Count:", headers.count);
    console.log("✅ Has X-Request-ID:", headers.has("X-Request-ID"));

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: Special Set-Cookie handling
  console.log("🍪 Example 3: Set-Cookie special handling");
  try {
    console.log("📝 Demonstrating Set-Cookie handling...");

    const headers = new Headers();

    // Add multiple Set-Cookie headers
    headers.append("Set-Cookie", "session=abc123; Path=/; HttpOnly");
    headers.append("Set-Cookie", "theme=dark; Path=/; Max-Age=3600");
    headers.append("Set-Cookie", "lang=en; Path=/; Secure");

    console.log("✅ Total headers count:", headers.count);

    // Get all Set-Cookie headers
    const allCookies = headers.getAll("Set-Cookie");
    console.log("✅ All Set-Cookie headers:");
    allCookies.forEach((cookie, index) => {
      console.log(`  ${index + 1}: ${cookie}`);
    });

    // Use convenience method
    const cookies = headers.getSetCookie();
    console.log("✅ getSetCookie() result:");
    cookies.forEach((cookie, index) => {
      console.log(`  ${index + 1}: ${cookie}`);
    });

    // Test that other headers return empty arrays
    const otherHeaders = (headers as any).getAll("Content-Type");
    console.log("✅ getAll() on non-Set-Cookie header:", otherHeaders);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: Iteration methods
  console.log("🔄 Example 4: Headers iteration");
  try {
    console.log("📝 Demonstrating iteration methods...");

    const headers = new Headers([
      ["Content-Type", "application/json"],
      ["Authorization", "Bearer token"],
      ["X-Custom", "custom-value"],
      ["Cache-Control", "no-cache"]
    ]);

    // entries() iteration
    console.log("✅ entries() iteration:");
    for (const [key, value] of (headers as any).entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // keys() iteration
    console.log("\n✅ keys() iteration:");
    for (const key of (headers as any).keys()) {
      console.log(`  ${key}`);
    }

    // values() iteration
    console.log("\n✅ values() iteration:");
    for (const value of (headers as any).values()) {
      console.log(`  ${value}`);
    }

    // forEach iteration
    console.log("\n✅ forEach() iteration:");
    (headers as any).forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    // Symbol.iterator (default iteration)
    console.log("\n✅ Default iteration (Symbol.iterator):");
    for (const [key, value] of (headers as any)) {
      console.log(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 5: Serialization and conversion
  console.log("📦 Example 5: Headers serialization");
  try {
    console.log("📝 Demonstrating serialization methods...");

    const headers = new Headers([
      ["Content-Type", "application/json"],
      ["Set-Cookie", "session=abc123; Path=/"],
      ["Set-Cookie", "theme=dark; Max-Age=3600"],
      ["X-Custom-Header", "custom-value"],
      ["Authorization", "Bearer token123"]
    ]);

    // toJSON() conversion
    const headersObject = headers.toJSON();
    console.log("✅ toJSON() result:");
    console.log(JSON.stringify(headersObject, null, 2));

    // JSON.stringify() calls toJSON() automatically
    const jsonString = JSON.stringify(headers);
    console.log("\n✅ JSON.stringify() result:");
    console.log(jsonString);

    // Manual Object.fromEntries (slower)
    const manualObject = Object.fromEntries((headers as any).entries());
    console.log("\n✅ Object.fromEntries() result:");
    console.log(JSON.stringify(manualObject, null, 2));

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 6: Case-insensitive header handling
  console.log("🔤 Example 6: Case-insensitive header handling");
  try {
    console.log("📝 Demonstrating case-insensitive operations...");

    const headers = new Headers();

    // Add headers with different cases
    headers.set("Content-Type", "application/json");
    headers.set("content-type", "text/plain"); // Should overwrite
    headers.set("CONTENT-TYPE", "text/html"); // Should overwrite again

    console.log("✅ Final Content-Type:", headers.get("Content-Type"));
    console.log("✅ Get with lowercase:", headers.get("content-type"));
    console.log("✅ Get with uppercase:", headers.get("CONTENT-TYPE"));

    // Test has() with different cases
    console.log("✅ Has 'Content-Type':", headers.has("Content-Type"));
    console.log("✅ Has 'content-type':", headers.has("content-type"));

    // Delete with different cases
    headers.delete("content-type");
    console.log("✅ After delete - Has Content-Type:", headers.has("Content-Type"));

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 7: Headers in HTTP requests
  console.log("🌐 Example 7: Headers in HTTP requests");
  try {
    console.log("📝 Using Headers in actual HTTP request...");

    const requestHeaders = new Headers({
      "Content-Type": "application/json",
      "User-Agent": "Bun-Headers-Demo/1.0",
      "X-Custom-Header": "demo-value",
      "Accept": "application/json"
    });

    const response = await fetch("https://httpbin.org/headers", {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ message: "Headers demo" })
    });

    const result = await response.json();
    console.log("✅ Request sent successfully!");
    console.log("✅ Server received headers:");
    console.log(JSON.stringify(result.headers, null, 2));

    // Check response headers
    console.log("\n✅ Response headers:");
    for (const [key, value] of (response.headers as any)) {
      console.log(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 8: Performance comparison
  console.log("⚡ Example 8: Performance comparison");
  try {
    console.log("📝 Comparing serialization performance...");

    const headers = new Headers();
    for (let i = 0; i < 100; i++) {
      headers.set(`Header-${i}`, `value-${i}`);
    }

    console.log(`✅ Created ${headers.count} headers`);

    // Test toJSON() performance
    const start1 = performance.now();
    const jsonResult = headers.toJSON();
    const time1 = performance.now() - start1;

    // Test Object.fromEntries() performance
    const start2 = performance.now();
    const entriesResult = Object.fromEntries((headers as any).entries());
    const time2 = performance.now() - start2;

    console.log(`✅ toJSON() time: ${time1.toFixed(2)}ms`);
    console.log(`✅ Object.fromEntries() time: ${time2.toFixed(2)}ms`);
    console.log(`✅ Performance ratio: ${(time2 / time1).toFixed(2)}x faster`);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n🎯 Headers API Summary:");
  console.log("✅ Constructor types - Empty, Record, Array, Copy");
  console.log("✅ Basic operations - get, set, append, delete, has");
  console.log("✅ Special handling - Set-Cookie with getAll()");
  console.log("✅ Iteration methods - entries, keys, values, forEach");
  console.log("✅ Serialization - toJSON(), JSON.stringify()");
  console.log("✅ Case-insensitive - Header name handling");
  console.log("✅ HTTP integration - Request and response headers");
  console.log("✅ Performance - Optimized toJSON() method");

  console.log("\n💡 Headers Benefits:");
  console.log("• Case-insensitive header names");
  console.log("• Special Set-Cookie handling with multiple values");
  console.log("• Fast serialization with toJSON()");
  console.log("• Multiple iteration patterns");
  console.log("• Web API compatibility");
  console.log("• Performance optimized for common operations");

  console.log("\n🚀 Headers API Demo Complete!");
}

// Execute the demo
runHeadersAPIDemo().catch(console.error);
