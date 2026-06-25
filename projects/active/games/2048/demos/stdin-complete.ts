#!/usr/bin/env bun

// Comprehensive stdin reading demo - All patterns from Bun documentation
import { colourKit } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.8).ansi + "📥 Comprehensive Bun stdin Demo" + "\x1b[0m"
);
console.info("=".repeat(50));

// Demo 1: Basic console AsyncIterable (from documentation)
async function basicConsoleStdin() {
  console.info(
    colourKit(0.5).ansi + "\n🔤 Basic Console stdin (AsyncIterable)" + "\x1b[0m"
  );
  console.info('Type messages (press Enter after each). Type "quit" to exit.\n');

  const prompt = "Type something: ";
  process.stdout.write(prompt);

  let messageCount = 0;

  for await (const line of console) {
    const trimmed = line.trim();

    if (trimmed === "quit" || trimmed === "exit") {
      console.info("👋 Exiting basic stdin demo...");
      break;
    }

    messageCount++;
    const color = colourKit(Math.random()).ansi;
    console.info(`${color}You typed (${messageCount}): ${trimmed}\x1b[0m`);
    console.info(`Length: ${trimmed.length} characters`);

    process.stdout.write(prompt);
  }

  console.info(`✅ Processed ${messageCount} messages\n`);
}

