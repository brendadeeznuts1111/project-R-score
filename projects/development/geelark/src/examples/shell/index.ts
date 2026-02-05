#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Shell Command Execution Examples
 *
 * This example demonstrates how to run shell commands using Bun's `$` function,
 * which provides a simple way to execute shell commands from TypeScript/JavaScript.
 */

import { $ } from "bun";

console.log("🔧 Shell Command Execution Examples\n");

// Example 1: Basic shell command execution
console.log("1. Basic command execution:");
await $`echo Hello, world!`; // => "Hello, world!"

// Example 2: Capturing output as text
console.log("\n2. Capturing command output:");
const output = await $`ls -l`.text();
console.log("Directory listing:\n", output);

// Example 3: Processing output line by line
console.log("\n3. Processing output line by line:");
for await (const line of $`ls -l`.lines()) {
  console.log(`Line: ${line}`);
}

console.log("\n✅ Shell command examples completed!");
