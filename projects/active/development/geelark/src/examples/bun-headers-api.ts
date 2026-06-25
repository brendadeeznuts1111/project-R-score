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
  console.info("📋 Bun Headers API Comprehensive Demo");
  console.info("=====================================\n");

  // Example 1: Headers creation with different initialization types
  console.info("🏗️ Example 1: Headers creation types");
  try {
    console.info("📝 Creating Headers with different initialization...");

    // Type 1: Empty constructor
    const headers1 = new Headers();
    console.info("✅ Empty Headers created, count:", headers1.count);

    // Type 2: Record<string, string> initialization
    const headers2 = new Headers({
      "Content-Type": "application/json",
      "Authorization": "Bearer token123",
      "User-Agent": "Bun-Demo/1.0"
    });
    console.info("✅ Headers from Record created, count:", headers2.count);

    // Type 3: string[][] initialization
    const headers3 = new Headers([
      ["Accept", "application/json"],
      ["X-Custom-Header", "custom-value"],
      ["Cache-Control", "no-cache"]
    ]);
    console.info("✅ Headers from Array created, count:", headers3.count);

    // Type 4: Copy from existing Headers
    const headers4 = new Headers(headers2);
    console.info("✅ Headers copied from existing, count:", headers4.count);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 2: Basic header operations
  console.info("🔧 Example 2: Basic header operations");
  try {
    console.info("📝 Demonstrating header operations...");

    const headers = new Headers();

    // Append headers
    headers.append("Content-Type", "application/json");
    headers.append("X-Request-ID", "req-123");
    console.info("✅ After append - Count:", headers.count);

    // Set header (overwrites existing)
    headers.set("Content-Type", "text/plain");
    console.info("✅ After set - Content-Type:", headers.get("Content-Type"));

    // Get header
    const contentType = headers.get("Content-Type");
    console.info("✅ Get Content-Type:", contentType);

    // Has header
    const hasAuth = headers.has("Authorization");
    console.info("✅ Has Authorization:", hasAuth);

    // Delete header
    headers.delete("X-Request-ID");
    console.info("✅ After delete - Count:", headers.count);
    console.info("✅ Has X-Request-ID:", headers.has("X-Request-ID"));

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 3: Special Set-Cookie handling
  console.info("🍪 Example 3: Set-Cookie special handling");
  try {
    console.info("📝 Demonstrating Set-Cookie handling...");

    const headers = new Headers();

    // Add multiple Set-Cookie headers
    headers.append("Set-Cookie", "session=abc123; Path=/; HttpOnly");
    headers.append("Set-Cookie", "theme=dark; Path=/; Max-Age=3600");
    headers.append("Set-Cookie", "lang=en; Path=/; Secure");

    console.info("✅ Total headers count:", headers.count);

    // Get all Set-Cookie headers
    const allCookies = headers.getAll("Set-Cookie");
    console.info("✅ All Set-Cookie headers:");
    allCookies.forEach((cookie, index) => {
      console.info(`  ${index + 1}: ${cookie}`);
    });

    // Use convenience method
    const cookies = headers.getSetCookie();
    console.info("✅ getSetCookie() result:");
    cookies.forEach((cookie, index) => {
      console.info(`  ${index + 1}: ${cookie}`);
    });

    // Test that other headers return empty arrays
    const otherHeaders = (headers as any).getAll("Content-Type");
    console.info("✅ getAll() on non-Set-Cookie header:", otherHeaders);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 4: Iteration methods
  console.info("🔄 Example 4: Headers iteration");
  try {
    console.info("📝 Demonstrating iteration methods...");

    const headers = new Headers([
      ["Content-Type", "application/json"],
      ["Authorization", "Bearer token"],
      ["X-Custom", "custom-value"],
      ["Cache-Control", "no-cache"]
    ]);

    // entries() iteration
    console.info("✅ entries() iteration:");
    for (const [key, value] of (headers as any).entries()) {
      console.info(`  ${key}: ${value}`);
    }

    // keys() iteration
    console.info("\n✅ keys() iteration:");
    for (const key of (headers as any).keys()) {
      console.info(`  ${key}`);
    }

    // values() iteration
    console.info("\n✅ values() iteration:");
    for (const value of (headers as any).values()) {
      console.info(`  ${value}`);
    }

    // forEach iteration
    console.info("\n✅ forEach() iteration:");
    (headers as any).forEach((value, key) => {
      console.info(`  ${key}: ${value}`);
    });

    // Symbol.iterator (default iteration)
    console.info("\n✅ Default iteration (Symbol.iterator):");
    for (const [key, value] of (headers as any)) {
      console.info(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 5: Serialization and conversion
  console.info("📦 Example 5: Headers serialization");
  try {
    console.info("📝 Demonstrating serialization methods...");

    const headers = new Headers([
      ["Content-Type", "application/json"],
      ["Set-Cookie", "session=abc123; Path=/"],
      ["Set-Cookie", "theme=dark; Max-Age=3600"],
      ["X-Custom-Header", "custom-value"],
      ["Authorization", "Bearer token123"]
    ]);

    // toJSON() conversion
    const headersObject = headers.toJSON();
    console.info("✅ toJSON() result:");
    console.info(JSON.stringify(headersObject, null, 2));

    // JSON.stringify() calls toJSON() automatically
    const jsonString = JSON.stringify(headers);
    console.info("\n✅ JSON.stringify() result:");
    console.info(jsonString);

    // Manual Object.fromEntries (slower)
    const manualObject = Object.fromEntries((headers as any).entries());
    console.info("\n✅ Object.fromEntries() result:");
    console.info(JSON.stringify(manualObject, null, 2));

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 6: Case-insensitive header handling
  console.info("🔤 Example 6: Case-insensitive header handling");
  try {
    console.info("📝 Demonstrating case-insensitive operations...");

    const headers = new Headers();

    // Add headers with different cases
    headers.set("Content-Type", "application/json");
    headers.set("content-type", "text/plain"); // Should overwrite
    headers.set("CONTENT-TYPE", "text/html"); // Should overwrite again

    console.info("✅ Final Content-Type:", headers.get("Content-Type"));
    console.info("✅ Get with lowercase:", headers.get("content-type"));
    console.info("✅ Get with uppercase:", headers.get("CONTENT-TYPE"));

    // Test has() with different cases
    console.info("✅ Has 'Content-Type':", headers.has("Content-Type"));
    console.info("✅ Has 'content-type':", headers.has("content-type"));

    // Delete with different cases
    headers.delete("content-type");
    console.info("✅ After delete - Has Content-Type:", headers.has("Content-Type"));

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 7: Headers in HTTP requests
  console.info("🌐 Example 7: Headers in HTTP requests");
  try {
    console.info("📝 Using Headers in actual HTTP request...");

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
    console.info("✅ Request sent successfully!");
    console.info("✅ Server received headers:");
    console.info(JSON.stringify(result.headers, null, 2));

    // Check response headers
    console.info("\n✅ Response headers:");
    for (const [key, value] of (response.headers as any)) {
      console.info(`  ${key}: ${value}`);
    }

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 8: Performance comparison
  console.info("⚡ Example 8: Performance comparison");
  try {
    console.info("📝 Comparing serialization performance...");

    const headers = new Headers();
    for (let i = 0; i < 100; i++) {
      headers.set(`Header-${i}`, `value-${i}`);
    }

    console.info(`✅ Created ${headers.count} headers`);

    // Test toJSON() performance
    const start1 = performance.now();
    const jsonResult = headers.toJSON();
    const time1 = performance.now() - start1;

    // Test Object.fromEntries() performance
    const start2 = performance.now();
    const entriesResult = Object.fromEntries((headers as any).entries());
    const time2 = performance.now() - start2;

    console.info(`✅ toJSON() time: ${time1.toFixed(2)}ms`);
    console.info(`✅ Object.fromEntries() time: ${time2.toFixed(2)}ms`);
    console.info(`✅ Performance ratio: ${(time2 / time1).toFixed(2)}x faster`);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n🎯 Headers API Summary:");
  console.info("✅ Constructor types - Empty, Record, Array, Copy");
  console.info("✅ Basic operations - get, set, append, delete, has");
  console.info("✅ Special handling - Set-Cookie with getAll()");
  console.info("✅ Iteration methods - entries, keys, values, forEach");
  console.info("✅ Serialization - toJSON(), JSON.stringify()");
  console.info("✅ Case-insensitive - Header name handling");
  console.info("✅ HTTP integration - Request and response headers");
  console.info("✅ Performance - Optimized toJSON() method");

  console.info("\n💡 Headers Benefits:");
  console.info("• Case-insensitive header names");
  console.info("• Special Set-Cookie handling with multiple values");
  console.info("• Fast serialization with toJSON()");
  console.info("• Multiple iteration patterns");
  console.info("• Web API compatibility");
  console.info("• Performance optimized for common operations");

  console.info("\n🚀 Headers API Demo Complete!");
}

// Execute the demo
runHeadersAPIDemo().catch(console.error);
