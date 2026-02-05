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
  console.log("🫧 Bun Blob Handling Examples");
  console.log("=============================\n");

  // Example 1: Download and save a blob as a file
  console.log("📁 Example 1: Download and save blob as file");
  try {
    const response = await fetch("https://httpbin.org/json");
    const blob = await response.blob();

    console.log("✅ Blob created:");
    console.log("  Size:", blob.size, "bytes");
    console.log("  Type:", blob.type);
    console.log("  Constructor:", blob.constructor.name);

    // Save blob to file
    await Bun.write("downloaded-data.json", blob);
    console.log("  💾 Saved to: downloaded-data.json");

    // Read back and verify
    const savedContent = await Bun.file("downloaded-data.json").text();
    console.log("  ✅ Verification: Contains", savedContent.includes("slideshow") ? "valid JSON" : "invalid data");

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: Create and upload a blob
  console.log("📤 Example 2: Create and upload blob");
  try {
    // Create a blob from string data
    const jsonData = JSON.stringify({
      message: "Hello from Bun!",
      timestamp: new Date().toISOString(),
      data: [1, 2, 3, 4, 5]
    });

    const uploadBlob = new Blob([jsonData], { type: "application/json" });

    console.log("✅ Upload blob created:");
    console.log("  Size:", uploadBlob.size, "bytes");
    console.log("  Type:", uploadBlob.type);

    // Simulate upload by posting to httpbin
    const uploadResponse = await fetch("https://httpbin.org/post", {
      method: "POST",
      body: uploadBlob,
      headers: {
        "Content-Type": "application/json",
      }
    });

    const result = await uploadResponse.json();
    console.log("  📡 Upload response status:", uploadResponse.status);
    console.log("  📋 Received data:", result.json);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: Blob slicing and partial content
  console.log("✂️ Example 3: Blob slicing operations");
  try {
    const response = await fetch("https://httpbin.org/bytes/32");
    const blob = await response.blob();

    console.log("✅ Original blob:");
    console.log("  Size:", blob.size, "bytes");

    // Slice the blob into parts
    const firstHalf = blob.slice(0, 16);
    const secondHalf = blob.slice(16, 32);

    console.log("🔪 First half:");
    console.log("  Size:", firstHalf.size, "bytes");
    console.log("  Content:", await firstHalf.text());

    console.log("🔪 Second half:");
    console.log("  Size:", secondHalf.size, "bytes");
    console.log("  Content:", await secondHalf.text());

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: Convert between blob types
  console.log("🔄 Example 4: Blob type conversions");
  try {
    // Create blob from different data types
    const textBlob = new Blob(["Hello, Bun!"], { type: "text/plain" });
    const jsonBlob = new Blob([JSON.stringify({ test: true })], { type: "application/json" });

    console.log("📝 Text blob:");
    console.log("  Size:", textBlob.size, "bytes");
    console.log("  As text:", await textBlob.text());

    console.log("📊 JSON blob:");
    console.log("  Size:", jsonBlob.size, "bytes");
    console.log("  As text:", await jsonBlob.text());
    console.log("  As JSON:", JSON.parse(await jsonBlob.text()));

    // Convert to ArrayBuffer
    const arrayBuffer = await textBlob.arrayBuffer();
    console.log("💾 As ArrayBuffer:");
    console.log("  Byte length:", arrayBuffer.byteLength);
    console.log("  As Uint8Array:", new Uint8Array(arrayBuffer));

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 5: Practical file download with progress
  console.log("📈 Example 5: File download with blob handling");
  try {
    console.log("🌐 Downloading image data...");
    const response = await fetch("https://httpbin.org/bytes/64");

    console.log("📊 Response info:");
    console.log("  Status:", response.status);
    console.log("  Content-Type:", response.headers.get("content-type"));

    const blob = await response.blob();

    console.log("✅ Blob received:");
    console.log("  Size:", blob.size, "bytes");
    console.log("  Type:", blob.type);

    // Save with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `download-${timestamp}.bin`;

    await Bun.write(filename, blob);
    console.log("  💾 Saved as:", filename);

    // Verify file exists and size
    const fileStats = await Bun.file(filename).stat();
    console.log("  ✅ File verification:");
    console.log("    Exists:", fileStats.isFile);
    console.log("    Size:", fileStats.size, "bytes");

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n🎯 Blob Usage Summary:");
  console.log("✅ response.blob() - Download binary data");
  console.log("✅ new Blob() - Create blobs from data");
  console.log("✅ blob.slice() - Extract partial content");
  console.log("✅ blob.text() - Convert to string");
  console.log("✅ blob.arrayBuffer() - Convert to binary buffer");
  console.log("✅ Bun.write() - Save blobs to files");

  console.log("\n💡 Practical Applications:");
  console.log("• File downloads and uploads");
  console.log("• Image processing and manipulation");
  console.log("• Binary data streaming");
  console.log("• API request/response handling");
  console.log("• Content type conversions");

  console.log("\n🚀 Blob Examples Complete!");
}

// Execute the examples
runBlobExamples().catch(console.error);
