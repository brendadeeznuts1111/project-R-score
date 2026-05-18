#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * File Operations Examples
 *
 * This example demonstrates file system operations in Bun using
 * Bun.write() and Bun.read() along with other file operations.
 */

console.info("📁 File Operations Examples\n");

// Example 1: Writing to a file
console.info("1. Writing to a file using Bun.write():");
const testData = {
  name: "Bun File Example",
  version: "1.0.0",
  features: ["fast", "simple", "powerful"],
  timestamp: new Date().toISOString()
};

// Write JSON data to file
await Bun.write("/tmp/bun-example.json", JSON.stringify(testData, null, 2));
console.info("  Created /tmp/bun-example.json with JSON data");
console.info("");

// Example 2: Reading from a file
console.info("2. Reading from a file using Bun.read():");
const fileContent = await Bun.read("/tmp/bun-example.json");
const parsedData = JSON.parse(fileContent.toString());

console.info("  Read and parsed file contents:");
console.info(`    Name: ${parsedData.name}`);
console.info(`    Version: ${parsedData.version}`);
console.info(`    Features: ${parsedData.features.join(', ')}`);
console.info("");

// Example 3: Writing text files
console.info("3. Writing plain text files:");
const textContent = `This is a text file created by Bun.
It demonstrates text file operations.
Created at: ${new Date().toLocaleString()}
Random number: ${Math.random()}
`;

await Bun.write("/tmp/bun-text-example.txt", textContent);
console.info("  Created /tmp/bun-text-example.txt");
console.info("");

// Example 4: Reading text files
console.info("4. Reading text files:");
const textFileContent = await Bun.read("/tmp/bun-text-example.txt");
console.info("  Text file contents:");
console.info(`"${textFileContent.toString().trim()}"`);
console.info("");

// Example 5: Using file operations with child processes
console.info("5. Combining file ops with child process:");
try {
  // Create a simple script file
  const scriptContent = `#!/bin/bash
echo "Hello from generated script!"
echo "Current date: $(date)"
echo "Working directory: $(pwd)"
echo "Random value: $RANDOM"
`;

  await Bun.write("/tmp/example-script.sh", scriptContent);
  console.info("  Created script file");

  // Spawn process to run the script
  const proc = Bun.spawn(["bash", "/tmp/example-script.sh"], {
    cwd: "/tmp"
  });

  await proc.exited;
  console.info("  Executed script with exit code:", proc.exitCode);
} catch (error) {
  console.info(`  Error with shell operations: ${error.message}`);
}
console.info("");

// Example 6: Working with different encodings
console.info("6. Working with file encodings:");
const binaryData = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]); // "Hello World!"
await Bun.write("/tmp/binary-example.bin", binaryData);
console.info("  Wrote binary data to file");

const readBinary = await Bun.read("/tmp/binary-example.bin");
console.info(`  Read binary data: [${Array.from(readBinary).join(', ')}]`);
console.info("");

// Example 7: Error handling
console.info("7. Error handling with file operations:");
try {
  await Bun.read("/tmp/nonexistent-file-12345.txt");
} catch (error) {
  console.info(`  Expected error reading nonexistent file: ${error.message}`);
}
console.info("");

console.info("✅ File operations examples completed!");
