// bun-stdout-demo.ts - Complete stdout writing demonstration

console.log("🎯 Bun stdout Writing Demo");
console.log("========================");

// 1. Basic console.log usage
console.log("\n📋 1. Basic console.log() Usage:");
console.log("Hello, World!");
console.log("This automatically adds a line break");
console.log("Multiple", "arguments", "work", "too");

// 2. console.log with different data types
console.log("\n🎨 2. console.log() with Different Data Types:");
console.log("String: Hello World");
console.log("Number:", 42);
console.log("Boolean:", true);
console.log("Array:", [1, 2, 3, 4, 5]);
console.log("Object:", { name: "test", value: 42 });
console.log("Date:", new Date());
console.log("RegExp:", /test/gi);
console.log("Function:", function () {
  return "test";
});
console.log("Symbol:", Symbol("test"));
console.log("null:", null);
console.log("undefined:", undefined);

// 3. console.log with formatting
console.log("\n🎯 3. console.log() with Formatting:");
const name = "Alice";
const age = 30;
const score = 95.5;

console.log(`User ${name} is ${age} years old with score ${score}`);
console.log("User %s is %d years old with score %.1f", name, age, score);

// 4. Bun.stdout property demonstration
console.log("\n📝 4. Bun.stdout Property:");
console.log("Bun.stdout type:", typeof Bun.stdout);
console.log("Bun.stdout is a BunFile:", Bun.stdout instanceof Bun.File);

// 5. Basic Bun.write to stdout
console.log("\n✍️ 5. Basic Bun.write() to stdout:");
await Bun.write(Bun.stdout, "Hello from Bun.write!\n");
await Bun.write(Bun.stdout, "This is written directly to stdout\n");

// 6. Bun.write with different data types
console.log("\n🎨 6. Bun.write() with Different Data Types:");
await Bun.write(Bun.stdout, "String: Hello World\n");
await Bun.write(Bun.stdout, `Number: ${42}\n`);
await Bun.write(Bun.stdout, `Boolean: ${true}\n`);
await Bun.write(Bun.stdout, `Array: ${JSON.stringify([1, 2, 3, 4, 5])}\n`);
await Bun.write(
  Bun.stdout,
  `Object: ${JSON.stringify({ name: "test", value: 42 })}\n`
);

// 7. Bun.write with Buffer
console.log("\n🔧 7. Bun.write() with Buffer:");
const buffer = Buffer.from("Hello from Buffer!\n");
await Bun.write(Bun.stdout, buffer);

// 8. Bun.write with Uint8Array
console.log("\n📦 8. Bun.write() with Uint8Array:");
const uint8Array = new TextEncoder().encode("Hello from Uint8Array!\n");
await Bun.write(Bun.stdout, uint8Array);

// 9. Performance comparison
console.log("\n⚡ 9. Performance Comparison:");
const testData =
  "Hello, World! This is a test string for performance comparison.\n";

// console.log performance
console.time("console.log");
for (let i = 0; i < 1000; i++) {
  console.log(testData);
}
console.timeEnd("console.log");

// Bun.write performance
console.time("Bun.write");
for (let i = 0; i < 1000; i++) {
  await Bun.write(Bun.stdout, testData);
}
console.timeEnd("Bun.write");

// 10. Async vs Sync behavior
console.log("\n🔄 10. Async vs Sync Behavior:");
console.log("console.log is synchronous:");
console.log("Line 1");
console.log("Line 2");
console.log("Line 3");

console.log("\nBun.write is asynchronous:");
await Bun.write(Bun.stdout, "Async Line 1\n");
await Bun.write(Bun.stdout, "Async Line 2\n");
await Bun.write(Bun.stdout, "Async Line 3\n");

// 11. Error handling
console.log("\n❌ 11. Error Handling:");
try {
  await Bun.write(Bun.stdout, "This should work\n");
  console.log("✅ Write successful");
} catch (error) {
  console.log("❌ Write failed:", error.message);
}

// 12. Large data writing
console.log("\n📊 12. Large Data Writing:");
const largeData = "x".repeat(1000) + "\n";
console.log("Writing 1000 characters...");
await Bun.write(Bun.stdout, largeData);
console.log("✅ Large data written successfully");

// 13. Streaming data
console.log("\n🌊 13. Streaming Data:");
const streamData = [
  "Chunk 1: First part of data\n",
  "Chunk 2: Second part of data\n",
  "Chunk 3: Third part of data\n",
  "Chunk 4: Fourth part of data\n",
  "Chunk 5: Final part of data\n",
];

