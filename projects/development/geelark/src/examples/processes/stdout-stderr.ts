#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Stdout & Stderr Stream Examples
 *
 * This example demonstrates how to work with child process output streams
 * using Bun.spawn() - stdout as ReadableStream, stderr handling, etc.
 */

console.info("📋 Child Process Output Stream Examples\n");

// Example 1: Basic stdout consumption as ReadableStream
console.info("1. Consuming stdout as ReadableStream:");
const proc1 = Bun.spawn(["echo", "hello"]);

const output1 = await proc1.stdout.text();
output1; // => "hello\n"
console.info(`Captured output: ${JSON.stringify(output1)}`);
console.info("Process exit code:", proc1.exitCode);
console.info("");

// Example 1b: Reading stdout as shown in documentation
console.info("1b. Direct stdout.read() usage per documentation:");
const proc = Bun.spawn(["echo", "hello"]);

const output = await proc.stdout.text();
output; // => "hello\n"
console.info(`Documentation example result: '${output}'`);
console.info("");

// Example 1c: Piping stdout to parent process using "inherit"
console.info("1c. Piping stdout to parent process:");
console.info("About to run: bun spawn ['echo', 'hello'] with stdout: 'inherit'");
const procInherit = Bun.spawn(["echo", "hello"], {
  stdout: "inherit", // Pipes stdout to parent's stdout
});

await procInherit.exited;
console.info(`Process completed with exit code: ${procInherit.exitCode}`);
console.info("Notice how the output appears directly above without capture");
console.info("");

// Example 2: Working with multiline output
console.info("2. Multiline stdout output:");
const proc2 = Bun.spawn(["printf", "Line 1\\nLine 2\\nLine 3\\n"]);

const output2 = await proc2.stdout.text();
console.info(`Multiline output:\n${output2}`);
console.info("");

// Example 3: Command that produces stderr (if available)
console.info("3. Command with potential stderr:");
try {
  const proc3 = Bun.spawn(["ls", "/nonexistent/path"], {
    stderr: "pipe", // Capture stderr
  });

  // Read both streams
  const [stdout3, stderr3] = await Promise.all([
    proc3.stdout.text(),
    proc3.stderr.text()
  ]);

  console.info(`Exit code: ${proc3.exitCode}`);
  console.info(`Stdout: ${JSON.stringify(stdout3)}`);
  console.info(`Stderr: ${JSON.stringify(stderr3)}`);
} catch (error) {
  console.info(`Error (command may not exist): ${error.message}`);
}
console.info("");

// Example 4: Processing output line by line
console.info("4. Processing output line by line:");
const proc4 = Bun.spawn(["echo", "-e", "Line 1\\nLine 2\\nLine 3"]);

const textOutput = await proc4.stdout.text();
const lines = textOutput.trim().split('\\n');

console.info("Lines processed:");
lines.forEach((line, index) => {
  console.info(`  ${index + 1}: ${line}`);
});
console.info("");

// Example 6: Reading stderr from a child process (per documentation)
console.info("6. Reading stderr from a child process:");

const procStderr = Bun.spawn(["sh", "-c", "echo 'hello from stdout' && echo 'error from stderr' >&2"], {
  stderr: "pipe", // Required to capture stderr instead of inheriting it
});

procStderr.stderr; // => ReadableStream (as per documentation)

const errors: string = await procStderr.stderr.text();
if (errors) {
  console.info(`Captured stderr: ${JSON.stringify(errors)}`);
  // handle errors
} else {
  console.info("No errors captured");
}

await procStderr.exited;
console.info("Stderr process exit code:", procStderr.exitCode);
console.info("");

// Example 7: Error handling with stderr capture
console.info("7. Error handling with stderr:");
try {
  const proc7 = Bun.spawn(["ls", "/nonexistent/directory/that/does/not/exist"], {
    stderr: "pipe", // Pipe stderr to capture error messages
  });

  proc7.stderr; // => ReadableStream

  const errorOutput = await proc7.stderr.text();
  console.info(`Captured error output: ${JSON.stringify(errorOutput)}`);
  console.info(`Exit code: ${proc7.exitCode}`);

} catch (error) {
  console.info(`Error: ${error.message}`);
}

console.info("\\n✅ Stream examples completed!");
