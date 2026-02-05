#!/usr/bin/env bun

/**
 * Bun Streaming Examples
 * Demonstrates response and request streaming capabilities
 */

// Main execution function to handle async operations
async function runStreamingExamples() {
  console.log("🌊 Bun Streaming Examples");
  console.log("========================\n");

  // Example 1: Stream response body using for-await
  console.log("📥 Example 1: Stream response with for-await");
  try {
    console.log("🌐 Fetching streaming data...");
    const response = await fetch("https://httpbin.org/stream/5");

    console.log("✅ Response received:");
    console.log("  Status:", response.status);
    console.log("  Content-Type:", response.headers.get("content-type"));
    console.log("  Body available:", !!response.body);

    console.log("\n📖 Streaming response chunks:");
    let chunkCount = 0;
    for await (const chunk of response.body! as any) {
      chunkCount++;
      const text = new TextDecoder().decode(chunk);
      console.log(`  Chunk ${chunkCount}:`, text.trim());
    }
    console.log(`✅ Total chunks received: ${chunkCount}`);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: Direct ReadableStream access with reader
  console.log("📚 Example 2: Direct ReadableStream reader");
  try {
    console.log("🌐 Fetching data for direct reading...");
    const response = await fetch("https://httpbin.org/stream/3");

    const stream = response.body!;
    const reader = stream.getReader();

    console.log("📖 Reading chunks manually:");
    let chunkCount = 0;
    let totalBytes = 0;

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        console.log("✅ Stream completed");
        break;
      }

      chunkCount++;
      totalBytes += value.length;
      const text = new TextDecoder().decode(value);
      console.log(`  Chunk ${chunkCount}:`, text.trim(), `(${value.length} bytes)`);
    }

    console.log(`📊 Summary: ${chunkCount} chunks, ${totalBytes} total bytes`);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: Stream request body
  console.log("📤 Example 3: Stream request body");
  try {
    console.log("🌐 Creating streaming request...");

    // Create a readable stream for the request body
    const requestStream = new ReadableStream({
      start(controller) {
        console.log("📝 Enqueuing data chunks...");
        controller.enqueue("Part 1: Hello from Bun streaming!\n");
        controller.enqueue("Part 2: This is chunk 2 of the stream\n");
        controller.enqueue("Part 3: Final chunk being sent\n");
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

    console.log("✅ Response received:");
    console.log("  Status:", response.status);

    const result = await response.json();
    console.log("📋 Server received data:");
    console.log("  Data length:", result.data?.length || 0, "characters");
    console.log("  Content preview:", result.data?.substring(0, 100) + "...");

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: Stream JSON data incrementally
  console.log("📊 Example 4: Stream JSON data");
  try {
    console.log("🌐 Fetching JSON stream...");
    const response = await fetch("https://httpbin.org/stream-bytes/1024");

    console.log("📖 Processing JSON stream:");
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.body! as any) {
      chunks.push(chunk);
      receivedBytes += chunk.length;
      console.log(`  Received chunk: ${chunk.length} bytes (total: ${receivedBytes})`);
    }

    // Combine all chunks
    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log("✅ Stream processing complete:");
    console.log("  Total bytes:", receivedBytes);
    console.log("  Chunks received:", chunks.length);
    console.log("  First 10 bytes:", Array.from(totalBuffer.slice(0, 10)));

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 5: Stream with error handling and backpressure
  console.log("⚡ Example 5: Stream with backpressure control");
  try {
    console.log("🌐 Fetching large stream with backpressure...");
    const response = await fetch("https://httpbin.org/stream-bytes/2048");

    console.log("📖 Processing with controlled reading:");
    const reader = response.body!.getReader();
    let receivedBytes = 0;
    const maxChunkSize = 256; // Simulate backpressure limit

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        console.log("✅ Stream completed");
        break;
      }

      // Simulate processing delay (backpressure)
      if (value.length > maxChunkSize) {
        console.log(`⚠️  Large chunk (${value.length} bytes), simulating backpressure...`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      receivedBytes += value.length;
      console.log(`  Processed ${value.length} bytes (total: ${receivedBytes})`);
    }

    console.log(`📊 Final: ${receivedBytes} bytes processed`);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 6: Transform stream (modify data on the fly)
  console.log("🔄 Example 6: Transform stream");
  try {
    console.log("🌐 Creating transform stream...");

    // Create a transform stream that converts text to uppercase
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const upperText = text.toUpperCase();
        controller.enqueue(new TextEncoder().encode(upperText));
      }
    });

    // Create source stream
    const sourceStream = new ReadableStream({
      start(controller) {
        controller.enqueue("Hello, World!\n");
        controller.enqueue("This is a transform stream\n");
        controller.enqueue("Converting to uppercase...\n");
        controller.close();
      }
    });

    // Pipe through transform stream
    const transformedStream = sourceStream.pipeThrough(transformStream);

    // Send transformed data
    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: transformedStream,
    });

    const result = await response.json();
    console.log("✅ Transform stream sent:");
    console.log("  Original data transformed to uppercase");
    console.log("  Server received:", result.data?.trim());

  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n🎯 Streaming Summary:");
  console.log("✅ for-await iteration - Simple streaming");
  console.log("✅ Direct reader access - Manual control");
  console.log("✅ Request body streaming - Upload data");
  console.log("✅ JSON streaming - Incremental parsing");
  console.log("✅ Backpressure handling - Flow control");
  console.log("✅ Transform streams - Data modification");

  console.log("\n💡 Streaming Benefits:");
  console.log("• Memory efficiency - No full buffering");
  console.log("• Real-time processing - Data as it arrives");
  console.log("• Large file support - Handle any size");
  console.log("• Network optimization - Reduced latency");
  console.log("• Backpressure control - Prevent overwhelm");

  console.log("\n🚀 Streaming Examples Complete!");
}

// Execute the examples
runStreamingExamples().catch(console.error);