for (const chunk of streamData) {
  await Bun.write(Bun.stdout, chunk);
  // Small delay to simulate streaming
  await new Promise((resolve) => setTimeout(resolve, 10));
}

// 14. Binary data
console.log("\n🔢 14. Binary Data:");
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]); // "Hello\n"
await Bun.write(Bun.stdout, binaryData);

// 15. JSON data
console.log("\n📋 15. JSON Data:");
const jsonData = {
  message: "Hello from JSON",
  timestamp: new Date().toISOString(),
  data: [1, 2, 3, 4, 5],
};
await Bun.write(Bun.stdout, JSON.stringify(jsonData, null, 2) + "\n");

// 16. Formatted output
console.log("\n🎨 16. Formatted Output:");
const user = { name: "Alice", age: 30, score: 95.5 };
const formatted = `
User Profile:
=============
Name: ${user.name}
Age: ${user.age}
Score: ${user.score}
Timestamp: ${new Date().toISOString()}
`;
await Bun.write(Bun.stdout, formatted);

// 17. Progress indicator
console.log("\n📈 17. Progress Indicator:");
const totalSteps = 10;
for (let i = 1; i <= totalSteps; i++) {
  await Bun.write(
    Bun.stdout,
    `\rProgress: ${i}/${totalSteps} [${"=".repeat(i)}${" ".repeat(totalSteps - i)}]`
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
}
await Bun.write(Bun.stdout, "\n");

// 18. Table output
console.log("\n📊 18. Table Output:");
const tableData = [
  ["Name", "Age", "Score"],
  ["Alice", "30", "95.5"],
  ["Bob", "25", "87.2"],
  ["Charlie", "35", "92.8"],
];

const tableString =
  tableData
    .map((row) => row.map((cell) => cell.padEnd(12)).join(" | "))
    .join("\n") + "\n";

await Bun.write(Bun.stdout, tableString);

// 19. Color output
console.log("\n🎨 19. Color Output:");
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

await Bun.write(Bun.stdout, `${colors.red}Red text${colors.reset}\n`);
await Bun.write(Bun.stdout, `${colors.green}Green text${colors.reset}\n`);
await Bun.write(Bun.stdout, `${colors.yellow}Yellow text${colors.reset}\n`);
await Bun.write(Bun.stdout, `${colors.blue}Blue text${colors.reset}\n`);
await Bun.write(Bun.stdout, `${colors.magenta}Magenta text${colors.reset}\n`);
await Bun.write(Bun.stdout, `${colors.cyan}Cyan text${colors.reset}\n`);

// 20. Real-time logging
console.log("\n📝 20. Real-time Logging:");
const logLevels = {
  INFO: "🔵",
  WARN: "🟡",
  ERROR: "🔴",
  DEBUG: "🟢",
};

async function log(level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${logLevels[level]} [${timestamp}] ${level}: ${message}\n`;
  await Bun.write(Bun.stdout, logEntry);
}

await log("INFO", "Application started");
await log("DEBUG", "Loading configuration");
await log("WARN", "Deprecated API used");
await log("ERROR", "Connection failed");
await log("INFO", "Application finished");

// 21. File-like operations
console.log("\n📁 21. File-like Operations:");
console.log("Bun.stdout supports file operations:");
console.log("- Bun.write(Bun.stdout, data)");
console.log("- Bun.stdout is a BunFile instance");
console.log("- Can be used as destination for streams");

// 22. Comparison summary
console.log("\n📊 22. Comparison Summary:");
console.log("console.log():");
console.log("  ✅ Synchronous");
console.log("  ✅ Automatic line breaks");
console.log("  ✅ Multiple arguments");
console.log("  ✅ Built-in formatting");
console.log("  ✅ Type inspection");

console.log("\nBun.write(Bun.stdout):");
console.log("  ✅ Asynchronous");
console.log("  ✅ Manual line breaks");
console.log("  ✅ Single data argument");
console.log("  ✅ Raw data writing");
console.log("  ✅ Better for large data");
console.log("  ✅ Supports binary data");

console.log("\n✅ stdout writing demo completed!");
console.log("\n📋 Use Cases:");
console.log("   • console.log() - General debugging, development output");
console.log(
  "   • Bun.write() - Performance-critical output, large data, streaming"
);
console.log("   • Both support strings, buffers, and binary data");
console.log(
  "   • Choose based on sync/async needs and performance requirements"
);
