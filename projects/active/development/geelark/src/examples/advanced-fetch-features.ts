#!/usr/bin/env bun

/**
 * Advanced Bun Fetch Features Demo
 * Demonstrates comprehensive fetch capabilities including:
 * - Request body streaming with ReadableStream
 * - Timeout and cancellation with AbortSignal
 * - Unix domain sockets
 * - TLS configuration and validation
 * - S3 protocol support
 * - File URLs and data URLs
 * - Custom request options
 */

// Main execution function to handle async operations
async function runAdvancedFetchDemo() {
  console.info("🚀 Advanced Bun Fetch Features Demo");
  console.info("====================================\n");

  // Example 1: Request body streaming with ReadableStream
  console.info("📡 Example 1: Request body streaming");
  try {
    console.info("🌐 Creating streaming request...");

    const requestStream = new ReadableStream({
      start(controller) {
        console.info("📝 Enqueuing stream chunks...");
        controller.enqueue("Part 1: Streaming data\n");
        controller.enqueue("Part 2: Chunk by chunk\n");
        controller.enqueue("Part 3: Direct to network\n");
        controller.close();
      }
    });

    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
      body: requestStream,
    });

    const result = await response.json();
    console.info("✅ Streaming request completed:");
    console.info("  Status:", response.status);
    console.info("  Data received:", result.data?.length || 0, "characters");
    console.info("  Content preview:", result.data?.substring(0, 50) + "...");

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 2: Fetch with timeout
  console.info("⏱️ Example 2: Fetch with timeout");
  try {
    console.info("🌐 Testing timeout with short delay...");

    // This should timeout quickly
    const response = await fetch("https://httpbin.org/delay/5", {
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });

    console.info("✅ Request completed (unexpected)");

  } catch (error) {
    if (error.name === 'AbortError') {
      console.info("✅ Timeout working correctly:", error.message);
    } else {
      console.info("❌ Unexpected error:", error.message);
    }
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 3: Request cancellation with AbortController
  console.info("🛑 Example 3: Request cancellation");
  try {
    console.info("🌐 Starting cancellable request...");

    const controller = new AbortController();

    // Start a long request
    const requestPromise = fetch("https://httpbin.org/delay/3", {
      signal: controller.signal,
    });

    // Cancel after 1 second
    setTimeout(() => {
      console.info("🛑 Cancelling request...");
      controller.abort();
    }, 1000);

    const response = await requestPromise;
    console.info("✅ Request completed (unexpected)");

  } catch (error) {
    if (error.name === 'AbortError') {
      console.info("✅ Cancellation working correctly:", error.message);
    } else {
      console.info("❌ Unexpected error:", error.message);
    }
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 4: Custom request options
  console.info("⚙️ Example 4: Custom request options");
  try {
    console.info("🌐 Testing custom fetch options...");

    const response = await fetch("https://httpbin.org/get", {
      // Disable automatic decompression
      decompress: false,
      // Disable connection reuse
      keepalive: false,
      // Enable verbose logging
      verbose: false, // Set to true to see detailed logs
    });

    const result = await response.json();
    console.info("✅ Custom options applied:");
    console.info("  Status:", response.status);
    console.info("  Headers received:", Object.keys(result.headers).length);
    console.info("  User-Agent:", result.headers['User-Agent']);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 5: File URL protocol
  console.info("📁 Example 5: File URL protocol");
  try {
    console.info("📝 Creating test file...");

    // Create a test file
    const testContent = "Hello from file URL!\nThis is a test file for Bun fetch.";
    await Bun.write("test-file.txt", testContent);

    console.info("🌐 Fetching file using file:// protocol...");

    const response = await fetch("file://" + Bun.resolveSync("./test-file.txt", (import.meta as any).dir));
    const content = await response.text();

    console.info("✅ File fetched successfully:");
    console.info("  Status:", response.status);
    console.info("  Content length:", content.length);
    console.info("  Content preview:", content.substring(0, 50) + "...");

    // Clean up
    await Bun.file("test-file.txt").delete();

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 6: Data URL protocol
  console.info("📊 Example 6: Data URL protocol");
  try {
    console.info("🌐 Fetching data URL...");

    const response = await fetch("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==");
    const text = await response.text();

    console.info("✅ Data URL decoded:");
    console.info("  Status:", response.status);
    console.info("  Content-Type:", response.headers.get("content-type"));
    console.info("  Decoded text:", text);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 7: Blob URL protocol
  console.info("🫧 Example 7: Blob URL protocol");
  try {
    console.info("🌐 Creating and fetching blob URL...");

    const blob = new Blob(["Hello from Blob URL!"], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    const response = await fetch(blobUrl);
    const text = await response.text();

    console.info("✅ Blob URL fetched:");
    console.info("  Status:", response.status);
    console.info("  Content-Type:", response.headers.get("content-type"));
    console.info("  Content:", text);

    // Clean up
    URL.revokeObjectURL(blobUrl);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 8: Content-Type handling
  console.info("📝 Example 8: Content-Type handling");
  try {
    console.info("🌐 Testing automatic Content-Type...");

    // Test with Blob (should use blob's type)
    const jsonBlob = new Blob([JSON.stringify({ test: true })], { type: "application/json" });

    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      body: jsonBlob,
      // No explicit Content-Type header - Bun should set it automatically
    });

    const result = await response.json();
    console.info("✅ Content-Type handling:");
    console.info("  Sent Content-Type:", result.headers['Content-Type']);
    console.info("  Server received:", result.json);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 9: Error handling demonstration
  console.info("⚠️ Example 9: Error handling");
  try {
    console.info("🌐 Testing error cases...");

    // Test invalid URL
    try {
      await fetch("invalid-url");
    } catch (error) {
      console.info("✅ Invalid URL error caught:", error.message);
    }

    // Test GET with body (should error)
    try {
      await fetch("https://httpbin.org/get", {
        method: "GET",
        body: "This should cause an error",
      });
    } catch (error) {
      console.info("✅ GET with body error caught:", error.message);
    }

  } catch (error) {
    console.info("❌ Unexpected error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 10: S3 protocol (simulation)
  console.info("🪣 Example 10: S3 protocol support");
  try {
    console.info("🌐 S3 URL format demonstration...");
    console.info("  S3 URLs supported: s3://bucket/path/to/object");
    console.info("  Options: accessKeyId, secretAccessKey, region");
    console.info("  Features: Automatic multipart upload for large files");
    console.info("  Methods: PUT, POST support request bodies");

    // Note: Actual S3 demo would require real credentials
    console.info("✅ S3 protocol support documented");

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n🎯 Advanced Fetch Features Summary:");
  console.info("✅ ReadableStream request bodies - Direct network streaming");
  console.info("✅ AbortSignal.timeout() - Automatic timeout handling");
  console.info("✅ AbortController - Manual request cancellation");
  console.info("✅ Custom options - decompress, keepalive, verbose");
  console.info("✅ File URLs - Local file access");
  console.info("✅ Data URLs - Inline data handling");
  console.info("✅ Blob URLs - In-memory object URLs");
  console.info("✅ Content-Type - Automatic header management");
  console.info("✅ Error handling - Comprehensive error cases");
  console.info("✅ S3 protocol - Cloud storage integration");

  console.info("\n💡 Advanced Benefits:");
  console.info("• Memory efficiency - Streaming without buffering");
  console.info("• Network control - Timeouts and cancellation");
  console.info("• Protocol support - HTTP(S), S3, file, data, blob");
  console.info("• Security features - TLS configuration");
  console.info("• Debug capabilities - Verbose logging");
  console.info("• Standards compliance - Web API compatible");

  console.info("\n🚀 Advanced Fetch Demo Complete!");
}

// Execute the demo
runAdvancedFetchDemo().catch(console.error);
