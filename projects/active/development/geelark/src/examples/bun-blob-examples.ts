#!/usr/bin/env bun

/**
 * Bun Blob Handling Examples
 * Demonstrates practical usage of response.blob() for file operations
 */

// Make this file a module for top-level await support
export { };

// Explicitly configure module support for this file
declare module "*.ts" {
  const content: any;
  export default content;
}

// Main execution function to handle async operations
async function runBlobExamples() {
  console.info("🫧 Bun Blob Handling Examples");
  console.info("=============================\n");

  // Example 1: Download and save a blob as a file
  console.info("📁 Example 1: Download and save blob as file");
  try {
    const response = await fetch("https://httpbin.org/json");
    const blob = await response.blob();

    console.info("✅ Blob created:");
    console.info("  Size:", blob.size, "bytes");
    console.info("  Type:", blob.type);
    console.info("  Constructor:", blob.constructor.name);

    // Save blob to file
    await Bun.write("downloaded-data.json", blob);
    console.info("  💾 Saved to: downloaded-data.json");

    // Read back and verify
    const savedContent = await Bun.file("downloaded-data.json").text();
    console.info("  ✅ Verification: Contains", savedContent.includes("slideshow") ? "valid JSON" : "invalid data");

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 2: Create and upload a blob
  console.info("📤 Example 2: Create and upload blob");
  try {
    // Create a blob from string data
    const jsonData = JSON.stringify({
      message: "Hello from Bun!",
      timestamp: new Date().toISOString(),
      data: [1, 2, 3, 4, 5]
    });

    const uploadBlob = new Blob([jsonData], { type: "application/json" });

    console.info("✅ Upload blob created:");
    console.info("  Size:", uploadBlob.size, "bytes");
    console.info("  Type:", uploadBlob.type);

    // Simulate upload by posting to httpbin
    const uploadResponse = await fetch("https://httpbin.org/post", {
      method: "POST",
      body: uploadBlob,
      headers: {
        "Content-Type": "application/json",
      }
    });

    const result = await uploadResponse.json();
    console.info("  📡 Upload response status:", uploadResponse.status);
    console.info("  📋 Received data:", result.json);

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 3: Blob slicing and partial content
  console.info("✂️ Example 3: Blob slicing operations");
  try {
    const response = await fetch("https://httpbin.org/bytes/32");
    const blob = await response.blob();

    console.info("✅ Original blob:");
    console.info("  Size:", blob.size, "bytes");

    // Slice the blob into parts
    const firstHalf = blob.slice(0, 16);
    const secondHalf = blob.slice(16, 32);

    console.info("🔪 First half:");
    console.info("  Size:", firstHalf.size, "bytes");
    console.info("  Content:", await firstHalf.text());

    console.info("🔪 Second half:");
    console.info("  Size:", secondHalf.size, "bytes");
    console.info("  Content:", await secondHalf.text());

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 4: Convert between blob types
  console.info("🔄 Example 4: Blob type conversions");
  try {
    // Create blob from different data types
    const textBlob = new Blob(["Hello, Bun!"], { type: "text/plain" });
    const jsonBlob = new Blob([JSON.stringify({ test: true })], { type: "application/json" });

    console.info("📝 Text blob:");
    console.info("  Size:", textBlob.size, "bytes");
    console.info("  As text:", await textBlob.text());

    console.info("📊 JSON blob:");
    console.info("  Size:", jsonBlob.size, "bytes");
    console.info("  As text:", await jsonBlob.text());
    console.info("  As JSON:", JSON.parse(await jsonBlob.text()));

    // Convert to ArrayBuffer
    const arrayBuffer = await textBlob.arrayBuffer();
    console.info("💾 As ArrayBuffer:");
    console.info("  Byte length:", arrayBuffer.byteLength);
    console.info("  As Uint8Array:", new Uint8Array(arrayBuffer));

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n" + "=".repeat(50) + "\n");

  // Example 5: Practical file download with progress
  console.info("📈 Example 5: File download with blob handling");
  try {
    console.info("🌐 Downloading image data...");
    const response = await fetch("https://httpbin.org/bytes/64");

    console.info("📊 Response info:");
    console.info("  Status:", response.status);
    console.info("  Content-Type:", response.headers.get("content-type"));

    const blob = await response.blob();

    console.info("✅ Blob received:");
    console.info("  Size:", blob.size, "bytes");
    console.info("  Type:", blob.type);

    // Save with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `download-${timestamp}.bin`;

    await Bun.write(filename, blob);
    console.info("  💾 Saved as:", filename);

    // Verify file exists and size
    const fileStats = await Bun.file(filename).stat();
    console.info("  ✅ File verification:");
    console.info("    Exists:", fileStats.isFile);
    console.info("    Size:", fileStats.size, "bytes");

  } catch (error) {
    console.info("❌ Error:", error.message);
  }

  console.info("\n🎯 Blob Usage Summary:");
  console.info("✅ response.blob() - Download binary data");
  console.info("✅ new Blob() - Create blobs from data");
  console.info("✅ blob.slice() - Extract partial content");
  console.info("✅ blob.text() - Convert to string");
  console.info("✅ blob.arrayBuffer() - Convert to binary buffer");
  console.info("✅ Bun.write() - Save blobs to files");

  console.info("\n💡 Practical Applications:");
  console.info("• File downloads and uploads");
  console.info("• Image processing and manipulation");
  console.info("• Binary data streaming");
  console.info("• API request/response handling");
  console.info("• Content type conversions");

  console.info("\n🚀 Blob Examples Complete!");
}

// Execute the examples
runBlobExamples().catch(console.error);
