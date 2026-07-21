#!/usr/bin/env bun

// Simple stdin demo - Core patterns from Bun documentation
console.info("📥 Simple Bun stdin Demo");
console.info("========================");

// Demo 1: Basic console AsyncIterable (from documentation)
async function basicConsoleStdin() {
  console.info("\n🔤 Basic Console stdin (AsyncIterable)");
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
    console.info(`You typed (${messageCount}): ${trimmed}`);
    console.info(`Length: ${trimmed.length} characters`);

    process.stdout.write(prompt);
  }

  console.info(`✅ Processed ${messageCount} messages\n`);
}

// Demo 2: Bun.stdin as BunFile for piped input
async function bunFileStdin() {
  console.info("\n📦 Bun.stdin as BunFile");
  console.info("This demo reads piped data as a file.\n");

  try {
    // Use Bun.stdin as a BunFile
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.info("ℹ️ No piped data detected.");
      console.info('Try: echo "hello world" | bun run stdin-simple');
      return;
    }

    console.info(`📊 stdin file size: ${size} bytes`);

    // Read the entire stdin content
    const content = await stdinFile.text();
    console.info(`📄 Content: "${content}"`);
    console.info(`📏 Content length: ${content.length} characters`);

    // Split into lines
    const lines = content.split("\n").filter((line) => line.length > 0);
    console.info(`📝 Lines: ${lines.length}`);

    lines.forEach((line, i) => {
      console.info(`  Line ${i + 1}: "${line}"`);
    });
  } catch (error) {
    console.info(`❌ Error reading stdin: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info(
    "🎯 This demo covers core stdin patterns from Bun documentation:"
  );
  console.info("  • console as AsyncIterable");
  console.info("  • Bun.stdin as BunFile");

  // Check if data is being piped in
  const stdinFile = Bun.stdin;
  const size = await stdinFile.size;

  if (size > 0) {
    console.info("\n📡 Piped data detected - running BunFile demo...");
    await bunFileStdin();
  } else {
    console.info("\n💡 No piped data - running interactive demo...");
    await basicConsoleStdin();
  }

  console.info("\n🎉 stdin demo completed!");
  console.info('💡 Try piping data: echo "hello world" | bun run stdin-simple');
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.info("\n\n👋 stdin demo interrupted gracefully!");
  process.exit(0);
});

// Start the demo
main().catch(console.error);
