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
  console.log("🌐 Bun Response Body Methods Demo");
  console.log("===================================\n");

  // Example 1: response.text() - Get response as string
  console.log("📝 Example 1: response.text()");
  try {
    const response = await fetch("https://httpbin.org/json");
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Content-Type:", response.headers.get("content-type"));
    console.log("First 100 chars:", text.substring(0, 100) + "...");
    console.log("Type:", typeof text);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: response.json() - Parse JSON response
  console.log("📊 Example 2: response.json()");
  try {
    const response = await fetch("https://httpbin.org/json");
    const json = await response.json();
    console.log("Status:", response.status);
    console.log("Parsed JSON:", json);
    console.log("Type:", typeof json);
    console.log("Slideshow title:", json.slideshow?.title);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: response.bytes() - Get raw bytes
  console.log("🔢 Example 3: response.bytes()");
  try {
    const response = await fetch("https://httpbin.org/bytes/16");
    const bytes = await response.bytes();
    console.log("Status:", response.status);
    console.log("Bytes length:", bytes.length);
    console.log("Bytes:", Array.from(bytes));
    console.log("Type:", bytes.constructor.name);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: response.arrayBuffer() - Get ArrayBuffer
  console.log("💾 Example 4: response.arrayBuffer()");
  try {
    const response = await fetch("https://httpbin.org/bytes/8");
    const arrayBuffer = await response.arrayBuffer();
    console.log("Status:", response.status);
    console.log("Buffer byte length:", arrayBuffer.byteLength);
    console.log("Buffer:", new Uint8Array(arrayBuffer));
    console.log("Type:", arrayBuffer.constructor.name);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 5: response.blob() - Get Blob
  console.log("🫧 Example 5: response.blob()");
  try {
    const response = await fetch("https://httpbin.org/bytes/4");
    const blob = await response.blob();
    console.log("Status:", response.status);
    console.log("Blob size:", blob.size);
    console.log("Blob type:", blob.type);
    console.log("Blob sliced:", await blob.slice(0, 2).text());
    console.log("Type:", blob.constructor.name);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 6: response.formData() - Parse form data
  console.log("📋 Example 6: response.formData()");
  try {
    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "name=John&age=30&city=New+York",
    });
    const result = await response.json();
    console.log("Status:", response.status);
    console.log("Form data received:", result.form);
    console.log("Type:", typeof result.form);
  } catch (error) {
    console.log("Error:", error.message);
  }

  console.log("\n🎯 Response Body Methods Summary:");
  console.log("✅ text() - String content (HTML, plain text)");
  console.log("✅ json() - Parsed JavaScript objects");
  console.log("✅ bytes() - Raw Uint8Array data");
  console.log("✅ arrayBuffer() - Binary buffer data");
  console.log("✅ blob() - File-like binary objects");
  console.log("✅ formData() - Form submissions");

  console.log("\n💡 Usage Tips:");
  console.log("• Use text() for HTML, XML, or plain text responses");
  console.log("• Use json() for API responses with JSON content");
  console.log("• Use bytes/arrayBuffer() for binary data processing");
  console.log("• Use blob() for file downloads or uploads");
  console.log("• Use formData() for handling form submissions");

  console.log("\n🚀 Demo Complete!");
}

// Execute the demo
runResponseMethodsDemo().catch(console.error);
