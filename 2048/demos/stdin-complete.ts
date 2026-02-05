#!/usr/bin/env bun

// Comprehensive stdin reading demo - All patterns from Bun documentation
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log(
  colourKit(0.8).ansi + "📥 Comprehensive Bun stdin Demo" + "\x1b[0m"
);
console.log("=".repeat(50));

// Demo 1: Basic console AsyncIterable (from documentation)
async function basicConsoleStdin() {
  console.log(
    colourKit(0.5).ansi + "\n🔤 Basic Console stdin (AsyncIterable)" + "\x1b[0m"
  );
  console.log('Type messages (press Enter after each). Type "quit" to exit.\n');

  const prompt = "Type something: ";
  process.stdout.write(prompt);

  let messageCount = 0;

  for await (const line of console) {
    const trimmed = line.trim();

    if (trimmed === "quit" || trimmed === "exit") {
      console.log("👋 Exiting basic stdin demo...");
      break;
    }

    messageCount++;
    const color = colourKit(Math.random()).ansi;
    console.log(`${color}You typed (${messageCount}): ${trimmed}\x1b[0m`);
    console.log(`Length: ${trimmed.length} characters`);

    process.stdout.write(prompt);
  }

  console.log(`✅ Processed ${messageCount} messages\n`);
}

// Demo 2: Bun.stdin as BunFile for chunked reading
async function chunkedStdin() {
  console.log(
    colourKit(0.6).ansi + "\n📦 Chunked stdin (Bun.stdin as BunFile)" + "\x1b[0m"
  );
  console.log("This demo reads Bun.stdin as a file. Try piping data:\n");
  console.log(
    'Example: echo "hello world" | bun run stdin-complete.ts\n'
  );

  let chunkCount = 0;
  let totalBytes = 0;

  try {
    // Use Bun.stdin as a BunFile
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.log(
        'ℹ️ No data received. Try piping: echo "test" | bun run stdin-complete.ts'
      );
      return;
    }

    console.log(`📊 stdin file size: ${size} bytes`);

    // Read the entire stdin content
    const content = await stdinFile.text();
    const chunks = content.split("\n").filter((line) => line.length > 0);

    console.log(`📦 Processing ${chunks.length} chunks:`);

    for (const chunk of chunks) {
      chunkCount++;
      totalBytes += chunk.length;

      console.log(`Chunk ${chunkCount}: ${chunk.length} bytes`);
      console.log(`Content: "${chunk}"`);

      // Show hex representation for binary data
      if (chunk.length > 0) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(chunk);
        const hex = Array.from(bytes.slice(0, 16))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.log(`Hex (first 16): ${hex}`);
      }

      console.log("---");
    }

    console.log(`✅ Processed ${chunkCount} chunks, ${totalBytes} total bytes\n");
  } catch (error) {
    console.log("❌ Chunk reading error: " + error.message);
  }
}

// Demo 3: Advanced stdin with processing
async function advancedStdin() {
  console.log(
    colourKit(0.7).ansi + "\n⚡ Advanced stdin with Data Processing" + "\x1b[0m"
  );
  console.log("Type commands: calc, reverse, stats, or quit\n");

  let totalChars = 0;
  let wordCount = 0;
  let lineCount = 0;

  const prompt = "Command > ";
  process.stdout.write(prompt);

  for await (const line of console) {
    const input = line.trim();
    lineCount++;
    totalChars += input.length;
    wordCount += input.split(/\s+/).filter((w) => w.length > 0).length;

    switch (input.toLowerCase()) {
      case "quit":
      case "exit":
        console.log("👋 Exiting advanced demo...");
        break;

      case "stats":
        console.log("\n📊 Current Statistics:");
        console.log(`Lines processed: ${lineCount}`);
        console.log(`Total characters: ${totalChars}`);
        console.log(`Word count: ${wordCount}`);
        console.log(
          `Average line length: ${(totalChars / lineCount).toFixed(1)}`
        );
        break;

      case "calc":
        console.log("\n🧮 Simple Calculator Mode");
        console.log('Type expressions like "5 + 3" or "10 * 2"');
        console.log('Type "back" to return to command mode');

        for await (const calcLine of console) {
          const expr = calcLine.trim();
          if (expr === "back") break;

          try {
            // Simple math evaluation (safe for demo)
            const result = Function('"use strict"; return (' + expr + ")")();
            console.log(`= ${result}`);
          } catch {
            console.log("❌ Invalid expression");
          }
        }
        break;

      case "reverse":
        console.log("\n🔄 Text Reverser Mode");
        console.log('Type text to reverse, "back" to return');

        for await (const revLine of console) {
          const text = revLine.trim();
          if (text === "back") break;

          const reversed = text.split("").reverse().join("");
          const color = colourKit(Math.random()).ansi;
          console.log(`${color}Reversed: ${reversed}\x1b[0m`);
        }
        break;

      default:
        if (input) {
          console.log(
            `Unknown command: ${input}. Try: stats, calc, reverse, quit`
          );
        }
    }

    if (input.toLowerCase() === "quit" || input.toLowerCase() === "exit") {
      break;
    }

    process.stdout.write(prompt);
  }

  console.log(
    `\n📈 Final Stats: ${lineCount} lines, ${totalChars} chars, ${wordCount} words\n`
  );
}

// Demo 4: stdin with file operations
async function fileStdin() {
  console.log(
    colourKit(0.4).ansi + "\n📁 stdin with File Operations" + "\x1b[0m"
  );
  console.log(
    "Type content to save to files. Commands: save <filename>, read <filename>, quit\n"
  );

  const files = new Map<string, string>();

  const prompt = "File > ";
  process.stdout.write(prompt);

  for await (const line of console) {
    const input = line.trim();

    if (input === "quit" || input === "exit") {
      break;
    }

    if (input.startsWith("save ")) {
      const filename = input.slice(5).trim();
      if (filename && files.has(filename)) {
        const content = files.get(filename)!;
        try {
          await Bun.write(filename, content);
          console.log(`✅ Saved ${filename} (${content.length} bytes)`);
        } catch (error) {
          console.log(`❌ Save error: ${error.message}`);
        }
      } else {
        console.log(
          '❌ No content to save. Type content first, then "save filename"'
        );
      }
    } else if (input.startsWith("read ")) {
      const filename = input.slice(5).trim();
      try {
        const content = await Bun.file(filename).text();
        console.log(`📖 Content of ${filename}:`);
        console.log(content);
        files.set(filename, content);
      } catch (error) {
        console.log(`❌ Read error: ${error.message}`);
      }
    } else if (input === "list") {
      console.log("📋 Files in memory:");
      for (const [name, content] of files) {
        console.log(`  ${name}: ${content.length} bytes`);
      }
    } else if (input) {
      // Store as content for next save operation
      const lastFile = Array.from(files.keys()).pop() || "default.txt";
      files.set(lastFile, input);
      console.log(
        `💾 Content stored for "${lastFile}" (${input.length} bytes)`
      );
    }

    process.stdout.write(prompt);
  }

  console.log("👋 File demo completed\n");
}

// Demo 5: stdin with data analysis
async function analyticsStdin() {
  console.log(
    colourKit(0.8).ansi + "\n📈 stdin with Real-time Analytics" + "\x1b[0m"
  );
  console.log("Type numbers (one per line) for statistical analysis");
  console.log("Commands: stats, clear, chart, quit\n");

  const numbers: number[] = [];

  const prompt = "Number > ";
  process.stdout.write(prompt);

  for await (const line of console) {
    const input = line.trim();

    if (input === "quit" || input === "exit") {
      break;
    }

    switch (input.toLowerCase()) {
      case "stats":
        if (numbers.length === 0) {
          console.log("❌ No numbers to analyze");
        } else {
          const sum = numbers.reduce((a, b) => a + b, 0);
          const avg = sum / numbers.length;
          const min = Math.min(...numbers);
          const max = Math.max(...numbers);
          const sorted = [...numbers].sort((a, b) => a - b);
          const median =
            sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];

          console.log("\n📊 Statistical Analysis:");
          console.log(`Count: ${numbers.length}`);
          console.log(`Sum: ${sum.toFixed(2)}`);
          console.log(`Average: ${avg.toFixed(2)}`);
          console.log(`Median: ${median.toFixed(2)}`);
          console.log(`Min: ${min.toFixed(2)}`);
          console.log(`Max: ${max.toFixed(2)}`);
          console.log(`Range: ${(max - min).toFixed(2)}`);
        }
        break;

      case "clear":
        numbers.length = 0;
        console.log("🧹 Numbers cleared");
        break;

      case "chart":
        if (numbers.length === 0) {
          console.log("❌ No numbers to chart");
        } else {
          console.log("\n📊 Simple Chart:");
          const max = Math.max(...numbers);
          numbers.forEach((num, i) => {
            const barLength = Math.round((num / max) * 20);
            const bar = "█".repeat(barLength);
            const color = colourKit(num / max).ansi;
            console.log(`${color}${bar}\x1b[0m ${num.toFixed(2)}`);
          });
        }
        break;

      default:
        const num = parseFloat(input);
        if (!isNaN(num)) {
          numbers.push(num);
          console.log(`✅ Added ${num.toFixed(2)} (total: ${numbers.length})`);
        } else if (input) {
          console.log("❌ Not a valid number");
        }
    }

    process.stdout.write(prompt);
  }

  console.log(`👋 Analytics demo completed with ${numbers.length} numbers\n`);
}

// Demo selection
async function selectDemo() {
  console.log("\n🎯 Select a stdin demo:");
  console.log("1. Basic Console stdin");
  console.log("2. Chunked stdin (Bun.stdin.stream)");
  console.log("3. Advanced stdin with processing");
  console.log("4. stdin with file operations");
  console.log("5. stdin with analytics");
  console.log("6. Run all demos sequentially");
  console.log('Or just pipe data: echo "test" | bun run stdin-complete.ts\n');

  const prompt = "Demo number (1-6) > ";
  process.stdout.write(prompt);

  for await (const line of console) {
    const choice = line.trim();

    switch (choice) {
      case "1":
        await basicConsoleStdin();
        break;
      case "2":
        await chunkedStdin();
        break;
      case "3":
        await advancedStdin();
        break;
      case "4":
        await fileStdin();
        break;
      case "5":
        await analyticsStdin();
        break;
      case "6":
        await basicConsoleStdin();
        await chunkedStdin();
        await advancedStdin();
        await fileStdin();
        await analyticsStdin();
        break;
      default:
        if (choice) {
          console.log("❌ Invalid choice. Please enter 1-6");
          process.stdout.write(prompt);
          continue;
        } else {
          // Empty input, exit
          break;
        }
    }
    break;
  }
}

// Main execution
async function main() {
  console.log("🎯 This demo covers all stdin patterns from Bun documentation:");
  console.log("  • console as AsyncIterable");
  console.log("  • Bun.stdin.stream() for chunks");
  console.log("  • Interactive command processing");
  console.log("  • File operations via stdin");
  console.log("  • Real-time data analysis");

  // Check if data is being piped in by trying to read from stdin
  let hasPipedData = false;
  try {
    // Try to read a small chunk to check if data is available
    const testStream = Bun.stdin.stream();
    const reader = testStream.getReader();
    const { done, value } = await reader.read();
    if (!done && value) {
      hasPipedData = true;
      // Put the data back by creating a new stream with the chunk
      // For simplicity, we'll just run the interactive mode
    }
    reader.releaseLock();
  } catch (error) {
    // No piped data, continue with interactive mode
  }

  if (hasPipedData) {
    console.log("\n📡 Data detected in stdin - running chunked demo...");
    await chunkedStdin();
  } else {
    console.log("\n💡 No piped data detected - running interactive mode...");
    await selectDemo();
  }

  console.log(
    colourKit(0.2).ansi + "\n🎉 stdin Demo Suite Completed!" + "\x1b[0m"
  );
  console.log(
    '💡 Try piping data: echo "hello world" | bun run stdin-complete.ts'
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 stdin demo interrupted gracefully!");
  process.exit(0);
});

// Start the demo
main().catch(console.error);
