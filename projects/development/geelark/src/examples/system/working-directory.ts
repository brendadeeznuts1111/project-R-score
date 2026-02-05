#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Working Directory Examples
 *
 * This example demonstrates working directory manipulation and path
 * operations in Bun, including changing directories in child processes
 * and working with relative/absolute paths.
 */

console.log("📂 Working Directory Examples\n");

// Example 1: Getting current working directory
console.log("1. Getting current working directory:");
console.log(`  process.cwd(): ${process.cwd()}`);

// Create and display a temporary directory for examples
const tempDir = "/tmp/bun-wd-example";
await Bun.write(`${tempDir}/.placeholder`, "example dir"); // Create dir implicitly
console.log(`  Created example directory: ${tempDir}`);
console.log("");

// Example 2: Spawning with custom working directory
console.log("2. Spawning child process in specific directory:");

const proc1 = Bun.spawn(["pwd"], {
  cwd: tempDir,
  stdout: "pipe",
  stderr: "pipe"
});

const pwdOutput = await proc1.stdout.text();
console.log(`  Child process working directory: ${pwdOutput.trim()}`);
console.log(`  Child exit code: ${proc1.exitCode}`);
console.log("");

// Example 3: Comparing working directories
console.log("3. Demonstrating different working directories:");

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

console.log(`  Root directory (/): ${rootPwd.trim()}`);
console.log(`  Temp directory (/tmp): ${tmpPwd.trim()}`);
console.log(`  Inherited from parent: ${currentPwd.trim()}`);
console.log("");

// Example 4: Using relative paths with working directory
console.log("4. Working with relative paths:");

// Create a subdirectory structure
await Bun.write(`${tempDir}/subdir/example.txt`, "content");
console.log("  Created subdirectory structure");

// List contents from specific working directory
const proc5 = Bun.spawn(["ls", "-la"], {
  cwd: tempDir,
  stdout: "pipe"
});

const listing = await proc5.stdout.text();
console.log(`  Directory listing from ${tempDir}:`);
console.log(`  ${listing.trim().split('\n').splice(1).join('\n  ')}`);
console.log("");

// Example 5: Path resolution examples
console.log("5. Path resolution with different working directories:");

const pathsToTest = [
  "./example.txt",
  "../example.txt",
  "subdir/example.txt"
];

for (const testPath of pathsToTest) {
  console.log(`  Testing path: ${testPath}`);

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
      console.log(`    ✅ File found: "${content.trim()}"`);
    } else {
      console.log(`    ❌ File not found`);
    }
  } catch (error) {
    console.log(`    ❌ Error accessing path: ${error.message}`);
  }
}
console.log("");

// Example 6: Environment variable for working directory
console.log("6. Using PWD environment variable:");

const proc7 = Bun.spawn(["env"], {
  env: {
    ...process.env,
    PWD: tempDir,
    OLDPWD: process.cwd()
  }
});

await proc7.exited;
console.log("  Set PWD environment variable for child process");
console.log("");

// Example 7: Cleanup
console.log("7. Cleaning up example directory:");
// Note: This would delete the temporary directory, but we skip this in the example
console.log(`  Would remove: ${tempDir}`);
console.log("");

console.log("✅ Working directory examples completed!");
