#!/usr/bin/env bun

// Simple stdin demo - Core patterns from Bun documentation
console.log("📥 Simple Bun stdin Demo");
console.log("========================");

// Demo 1: Basic console AsyncIterable (from documentation)
async function basicConsoleStdin() {
  console.log("\n🔤 Basic Console stdin (AsyncIterable)");
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
    console.log(`You typed (${messageCount}): ${trimmed}`);
    console.log(`Length: ${trimmed.length} characters`);

    process.stdout.write(prompt);
  }

  console.log(`✅ Processed ${messageCount} messages\n`);
}

// Demo 2: Bun.stdin as BunFile for piped input
async function bunFileStdin() {
  console.log("\n📦 Bun.stdin as BunFile");
  console.log("This demo reads piped data as a file.\n");

  try {
    // Use Bun.stdin as a BunFile
    const stdinFile = Bun.stdin;
    const size = await stdinFile.size;

    if (size === 0) {
      console.log("ℹ️ No piped data detected.");
      console.log('Try: echo "hello world" | bun run stdin-simple');
      return;
    }

    console.log(`📊 stdin file size: ${size} bytes`);

    // Read the entire stdin content
    const content = await stdinFile.text();
    console.log(`📄 Content: "${content}"`);
    console.log(`📏 Content length: ${content.length} characters`);

    // Split into lines
    const lines = content.split("\n").filter((line) => line.length > 0);
    console.log(`📝 Lines: ${lines.length}`);

    lines.forEach((line, i) => {
      console.log(`  Line ${i + 1}: "${line}"`);
    });
  } catch (error) {
    console.log(`❌ Error reading stdin: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log(
    "🎯 This demo covers core stdin patterns from Bun documentation:"
  );
  console.log("  • console as AsyncIterable");
  console.log("  • Bun.stdin as BunFile");

  // Check if data is being piped in
  const stdinFile = Bun.stdin;
  const size = await stdinFile.size;

  if (size > 0) {
    console.log("\n📡 Piped data detected - running BunFile demo...");
    await bunFileStdin();
  } else {
    console.log("\n💡 No piped data - running interactive demo...");
    await basicConsoleStdin();
  }

  console.log("\n🎉 stdin demo completed!");
  console.log('💡 Try piping data: echo "hello world" | bun run stdin-simple');
}

// Handle graceful exit
process.on("SIGINT", () => {
  console.log("\n\n👋 stdin demo interrupted gracefully!");
  process.exit(0);
});

// Start the demo
main().catch(console.error);
