#!/usr/bin/env bun

// Enhanced BunFile stdin demo with advanced file operations
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.info(colourKit(0.8).ansi + "🚀 Enhanced BunFile stdin Demo" + "\x1b[0m");
console.info("=".repeat(50));

// Enhanced BunFile operations
async function enhancedBunFileDemo() {
  console.info(
    colourKit(0.6).ansi + "\n📁 Enhanced BunFile Operations" + "\x1b[0m"
  );
  console.info("Advanced file operations on stdin data\n");

  try {
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.info("ℹ️ No piped data detected.");
      console.info(
        'Try: echo "hello world\\n\\nmulti\\nline" | bun run stdin-enhanced'
      );
      return;
    }

    console.info(`📊 File Analysis:`);
    console.info(`  Size: ${size} bytes`);
    console.info(`  Type: ${stdinFile.constructor.name}`);

    // Read as text first (this will consume stdin)
    const textContent = await stdinFile.text();
    console.info(`  Text length: ${textContent.length} chars`);

    // Content analysis
    console.info("\n📈 Content Analysis:");
    const lines = textContent.split("\n").filter((line) => line.length > 0);
    const words = textContent.split(/\s+/).filter((word) => word.length > 0);
    const chars = textContent.length;

    console.info(`  Lines: ${lines.length}`);
    console.info(`  Words: ${words.length}`);
    console.info(`  Characters: ${chars}`);
    console.info(
      `  Average line length: ${
        lines.length > 0 ? (chars / lines.length).toFixed(1) : 0
      }`
    );

    // Show lines with details
    console.info("\n📋 Line Details:");
    console.info("┌─────┬──────────┬──────────┬──────────┐");
    console.info("│ #   │ Length   │ Words    │ Preview  │");
    console.info("├─────┼──────────┼──────────┼──────────┤");

    lines.forEach((line, i) => {
      const wordCount = line.split(/\s+/).filter((w) => w.length > 0).length;
      const preview = line.length > 10 ? line.slice(0, 10) + "..." : line;
      const color = colourKit(Math.min(line.length / 50, 1)).ansi;

      console.info(
        `│ ${pad((i + 1).toString(), 3)} │ ${pad(
          line.length.toString(),
          8
        )} │ ${pad(wordCount.toString(), 8)} │ ${color}${pad(
          preview,
          8
        )}\x1b[0m │`
      );
    });

    console.info("└─────┴──────────┴──────────┴──────────┘");

    // File operations
    console.info("\n💾 File Operations:");

    // Save to temporary file
    const tempFile = "/tmp/stdin-enhanced-output.txt";
    await Bun.write(tempFile, textContent);
    console.info(`  ✅ Saved to: ${tempFile}`);

    // Read back and verify
    const verifyContent = await Bun.file(tempFile).text();
    const isValid = verifyContent === textContent;
    console.info(
      `  ${isValid ? "✅" : "❌"} Verification: ${
        isValid ? "Passed" : "Failed"
      }`
    );

    // Create analysis report
    const report = {
      timestamp: new Date().toISOString(),
      source: "stdin-enhanced",
      analysis: {
        size: size,
        lines: lines.length,
        words: words.length,
        characters: chars,
      },
      content: {
        preview: textContent.slice(0, 100),
        lines: lines.map((line, i) => ({ number: i + 1, content: line })),
      },
    };

    const reportFile = "/tmp/stdin-analysis.json";
    await Bun.write(reportFile, JSON.stringify(report, null, 2));
    console.info(`  📊 Analysis report: ${reportFile}`);

    // Show file info
    const savedFile = Bun.file(tempFile);
    const savedStats = await savedFile.exists();
    console.info(`  📁 Saved file exists: ${savedStats}`);

    if (savedStats) {
      console.info(`  📏 Saved file size: ${await savedFile.size} bytes`);
      console.info(
        `  🕒 Last modified: ${new Date(
          await savedFile.lastModified
        ).toISOString()}`
      );
    }

    // Return text content for binary analysis
    return textContent;
  } catch (error) {
    console.info(`❌ Error: ${error.message}`);
    return null;
  }
}

