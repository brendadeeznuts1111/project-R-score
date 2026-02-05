#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Reading from Stdin Examples
 *
 * This example demonstrates different ways to read from stdin in Bun:
 * 1. Using console as AsyncIterable for line-by-line reading (interactive)
 * 2. Using Bun.stdin.stream() for chunked reading (piped/large inputs)
 *
 * Note: For Bun.stdin.stream(), there is no guarantee that chunks will be
 * split line-by-line - they are arbitrary byte chunks that may span multiple
 * lines or contain partial lines.
 */

console.log("📥 Reading from Stdin Examples\n");

// Example 1: Using console as AsyncIterable (line-by-line)
console.log("1. Line-by-line reading with console AsyncIterable:");

// Check if we're running interactively (not with piped input)
if (process.stdin.isTTY) {
  console.log("Running interactive prompt from documentation:");

  // This matches the exact example from the documentation
  const prompt = "Type something: ";
  process.stdout.write(prompt);

  for await (const line of console) {
    console.log(`You typed: ${line}`);
    process.stdout.write(prompt);
  }
} else {
  console.log("Interactive mode not available when piped input is present");
  console.log("For interactive testing: bun run examples/stdin-reading.ts (no piping)\n");
}

// Example 2: Using Bun.stdin.stream() for chunked reading
console.log("2. Chunked reading with Bun.stdin.stream():");

console.log("Attempting to read from stdin stream...");

try {
  let chunkCount = 0;
  let hasReadData = false;

    for await (const chunk of Bun.stdin.stream()) {
    hasReadData = true;
    // chunk is Uint8Array
    // This converts it to text (assumes ASCII encoding)
    // Note: There is no guarantee that chunks will be split line-by-line
    const chunkText = Buffer.from(chunk).toString();
    chunkCount++;
    console.log(`Chunk: ${chunkText}`);
  }

  if (hasReadData) {
    console.log(`Successfully read ${chunkCount} total chunks`);
  } else {
    console.log("No data available on stdin - use: echo 'test' | bun run examples/stdin-reading.ts");
  }
} catch (error) {
  console.log("Error reading stdin:", error.message);
}

console.log("");

// Demonstrate capabilities
async function demonstrateStdin() {
  console.log("3. Demonstration of stdin reading functionality:");

  // Show that Bun.stdin exists and has expected method
  console.log(`Bun.stdin available: ${!!Bun.stdin}`);
  console.log(`Bun.stdin.stream available: ${typeof Bun.stdin.stream === 'function'}`);

  // Show console is AsyncIterable
  console.log(`Console is async iterable: ${!!console[Symbol.asyncIterator]}`);

  console.log("\nTo test both methods:");
  console.log("- Line by line: Run and type interactively with Enter");
  console.log("- Chunked: Use 'echo \"test\" | bun run examples/stdin-reading.ts'");
}

// Run demonstration
await demonstrateStdin();

console.log("\n✅ Stdin reading examples completed!");