// Demo 2: Bun.stdin as BunFile for chunked reading
async function chunkedStdin() {
  console.info(
    colourKit(0.6).ansi + "\n📦 Chunked stdin (Bun.stdin as BunFile)" + "\x1b[0m"
  );
  console.info("This demo reads Bun.stdin as a file. Try piping data:\n");
  console.info(
    'Example: echo "hello world" | bun run stdin-complete.ts\n'
  );

  let chunkCount = 0;
  let totalBytes = 0;

  try {
    // Use Bun.stdin as a BunFile
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.info(
        'ℹ️ No data received. Try piping: echo "test" | bun run stdin-complete.ts'
      );
      return;
    }

    console.info(`📊 stdin file size: ${size} bytes`);

    // Read the entire stdin content
    const content = await stdinFile.text();
    const chunks = content.split("\n").filter((line) => line.length > 0);

    console.info(`📦 Processing ${chunks.length} chunks:`);

    for (const chunk of chunks) {
      chunkCount++;
      totalBytes += chunk.length;

      console.info(`Chunk ${chunkCount}: ${chunk.length} bytes`);
      console.info(`Content: "${chunk}"`);

      // Show hex representation for binary data
      if (chunk.length > 0) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(chunk);
        const hex = Array.from(bytes.slice(0, 16))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.info(`Hex (first 16): ${hex}`);
      }

      console.info("---");
    }

    console.info(`✅ Processed ${chunkCount} chunks, ${totalBytes} total bytes\n");
  } catch (error) {
    console.info("❌ Chunk reading error: " + error.message);
  }
}

// Demo 3: Advanced stdin with processing
async function advancedStdin() {
  console.info(
    colourKit(0.7).ansi + "\n⚡ Advanced stdin with Data Processing" + "\x1b[0m"
  );
  console.info("Type commands: calc, reverse, stats, or quit\n");

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
        console.info("👋 Exiting advanced demo...");
        break;

      case "stats":
        console.info("\n📊 Current Statistics:");
        console.info(`Lines processed: ${lineCount}`);
        console.info(`Total characters: ${totalChars}`);
        console.info(`Word count: ${wordCount}`);
        console.info(
          `Average line length: ${(totalChars / lineCount).toFixed(1)}`
        );
        break;

      case "calc":
        console.info("\n🧮 Simple Calculator Mode");
        console.info('Type expressions like "5 + 3" or "10 * 2"');
        console.info('Type "back" to return to command mode');

        for await (const calcLine of console) {
          const expr = calcLine.trim();
          if (expr === "back") break;

          try {
            // Simple math evaluation (safe for demo)
            const result = Function('"use strict"; return (' + expr + ")")();
            console.info(`= ${result}`);
          } catch {
            console.info("❌ Invalid expression");
          }
        }
        break;

      case "reverse":
        console.info("\n🔄 Text Reverser Mode");
        console.info('Type text to reverse, "back" to return');

        for await (const revLine of console) {
          const text = revLine.trim();
          if (text === "back") break;

          const reversed = text.split("").reverse().join("");
          const color = colourKit(Math.random()).ansi;
          console.info(`${color}Reversed: ${reversed}\x1b[0m`);
        }
        break;

      default:
        if (input) {
          console.info(
            `Unknown command: ${input}. Try: stats, calc, reverse, quit`
          );
        }
    }

    if (input.toLowerCase() === "quit" || input.toLowerCase() === "exit") {
      break;
    }

    process.stdout.write(prompt);
  }

  console.info(
    `\n📈 Final Stats: ${lineCount} lines, ${totalChars} chars, ${wordCount} words\n`
  );
}

// Demo 4: stdin with file operations
async function fileStdin() {
  console.info(
    colourKit(0.4).ansi + "\n📁 stdin with File Operations" + "\x1b[0m"
  );
  console.info(
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
          console.info(`✅ Saved ${filename} (${content.length} bytes)`);
        } catch (error) {
          console.info(`❌ Save error: ${error.message}`);
        }
      } else {
        console.info(
          '❌ No content to save. Type content first, then "save filename"'
        );
      }
    } else if (input.startsWith("read ")) {
      const filename = input.slice(5).trim();
      try {
        const content = await Bun.file(filename).text();
        console.info(`📖 Content of ${filename}:`);
        console.info(content);
        files.set(filename, content);
      } catch (error) {
        console.info(`❌ Read error: ${error.message}`);
      }
    } else if (input === "list") {
      console.info("📋 Files in memory:");
      for (const [name, content] of files) {
        console.info(`  ${name}: ${content.length} bytes`);
      }
    } else if (input) {
      // Store as content for next save operation
      const lastFile = Array.from(files.keys()).pop() || "default.txt";
      files.set(lastFile, input);
      console.info(
        `💾 Content stored for "${lastFile}" (${input.length} bytes)`
      );
    }

    process.stdout.write(prompt);
  }

  console.info("👋 File demo completed\n");
}

// Demo 5: stdin with data analysis
async function analyticsStdin() {
  console.info(
    colourKit(0.8).ansi + "\n📈 stdin with Real-time Analytics" + "\x1b[0m"
  );
  console.info("Type numbers (one per line) for statistical analysis");
  console.info("Commands: stats, clear, chart, quit\n");

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
          console.info("❌ No numbers to analyze");
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

          console.info("\n📊 Statistical Analysis:");
          console.info(`Count: ${numbers.length}`);
          console.info(`Sum: ${sum.toFixed(2)}`);
          console.info(`Average: ${avg.toFixed(2)}`);
          console.info(`Median: ${median.toFixed(2)}`);
          console.info(`Min: ${min.toFixed(2)}`);
          console.info(`Max: ${max.toFixed(2)}`);
          console.info(`Range: ${(max - min).toFixed(2)}`);
        }
        break;

      case "clear":
        numbers.length = 0;
        console.info("🧹 Numbers cleared");
        break;

      case "chart":
        if (numbers.length === 0) {
          console.info("❌ No numbers to chart");
        } else {
          console.info("\n📊 Simple Chart:");
          const max = Math.max(...numbers);
          numbers.forEach((num, i) => {
            const barLength = Math.round((num / max) * 20);
            const bar = "█".repeat(barLength);
            const color = colourKit(num / max).ansi;
            console.info(`${color}${bar}\x1b[0m ${num.toFixed(2)}`);
          });
        }
        break;

      default:
        const num = parseFloat(input);
        if (!isNaN(num)) {
          numbers.push(num);
          console.info(`✅ Added ${num.toFixed(2)} (total: ${numbers.length})`);
        } else if (input) {
          console.info("❌ Not a valid number");
        }
    }

    process.stdout.write(prompt);
  }

  console.info(`👋 Analytics demo completed with ${numbers.length} numbers\n`);
}

// Demo selection
async function selectDemo() {
  console.info("\n🎯 Select a stdin demo:");
  console.info("1. Basic Console stdin");
  console.info("2. Chunked stdin (Bun.stdin.stream)");
  console.info("3. Advanced stdin with processing");
  console.info("4. stdin with file operations");
  console.info("5. stdin with analytics");
  console.info("6. Run all demos sequentially");
  console.info('Or just pipe data: echo "test" | bun run stdin-complete.ts\n');

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
          console.info("❌ Invalid choice. Please enter 1-6");
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
  console.info("🎯 This demo covers all stdin patterns from Bun documentation:");
  console.info("  • console as AsyncIterable");
  console.info("  • Bun.stdin.stream() for chunks");
  console.info("  • Interactive command processing");
  console.info("  • File operations via stdin");
  console.info("  • Real-time data analysis");

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
    console.info("\n📡 Data detected in stdin - running chunked demo...");
    await chunkedStdin();
  } else {
    console.info("\n💡 No piped data detected - running interactive mode...");
    await selectDemo();
  }

  console.info(
    colourKit(0.2).ansi + "\n🎉 stdin Demo Suite Completed!" + "\x1b[0m"
  );
  console.info(
    '💡 Try piping data: echo "hello world" | bun run stdin-complete.ts'
  );
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 stdin demo interrupted gracefully!");
  process.exit(0);
});

// Start the demo
main().catch(console.error);
