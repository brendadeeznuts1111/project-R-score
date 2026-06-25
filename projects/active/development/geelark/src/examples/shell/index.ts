#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Shell Command Execution Examples
 *
 * This example demonstrates how to run shell commands using Bun's `$` function,
 * which provides a simple way to execute shell commands from TypeScript/JavaScript.
 */

import { $ } from "bun";

console.info("🔧 Shell Command Execution Examples\n");

// Example 1: Basic shell command execution
console.info("1. Basic command execution:");
await $`echo Hello, world!`; // => "Hello, world!"

// Example 2: Capturing output as text
console.info("\n2. Capturing command output:");
const output = await $`ls -l`.text();
console.info("Directory listing:\n", output);

// Example 3: Processing output line by line
console.info("\n3. Processing output line by line:");
for await (const line of $`ls -l`.lines()) {
  console.info(`Line: ${line}`);
}

console.info("\n✅ Shell command examples completed!");
