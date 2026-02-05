#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * File Operations Examples
 *
 * This example demonstrates file system operations in Bun using
 * Bun.write() and Bun.read() along with other file operations.
 */

console.log("📁 File Operations Examples\n");

// Example 1: Writing to a file
console.log("1. Writing to a file using Bun.write():");
const testData = {
  name: "Bun File Example",
  version: "1.0.0",
  features: ["fast", "simple", "powerful"],
  timestamp: new Date().toISOString()
};

// Write JSON data to file
await Bun.write("/tmp/bun-example.json", JSON.stringify(testData, null, 2));
console.log("  Created /tmp/bun-example.json with JSON data");
console.log("");

// Example 2: Reading from a file
console.log("2. Reading from a file using Bun.read():");
const fileContent = await Bun.read("/tmp/bun-example.json");
const parsedData = JSON.parse(fileContent.toString());

console.log("  Read and parsed file contents:");
console.log(`    Name: ${parsedData.name}`);
console.log(`    Version: ${parsedData.version}`);
console.log(`    Features: ${parsedData.features.join(', ')}`);
console.log("");

// Example 3: Writing text files
console.log("3. Writing plain text files:");
const textContent = `This is a text file created by Bun.
It demonstrates text file operations.
Created at: ${new Date().toLocaleString()}
Random number: ${Math.random()}
`;

await Bun.write("/tmp/bun-text-example.txt", textContent);
console.log("  Created /tmp/bun-text-example.txt");
console.log("");

// Example 4: Reading text files
console.log("4. Reading text files:");
const textFileContent = await Bun.read("/tmp/bun-text-example.txt");
console.log("  Text file contents:");
console.log(`"${textFileContent.toString().trim()}"`);
console.log("");

// Example 5: Using file operations with child processes
console.log("5. Combining file ops with child process:");
try {
  // Create a simple script file
  const scriptContent = `#!/bin/bash
echo "Hello from generated script!"
echo "Current date: $(date)"
echo "Working directory: $(pwd)"
echo "Random value: $RANDOM"
`;

  await Bun.write("/tmp/example-script.sh", scriptContent);
  console.log("  Created script file");

  // Spawn process to run the script
  const proc = Bun.spawn(["bash", "/tmp/example-script.sh"], {
    cwd: "/tmp"
  });

  await proc.exited;
  console.log("  Executed script with exit code:", proc.exitCode);
} catch (error) {
  console.log(`  Error with shell operations: ${error.message}`);
}
console.log("");

// Example 6: Working with different encodings
console.log("6. Working with file encodings:");
const binaryData = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]); // "Hello World!"
await Bun.write("/tmp/binary-example.bin", binaryData);
console.log("  Wrote binary data to file");

const readBinary = await Bun.read("/tmp/binary-example.bin");
console.log(`  Read binary data: [${Array.from(readBinary).join(', ')}]`);
console.log("");

// Example 7: Error handling
console.log("7. Error handling with file operations:");
try {
  await Bun.read("/tmp/nonexistent-file-12345.txt");
} catch (error) {
  console.log(`  Expected error reading nonexistent file: ${error.message}`);
}
console.log("");

console.log("✅ File operations examples completed!");