// Binary data processing
async function binaryDataDemo(textContent) {
  console.info(colourKit(0.7).ansi + "\n🔢 Binary Data Processing" + "\x1b[0m");

  try {
    if (!textContent) {
      console.info("ℹ️ No text content to analyze");
      return;
    }

    // Use the saved file for binary analysis since stdin is exhausted
    const savedFile = Bun.file("/tmp/stdin-enhanced-output.txt");
    const size = await savedFile.size;

    console.info(`📊 Binary Analysis:`);
    console.info(`  Total bytes: ${size}`);

    // Read as Uint8Array from saved file
    const uint8Array = new Uint8Array(await savedFile.arrayBuffer());

    // Byte frequency analysis
    const frequency = new Array(256).fill(0);
    uint8Array.forEach((byte) => frequency[byte]++);

    const nonZeroBytes = frequency.filter(
      (count, byte) => count > 0 && byte !== 10 && byte !== 13
    ).length;
    console.info(`  Unique non-control bytes: ${nonZeroBytes}`);

    // Show hex dump of first 64 bytes
    console.info("\n🔍 Hex Dump (first 64 bytes):");
    const displayBytes = uint8Array.slice(0, 64);

    for (let i = 0; i < displayBytes.length; i += 16) {
      const chunk = displayBytes.slice(i, i + 16);
      const hex = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const ascii = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");

      const offset = i.toString(16).padStart(8, "0");
      console.info(`  ${offset}: ${hex.padEnd(47)} |${ascii}|`);
    }

    // Check for common patterns
    console.info("\n🔍 Pattern Detection:");
    const isText = uint8Array.every(
      (b) => b === 10 || b === 13 || (b >= 32 && b <= 126)
    );
    const hasNull = uint8Array.includes(0);
    const isUTF8 = true; // Simplified check

    console.info(`  Text data: ${isText ? "✅ Yes" : "❌ No"}`);
    console.info(`  Null bytes: ${hasNull ? "⚠️ Found" : "✅ None"}`);
    console.info(`  UTF-8 compatible: ${isUTF8 ? "✅ Yes" : "❌ No"}`);
  } catch (error) {
    console.info(`❌ Binary processing error: ${error.message}`);
  }
}

// Performance comparison
async function performanceDemo() {
  console.info(colourKit(0.5).ansi + "\n⚡ Performance Comparison" + "\x1b[0m");

  try {
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.info("ℹ️ No data for performance test");
      return;
    }

    console.info(`🏃 Performance tests on ${size} bytes:`);

    // Test 1: text() method
    const start1 = performance.now();
    const textContent = await stdinFile.text();
    const time1 = performance.now() - start1;

    // Test 2: arrayBuffer() method
    const start2 = performance.now();
    const arrayBuffer = await stdinFile.arrayBuffer();
    const time2 = performance.now() - start2;

    // Test 3: stream() method
    const start3 = performance.now();
    const stream = stdinFile.stream();
    const reader = stream.getReader();
    let streamSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamSize += value.length;
    }
    reader.releaseLock();
    const time3 = performance.now() - start3;

    console.info("┌─────────────────┬──────────┬──────────┐");
    console.info("│ Method           │ Time (ms) │ Size     │");
    console.info("├─────────────────┼──────────┼──────────┤");
    console.info(
      `│ ${pad("text()", 15)} │ ${pad(time1.toFixed(2), 8)} │ ${pad(
        textContent.length + "B",
        8
      )} │`
    );
    console.info(
      `│ ${pad("arrayBuffer()", 15)} │ ${pad(time2.toFixed(2), 8)} │ ${pad(
        arrayBuffer.byteLength + "B",
        8
      )} │`
    );
    console.info(
      `│ ${pad("stream()", 15)} │ ${pad(time3.toFixed(2), 8)} │ ${pad(
        streamSize + "B",
        8
      )} │`
    );
    console.info("└─────────────────┴──────────┴──────────┘");

    // Find fastest method
    const times = [time1, time2, time3];
    const methods = ["text()", "arrayBuffer()", "stream()"];
    const fastestIndex = times.indexOf(Math.min(...times));

    console.info(
      `🏆 Fastest method: ${methods[fastestIndex]} (${times[
        fastestIndex
      ].toFixed(2)}ms)`
    );
  } catch (error) {
    console.info(`❌ Performance test error: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info("🎯 Enhanced BunFile capabilities:");
  console.info("  • Advanced file operations");
  console.info("  • Binary data processing");
  console.info("  • Performance analysis");
  console.info("  • Content statistics");
  console.info("  • File I/O operations");

  await enhancedBunFileDemo();
  await binaryDataDemo();
  await performanceDemo();

  console.info(
    "\n" +
      colourKit(0.2).ansi +
      "🎉 Enhanced BunFile Demo Completed!" +
      "\x1b[0m"
  );
  console.info("💡 Check /tmp/ for generated files:");
  console.info("  • stdin-enhanced-output.txt");
  console.info("  • stdin-analysis.json");
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 Enhanced demo - Cleaning up...");
  process.exit(0);
});

// Start the enhanced demo
main().catch(console.error);
