#!/usr/bin/env bun

/**
 * Bun Response Body Methods Demo
 * Demonstrates the different ways to read HTTP response bodies in Bun
 */

// Make this file a module for top-level await support
export { };

// Extend Response interface for Bun-specific methods
declare global {
  interface Response {
    bytes(): Promise<Uint8Array>;
  }
}

// Main execution function to handle async operations
async function runResponseMethodsDemo() {
  console.info("🌐 Bun Response Body Methods Demo");
  console.info("===================================\n");

  // Example 1: response.text() - Get response as string
  console.info("📝 Example 1: response.text()");
  try {
    const response = await fetch("https://httpbin.org/json");
    const text = await response.text();
    console.info("Status:", response.status);
    console.info("Content-Type:", response.headers.get("content-type"));
    console.info("First 100 chars:", text.substring(0, 100) + "...");
    console.info("Type:", typeof text);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 2: response.json() - Parse JSON response
  console.info("📊 Example 2: response.json()");
  try {
    const response = await fetch("https://httpbin.org/json");
    const json = await response.json();
    console.info("Status:", response.status);
    console.info("Parsed JSON:", json);
    console.info("Type:", typeof json);
    console.info("Slideshow title:", json.slideshow?.title);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 3: response.bytes() - Get raw bytes
  console.info("🔢 Example 3: response.bytes()");
  try {
    const response = await fetch("https://httpbin.org/bytes/16");
    const bytes = await response.bytes();
    console.info("Status:", response.status);
    console.info("Bytes length:", bytes.length);
    console.info("Bytes:", Array.from(bytes));
    console.info("Type:", bytes.constructor.name);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 4: response.arrayBuffer() - Get ArrayBuffer
  console.info("💾 Example 4: response.arrayBuffer()");
  try {
    const response = await fetch("https://httpbin.org/bytes/8");
    const arrayBuffer = await response.arrayBuffer();
    console.info("Status:", response.status);
    console.info("Buffer byte length:", arrayBuffer.byteLength);
    console.info("Buffer:", new Uint8Array(arrayBuffer));
    console.info("Type:", arrayBuffer.constructor.name);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 5: response.blob() - Get Blob
  console.info("🫧 Example 5: response.blob()");
  try {
    const response = await fetch("https://httpbin.org/bytes/4");
    const blob = await response.blob();
    console.info("Status:", response.status);
    console.info("Blob size:", blob.size);
    console.info("Blob type:", blob.type);
    console.info("Blob sliced:", await blob.slice(0, 2).text());
    console.info("Type:", blob.constructor.name);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 6: response.formData() - Parse form data
  console.info("📋 Example 6: response.formData()");
  try {
    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "name=John&age=30&city=New+York",
    });
    const result = await response.json();
    console.info("Status:", response.status);
    console.info("Form data received:", result.form);
    console.info("Type:", typeof result.form);
  } catch (error) {
    console.info("Error:", error.message);
  }

  console.info("\n🎯 Response Body Methods Summary:");
  console.info("✅ text() - String content (HTML, plain text)");
  console.info("✅ json() - Parsed JavaScript objects");
  console.info("✅ bytes() - Raw Uint8Array data");
  console.info("✅ arrayBuffer() - Binary buffer data");
  console.info("✅ blob() - File-like binary objects");
  console.info("✅ formData() - Form submissions");

  console.info("\n💡 Usage Tips:");
  console.info("• Use text() for HTML, XML, or plain text responses");
  console.info("• Use json() for API responses with JSON content");
  console.info("• Use bytes/arrayBuffer() for binary data processing");
  console.info("• Use blob() for file downloads or uploads");
  console.info("• Use formData() for handling form submissions");

  console.info("\n🚀 Demo Complete!");
}

// Execute the demo
runResponseMethodsDemo().catch(console.error);
