#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Child Process Configuration Examples
 *
 * This example demonstrates how to use the second argument of Bun.spawn()
 * to configure child process execution with custom working directory,
 * environment variables, and exit handlers.
 */

console.info("⚙️ Child Process Configuration Examples\n");

// Example 1: Basic configuration with cwd and env
console.info("1. Spawning with custom working directory and environment:");
const proc1 = Bun.spawn(["echo", "Hello, world!"], {
  cwd: "/tmp",
  env: {
    FOO: "bar",
    CUSTOM_VAR: "configured_value",
    NODE_ENV: "development"
  },
  onExit(proc, exitCode, signalCode, error) {
    console.info(`  Process exited with code: ${exitCode}`);
    console.info(`  Signal: ${signalCode}`);
    if (error) console.info(`  Error: ${error}`);
  },
});

await proc1.exited;
console.info("");

// Example 2: Environment inheritance with overrides
console.info("2. Inheriting environment with some overrides:");
const proc2 = Bun.spawn(["env"], {
  cwd: "/tmp",
  env: {
    ...process.env, // Inherit all existing environment variables
    CUSTOM_SPAWN_VAR: "from_spawn_config",
    BUN_SPAWN: "true",
    PATH: process.env.PATH // Explicitly keep PATH
  },
  onExit(proc, exitCode, signalCode, error) {
    console.info(`  env command exited with code: ${exitCode}`);
  },
});

await proc2.exited;
console.info("");

// Example 3: I/O piping options
console.info("3. Spawning with piped I/O (stdout/err inherit):");
const proc3 = Bun.spawn(["echo", "This goes to parent stdout"], {
  stdout: "inherit", // Output goes to parent's stdout
  stderr: "inherit", // Errors go to parent's stderr
  onExit(proc, exitCode, signalCode, error) {
    console.info(`  Inherited I/O process exited with code: ${exitCode}`);
  },
});

await proc3.exited;
console.info("");

// Example 4: Silent operation
console.info("4. Spawning silently:");
const proc4 = Bun.spawn(["echo", "This output will be consumed silently"], {
  stdout: "pipe", // Capture but don't print
  stderr: "pipe", // Capture but don't print
  onExit(proc, exitCode, signalCode, error) {
    console.info(`  Silent process exited with code: ${exitCode}`);
  },
});

await proc4.exited;
console.info("");

console.info("✅ Configuration examples completed!");
