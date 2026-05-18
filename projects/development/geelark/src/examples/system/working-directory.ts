#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Working Directory Examples
 *
 * This example demonstrates working directory manipulation and path
 * operations in Bun, including changing directories in child processes
 * and working with relative/absolute paths.
 */

console.info("📂 Working Directory Examples\n");

// Example 1: Getting current working directory
console.info("1. Getting current working directory:");
console.info(`  process.cwd(): ${process.cwd()}`);

// Create and display a temporary directory for examples
const tempDir = "/tmp/bun-wd-example";
await Bun.write(`${tempDir}/.placeholder`, "example dir"); // Create dir implicitly
console.info(`  Created example directory: ${tempDir}`);
console.info("");

// Example 2: Spawning with custom working directory
console.info("2. Spawning child process in specific directory:");

const proc1 = Bun.spawn(["pwd"], {
  cwd: tempDir,
  stdout: "pipe",
  stderr: "pipe"
});

const pwdOutput = await proc1.stdout.text();
console.info(`  Child process working directory: ${pwdOutput.trim()}`);
console.info(`  Child exit code: ${proc1.exitCode}`);
console.info("");

// Example 3: Comparing working directories
console.info("3. Demonstrating different working directories:");

const proc2 = Bun.spawn(["pwd"], {
  cwd: "/", // Root directory
});

const proc3 = Bun.spawn(["pwd"], {
  cwd: "/tmp", // System temp directory
});

const proc4 = Bun.spawn(["pwd"], {
  // No cwd specified - inherits from parent
});

const [rootPwd, tmpPwd, currentPwd] = await Promise.all([
  proc2.stdout.text(),
  proc3.stdout.text(),
  proc4.stdout.text()
]);

console.info(`  Root directory (/): ${rootPwd.trim()}`);
console.info(`  Temp directory (/tmp): ${tmpPwd.trim()}`);
console.info(`  Inherited from parent: ${currentPwd.trim()}`);
console.info("");

// Example 4: Using relative paths with working directory
console.info("4. Working with relative paths:");

// Create a subdirectory structure
await Bun.write(`${tempDir}/subdir/example.txt`, "content");
console.info("  Created subdirectory structure");

// List contents from specific working directory
const proc5 = Bun.spawn(["ls", "-la"], {
  cwd: tempDir,
  stdout: "pipe"
});

const listing = await proc5.stdout.text();
console.info(`  Directory listing from ${tempDir}:`);
console.info(`  ${listing.trim().split('\n').splice(1).join('\n  ')}`);
console.info("");

// Example 5: Path resolution examples
console.info("5. Path resolution with different working directories:");

const pathsToTest = [
  "./example.txt",
  "../example.txt",
  "subdir/example.txt"
];

for (const testPath of pathsToTest) {
  console.info(`  Testing path: ${testPath}`);

  // Try to read the file from the temp directory working directory
  try {
    const proc6 = Bun.spawn(["cat", testPath], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe"
    });

    const [content] = await Promise.all([
      proc6.stdout.text(),
      proc6.stderr.text()
    ]);

    if (proc6.exitCode === 0) {
      console.info(`    ✅ File found: "${content.trim()}"`);
    } else {
      console.info(`    ❌ File not found`);
    }
  } catch (error) {
    console.info(`    ❌ Error accessing path: ${error.message}`);
  }
}
console.info("");

// Example 6: Environment variable for working directory
console.info("6. Using PWD environment variable:");

const proc7 = Bun.spawn(["env"], {
  env: {
    ...process.env,
    PWD: tempDir,
    OLDPWD: process.cwd()
  }
});

await proc7.exited;
console.info("  Set PWD environment variable for child process");
console.info("");

// Example 7: Cleanup
console.info("7. Cleaning up example directory:");
// Note: This would delete the temporary directory, but we skip this in the example
console.info(`  Would remove: ${tempDir}`);
console.info("");

console.info("✅ Working directory examples completed!");
