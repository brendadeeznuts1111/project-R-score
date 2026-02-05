#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Stdout & Stderr Stream Examples
 *
 * This example demonstrates how to work with child process output streams
 * using Bun.spawn() - stdout as ReadableStream, stderr handling, etc.
 */

console.log("📋 Child Process Output Stream Examples\n");

// Example 1: Basic stdout consumption as ReadableStream
console.log("1. Consuming stdout as ReadableStream:");
const proc1 = Bun.spawn(["echo", "hello"]);

const output1 = await proc1.stdout.text();
output1; // => "hello\n"
console.log(`Captured output: ${JSON.stringify(output1)}`);
console.log("Process exit code:", proc1.exitCode);
console.log("");

// Example 1b: Reading stdout as shown in documentation
console.log("1b. Direct stdout.read() usage per documentation:");
const proc = Bun.spawn(["echo", "hello"]);

const output = await proc.stdout.text();
output; // => "hello\n"
console.log(`Documentation example result: '${output}'`);
console.log("");

// Example 1c: Piping stdout to parent process using "inherit"
console.log("1c. Piping stdout to parent process:");
console.log("About to run: bun spawn ['echo', 'hello'] with stdout: 'inherit'");
const procInherit = Bun.spawn(["echo", "hello"], {
  stdout: "inherit", // Pipes stdout to parent's stdout
});

await procInherit.exited;
console.log(`Process completed with exit code: ${procInherit.exitCode}`);
console.log("Notice how the output appears directly above without capture");
console.log("");

// Example 2: Working with multiline output
console.log("2. Multiline stdout output:");
const proc2 = Bun.spawn(["printf", "Line 1\\nLine 2\\nLine 3\\n"]);

const output2 = await proc2.stdout.text();
console.log(`Multiline output:\n${output2}`);
console.log("");

// Example 3: Command that produces stderr (if available)
console.log("3. Command with potential stderr:");
try {
  const proc3 = Bun.spawn(["ls", "/nonexistent/path"], {
    stderr: "pipe", // Capture stderr
  });

  // Read both streams
  const [stdout3, stderr3] = await Promise.all([
    proc3.stdout.text(),
    proc3.stderr.text()
  ]);

  console.log(`Exit code: ${proc3.exitCode}`);
  console.log(`Stdout: ${JSON.stringify(stdout3)}`);
  console.log(`Stderr: ${JSON.stringify(stderr3)}`);
} catch (error) {
  console.log(`Error (command may not exist): ${error.message}`);
}
console.log("");

// Example 4: Processing output line by line
console.log("4. Processing output line by line:");
const proc4 = Bun.spawn(["echo", "-e", "Line 1\\nLine 2\\nLine 3"]);

const textOutput = await proc4.stdout.text();
const lines = textOutput.trim().split('\\n');

console.log("Lines processed:");
lines.forEach((line, index) => {
  console.log(`  ${index + 1}: ${line}`);
});
console.log("");

// Example 6: Reading stderr from a child process (per documentation)
console.log("6. Reading stderr from a child process:");

const procStderr = Bun.spawn(["sh", "-c", "echo 'hello from stdout' && echo 'error from stderr' >&2"], {
  stderr: "pipe", // Required to capture stderr instead of inheriting it
});

procStderr.stderr; // => ReadableStream (as per documentation)

const errors: string = await procStderr.stderr.text();
if (errors) {
  console.log(`Captured stderr: ${JSON.stringify(errors)}`);
  // handle errors
} else {
  console.log("No errors captured");
}

await procStderr.exited;
console.log("Stderr process exit code:", procStderr.exitCode);
console.log("");

// Example 7: Error handling with stderr capture
console.log("7. Error handling with stderr:");
try {
  const proc7 = Bun.spawn(["ls", "/nonexistent/directory/that/does/not/exist"], {
    stderr: "pipe", // Pipe stderr to capture error messages
  });

  proc7.stderr; // => ReadableStream

  const errorOutput = await proc7.stderr.text();
  console.log(`Captured error output: ${JSON.stringify(errorOutput)}`);
  console.log(`Exit code: ${proc7.exitCode}`);

} catch (error) {
  console.log(`Error: ${error.message}`);
}

console.log("\\n✅ Stream examples completed!");
